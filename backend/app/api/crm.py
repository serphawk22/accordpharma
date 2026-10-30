import uuid
from datetime import date, datetime, time, timezone
from decimal import Decimal
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.audit import record_audit
from app.core.permissions import (
    GLOBAL_READ_ROLES,
    SALES_ROLES,
    account_scope,
    can_access_account,
    can_access_contact,
    can_access_opportunity,
)
from app.core.security import get_current_user, get_user_roles, require_roles
from app.db.session import get_db
from app.models import (
    Account,
    AssignmentHistory,
    Contact,
    CRMTask,
    HealthcareProfessionalProfile,
    Opportunity,
    OpportunityStageHistory,
    Product,
    SalesActivity,
    User,
)
from app.schemas.api import (
    AccountCreate,
    AccountOut,
    AccountPatch,
    ActivityCreate,
    ActivityOut,
    ContactCreate,
    ContactOut,
    ContactPatch,
    OpportunityCreate,
    OpportunityOut,
    OpportunityPatch,
    ProductCreate,
    ProductOut,
    ProductPatch,
)

router = APIRouter(prefix="/api/v1")
STAGES = {"prospecting", "qualification", "proposal", "negotiation", "won", "lost"}
STAGE_TRANSITIONS = {
    "prospecting": {"prospecting", "qualification", "lost"},
    "qualification": {"qualification", "proposal", "lost"},
    "proposal": {"proposal", "negotiation", "lost"},
    "negotiation": {"negotiation", "won", "lost"},
    "won": {"won"},
    "lost": {"lost"},
}


def _page_params(limit: int, offset: int) -> None:
    if not 1 <= limit <= 100 or offset < 0:
        raise HTTPException(status_code=422, detail="limit must be 1..100 and offset must be nonnegative")


def _account_filters(
    query,
    *,
    search: str | None,
    account_type: str | None,
    territory: str | None,
    assigned_employee_id: uuid.UUID | None,
    status: str | None,
    created_after: date | None,
    created_before: date | None,
):
    if search:
        query = query.where(Account.name.ilike(f"%{search.strip()}%"))
    if account_type:
        query = query.where(Account.account_type == account_type)
    if territory:
        query = query.where(Account.territory == territory)
    if assigned_employee_id:
        query = query.where(Account.assigned_employee_id == assigned_employee_id)
    if status:
        query = query.where(Account.status == status)
    if created_after:
        query = query.where(Account.created_at >= datetime.combine(created_after, time.min, timezone.utc))
    if created_before:
        query = query.where(Account.created_at < datetime.combine(created_before, time.max, timezone.utc))
    return query


@router.get("/accounts", response_model=list[AccountOut])
def list_accounts(
    search: str | None = None,
    account_type: str | None = None,
    territory: str | None = None,
    assigned_employee_id: uuid.UUID | None = None,
    status: str | None = None,
    created_after: date | None = None,
    created_before: date | None = None,
    sort_by: str = Query(default="created_at", pattern="^(created_at|name|status)$"),
    descending: bool = True,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    user: User = Depends(require_roles(*SALES_ROLES)),
    db: Session = Depends(get_db),
) -> list[Account]:
    roles = get_user_roles(db, user.id)
    query = _account_filters(
        account_scope(user, roles),
        search=search,
        account_type=account_type,
        territory=territory,
        assigned_employee_id=assigned_employee_id,
        status=status,
        created_after=created_after,
        created_before=created_before,
    )
    if sort_by == "name":
        sort_column = Account.name
    elif sort_by == "status":
        sort_column = Account.status
    else:
        sort_column = Account.created_at
    return list(db.scalars(query.order_by(sort_column.desc() if descending else sort_column).limit(limit).offset(offset)))


@router.get("/accounts/{account_id}", response_model=AccountOut)
def get_account(
    account_id: uuid.UUID,
    user: User = Depends(require_roles(*SALES_ROLES)),
    db: Session = Depends(get_db),
) -> Account:
    return can_access_account(db, user, account_id)


