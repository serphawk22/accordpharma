"""Daily-work APIs: My Day, activities, tasks/follow-ups, leads and the user directory."""

import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Response
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.sales_common import (
    ACTIVITY_TYPES,
    CLOSED_STAGES,
    OPEN_STAGES,
    Ctx,
    account_names,
    activity_scope,
    assignable_user,
    aware,
    count,
    get_ctx,
    iso,
    lead_scope,
    now,
    num,
    opportunity_names,
    opportunity_scope,
    period,
    ratio,
    task_scope,
    user_names,
)
from app.api.sales_metrics import (
    last_completed_activity,
    month_start,
    next_month,
    stage_events,
    target_for,
    utc_midnight,
    won_revenue,
)
from app.core.audit import record_audit
from app.core.permissions import SALES_ROLES, can_access_account, can_access_opportunity
from app.core.security import get_user_roles, require_roles
from app.db.session import get_db
from app.models import (
    Account,
    Contact,
    CRMTask,
    CustomerOrder,
    Lead,
    Notification,
    Opportunity,
    OpportunityStageHistory,
    Role,
    SalesActivity,
    User,
    UserRole,
)
from app.config import get_settings
from app.schemas.sales import (
    ActivityIn,
    ActivityPatch,
    EmailIn,
    FollowUpInput,
    LeadConvert,
    LeadIn,
    LeadPatch,
    TaskIn,
    TaskPatch,
)

router = APIRouter(prefix="/api/v1/sales", tags=["sales-work"])
SalesUser = Depends(require_roles(*SALES_ROLES))


# ------------------------------------------------------------------ serializers
def activity_rows(db: Session, rows: list[SalesActivity]) -> list[dict[str, Any]]:
    users = user_names(db, {r.owner_id for r in rows})
    accounts = account_names(db, {r.account_id for r in rows})
    opps = opportunity_names(db, {r.opportunity_id for r in rows})
    contact_ids = {r.contact_id for r in rows if r.contact_id}
    contacts = (
        {c.id: c.full_name for c in db.scalars(select(Contact).where(Contact.id.in_(contact_ids)))}
        if contact_ids
        else {}
    )
    current = now()
    out = []
    for r in rows:
        when = aware(r.occurred_at)
        out.append(
            {
                "id": str(r.id),
                "activity_type": r.activity_type,
                "status": r.status,
                "occurred_at": iso(r.occurred_at),
                "completed_at": iso(r.completed_at),
                "owner_id": str(r.owner_id),
                "owner_name": users.get(r.owner_id),
                "account_id": str(r.account_id) if r.account_id else None,
                "account_name": accounts.get(r.account_id),
                "contact_id": str(r.contact_id) if r.contact_id else None,
                "contact_name": contacts.get(r.contact_id),
                "opportunity_id": str(r.opportunity_id) if r.opportunity_id else None,
                "opportunity_name": opps.get(r.opportunity_id),
                "purpose": r.purpose,
                "location": r.location,
                "priority": r.priority,
                "notes": r.notes,
                "outcome": r.outcome,
                "products_discussed": r.products_discussed,
                "objections": r.objections,
                "commitments": r.commitments,
                "next_action": r.next_action,
                "is_overdue": r.status in ("planned", "in_progress") and when is not None and when < current,
            }
        )
    return out


def task_rows(db: Session, rows: list[CRMTask]) -> list[dict[str, Any]]:
    users = user_names(db, {r.assigned_to_id for r in rows} | {r.created_by_id for r in rows})
    accounts = account_names(db, {r.account_id for r in rows})
    opps = opportunity_names(db, {r.opportunity_id for r in rows})
    current = now()
    return [
        {
            "id": str(r.id),
            "title": r.title,
            "kind": r.kind,
            "status": r.status,
            "priority": r.priority,
            "description": r.description,
            "due_at": iso(r.due_at),
            "completed_at": iso(r.completed_at),
            "assigned_to_id": str(r.assigned_to_id) if r.assigned_to_id else None,
            "assigned_to_name": users.get(r.assigned_to_id),
            "created_by_id": str(r.created_by_id) if r.created_by_id else None,
            "created_by_name": users.get(r.created_by_id),
            "account_id": str(r.account_id) if r.account_id else None,
            "account_name": accounts.get(r.account_id),
            "opportunity_id": str(r.opportunity_id) if r.opportunity_id else None,
            "opportunity_name": opps.get(r.opportunity_id),
            "activity_id": str(r.activity_id) if r.activity_id else None,
            "is_overdue": r.status in ("open", "in_progress")
            and r.due_at is not None
            and aware(r.due_at) < current,
        }
        for r in rows
    ]


def lead_rows(db: Session, rows: list[Lead]) -> list[dict[str, Any]]:
    users = user_names(db, {r.assigned_to_id for r in rows})
    accounts = account_names(db, {r.account_id for r in rows})
    today = now().date()
    return [
        {
            "id": str(r.id),
            "name": r.name,
            "organization": r.organization,
            "contact_name": r.contact_name,
            "email": r.email,
            "phone": r.phone,
            "source": r.source,
            "status": r.status,
            "territory": r.territory,
            "assigned_to_id": str(r.assigned_to_id) if r.assigned_to_id else None,
            "assigned_to_name": users.get(r.assigned_to_id),
            "account_id": str(r.account_id) if r.account_id else None,
            "account_name": accounts.get(r.account_id),
            "contact_id": str(r.contact_id) if r.contact_id else None,
            "opportunity_id": str(r.opportunity_id) if r.opportunity_id else None,
            "customer_need": r.customer_need,
            "product_interest": r.product_interest,
            "decision_process": r.decision_process,
            "expected_timeline": r.expected_timeline,
            "potential_value": num(r.potential_value) if r.potential_value is not None else None,
            "qualification_notes": r.qualification_notes,
            "next_action": r.next_action,
            "follow_up_date": iso(r.follow_up_date),
            "disqualified_reason": r.disqualified_reason,
            "qualified_at": iso(r.qualified_at),
            "converted_at": iso(r.converted_at),
            "created_at": iso(r.created_at),
            "follow_up_overdue": bool(
                r.follow_up_date and r.follow_up_date < today and r.status not in ("converted", "disqualified")
            ),
        }
        for r in rows
    ]


