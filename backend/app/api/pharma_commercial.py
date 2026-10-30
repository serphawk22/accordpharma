"""Pharmaceutical Commercial APIs: Clinical e-Detailing (IVA) and Hospital Formulary / P&T Access."""

import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.api.sales_common import (
    Ctx,
    aware,
    get_ctx,
    now,
    rep_users,
    user_names,
)
from app.core.audit import record_audit
from app.core.permissions import SALES_ROLES, can_access_account, can_access_contact
from app.core.security import get_user_roles, require_roles
from app.db.session import get_db
from app.models import (
    Account,
    AccountNote,
    Contact,
    CRMTask,
    HealthcareProfessionalProfile,
    Product,
    SalesActivity,
    User,
)

router = APIRouter(prefix="/api/v1/sales", tags=["pharma-commercial"])
SalesUser = Depends(require_roles(*SALES_ROLES))

# In-memory storage with initial structured formulary records linking to real accounts and products
_FORMULARY_STORE: dict[str, dict[str, Any]] = {}


def _init_default_formulary(db: Session) -> None:
    """Seed baseline hospital formulary data if store is empty."""
    if _FORMULARY_STORE:
        return
    accounts = list(db.scalars(select(Account).where(Account.archived_at.is_(None)).limit(10)))
    products = list(db.scalars(select(Product).where(Product.is_active.is_(True)).limit(10)))
    if not accounts or not products:
        return

    sample_tiers = [
        ("Tier 1: Preferred / First-Line", "Approved", "Replacing Gen-Chemo SOC", 420000.0),
        ("Tier 2: Prior Authorization Required", "Approved", "Displacing Legacy Statin Combo", 280000.0),
        ("Tier 1: Preferred / First-Line", "Approved", "Protocol Standardization", 510000.0),
        ("Tier 3: Specialist Restricted", "Under Review", "Replacing Biologic Competitor X", 195000.0),
        ("Non-Formulary: Off-Protocol", "Dossier Submitted", "Under P&T Evaluation vs Sandoz", 350000.0),
    ]

    for idx, acc in enumerate(accounts[:5]):
        prod = products[idx % len(products)]
        tier, pt_status, competitor, val = sample_tiers[idx % len(sample_tiers)]
        fid = f"{acc.id}_{prod.id}"
        meeting_date = (date.today() + timedelta(days=14 + idx * 7)).isoformat()
        _FORMULARY_STORE[fid] = {
            "id": fid,
            "account_id": str(acc.id),
            "account_name": acc.name,
            "territory": acc.territory or "National",
            "product_id": str(prod.id),
            "product_name": prod.name,
            "product_sku": prod.sku,
            "category": prod.category or "Therapeutic",
            "formulary_tier": tier,
            "pt_status": pt_status,
            "pt_meeting_date": meeting_date,
            "physician_champion": "Dr. Sarah Chen, MD (Chief of Oncology)" if idx % 2 == 0 else "Dr. Marcus Vance, MD (Cardiology Chair)",
            "protocol_requirements": "Requires baseline EGFR/ALK biomarker report within 30 days of initiation." if idx % 2 == 0 else "Indicated for LDL-C > 100 mg/dL despite maximally tolerated statin.",
            "competitor_displaced": competitor,
            "annual_potential_value": val,
            "updated_at": (datetime.now(timezone.utc) - timedelta(days=idx * 3)).isoformat(),
        }


# ===========================================================================
# 1. CLINICAL e-DETAILING (IVA) PRESENTATION MODELS & ENDPOINTS
# ===========================================================================

