"""Shared scoping and serialization helpers for the sales workspace APIs.

Every query is scoped on the server from the caller's roles:

* ``global``    - SUPER_ADMIN / ADMIN / EXECUTIVE see the whole organization.
* ``territory`` - SALES_MANAGER sees records in their territory.
* ``own``       - MEDICAL_REPRESENTATIVE sees records they own / are assigned to.
"""

import uuid
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal
from typing import Any

from fastapi import HTTPException
from sqlalchemy import Select, func, or_, select
from sqlalchemy.orm import Session

from app.core.permissions import GLOBAL_READ_ROLES, SALES_ROLES
from app.core.security import get_user_roles
from app.models import (
    Account,
    CRMTask,
    Lead,
    Opportunity,
    Role,
    SalesActivity,
    User,
    UserRole,
)

MANAGER_ROLES = {"SUPER_ADMIN", "ADMIN", "SALES_MANAGER"}
ADMIN_ROLES = {"SUPER_ADMIN", "ADMIN"}
MANAGEMENT_VIEW_ROLES = MANAGER_ROLES | {"EXECUTIVE"}
OPEN_STAGES = ("prospecting", "qualification", "proposal", "negotiation")
CLOSED_STAGES = ("won", "lost")
ACTIVITY_TYPES = {"visit", "call", "meeting", "email", "follow_up", "detailing"}
ACTIVITY_STATUSES = {"planned", "in_progress", "completed", "cancelled"}
TASK_STATUSES = {"open", "in_progress", "completed", "cancelled"}
PRIORITIES = {"low", "normal", "high", "urgent"}
LEAD_STATUSES = {"new", "contacted", "qualified", "disqualified", "converted"}


@dataclass
class Ctx:
    user: User
    roles: set[str]
    level: str  # global | territory | own

    @property
    def is_manager(self) -> bool:
        return bool(self.roles & MANAGER_ROLES)

    @property
    def is_admin(self) -> bool:
        return bool(self.roles & ADMIN_ROLES)


def get_ctx(db: Session, user: User) -> Ctx:
    roles = get_user_roles(db, user.id)
    if roles & GLOBAL_READ_ROLES:
        level = "global"
    elif "SALES_MANAGER" in roles:
        level = "territory"
    elif "MEDICAL_REPRESENTATIVE" in roles:
        level = "own"
    else:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    return Ctx(user=user, roles=roles, level=level)


def require_management(ctx: Ctx) -> None:
    if not ctx.roles & MANAGEMENT_VIEW_ROLES:
        raise HTTPException(status_code=403, detail="Management access is required")


def territory_user_ids(ctx: Ctx) -> Select:
    return select(User.id).where(User.territory == ctx.user.territory)


# --------------------------------------------------------------------------- scopes
def activity_scope(ctx: Ctx) -> Select:
    query = select(SalesActivity).outerjoin(Account, Account.id == SalesActivity.account_id)
    if ctx.level == "global":
        return query
    if ctx.level == "territory":
        return query.where(
            or_(SalesActivity.owner_id.in_(territory_user_ids(ctx)), Account.territory == ctx.user.territory)
        )
    return query.where(SalesActivity.owner_id == ctx.user.id)


def opportunity_scope(ctx: Ctx) -> Select:
    query = select(Opportunity).join(Account, Account.id == Opportunity.account_id).where(
        Account.archived_at.is_(None)
    )
    if ctx.level == "global":
        return query
    if ctx.level == "territory":
        return query.where(Account.territory == ctx.user.territory)
    return query.where(or_(Opportunity.owner_id == ctx.user.id, Account.assigned_employee_id == ctx.user.id))


def task_scope(ctx: Ctx) -> Select:
    query = select(CRMTask).outerjoin(Account, Account.id == CRMTask.account_id)
    if ctx.level == "global":
        return query
    if ctx.level == "territory":
        return query.where(
            or_(CRMTask.assigned_to_id.in_(territory_user_ids(ctx)), Account.territory == ctx.user.territory)
        )
    return query.where(or_(CRMTask.assigned_to_id == ctx.user.id, CRMTask.created_by_id == ctx.user.id))


def lead_scope(ctx: Ctx) -> Select:
    query = select(Lead)
    if ctx.level == "global":
        return query
    if ctx.level == "territory":
        return query.where(
            or_(Lead.territory == ctx.user.territory, Lead.assigned_to_id.in_(territory_user_ids(ctx)))
        )
    return query.where(or_(Lead.assigned_to_id == ctx.user.id, Lead.created_by_id == ctx.user.id))