def notify(db: Session, user_id: uuid.UUID | None, actor_id: uuid.UUID, title: str, body: str) -> None:
    if user_id and user_id != actor_id:
        db.add(Notification(user_id=user_id, title=title, body=body))


def _create_follow_up(
    db: Session, ctx: Ctx, data: FollowUpInput, *, account_id, opportunity_id, activity_id, assignee: uuid.UUID
) -> CRMTask:
    task = CRMTask(
        title=data.title,
        kind="follow_up",
        priority=data.priority,
        description=data.description,
        due_at=data.due_at,
        assigned_to_id=assignee,
        created_by_id=ctx.user.id,
        account_id=account_id,
        opportunity_id=opportunity_id,
        activity_id=activity_id,
        status="open",
    )
    db.add(task)
    db.flush()
    record_audit(
        db,
        actor_id=ctx.user.id,
        action="task_created",
        entity_type="task",
        entity_id=task.id,
        after={"account_id": str(account_id) if account_id else None, "kind": "follow_up", "due_at": data.due_at},
    )
    return task


def _check_links(db: Session, ctx: Ctx, account_id, contact_id, opportunity_id) -> Account:
    account = can_access_account(db, ctx.user, account_id)
    if contact_id:
        contact = db.get(Contact, contact_id)
        if contact is None or contact.account_id != account.id:
            raise HTTPException(status_code=422, detail="Contact does not belong to this account")
    if opportunity_id:
        opportunity = can_access_opportunity(db, ctx.user, opportunity_id)
        if opportunity.account_id != account.id:
            raise HTTPException(status_code=422, detail="Opportunity does not belong to this account")
    return account


