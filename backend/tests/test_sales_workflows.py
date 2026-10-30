"""Workflow tests for the sales APIs.

These run against an in-memory SQLite database created from the SQLAlchemy metadata so they need no
network. They exercise scoping, validation and persistence logic; PostgreSQL-specific behaviour is covered
by the opt-in integration suite.
"""

import uuid
from datetime import datetime, timedelta, timezone

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.crm import router as crm_router
from app.api.sales_accounts import router as sales_accounts_router
from app.api.sales_management import router as sales_management_router
from app.api.sales_work import router as sales_work_router
from app.core.security import get_current_user
from app.db.session import get_db
from app.models import Account, Base, Role, User, UserRole


@pytest.fixture()
def env():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    seed = factory()
    roles = {name: Role(name=name) for name in ("ADMIN", "SALES_MANAGER", "MEDICAL_REPRESENTATIVE")}
    seed.add_all(roles.values())
    seed.flush()

    def person(name: str, role: str, territory: str) -> User:
        user = User(email=f"{name}@example.invalid", full_name=name, password_hash="x", territory=territory)
        seed.add(user)
        seed.flush()
        seed.add(UserRole(user_id=user.id, role_id=roles[role].id))
        return user

    people = {
        "admin": person("Admin", "ADMIN", "N"),
        "manager": person("Manager", "SALES_MANAGER", "N"),
        "rep1": person("Rep One", "MEDICAL_REPRESENTATIVE", "N"),
        "rep2": person("Rep Two", "MEDICAL_REPRESENTATIVE", "N"),
        "south": person("South Rep", "MEDICAL_REPRESENTATIVE", "S"),
    }
    acc1 = Account(name="City Hospital", account_type="hospital", territory="N", assigned_employee_id=people["rep1"].id)
    acc2 = Account(name="Rival Pharmacy", account_type="pharmacy", territory="N", assigned_employee_id=people["rep2"].id)
    seed.add_all([acc1, acc2])
    seed.commit()
    ids = {k: v.id for k, v in people.items()}
    accounts = {"a1": acc1.id, "a2": acc2.id}
    seed.close()

    app = FastAPI()
    for router in (crm_router, sales_work_router, sales_accounts_router, sales_management_router):
        app.include_router(router)

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

    current: dict[str, uuid.UUID] = {}

    def override_user():
        session = factory()
        try:
            return session.get(User, current["id"])
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user] = override_user
    client = TestClient(app)

    def as_user(name: str) -> TestClient:
        current["id"] = ids[name]
        return client

    yield as_user, ids, accounts
    Base.metadata.drop_all(engine)
    engine.dispose()


def iso(delta_hours: float = 0.0) -> str:
    return (datetime.now(timezone.utc) + timedelta(hours=delta_hours)).isoformat()


def test_visit_workflow_persists_and_is_visible_to_admin(env):
    as_user, ids, accounts = env
    rep = as_user("rep1")
    planned = rep.post(
        "/api/v1/sales/activities",
        json={"activity_type": "visit", "account_id": str(accounts["a1"]), "status": "planned",
              "occurred_at": iso(1), "purpose": "Product review"},
    )
    assert planned.status_code == 201, planned.text
    activity_id = planned.json()["id"]

    today = rep.get("/api/v1/sales/my-day").json()
    assert today["metrics"]["planned_visits"] == 1
    assert today["schedule"][0]["id"] == activity_id

    # An outcome is mandatory to complete a visit.
    assert rep.patch(f"/api/v1/sales/activities/{activity_id}", json={"action": "complete"}).status_code == 422
    done = rep.patch(
        f"/api/v1/sales/activities/{activity_id}",
        json={"action": "complete", "outcome": "Agreed to trial", "occurred_at": iso(-0.01),
              "follow_up": {"title": "Send trial protocol", "due_at": iso(24)}},
    )
    assert done.status_code == 200, done.text
    assert done.json()["status"] == "completed" and done.json()["follow_up_task_id"]
    # Completed activities are immutable.
    assert rep.patch(f"/api/v1/sales/activities/{activity_id}", json={"action": "cancel"}).status_code == 409

    timeline = rep.get(f"/api/v1/sales/accounts/{accounts['a1']}/timeline").json()
    kinds = {e["kind"] for e in timeline["items"]}
    assert {"visit", "follow_up"} <= kinds
    my_day = rep.get("/api/v1/sales/my-day").json()
    assert my_day["metrics"]["visits_completed"] == 1
    assert my_day["metrics"]["planned_visits"] == 1

    admin = as_user("admin")
    seen = admin.get("/api/v1/sales/activities", params={"owner_id": str(ids["rep1"])}).json()
    assert seen["total"] == 1 and seen["items"][0]["owner_name"] == "Rep One"


