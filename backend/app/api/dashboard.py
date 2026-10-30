from datetime import datetime, timedelta, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.permissions import GLOBAL_READ_ROLES, SALES_ROLES, account_scope
from app.core.security import get_user_roles, require_roles
from app.db.session import get_db
from app.models import (
    Account,
    Opportunity,
    SalesActivity,
    StockRiskAlert,
    SupportCase,
    Tender,
    User,
)
from app.schemas.api import ActivityOut

router = APIRouter(prefix="/api/v1/dashboard")


def _opportunity_scope(db: Session, user: User):
    roles = get_user_roles(db, user.id)
    query = select(Opportunity).join(Account, Account.id == Opportunity.account_id).where(
        Account.archived_at.is_(None)
    )
    if roles.intersection(GLOBAL_READ_ROLES):
        return query
    if "SALES_MANAGER" in roles:
        return query.where(Account.territory == user.territory)
    if "MEDICAL_REPRESENTATIVE" in roles:
        return query.where(
            or_(Opportunity.owner_id == user.id, Account.assigned_employee_id == user.id)
        )
    return query.where(False)


def _activity_scope(db: Session, user: User):
    roles = get_user_roles(db, user.id)
    query = select(SalesActivity)
    if roles.intersection(GLOBAL_READ_ROLES):
        return query
    if "SALES_MANAGER" in roles:
        return query.join(Account, Account.id == SalesActivity.account_id).where(
            Account.territory == user.territory
        )
    if "MEDICAL_REPRESENTATIVE" in roles:
        return query.where(SalesActivity.owner_id == user.id)
    return query.where(False)


@router.get("/summary")
def summary(
    user: User = Depends(require_roles(*SALES_ROLES)),
    db: Session = Depends(get_db),
) -> dict[str, int | str]:
    accounts = account_scope(user, get_user_roles(db, user.id)).with_only_columns(func.count(Account.id))
    account_count = db.scalar(accounts) or 0
    opportunities_query = _opportunity_scope(db, user).with_only_columns(func.count(Opportunity.id))
    opportunity_count = db.scalar(opportunities_query) or 0
    open_pipeline = _opportunity_scope(db, user).where(
        Opportunity.stage.not_in({"won", "lost"})
    ).with_only_columns(func.coalesce(func.sum(Opportunity.estimated_value), 0))
    pipeline_value = db.scalar(open_pipeline) or Decimal("0")
    activity_query = _activity_scope(db, user).where(
        SalesActivity.occurred_at >= datetime.now(timezone.utc) - timedelta(days=30)
    ).with_only_columns(func.count(SalesActivity.id))
    recent_activity_count = db.scalar(activity_query) or 0
    return {
        "accounts": account_count,
        "opportunities": opportunity_count,
        "open_pipeline_value": str(pipeline_value),
        "activities_last_30_days": recent_activity_count,
    }


@router.get("/sales-performance")
def sales_performance(
    user: User = Depends(require_roles(*SALES_ROLES)),
    db: Session = Depends(get_db),
) -> list[dict[str, str | int]]:
    query = (
        _opportunity_scope(db, user)
        .where(Opportunity.stage == "won")
        .with_only_columns(
            Opportunity.owner_id,
            func.count(Opportunity.id).label("won_count"),
            func.coalesce(func.sum(Opportunity.estimated_value), 0).label("won_value"),
        )
        .group_by(Opportunity.owner_id)
        .order_by(Opportunity.owner_id)
    )
    return [
        {"owner_id": str(row.owner_id), "won_count": row.won_count, "won_value": str(row.won_value)}
        for row in db.execute(query)
    ]


@router.get("/pipeline")
def pipeline(
    user: User = Depends(require_roles(*SALES_ROLES)),
    db: Session = Depends(get_db),
) -> list[dict[str, str | int]]:
    query = (
        _opportunity_scope(db, user)
        .where(Opportunity.stage.not_in({"won", "lost"}))
        .with_only_columns(
            Opportunity.stage,
            func.count(Opportunity.id).label("count"),
            func.coalesce(func.sum(Opportunity.estimated_value), 0).label("value"),
            func.coalesce(
                func.sum(Opportunity.estimated_value * Opportunity.probability / 100), 0
            ).label("weighted_value"),
        )
        .group_by(Opportunity.stage)
        .order_by(Opportunity.stage)
    )
    return [
        {
            "stage": row.stage,
            "count": row.count,
            "value": str(row.value),
            "weighted_value": str(row.weighted_value),
        }
        for row in db.execute(query)
    ]


