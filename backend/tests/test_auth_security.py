from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
import uuid

import jwt
import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

from app.config import Settings
from app.core.security import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)


class FakeUserSession:
    def __init__(self, user: object) -> None:
        self.user = user

    def get(self, _model: object, user_id: uuid.UUID) -> object | None:
        if self.user is not None and self.user.id == user_id:
            return self.user
        return None


@pytest.fixture
def auth_settings() -> Settings:
    return Settings(jwt_secret_key="test-only-secret-value-of-at-least-32-bytes")


def test_password_hash_is_not_plaintext_and_verifies() -> None:
    raw_password = "SecureTestingPassword2026"
    encoded = hash_password(raw_password)
    assert encoded != raw_password
    assert verify_password(raw_password, encoded)
    assert not verify_password("incorrect password", encoded)
    assert not verify_password("anything", "not-a-valid-password-hash")


def test_access_token_authenticates_active_user(auth_settings: Settings) -> None:
    user = SimpleNamespace(id=uuid.uuid4(), is_active=True, auth_version=0)
    token = create_access_token(user, auth_settings)
    credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
    assert get_current_user(credentials, FakeUserSession(user), auth_settings) is user


@pytest.mark.parametrize("token_kind", ["expired", "invalid-signature", "wrong-type", "malformed-subject"])
def test_access_token_rejects_invalid_claims(auth_settings: Settings, token_kind: str) -> None:
    user = SimpleNamespace(id=uuid.uuid4(), is_active=True)
    now = datetime.now(timezone.utc)
    claims = {
        "sub": str(user.id),
        "iat": now,
        "exp": now + timedelta(minutes=1),
        "jti": "test-jti",
        "type": "access",
        "ver": 0,
    }
    signing_key = auth_settings.jwt_secret_key
    if token_kind == "expired":
        claims["exp"] = now - timedelta(seconds=1)
    elif token_kind == "wrong-type":
        claims["type"] = "refresh"
    elif token_kind == "malformed-subject":
        claims["sub"] = "not-a-uuid"
    elif token_kind == "invalid-signature":
        signing_key = "other-signing-key-of-at-least-32-bytes"
    token = jwt.encode(claims, signing_key, algorithm="HS256")
    with pytest.raises(HTTPException) as error:
        get_current_user(
            HTTPAuthorizationCredentials(scheme="Bearer", credentials=token),
            FakeUserSession(user),
            auth_settings,
        )
    assert error.value.status_code == 401


def test_disabled_user_is_rejected(auth_settings: Settings) -> None:
    user = SimpleNamespace(id=uuid.uuid4(), is_active=False, auth_version=0)
    token = create_access_token(user, auth_settings)
    with pytest.raises(HTTPException) as error:
        get_current_user(
            HTTPAuthorizationCredentials(scheme="Bearer", credentials=token),
            FakeUserSession(user),
            auth_settings,
        )
    assert error.value.status_code == 401


def test_missing_bearer_token_is_rejected(auth_settings: Settings) -> None:
    with pytest.raises(HTTPException) as error:
        get_current_user(None, FakeUserSession(None), auth_settings)
    assert error.value.status_code == 401