def test_duplicate_submission_is_idempotent(env):
    as_user, _, accounts = env
    rep = as_user("rep1")
    body = {"activity_type": "call", "account_id": str(accounts["a1"]), "occurred_at": iso(-1),
            "outcome": "Left voicemail", "client_request_id": "req-12345678"}
    first = rep.post("/api/v1/sales/activities", json=body)
    second = rep.post("/api/v1/sales/activities", json=body)
    assert first.status_code == 201 and second.status_code == 200
    assert first.json()["id"] == second.json()["id"]
    assert rep.get("/api/v1/sales/activities").json()["total"] == 1


def test_lead_conversion_creates_linked_opportunity_without_duplicates(env):
    as_user, ids, accounts = env
    rep = as_user("rep1")
    lead = rep.post("/api/v1/sales/leads", json={"name": "New clinic", "organization": "City Hospital"}).json()
    # Cannot convert before qualification.
    assert rep.post(f"/api/v1/sales/leads/{lead['id']}/convert", json={}).status_code == 409
    assert rep.patch(f"/api/v1/sales/leads/{lead['id']}", json={"status": "qualified"}).status_code == 422
    assert rep.patch(
        f"/api/v1/sales/leads/{lead['id']}", json={"status": "qualified", "customer_need": "Oncology supply"}
    ).status_code == 200
    # A new account with an existing name is refused instead of silently duplicating.
    dup = rep.post(f"/api/v1/sales/leads/{lead['id']}/convert", json={"new_account_type": "hospital"})
    assert dup.status_code == 409
    done = rep.post(f"/api/v1/sales/leads/{lead['id']}/convert", json={"account_id": str(accounts["a1"]), "estimated_value": "5000"})
    assert done.status_code == 201, done.text
    opp_id = done.json()["opportunity_id"]
    board = rep.get("/api/v1/sales/pipeline").json()
    assert [c["id"] for c in board["items"]] == [opp_id]
    detail = rep.get(f"/api/v1/sales/opportunities/{opp_id}").json()
    assert detail["stage_history"][0]["note"].startswith("Converted from lead")
    assert rep.get(f"/api/v1/sales/accounts/{accounts['a1']}/overview").json()["open_opportunities"][0]["id"] == opp_id
    assert rep.post(f"/api/v1/sales/leads/{lead['id']}/convert", json={}).status_code == 409


def test_stage_moves_are_validated_and_recorded(env):
    as_user, ids, accounts = env
    rep = as_user("rep1")
    opp = rep.post("/api/v1/opportunities", json={"account_id": str(accounts["a1"]), "name": "Deal", "estimated_value": "1000"}).json()
    patch = lambda body: rep.patch(f"/api/v1/opportunities/{opp['id']}", json=body)  # noqa: E731
    assert patch({"stage": "negotiation"}).status_code == 409  # skipping stages is rejected by the server
    assert patch({"stage": "qualification"}).status_code == 200
    assert patch({"stage": "lost"}).status_code == 422  # reason required
    assert patch({"stage": "lost", "lost_reason": "Price"}).status_code == 200
    assert patch({"stage": "qualification"}).status_code == 409
    history = rep.get(f"/api/v1/sales/opportunities/{opp['id']}").json()["stage_history"]
    assert [h["to_stage"] for h in history] == ["prospecting", "qualification", "lost"]
    admin = as_user("admin")
    analytics = admin.get("/api/v1/sales/pipeline/analytics").json()
    assert analytics["won_vs_lost"]["lost"] == 1
    assert analytics["lost_reasons"][0]["reason"] == "Price"