@router.get("/recent-activities", response_model=list[ActivityOut])
def recent_activities(
    limit: int = Query(default=20, ge=1, le=100),
    user: User = Depends(require_roles(*SALES_ROLES)),
    db: Session = Depends(get_db),
) -> list[SalesActivity]:
    return list(
        db.scalars(
            _activity_scope(db, user)
            .order_by(SalesActivity.occurred_at.desc())
            .limit(limit)
        )
    )


@router.get("/alerts")
def alerts(
    limit: int = Query(default=50, ge=1, le=100),
    user: User = Depends(
        require_roles(*SALES_ROLES, "INVENTORY_MANAGER", "DISTRIBUTOR_MANAGER", "TENDER_MANAGER", "CUSTOMER_SUPPORT")
    ),
    db: Session = Depends(get_db),
) -> dict[str, list[dict[str, str]]]:
    roles = get_user_roles(db, user.id)
    cutoff = datetime.now(timezone.utc)
    tender_alerts: list[dict[str, str]] = []
    stock_alerts: list[dict[str, str]] = []
    ticket_alerts: list[dict[str, str]] = []
    if roles.intersection({"TENDER_MANAGER", "ADMIN", "SUPER_ADMIN"}):
        tenders = db.scalars(
            select(Tender)
            .where(Tender.due_at >= cutoff, Tender.due_at <= cutoff + timedelta(days=30))
            .order_by(Tender.due_at)
            .limit(limit)
        )
        tender_alerts = [
            {"id": str(item.id), "title": item.title, "due_at": item.due_at.isoformat()}
            for item in tenders
            if item.due_at is not None
        ]
    if roles.intersection({"INVENTORY_MANAGER", "ADMIN", "SUPER_ADMIN"}):
        alerts_query = select(StockRiskAlert).where(StockRiskAlert.status == "open").limit(limit)
        stock_alerts = [
            {"id": str(item.id), "severity": item.severity, "product_id": str(item.product_id)}
            for item in db.scalars(alerts_query)
        ]
    elif "DISTRIBUTOR_MANAGER" in roles:
        from app.models import Distributor

        account_ids = select(Distributor.account_id).where(Distributor.assigned_manager_id == user.id)
        distributor_ids = select(Distributor.id).where(Distributor.account_id.in_(account_ids))
        alerts_query = (
            select(StockRiskAlert)
            .where(StockRiskAlert.status == "open", StockRiskAlert.distributor_id.in_(distributor_ids))
            .limit(limit)
        )
        stock_alerts = [
            {"id": str(item.id), "severity": item.severity, "product_id": str(item.product_id)}
            for item in db.scalars(alerts_query)
        ]
    if roles.intersection({"CUSTOMER_SUPPORT", "ADMIN", "SUPER_ADMIN"}):
        cases = db.scalars(
            select(SupportCase)
            .where(
                SupportCase.status.in_({"open", "in_progress"}),
                or_(SupportCase.assigned_to_id.is_(None), SupportCase.assigned_to_id == user.id),
            )
            .order_by(SupportCase.created_at.desc())
            .limit(limit)
        )
        ticket_alerts = [
            {"id": str(item.id), "case_number": item.case_number, "priority": item.priority}
            for item in cases
        ]
    if roles.intersection(SALES_ROLES):
        upcoming_opportunities = db.scalars(
            _opportunity_scope(db, user)
            .where(
                Opportunity.expected_close_date.is_not(None),
                Opportunity.stage.not_in({"won", "lost"}),
            )
            .order_by(Opportunity.expected_close_date)
            .limit(limit)
        )
        tender_alerts.extend(
            {
                "id": str(item.id),
                "title": f"Opportunity close: {item.name}",
                "due_at": item.expected_close_date.isoformat(),
            }
            for item in upcoming_opportunities
            if item.expected_close_date is not None
        )
    return {"tenders_and_pipeline": tender_alerts, "stock_risks": stock_alerts, "support_tickets": ticket_alerts}