# ------------------------------------------------------------------ directory
@router.get("/users")
def user_directory(user: User = SalesUser, db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    """Minimal id/name/territory directory used for name display and assignment pickers.

    Pickers show only users the caller may assign to (own scope: self; manager: territory; admin: everyone).
    """
    ctx = get_ctx(db, user)
    query = (
        select(User, Role.name)
        .join(UserRole, UserRole.user_id == User.id)
        .join(Role, Role.id == UserRole.role_id)
        .where(User.is_active.is_(True))
    )
    people: dict[uuid.UUID, dict[str, Any]] = {}
    for person, role_name in db.execute(query.order_by(User.full_name)):
        entry = people.setdefault(
            person.id,
            {"id": str(person.id), "full_name": person.full_name, "territory": person.territory, "roles": []},
        )
        entry["roles"].append(role_name.upper())
    sales_only = [
        p for p in people.values() if set(p["roles"]) & {"MEDICAL_REPRESENTATIVE", "SALES_MANAGER", "ADMIN", "SUPER_ADMIN", "EXECUTIVE"}
    ]
    for p in sales_only:
        p["assignable"] = (
            ctx.level == "global"
            or (ctx.level == "territory" and p["territory"] == user.territory)
            or p["id"] == str(user.id)
        )
    return sales_only


# ------------------------------------------------------------------ activities
@router.get("/activities")
def list_activities(
    owner_id: uuid.UUID | None = None,
    account_id: uuid.UUID | None = None,
    opportunity_id: uuid.UUID | None = None,
    activity_type: str | None = Query(default=None, pattern="^(visit|call|meeting|email|follow_up)$"),
    status: str | None = Query(default=None, pattern="^(planned|in_progress|completed|cancelled)$"),
    territory: str | None = None,
    start: datetime | None = None,
    end: datetime | None = None,
    view: str = Query(default="all", pattern="^(all|mine|overdue|upcoming|completed)$"),
    descending: bool = True,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    user: User = SalesUser,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    ctx = get_ctx(db, user)
    query = activity_scope(ctx)
    current = now()
    if view == "mine":
        query = query.where(SalesActivity.owner_id == user.id)
    elif view == "overdue":
        query = query.where(SalesActivity.status.in_(("planned", "in_progress")), SalesActivity.occurred_at < current)
    elif view == "upcoming":
        query = query.where(SalesActivity.status == "planned", SalesActivity.occurred_at >= current)
        descending = False
    elif view == "completed":
        query = query.where(SalesActivity.status == "completed")
    if owner_id:
        query = query.where(SalesActivity.owner_id == owner_id)
    if account_id:
        query = query.where(SalesActivity.account_id == account_id)
    if opportunity_id:
        query = query.where(SalesActivity.opportunity_id == opportunity_id)
    if activity_type:
        query = query.where(SalesActivity.activity_type == activity_type)
    if status:
        query = query.where(SalesActivity.status == status)
    if territory:
        query = query.where(Account.territory == territory)
    if start:
        query = query.where(SalesActivity.occurred_at >= aware(start))
    if end:
        query = query.where(SalesActivity.occurred_at < aware(end))
    total = count(db, query)
    order = SalesActivity.occurred_at.desc() if descending else SalesActivity.occurred_at
    rows = list(db.scalars(query.order_by(order).limit(limit).offset(offset)))
    return {"items": activity_rows(db, rows), "total": total, "limit": limit, "offset": offset}


@router.get("/activities/{activity_id}")
def get_activity(activity_id: uuid.UUID, user: User = SalesUser, db: Session = Depends(get_db)) -> dict[str, Any]:
    ctx = get_ctx(db, user)
    activity = db.scalar(activity_scope(ctx).where(SalesActivity.id == activity_id))
    if activity is None:
        raise HTTPException(status_code=404, detail="Activity not found")
    tasks = list(db.scalars(select(CRMTask).where(CRMTask.activity_id == activity.id).order_by(CRMTask.due_at)))
    return {**activity_rows(db, [activity])[0], "follow_ups": task_rows(db, tasks)}


@router.post("/activities", status_code=201)
def create_activity(
    payload: ActivityIn,
    response: Response,
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key", max_length=160),
    user: User = SalesUser,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    ctx = get_ctx(db, user)
    key = payload.client_request_id or idempotency_key
    if key:
        existing = db.scalar(
            select(SalesActivity).where(SalesActivity.owner_id == user.id, SalesActivity.idempotency_key == key)
        )
        if existing:
            response.status_code = 200
            return {**activity_rows(db, [existing])[0], "duplicate": True}
    account = _check_links(db, ctx, payload.account_id, payload.contact_id, payload.opportunity_id)
    occurred = aware(payload.occurred_at)
    if payload.status == "completed" and occurred > now() + timedelta(minutes=5):
        raise HTTPException(status_code=422, detail="A completed activity cannot be dated in the future")
    activity = SalesActivity(
        owner_id=user.id,
        account_id=account.id,
        contact_id=payload.contact_id,
        opportunity_id=payload.opportunity_id,
        activity_type=payload.activity_type,
        status=payload.status,
        occurred_at=occurred,
        purpose=payload.purpose,
        location=payload.location,
        priority=payload.priority,
        notes=payload.notes,
        outcome=payload.outcome,
        products_discussed=payload.products_discussed,
        objections=payload.objections,
        commitments=payload.commitments,
        next_action=payload.next_action,
        completed_at=now() if payload.status == "completed" else None,
        idempotency_key=key,
    )
    db.add(activity)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        existing = db.scalar(
            select(SalesActivity).where(SalesActivity.owner_id == user.id, SalesActivity.idempotency_key == key)
        )
        if existing is None:
            raise
        response.status_code = 200
        return {**activity_rows(db, [existing])[0], "duplicate": True}
    follow_up_id = None
    if payload.follow_up:
        task = _create_follow_up(
            db, ctx, payload.follow_up,
            account_id=account.id, opportunity_id=payload.opportunity_id, activity_id=activity.id, assignee=user.id,
        )
        follow_up_id = task.id
    if payload.opportunity_id and payload.next_action:
        opportunity = db.get(Opportunity, payload.opportunity_id)
        if opportunity and opportunity.stage not in CLOSED_STAGES:
            opportunity.next_action = payload.next_action
    record_audit(
        db,
        actor_id=user.id,
        action="sales_activity_created",
        entity_type="sales_activity",
        entity_id=activity.id,
        after={
            "account_id": str(account.id),
            "opportunity_id": str(payload.opportunity_id) if payload.opportunity_id else None,
            "type": payload.activity_type,
            "status": payload.status,
            "follow_up_task_id": str(follow_up_id) if follow_up_id else None,
        },
    )
    return {**activity_rows(db, [activity])[0], "follow_up_task_id": str(follow_up_id) if follow_up_id else None}


@router.patch("/activities/{activity_id}")
def patch_activity(
    activity_id: uuid.UUID, payload: ActivityPatch, user: User = SalesUser, db: Session = Depends(get_db)
) -> dict[str, Any]:
    ctx = get_ctx(db, user)
    activity = db.scalar(activity_scope(ctx).where(SalesActivity.id == activity_id))
    if activity is None:
        raise HTTPException(status_code=404, detail="Activity not found")
    if activity.owner_id != user.id and not ctx.is_manager:
        raise HTTPException(status_code=403, detail="Only the activity owner or a manager can change this activity")
    action = payload.action or "update"
    changes = payload.model_dump(exclude_unset=True, exclude={"action", "follow_up", "occurred_at"})
    if activity.status in ("completed", "cancelled") and not ctx.is_manager and action not in ("update",):
        raise HTTPException(status_code=409, detail=f"A {activity.status} activity can no longer be changed")
    audit_action = "sales_activity_updated"
    if action == "start":
        if activity.status != "planned":
            raise HTTPException(status_code=409, detail="Only planned activities can be started")
        activity.status = "in_progress"
        audit_action = "sales_activity_started"
    elif action == "cancel":
        activity.status = "cancelled"
        audit_action = "sales_activity_cancelled"
    elif action == "reschedule":
        if payload.occurred_at is None:
            raise HTTPException(status_code=422, detail="A new date and time is required to reschedule")
        activity.occurred_at = aware(payload.occurred_at)
        activity.status = "planned" if activity.status == "in_progress" else activity.status
        audit_action = "sales_activity_rescheduled"
    elif action == "complete":
        merged_outcome = (changes.get("outcome") or activity.outcome or "").strip()
        if activity.activity_type in ("visit", "call", "meeting") and not merged_outcome:
            raise HTTPException(status_code=422, detail="An outcome is required to complete this activity")
        if payload.occurred_at and aware(payload.occurred_at) > now() + timedelta(minutes=5):
            raise HTTPException(status_code=422, detail="A completed activity cannot be dated in the future")
        if payload.occurred_at:
            activity.occurred_at = aware(payload.occurred_at)
        activity.status = "completed"
        activity.completed_at = now()
        audit_action = "sales_activity_completed"
    for field, value in changes.items():
        setattr(activity, field, value)
    follow_up_id = None
    if action == "complete":
        if payload.follow_up:
            task = _create_follow_up(
                db, ctx, payload.follow_up,
                account_id=activity.account_id, opportunity_id=activity.opportunity_id,
                activity_id=activity.id, assignee=activity.owner_id,
            )
            follow_up_id = task.id
        if activity.opportunity_id and activity.next_action:
            opportunity = db.get(Opportunity, activity.opportunity_id)
            if opportunity and opportunity.stage not in CLOSED_STAGES:
                opportunity.next_action = activity.next_action
    db.flush()
    record_audit(
        db,
        actor_id=user.id,
        action=audit_action,
        entity_type="sales_activity",
        entity_id=activity.id,
        after={"status": activity.status, "account_id": str(activity.account_id) if activity.account_id else None},
    )
    return {**activity_rows(db, [activity])[0], "follow_up_task_id": str(follow_up_id) if follow_up_id else None}


# ------------------------------------------------------------------ tasks and follow-ups
@router.get("/tasks")
def list_tasks(
    assigned_to_id: uuid.UUID | None = None,
    account_id: uuid.UUID | None = None,
    opportunity_id: uuid.UUID | None = None,
    status: str | None = Query(default=None, pattern="^(open|in_progress|completed|cancelled|active)$"),
    kind: str | None = Query(default=None, pattern="^(task|follow_up)$"),
    overdue: bool | None = None,
    start: datetime | None = None,
    end: datetime | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    user: User = SalesUser,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    ctx = get_ctx(db, user)
    if account_id:
        # Anyone who can open the account may see its tasks.
        can_access_account(db, user, account_id)
        query = select(CRMTask).where(CRMTask.account_id == account_id)
    else:
        query = task_scope(ctx)
    if assigned_to_id:
        query = query.where(CRMTask.assigned_to_id == assigned_to_id)
    if opportunity_id:
        query = query.where(CRMTask.opportunity_id == opportunity_id)
    if status == "active":
        query = query.where(CRMTask.status.in_(("open", "in_progress")))
    elif status:
        query = query.where(CRMTask.status == status)
    if kind:
        query = query.where(CRMTask.kind == kind)
    if overdue is True:
        query = query.where(CRMTask.status.in_(("open", "in_progress")), CRMTask.due_at < now())
    if start:
        query = query.where(CRMTask.due_at >= aware(start))
    if end:
        query = query.where(CRMTask.due_at < aware(end))
    total = count(db, query)
    rows = list(db.scalars(query.order_by(CRMTask.due_at.is_(None), CRMTask.due_at).limit(limit).offset(offset)))
    return {"items": task_rows(db, rows), "total": total, "limit": limit, "offset": offset}


@router.post("/tasks", status_code=201)
def create_task(
    payload: TaskIn,
    response: Response,
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key", max_length=160),
    user: User = SalesUser,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    ctx = get_ctx(db, user)
    key = payload.client_request_id or idempotency_key
    if key:
        existing = db.scalar(select(CRMTask).where(CRMTask.created_by_id == user.id, CRMTask.idempotency_key == key))
        if existing:
            response.status_code = 200
            return {**task_rows(db, [existing])[0], "duplicate": True}
    if payload.account_id:
        can_access_account(db, user, payload.account_id)
    if payload.opportunity_id:
        opportunity = can_access_opportunity(db, user, payload.opportunity_id)
        if payload.account_id and opportunity.account_id != payload.account_id:
            raise HTTPException(status_code=422, detail="Opportunity does not belong to this account")
        payload.account_id = payload.account_id or opportunity.account_id
    if payload.activity_id:
        if db.scalar(activity_scope(ctx).where(SalesActivity.id == payload.activity_id)) is None:
            raise HTTPException(status_code=404, detail="Linked activity not found")
    assignee = payload.assigned_to_id or user.id
    assignable_user(ctx, db, assignee)
    task = CRMTask(
        title=payload.title,
        kind=payload.kind,
        account_id=payload.account_id,
        opportunity_id=payload.opportunity_id,
        activity_id=payload.activity_id,
        assigned_to_id=assignee,
        created_by_id=user.id,
        due_at=aware(payload.due_at),
        priority=payload.priority,
        description=payload.description,
        status="open",
        idempotency_key=key,
    )
    db.add(task)
    db.flush()
    notify(db, assignee, user.id, "New task assigned", f"{user.full_name} assigned you: {task.title}")
    record_audit(
        db, actor_id=user.id, action="task_created", entity_type="task", entity_id=task.id,
        after={"assigned_to_id": str(assignee), "account_id": str(task.account_id) if task.account_id else None},
    )
    return task_rows(db, [task])[0]


@router.patch("/tasks/{task_id}")
def patch_task(task_id: uuid.UUID, payload: TaskPatch, user: User = SalesUser, db: Session = Depends(get_db)) -> dict[str, Any]:
    ctx = get_ctx(db, user)
    task = db.scalar(task_scope(ctx).where(CRMTask.id == task_id))
    if task is None and ctx.level != "global":
        # Account-level visibility: a user who can open the account may see (not edit) its tasks.
        raise HTTPException(status_code=404, detail="Task not found")
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    owner_like = user.id in (task.assigned_to_id, task.created_by_id)
    if not owner_like and not ctx.is_manager:
        raise HTTPException(status_code=403, detail="Only the assignee, creator or a manager can change this task")
    changes = payload.model_dump(exclude_unset=True)
    previous_assignee = task.assigned_to_id
    if "assigned_to_id" in changes:
        if changes["assigned_to_id"] is None:
            raise HTTPException(status_code=422, detail="A task must have an assignee")
        if not ctx.is_manager and user.id != task.created_by_id:
            raise HTTPException(status_code=403, detail="Only the creator or a manager can reassign a task")
        assignable_user(ctx, db, changes["assigned_to_id"])
    if "status" in changes:
        status = changes["status"]
        if status == "completed":
            task.completed_at = now()
        elif task.status == "completed":
            task.completed_at = None
    if "due_at" in changes and changes["due_at"] is not None:
        changes["due_at"] = aware(changes["due_at"])
    for field, value in changes.items():
        setattr(task, field, value)
    db.flush()
    if task.assigned_to_id != previous_assignee:
        notify(db, task.assigned_to_id, user.id, "Task assigned to you", f"{user.full_name} assigned you: {task.title}")
    record_audit(
        db, actor_id=user.id, action="task_updated", entity_type="task", entity_id=task.id,
        after={"changed_fields": sorted(changes), "status": task.status},
    )
    return task_rows(db, [task])[0]


# ------------------------------------------------------------------ leads
@router.get("/leads")
def list_leads(
    status: str | None = Query(default=None, pattern="^(new|contacted|qualified|disqualified|converted|open)$"),
    assigned_to_id: uuid.UUID | None = None,
    source: str | None = None,
    search: str | None = Query(default=None, max_length=100),
    overdue_follow_up: bool | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    user: User = SalesUser,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    ctx = get_ctx(db, user)
    query = lead_scope(ctx)
    if status == "open":
        query = query.where(Lead.status.in_(("new", "contacted", "qualified")))
    elif status:
        query = query.where(Lead.status == status)
    if assigned_to_id:
        query = query.where(Lead.assigned_to_id == assigned_to_id)
    if source:
        query = query.where(Lead.source == source)
    if search:
        like = f"%{search.strip()}%"
        query = query.where(or_(Lead.name.ilike(like), Lead.organization.ilike(like), Lead.contact_name.ilike(like)))
    if overdue_follow_up:
        query = query.where(
            Lead.follow_up_date < now().date(), Lead.status.in_(("new", "contacted", "qualified"))
        )
    total = count(db, query)
    rows = list(db.scalars(query.order_by(Lead.created_at.desc()).limit(limit).offset(offset)))
    return {"items": lead_rows(db, rows), "total": total, "limit": limit, "offset": offset}


def _lead_or_404(db: Session, ctx: Ctx, lead_id: uuid.UUID) -> Lead:
    lead = db.scalar(lead_scope(ctx).where(Lead.id == lead_id))
    if lead is None:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead


@router.get("/leads/{lead_id}")
def get_lead(lead_id: uuid.UUID, user: User = SalesUser, db: Session = Depends(get_db)) -> dict[str, Any]:
    ctx = get_ctx(db, user)
    return lead_rows(db, [_lead_or_404(db, ctx, lead_id)])[0]


@router.post("/leads", status_code=201)
def create_lead(payload: LeadIn, user: User = SalesUser, db: Session = Depends(get_db)) -> dict[str, Any]:
    ctx = get_ctx(db, user)
    assignee = payload.assigned_to_id or user.id
    target = assignable_user(ctx, db, assignee)
    if payload.account_id:
        can_access_account(db, user, payload.account_id)
        if payload.contact_id:
            contact = db.get(Contact, payload.contact_id)
            if contact is None or contact.account_id != payload.account_id:
                raise HTTPException(status_code=422, detail="Contact does not belong to this account")
    elif payload.contact_id:
        raise HTTPException(status_code=422, detail="A contact requires an associated account")
    lead = Lead(
        **payload.model_dump(exclude={"assigned_to_id", "territory"}),
        assigned_to_id=assignee,
        territory=target.territory if ctx.level != "global" or not payload.territory else payload.territory,
        created_by_id=user.id,
        status="new",
    )
    db.add(lead)
    db.flush()
    notify(db, assignee, user.id, "New lead assigned", f"{user.full_name} assigned you the lead '{lead.name}'")
    record_audit(db, actor_id=user.id, action="lead_created", entity_type="lead", entity_id=lead.id,
                 after={"assigned_to_id": str(assignee)})
    return lead_rows(db, [lead])[0]


@router.patch("/leads/{lead_id}")
def patch_lead(lead_id: uuid.UUID, payload: LeadPatch, user: User = SalesUser, db: Session = Depends(get_db)) -> dict[str, Any]:
    ctx = get_ctx(db, user)
    lead = _lead_or_404(db, ctx, lead_id)
    if lead.status == "converted":
        raise HTTPException(status_code=409, detail="A converted lead cannot be edited")
    changes = payload.model_dump(exclude_unset=True)
    if "assigned_to_id" in changes:
        if not ctx.is_manager:
            raise HTTPException(status_code=403, detail="Only managers can reassign leads")
        if changes["assigned_to_id"] is None:
            raise HTTPException(status_code=422, detail="A lead must have an assignee")
        target = assignable_user(ctx, db, changes["assigned_to_id"])
        lead.territory = target.territory
    account_id = changes.get("account_id", lead.account_id)
    if "account_id" in changes and changes["account_id"]:
        can_access_account(db, user, changes["account_id"])
    if changes.get("contact_id"):
        contact = db.get(Contact, changes["contact_id"])
        if contact is None or contact.account_id != account_id:
            raise HTTPException(status_code=422, detail="Contact does not belong to the associated account")
    new_status = changes.get("status")
    if new_status == "qualified":
        need = changes.get("customer_need", lead.customer_need)
        if not (need or "").strip():
            raise HTTPException(status_code=422, detail="Record the customer need before qualifying a lead")
        lead.qualified_at = lead.qualified_at or now()
    if new_status == "disqualified" and not (changes.get("disqualified_reason") or lead.disqualified_reason):
        raise HTTPException(status_code=422, detail="A reason is required to disqualify a lead")
    previous_assignee = lead.assigned_to_id
    for field, value in changes.items():
        setattr(lead, field, value)
    db.flush()
    if lead.assigned_to_id != previous_assignee:
        notify(db, lead.assigned_to_id, user.id, "Lead assigned to you", f"{user.full_name} assigned you the lead '{lead.name}'")
    record_audit(db, actor_id=user.id, action="lead_updated", entity_type="lead", entity_id=lead.id,
                 after={"changed_fields": sorted(changes), "status": lead.status})
    return lead_rows(db, [lead])[0]


@router.post("/leads/{lead_id}/convert", status_code=201)
def convert_lead(
    lead_id: uuid.UUID, payload: LeadConvert, user: User = SalesUser, db: Session = Depends(get_db)
) -> dict[str, Any]:
    ctx = get_ctx(db, user)
    lead = _lead_or_404(db, ctx, lead_id)
    if lead.status == "converted":
        raise HTTPException(status_code=409, detail="This lead has already been converted")
    if lead.status != "qualified":
        raise HTTPException(status_code=409, detail="Only qualified leads can be converted to an opportunity")
    owner_id = lead.assigned_to_id or user.id

    account_id = payload.account_id or lead.account_id
    if account_id:
        account = can_access_account(db, user, account_id)
    else:
        if not payload.new_account_type:
            raise HTTPException(status_code=422, detail="Select an existing account or provide a type for a new account")
        account_name = (lead.organization or lead.name).strip()
        duplicate = db.scalar(
            select(Account.id).where(func.lower(Account.name) == account_name.lower(), Account.archived_at.is_(None))
        )
        if duplicate:
            raise HTTPException(
                status_code=409,
                detail="An account with this name already exists. Link the lead to it instead of creating a duplicate.",
            )
        account = Account(
            name=account_name,
            account_type=payload.new_account_type,
            territory=lead.territory or user.territory,
            assigned_employee_id=owner_id,
            status="active",
        )
        db.add(account)
        db.flush()
        record_audit(db, actor_id=user.id, action="account_created", entity_type="account", entity_id=account.id,
                     after={"source": "lead_conversion", "lead_id": str(lead.id)})

    contact_id = payload.contact_id or lead.contact_id
    if contact_id:
        contact = db.get(Contact, contact_id)
        if contact is None or contact.account_id != account.id:
            raise HTTPException(status_code=422, detail="Contact does not belong to this account")
    elif payload.create_contact and lead.contact_name:
        existing = db.scalar(
            select(Contact).where(
                Contact.account_id == account.id,
                Contact.status != "archived",
                or_(
                    func.lower(Contact.full_name) == lead.contact_name.lower(),
                    func.lower(Contact.email) == (lead.email or "").lower() if lead.email else False,
                ),
            )
        )
        if existing:
            contact_id = existing.id
        else:
            contact = Contact(
                account_id=account.id,
                full_name=lead.contact_name,
                email=lead.email,
                phone=lead.phone,
                territory=account.territory,
                assigned_rep_id=owner_id,
            )
            db.add(contact)
            db.flush()
            contact_id = contact.id
            record_audit(db, actor_id=user.id, action="contact_created", entity_type="contact", entity_id=contact.id,
                         after={"source": "lead_conversion", "account_id": str(account.id)})

    opportunity = Opportunity(
        account_id=account.id,
        owner_id=owner_id,
        name=(payload.opportunity_name or lead.name)[:200],
        stage="prospecting",
        estimated_value=payload.estimated_value if payload.estimated_value is not None else lead.potential_value,
        expected_close_date=payload.expected_close_date,
        probability=payload.probability,
        next_action=payload.next_action or lead.next_action,
        stage_changed_at=now(),
    )
    db.add(opportunity)
    db.flush()
    db.add(OpportunityStageHistory(
        opportunity_id=opportunity.id, from_stage=None, to_stage="prospecting",
        changed_by_id=user.id, note=f"Converted from lead '{lead.name}'",
    ))
    lead.status = "converted"
    lead.converted_at = now()
    lead.account_id = account.id
    lead.contact_id = contact_id
    lead.opportunity_id = opportunity.id
    db.flush()
    record_audit(db, actor_id=user.id, action="lead_converted", entity_type="lead", entity_id=lead.id,
                 after={"account_id": str(account.id), "opportunity_id": str(opportunity.id),
                        "contact_id": str(contact_id) if contact_id else None})
    record_audit(db, actor_id=user.id, action="opportunity_created", entity_type="opportunity", entity_id=opportunity.id,
                 after={"source": "lead_conversion", "lead_id": str(lead.id)})
    return {
        "lead": lead_rows(db, [lead])[0],
        "account_id": str(account.id),
        "contact_id": str(contact_id) if contact_id else None,
        "opportunity_id": str(opportunity.id),
    }


# ------------------------------------------------------------------ My Day
@router.get("/my-day")
def my_day(
    start: datetime | None = Query(default=None, description="Start of the representative's local day"),
    end: datetime | None = Query(default=None, description="End of the representative's local day"),
    stale_days: int = Query(default=14, ge=1, le=365),
    no_contact_days: int = Query(default=30, ge=1, le=365),
    user: User = SalesUser,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    ctx = get_ctx(db, user)
    current = now()
    if start is None or end is None:
        start = datetime.combine(current.date(), datetime.min.time(), timezone.utc)
        end = start + timedelta(days=1)
    start, end = aware(start), aware(end)
    if not timedelta(hours=1) <= end - start <= timedelta(hours=48):
        raise HTTPException(status_code=422, detail="The day window must be between 1 and 48 hours")

    mine = activity_scope(ctx).where(SalesActivity.owner_id == user.id)
    today = mine.where(
        SalesActivity.occurred_at >= start, SalesActivity.occurred_at < end, SalesActivity.status != "cancelled"
    )

    def n(stmt) -> int:
        return count(db, stmt)

    my_tasks = select(CRMTask).where(CRMTask.assigned_to_id == user.id)
    active_tasks = my_tasks.where(CRMTask.status.in_(("open", "in_progress")))
    overdue_activity_q = mine.where(
        SalesActivity.status.in_(("planned", "in_progress")), SalesActivity.occurred_at < min(current, end)
    )
    leads_new_q = lead_scope(ctx).where(Lead.assigned_to_id == user.id, Lead.status == "new")

    # Opportunities that need action, with the explicit rule that flagged each one.
    owned_open = list(
        db.scalars(
            opportunity_scope(ctx).where(Opportunity.owner_id == user.id, Opportunity.stage.in_(OPEN_STAGES))
        )
    )
    last_touch: dict[uuid.UUID, datetime] = {}
    if owned_open:
        for opp_id, last in db.execute(
            select(SalesActivity.opportunity_id, func.max(SalesActivity.occurred_at))
            .where(SalesActivity.opportunity_id.in_([o.id for o in owned_open]), SalesActivity.status == "completed")
            .group_by(SalesActivity.opportunity_id)
        ):
            last_touch[opp_id] = aware(last)
    attention: list[dict[str, Any]] = []
    account_map = account_names(db, {o.account_id for o in owned_open})
    for opp in owned_open:
        reasons = []
        if not (opp.next_action or "").strip():
            reasons.append("No next action recorded")
        reference = last_touch.get(opp.id) or aware(opp.created_at)
        idle = (current - reference).days
        if idle >= stale_days:
            reasons.append(f"No completed activity for {idle} days (threshold {stale_days})")
        if opp.expected_close_date and opp.expected_close_date < current.date():
            reasons.append(f"Expected close date passed ({opp.expected_close_date.isoformat()})")
        if reasons:
            attention.append(
                {
                    "id": str(opp.id),
                    "name": opp.name,
                    "account_id": str(opp.account_id),
                    "account_name": account_map.get(opp.account_id),
                    "stage": opp.stage,
                    "estimated_value": num(opp.estimated_value),
                    "next_action": opp.next_action,
                    "reasons": reasons,
                }
            )

    # Accounts needing attention: assigned to me, with no completed interaction inside the threshold.
    my_accounts = list(db.scalars(select(Account).where(Account.assigned_employee_id == user.id, Account.archived_at.is_(None))))
    last_by_account = last_completed_activity(db, [a.id for a in my_accounts])
    overdue_by_account: dict[uuid.UUID, int] = {}
    for account_id, cnt in db.execute(
        select(CRMTask.account_id, func.count(CRMTask.id))
        .where(CRMTask.assigned_to_id == user.id, CRMTask.status.in_(("open", "in_progress")),
               CRMTask.due_at < current, CRMTask.account_id.is_not(None))
        .group_by(CRMTask.account_id)
    ):
        overdue_by_account[account_id] = cnt
    needs_attention = []
    for account in my_accounts:
        last = last_by_account.get(account.id)
        idle = (current - last).days if last else None
        reasons = []
        if last is None:
            reasons.append("No completed interaction on record")
        elif idle is not None and idle >= no_contact_days:
            reasons.append(f"Last contact {idle} days ago (threshold {no_contact_days})")
        if overdue_by_account.get(account.id):
            reasons.append(f"{overdue_by_account[account.id]} overdue task(s)")
        if reasons:
            needs_attention.append(
                {"id": str(account.id), "name": account.name, "account_type": account.account_type,
                 "last_contact_at": iso(last), "days_since_contact": idle, "reasons": reasons}
            )
    needs_attention.sort(key=lambda a: (a["days_since_contact"] is not None, -(a["days_since_contact"] or 0)))

    schedule = list(db.scalars(today.order_by(SalesActivity.occurred_at)))
    overdue_activities = list(db.scalars(overdue_activity_q.order_by(SalesActivity.occurred_at).limit(50)))
    tasks_due = list(db.scalars(active_tasks.where(CRMTask.due_at < end).order_by(CRMTask.due_at).limit(50)))
    upcoming = list(
        db.scalars(
            mine.where(SalesActivity.status == "planned", SalesActivity.occurred_at >= end,
                       SalesActivity.occurred_at < end + timedelta(days=7))
            .order_by(SalesActivity.occurred_at).limit(20)
        )
    )
    recent = list(
        db.scalars(
            activity_scope(ctx)
            .where(SalesActivity.status == "completed",
                   or_(SalesActivity.owner_id == user.id, Account.assigned_employee_id == user.id))
            .order_by(SalesActivity.occurred_at.desc()).limit(10)
        )
    )
    new_leads = list(db.scalars(leads_new_q.order_by(Lead.created_at.desc()).limit(20)))
    draft_orders = list(
        db.execute(
            select(CustomerOrder.id, CustomerOrder.order_number, CustomerOrder.status, CustomerOrder.account_id)
            .where(CustomerOrder.created_by_id == user.id, CustomerOrder.status == "draft")
            .order_by(CustomerOrder.order_date.desc()).limit(10)
        )
    )
    draft_account_names = account_names(db, {row.account_id for row in draft_orders})

    # Target and performance for the month containing the day.
    month = month_start(start)
    month_start_dt, month_end_dt = utc_midnight(month), utc_midnight(next_month(month))
    won = won_revenue(db, ctx, month_start_dt, month_end_dt, [user.id])
    target = target_for(db, user.id, month)
    events = stage_events(db, ctx, CLOSED_STAGES, month_start_dt, month_end_dt, owner_ids=[user.id])
    won_n = len({e.opportunity_id for e in events if e.to_stage == "won"})
    lost_n = len({e.opportunity_id for e in events if e.to_stage == "lost"})
    leads_created = n(select(Lead).where(Lead.assigned_to_id == user.id, Lead.created_at >= month_start_dt,
                                         Lead.created_at < month_end_dt))
    leads_converted = n(select(Lead).where(Lead.assigned_to_id == user.id, Lead.converted_at >= month_start_dt,
                                           Lead.converted_at < month_end_dt))
    unread = db.scalar(select(func.count(Notification.id)).where(Notification.user_id == user.id, Notification.read_at.is_(None))) or 0
    notifications = list(
        db.scalars(select(Notification).where(Notification.user_id == user.id).order_by(Notification.created_at.desc()).limit(5))
    )
    close_soon = [
        o for o in owned_open
        if o.expected_close_date and current.date() <= o.expected_close_date <= current.date() + timedelta(days=14)
    ]

    def completed_today(kind: str) -> int:
        return n(today.where(SalesActivity.activity_type == kind, SalesActivity.status == "completed"))

    metrics = {
        "planned_visits": n(today.where(SalesActivity.activity_type == "visit")),
        "visits_completed": completed_today("visit"),
        "calls_completed": completed_today("call"),
        "meetings_completed": completed_today("meeting"),
        "followups_due": n(active_tasks.where(CRMTask.kind == "follow_up", CRMTask.due_at >= start, CRMTask.due_at < end)),
        "overdue_activities": n(overdue_activity_q),
        "overdue_tasks": n(active_tasks.where(CRMTask.due_at < min(current, end))),
        "new_leads": n(leads_new_q),
        "opportunities_requiring_action": len(attention),
    }
    return {
        "window": {"start": iso(start), "end": iso(end)},
        "metrics": metrics,
        "schedule": activity_rows(db, schedule),
        "overdue_activities": activity_rows(db, overdue_activities),
        "tasks_due": task_rows(db, tasks_due),
        "new_leads": lead_rows(db, new_leads),
        "opportunities_attention": attention,
        "accounts_attention": needs_attention[:20],
        "upcoming_activities": activity_rows(db, upcoming),
        "recent_account_activity": activity_rows(db, recent),
        "close_soon": [
            {"id": str(o.id), "name": o.name, "expected_close_date": iso(o.expected_close_date), "stage": o.stage,
             "estimated_value": num(o.estimated_value)}
            for o in sorted(close_soon, key=lambda o: o.expected_close_date)
        ],
        "draft_orders": [
            {"id": str(r.id), "order_number": r.order_number, "status": r.status,
             "account_id": str(r.account_id), "account_name": draft_account_names.get(r.account_id)}
            for r in draft_orders
        ],
        "performance": {
            "month": month.isoformat(),
            "target": target,
            "won_revenue": won,
            "target_progress": round(won / target, 4) if target else None,
            "win_rate": ratio(won_n, won_n + lost_n),
            "lead_conversion": ratio(leads_converted, leads_created),
            "definitions": {
                "won_revenue": "Sum of estimated value of your opportunities moved to Won this month.",
                "win_rate": "Won / (Won + Lost) opportunities closed this month.",
                "lead_conversion": "Leads converted this month / leads assigned to you this month.",
            },
        },
        "notifications": {
            "unread": unread,
            "recent": [
                {"id": str(x.id), "title": x.title, "body": x.body, "read": x.read_at is not None, "created_at": iso(x.created_at)}
                for x in notifications
            ],
        },
        "thresholds": {"stale_days": stale_days, "no_contact_days": no_contact_days},
    }


# ------------------------------------------------------------------ communications & deletions
@router.post("/communications/send-email", status_code=201)
def send_sales_email(
    payload: EmailIn,
    user: User = SalesUser,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    ctx = get_ctx(db, user)
    settings = get_settings()

    if payload.account_id:
        can_access_account(db, user, payload.account_id)
    if payload.opportunity_id:
        can_access_opportunity(db, user, payload.opportunity_id)

    smtp_status = "simulated"
    if settings.smtp_host and settings.smtp_from_email:
        try:
            import smtplib
            from email.message import EmailMessage

            msg = EmailMessage()
            msg["Subject"] = payload.subject
            msg["From"] = settings.smtp_from_email
            msg["To"] = payload.recipient_email
            msg.set_content(payload.body)

            with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=8) as s:
                if settings.smtp_use_tls:
                    s.starttls()
                if settings.smtp_username and settings.smtp_password:
                    s.login(settings.smtp_username, settings.smtp_password)
                s.send_message(msg)
            smtp_status = "sent"
        except Exception as e:
            smtp_status = f"simulated_fallback ({type(e).__name__})"

    activity = SalesActivity(
        owner_id=user.id,
        account_id=payload.account_id,
        contact_id=payload.contact_id,
        opportunity_id=payload.opportunity_id,
        activity_type="email",
        status="completed",
        occurred_at=now(),
        completed_at=now(),
        purpose=f"[{payload.template_type.replace('_', ' ').title()}] {payload.subject}",
        outcome=f"Email sent to {payload.recipient_email} ({smtp_status})",
        notes=(
            f"Recipient: {payload.recipient_name or payload.recipient_email} <{payload.recipient_email}>\n"
            f"Template: {payload.template_type}\n"
            f"Status: {smtp_status}\n\n"
            f"{payload.body}"
        ),
        priority="normal",
    )
    db.add(activity)
    db.flush()

    task_res = None
    if payload.schedule_follow_up and payload.follow_up_date:
        due = aware(payload.follow_up_date)
        task = CRMTask(
            title=f"Follow-up: {payload.subject[:100]}",
            kind="follow_up",
            priority="normal",
            description=payload.follow_up_notes or f"Follow up on email sent to {payload.recipient_email} ({payload.subject})",
            due_at=due,
            assigned_to_id=user.id,
            created_by_id=user.id,
            account_id=payload.account_id,
            opportunity_id=payload.opportunity_id,
            activity_id=activity.id,
            status="open",
        )
        db.add(task)
        db.flush()
        task_res = task_rows(db, [task])[0]

    record_audit(
        db,
        actor_id=user.id,
        action="sales_email_sent",
        entity_type="sales_activity",
        entity_id=activity.id,
        after={
            "recipient": payload.recipient_email,
            "subject": payload.subject,
            "template": payload.template_type,
            "smtp_status": smtp_status,
            "follow_up_task_id": str(task_res["id"]) if task_res else None,
        },
    )
    return {
        "status": "success",
        "smtp_status": smtp_status,
        "recipient": payload.recipient_email,
        "activity": activity_rows(db, [activity])[0],
        "follow_up_task": task_res,
    }


@router.delete("/activities/{activity_id}", status_code=200)
def delete_activity(
    activity_id: uuid.UUID, user: User = SalesUser, db: Session = Depends(get_db)
) -> dict[str, Any]:
    ctx = get_ctx(db, user)
    activity = db.scalar(activity_scope(ctx).where(SalesActivity.id == activity_id))
    if activity is None:
        raise HTTPException(status_code=404, detail="Activity not found")
    if activity.owner_id != user.id and not ctx.is_manager:
        raise HTTPException(status_code=403, detail="Only the activity owner or a manager/admin can delete this activity")
    record_audit(
        db,
        actor_id=user.id,
        action="sales_activity_deleted",
        entity_type="sales_activity",
        entity_id=activity.id,
        before={"type": activity.activity_type, "status": activity.status, "account_id": str(activity.account_id) if activity.account_id else None},
    )
    # Clear any foreign keys in tasks that reference this activity
    for t in db.scalars(select(CRMTask).where(CRMTask.activity_id == activity.id)):
        t.activity_id = None
    db.delete(activity)
    db.flush()
    return {"status": "deleted", "id": str(activity_id)}


@router.delete("/tasks/{task_id}", status_code=200)
def delete_task(
    task_id: uuid.UUID, user: User = SalesUser, db: Session = Depends(get_db)
) -> dict[str, Any]:
    ctx = get_ctx(db, user)
    task = db.scalar(task_scope(ctx).where(CRMTask.id == task_id))
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    owner_like = user.id in (task.assigned_to_id, task.created_by_id)
    if not owner_like and not ctx.is_manager:
        raise HTTPException(status_code=403, detail="Only the assignee, creator or a manager/admin can delete this task")
    record_audit(
        db,
        actor_id=user.id,
        action="task_deleted",
        entity_type="task",
        entity_id=task.id,
        before={"title": task.title, "status": task.status, "assigned_to_id": str(task.assigned_to_id) if task.assigned_to_id else None},
    )
    db.delete(task)
    db.flush()
    return {"status": "deleted", "id": str(task_id)}


@router.delete("/leads/{lead_id}", status_code=200)
def delete_lead(
    lead_id: uuid.UUID, user: User = SalesUser, db: Session = Depends(get_db)
) -> dict[str, Any]:
    ctx = get_ctx(db, user)
    lead = _lead_or_404(db, ctx, lead_id)
    if lead.assigned_to_id != user.id and lead.created_by_id != user.id and not ctx.is_manager:
        raise HTTPException(status_code=403, detail="Only the lead owner, creator or a manager/admin can delete this lead")
    record_audit(
        db,
        actor_id=user.id,
        action="lead_deleted",
        entity_type="lead",
        entity_id=lead.id,
        before={"name": lead.name, "status": lead.status},
    )
    db.delete(lead)
    db.flush()
    return {"status": "deleted", "id": str(lead_id)}

