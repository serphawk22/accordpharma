"""Account 360 APIs: enriched list, overview, timeline, insights, notes, history, orders and reassignment."""

import json
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.api.sales_common import (
    ADMIN_ROLES,
    CLOSED_STAGES,
    MANAGER_ROLES,
    OPEN_STAGES,
    Ctx,
    account_names,
    assignable_user,
    aware,
    count,
    get_ctx,
    iso,
    now,
    num,
    user_names,
)
from app.api.sales_metrics import last_completed_activity
from app.api.sales_work import notify, task_rows, activity_rows
from app.core.audit import record_audit
from app.core.permissions import SALES_ROLES, account_scope, can_access_account, can_access_opportunity
from app.core.security import get_user_roles, require_roles
from app.db.session import get_db
from app.models import (
    Account,
    AccountNote,
    ApprovalRequest,
    AssignmentHistory,
    AuditEvent,
    Contact,
    CRMTask,
    CustomerOrder,
    Distributor,
    Opportunity,
    OpportunityStageHistory,
    OrderItem,
    Product,
    SalesActivity,
    SupportCase,
    User,
)
from app.schemas.sales import NoteIn, ReassignIn

router = APIRouter(prefix="/api/v1/sales", tags=["sales-accounts"])
SalesUser = Depends(require_roles(*SALES_ROLES))
ManagerUser = Depends(require_roles(*MANAGER_ROLES))
AdminUser = Depends(require_roles(*ADMIN_ROLES))

HEALTH_RULES = {
    "no_recent_contact": "No completed interaction within the contact threshold",
    "overdue_tasks": "One or more open tasks/follow-ups are past due",
    "no_next_action": "An open opportunity has no next action recorded",
    "stalled_opportunity": "An open opportunity has had no completed activity within the stale threshold",
    "nothing_scheduled": "No upcoming activity or open follow-up is scheduled",
}


