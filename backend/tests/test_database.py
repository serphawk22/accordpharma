from collections.abc import Generator
import os
from pathlib import Path
import subprocess
import sys

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.engine import make_url
from sqlalchemy.exc import SQLAlchemyError

from app.api.routes import router
from app.db import session as db_session
from app.db.session import normalize_database_url
from fastapi import FastAPI
from app.db.session import get_db


def test_normalizes_postgres_url_to_psycopg3() -> None:
    result = normalize_database_url(
        "postgresql://demo_user:demo_password@localhost/demo_db?sslmode=require"
    )
    parsed = make_url(result)
    assert parsed.drivername == "postgresql+psycopg"
    assert parsed.password == "demo_password"
    assert parsed.query["sslmode"] == "require"


def test_preserves_neon_pooler_url_options() -> None:
    result = normalize_database_url(
        "postgresql://demo_user:demo_password@host-pooler.example/demo_db"
        "?sslmode=require&channel_binding=require"
    )
    parsed = make_url(result)
    assert parsed.host == "host-pooler.example"
    assert parsed.query == {"sslmode": "require", "channel_binding": "require"}


def test_rejects_sqlite_as_database() -> None:
    with pytest.raises(ValueError, match="PostgreSQL"):
        normalize_database_url("sqlite:///test.db")


def test_alembic_generates_postgresql_migration_sql() -> None:
    backend_dir = Path(__file__).resolve().parents[1]
    env = os.environ.copy()
    env["DATABASE_URL"] = "postgresql://test_user:test_password@localhost/test_db"
    result = subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head", "--sql"],
        cwd=backend_dir,
        env=env,
        capture_output=True,
        text=True,
        check=True,
    )
    assert "CREATE TABLE users" in result.stdout
    assert "CREATE TABLE pharmacovigilance_intake" in result.stdout
    assert "CREATE TABLE ai_usage_records" in result.stdout
    assert "CREATE TABLE refresh_tokens" in result.stdout
    assert "CREATE TABLE auth_rate_limits" in result.stdout
    assert "uq_orders_creator_idempotency_key" in result.stdout


class FakeSession:
    def __init__(self, fail_execute: bool = False) -> None:
        self.fail_execute = fail_execute
        self.commits = 0
        self.rollbacks = 0
        self.closes = 0

    def execute(self, _statement: object) -> None:
        if self.fail_execute:
            raise SQLAlchemyError("private connection details")

    def commit(self) -> None:
        self.commits += 1

    def rollback(self) -> None:
        self.rollbacks += 1

    def close(self) -> None:
        self.closes += 1


def test_session_commits_and_closes_after_success(monkeypatch: pytest.MonkeyPatch) -> None:
    fake = FakeSession()
    monkeypatch.setattr(db_session, "get_session_factory", lambda: lambda: fake)
    generator = get_db()
    assert next(generator) is fake
    with pytest.raises(StopIteration):
        next(generator)
    assert (fake.commits, fake.rollbacks, fake.closes) == (1, 0, 1)


def test_session_rolls_back_and_closes_after_error(monkeypatch: pytest.MonkeyPatch) -> None:
    fake = FakeSession()
    monkeypatch.setattr(db_session, "get_session_factory", lambda: lambda: fake)
    generator = get_db()
    next(generator)
    with pytest.raises(RuntimeError, match="request failed"):
        generator.throw(RuntimeError("request failed"))
    assert (fake.commits, fake.rollbacks, fake.closes) == (0, 1, 1)


def make_client(fake: FakeSession) -> TestClient:
    app = FastAPI()
    app.include_router(router)

    def override_db() -> Generator[FakeSession, None, None]:
        yield fake

    app.dependency_overrides[get_db] = override_db
    return TestClient(app)


def test_health_endpoint_checks_the_database() -> None:
    response = make_client(FakeSession()).get("/api/v1/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy", "database": "connected"}


def test_health_endpoint_returns_safe_unhealthy_response() -> None:
    response = make_client(FakeSession(fail_execute=True)).get("/api/v1/health")
    assert response.status_code == 503
    assert response.json() == {"status": "unhealthy", "database": "unavailable"}
    assert "private connection details" not in response.text
