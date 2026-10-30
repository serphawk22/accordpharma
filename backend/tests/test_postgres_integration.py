import os
from pathlib import Path
import subprocess
import sys
import uuid
from collections.abc import Iterator
from datetime import datetime, timedelta, timezone

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, func, select, text
from sqlalchemy.engine import make_url
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.orm.exc import StaleDataError

from app.config import get_settings
from app.db.session import normalize_database_url
from app.api.auth import router as auth_router
from app.api.crm import router as crm_router
from app.api.operations import router as operations_router
from app.api.restricted import router as restricted_router
from app.config import Settings
from app.db.session import get_db
from app.models import (
    Account,
    AuditEvent,
    Contact,
    CustomerOrder,
    Distributor,
    InventoryBalance,
    InventoryLotBalance,
    InventoryMovement,
    InventorySnapshot,
    PharmacovigilanceIntake,
    Product,
    Role,
    User,
    UserRole,
)
from app.core.security import create_access_token, hash_password


@pytest.fixture
def postgres_session() -> Iterator[Session]:
    database_url = os.getenv("TEST_DATABASE_URL", "").strip()
    if not database_url:
        pytest.skip("Set TEST_DATABASE_URL to a dedicated PostgreSQL test database.")
    if os.getenv("ALLOW_TEST_DB_SCHEMA_DROP", "").lower() != "true":
        pytest.skip("Set ALLOW_TEST_DB_SCHEMA_DROP=true only when TEST_DATABASE_URL is disposable.")

    parsed_test_url = make_url(normalize_database_url(database_url))
    primary_url = os.getenv("DATABASE_URL", "").strip() or get_settings().database_url.strip()
    if not primary_url:
        pytest.skip("Set DATABASE_URL as well so tests can verify TEST_DATABASE_URL is separate.")
    parsed_primary_url = make_url(normalize_database_url(primary_url))
    normalized_test_host = (parsed_test_url.host or "").replace("-pooler.", ".")
    normalized_primary_host = (parsed_primary_url.host or "").replace("-pooler.", ".")
    if (normalized_test_host, parsed_test_url.database) == (
        normalized_primary_host,
        parsed_primary_url.database,
    ):
        pytest.fail("TEST_DATABASE_URL must point to a database separate from DATABASE_URL.")

    schema_name = f"test_{uuid.uuid4().hex}"
    admin_engine = create_engine(parsed_test_url, pool_pre_ping=True)
    quoted_schema = f'"{schema_name}"'
    try:
        with admin_engine.begin() as connection:
            connection.exec_driver_sql(f"CREATE SCHEMA {quoted_schema}")
        scoped_url = parsed_test_url.set(
            query={**parsed_test_url.query, "options": f"-csearch_path={schema_name}"}
        )
        backend_dir = Path(__file__).resolve().parents[1]
        migration_env = os.environ.copy()
        migration_env["DATABASE_URL"] = scoped_url.render_as_string(hide_password=False)
        subprocess.run(
            [sys.executable, "-m", "alembic", "upgrade", "head"],
            cwd=backend_dir,
            env=migration_env,
            capture_output=True,
            text=True,
            check=True,
        )
        test_engine = create_engine(scoped_url, pool_pre_ping=True)
        with test_engine.connect() as connection:
            assert connection.execute(text("SELECT version_num FROM alembic_version")).scalar_one() == (
                "0002_crm_auth"
            )
        factory = sessionmaker(test_engine, class_=Session, expire_on_commit=False)
        with factory() as session:
            yield session
            session.rollback()
        test_engine.dispose()
    finally:
        with admin_engine.begin() as connection:
            connection.exec_driver_sql(f"DROP SCHEMA IF EXISTS {quoted_schema} CASCADE")
        admin_engine.dispose()