@router.post("/accounts", response_model=AccountOut, status_code=201)
def create_account(
    payload: AccountCreate,
    user: User = Depends(require_roles("SUPER_ADMIN", "ADMIN", "SALES_MANAGER", "MEDICAL_REPRESENTATIVE")),
    db: Session = Depends(get_db),
) -> Account:
    roles = get_user_roles(db, user.id)
    assigned_id = payload.assigned_employee_id
    territory = payload.territory
    if "MEDICAL_REPRESENTATIVE" in roles and not roles.intersection({"ADMIN", "SUPER_ADMIN", "SALES_MANAGER"}):
        assigned_id, territory = user.id, user.territory
    elif "SALES_MANAGER" in roles and not roles.intersection({"ADMIN", "SUPER_ADMIN"}):
        assigned_id = assigned_id or user.id
        if territory and territory != user.territory:
            raise HTTPException(status_code=403, detail="Cannot assign an account outside your territory")
        territory = user.territory
    if assigned_id is not None and db.get(User, assigned_id) is None:
        raise HTTPException(status_code=422, detail="Assigned employee does not exist")
    if assigned_id is not None:
        assigned_user = db.get(User, assigned_id)
        if assigned_user is None or not assigned_user.is_active:
            raise HTTPException(status_code=422, detail="Assigned employee does not exist or is inactive")
        if "SALES_MANAGER" in roles and not roles.intersection({"ADMIN", "SUPER_ADMIN"}):
            if assigned_user.territory != user.territory:
                raise HTTPException(status_code=403, detail="Cannot assign an account outside your territory")
    account = Account(
        **payload.model_dump(exclude={"assigned_employee_id", "territory"}),
        assigned_employee_id=assigned_id,
        territory=territory,
    )
    db.add(account)
    db.flush()
    record_audit(db, actor_id=user.id, action="account_created", entity_type="account", entity_id=account.id)
    return account


@router.patch("/accounts/{account_id}", response_model=AccountOut)
def patch_account(
    account_id: uuid.UUID,
    payload: AccountPatch,
    user: User = Depends(require_roles(*SALES_ROLES)),
    db: Session = Depends(get_db),
) -> Account:
    account = can_access_account(db, user, account_id)
    changes = payload.model_dump(exclude_unset=True)
    if any(field in changes and changes[field] is None for field in ("name", "account_type", "status")):
        raise HTTPException(status_code=422, detail="Required account fields cannot be null")
    roles = get_user_roles(db, user.id)
    if not roles.intersection({"SUPER_ADMIN", "ADMIN"}):
        if "assigned_employee_id" in changes and changes["assigned_employee_id"] != user.id:
            raise HTTPException(status_code=403, detail="Cannot reassign this account")
        if "territory" in changes and changes["territory"] != user.territory:
            raise HTTPException(status_code=403, detail="Cannot change account territory")
    if "assigned_employee_id" in changes and changes["assigned_employee_id"] is not None:
        assigned_user = db.get(User, changes["assigned_employee_id"])
        if assigned_user is None or not assigned_user.is_active:
            raise HTTPException(status_code=422, detail="Assigned employee does not exist or is inactive")
        target_territory = changes.get("territory", account.territory)
        if target_territory != assigned_user.territory:
            raise HTTPException(status_code=422, detail="Assigned employee must belong to the account territory")
    before = {"name": account.name, "status": account.status, "territory": account.territory}
    previous_owner = account.assigned_employee_id
    for field, value in changes.items():
        setattr(account, field, value)
    if "assigned_employee_id" in changes and changes["assigned_employee_id"] != previous_owner:
        db.add(
            AssignmentHistory(
                entity_type="account",
                entity_id=account.id,
                account_id=account.id,
                from_user_id=previous_owner,
                to_user_id=changes["assigned_employee_id"],
                changed_by_id=user.id,
                reason="Changed through account edit",
            )
        )
    if account.status == "archived":
        account.archived_at = datetime.now(timezone.utc)
    record_audit(
        db,
        actor_id=user.id,
        action="account_updated",
        entity_type="account",
        entity_id=account.id,
        before=before,
        after={key: getattr(account, key) for key in changes},
    )
    return account


