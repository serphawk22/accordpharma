from types import SimpleNamespace
import uuid

import pytest
from fastapi import HTTPException
from sqlalchemy.dialects import postgresql

from app.core.permissions import account_scope
from app.core.security import require_roles
from app.schemas.api import InventoryAdjustment, UserCreate


class RoleResult:
    def __init__(self, roles: set[str]) -> None:
        self.roles = roles

    def __iter__(self):
        return iter(self.roles)


class RoleSession:
    def __init__(self, roles: set[str]) -> None:
        self.roles = roles

    def scalars(self, _query: object) -> RoleResult:
        return RoleResult(self.roles)


def test_role_dependency_allows_only_explicit_roles() -> None:
    user = SimpleNamespace(id=uuid.uuid4())
    check_admin = require_roles("ADMIN", "SUPER_ADMIN")
    assert check_admin(user=user, db=RoleSession({"ADMIN"})) is user
    with pytest.raises(HTTPException) as error:
        check_admin(user=user, db=RoleSession({"MEDICAL_REPRESENTATIVE"}))
    assert error.value.status_code == 403


def test_account_scope_compiles_owner_and_territory_predicates() -> None:
    user = SimpleNamespace(id=uuid.uuid4(), territory="NORTH")
    rep_query = account_scope(user, {"MEDICAL_REPRESENTATIVE"})
    manager_query = account_scope(user, {"SALES_MANAGER"})
    rep_sql = str(rep_query.compile(dialect=postgresql.dialect()))
    manager_sql = str(manager_query.compile(dialect=postgresql.dialect()))
    assert "accounts.assigned_employee_id" in rep_sql
    assert "accounts.territory" in manager_sql


def test_privileged_passwords_and_nonzero_inventory_adjustments_are_validated() -> None:
    with pytest.raises(ValueError):
        UserCreate(email="person@example.invalid", full_name="Person", password="short")
    with pytest.raises(ValueError):
        UserCreate(
            email="person@example.invalid",
            full_name="Person",
            password="alllowercasewithoutnumbers",
        )
    with pytest.raises(ValueError):
        InventoryAdjustment(
            distributor_id=uuid.uuid4(),
            product_id=uuid.uuid4(),
            quantity_delta=0,
            reason="No change",
        )


def test_health_and_restricted_routes_are_registered() -> None:
    from app.main import app

    paths = app.openapi()["paths"]
    assert "/api/v1/health" in paths
    assert "/api/v1/pharmacovigilance/intakes" in paths
    assert "/api/v1/auth/refresh" in paths