def test_postgres_crud_and_foreign_key_constraint(postgres_session: Session) -> None:
    account = Account(name="Integration Clinic", account_type="clinic")
    postgres_session.add(account)
    postgres_session.flush()
    contact = Contact(account_id=account.id, full_name="Demo Contact")
    postgres_session.add(contact)
    postgres_session.commit()
    assert postgres_session.scalar(select(Contact).where(Contact.id == contact.id)).full_name == "Demo Contact"

    postgres_session.add(Contact(account_id=uuid.uuid4(), full_name="Orphan Contact"))
    with pytest.raises(IntegrityError):
        postgres_session.commit()
    postgres_session.rollback()


def test_postgres_transaction_rollback(postgres_session: Session) -> None:
    account_name = "Rolled Back Clinic"
    with pytest.raises(RuntimeError, match="force rollback"):
        with postgres_session.begin():
            postgres_session.add(Account(name=account_name, account_type="clinic"))
            postgres_session.flush()
            raise RuntimeError("force rollback")
    assert postgres_session.scalar(select(Account.id).where(Account.name == account_name)) is None


def test_postgres_duplicate_event_prevention(postgres_session: Session) -> None:
    postgres_session.add(AuditEvent(event_type="demo", entity_type="test", external_event_id="same-event"))
    postgres_session.commit()
    postgres_session.add(AuditEvent(event_type="demo", entity_type="test", external_event_id="same-event"))
    with pytest.raises(IntegrityError):
        postgres_session.commit()
    postgres_session.rollback()


def test_postgres_inventory_optimistic_concurrency(postgres_session: Session) -> None:
    account = Account(name="Inventory Distributor", account_type="distributor")
    product = Product(name="Concurrency Test Product", sku=f"TEST-{uuid.uuid4().hex[:12]}")
    postgres_session.add_all([account, product])
    postgres_session.flush()
    distributor = Distributor(account_id=account.id)
    postgres_session.add(distributor)
    postgres_session.flush()
    snapshot = InventorySnapshot(
        distributor_id=distributor.id,
        product_id=product.id,
        quantity=12,
        snapshot_at=datetime.now(timezone.utc),
    )
    postgres_session.add(snapshot)
    postgres_session.commit()
    snapshot_id = snapshot.id
    factory = sessionmaker(bind=postgres_session.get_bind(), class_=Session, expire_on_commit=False)
    first, second = factory(), factory()
    try:
        first_snapshot = first.get(InventorySnapshot, snapshot_id)
        second_snapshot = second.get(InventorySnapshot, snapshot_id)
        first_snapshot.quantity = 10
        second_snapshot.quantity = 8
        first.commit()
        with pytest.raises(StaleDataError):
            second.commit()
        second.rollback()
        assert first.get(InventorySnapshot, snapshot_id).quantity == 10
    finally:
        first.close()
        second.close()


