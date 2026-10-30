"""Unit tests for Pharmaceutical Commercial APIs: Clinical e-Detailing and Hospital Formulary."""

import uuid
from datetime import date, datetime, timedelta, timezone

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.crm import router as crm_router
from app.api.pharma_commercial import router as pharma_commercial_router
from app.api.sales_accounts import router as sales_accounts_router
from app.api.sales_work import router as sales_work_router
from app.core.security import get_current_user
from app.db.session import get_db
from app.models import (
    Account,
    Base,
    Contact,
    HealthcareProfessionalProfile,
    Product,
    Role,
    SalesActivity,
    User,
    UserRole,
)


@pytest.fixture()
def pharma_env():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    seed = factory()

    roles = {name: Role(name=name) for name in ("ADMIN", "SALES_MANAGER", "MEDICAL_REPRESENTATIVE")}
    seed.add_all(roles.values())
    seed.flush()

    def person(name: str, role: str, territory: str) -> User:
        user = User(email=f"{name.replace(' ', '').lower()}@accord.test", full_name=name, password_hash="hash", territory=territory)
        seed.add(user)
        seed.flush()
        seed.add(UserRole(user_id=user.id, role_id=roles[role].id))
        return user

    rep = person("Dr. Representative", "MEDICAL_REPRESENTATIVE", "North")
    admin = person("Commercial Admin", "ADMIN", "North")

    hospital = Account(name="St. Jude Oncology Hospital", account_type="hospital", territory="North", assigned_employee_id=rep.id)
    seed.add(hospital)
    seed.flush()

    physician = Contact(
        account_id=hospital.id,
        full_name="Dr. Elena Rostova",
        email="elena.rostova@stjude.test",
        title="Chief of Clinical Oncology",
        professional_category="Medical Oncologist",
        territory="North",
        assigned_rep_id=rep.id,
    )
    seed.add(physician)
    seed.flush()

    hcp = HealthcareProfessionalProfile(
        contact_id=physician.id,
        specialty="Medical Oncology",
        license_number="NPI-98421034",
        country="US",
    )
    product = Product(
        name="OncoTarget-700",
        sku="SKU-ONCO700",
        category="Targeted Oncology",
        description="Dual VEGFR/FGFR kinase inhibitor",
    )
    seed.add_all([hcp, product])
    seed.commit()

    ids = {
        "rep": rep.id,
        "admin": admin.id,
        "hospital": hospital.id,
        "physician": physician.id,
        "product": product.id,
    }
    seed.close()

    app = FastAPI()
    for r in (crm_router, sales_work_router, sales_accounts_router, pharma_commercial_router):
        app.include_router(r)

    def override_db():
        session: Session = factory()
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()

    current_id = {"id": rep.id}

    def override_user():
        session = factory()
        try:
            return session.get(User, current_id["id"])
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user] = override_user
    client = TestClient(app)

    def as_user(role_name: str) -> TestClient:
        current_id["id"] = ids[role_name]
        return client

    yield as_user, ids
    Base.metadata.drop_all(engine)
    engine.dispose()


def test_hcp_enrichment_and_profile_dossier(pharma_env):
    as_user, ids = pharma_env
    rep = as_user("rep")

    # Verify contacts list has specialty and license
    res = rep.get("/api/v1/contacts")
    assert res.status_code == 200
    contacts = res.json()
    assert len(contacts) >= 1
    doc = next(c for c in contacts if c["id"] == str(ids["physician"]))
    assert doc["specialty"] == "Medical Oncology"
    assert doc["license_number"] == "NPI-98421034"
    assert doc["kol_status"] is True  # Chief of Clinical Oncology + Oncology specialty

    # Verify 360 profile dossier endpoint
    profile = rep.get(f"/api/v1/contacts/{ids['physician']}/profile").json()
    assert profile["hcp"]["full_name"] == "Dr. Elena Rostova"
    assert profile["account"]["name"] == "St. Jude Oncology Hospital"
    assert "prescribing_metrics" in profile


def test_edetailing_portfolio_and_session_logging(pharma_env):
    as_user, ids = pharma_env
    rep = as_user("rep")

    # Get clinical portfolio decks
    portfolio = rep.get("/api/v1/sales/edetailing/products").json()
    assert portfolio["total_therapeutic_lines"] >= 3
    onco = next(p for p in portfolio["portfolio"] if p["id"] == "onco-700")
    assert len(onco["slides"]) >= 4

    # Log an active clinical e-detailing session
    session_payload = {
        "contact_id": str(ids["physician"]),
        "account_id": str(ids["hospital"]),
        "product_name": "OncoTarget-700 (Lenvastat Alfa)",
        "slides_covered": ["onco-moa", "onco-os", "onco-pfs-orr", "onco-safety"],
        "duration_seconds": 320,
        "sentiment": "Extremely Receptive / Requests P&T Inclusion",
        "objections": ["Formulary restriction at hospital", "Prior auth documentation required"],
        "sample_units_requested": 4,
        "commitments": "Doctor agreed to champion OncoTarget-700 at upcoming Q4 P&T committee meeting.",
        "next_action": "Deliver 4 starter clinical trial packs and draft P&T dossier summary",
        "follow_up_due_days": 5,
    }
    log_res = rep.post("/api/v1/sales/edetailing/sessions", json=session_payload)
    assert log_res.status_code == 201
    data = log_res.json()
    assert data["success"] is True
    assert data["activity_id"] is not None
    assert data["task_id"] is not None

    # Check that this created a completed sales activity in CRM
    act_check = rep.get(f"/api/v1/sales/activities/{data['activity_id']}")
    assert act_check.status_code == 200
    act_data = act_check.json()
    assert act_data["activity_type"] == "detailing"
    assert act_data["status"] == "completed"
    assert "OncoTarget-700" in act_data["products_discussed"]


def test_hospital_formulary_listing_and_update(pharma_env):
    as_user, ids = pharma_env
    admin = as_user("admin")

    # Get formulary list
    formularies = admin.get("/api/v1/sales/formulary").json()
    assert "items" in formularies
    assert "summary" in formularies
    assert formularies["summary"]["total_evaluated_institutions"] >= 1

    # Update formulary status for hospital
    update_payload = {
        "account_id": str(ids["hospital"]),
        "product_name": "OncoTarget-700",
        "formulary_tier": "Tier 1: Preferred / First-Line",
        "pt_status": "Approved",
        "pt_meeting_date": "2026-11-15",
        "physician_champion": "Dr. Elena Rostova",
        "protocol_requirements": "First-line therapy for refractory mRCC patients.",
        "competitor_displaced": "Replaced Sunitinib Standard-of-Care",
        "annual_potential_value": 520000.0,
    }
    up_res = admin.post("/api/v1/sales/formulary", json=update_payload)
    assert up_res.status_code == 201
    assert up_res.json()["success"] is True

    # Check account-specific formulary endpoint
    acc_form = admin.get(f"/api/v1/sales/accounts/{ids['hospital']}/formulary").json()
    assert acc_form["count"] >= 1
    assert any(i["product_name"] == "OncoTarget-700" for i in acc_form["items"])