# ---------------------------------------------------------------- list
@router.get("/accounts")
def list_accounts(
    search: str | None = Query(default=None, max_length=100),
    account_type: str | None = None,
    territory: str | None = None,
    owner_id: uuid.UUID | None = None,
    status: str | None = None,
    no_contact_days: int | None = Query(default=None, ge=1, le=730),
    sort_by: str = Query(default="name", pattern="^(name|created_at|status)$"),
    descending: bool = False,
    limit: int = Query(default=25, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    user: User = SalesUser,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    roles = get_user_roles(db, user.id)
    query = account_scope(user, roles)
    if search:
        query = query.where(Account.name.ilike(f"%{search.strip()}%"))
    if account_type:
        query = query.where(Account.account_type == account_type)
    if territory:
        query = query.where(Account.territory == territory)
    if owner_id:
        query = query.where(Account.assigned_employee_id == owner_id)
    if status:
        query = query.where(Account.status == status)
    if no_contact_days:
        cutoff = now() - timedelta(days=no_contact_days)
        recent = select(SalesActivity.account_id).where(
            SalesActivity.status == "completed", SalesActivity.occurred_at >= cutoff, SalesActivity.account_id.is_not(None)
        )
        query = query.where(Account.id.not_in(recent))
    total = count(db, query)
    column = {"name": Account.name, "created_at": Account.created_at, "status": Account.status}[sort_by]
    rows = list(db.scalars(query.order_by(column.desc() if descending else column).limit(limit).offset(offset)))
    return {"items": _account_cards(db, rows), "total": total, "limit": limit, "offset": offset}


def _account_cards(db: Session, accounts: list[Account]) -> list[dict[str, Any]]:
    ids = [a.id for a in accounts]
    owners = user_names(db, {a.assigned_employee_id for a in accounts})
    last = last_completed_activity(db, ids)
    next_planned: dict[uuid.UUID, datetime] = {}
    open_value: dict[uuid.UUID, tuple[int, float]] = {}
    overdue: dict[uuid.UUID, int] = {}
    if ids:
        for aid, when in db.execute(
            select(SalesActivity.account_id, func.min(SalesActivity.occurred_at))
            .where(SalesActivity.account_id.in_(ids), SalesActivity.status == "planned", SalesActivity.occurred_at >= now())
            .group_by(SalesActivity.account_id)
        ):
            next_planned[aid] = aware(when)
        for aid, cnt, value in db.execute(
            select(Opportunity.account_id, func.count(Opportunity.id), func.coalesce(func.sum(Opportunity.estimated_value), 0))
            .where(Opportunity.account_id.in_(ids), Opportunity.stage.in_(OPEN_STAGES))
            .group_by(Opportunity.account_id)
        ):
            open_value[aid] = (cnt, num(value))
        for aid, cnt in db.execute(
            select(CRMTask.account_id, func.count(CRMTask.id))
            .where(CRMTask.account_id.in_(ids), CRMTask.status.in_(("open", "in_progress")), CRMTask.due_at < now())
            .group_by(CRMTask.account_id)
        ):
            overdue[aid] = cnt
    current = now()
    return [
        {
            "id": str(a.id),
            "name": a.name,
            "account_type": a.account_type,
            "status": a.status,
            "territory": a.territory,
            "market": a.market,
            "owner_id": str(a.assigned_employee_id) if a.assigned_employee_id else None,
            "owner_name": owners.get(a.assigned_employee_id),
            "last_interaction_at": iso(last.get(a.id)),
            "days_since_interaction": (current - last[a.id]).days if a.id in last else None,
            "next_scheduled_at": iso(next_planned.get(a.id)),
            "open_opportunities": open_value.get(a.id, (0, 0.0))[0],
            "open_opportunity_value": open_value.get(a.id, (0, 0.0))[1],
            "overdue_tasks": overdue.get(a.id, 0),
        }
        for a in accounts
    ]


# ---------------------------------------------------------------- overview
def _account_context(db: Session, user: User, account_id: uuid.UUID) -> tuple[Account, Ctx]:
    ctx = get_ctx(db, user)
    return can_access_account(db, user, account_id), ctx


def _health(
    db: Session, account: Account, *, no_contact_days: int, stale_days: int
) -> dict[str, Any]:
    current = now()
    last = last_completed_activity(db, [account.id]).get(account.id)
    flags: list[dict[str, Any]] = []
    if last is None or (current - last).days >= no_contact_days:
        detail = "No completed interaction on record" if last is None else f"Last contact {(current - last).days} days ago"
        flags.append({"rule": "no_recent_contact", "severity": "high", "detail": f"{detail} (threshold {no_contact_days} days)"})
    overdue = db.scalar(
        select(func.count(CRMTask.id)).where(
            CRMTask.account_id == account.id, CRMTask.status.in_(("open", "in_progress")), CRMTask.due_at < current
        )
    ) or 0
    if overdue:
        flags.append({"rule": "overdue_tasks", "severity": "high", "detail": f"{overdue} overdue task(s)"})
    open_opps = list(db.scalars(select(Opportunity).where(Opportunity.account_id == account.id, Opportunity.stage.in_(OPEN_STAGES))))
    touch: dict[uuid.UUID, datetime] = {}
    if open_opps:
        for oid, when in db.execute(
            select(SalesActivity.opportunity_id, func.max(SalesActivity.occurred_at))
            .where(SalesActivity.opportunity_id.in_([o.id for o in open_opps]), SalesActivity.status == "completed")
            .group_by(SalesActivity.opportunity_id)
        ):
            touch[oid] = aware(when)
    missing = [o.name for o in open_opps if not (o.next_action or "").strip()]
    if missing:
        flags.append({"rule": "no_next_action", "severity": "medium", "detail": f"No next action on: {', '.join(missing[:3])}"})
    stalled = [
        o.name for o in open_opps if (current - (touch.get(o.id) or aware(o.created_at))).days >= stale_days
    ]
    if stalled:
        flags.append({"rule": "stalled_opportunity", "severity": "medium",
                      "detail": f"No activity for {stale_days}+ days on: {', '.join(stalled[:3])}"})
    upcoming = db.scalar(
        select(func.count(SalesActivity.id)).where(
            SalesActivity.account_id == account.id, SalesActivity.status == "planned", SalesActivity.occurred_at >= current
        )
    ) or 0
    active_followups = db.scalar(
        select(func.count(CRMTask.id)).where(
            CRMTask.account_id == account.id, CRMTask.status.in_(("open", "in_progress")), CRMTask.kind == "follow_up"
        )
    ) or 0
    if not upcoming and not active_followups:
        flags.append({"rule": "nothing_scheduled", "severity": "low", "detail": "No planned activity or open follow-up"})
    for flag in flags:
        flag["rule_description"] = HEALTH_RULES[flag["rule"]]
    status = "needs_attention" if any(f["severity"] == "high" for f in flags) else "watch" if flags else "on_track"
    return {
        "status": status,
        "flags": flags,
        "thresholds": {"no_contact_days": no_contact_days, "stale_days": stale_days},
        "method": "Rule-based: status is 'needs_attention' if any high-severity rule fires, 'watch' if only medium/low rules "
        "fire, otherwise 'on_track'. No predictive or AI scoring is used.",
    }


@router.get("/accounts/{account_id}/overview")
def account_overview(
    account_id: uuid.UUID,
    no_contact_days: int = Query(default=30, ge=1, le=730),
    stale_days: int = Query(default=14, ge=1, le=365),
    user: User = SalesUser,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    account, ctx = _account_context(db, user, account_id)
    current = now()
    owner = db.get(User, account.assigned_employee_id) if account.assigned_employee_id else None
    card = _account_cards(db, [account])[0]
    recent = list(db.scalars(
        select(SalesActivity).where(SalesActivity.account_id == account.id, SalesActivity.status == "completed")
        .order_by(SalesActivity.occurred_at.desc()).limit(8)))
    upcoming = list(db.scalars(
        select(SalesActivity).where(SalesActivity.account_id == account.id, SalesActivity.status.in_(("planned", "in_progress")))
        .order_by(SalesActivity.occurred_at).limit(8)))
    opps = list(db.scalars(
        select(Opportunity).where(Opportunity.account_id == account.id, Opportunity.stage.in_(OPEN_STAGES))
        .order_by(Opportunity.expected_close_date.is_(None), Opportunity.expected_close_date).limit(10)))
    owners = user_names(db, {o.owner_id for o in opps})
    tasks = list(db.scalars(
        select(CRMTask).where(CRMTask.account_id == account.id, CRMTask.status.in_(("open", "in_progress")))
        .order_by(CRMTask.due_at.is_(None), CRMTask.due_at).limit(10)))
    contacts = list(db.scalars(
        select(Contact).where(Contact.account_id == account.id, Contact.status != "archived").order_by(Contact.full_name).limit(6)))
    orders = _orders(db, account.id, limit=5)
    open_support = db.scalar(
        select(func.count(SupportCase.id)).where(SupportCase.account_id == account.id, SupportCase.status.in_(("open", "in_progress", "waiting")))
    ) or 0
    since = current - timedelta(days=180)
    months: dict[str, int] = {}
    for when in db.scalars(
        select(SalesActivity.occurred_at).where(
            SalesActivity.account_id == account.id, SalesActivity.status == "completed", SalesActivity.occurred_at >= since)
    ):
        key = aware(when).strftime("%Y-%m")
        months[key] = months.get(key, 0) + 1
    health = _health(db, account, no_contact_days=no_contact_days, stale_days=stale_days)
    return {
        "account": {
            "id": str(account.id), "name": account.name, "account_type": account.account_type,
            "status": account.status, "territory": account.territory, "market": account.market,
            "created_at": iso(account.created_at), "owner_id": str(account.assigned_employee_id) if account.assigned_employee_id else None,
            "owner_name": owner.full_name if owner else None,
            "owner_email": owner.email if owner else None,
        },
        "header": {
            "last_interaction_at": card["last_interaction_at"],
            "next_scheduled_at": card["next_scheduled_at"],
            "open_opportunities": card["open_opportunities"],
            "open_opportunity_value": card["open_opportunity_value"],
            "outstanding_tasks": len(tasks),
            "overdue_tasks": card["overdue_tasks"],
            "open_support_cases": open_support,
        },
        "permissions": {
            "can_edit": True,
            "can_reassign": ctx.is_manager,
            "can_archive": ctx.is_manager,
            "can_view_audit": ctx.is_admin,
            "can_create_orders": bool(ctx.roles & {"SUPER_ADMIN", "ADMIN", "SALES_MANAGER", "MEDICAL_REPRESENTATIVE", "EXECUTIVE"}),
        },
        "health": health,
        "recent_activity": activity_rows(db, recent),
        "upcoming_activity": activity_rows(db, upcoming),
        "open_opportunities": [
            {"id": str(o.id), "name": o.name, "stage": o.stage, "estimated_value": num(o.estimated_value),
             "probability": o.probability, "expected_close_date": iso(o.expected_close_date),
             "owner_name": owners.get(o.owner_id), "next_action": o.next_action}
            for o in opps
        ],
        "outstanding_tasks": task_rows(db, tasks),
        "contacts": [
            {"id": str(c.id), "full_name": c.full_name, "title": c.title, "professional_category": c.professional_category,
             "email": c.email, "phone": c.phone}
            for c in contacts
        ],
        "recent_orders": orders,
        "engagement_by_month": [{"month": k, "completed_activities": v} for k, v in sorted(months.items())],
    }


# ---------------------------------------------------------------- contacts
@router.get("/accounts/{account_id}/contacts")
def account_contacts(account_id: uuid.UUID, user: User = SalesUser, db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    account, _ = _account_context(db, user, account_id)
    contacts = list(db.scalars(select(Contact).where(Contact.account_id == account.id, Contact.status != "archived").order_by(Contact.full_name)))
    ids = [c.id for c in contacts]
    last: dict[uuid.UUID, datetime] = {}
    nxt: dict[uuid.UUID, datetime] = {}
    if ids:
        for cid, when in db.execute(
            select(SalesActivity.contact_id, func.max(SalesActivity.occurred_at))
            .where(SalesActivity.contact_id.in_(ids), SalesActivity.status == "completed").group_by(SalesActivity.contact_id)
        ):
            last[cid] = aware(when)
        for cid, when in db.execute(
            select(SalesActivity.contact_id, func.min(SalesActivity.occurred_at))
            .where(SalesActivity.contact_id.in_(ids), SalesActivity.status == "planned", SalesActivity.occurred_at >= now())
            .group_by(SalesActivity.contact_id)
        ):
            nxt[cid] = aware(when)
    reps = user_names(db, {c.assigned_rep_id for c in contacts})
    return [
        {"id": str(c.id), "full_name": c.full_name, "title": c.title, "professional_category": c.professional_category,
         "email": c.email, "phone": c.phone, "status": c.status, "territory": c.territory,
         "assigned_rep_id": str(c.assigned_rep_id) if c.assigned_rep_id else None,
         "assigned_rep_name": reps.get(c.assigned_rep_id),
         "last_interaction_at": iso(last.get(c.id)), "next_scheduled_at": iso(nxt.get(c.id))}
        for c in contacts
    ]


# ---------------------------------------------------------------- orders
def _orders(db: Session, account_id: uuid.UUID, *, limit: int = 50) -> list[dict[str, Any]]:
    orders = list(db.scalars(select(CustomerOrder).where(CustomerOrder.account_id == account_id)
                             .order_by(CustomerOrder.order_date.desc()).limit(limit)))
    if not orders:
        return []
    items: dict[uuid.UUID, list[dict[str, Any]]] = {}
    product_names = {p.id: p.name for p in db.scalars(select(Product))}
    for item in db.scalars(select(OrderItem).where(OrderItem.order_id.in_([o.id for o in orders]))):
        items.setdefault(item.order_id, []).append(
            {"product_id": str(item.product_id), "product_name": product_names.get(item.product_id),
             "quantity": item.quantity, "unit_price": num(item.unit_price), "line_total": round(item.quantity * num(item.unit_price), 2)}
        )
    distributor_ids = {o.distributor_id for o in orders if o.distributor_id}
    distributors: dict[uuid.UUID, str | None] = {}
    if distributor_ids:
        for dist_id, name in db.execute(
            select(Distributor.id, Account.name).join(Account, Account.id == Distributor.account_id).where(Distributor.id.in_(distributor_ids))
        ):
            distributors[dist_id] = name
    creators = user_names(db, {o.created_by_id for o in orders})
    return [
        {"id": str(o.id), "order_number": o.order_number, "status": o.status, "order_date": iso(o.order_date),
         "distributor_id": str(o.distributor_id) if o.distributor_id else None,
         "distributor_name": distributors.get(o.distributor_id), "created_by_name": creators.get(o.created_by_id),
         "items": items.get(o.id, []), "total": round(sum(i["line_total"] for i in items.get(o.id, [])), 2)}
        for o in orders
    ]


@router.get("/accounts/{account_id}/orders")
def account_orders(account_id: uuid.UUID, user: User = SalesUser, db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    account, _ = _account_context(db, user, account_id)
    return _orders(db, account.id)


# ---------------------------------------------------------------- notes
@router.get("/accounts/{account_id}/notes")
def list_notes(account_id: uuid.UUID, user: User = SalesUser, db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    account, _ = _account_context(db, user, account_id)
    notes = list(db.scalars(select(AccountNote).where(AccountNote.account_id == account.id).order_by(AccountNote.created_at.desc()).limit(200)))
    names = user_names(db, {n.author_id for n in notes})
    return [{"id": str(n.id), "content": n.content, "author_id": str(n.author_id), "author_name": names.get(n.author_id),
             "activity_id": str(n.activity_id) if n.activity_id else None, "created_at": iso(n.created_at)} for n in notes]


@router.post("/accounts/{account_id}/notes", status_code=201)
def add_note(account_id: uuid.UUID, payload: NoteIn, user: User = SalesUser, db: Session = Depends(get_db)) -> dict[str, Any]:
    account, ctx = _account_context(db, user, account_id)
    if payload.activity_id:
        activity = db.get(SalesActivity, payload.activity_id)
        if activity is None or activity.account_id != account.id:
            raise HTTPException(status_code=422, detail="Activity does not belong to this account")
    note = AccountNote(account_id=account.id, author_id=user.id, content=payload.content.strip(), activity_id=payload.activity_id)
    db.add(note)
    db.flush()
    record_audit(db, actor_id=user.id, action="account_note_added", entity_type="account", entity_id=account.id,
                 after={"note_id": str(note.id)})
    return {"id": str(note.id), "content": note.content, "author_id": str(user.id), "author_name": user.full_name,
            "activity_id": str(note.activity_id) if note.activity_id else None, "created_at": iso(note.created_at)}


# ---------------------------------------------------------------- timeline
@router.get("/accounts/{account_id}/timeline")
def account_timeline(
    account_id: uuid.UUID,
    kinds: str | None = Query(default=None, description="Comma separated event kinds"),
    user_id: uuid.UUID | None = None,
    status: str | None = None,
    start: datetime | None = None,
    end: datetime | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    user: User = SalesUser,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    account, _ = _account_context(db, user, account_id)
    events: list[dict[str, Any]] = []
    cap = 400

    acts = list(db.scalars(select(SalesActivity).where(SalesActivity.account_id == account.id).order_by(SalesActivity.occurred_at.desc()).limit(cap)))
    for row in activity_rows(db, acts):
        events.append({
            "id": row["id"], "kind": row["activity_type"], "at": row["occurred_at"], "user_id": row["owner_id"],
            "user_name": row["owner_name"], "status": row["status"],
            "title": f"{row['activity_type'].title()}" + (f" with {row['contact_name']}" if row["contact_name"] else ""),
            "summary": row["purpose"] or row["outcome"] or row["notes"], "outcome": row["outcome"],
            "next_action": row["next_action"], "link": {"type": "activity", "id": row["id"]},
            "opportunity_id": row["opportunity_id"], "opportunity_name": row["opportunity_name"],
        })
    tasks = list(db.scalars(select(CRMTask).where(CRMTask.account_id == account.id).order_by(CRMTask.created_at.desc()).limit(cap)))
    for row in task_rows(db, tasks):
        events.append({
            "id": row["id"], "kind": row["kind"], "at": row["due_at"] or row["completed_at"], "user_id": row["assigned_to_id"],
            "user_name": row["assigned_to_name"], "status": "overdue" if row["is_overdue"] else row["status"],
            "title": f"{'Follow-up' if row['kind'] == 'follow_up' else 'Task'}: {row['title']}",
            "summary": row["description"], "outcome": None, "link": {"type": "task", "id": row["id"]},
        })
    notes = list(db.scalars(select(AccountNote).where(AccountNote.account_id == account.id).order_by(AccountNote.created_at.desc()).limit(cap)))
    note_users = user_names(db, {n.author_id for n in notes})
    for n in notes:
        events.append({"id": str(n.id), "kind": "note", "at": iso(n.created_at), "user_id": str(n.author_id),
                       "user_name": note_users.get(n.author_id), "status": None, "title": "Note added",
                       "summary": n.content, "outcome": None, "link": {"type": "note", "id": str(n.id)}})
    opp_rows = list(db.scalars(select(Opportunity).where(Opportunity.account_id == account.id)))
    opp_by_id = {o.id: o for o in opp_rows}
    if opp_rows:
        history = list(db.scalars(select(OpportunityStageHistory).where(OpportunityStageHistory.opportunity_id.in_(list(opp_by_id)))
                                  .order_by(OpportunityStageHistory.changed_at.desc()).limit(cap)))
        hist_users = user_names(db, {h.changed_by_id for h in history})
        for h in history:
            opp = opp_by_id[h.opportunity_id]
            events.append({
                "id": str(h.id), "kind": "opportunity", "at": iso(h.changed_at), "user_id": str(h.changed_by_id) if h.changed_by_id else None,
                "user_name": hist_users.get(h.changed_by_id), "status": h.to_stage,
                "title": f"Opportunity '{opp.name}': " + (f"{h.from_stage} → {h.to_stage}" if h.from_stage else f"created at {h.to_stage}"),
                "summary": h.note, "outcome": None, "link": {"type": "opportunity", "id": str(opp.id)},
                "opportunity_id": str(opp.id), "opportunity_name": opp.name,
            })
    assignments = list(db.scalars(select(AssignmentHistory).where(AssignmentHistory.account_id == account.id).order_by(AssignmentHistory.created_at.desc()).limit(cap)))
    assign_users = user_names(db, {a.changed_by_id for a in assignments} | {a.from_user_id for a in assignments} | {a.to_user_id for a in assignments})
    for a in assignments:
        events.append({
            "id": str(a.id), "kind": "ownership", "at": iso(a.created_at), "user_id": str(a.changed_by_id) if a.changed_by_id else None,
            "user_name": assign_users.get(a.changed_by_id), "status": None,
            "title": f"{a.entity_type.title()} ownership: {assign_users.get(a.from_user_id, 'unassigned')} → {assign_users.get(a.to_user_id, 'unassigned')}",
            "summary": a.reason, "outcome": None, "link": {"type": a.entity_type, "id": str(a.entity_id)},
        })
    for order in _orders(db, account.id, limit=100):
        events.append({"id": order["id"], "kind": "order", "at": order["order_date"], "user_id": None,
                       "user_name": order["created_by_name"], "status": order["status"],
                       "title": f"Order {order['order_number']} ({len(order['items'])} item(s), total {order['total']})",
                       "summary": order["distributor_name"], "outcome": None, "link": {"type": "order", "id": order["id"]}})
    cases = list(db.scalars(select(SupportCase).where(SupportCase.account_id == account.id).order_by(SupportCase.created_at.desc()).limit(100)))
    for case in cases:
        events.append({"id": str(case.id), "kind": "support", "at": iso(case.created_at), "user_id": None, "user_name": None,
                       "status": case.status, "title": f"Support {case.case_number}: {case.subject}", "summary": None,
                       "outcome": None, "link": {"type": "support", "id": str(case.id)}})
    related = {account.id, *opp_by_id}
    approvals = list(db.scalars(select(ApprovalRequest).where(ApprovalRequest.subject_id.in_(related)).limit(100)))
    approval_users = user_names(db, {a.requester_id for a in approvals})
    for ap in approvals:
        events.append({"id": str(ap.id), "kind": "approval", "at": iso(ap.created_at), "user_id": str(ap.requester_id),
                       "user_name": approval_users.get(ap.requester_id), "status": ap.status,
                       "title": f"Approval request ({ap.subject_type})", "summary": None, "outcome": None,
                       "link": {"type": "approval", "id": str(ap.id)}})

    wanted = {k.strip() for k in kinds.split(",")} if kinds else None
    start_dt, end_dt = aware(start), aware(end)

    def keep(event: dict[str, Any]) -> bool:
        if not event["at"]:
            return False
        if wanted and event["kind"] not in wanted:
            return False
        if user_id and event["user_id"] != str(user_id):
            return False
        if status and event["status"] != status:
            return False
        when = aware(datetime.fromisoformat(event["at"]))
        return (not start_dt or when >= start_dt) and (not end_dt or when < end_dt)

    filtered = sorted((e for e in events if keep(e)), key=lambda e: e["at"], reverse=True)
    return {"items": filtered[offset: offset + limit], "total": len(filtered), "limit": limit, "offset": offset,
            "attachments_supported": False}


# ---------------------------------------------------------------- insights
@router.get("/accounts/{account_id}/insights")
def account_insights(
    account_id: uuid.UUID,
    no_contact_days: int = Query(default=30, ge=1, le=730),
    stale_days: int = Query(default=14, ge=1, le=365),
    user: User = SalesUser,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    account, _ = _account_context(db, user, account_id)
    current = now()

    def completed_between(a: datetime, b: datetime) -> int:
        return db.scalar(select(func.count(SalesActivity.id)).where(
            SalesActivity.account_id == account.id, SalesActivity.status == "completed",
            SalesActivity.occurred_at >= a, SalesActivity.occurred_at < b)) or 0

    last30, prev30, last90 = completed_between(current - timedelta(days=30), current), \
        completed_between(current - timedelta(days=60), current - timedelta(days=30)), \
        completed_between(current - timedelta(days=90), current)
    last = last_completed_activity(db, [account.id]).get(account.id)
    open_opps = db.scalar(select(func.count(Opportunity.id)).where(Opportunity.account_id == account.id, Opportunity.stage.in_(OPEN_STAGES))) or 0
    overdue = db.scalar(select(func.count(CRMTask.id)).where(
        CRMTask.account_id == account.id, CRMTask.status.in_(("open", "in_progress")), CRMTask.due_at < current)) or 0
    orders_90 = db.scalar(select(func.count(CustomerOrder.id)).where(
        CustomerOrder.account_id == account.id, CustomerOrder.order_date >= current - timedelta(days=90))) or 0
    last_order = db.scalar(select(func.max(CustomerOrder.order_date)).where(CustomerOrder.account_id == account.id))
    trend = "increasing" if last30 > prev30 else "declining" if last30 < prev30 else "flat"
    health = _health(db, account, no_contact_days=no_contact_days, stale_days=stale_days)
    recommendations: list[dict[str, str]] = []
    for flag in health["flags"]:
        text = {
            "no_recent_contact": "Schedule a call or visit with this account.",
            "overdue_tasks": "Complete or reschedule the overdue follow-ups.",
            "no_next_action": "Record a next action on each open opportunity.",
            "stalled_opportunity": "Re-engage the stalled opportunity with the customer.",
            "nothing_scheduled": "Plan the next interaction so the account does not go quiet.",
        }[flag["rule"]]
        recommendations.append({"recommendation": text, "because": f"{HEALTH_RULES[flag['rule']]}: {flag['detail']}"})
    return {
        "calculated": {
            "completed_activities_30d": last30, "completed_activities_previous_30d": prev30, "completed_activities_90d": last90,
            "average_per_month_90d": round(last90 / 3, 1), "days_since_last_contact": (current - last).days if last else None,
            "open_opportunities": open_opps, "overdue_followups": overdue, "orders_last_90d": orders_90,
            "last_order_at": iso(last_order), "engagement_trend": trend,
            "trend_rule": "Compares completed activities in the last 30 days with the previous 30 days.",
        },
        "recommendations": {
            "source": "rule_based", "ai_generated": False,
            "note": "These suggestions come from the visible health rules, not a model. Treat them as prompts, not facts.",
            "items": recommendations,
        },
        "health": health,
    }


# ---------------------------------------------------------------- history / audit (admin)
@router.get("/accounts/{account_id}/history")
def account_history(
    account_id: uuid.UUID, limit: int = Query(default=100, ge=1, le=300),
    user: User = AdminUser, db: Session = Depends(get_db),
) -> dict[str, Any]:
    account = can_access_account(db, user, account_id)
    related = {account.id}
    related |= set(db.scalars(select(SalesActivity.id).where(SalesActivity.account_id == account.id)))
    related |= set(db.scalars(select(CRMTask.id).where(CRMTask.account_id == account.id)))
    related |= set(db.scalars(select(Contact.id).where(Contact.account_id == account.id)))
    related |= set(db.scalars(select(Opportunity.id).where(Opportunity.account_id == account.id)))
    events = list(db.scalars(select(AuditEvent).where(AuditEvent.entity_id.in_(related)).order_by(AuditEvent.created_at.desc()).limit(limit)))
    names = user_names(db, {e.actor_id for e in events})
    out = []
    for e in events:
        try:
            data = json.loads(e.event_data) if e.event_data else None
        except ValueError:
            data = None
        out.append({"id": str(e.id), "event_type": e.event_type, "entity_type": e.entity_type,
                    "entity_id": str(e.entity_id) if e.entity_id else None, "actor_id": str(e.actor_id) if e.actor_id else None,
                    "actor_name": names.get(e.actor_id), "created_at": iso(e.created_at), "data": data})
    assignments = list(db.scalars(select(AssignmentHistory).where(AssignmentHistory.account_id == account.id).order_by(AssignmentHistory.created_at.desc())))
    people = user_names(db, {a.from_user_id for a in assignments} | {a.to_user_id for a in assignments} | {a.changed_by_id for a in assignments})
    return {
        "events": out,
        "assignments": [{"id": str(a.id), "entity_type": a.entity_type, "entity_id": str(a.entity_id),
                         "from": people.get(a.from_user_id), "to": people.get(a.to_user_id),
                         "changed_by": people.get(a.changed_by_id), "reason": a.reason, "created_at": iso(a.created_at)}
                        for a in assignments],
        "read_only": True,
    }


# ---------------------------------------------------------------- reassignment
@router.post("/accounts/{account_id}/reassign")
def reassign_account(account_id: uuid.UUID, payload: ReassignIn, user: User = ManagerUser, db: Session = Depends(get_db)) -> dict[str, Any]:
    ctx = get_ctx(db, user)
    account = can_access_account(db, user, account_id)
    target = assignable_user(ctx, db, payload.assigned_to_id)
    previous = account.assigned_employee_id
    if previous == target.id:
        raise HTTPException(status_code=409, detail="The account is already assigned to this user")
    if not ctx.is_admin and target.territory != account.territory:
        raise HTTPException(status_code=422, detail="Assigned employee must belong to the account territory")
    account.assigned_employee_id = target.id
    db.add(AssignmentHistory(entity_type="account", entity_id=account.id, account_id=account.id,
                             from_user_id=previous, to_user_id=target.id, changed_by_id=user.id, reason=payload.reason))
    moved_opps = moved_tasks = 0
    if payload.include_open_opportunities:
        for opp in db.scalars(select(Opportunity).where(Opportunity.account_id == account.id, Opportunity.stage.in_(OPEN_STAGES))):
            if opp.owner_id != target.id:
                db.add(AssignmentHistory(entity_type="opportunity", entity_id=opp.id, account_id=account.id,
                                         from_user_id=opp.owner_id, to_user_id=target.id, changed_by_id=user.id, reason=payload.reason))
                opp.owner_id = target.id
                moved_opps += 1
    if payload.include_open_tasks and previous:
        for task in db.scalars(select(CRMTask).where(CRMTask.account_id == account.id, CRMTask.assigned_to_id == previous,
                                                      CRMTask.status.in_(("open", "in_progress")))):
            task.assigned_to_id = target.id
            moved_tasks += 1
    db.flush()
    body = f"{user.full_name} reassigned '{account.name}'. Reason: {payload.reason}"
    notify(db, target.id, user.id, "Account assigned to you", body)
    notify(db, previous, user.id, "Account reassigned", body)
    record_audit(db, actor_id=user.id, action="account_reassigned", entity_type="account", entity_id=account.id,
                 before={"assigned_employee_id": str(previous) if previous else None},
                 after={"assigned_employee_id": str(target.id), "reason": payload.reason,
                        "opportunities_moved": moved_opps, "tasks_moved": moved_tasks})
    return {"account_id": str(account.id), "owner_id": str(target.id), "owner_name": target.full_name,
            "opportunities_moved": moved_opps, "tasks_moved": moved_tasks}


@router.post("/opportunities/{opportunity_id}/reassign")
def reassign_opportunity(opportunity_id: uuid.UUID, payload: ReassignIn, user: User = ManagerUser, db: Session = Depends(get_db)) -> dict[str, Any]:
    ctx = get_ctx(db, user)
    opp = can_access_opportunity(db, user, opportunity_id)
    if opp.stage in CLOSED_STAGES:
        raise HTTPException(status_code=409, detail="Closed opportunities cannot be reassigned")
    target = assignable_user(ctx, db, payload.assigned_to_id)
    if opp.owner_id == target.id:
        raise HTTPException(status_code=409, detail="The opportunity is already assigned to this user")
    previous = opp.owner_id
    opp.owner_id = target.id
    db.add(AssignmentHistory(entity_type="opportunity", entity_id=opp.id, account_id=opp.account_id,
                             from_user_id=previous, to_user_id=target.id, changed_by_id=user.id, reason=payload.reason))
    db.flush()
    body = f"{user.full_name} reassigned opportunity '{opp.name}'. Reason: {payload.reason}"
    notify(db, target.id, user.id, "Opportunity assigned to you", body)
    notify(db, previous, user.id, "Opportunity reassigned", body)
    record_audit(db, actor_id=user.id, action="opportunity_reassigned", entity_type="opportunity", entity_id=opp.id,
                 before={"owner_id": str(previous)}, after={"owner_id": str(target.id), "reason": payload.reason})
    return {"opportunity_id": str(opp.id), "owner_id": str(target.id), "owner_name": target.full_name}