def test_postgres_auth_refresh_rotation_password_reset_and_revocation(
    postgres_session: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    role = postgres_session.scalar(select(Role).where(Role.name == "MEDICAL_REPRESENTATIVE"))
    user = User(
        email="auth-integration@example.invalid",
        full_name="Fictional Auth Test User",
        password_hash=hash_password("InitialStrongPassword2026"),
    )
    postgres_session.add(user)
    postgres_session.flush()
    postgres_session.add(UserRole(user_id=user.id, role_id=role.id))
    postgres_session.commit()

    app = FastAPI()
    app.include_router(auth_router)

    def override_db():
        try:
            yield postgres_session
            postgres_session.commit()
        except Exception:
            postgres_session.rollback()
            raise

    settings = Settings(jwt_secret_key="integration-test-secret-with-more-than-32-bytes")
    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_settings] = lambda: settings
    client = TestClient(app)
    response = client.post(
        "/api/v1/auth/login",
        json={"email": user.email, "password": "InitialStrongPassword2026"},
    )
    assert response.status_code == 200
    tokens = response.json()
    assert client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {tokens['access_token']}"},
    ).status_code == 200

    rotated = client.post("/api/v1/auth/refresh", json={"refresh_token": tokens["refresh_token"]})
    assert rotated.status_code == 200
    replay = client.post("/api/v1/auth/refresh", json={"refresh_token": tokens["refresh_token"]})
    assert replay.status_code == 401
    assert client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": rotated.json()["refresh_token"]},
    ).status_code == 401

    new_login = client.post(
        "/api/v1/auth/login",
        json={"email": user.email, "password": "InitialStrongPassword2026"},
    )
    assert new_login.status_code == 200
    changed = client.post(
        "/api/v1/auth/change-password",
        headers={"Authorization": f"Bearer {new_login.json()['access_token']}"},
        json={
            "current_password": "InitialStrongPassword2026",
            "new_password": "ChangedSecurePassword2026",
        },
    )
    assert changed.status_code == 204
    assert client.post(
        "/api/v1/auth/login",
        json={"email": user.email, "password": "InitialStrongPassword2026"},
    ).status_code == 401

    import app.api.auth as auth_routes

    delivered_tokens: list[str] = []
    monkeypatch.setattr(
        auth_routes,
        "_deliver_reset",
        lambda _settings, _email, token: delivered_tokens.append(token),
    )
    existing_forgot = client.post(
        "/api/v1/auth/forgot-password",
        json={"email": user.email},
    )
    unknown_forgot = client.post(
        "/api/v1/auth/forgot-password",
        json={"email": "unknown@example.invalid"},
    )
    assert existing_forgot.json() == unknown_forgot.json()
    assert len(delivered_tokens) == 1
    reset = client.post(
        "/api/v1/auth/reset-password",
        json={
            "token": delivered_tokens[0],
            "new_password": "ResetSecurePassword2027",
        },
    )
    assert reset.status_code == 204
    assert client.post(
        "/api/v1/auth/reset-password",
        json={
            "token": delivered_tokens[0],
            "new_password": "AnotherSecurePassword2027",
        },
    ).status_code == 400
    assert client.post(
        "/api/v1/auth/login",
        json={"email": user.email, "password": "ResetSecurePassword2027"},
    ).status_code == 200
    user.is_active = False
    postgres_session.commit()
    assert client.post(
        "/api/v1/auth/login",
        json={"email": user.email, "password": "ResetSecurePassword2027"},
    ).status_code == 401


def test_postgres_record_level_account_scope(postgres_session: Session) -> None:
    from fastapi import HTTPException

    from app.core.permissions import can_access_account

    role = postgres_session.scalar(select(Role).where(Role.name == "MEDICAL_REPRESENTATIVE"))
    owner = User(
        email="scope-owner@example.invalid",
        full_name="Fictional Scope Owner",
        password_hash=hash_password("InitialStrongPassword2026"),
        territory="NORTH",
    )
    other = User(
        email="scope-other@example.invalid",
        full_name="Fictional Scope Other",
        password_hash=hash_password("InitialStrongPassword2026"),
        territory="SOUTH",
    )
    postgres_session.add_all([owner, other])
    postgres_session.flush()
    postgres_session.add_all(
        [UserRole(user_id=owner.id, role_id=role.id), UserRole(user_id=other.id, role_id=role.id)]
    )
    account = Account(
        name="Fictional Scoped Account",
        account_type="clinic",
        territory="NORTH",
        assigned_employee_id=owner.id,
    )
    postgres_session.add(account)
    postgres_session.commit()

    assert can_access_account(postgres_session, owner, account.id).id == account.id
    with pytest.raises(HTTPException) as error:
        can_access_account(postgres_session, other, account.id)
    assert error.value.status_code == 404


def _client_for_session(postgres_session: Session, settings: Settings, router) -> TestClient:
    app = FastAPI()
    app.include_router(router)

    def override_db():
        try:
            yield postgres_session
            postgres_session.commit()
        except Exception:
            postgres_session.rollback()
            raise

    app.dependency_overrides[get_db] = override_db
    from app.config import get_settings

    app.dependency_overrides[get_settings] = lambda: settings
    return TestClient(app)


