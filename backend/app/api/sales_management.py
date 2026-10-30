"""Management and pipeline APIs: Kanban, analytics, Command Center, team performance, coverage, targets, reports."""

import re
import uuid
from calendar import monthrange
from datetime import date, datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.api.crm import STAGE_TRANSITIONS
from app.api.sales_common import (
    CLOSED_STAGES,
    MANAGEMENT_VIEW_ROLES,
    OPEN_STAGES,
    Ctx,
    account_names,
    activity_scope,
    aware,
    count,
    ensure_user_visible,
    get_ctx,
    iso,
    lead_scope,
    now,
    num,
    opportunity_scope,
    period,
    ratio,
    rep_users,
    require_management,
    task_scope,
    user_names,
)
from app.api.sales_metrics import (
    last_completed_activity,
    month_start,
    monthly_won_revenue,
    next_month,
    scoped_opportunity_ids,
    stage_events,
    team_metrics,
    utc_midnight,
)
from app.api.sales_work import activity_rows, lead_rows, task_rows
from app.core.audit import record_audit
from app.core.permissions import SALES_ROLES, account_scope, can_access_opportunity
from app.core.security import get_user_roles, require_roles
from app.db.session import get_db
from app.models import (
    Account,
    AssignmentHistory,
    CRMTask,
    CustomerOrder,
    Lead,
    Opportunity,
    OpportunityStageHistory,
    OrderItem,
    SalesActivity,
    SalesTarget,
    StockRiskAlert,
    Tender,
    User,
)
from app.schemas.sales import ReportAsk, ReportRun, TargetIn

router = APIRouter(prefix="/api/v1/sales", tags=["sales-management"])
SalesUser = Depends(require_roles(*SALES_ROLES))

STAGE_ORDER = ["prospecting", "qualification", "proposal", "negotiation", "won", "lost"]
STAGE_LABELS = {
    "prospecting": "Prospecting", "qualification": "Qualification", "proposal": "Proposal / offer",
    "negotiation": "Negotiation", "won": "Won", "lost": "Lost",
}


# ============================================================== pipeline
def _opp_cards(db: Session, opps: list[Opportunity], stale_days: int) -> list[dict[str, Any]]:
    ids = [o.id for o in opps]
    current = now()
    accounts = account_names(db, {o.account_id for o in opps})
    owners = user_names(db, {o.owner_id for o in opps})
    last: dict[uuid.UUID, datetime] = {}
    next_activity: dict[uuid.UUID, datetime] = {}
    next_task: dict[uuid.UUID, datetime] = {}
    if ids:
        for oid, when in db.execute(
            select(SalesActivity.opportunity_id, func.max(SalesActivity.occurred_at))
            .where(SalesActivity.opportunity_id.in_(ids), SalesActivity.status == "completed")
            .group_by(SalesActivity.opportunity_id)
        ):
            last[oid] = aware(when)
        for oid, when in db.execute(
            select(SalesActivity.opportunity_id, func.min(SalesActivity.occurred_at))
            .where(SalesActivity.opportunity_id.in_(ids), SalesActivity.status == "planned", SalesActivity.occurred_at >= current)
            .group_by(SalesActivity.opportunity_id)
        ):
            next_activity[oid] = aware(when)
        for oid, when in db.execute(
            select(CRMTask.opportunity_id, func.min(CRMTask.due_at))
            .where(CRMTask.opportunity_id.in_(ids), CRMTask.status.in_(("open", "in_progress")), CRMTask.due_at.is_not(None))
            .group_by(CRMTask.opportunity_id)
        ):
            next_task[oid] = aware(when)
    cards = []
    for o in opps:
        is_open = o.stage in OPEN_STAGES
        reference = last.get(o.id) or aware(o.created_at)
        idle = (current - reference).days
        risks: list[str] = []
        if is_open:
            if not (o.next_action or "").strip():
                risks.append("No next action recorded")
            if idle >= stale_days:
                risks.append(f"No completed activity for {idle} days (threshold {stale_days})")
            if o.expected_close_date and o.expected_close_date < current.date():
                risks.append(f"Expected close date passed ({o.expected_close_date.isoformat()})")
        followups = [d for d in (next_activity.get(o.id), next_task.get(o.id)) if d]
        cards.append({
            "id": str(o.id), "name": o.name, "account_id": str(o.account_id), "account_name": accounts.get(o.account_id),
            "owner_id": str(o.owner_id), "owner_name": owners.get(o.owner_id), "stage": o.stage,
            "estimated_value": num(o.estimated_value), "probability": o.probability,
            "expected_close_date": iso(o.expected_close_date), "priority": o.priority, "next_action": o.next_action,
            "lost_reason": o.lost_reason, "last_interaction_at": iso(last.get(o.id)),
            "days_since_interaction": idle if o.id in last else None,
            "next_followup_at": iso(min(followups)) if followups else None,
            "days_in_stage": (current - aware(o.stage_changed_at or o.created_at)).days,
            "risks": risks, "at_risk": bool(risks),
            "overdue": bool(is_open and o.expected_close_date and o.expected_close_date < current.date()),
            "created_at": iso(o.created_at),
        })
    return cards