def rep_users(ctx: Ctx, db: Session, *, territory: str | None = None, search: str | None = None) -> list[User]:
    """Active representatives visible to the caller."""
    query = (
        select(User)
        .join(UserRole, UserRole.user_id == User.id)
        .join(Role, Role.id == UserRole.role_id)
        .where(func.upper(Role.name) == "MEDICAL_REPRESENTATIVE", User.is_active.is_(True))
    )
    if ctx.level == "territory":
        query = query.where(User.territory == ctx.user.territory)
    elif ctx.level == "own":
        query = query.where(User.id == ctx.user.id)
    if territory:
        query = query.where(User.territory == territory)
    if search:
        query = query.where(User.full_name.ilike(f"%{search.strip()}%"))
    return list(db.scalars(query.order_by(User.full_name)).unique())


def ensure_user_visible(ctx: Ctx, db: Session, user_id: uuid.UUID) -> User:
    target = db.get(User, user_id)
    if target is None:
        raise HTTPException(status_code=404, detail="User not found")
    if ctx.level == "own" and target.id != ctx.user.id:
        raise HTTPException(status_code=403, detail="You can only view your own profile")
    if ctx.level == "territory" and target.territory != ctx.user.territory:
        raise HTTPException(status_code=404, detail="User not found")
    return target


def assignable_user(ctx: Ctx, db: Session, user_id: uuid.UUID) -> User:
    """Validate that ``ctx`` may assign work to ``user_id``."""
    target = db.get(User, user_id)
    if target is None or not target.is_active:
        raise HTTPException(status_code=422, detail="Assigned user does not exist or is inactive")
    if ctx.level == "own" and target.id != ctx.user.id:
        raise HTTPException(status_code=403, detail="Representatives can only assign work to themselves")
    if ctx.level == "territory" and target.territory != ctx.user.territory:
        raise HTTPException(status_code=403, detail="Cannot assign outside your territory")
    return target


# --------------------------------------------------------------------------- misc helpers
def now() -> datetime:
    return datetime.now(timezone.utc)


def aware(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


def day_bounds(value: date) -> tuple[datetime, datetime]:
    start = datetime.combine(value, time.min, timezone.utc)
    return start, start + timedelta(days=1)


def period(start: datetime | None, end: datetime | None, *, default_days: int = 30) -> tuple[datetime, datetime]:
    end_value = aware(end) or (now() + timedelta(seconds=2))
    start_value = aware(start) or end_value - timedelta(days=default_days)
    if start_value >= end_value:
        raise HTTPException(status_code=422, detail="start must be before end")
    if end_value - start_value > timedelta(days=800):
        raise HTTPException(status_code=422, detail="Reporting period cannot exceed 800 days")
    return start_value, end_value


def num(value: Any) -> float:
    if value is None:
        return 0.0
    return float(value) if isinstance(value, Decimal | int | float) else 0.0


def ratio(numerator: int | float, denominator: int | float) -> dict[str, Any]:
    """A rate that always carries its numerator and denominator, so it is explainable."""
    return {
        "numerator": numerator,
        "denominator": denominator,
        "rate": round(numerator / denominator, 4) if denominator else None,
    }


def count(db: Session, stmt: Select) -> int:
    return db.scalar(select(func.count()).select_from(stmt.order_by(None).subquery())) or 0


def user_names(db: Session, ids: set[uuid.UUID | None]) -> dict[uuid.UUID, str]:
    clean = {i for i in ids if i}
    if not clean:
        return {}
    return {row.id: row.full_name for row in db.execute(select(User.id, User.full_name).where(User.id.in_(clean)))}


def account_names(db: Session, ids: set[uuid.UUID | None]) -> dict[uuid.UUID, str]:
    clean = {i for i in ids if i}
    if not clean:
        return {}
    return {row.id: row.name for row in db.execute(select(Account.id, Account.name).where(Account.id.in_(clean)))}


def opportunity_names(db: Session, ids: set[uuid.UUID | None]) -> dict[uuid.UUID, str]:
    clean = {i for i in ids if i}
    if not clean:
        return {}
    return {
        row.id: row.name for row in db.execute(select(Opportunity.id, Opportunity.name).where(Opportunity.id.in_(clean)))
    }


def iso(value: datetime | date | None) -> str | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return aware(value).isoformat()
    return value.isoformat()


SALES_ROLE_NAMES = SALES_ROLES