CLINICAL_PORTFOLIO = [
    {
        "id": "onco-700",
        "product_name": "OncoTarget-700 (Lenvastat Alfa)",
        "indication": "Advanced / Metastatic Renal Cell Carcinoma & Refractory Hepatocellular Carcinoma",
        "regulatory_approval": "FDA Fast-Track Approved / EMA Orphan Drug Designation",
        "category": "Targeted Oncology",
        "slides": [
            {
                "slide_id": "onco-moa",
                "title": "Dual Tyrosine Kinase (VEGFR 1-3 & FGFR 1-4) Inhibition",
                "subtitle": "Mechanism of Action in Tumor Angiogenesis",
                "content": "OncoTarget-700 simultaneously binds the ATP kinase pocket of VEGFR-1/2/3 and FGFR-1/4 with sub-nanomolar IC50 potency (0.42 nM), completely halting downstream Ras-Raf-MEK-ERK signaling and disrupting neo-vascular pericyte recruitment.",
                "key_metric": "0.42 nM IC50 Potency",
                "chart_type": "moa_cascade",
                "clinical_evidence": "Nature Clinical Oncology 2024; 28(4): 412-426",
            },
            {
                "slide_id": "onco-os",
                "title": "Phase III OASIS Trial: Statistically Significant Overall Survival (OS)",
                "subtitle": "Primary Endpoint: Randomized, Double-Blind, Global Multi-Center Study (n=842)",
                "content": "Median overall survival was extended to 24.8 months in the OncoTarget-700 arm compared to 14.2 months in the standard-of-care sunitinib arm. Statistically robust with Hazard Ratio: 0.62 (95% CI: 0.51-0.75; p < 0.0001).",
                "key_metric": "+10.6 Months Median OS Benefit",
                "chart_type": "kaplan_meier_os",
                "hazard_ratio": "0.62 (p < 0.0001)",
                "clinical_evidence": "Lancet Oncology 2025; 26: 189-204",
            },
            {
                "slide_id": "onco-pfs-orr",
                "title": "Progression-Free Survival (PFS) & Objective Response Rate (ORR)",
                "subtitle": "RECIST 1.1 Confirmed Radiographic Tumor Burden Shrinkage",
                "content": "Median PFS achieved 16.4 months vs 8.4 months for comparator. Confirmed ORR stood at 42.6% (including 8.4% complete remission CR) vs 18.2% for control.",
                "key_metric": "42.6% Confirmed ORR (8.4% CR)",
                "chart_type": "waterfall_response",
                "clinical_evidence": "Journal of Clinical Oncology 2025; 43(12): 1500-1512",
            },
            {
                "slide_id": "onco-safety",
                "title": "Predictable & Proactively Manageable Safety Profile",
                "subtitle": "Grade 3/4 Adverse Event Distribution & Tolerability",
                "content": "Hypertension (Grade 3: 14.2%) was effectively managed with standard ARB/CCB regimens without treatment discontinuation. Zero clinically significant QTc prolongation or cardiac failure signals detected.",
                "key_metric": "91.8% Patient Adherence at 12 Months",
                "chart_type": "forest_plot_safety",
                "clinical_evidence": "OASIS Safety Committee Meta-Analysis 2025",
            },
        ],
    },
    {
        "id": "cardio-xr",
        "product_name": "CardioVas-XR (Evolosumab Extended-Release)",
        "indication": "Heterozygous Familial Hypercholesterolemia & Secondary ASCVD Prevention",
        "regulatory_approval": "FDA Approved First-Line Biologic",
        "category": "Cardiovascular Therapeutics",
        "slides": [
            {
                "slide_id": "cardio-moa",
                "title": "Continuous PCSK9 Neutralization & Hepatic LDLR Recycling",
                "subtitle": "Sustained Monoclonal Antibody Bio-Availability",
                "content": "CardioVas-XR features a proprietary PEGylated Fc hinge mutation delivering sustained 30-day circulating half-life. It prevents PCSK9-mediated lysosomal degradation of LDLR, multiplying active cell-surface clearance of circulating atherogenic particles.",
                "key_metric": "30-Day Subcutaneous Dosing Interval",
                "chart_type": "moa_cascade",
                "clinical_evidence": "Circulation Research 2024; 134(8): 980-992",
            },
            {
                "slide_id": "cardio-efficacy",
                "title": "FOURIER-Plus Study: 63.4% LDL-C Reduction",
                "subtitle": "52-Week Sustained Atherogenic Lipid Clearance (n=1,240)",
                "content": "Mean baseline LDL-C fell from 148 mg/dL to 54 mg/dL at week 12 and was sustained at 52 mg/dL through week 52 when added to background high-intensity statin therapy.",
                "key_metric": "63.4% Sustained Reduction in LDL-C",
                "chart_type": "lipid_clearance_curve",
                "clinical_evidence": "New England Journal of Medicine 2024; 391: 1102-1115",
            },
            {
                "slide_id": "cardio-mace",
                "title": "21% Reduction in Major Adverse Cardiovascular Events (MACE)",
                "subtitle": "Composite Endpoint: CV Death, Non-Fatal MI, Ischemic Stroke",
                "content": "Kaplan-Meier analysis demonstrated a statistically significant 21% relative risk reduction (HR: 0.79, 95% CI: 0.69-0.90; p=0.0004) in composite MACE events at 3 years follow-up.",
                "key_metric": "21% Relative Risk Reduction (p=0.0004)",
                "chart_type": "mace_survival_curve",
                "clinical_evidence": "European Heart Journal 2025; 46(3): 315-329",
            },
        ],
    },
    {
        "id": "neuro-iv",
        "product_name": "NeuroGuard-IV (Glatirate Sodium High-Concentration)",
        "indication": "Relapsing-Remitting Multiple Sclerosis (RRMS) & Active Secondary Progressive MS",
        "regulatory_approval": "FDA & EMA Approved Neuro-Immunomodulator",
        "category": "Neuro-Immunology",
        "slides": [
            {
                "slide_id": "neuro-moa",
                "title": "T-Cell Receptor Antagonism & Regulatory Th2 Immune Shift",
                "subtitle": "Central Nervous System Blood-Brain Barrier Protection",
                "content": "NeuroGuard-IV competes with myelin basic protein (MBP) for binding to MHC class II molecules, inducing antigen-specific suppressor T-cells (Th2/Treg) that cross the blood-brain barrier to secrete neuroprotective anti-inflammatory cytokines (IL-10, TGF-beta).",
                "key_metric": "Neuroprotective Cytokine Induction",
                "chart_type": "immune_shift_diagram",
                "clinical_evidence": "Annals of Neurology 2024; 95(2): 210-224",
            },
            {
                "slide_id": "neuro-arr",
                "title": "PREVENT-MS Trial: 38.2% Reduction in Annualized Relapse Rate (ARR)",
                "subtitle": "24-Month Double-Blind Comparative Trial (n=910)",
                "content": "Annualized relapse rate dropped significantly to 0.18 vs 0.29 in the active comparator cohort (p < 0.001). 78% of patients remained completely relapse-free at month 24.",
                "key_metric": "78% Relapse-Free at 24 Months",
                "chart_type": "relapse_rate_bar",
                "clinical_evidence": "Neurology 2025; 104(6): 788-799",
            },
        ],
    },
]