@router.delete("/accounts/{account_id}", status_code=204)
def archive_account(
    account_id: uuid.UUID,
    user: User = Depends(require_roles("SUPER_ADMIN", "ADMIN", "SALES_MANAGER")),
    db: Session = Depends(get_db),
) -> None:
    account = can_access_account(db, user, account_id)
    account.archived_at = datetime.now(timezone.utc)
    account.status = "archived"
    record_audit(db, actor_id=user.id, action="account_archived", entity_type="account", entity_id=account.id)


def _enrich_contact_out(db: Session, c: Contact) -> ContactOut:
    hcp = db.scalar(select(HealthcareProfessionalProfile).where(HealthcareProfessionalProfile.contact_id == c.id))
    acc = db.get(Account, c.account_id)
    acts = list(
        db.scalars(
            select(SalesActivity)
            .where(SalesActivity.contact_id == c.id)
            .order_by(SalesActivity.occurred_at.desc())
        )
    )
    completed_acts = [a for a in acts if a.status == "completed"]
    planned_acts = [a for a in acts if a.status == "planned"]
    is_kol = bool(
        (c.title and any(k in c.title.lower() for k in ("chief", "head", "director", "professor", "chair", "lead", "dr.")))
        or (hcp and hcp.specialty and any(s in hcp.specialty.lower() for s in ("oncology", "cardiology", "neurology", "hematology")))
        or len(completed_acts) >= 3
    )
    prescribing_tier = "Tier 1 (KOL)" if is_kol else ("Tier 2 (High-Volume)" if len(completed_acts) >= 1 else "Tier 3 (Prescriber)")
    return ContactOut(
        id=c.id,
        account_id=c.account_id,
        account_name=acc.name if acc else "Affiliated Hospital",
        full_name=c.full_name,
        email=c.email,
        phone=c.phone,
        title=c.title,
        professional_category=c.professional_category or "Healthcare Professional",
        specialty=hcp.specialty if (hcp and hcp.specialty) else "General Medicine",
        license_number=hcp.license_number if (hcp and hcp.license_number) else None,
        country=hcp.country if (hcp and hcp.country) else "US",
        prescribing_tier=prescribing_tier,
        kol_status=is_kol,
        last_interaction_at=completed_acts[0].occurred_at if completed_acts else None,
        next_scheduled_visit=planned_acts[0].occurred_at if planned_acts else None,
        interactions_count=len(completed_acts),
        territory=c.territory,
        assigned_rep_id=c.assigned_rep_id,
        status=c.status,
    )


@router.get("/contacts", response_model=list[ContactOut])
def list_contacts(
    account_id: uuid.UUID | None = None,
    search: str | None = None,
    territory: str | None = None,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    user: User = Depends(require_roles(*SALES_ROLES)),
    db: Session = Depends(get_db),
) -> list[ContactOut]:
    roles = get_user_roles(db, user.id)
    query = select(Contact).join(Account, Account.id == Contact.account_id).where(
        Contact.status != "archived", Account.archived_at.is_(None)
    )
    if not roles.intersection(GLOBAL_READ_ROLES):
        if "SALES_MANAGER" in roles:
            query = query.where(Account.territory == user.territory)
        elif "MEDICAL_REPRESENTATIVE" in roles:
            query = query.where(or_(Contact.assigned_rep_id == user.id, Account.assigned_employee_id == user.id))
    if account_id:
        can_access_account(db, user, account_id)
        query = query.where(Contact.account_id == account_id)
    if search:
        query = query.where(Contact.full_name.ilike(f"%{search.strip()}%"))
    if territory:
        query = query.where(Contact.territory == territory)
    contacts = list(db.scalars(query.order_by(Contact.created_at.desc()).limit(limit).offset(offset)))
    return [_enrich_contact_out(db, c) for c in contacts]


@router.get("/contacts/{contact_id}", response_model=ContactOut)
def get_contact(
    contact_id: uuid.UUID,
    user: User = Depends(require_roles(*SALES_ROLES)),
    db: Session = Depends(get_db),
) -> ContactOut:
    contact = can_access_contact(db, user, contact_id)
    return _enrich_contact_out(db, contact)