def test_postgres_account_api_enforces_record_scope(postgres_session: Session) -> None:
    role = postgres_session.scalar(select(Role).where(Role.name == "MEDICAL_REPRESENTATIVE"))
    owner = User(
        email="crm-owner@example.invalid",
        full_name="Fictional CRM Owner",
        password_hash=hash_password("InitialStrongPassword2026"),
        territory="NORTH",
    )
    other = User(
        email="crm-other@example.invalid",
        full_name="Fictional CRM Other",
        password_hash=hash_password("InitialStrongPassword2026"),
        territory="SOUTH",
    )
    postgres_session.add_all([owner, other])
    postgres_session.flush()
    postgres_session.add_all(
        [UserRole(user_id=owner.id, role_id=role.id), UserRole(user_id=other.id, role_id=role.id)]
    )
    postgres_session.commit()

    settings = Settings(jwt_secret_key="integration-test-secret-with-more-than-32-bytes")
    client = _client_for_session(postgres_session, settings, crm_router)
    owner_headers = {"Authorization": f"Bearer {create_access_token(owner, settings)}"}
    other_headers = {"Authorization": f"Bearer {create_access_token(other, settings)}"}
    created = client.post(
        "/api/v1/accounts",
        headers=owner_headers,
        json={"name": "Fictional Restricted Account", "account_type": "clinic"},
    )
    assert created.status_code == 201
    account_id = created.json()["id"]
    assert client.get(f"/api/v1/accounts/{account_id}", headers=owner_headers).status_code == 200
    assert client.get(f"/api/v1/accounts/{account_id}", headers=other_headers).status_code == 404


def test_postgres_pharmacovigilance_role_isolation_and_access_audit(postgres_session: Session) -> None:
    general_role = postgres_session.scalar(select(Role).where(Role.name == "MEDICAL_REPRESENTATIVE"))
    pv_role = postgres_session.scalar(select(Role).where(Role.name == "PHARMACOVIGILANCE_OFFICER"))
    general_user = User(
        email="general-user@example.invalid",
        full_name="Fictional General User",
        password_hash=hash_password("InitialStrongPassword2026"),
    )
    pv_user = User(
        email="pv-user@example.invalid",
        full_name="Fictional PV User",
        password_hash=hash_password("InitialStrongPassword2026"),
    )
    postgres_session.add_all([general_user, pv_user])
    postgres_session.flush()
    postgres_session.add_all(
        [
            UserRole(user_id=general_user.id, role_id=general_role.id),
            UserRole(user_id=pv_user.id, role_id=pv_role.id),
        ]
    )
    intake = PharmacovigilanceIntake(
        report_reference="PV-TEST-001",
        status="received",
        restricted_payload="Fictional restricted safety report data.",
        assigned_to_id=pv_user.id,
    )
    postgres_session.add(intake)
    postgres_session.commit()

    settings = Settings(jwt_secret_key="integration-test-secret-with-more-than-32-bytes")
    client = _client_for_session(postgres_session, settings, restricted_router)
    general_headers = {"Authorization": f"Bearer {create_access_token(general_user, settings)}"}
    pv_headers = {"Authorization": f"Bearer {create_access_token(pv_user, settings)}"}
    denied = client.get("/api/v1/pharmacovigilance/intakes", headers=general_headers)
    assert denied.status_code == 403
    allowed = client.get("/api/v1/pharmacovigilance/intakes", headers=pv_headers)
    assert allowed.status_code == 200
    assert "Fictional restricted safety report data." in allowed.text
    audit = postgres_session.scalar(
        select(AuditEvent).where(
            AuditEvent.event_type == "restricted_record_accessed",
            AuditEvent.entity_id == intake.id,
        )
    )
    assert audit is not None