@router.get("/pipeline")
def pipeline(
    owner_id: uuid.UUID | None = None,
    territory: str | None = None,
    account_id: uuid.UUID | None = None,
    stage: str | None = None,
    search: str | None = Query(default=None, max_length=100),
    close_from: date | None = None,
    close_to: date | None = None,
    only_overdue: bool = False,
    stale_days: int = Query(default=14, ge=1, le=365),
    closed_days: int = Query(default=90, ge=0, le=730),
    limit: int = Query(default=300, ge=1, le=500),
    user: User = SalesUser,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    ctx = get_ctx(db, user)
    query = opportunity_scope(ctx)
    if owner_id:
        query = query.where(Opportunity.owner_id == owner_id)
    if territory:
        query = query.where(Account.territory == territory)
    if account_id:
        query = query.where(Opportunity.account_id == account_id)
    if stage:
        query = query.where(Opportunity.stage == stage)
    if search:
        like = f"%{search.strip()}%"
        query = query.where(or_(Opportunity.name.ilike(like), Account.name.ilike(like)))
    if close_from:
        query = query.where(Opportunity.expected_close_date >= close_from)
    if close_to:
        query = query.where(Opportunity.expected_close_date <= close_to)
    if only_overdue:
        query = query.where(Opportunity.stage.in_(OPEN_STAGES), Opportunity.expected_close_date < now().date())
    cutoff = now() - timedelta(days=closed_days)
    query = query.where(
        or_(Opportunity.stage.in_(OPEN_STAGES), Opportunity.stage_changed_at >= cutoff, Opportunity.stage_changed_at.is_(None))
    )
    total = count(db, query)
    opps = list(db.scalars(query.order_by(Opportunity.expected_close_date.is_(None), Opportunity.expected_close_date).limit(limit)))
    cards = _opp_cards(db, opps, stale_days)
    stages = []
    for key in STAGE_ORDER:
        in_stage = [c for c in cards if c["stage"] == key]
        stages.append({
            "key": key, "label": STAGE_LABELS[key], "count": len(in_stage),
            "value": round(sum(c["estimated_value"] for c in in_stage), 2),
            "weighted_value": round(sum(c["estimated_value"] * c["probability"] / 100 for c in in_stage), 2),
            "allowed_next": sorted(STAGE_TRANSITIONS[key] - {key}),
        })
    open_cards = [c for c in cards if c["stage"] in OPEN_STAGES]
    return {
        "items": cards, "stages": stages, "truncated": total > len(opps), "total": total,
        "totals": {
            "open_count": len(open_cards),
            "pipeline_value": round(sum(c["estimated_value"] for c in open_cards), 2),
            "weighted_pipeline_value": round(sum(c["estimated_value"] * c["probability"] / 100 for c in open_cards), 2),
            "weighted_method": "Sum of estimated value x probability / 100 over open opportunities.",
        },
        "thresholds": {"stale_days": stale_days, "closed_days": closed_days},
    }


@router.get("/opportunities/{opportunity_id}")
def opportunity_detail(opportunity_id: uuid.UUID, stale_days: int = 14, user: User = SalesUser, db: Session = Depends(get_db)) -> dict[str, Any]:
    ctx = get_ctx(db, user)
    opp = can_access_opportunity(db, user, opportunity_id)
    card = _opp_cards(db, [opp], stale_days)[0]
    account = db.get(Account, opp.account_id)
    history = list(db.scalars(select(OpportunityStageHistory).where(OpportunityStageHistory.opportunity_id == opp.id)
                              .order_by(OpportunityStageHistory.changed_at)))
    people = user_names(db, {h.changed_by_id for h in history})
    timeline = []
    for index, h in enumerate(history):
        following = aware(history[index + 1].changed_at) if index + 1 < len(history) else now()
        timeline.append({"id": str(h.id), "from_stage": h.from_stage, "to_stage": h.to_stage, "changed_at": iso(h.changed_at),
                         "changed_by": people.get(h.changed_by_id), "note": h.note,
                         "days_in_stage": (following - aware(h.changed_at)).days})
    acts = list(db.scalars(select(SalesActivity).where(SalesActivity.opportunity_id == opp.id).order_by(SalesActivity.occurred_at.desc()).limit(50)))
    tasks = list(db.scalars(select(CRMTask).where(CRMTask.opportunity_id == opp.id).order_by(CRMTask.due_at.is_(None), CRMTask.due_at).limit(50)))
    contact_rows = []
    from app.models import Contact
    for c in db.scalars(select(Contact).where(Contact.account_id == opp.account_id, Contact.status != "archived").limit(20)):
        contact_rows.append({"id": str(c.id), "full_name": c.full_name, "title": c.title, "email": c.email, "phone": c.phone})
    return {
        "opportunity": card, "account": {"id": str(account.id), "name": account.name, "account_type": account.account_type,
                                         "territory": account.territory} if account else None,
        "stage_history": timeline, "activities": activity_rows(db, acts), "tasks": task_rows(db, tasks), "contacts": contact_rows,
        "allowed_next_stages": sorted(STAGE_TRANSITIONS.get(opp.stage, set()) - {opp.stage}),
        "permissions": {"can_reassign": ctx.is_manager and opp.stage in OPEN_STAGES},
        "proposals": {"supported": False, "note": "The backend has no proposal/quotation entity yet."},
        "orders": {"linked": False, "note": "Orders are linked to accounts, not to opportunities. See the account's Orders tab."},
        "notes": {"supported": False, "note": "Opportunity notes are captured through activity notes and outcomes shown above."},
    }


@router.get("/pipeline/analytics")
def pipeline_analytics(
    start: datetime | None = None,
    end: datetime | None = None,
    owner_id: uuid.UUID | None = None,
    territory: str | None = None,
    account_type: str | None = None,
    stale_days: int = Query(default=14, ge=1, le=365),
    user: User = SalesUser,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    ctx = get_ctx(db, user)
    start_dt, end_dt = period(start, end, default_days=90)
    owner_ids = [owner_id] if owner_id else None
    query = opportunity_scope(ctx)
    if owner_id:
        query = query.where(Opportunity.owner_id == owner_id)
    if territory:
        query = query.where(Account.territory == territory)
    if account_type:
        query = query.where(Account.account_type == account_type)
    opps = list(db.scalars(query))
    open_opps = [o for o in opps if o.stage in OPEN_STAGES]
    by_stage = []
    for key in OPEN_STAGES:
        group = [o for o in open_opps if o.stage == key]
        by_stage.append({"stage": key, "label": STAGE_LABELS[key], "count": len(group),
                         "value": round(sum(num(o.estimated_value) for o in group), 2),
                         "weighted_value": round(sum(num(o.estimated_value) * o.probability / 100 for o in group), 2)})
    history: dict[uuid.UUID, list[OpportunityStageHistory]] = {}
    ids = [o.id for o in opps]
    if ids:
        for h in db.scalars(select(OpportunityStageHistory).where(OpportunityStageHistory.opportunity_id.in_(ids))
                            .order_by(OpportunityStageHistory.changed_at)):
            history.setdefault(h.opportunity_id, []).append(h)
    path = ["prospecting", "qualification", "proposal", "negotiation", "won"]
    conversion = []
    for index, key in enumerate(path[:-1]):
        nxt = path[index + 1]
        entered = advanced = 0
        for events in history.values():
            entry = next((h for h in events if h.to_stage == key and start_dt <= aware(h.changed_at) < end_dt), None)
            if entry is None:
                continue
            entered += 1
            if any(h.to_stage == nxt and aware(h.changed_at) >= aware(entry.changed_at) for h in events):
                advanced += 1
        conversion.append({"from": key, "to": nxt, **ratio(advanced, entered)})
    durations: dict[str, list[float]] = {}
    for events in history.values():
        for a, b in zip(events, events[1:]):
            if a.to_stage in OPEN_STAGES:
                durations.setdefault(a.to_stage, []).append((aware(b.changed_at) - aware(a.changed_at)).total_seconds() / 86400)
    avg_time = [{"stage": key, "label": STAGE_LABELS[key], "average_days": round(sum(durations[key]) / len(durations[key]), 1) if durations.get(key) else None,
                 "samples": len(durations.get(key, []))} for key in OPEN_STAGES]
    closed = stage_events(db, ctx, CLOSED_STAGES, start_dt, end_dt, owner_ids=owner_ids, territory=territory, account_type=account_type)
    won = {r.opportunity_id: r for r in closed if r.to_stage == "won"}
    lost = {r.opportunity_id: r for r in closed if r.to_stage == "lost"}
    reasons: dict[str, int] = {}
    for r in lost.values():
        reasons[(r.lost_reason or "No reason recorded").strip()] = reasons.get((r.lost_reason or "No reason recorded").strip(), 0) + 1
    today = now().date()
    this_month = [o for o in open_opps if o.expected_close_date and o.expected_close_date.year == today.year and o.expected_close_date.month == today.month]
    cards = _opp_cards(db, open_opps, stale_days)
    return {
        "period": {"start": iso(start_dt), "end": iso(end_dt)},
        "by_stage": by_stage,
        "pipeline_value": round(sum(num(o.estimated_value) for o in open_opps), 2),
        "weighted_pipeline_value": round(sum(num(o.estimated_value) * o.probability / 100 for o in open_opps), 2),
        "conversion": conversion,
        "average_time_in_stage": avg_time,
        "won_vs_lost": {"won": len(won), "lost": len(lost), "won_value": round(sum(num(r.estimated_value) for r in won.values()), 2),
                        "lost_value": round(sum(num(r.estimated_value) for r in lost.values()), 2), "win_rate": ratio(len(won), len(won) + len(lost))},
        "lost_reasons": [{"reason": k, "count": v} for k, v in sorted(reasons.items(), key=lambda kv: -kv[1])],
        "expected_closing_this_month": {"count": len(this_month), "value": round(sum(num(o.estimated_value) for o in this_month), 2)},
        "stale_opportunities": [c for c in cards if any("No completed activity" in r for r in c["risks"])],
        "without_next_action": [c for c in cards if "No next action recorded" in c["risks"]],
        "methods": {
            "stage_conversion": "Of opportunities that entered stage S during the period (per stage history), the share that has since "
                                "entered the next stage. Baseline history rows created by the migration count as entries at their timestamp.",
            "average_time_in_stage": "Mean days between entering a stage and the next recorded stage change, over completed stays only.",
            "win_rate": "Won / (Won + Lost) opportunities closed in the period.",
            "stale": f"Open opportunity with no completed activity for {stale_days}+ days (or since creation).",
        },
    }


# ============================================================== command center
def _owner_filter(ctx: Ctx, db: Session, user_id: uuid.UUID | None, territory: str | None) -> list[uuid.UUID] | None:
    if user_id:
        ensure_user_visible(ctx, db, user_id)
        return [user_id]
    if territory:
        return [r.id for r in rep_users(ctx, db, territory=territory)] or [uuid.UUID(int=0)]
    return None


@router.get("/command-center")
def command_center(
    start: datetime | None = None,
    end: datetime | None = None,
    territory: str | None = None,
    user_id: uuid.UUID | None = None,
    account_type: str | None = None,
    stage: str | None = None,
    stale_days: int = Query(default=14, ge=1, le=365),
    no_contact_days: int = Query(default=30, ge=1, le=730),
    user: User = SalesUser,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    ctx = get_ctx(db, user)
    require_management(ctx)
    start_dt, end_dt = period(start, end)
    owners = _owner_filter(ctx, db, user_id, territory)
    current = now()
    reps = rep_users(ctx, db, territory=territory)
    if user_id:
        reps = [r for r in reps if r.id == user_id]

    acc_query = account_scope(user, ctx.roles).where(Account.status == "active")
    if territory:
        acc_query = acc_query.where(Account.territory == territory)
    if account_type:
        acc_query = acc_query.where(Account.account_type == account_type)
    if owners:
        acc_query = acc_query.where(Account.assigned_employee_id.in_(owners))
    active_accounts = list(db.scalars(acc_query))
    account_ids = [a.id for a in active_accounts]

    opp_q = opportunity_scope(ctx)
    if owners:
        opp_q = opp_q.where(Opportunity.owner_id.in_(owners))
    if territory:
        opp_q = opp_q.where(Account.territory == territory)
    if account_type:
        opp_q = opp_q.where(Account.account_type == account_type)
    open_q = opp_q.where(Opportunity.stage.in_(OPEN_STAGES))
    if stage:
        open_q = open_q.where(Opportunity.stage == stage)
    open_opps = list(db.scalars(open_q))
    pipeline_value = sum(num(o.estimated_value) for o in open_opps)
    weighted = sum(num(o.estimated_value) * o.probability / 100 for o in open_opps)

    events = stage_events(db, ctx, CLOSED_STAGES, start_dt, end_dt, owner_ids=owners, territory=territory, account_type=account_type)
    won = {e.opportunity_id: e for e in events if e.to_stage == "won"}
    lost = {e.opportunity_id for e in events if e.to_stage == "lost"}
    won_revenue = round(sum(num(e.estimated_value) for e in won.values()), 2)

    lead_q = lead_scope(ctx)
    if owners:
        lead_q = lead_q.where(Lead.assigned_to_id.in_(owners))
    if territory:
        lead_q = lead_q.where(Lead.territory == territory)
    new_leads = count(db, lead_q.where(Lead.created_at >= start_dt, Lead.created_at < end_dt))

    task_q = task_scope(ctx).where(CRMTask.kind == "follow_up", CRMTask.status.in_(("open", "in_progress")), CRMTask.due_at < current)
    if owners:
        task_q = task_q.where(CRMTask.assigned_to_id.in_(owners))
    overdue_followups = count(db, task_q)

    act_q = activity_scope(ctx).where(SalesActivity.status == "completed", SalesActivity.occurred_at >= start_dt, SalesActivity.occurred_at < end_dt)
    if owners:
        act_q = act_q.where(SalesActivity.owner_id.in_(owners))
    if territory:
        act_q = act_q.where(Account.territory == territory)
    completed_activities = count(db, act_q)

    last = last_completed_activity(db, account_ids)
    cutoff = current - timedelta(days=no_contact_days)
    unengaged = [a for a in active_accounts if a.id not in last or last[a.id] < cutoff]

    orders_q = select(CustomerOrder).where(CustomerOrder.account_id.in_(account_ids or [uuid.UUID(int=0)]),
                                           CustomerOrder.order_date >= start_dt, CustomerOrder.order_date < end_dt,
                                           CustomerOrder.status.not_in(("draft", "cancelled")))
    orders_placed = count(db, orders_q)

    rep_ids = [r.id for r in reps]
    target_total, target_reps = 0.0, 0
    if rep_ids:
        first, final = month_start(start_dt), month_start(end_dt - timedelta(seconds=1))
        rows = db.execute(select(SalesTarget.user_id, func.sum(SalesTarget.amount)).where(
            SalesTarget.user_id.in_(rep_ids), SalesTarget.period_start >= first, SalesTarget.period_start <= final).group_by(SalesTarget.user_id)).all()
        target_total, target_reps = sum(float(a) for _, a in rows), len(rows)
        targeted = {uid for uid, _ in rows}
        target_won = round(sum(num(e.estimated_value) for e in won.values() if e.owner_id in targeted), 2)
    else:
        target_won = 0.0

    tender_rows: list[dict[str, Any]] = []
    stock_alerts: int | None = None
    if ctx.level == "global":
        tenders = list(db.scalars(select(Tender).where(Tender.due_at >= current, Tender.due_at <= current + timedelta(days=30)).order_by(Tender.due_at).limit(10)))
        tender_rows = [{"id": str(t.id), "reference": t.reference, "title": t.title, "due_at": iso(t.due_at)} for t in tenders]
        if ctx.roles & {"SUPER_ADMIN", "ADMIN"}:
            stock_alerts = db.scalar(select(func.count(StockRiskAlert.id)).where(StockRiskAlert.status == "open")) or 0

    return {
        "period": {"start": iso(start_dt), "end": iso(end_dt)},
        "filters": {"territory": territory, "user_id": str(user_id) if user_id else None, "account_type": account_type, "stage": stage},
        "kpis": {
            "active_reps": len(reps), "active_accounts": len(active_accounts), "new_leads": new_leads,
            "open_opportunities": len(open_opps), "pipeline_value": round(pipeline_value, 2), "weighted_pipeline": round(weighted, 2),
            "won_revenue": won_revenue, "won_count": len(won), "lost_count": len(lost), "win_rate": ratio(len(won), len(won) + len(lost)),
            "orders_placed": orders_placed,
            "target": {"reps_with_target": target_reps, "target_total": round(target_total, 2), "won_by_targeted_reps": target_won,
                       "achievement": round(target_won / target_total, 4) if target_total else None},
            "overdue_followups": overdue_followups, "completed_activities": completed_activities,
            "accounts_without_engagement": len(unengaged),
            "upcoming_tenders": {"available": ctx.level == "global", "items": tender_rows},
            "inventory_alerts": {"available": stock_alerts is not None, "open": stock_alerts},
        },
        "unengaged_accounts": [{"id": str(a.id), "name": a.name, "last_contact_at": iso(last.get(a.id))} for a in unengaged[:10]],
        "definitions": {
            "won_revenue": "Sum of estimated value of opportunities that moved to Won in the period (no invoice data exists).",
            "orders_placed": "Orders on in-scope active accounts dated in the period with status other than draft or cancelled.",
            "accounts_without_engagement": f"Active accounts with no completed activity in the last {no_contact_days} days.",
            "target": "Sum of monthly targets (months starting inside the period) vs won revenue of the same representatives.",
            "weighted_pipeline": "Open opportunity value x probability / 100.",
        },
        "thresholds": {"stale_days": stale_days, "no_contact_days": no_contact_days},
    }


# ============================================================== team
@router.get("/team-performance")
def team_performance(
    start: datetime | None = None,
    end: datetime | None = None,
    territory: str | None = None,
    search: str | None = Query(default=None, max_length=100),
    sort_by: str = Query(default="won_revenue", pattern="^(name|territory|assigned_accounts|new_leads|open_opportunities|won_opportunities|lost_opportunities|won_revenue|pipeline_value|activities_completed|visits_completed|overdue_tasks)$"),
    descending: bool = True,
    limit: int = Query(default=25, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    user: User = SalesUser,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    ctx = get_ctx(db, user)
    require_management(ctx)
    start_dt, end_dt = period(start, end)
    reps = rep_users(ctx, db, territory=territory, search=search)
    metrics = list(team_metrics(db, ctx, reps, start_dt, end_dt).values())
    metrics.sort(key=lambda m: (m[sort_by] is None, m[sort_by] if not isinstance(m[sort_by], str) else m[sort_by].lower()), reverse=descending)
    return {
        "items": metrics[offset: offset + limit], "total": len(metrics), "limit": limit, "offset": offset,
        "period": {"start": iso(start_dt), "end": iso(end_dt)},
        "definitions": {
            "win_rate": "Won / (Won + Lost) opportunities closed in the period. Reps with no closed deals show no rate.",
            "lead_conversion": "Leads converted in the period / leads created in the period.",
            "followups_on_time": "Follow-ups due in the period completed on or before their due time / follow-ups due in the period.",
            "won_revenue": "Estimated value of opportunities moved to Won in the period (same range for every rep).",
            "target_achievement": "Won revenue / sum of monthly targets starting in the period. Compare whole months for a fair figure.",
        },
    }


@router.get("/team-performance/{rep_id}")
def rep_profile(
    rep_id: uuid.UUID,
    start: datetime | None = None,
    end: datetime | None = None,
    no_contact_days: int = Query(default=30, ge=1, le=730),
    user: User = SalesUser,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    ctx = get_ctx(db, user)
    rep = ensure_user_visible(ctx, db, rep_id)
    start_dt, end_dt = period(start, end)
    metrics = team_metrics(db, ctx, [rep], start_dt, end_dt)[rep.id]
    accounts = list(db.scalars(select(Account).where(Account.assigned_employee_id == rep.id, Account.archived_at.is_(None)).order_by(Account.name)))
    last = last_completed_activity(db, [a.id for a in accounts])
    cutoff = now() - timedelta(days=no_contact_days)
    quiet = [{"id": str(a.id), "name": a.name, "last_contact_at": iso(last.get(a.id))} for a in accounts if a.id not in last or last[a.id] < cutoff]
    owned = list(db.scalars(select(Opportunity.id).where(Opportunity.owner_id == rep.id)))
    changes: list[dict[str, Any]] = []
    if owned:
        for h in db.scalars(select(OpportunityStageHistory).where(OpportunityStageHistory.opportunity_id.in_(owned))
                            .order_by(OpportunityStageHistory.changed_at.desc()).limit(15)):
            changes.append({"kind": "stage", "at": iso(h.changed_at), "text": f"Opportunity moved {h.from_stage or 'new'} → {h.to_stage}",
                            "link": {"type": "opportunity", "id": str(h.opportunity_id)}})
    for a in db.scalars(select(AssignmentHistory).where(or_(AssignmentHistory.to_user_id == rep.id, AssignmentHistory.from_user_id == rep.id))
                        .order_by(AssignmentHistory.created_at.desc()).limit(15)):
        direction = "assigned to" if a.to_user_id == rep.id else "reassigned away from"
        changes.append({"kind": "ownership", "at": iso(a.created_at), "text": f"{a.entity_type.title()} {direction} this representative",
                        "link": {"type": a.entity_type, "id": str(a.entity_id)}})
    changes.sort(key=lambda c: c["at"] or "", reverse=True)
    month = month_start(now())
    target = db.scalar(select(SalesTarget).where(SalesTarget.user_id == rep.id, SalesTarget.period_start == month))
    return {
        "user": {"id": str(rep.id), "full_name": rep.full_name, "email": rep.email, "territory": rep.territory, "is_active": rep.is_active},
        "metrics": metrics, "period": {"start": iso(start_dt), "end": iso(end_dt)},
        "monthly_won_revenue": monthly_won_revenue(db, ctx, [rep.id], 6),
        "quiet_accounts": quiet, "assigned_accounts": len(accounts),
        "current_month_target": float(target.amount) if target else None,
        "recent_changes": sorted(changes, key=lambda c: c["at"] or "", reverse=True)[:20],
        "thresholds": {"no_contact_days": no_contact_days},
    }


# ============================================================== coverage
@router.get("/coverage")
def coverage(
    start: datetime | None = None,
    end: datetime | None = None,
    territory: str | None = None,
    owner_id: uuid.UUID | None = None,
    flag: str | None = Query(default=None, pattern="^(not_contacted|overdue_followups|open_opportunities|stalled|recent_orders|declining)$"),
    no_contact_days: int = Query(default=30, ge=1, le=730),
    stale_days: int = Query(default=14, ge=1, le=365),
    decline_percent: int = Query(default=50, ge=1, le=100),
    min_previous_activities: int = Query(default=2, ge=1, le=50),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    user: User = SalesUser,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    ctx = get_ctx(db, user)
    require_management(ctx)
    start_dt, end_dt = period(start, end)
    length = end_dt - start_dt
    prev_start = start_dt - length
    query = account_scope(user, ctx.roles).where(Account.status == "active", Account.assigned_employee_id.is_not(None))
    if territory:
        query = query.where(Account.territory == territory)
    if owner_id:
        ensure_user_visible(ctx, db, owner_id)
        query = query.where(Account.assigned_employee_id == owner_id)
    accounts = list(db.scalars(query.limit(2000)))
    ids = [a.id for a in accounts] or [uuid.UUID(int=0)]
    owners = user_names(db, {a.assigned_employee_id for a in accounts})
    last = last_completed_activity(db, [a.id for a in accounts])

    def activity_counts(a: datetime, b: datetime) -> dict[uuid.UUID, int]:
        return {aid: n for aid, n in db.execute(
            select(SalesActivity.account_id, func.count(SalesActivity.id)).where(
                SalesActivity.account_id.in_(ids), SalesActivity.status == "completed",
                SalesActivity.occurred_at >= a, SalesActivity.occurred_at < b).group_by(SalesActivity.account_id))}

    current_counts, previous_counts = activity_counts(start_dt, end_dt), activity_counts(prev_start, start_dt)
    overdue = {aid: n for aid, n in db.execute(select(CRMTask.account_id, func.count(CRMTask.id)).where(
        CRMTask.account_id.in_(ids), CRMTask.kind == "follow_up", CRMTask.status.in_(("open", "in_progress")),
        CRMTask.due_at < now()).group_by(CRMTask.account_id))}
    open_opps: dict[uuid.UUID, list[Opportunity]] = {}
    for o in db.scalars(select(Opportunity).where(Opportunity.account_id.in_(ids), Opportunity.stage.in_(OPEN_STAGES))):
        open_opps.setdefault(o.account_id, []).append(o)
    touch = {}
    all_opp_ids = [o.id for group in open_opps.values() for o in group]
    if all_opp_ids:
        touch = {oid: aware(when) for oid, when in db.execute(select(SalesActivity.opportunity_id, func.max(SalesActivity.occurred_at)).where(
            SalesActivity.opportunity_id.in_(all_opp_ids), SalesActivity.status == "completed").group_by(SalesActivity.opportunity_id))}
    orders = {aid: n for aid, n in db.execute(select(CustomerOrder.account_id, func.count(CustomerOrder.id)).where(
        CustomerOrder.account_id.in_(ids), CustomerOrder.order_date >= start_dt, CustomerOrder.order_date < end_dt,
        CustomerOrder.status.not_in(("draft", "cancelled"))).group_by(CustomerOrder.account_id))}

    current = now()
    rows: list[dict[str, Any]] = []
    for a in accounts:
        cur, prev = current_counts.get(a.id, 0), previous_counts.get(a.id, 0)
        stalled = [o for o in open_opps.get(a.id, []) if (current - (touch.get(o.id) or aware(o.created_at))).days >= stale_days]
        flags = []
        if cur == 0:
            flags.append({"flag": "not_contacted", "why": "No completed activity in the selected period"})
        if overdue.get(a.id):
            flags.append({"flag": "overdue_followups", "why": f"{overdue[a.id]} follow-up(s) past due"})
        if open_opps.get(a.id):
            flags.append({"flag": "open_opportunities", "why": f"{len(open_opps[a.id])} open opportunity(ies)"})
        if stalled:
            flags.append({"flag": "stalled", "why": f"{len(stalled)} opportunity(ies) with no activity for {stale_days}+ days"})
        if orders.get(a.id):
            flags.append({"flag": "recent_orders", "why": f"{orders[a.id]} order(s) in the period"})
        if prev >= min_previous_activities and cur <= prev * (1 - decline_percent / 100):
            flags.append({"flag": "declining", "why": f"{cur} completed activities vs {prev} in the previous period (drop of {decline_percent}%+ required)"})
        rows.append({
            "id": str(a.id), "name": a.name, "account_type": a.account_type, "territory": a.territory,
            "owner_id": str(a.assigned_employee_id), "owner_name": owners.get(a.assigned_employee_id),
            "last_contact_at": iso(last.get(a.id)), "activities_in_period": cur, "activities_previous_period": prev,
            "overdue_followups": overdue.get(a.id, 0), "open_opportunities": len(open_opps.get(a.id, [])),
            "stalled_opportunities": len(stalled), "orders_in_period": orders.get(a.id, 0), "flags": flags,
        })
    summary = {key: sum(1 for r in rows if any(f["flag"] == key for f in r["flags"]))
               for key in ("not_contacted", "overdue_followups", "open_opportunities", "stalled", "recent_orders", "declining")}
    per_owner: dict[str, dict[str, Any]] = {}
    for r in rows:
        entry = per_owner.setdefault(r["owner_id"], {"owner_id": r["owner_id"], "owner_name": r["owner_name"], "assigned": 0,
                                                     "contacted": 0, "not_contacted": 0, "overdue_followups": 0, "stalled": 0})
        entry["assigned"] += 1
        entry["contacted" if r["activities_in_period"] else "not_contacted"] += 1
        entry["overdue_followups"] += 1 if r["overdue_followups"] else 0
        entry["stalled"] += 1 if r["stalled_opportunities"] else 0
    filtered = [r for r in rows if not flag or any(f["flag"] == flag for f in r["flags"])]
    filtered.sort(key=lambda r: (-(len(r["flags"])), r["name"].lower()))
    return {
        "items": filtered[offset: offset + limit], "total": len(filtered), "limit": limit, "offset": offset,
        "summary": summary, "per_owner": sorted(per_owner.values(), key=lambda e: e["owner_name"] or ""),
        "period": {"start": iso(start_dt), "end": iso(end_dt), "previous_start": iso(prev_start)},
        "thresholds": {"no_contact_days": no_contact_days, "stale_days": stale_days, "decline_percent": decline_percent,
                       "min_previous_activities": min_previous_activities},
        "definitions": {
            "contacted": "At least one completed activity in the selected period.",
            "declining": f"Completed activities fell by {decline_percent}% or more versus the previous period of equal length, "
                         f"and the previous period had at least {min_previous_activities} activities.",
            "stalled": f"Open opportunity with no completed activity for {stale_days}+ days.",
            "recent_orders": "Orders in the period with status other than draft/cancelled.",
        },
    }


# ============================================================== targets
@router.get("/targets")
def list_targets(month: date | None = None, user: User = SalesUser, db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    ctx = get_ctx(db, user)
    first = month_start(month or now())
    query = select(SalesTarget).where(SalesTarget.period_start == first)
    if ctx.level == "own":
        query = query.where(SalesTarget.user_id == user.id)
    elif ctx.level == "territory":
        query = query.where(SalesTarget.user_id.in_(select(User.id).where(User.territory == user.territory)))
    rows = list(db.scalars(query))
    names = user_names(db, {r.user_id for r in rows})
    return [{"id": str(r.id), "user_id": str(r.user_id), "user_name": names.get(r.user_id), "period_start": r.period_start.isoformat(),
             "amount": float(r.amount)} for r in rows]


@router.put("/targets")
def set_target(payload: TargetIn, user: User = Depends(require_roles("SUPER_ADMIN", "ADMIN", "SALES_MANAGER")), db: Session = Depends(get_db)) -> dict[str, Any]:
    ctx = get_ctx(db, user)
    if payload.period_start.day != 1:
        raise HTTPException(status_code=422, detail="Targets are monthly; period_start must be the first day of a month")
    target_user = ensure_user_visible(ctx, db, payload.user_id)
    row = db.scalar(select(SalesTarget).where(SalesTarget.user_id == target_user.id, SalesTarget.period_start == payload.period_start))
    before = float(row.amount) if row else None
    if row:
        row.amount = payload.amount
        row.set_by_id = user.id
    else:
        row = SalesTarget(user_id=target_user.id, period_start=payload.period_start, amount=payload.amount, set_by_id=user.id)
        db.add(row)
    db.flush()
    record_audit(db, actor_id=user.id, action="sales_target_set", entity_type="user", entity_id=target_user.id,
                 before={"amount": before}, after={"amount": float(payload.amount), "period_start": payload.period_start})
    return {"id": str(row.id), "user_id": str(target_user.id), "period_start": payload.period_start.isoformat(), "amount": float(row.amount)}


# ============================================================== reporting
REPORT_CATALOG = {
    "top_conversion": {"title": "Win rate by representative", "example": "Which representative had the highest conversion rate last month?"},
    "stale_opportunities": {"title": "Opportunities without recent activity", "example": "Show all opportunities without activity in the last 14 days"},
    "overdue_followups": {"title": "Accounts with overdue follow-ups", "example": "Which accounts have overdue follow-ups?"},
    "team_comparison": {"title": "Sales performance comparison", "example": "Compare sales performance across representatives this quarter"},
    "moved_to_stage": {"title": "Opportunities moved to a stage", "example": "Which opportunities moved to negotiation this month?"},
    "lead_funnel": {"title": "Lead and deal funnel", "example": "Show leads created, qualified, converted, won and lost this month"},
    "below_target": {"title": "Representatives below target", "example": "Which representatives are below their targets?"},
    "top_accounts_revenue": {"title": "Accounts by won revenue", "example": "Which accounts generated the most won revenue?"},
    "no_next_action": {"title": "Opportunities without a next action", "example": "Which opportunities have no next action?"},
}


def _quarter_bounds(today: date, offset: int = 0) -> tuple[datetime, datetime]:
    index = (today.month - 1) // 3 + offset
    year = today.year + index // 4
    index %= 4
    first = date(year, index * 3 + 1, 1)
    last_month = index * 3 + 3
    return utc_midnight(first), utc_midnight(date(year, last_month, monthrange(year, last_month)[1])) + timedelta(days=1)


def parse_period(text: str) -> tuple[datetime, datetime, str]:
    lowered = text.lower()
    today = now().date()
    if "last month" in lowered:
        last = month_start(today - timedelta(days=today.day))
        return utc_midnight(last), utc_midnight(next_month(last)), "last calendar month"
    if "this month" in lowered:
        first = month_start(today)
        return utc_midnight(first), now(), "this month to date"
    if "last quarter" in lowered:
        a, b = _quarter_bounds(today, -1)
        return a, b, "last calendar quarter"
    if "this quarter" in lowered:
        a, _ = _quarter_bounds(today)
        return a, now(), "this quarter to date"
    if "this year" in lowered:
        return utc_midnight(date(today.year, 1, 1)), now(), "this year to date"
    if "last week" in lowered:
        monday = today - timedelta(days=today.weekday() + 7)
        return utc_midnight(monday), utc_midnight(monday + timedelta(days=7)), "last calendar week"
    if "this week" in lowered:
        return utc_midnight(today - timedelta(days=today.weekday())), now(), "this week to date"
    match = re.search(r"last (\d{1,3}) days", lowered)
    days = int(match.group(1)) if match else 30
    return now() - timedelta(days=days), now(), f"last {days} days" if match else "default: last 30 days"


def resolve_intent(question: str) -> dict[str, Any] | None:
    q = question.lower()
    days = re.search(r"(\d{1,3}) days", q)
    stage = next((s for s in ("negotiation", "proposal", "qualification", "prospecting", "won", "lost") if s in q), None)
    if "moved to" in q and stage:
        return {"report": "moved_to_stage", "stage": stage}
    if "next action" in q:
        return {"report": "no_next_action"}
    if "overdue" in q and "follow" in q:
        return {"report": "overdue_followups"}
    if "target" in q and ("below" in q or "behind" in q or "under" in q):
        return {"report": "below_target"}
    if "conversion" in q or "win rate" in q:
        return {"report": "top_conversion"}
    if ("without activity" in q or "no activity" in q or "stale" in q or "inactive" in q) and "opportunit" in q:
        return {"report": "stale_opportunities", "stale_days": int(days.group(1)) if days else 14}
    if "compare" in q or "performance across" in q or "comparison" in q:
        return {"report": "team_comparison"}
    if "lead" in q and ("created" in q or "qualified" in q or "converted" in q or "funnel" in q):
        return {"report": "lead_funnel"}
    if "most" in q and "revenue" in q:
        return {"report": "top_accounts_revenue"}
    return None


def run_report(db: Session, ctx: Ctx, key: str, start: datetime, end: datetime, *, stage: str | None, stale_days: int) -> dict[str, Any]:
    base = {"report": key, "title": REPORT_CATALOG[key]["title"], "period": {"start": iso(start), "end": iso(end)}, "filters": {}}
    current = now()
    if key in ("top_conversion", "team_comparison", "below_target"):
        reps = rep_users(ctx, db)
        metrics = list(team_metrics(db, ctx, reps, start, end).values())
        if key == "top_conversion":
            rows = [{"representative": m["name"], "territory": m["territory"], "won": m["won_opportunities"], "lost": m["lost_opportunities"],
                     "win_rate": m["win_rate"]["rate"], "link": {"type": "rep", "id": m["user_id"]}} for m in metrics]
            rated = sorted((r for r in rows if r["win_rate"] is not None), key=lambda r: -r["win_rate"])
            unrated = [r for r in rows if r["win_rate"] is None]
            return {**base, "columns": [("representative", "Representative"), ("territory", "Territory"), ("won", "Won"), ("lost", "Lost"), ("win_rate", "Win rate")],
                    "rows": rated + unrated, "status": "ok" if rated else ("unavailable" if rows else "no_results"),
                    "message": None if rated else "No representative closed an opportunity in this period, so no win rate can be calculated.",
                    "method": "Win rate = won / (won + lost) opportunities closed in the period. Representatives with no closed deals are listed without a rate."}
        if key == "team_comparison":
            rows = [{"representative": m["name"], "won_revenue": m["won_revenue"], "won": m["won_opportunities"], "lost": m["lost_opportunities"],
                     "pipeline_value": m["pipeline_value"], "activities": m["activities_completed"], "link": {"type": "rep", "id": m["user_id"]}} for m in metrics]
            rows.sort(key=lambda r: -r["won_revenue"])
            return {**base, "columns": [("representative", "Representative"), ("won_revenue", "Won revenue"), ("won", "Won"), ("lost", "Lost"),
                                        ("pipeline_value", "Open pipeline"), ("activities", "Completed activities")],
                    "rows": rows, "status": "ok" if rows else "no_results", "message": None if rows else "No representatives are visible to you.",
                    "method": "All figures use the same period for every representative. Pipeline is current open value, not period-bound."}
        rows, missing = [], []
        for m in metrics:
            if m["target"] is None:
                missing.append(m["name"])
            elif (m["target"]["achievement"] or 0) < 1:
                rows.append({"representative": m["name"], "target": m["target"]["amount"], "won_revenue": m["won_revenue"],
                             "achievement": m["target"]["achievement"], "link": {"type": "rep", "id": m["user_id"]}})
        if not any(m["target"] for m in metrics):
            return {**base, "columns": [], "rows": [], "status": "unavailable",
                    "message": "No sales targets are set for this period, so target attainment cannot be calculated.",
                    "method": "Won revenue / monthly targets starting in the period."}
        rows.sort(key=lambda r: r["achievement"] or 0)
        return {**base, "columns": [("representative", "Representative"), ("target", "Target"), ("won_revenue", "Won revenue"), ("achievement", "Achievement")],
                "rows": rows, "status": "ok" if rows else "no_results",
                "message": None if rows else "Every representative with a target has met it.",
                "method": "Won revenue / sum of monthly targets starting in the period. Representatives without a target are excluded"
                          + (f" ({len(missing)} without a target)." if missing else "."), "excluded_without_target": missing}
    if key == "stale_opportunities" or key == "no_next_action":
        opps = list(db.scalars(opportunity_scope(ctx).where(Opportunity.stage.in_(OPEN_STAGES))))
        cards = _opp_cards(db, opps, stale_days)
        if key == "stale_opportunities":
            picked = [c for c in cards if any("No completed activity" in r for r in c["risks"])]
            base["filters"] = {"stale_days": stale_days}
            method = f"Open opportunities with no completed activity in the last {stale_days} days (or since creation if never touched)."
        else:
            picked = [c for c in cards if "No next action recorded" in c["risks"]]
            method = "Open opportunities whose next action field is empty."
        rows = [{"opportunity": c["name"], "account": c["account_name"], "owner": c["owner_name"], "stage": c["stage"],
                 "value": c["estimated_value"], "days_since_interaction": c["days_since_interaction"],
                 "link": {"type": "opportunity", "id": c["id"]}} for c in picked]
        return {**base, "columns": [("opportunity", "Opportunity"), ("account", "Account"), ("owner", "Owner"), ("stage", "Stage"), ("value", "Value"),
                                    ("days_since_interaction", "Days since last activity")],
                "rows": rows, "status": "ok" if rows else "no_results", "message": None if rows else "No open opportunities match.", "method": method}
    if key == "overdue_followups":
        tasks = list(db.scalars(task_scope(ctx).where(CRMTask.kind == "follow_up", CRMTask.status.in_(("open", "in_progress")),
                                                      CRMTask.due_at < current, CRMTask.account_id.is_not(None)).order_by(CRMTask.due_at)))
        trows = task_rows(db, tasks)
        grouped: dict[str, dict[str, Any]] = {}
        for t in trows:
            entry = grouped.setdefault(t["account_id"], {"account": t["account_name"], "overdue": 0, "oldest_due": t["due_at"],
                                                         "owner": t["assigned_to_name"], "link": {"type": "account", "id": t["account_id"]}})
            entry["overdue"] += 1
        rows = sorted(grouped.values(), key=lambda r: -r["overdue"])
        return {**base, "columns": [("account", "Account"), ("owner", "Assigned to"), ("overdue", "Overdue follow-ups"), ("oldest_due", "Oldest due")],
                "rows": rows, "status": "ok" if rows else "no_results", "message": None if rows else "There are no overdue follow-ups.",
                "method": "Open follow-up tasks on accounts with a due time in the past, as of now (not period-bound)."}
    if key == "moved_to_stage":
        target_stage = stage or "negotiation"
        events = stage_events(db, ctx, (target_stage,), start, end)
        accounts = account_names(db, {e.account_id for e in events})
        owners = user_names(db, {e.owner_id for e in events})
        rows = [{"opportunity": e.name, "account": accounts.get(e.account_id), "owner": owners.get(e.owner_id), "moved_at": iso(e.changed_at),
                 "value": num(e.estimated_value), "link": {"type": "opportunity", "id": str(e.opportunity_id)}} for e in events]
        base["filters"] = {"stage": target_stage}
        return {**base, "columns": [("opportunity", "Opportunity"), ("account", "Account"), ("owner", "Owner"), ("moved_at", "Moved at"), ("value", "Value")],
                "rows": rows, "status": "ok" if rows else "no_results", "message": None if rows else f"No opportunities moved to {target_stage} in this period.",
                "method": f"Stage-history events with to_stage = {target_stage} inside the period."}
    if key == "lead_funnel":
        leads = lead_scope(ctx)
        created = count(db, leads.where(Lead.created_at >= start, Lead.created_at < end))
        qualified = count(db, leads.where(Lead.qualified_at >= start, Lead.qualified_at < end))
        converted = count(db, leads.where(Lead.converted_at >= start, Lead.converted_at < end))
        events = stage_events(db, ctx, CLOSED_STAGES, start, end)
        won, lost = len({e.opportunity_id for e in events if e.to_stage == "won"}), len({e.opportunity_id for e in events if e.to_stage == "lost"})
        rows = [{"step": "Leads created", "count": created}, {"step": "Leads qualified", "count": qualified},
                {"step": "Leads converted to opportunities", "count": converted}, {"step": "Opportunities won", "count": won},
                {"step": "Opportunities lost", "count": lost}]
        return {**base, "columns": [("step", "Step"), ("count", "Count")], "rows": rows, "status": "ok",
                "message": None if any(r["count"] for r in rows) else "No lead or deal events were recorded in this period.",
                "method": "Each row counts events dated inside the period; they are not a cohort, so a lead created earlier can be won now."}
    if key == "top_accounts_revenue":
        events = [e for e in stage_events(db, ctx, ("won",), start, end)]
        totals: dict[uuid.UUID, dict[str, Any]] = {}
        for e in events:
            entry = totals.setdefault(e.account_id, {"won": 0, "revenue": 0.0})
            entry["won"] += 1
            entry["revenue"] = round(entry["revenue"] + num(e.estimated_value), 2)
        names = account_names(db, set(totals))
        rows = sorted(({"account": names.get(aid), "won": v["won"], "won_revenue": v["revenue"], "link": {"type": "account", "id": str(aid)}}
                       for aid, v in totals.items()), key=lambda r: -r["won_revenue"])[:25]
        return {**base, "columns": [("account", "Account"), ("won", "Won deals"), ("won_revenue", "Won revenue")], "rows": rows,
                "status": "ok" if rows else "no_results", "message": None if rows else "No opportunities were won in this period.",
                "method": "Estimated value of opportunities moved to Won in the period, grouped by account."}
    raise HTTPException(status_code=404, detail="Unknown report")


def _finish(ctx: Ctx, result: dict[str, Any]) -> dict[str, Any]:
    result["columns"] = [{"key": k, "label": label} for k, label in result["columns"]]
    result["export_allowed"] = bool(ctx.roles & MANAGEMENT_VIEW_ROLES)
    result["scope"] = {"global": "Entire organization", "territory": "Your territory", "own": "Your own records"}[ctx.level]
    return result


@router.get("/reports/catalog")
def report_catalog(user: User = SalesUser, db: Session = Depends(get_db)) -> list[dict[str, str]]:
    require_management(get_ctx(db, user))
    return [{"key": k, **v} for k, v in REPORT_CATALOG.items()]


@router.post("/reports/run")
def run_report_endpoint(payload: ReportRun, user: User = SalesUser, db: Session = Depends(get_db)) -> dict[str, Any]:
    ctx = get_ctx(db, user)
    require_management(ctx)
    if payload.report not in REPORT_CATALOG:
        raise HTTPException(status_code=404, detail="Unknown report")
    start, end = period(payload.start, payload.end)
    record_audit(db, actor_id=user.id, action="report_run", entity_type="report", entity_id=None, after={"report": payload.report})
    return _finish(ctx, run_report(db, ctx, payload.report, start, end, stage=payload.stage, stale_days=payload.stale_days))


@router.post("/reports/ask")
def ask_report(payload: ReportAsk, user: User = SalesUser, db: Session = Depends(get_db)) -> dict[str, Any]:
    """Maps a question onto a fixed catalogue of authorised reports. No model is used and no SQL is generated."""
    ctx = get_ctx(db, user)
    require_management(ctx)
    intent = resolve_intent(payload.question)
    if intent is None:
        return {"status": "not_understood", "message": "I could not match that question to a supported report.",
                "suggestions": [{"key": k, **v} for k, v in REPORT_CATALOG.items()], "interpreter": "keyword_rules"}
    if payload.start and payload.end:
        start, end = period(payload.start, payload.end)
        period_label = "explicit range"
    else:
        start, end, period_label = parse_period(payload.question)
    record_audit(db, actor_id=user.id, action="report_run", entity_type="report", entity_id=None,
                 after={"report": intent["report"], "question": payload.question[:200]})
    result = run_report(db, ctx, intent["report"], start, end, stage=intent.get("stage"), stale_days=intent.get("stale_days", 14))
    result["interpretation"] = {"question": payload.question, "matched_report": intent["report"], "period_basis": period_label,
                                "interpreter": "keyword_rules", "ai_generated": False}
    return _finish(ctx, result)