@router.get("/contacts/{contact_id}/profile")
def get_contact_hcp_profile(
    contact_id: uuid.UUID,
    user: User = Depends(require_roles(*SALES_ROLES)),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    contact = can_access_contact(db, user, contact_id)
    enriched = _enrich_contact_out(db, contact)
    account = db.get(Account, contact.account_id)
    activities = list(
        db.scalars(
            select(SalesActivity)
            .where(SalesActivity.contact_id == contact_id)
            .order_by(SalesActivity.occurred_at.desc())
            .limit(20)
        )
    )
    act_ids = [a.id for a in activities]
    task_conditions = [CRMTask.account_id == contact.account_id]
    if act_ids:
        task_conditions.append(CRMTask.activity_id.in_(act_ids))
    tasks = list(
        db.scalars(
            select(CRMTask)
            .where(or_(*task_conditions))
            .order_by(CRMTask.due_at.desc())
            .limit(20)
        )
    )
    detailing_sessions = [
        {
            "id": str(a.id),
            "occurred_at": a.occurred_at.isoformat() if a.occurred_at else None,
            "activity_type": a.activity_type,
            "purpose": a.purpose,
            "outcome": a.outcome,
            "products_discussed": a.products_discussed,
            "objections": a.objections,
            "commitments": a.commitments,
            "status": a.status,
        }
        for a in activities
    ]
    return {
        "hcp": enriched.model_dump(),
        "account": {
            "id": str(account.id) if account else None,
            "name": account.name if account else None,
            "account_type": account.account_type if account else None,
            "territory": account.territory if account else None,
        } if account else None,
        "activities": detailing_sessions,
        "tasks": [
            {
                "id": str(t.id),
                "title": t.title,
                "kind": t.kind,
                "status": t.status,
                "due_at": t.due_at.isoformat() if t.due_at else None,
            }
            for t in tasks
        ],
        "prescribing_metrics": {
            "tier": enriched.prescribing_tier,
            "is_kol": enriched.kol_status,
            "total_visits": enriched.interactions_count,
            "last_interaction": enriched.last_interaction_at.isoformat() if enriched.last_interaction_at else None,
            "next_visit": enriched.next_scheduled_visit.isoformat() if enriched.next_scheduled_visit else None,
        },
    }


@router.get("/accounts/{account_id}/contacts", response_model=list[ContactOut])
def get_account_contacts(
    account_id: uuid.UUID,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    user: User = Depends(require_roles(*SALES_ROLES)),
    db: Session = Depends(get_db),
) -> list[ContactOut]:
    can_access_account(db, user, account_id)
    contacts = list(
        db.scalars(
            select(Contact)
            .where(Contact.account_id == account_id, Contact.status != "archived")
            .order_by(Contact.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
    )
    return [_enrich_contact_out(db, c) for c in contacts]


@router.post("/contacts", response_model=ContactOut, status_code=201)
def create_contact(
    payload: ContactCreate,
    user: User = Depends(require_roles(*SALES_ROLES)),
    db: Session = Depends(get_db),
) -> ContactOut:
    account = can_access_account(db, user, payload.account_id)
    roles = get_user_roles(db, user.id)
    assigned_rep = payload.assigned_rep_id
    if "MEDICAL_REPRESENTATIVE" in roles and not roles.intersection({"ADMIN", "SUPER_ADMIN", "SALES_MANAGER"}):
        assigned_rep = user.id
    if assigned_rep is not None and db.get(User, assigned_rep) is None:
        raise HTTPException(status_code=422, detail="Assigned representative does not exist")
    hcp_data = {
        "specialty": payload.specialty,
        "license_number": payload.license_number,
        "country": payload.country or "US",
    }
    contact = Contact(
        **payload.model_dump(exclude={"assigned_rep_id", "territory", "specialty", "license_number", "country"}),
        assigned_rep_id=assigned_rep,
        territory=payload.territory or account.territory,
    )
    db.add(contact)
    db.flush()
    if any(hcp_data.values()):
        db.add(
            HealthcareProfessionalProfile(
                contact_id=contact.id,
                specialty=hcp_data.get("specialty"),
                license_number=hcp_data.get("license_number"),
                country=hcp_data.get("country"),
            )
        )
        db.flush()
    record_audit(
        db,
        actor_id=user.id,
        action="contact_created",
        entity_type="contact",
        entity_id=contact.id,
        after={"account_id": str(contact.account_id), "status": contact.status},
    )
    return _enrich_contact_out(db, contact)


@router.patch("/contacts/{contact_id}", response_model=ContactOut)
def patch_contact(
    contact_id: uuid.UUID,
    payload: ContactPatch,
    user: User = Depends(require_roles(*SALES_ROLES)),
    db: Session = Depends(get_db),
) -> ContactOut:
    contact = can_access_contact(db, user, contact_id)
    changes = payload.model_dump(exclude_unset=True)
    if "account_id" in changes and changes["account_id"] is None:
        raise HTTPException(status_code=422, detail="Contact account cannot be null")
    if any(field in changes and changes[field] is None for field in ("full_name", "status")):
        raise HTTPException(status_code=422, detail="Required contact fields cannot be null")
    if "account_id" in changes and changes["account_id"] is not None:
        account = can_access_account(db, user, changes["account_id"])
        if changes.get("territory") is None:
            changes["territory"] = account.territory
    roles = get_user_roles(db, user.id)
    if "assigned_rep_id" in changes and changes["assigned_rep_id"] is not None:
        assigned = db.get(User, changes["assigned_rep_id"])
        if assigned is None or not assigned.is_active:
            raise HTTPException(status_code=422, detail="Assigned representative does not exist or is inactive")
        if "SALES_MANAGER" in roles and not roles.intersection({"ADMIN", "SUPER_ADMIN"}):
            if assigned.territory != user.territory:
                raise HTTPException(status_code=403, detail="Cannot assign a contact outside your territory")
    if "assigned_rep_id" in changes and "MEDICAL_REPRESENTATIVE" in roles and not roles.intersection(
        {"ADMIN", "SUPER_ADMIN", "SALES_MANAGER"}
    ):
        if changes["assigned_rep_id"] != user.id:
            raise HTTPException(status_code=403, detail="Cannot reassign this contact")
    if (
        "territory" in changes
        and "MEDICAL_REPRESENTATIVE" in roles
        and not roles.intersection({"ADMIN", "SUPER_ADMIN", "SALES_MANAGER"})
        and changes["territory"] != user.territory
    ):
        raise HTTPException(status_code=403, detail="Cannot change contact territory")
    
    # Handle HCP profile changes
    hcp_keys = {"specialty", "license_number", "country"}
    hcp_updates = {k: changes.pop(k) for k in hcp_keys if k in changes}
    if hcp_updates:
        hcp = db.scalar(select(HealthcareProfessionalProfile).where(HealthcareProfessionalProfile.contact_id == contact.id))
        if hcp:
            for k, v in hcp_updates.items():
                setattr(hcp, k, v)
        else:
            db.add(HealthcareProfessionalProfile(contact_id=contact.id, **hcp_updates))
        db.flush()

    for field, value in changes.items():
        setattr(contact, field, value)
    record_audit(
        db,
        actor_id=user.id,
        action="contact_updated",
        entity_type="contact",
        entity_id=contact.id,
        after={"changed_fields": sorted(changes)},
    )
    return _enrich_contact_out(db, contact)


@router.get("/opportunities", response_model=list[OpportunityOut])
def list_opportunities(
    stage: str | None = None,
    account_id: uuid.UUID | None = None,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    user: User = Depends(require_roles(*SALES_ROLES)),
    db: Session = Depends(get_db),
) -> list[Opportunity]:
    roles = get_user_roles(db, user.id)
    query = select(Opportunity).join(Account, Account.id == Opportunity.account_id).where(
        Account.archived_at.is_(None)
    )
    if not roles.intersection(GLOBAL_READ_ROLES):
        if "SALES_MANAGER" in roles:
            query = query.where(Account.territory == user.territory)
        elif "MEDICAL_REPRESENTATIVE" in roles:
            query = query.where(or_(Opportunity.owner_id == user.id, Account.assigned_employee_id == user.id))
    if stage:
        query = query.where(Opportunity.stage == stage)
    if account_id:
        can_access_account(db, user, account_id)
        query = query.where(Opportunity.account_id == account_id)
    return list(db.scalars(query.order_by(Opportunity.created_at.desc()).limit(limit).offset(offset)))


@router.get("/opportunities/{opportunity_id}", response_model=OpportunityOut)
def get_opportunity(
    opportunity_id: uuid.UUID,
    user: User = Depends(require_roles(*SALES_ROLES)),
    db: Session = Depends(get_db),
) -> Opportunity:
    return can_access_opportunity(db, user, opportunity_id)


@router.post("/opportunities", response_model=OpportunityOut, status_code=201)
def create_opportunity(
    payload: OpportunityCreate,
    user: User = Depends(require_roles(*SALES_ROLES)),
    db: Session = Depends(get_db),
) -> Opportunity:
    if payload.stage not in STAGES:
        raise HTTPException(status_code=422, detail="Unknown opportunity stage")
    account = can_access_account(db, user, payload.account_id)
    roles = get_user_roles(db, user.id)
    owner_id = user.id
    if roles.intersection({"SUPER_ADMIN", "ADMIN", "SALES_MANAGER", "EXECUTIVE"}) and account.assigned_employee_id:
        owner_id = account.assigned_employee_id
    opportunity = Opportunity(**payload.model_dump(), owner_id=owner_id, stage_changed_at=datetime.now(timezone.utc))
    db.add(opportunity)
    db.flush()
    db.add(
        OpportunityStageHistory(
            opportunity_id=opportunity.id,
            from_stage=None,
            to_stage=opportunity.stage,
            changed_by_id=user.id,
            note="Opportunity created",
        )
    )
    record_audit(db, actor_id=user.id, action="opportunity_created", entity_type="opportunity", entity_id=opportunity.id)
    return opportunity


@router.patch("/opportunities/{opportunity_id}", response_model=OpportunityOut)
def patch_opportunity(
    opportunity_id: uuid.UUID,
    payload: OpportunityPatch,
    user: User = Depends(require_roles(*SALES_ROLES)),
    db: Session = Depends(get_db),
) -> Opportunity:
    opportunity = can_access_opportunity(db, user, opportunity_id)
    changes = payload.model_dump(exclude_unset=True)
    if "account_id" in changes and changes["account_id"] is None:
        raise HTTPException(status_code=422, detail="Opportunity account cannot be null")
    if any(field in changes and changes[field] is None for field in ("name", "stage", "probability")):
        raise HTTPException(status_code=422, detail="Required opportunity fields cannot be null")
    if "account_id" in changes and changes["account_id"] is not None:
        can_access_account(db, user, changes["account_id"])
    if changes.get("stage") is not None:
        if changes["stage"] not in STAGES:
            raise HTTPException(status_code=422, detail="Unknown opportunity stage")
        if opportunity.stage not in STAGE_TRANSITIONS or changes["stage"] not in STAGE_TRANSITIONS[opportunity.stage]:
            raise HTTPException(status_code=409, detail="Invalid opportunity stage transition")
    new_stage = changes.get("stage")
    stage_changed = new_stage is not None and new_stage != opportunity.stage
    if stage_changed and new_stage == "lost":
        if not (changes.get("lost_reason") or opportunity.lost_reason):
            raise HTTPException(status_code=422, detail="A lost reason is required to close an opportunity as lost")
    if changes.get("lost_reason") and (new_stage or opportunity.stage) != "lost":
        raise HTTPException(status_code=422, detail="A lost reason can only be set on lost opportunities")
    if opportunity.stage in {"won", "lost"} and set(changes) - {"next_action", "priority", "stage"}:
        raise HTTPException(status_code=409, detail="Closed opportunities can only change next action or priority")
    before = {"stage": opportunity.stage, "estimated_value": str(opportunity.estimated_value)}
    previous_stage = opportunity.stage
    for field, value in changes.items():
        setattr(opportunity, field, value)
    if stage_changed:
        opportunity.stage_changed_at = datetime.now(timezone.utc)
        db.add(
            OpportunityStageHistory(
                opportunity_id=opportunity.id,
                from_stage=previous_stage,
                to_stage=opportunity.stage,
                changed_by_id=user.id,
                note=changes.get("lost_reason"),
            )
        )
    record_audit(
        db,
        actor_id=user.id,
        action="opportunity_stage_changed" if stage_changed else "opportunity_updated",
        entity_type="opportunity",
        entity_id=opportunity.id,
        before=before,
        after={"changed_fields": sorted(changes), "stage": opportunity.stage},
    )
    return opportunity


@router.post("/opportunities/{opportunity_id}/activities", response_model=ActivityOut, status_code=201)
def add_opportunity_activity(
    opportunity_id: uuid.UUID,
    payload: ActivityCreate,
    user: User = Depends(require_roles(*SALES_ROLES)),
    db: Session = Depends(get_db),
) -> SalesActivity:
    opportunity = can_access_opportunity(db, user, opportunity_id)
    activity = SalesActivity(
        owner_id=user.id,
        account_id=opportunity.account_id,
        opportunity_id=opportunity.id,
        activity_type=payload.activity_type,
        occurred_at=payload.occurred_at,
        notes=payload.notes,
    )
    db.add(activity)
    db.flush()
    record_audit(
        db,
        actor_id=user.id,
        action="sales_activity_created",
        entity_type="opportunity",
        entity_id=opportunity.id,
    )
    return activity


@router.get("/opportunities/{opportunity_id}/activities", response_model=list[ActivityOut])
def list_opportunity_activities(
    opportunity_id: uuid.UUID,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    user: User = Depends(require_roles(*SALES_ROLES)),
    db: Session = Depends(get_db),
) -> list[SalesActivity]:
    can_access_opportunity(db, user, opportunity_id)
    return list(
        db.scalars(
            select(SalesActivity)
            .where(SalesActivity.opportunity_id == opportunity_id)
            .order_by(SalesActivity.occurred_at.desc())
            .limit(limit)
            .offset(offset)
        )
    )


@router.get("/products", response_model=list[ProductOut])
def list_products(
    search: str | None = None,
    category: str | None = None,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[Product]:
    query = select(Product).where(Product.is_active.is_(True))
    if search:
        query = query.where(or_(Product.name.ilike(f"%{search.strip()}%"), Product.sku.ilike(f"%{search.strip()}%")))
    if category:
        query = query.where(Product.category == category)
    return list(db.scalars(query.order_by(Product.name).limit(limit).offset(offset)))


@router.get("/products/{product_id}", response_model=ProductOut)
def get_product(
    product_id: uuid.UUID,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Product:
    product = db.get(Product, product_id)
    if product is None or not product.is_active:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.post("/products", response_model=ProductOut, status_code=201)
def create_product(
    payload: ProductCreate,
    user: User = Depends(require_roles("SUPER_ADMIN", "ADMIN", "INVENTORY_MANAGER")),
    db: Session = Depends(get_db),
) -> Product:
    if db.scalar(select(Product.id).where(Product.sku == payload.sku)) is not None:
        raise HTTPException(status_code=409, detail="Product code already exists")
    product = Product(**payload.model_dump())
    db.add(product)
    db.flush()
    record_audit(db, actor_id=user.id, action="product_created", entity_type="product", entity_id=product.id)
    return product


@router.patch("/products/{product_id}", response_model=ProductOut)
def patch_product(
    product_id: uuid.UUID,
    payload: ProductPatch,
    user: User = Depends(require_roles("SUPER_ADMIN", "ADMIN", "INVENTORY_MANAGER")),
    db: Session = Depends(get_db),
) -> Product:
    product = db.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    changes = payload.model_dump(exclude_unset=True)
    if any(field in changes and changes[field] is None for field in ("name", "sku", "is_active")):
        raise HTTPException(status_code=422, detail="Required product fields cannot be null")
    if "sku" in changes and db.scalar(
        select(Product.id).where(Product.sku == changes["sku"], Product.id != product.id)
    ) is not None:
        raise HTTPException(status_code=409, detail="Product code already exists")
    for field, value in changes.items():
        setattr(product, field, value)
    record_audit(
        db,
        actor_id=user.id,
        action="product_updated",
        entity_type="product",
        entity_id=product.id,
        after={"changed_fields": sorted(changes)},
    )
    return product