class DetailingSessionIn(BaseModel):
    contact_id: uuid.UUID
    account_id: uuid.UUID
    product_name: str = Field(min_length=1, max_length=200)
    slides_covered: list[str] = Field(default_factory=list)
    duration_seconds: int = Field(default=180, ge=10, le=7200)
    sentiment: str = Field(default="Receptive / Positive", max_length=120)
    objections: list[str] = Field(default_factory=list)
    sample_units_requested: int = Field(default=0, ge=0, le=100)
    commitments: str | None = Field(default=None, max_length=4000)
    next_action: str | None = Field(default=None, max_length=240)
    follow_up_due_days: int | None = Field(default=7, ge=1, le=90)


@router.get("/edetailing/products")
def get_edetailing_portfolio(
    user: User = SalesUser,
) -> dict[str, Any]:
    """Returns official clinical e-detailing interactive slide decks for Accord Pharma therapeutics."""
    return {
        "portfolio": CLINICAL_PORTFOLIO,
        "total_therapeutic_lines": len(CLINICAL_PORTFOLIO),
        "compliance_approved": True,
        "valid_until": "2026-12-31",
    }


@router.post("/edetailing/sessions", status_code=201)
def log_edetailing_session(
    payload: DetailingSessionIn,
    user: User = SalesUser,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Records an executed clinical e-detailing session as a verified SalesActivity with slide engagement analytics,

    physician objections, sample drop requests, and automatic CRM task generation.
    """
    account = can_access_account(db, user, payload.account_id)
    contact = can_access_contact(db, user, payload.contact_id)

    # Format detailing outcome and notes
    slides_text = ", ".join(payload.slides_covered) if payload.slides_covered else "Full Clinical Overview"
    objections_text = "; ".join(payload.objections) if payload.objections else "None noted"
    sample_note = f"Physician requested {payload.sample_units_requested} sample unit(s) for clinical trial evaluation." if payload.sample_units_requested > 0 else "No samples requested."

    notes_body = (
        f"Clinical e-Detailing Session ({payload.duration_seconds} seconds).\n"
        f"Slides Reviewed: {slides_text}.\n"
        f"Physician Sentiment: {payload.sentiment}.\n"
        f"Sample Distribution: {sample_note}\n"
        f"Commitments: {payload.commitments or 'Ongoing clinical evaluation'}"
    )

    activity = SalesActivity(
        owner_id=user.id,
        account_id=account.id,
        contact_id=contact.id,
        activity_type="detailing",
        status="completed",
        occurred_at=now(),
        completed_at=now(),
        purpose=f"Clinical Detailing: {payload.product_name}",
        location=account.name,
        priority="high" if "High-Volume" in payload.sentiment or "KOL" in payload.sentiment else "normal",
        notes=notes_body,
        outcome=f"Detailing completed. Sentiment: {payload.sentiment}. Objections: {objections_text}.",
        products_discussed=payload.product_name,
        objections=objections_text,
        commitments=payload.commitments,
        next_action=payload.next_action or f"Follow-up with Dr. {contact.full_name} on {payload.product_name} prescribing trial",
    )
    db.add(activity)
    db.flush()

    # Automatically generate CRM follow-up task
    task = None
    if payload.next_action or payload.sample_units_requested > 0:
        due_days = payload.follow_up_due_days or 7
        task_title = payload.next_action or f"Deliver samples & review tolerability with Dr. {contact.full_name}"
        task = CRMTask(
            account_id=account.id,
            activity_id=activity.id,
            created_by_id=user.id,
            assigned_to_id=user.id,
            kind="follow_up",
            status="open",
            title=task_title,
            due_at=now() + timedelta(days=due_days),
        )
        db.add(task)
        db.flush()

    record_audit(
        db,
        actor_id=user.id,
        action="edetailing_session_completed",
        entity_type="sales_activity",
        entity_id=activity.id,
        after={
            "product": payload.product_name,
            "hcp": contact.full_name,
            "duration": payload.duration_seconds,
            "sentiment": payload.sentiment,
            "samples": payload.sample_units_requested,
        },
    )

    return {
        "success": True,
        "activity_id": str(activity.id),
        "task_id": str(task.id) if task else None,
        "message": f"Successfully recorded clinical e-detailing session with Dr. {contact.full_name} on {payload.product_name}.",
        "activity": {
            "id": str(activity.id),
            "occurred_at": activity.occurred_at.isoformat(),
            "product": payload.product_name,
            "sentiment": payload.sentiment,
            "duration": payload.duration_seconds,
        },
    }


# ===========================================================================
# 2. HOSPITAL FORMULARY & P&T COMMITTEE ACCESS ENDPOINTS
# ===========================================================================

class FormularyUpdateIn(BaseModel):
    account_id: uuid.UUID
    product_name: str = Field(min_length=1, max_length=200)
    formulary_tier: str = Field(min_length=1, max_length=120)
    pt_status: str = Field(min_length=1, max_length=120)
    pt_meeting_date: date | None = None
    physician_champion: str | None = Field(default=None, max_length=200)
    protocol_requirements: str | None = Field(default=None, max_length=4000)
    competitor_displaced: str | None = Field(default=None, max_length=200)
    annual_potential_value: float = Field(default=0.0, ge=0.0)


@router.get("/formulary")
def list_hospital_formularies(
    territory: str | None = None,
    tier: str | None = None,
    pt_status: str | None = None,
    search: str | None = None,
    user: User = SalesUser,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Returns institutional hospital formulary statuses, tier access levels, and P&T review milestones."""
    _init_default_formulary(db)
    items = list(_FORMULARY_STORE.values())

    if territory:
        items = [i for i in items if i.get("territory", "").lower() == territory.lower()]
    if tier:
        items = [i for i in items if tier.lower() in i.get("formulary_tier", "").lower()]
    if pt_status:
        items = [i for i in items if pt_status.lower() in i.get("pt_status", "").lower()]
    if search:
        s = search.lower().strip()
        items = [
            i
            for i in items
            if s in i.get("account_name", "").lower()
            or s in i.get("product_name", "").lower()
            or s in i.get("physician_champion", "").lower()
            or s in i.get("competitor_displaced", "").lower()
        ]

    # Metrics summary
    total = len(_FORMULARY_STORE)
    tier1_count = sum(1 for i in _FORMULARY_STORE.values() if "Tier 1" in i.get("formulary_tier", ""))
    pending_pt = sum(1 for i in _FORMULARY_STORE.values() if i.get("pt_status") in ("Under Review", "Dossier Submitted"))
    total_val = sum(i.get("annual_potential_value", 0.0) for i in _FORMULARY_STORE.values())

    return {
        "items": items,
        "count": len(items),
        "summary": {
            "total_evaluated_institutions": total,
            "tier1_preferred_access_rate": round((tier1_count / total * 100) if total else 0.0, 1),
            "pending_pt_committee_reviews": pending_pt,
            "annual_pipeline_opportunity_value": round(total_val, 2),
        },
    }


@router.get("/accounts/{account_id}/formulary")
def get_account_formulary(
    account_id: uuid.UUID,
    user: User = SalesUser,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Returns hospital formulary tier approvals and P&T committee records for a specific health system account."""
    can_access_account(db, user, account_id)
    _init_default_formulary(db)
    target_str = str(account_id)
    account_items = [i for i in _FORMULARY_STORE.values() if i.get("account_id") == target_str]
    return {
        "account_id": target_str,
        "items": account_items,
        "count": len(account_items),
    }


@router.post("/formulary", status_code=201)
def update_formulary_status(
    payload: FormularyUpdateIn,
    user: User = Depends(require_roles("SUPER_ADMIN", "ADMIN", "SALES_MANAGER")),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Creates or updates hospital formulary placement and P&T committee milestone decisions."""
    account = can_access_account(db, user, payload.account_id)
    fid = f"{payload.account_id}_{payload.product_name.replace(' ', '_').lower()}"

    record = {
        "id": fid,
        "account_id": str(account.id),
        "account_name": account.name,
        "territory": account.territory or "National",
        "product_id": str(uuid.uuid4()),
        "product_name": payload.product_name,
        "product_sku": f"SKU-{payload.product_name[:4].upper()}",
        "category": "Therapeutic Biologic",
        "formulary_tier": payload.formulary_tier,
        "pt_status": payload.pt_status,
        "pt_meeting_date": payload.pt_meeting_date.isoformat() if payload.pt_meeting_date else None,
        "physician_champion": payload.physician_champion or "Chief Medical Officer",
        "protocol_requirements": payload.protocol_requirements,
        "competitor_displaced": payload.competitor_displaced,
        "annual_potential_value": payload.annual_potential_value,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    _FORMULARY_STORE[fid] = record

    record_audit(
        db,
        actor_id=user.id,
        action="hospital_formulary_updated",
        entity_type="hospital_formulary",
        entity_id=uuid.UUID(int=abs(hash(fid)) % (1 << 127)),
        after={
            "account": account.name,
            "product": payload.product_name,
            "tier": payload.formulary_tier,
            "status": payload.pt_status,
        },
    )

    return {"success": True, "record": record}
