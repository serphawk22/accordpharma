"""Metric definitions shared by My Day, the team table, the Command Center and reports.

Definitions (also surfaced in the UI and in docs):

* **Won / lost event** - a row in ``opportunity_stage_history`` whose ``to_stage`` is ``won``/``lost``.
  An opportunity counts in a period when that event falls inside it.
* **Won revenue** - sum of ``estimated_value`` of opportunities with a *won event* in the period.
  (No invoicing/payment data exists, so order totals are not treated as revenue.)
* **Win rate** - won events / (won events + lost events) in the period.
* **Lead conversion** - leads converted in the period / leads created in the period.
* **Follow-ups on time** - of follow-up tasks *due* in the period (not cancelled), the share completed on or
  before their due time.
* **Open opportunity** - stage in prospecting/qualification/proposal/negotiation.
"""

import uuid
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal  # noqa: F401
from typing import Any

from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.api.sales_common import (
    CLOSED_STAGES,
    OPEN_STAGES,
    Ctx,
    activity_scope,
    aware,
    num,
    opportunity_scope,
    ratio,
    task_scope,
    lead_scope,
)
from app.models import (
    Account,
    CRMTask,
    Lead,
    Opportunity,
    OpportunityStageHistory,
    SalesActivity,
    SalesTarget,
    User,
)


def scoped_opportunity_ids(ctx: Ctx):
    return opportunity_scope(ctx).with_only_columns(Opportunity.id)


def month_start(value: date | datetime) -> date:
    return date(value.year, value.month, 1)


def next_month(value: date) -> date:
    return date(value.year + (value.month == 12), 1 if value.month == 12 else value.month + 1, 1)


def utc_midnight(value: date) -> datetime:
    return datetime(value.year, value.month, value.day, tzinfo=timezone.utc)


def stage_events(
    db: Session,
    ctx: Ctx,
    stages: tuple[str, ...],
    start: datetime,
    end: datetime,
    *,
    owner_ids: list[uuid.UUID] | None = None,
    territory: str | None = None,
    account_type: str | None = None,
):
    """Rows of stage-history events (to_stage in ``stages``) in [start, end) within the caller's scope."""
    query = (
        select(
            OpportunityStageHistory.opportunity_id,
            OpportunityStageHistory.to_stage,
            OpportunityStageHistory.changed_at,
            Opportunity.owner_id,
            Opportunity.account_id,
            Opportunity.estimated_value,
            Opportunity.name,
            Opportunity.lost_reason,
        )
        .join(Opportunity, Opportunity.id == OpportunityStageHistory.opportunity_id)
        .join(Account, Account.id == Opportunity.account_id)
        .where(
            OpportunityStageHistory.to_stage.in_(stages),
            OpportunityStageHistory.changed_at >= start,
            OpportunityStageHistory.changed_at < end,
            Opportunity.id.in_(scoped_opportunity_ids(ctx)),
        )
    )
    if owner_ids:
        query = query.where(Opportunity.owner_id.in_(owner_ids))
    if territory:
        query = query.where(Account.territory == territory)
    if account_type:
        query = query.where(Account.account_type == account_type)
    return db.execute(query.order_by(OpportunityStageHistory.changed_at)).all()


def won_revenue(db: Session, ctx: Ctx, start: datetime, end: datetime, owner_ids: list[uuid.UUID] | None = None) -> float:
    rows = stage_events(db, ctx, ("won",), start, end, owner_ids=owner_ids)
    seen: dict[uuid.UUID, float] = {}
    for row in rows:
        seen[row.opportunity_id] = num(row.estimated_value)
    return round(sum(seen.values()), 2)


def target_for(db: Session, user_id: uuid.UUID, month: date) -> float | None:
    row = db.scalar(select(SalesTarget).where(SalesTarget.user_id == user_id, SalesTarget.period_start == month))
    return float(row.amount) if row else None