def test_postgres_order_idempotency_prevents_duplicates(postgres_session: Session) -> None:
    role = postgres_session.scalar(select(Role).where(Role.name == "MEDICAL_REPRESENTATIVE"))
    user = User(
        email="order-owner@example.invalid",
        full_name="Fictional Order Owner",
        password_hash=hash_password("InitialStrongPassword2026"),
        territory="DEMO",
    )
    postgres_session.add(user)
    postgres_session.flush()
    postgres_session.add(UserRole(user_id=user.id, role_id=role.id))
    account = Account(
        name="Fictional Order Account",
        account_type="distributor",
        territory="DEMO",
        assigned_employee_id=user.id,
    )
    product = Product(
        name="Fictional Order Product",
        sku="ORDER-TEST-001",
        category="pharmaceutical",
        is_active=True,
    )
    untracked_product = Product(
        name="Fictional Untracked Pharmaceutical Product",
        sku="ORDER-TEST-002",
        category="pharmaceutical",
        is_active=True,
    )
    postgres_session.add_all([account, product, untracked_product])
    postgres_session.flush()
    distributor = Distributor(account_id=account.id, assigned_manager_id=user.id)
    postgres_session.add(distributor)
    postgres_session.flush()
    postgres_session.add_all(
        [
            InventoryBalance(
                distributor_id=distributor.id,
                product_id=product.id,
                quantity=10,
                updated_at=datetime.now(timezone.utc),
            ),
            InventoryBalance(
                distributor_id=distributor.id,
                product_id=untracked_product.id,
                quantity=10,
                updated_at=datetime.now(timezone.utc),
            ),
            InventoryLotBalance(
                distributor_id=distributor.id,
                product_id=product.id,
                lot_number="LOT-TEST-01",
                batch_number="BATCH-TEST-01",
                expiry_date=(datetime.now(timezone.utc).date() + timedelta(days=365)),
                quantity=10,
                updated_at=datetime.now(timezone.utc),
            ),
        ]
    )
    postgres_session.commit()

    settings = Settings(jwt_secret_key="integration-test-secret-with-more-than-32-bytes")
    client = _client_for_session(postgres_session, settings, operations_router)
    headers = {
        "Authorization": f"Bearer {create_access_token(user, settings)}",
        "Idempotency-Key": "dedupe-order-test",
    }
    body = {
        "account_id": str(account.id),
        "distributor_id": str(distributor.id),
        "items": [
            {
                "product_id": str(product.id),
                "quantity": 2,
                "unit_price": "12.50",
            }
        ],
    }
    first = client.post("/api/v1/orders", headers=headers, json=body)
    second = client.post("/api/v1/orders", headers=headers, json=body)
    assert first.status_code == 201
    assert second.status_code == 201
    assert first.json()["id"] == second.json()["id"]
    submitted = client.patch(
        f"/api/v1/orders/{first.json()['id']}",
        headers={"Authorization": headers["Authorization"]},
        json={"status": "submitted"},
    )
    assert submitted.status_code == 200
    assert submitted.json()["status"] == "submitted"
    lot = postgres_session.scalar(
        select(InventoryLotBalance).where(InventoryLotBalance.distributor_id == distributor.id)
    )
    assert lot.quantity == 8
    movement = postgres_session.scalar(
        select(InventoryMovement).where(InventoryMovement.inventory_lot_id == lot.id)
    )
    assert movement is not None
    untracked_headers = {
        "Authorization": headers["Authorization"],
        "Idempotency-Key": "dedupe-untracked-order-test",
    }
    untracked_order = client.post(
        "/api/v1/orders",
        headers=untracked_headers,
        json={
            "account_id": str(account.id),
            "distributor_id": str(distributor.id),
            "items": [
                {
                    "product_id": str(untracked_product.id),
                    "quantity": 1,
                    "unit_price": "12.50",
                }
            ],
        },
    )
    assert untracked_order.status_code == 201
    rejected = client.patch(
        f"/api/v1/orders/{untracked_order.json()['id']}",
        headers={"Authorization": headers["Authorization"]},
        json={"status": "submitted"},
    )
    assert rejected.status_code == 409
    assert postgres_session.scalar(
        select(InventoryBalance.quantity).where(InventoryBalance.product_id == untracked_product.id)
    ) == 10
    assert postgres_session.scalar(
        select(func.count(CustomerOrder.id)).where(CustomerOrder.created_by_id == user.id)
    ) == 1