def test_reassignment_requires_authority_and_removes_old_owner_access(env):
    as_user, ids, accounts = env
    path = f"/api/v1/sales/accounts/{accounts['a1']}/reassign"
    body = {"assigned_to_id": str(ids["rep2"]), "reason": "Coverage change"}
    assert as_user("rep1").post(path, json=body).status_code == 403
    assert as_user("south").post(path, json=body).status_code == 403
    out = as_user("manager").post(path, json=body)
    assert out.status_code == 200, out.text
    assert as_user("rep1").get(f"/api/v1/sales/accounts/{accounts['a1']}/overview").status_code == 404
    assert as_user("rep2").get(f"/api/v1/sales/accounts/{accounts['a1']}/overview").status_code == 200
    # Manager cannot assign across territories; admin can.
    cross = {"assigned_to_id": str(ids["south"]), "reason": "Move south"}
    assert as_user("manager").post(path, json=cross).status_code == 403
    history = as_user("admin").get(f"/api/v1/sales/accounts/{accounts['a1']}/history").json()
    assert history["assignments"][0]["to"] == "Rep Two"
    assert as_user("rep2").get(f"/api/v1/sales/accounts/{accounts['a1']}/history").status_code == 403


def test_representatives_are_scoped_and_cannot_use_management_views(env):
    as_user, ids, accounts = env
    rep2 = as_user("rep2")
    assert rep2.get(f"/api/v1/sales/accounts/{accounts['a1']}/overview").status_code == 404
    assert rep2.get("/api/v1/sales/command-center").status_code == 403
    assert rep2.get("/api/v1/sales/team-performance").status_code == 403
    assert rep2.get(f"/api/v1/sales/team-performance/{ids['rep1']}").status_code == 403
    assert rep2.get(f"/api/v1/sales/team-performance/{ids['rep2']}").status_code == 200
    assert rep2.post("/api/v1/sales/reports/ask", json={"question": "overdue follow-ups"}).status_code == 403
    cannot_assign = rep2.post("/api/v1/sales/tasks", json={"title": "x", "assigned_to_id": str(ids["rep1"])})
    assert cannot_assign.status_code == 403
    manager = as_user("manager")
    names = {r["name"] for r in manager.get("/api/v1/sales/team-performance").json()["items"]}
    assert names == {"Rep One", "Rep Two"}  # the southern rep is outside the manager's territory


def test_command_center_and_reports_use_persisted_data(env):
    as_user, ids, accounts = env
    rep = as_user("rep1")
    rep.post("/api/v1/sales/activities", json={"activity_type": "visit", "account_id": str(accounts["a1"]),
                                               "occurred_at": iso(-2), "outcome": "Good meeting"})
    opp = rep.post("/api/v1/opportunities", json={"account_id": str(accounts["a1"]), "name": "Deal", "estimated_value": "2500"}).json()
    for stage in ("qualification", "proposal", "negotiation", "won"):
        assert rep.patch(f"/api/v1/opportunities/{opp['id']}", json={"stage": stage}).status_code == 200
    admin = as_user("admin")
    kpis = admin.get("/api/v1/sales/command-center").json()["kpis"]
    assert kpis["won_revenue"] == 2500 and kpis["won_count"] == 1 and kpis["completed_activities"] == 1
    assert kpis["active_reps"] == 3
    answer = admin.post("/api/v1/sales/reports/ask", json={"question": "Which accounts generated the most won revenue?"}).json()
    assert answer["rows"][0]["account"] == "City Hospital" and answer["export_allowed"] is True
    assert answer["interpretation"]["ai_generated"] is False
    unknown = admin.post("/api/v1/sales/reports/ask", json={"question": "tell me a joke"}).json()
    assert unknown["status"] == "not_understood"
    below = admin.post("/api/v1/sales/reports/ask", json={"question": "Which representatives are below their targets?"}).json()
    assert below["status"] == "unavailable"  # no targets set: reported as unavailable, not zero
    cov = as_user("manager").get("/api/v1/sales/coverage").json()
    assert cov["summary"]["not_contacted"] == 1  # only Rival Pharmacy has had no completed activity