def last_completed_activity(db: Session, account_ids: list[uuid.UUID]) -> dict[uuid.UUID, datetime]:
    if not account_ids:
        return {}
    rows = db.execute(
        select(SalesActivity.account_id, func.max(SalesActivity.occurred_at))
        .where(SalesActivity.account_id.in_(account_ids), SalesActivity.status == "completed")
        .group_by(SalesActivity.account_id)
    )
    return {account_id: aware(value) for account_id, value in rows}


def team_metrics(
    db: Session, ctx: Ctx, reps: list[User], start: datetime, end: datetime
) -> dict[uuid.UUID, dict[str, Any]]:
    """Per-representative metrics for [start, end). Uses grouped queries, not per-rep loops."""
    ids = [rep.id for rep in reps]
    now_dt = datetime.now(timezone.utc)
    result: dict[uuid.UUID, dict[str, Any]] = {
        rep.id: {
            "user_id": str(rep.id),
            "name": rep.full_name,
            "territory": rep.territory,
            "assigned_accounts": 0,
            "new_leads": 0,
            "qualified_leads": 0,
            "leads_converted": 0,
            "open_opportunities": 0,
            "pipeline_value": 0.0,
            "won_opportunities": 0,
            "lost_opportunities": 0,
            "won_revenue": 0.0,
            "activities_completed": 0,
            "visits_completed": 0,
            "followups_due": 0,
            "followups_on_time": 0,
            "overdue_tasks": 0,
            "last_activity_at": None,
            "target": None,
        }
        for rep in reps
    }
    if not ids:
        return result

    for owner, cnt in db.execute(
        select(Account.assigned_employee_id, func.count(Account.id))
        .where(Account.assigned_employee_id.in_(ids), Account.archived_at.is_(None))
        .group_by(Account.assigned_employee_id)
    ):
        result[owner]["assigned_accounts"] = cnt

    lead_base = lead_scope(ctx).with_only_columns(Lead.id)
    for owner, cnt in db.execute(
        select(Lead.assigned_to_id, func.count(Lead.id))
        .where(Lead.assigned_to_id.in_(ids), Lead.created_at >= start, Lead.created_at < end, Lead.id.in_(lead_base))
        .group_by(Lead.assigned_to_id)
    ):
        result[owner]["new_leads"] = cnt
    for owner, cnt in db.execute(
        select(Lead.assigned_to_id, func.count(Lead.id))
        .where(Lead.assigned_to_id.in_(ids), Lead.qualified_at >= start, Lead.qualified_at < end, Lead.id.in_(lead_base))
        .group_by(Lead.assigned_to_id)
    ):
        result[owner]["qualified_leads"] = cnt
    for owner, cnt in db.execute(
        select(Lead.assigned_to_id, func.count(Lead.id))
        .where(Lead.assigned_to_id.in_(ids), Lead.converted_at >= start, Lead.converted_at < end, Lead.id.in_(lead_base))
        .group_by(Lead.assigned_to_id)
    ):
        result[owner]["leads_converted"] = cnt

    scoped = scoped_opportunity_ids(ctx)
    for owner, cnt, value in db.execute(
        select(Opportunity.owner_id, func.count(Opportunity.id), func.coalesce(func.sum(Opportunity.estimated_value), 0))
        .where(Opportunity.owner_id.in_(ids), Opportunity.stage.in_(OPEN_STAGES), Opportunity.id.in_(scoped))
        .group_by(Opportunity.owner_id)
    ):
        result[owner]["open_opportunities"] = cnt
        result[owner]["pipeline_value"] = num(value)

    for row in stage_events(db, ctx, CLOSED_STAGES, start, end, owner_ids=ids):
        entry = result.get(row.owner_id)
        if entry is None:
            continue
        if row.to_stage == "won":
            entry["won_opportunities"] += 1
            entry["won_revenue"] = round(entry["won_revenue"] + num(row.estimated_value), 2)
        else:
            entry["lost_opportunities"] += 1

    scoped_activities = activity_scope(ctx).with_only_columns(SalesActivity.id)
    for owner, cnt, visits in db.execute(
        select(
            SalesActivity.owner_id,
            func.count(SalesActivity.id),
            func.coalesce(func.sum(case((SalesActivity.activity_type == "visit", 1), else_=0)), 0),
        )
        .where(
            SalesActivity.owner_id.in_(ids),
            SalesActivity.status == "completed",
            SalesActivity.occurred_at >= start,
            SalesActivity.occurred_at < end,
            SalesActivity.id.in_(scoped_activities),
        )
        .group_by(SalesActivity.owner_id)
    ):
        result[owner]["activities_completed"] = cnt
        result[owner]["visits_completed"] = int(visits or 0)
    for owner, last in db.execute(
        select(SalesActivity.owner_id, func.max(SalesActivity.occurred_at))
        .where(
            SalesActivity.owner_id.in_(ids),
            SalesActivity.status == "completed",
            SalesActivity.id.in_(scoped_activities),
        )
        .group_by(SalesActivity.owner_id)
    ):
        result[owner]["last_activity_at"] = aware(last).isoformat() if last else None

    scoped_tasks = task_scope(ctx).with_only_columns(CRMTask.id)
    followups = db.execute(
        select(CRMTask.assigned_to_id, CRMTask.status, CRMTask.due_at, CRMTask.completed_at)
        .where(
            CRMTask.assigned_to_id.in_(ids),
            CRMTask.kind == "follow_up",
            CRMTask.status != "cancelled",
            CRMTask.due_at >= start,
            CRMTask.due_at < end,
            CRMTask.id.in_(scoped_tasks),
        )
    ).all()
    for owner, status, due_at, completed_at in followups:
        result[owner]["followups_due"] += 1
        if status == "completed" and completed_at and aware(completed_at) <= aware(due_at):
            result[owner]["followups_on_time"] += 1
    for owner, cnt in db.execute(
        select(CRMTask.assigned_to_id, func.count(CRMTask.id))
        .where(
            CRMTask.assigned_to_id.in_(ids),
            CRMTask.status.in_(("open", "in_progress")),
            CRMTask.due_at < now_dt,
            CRMTask.id.in_(scoped_tasks),
        )
        .group_by(CRMTask.assigned_to_id)
    ):
        result[owner]["overdue_tasks"] = cnt

    first_month, last_month = month_start(start), month_start(end - timedelta(seconds=1))
    targets: dict[uuid.UUID, float] = {}
    for user_id, amount in db.execute(
        select(SalesTarget.user_id, SalesTarget.amount).where(
            SalesTarget.user_id.in_(ids),
            SalesTarget.period_start >= first_month,
            SalesTarget.period_start <= last_month,
        )
    ):
        targets[user_id] = targets.get(user_id, 0.0) + float(amount)

    for rep_id, entry in result.items():
        entry["win_rate"] = ratio(entry["won_opportunities"], entry["won_opportunities"] + entry["lost_opportunities"])
        entry["lead_conversion"] = ratio(entry["leads_converted"], entry["new_leads"])
        entry["followups_on_time_rate"] = ratio(entry["followups_on_time"], entry["followups_due"])
        target = targets.get(rep_id)
        entry["target"] = (
            {
                "amount": target,
                "achievement": round(entry["won_revenue"] / target, 4) if target else None,
            }
            if target is not None
            else None
        )
    return result




def monthly_won_revenue(
    db: Session, ctx: Ctx, owner_ids: list[uuid.UUID] | None, months: int = 6
) -> list[dict[str, Any]]:
    current = month_start(datetime.now(timezone.utc))
    series: list[dict[str, Any]] = []
    cursor = current
    starts = []
    for _ in range(months):
        starts.append(cursor)
        cursor = date(cursor.year - (cursor.month == 1), 12 if cursor.month == 1 else cursor.month - 1, 1)
    for first in reversed(starts):
        series.append(
            {
                "month": first.isoformat(),
                "won_revenue": won_revenue(
                    db, ctx, utc_midnight(first), utc_midnight(next_month(first)), owner_ids
                ),
            }
        )
    return series

