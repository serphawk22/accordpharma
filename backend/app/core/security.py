import secrets
import uuid
from datetime import datetime, timedelta, timezone
from hashlib import sha256
from typing import Any

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import InvalidTokenError
from pwdlib import PasswordHash
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.db.session import get_db
from app.models import Role, User, UserRole
from pwdlib.exceptions import UnknownHashError

password_hasher = PasswordHash.recommended()
bearer_scheme = HTTPBearer(auto_error=False)


def validate_auth_configuration(settings: Settings) -> None:
    if len(settings.jwt_secret_key.encode("utf-8")) < 32:
        raise RuntimeError("JWT_SECRET_KEY must contain at least 32 bytes")


def hash_password(password: str) -> str:
    return password_hasher.hash(password)


def verify_password(password: str, encoded: str) -> bool:
    try:
        return password_hasher.verify(password, encoded)
    except (ValueError, TypeError, UnknownHashError):
        return False


def hash_opaque_token(token: str) -> str:
    return sha256(token.encode("utf-8")).hexdigest()


def create_access_token(user: User, settings: Settings) -> str:
    validate_auth_configuration(settings)
    now = datetime.now(timezone.utc)
    claims: dict[str, Any] = {
        "sub": str(user.id),
        "iat": now,
        "exp": now + timedelta(minutes=settings.access_token_minutes),
        "jti": secrets.token_urlsafe(16),
        "type": "access",
        "ver": user.auth_version,
    }
    return jwt.encode(claims, settings.jwt_secret_key, algorithm="HS256")


def create_refresh_token() -> str:
    return secrets.token_urlsafe(48)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> User:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None:
        raise unauthorized
    try:
        validate_auth_configuration(settings)
        payload = jwt.decode(
            credentials.credentials,
            settings.jwt_secret_key,
            algorithms=["HS256"],
            options={"require": ["exp", "iat", "sub", "jti", "type", "ver"]},
        )
        if payload.get("type") != "access":
            raise unauthorized
        user_id = uuid.UUID(payload.get("sub", ""))
    except InvalidTokenError:
        raise unauthorized from None
    except RuntimeError:
        raise HTTPException(status_code=503, detail="Authentication is not configured") from None
    except (ValueError, TypeError, AttributeError):
        raise unauthorized
    user = db.get(User, user_id)
    if user is None or not user.is_active or payload.get("ver") != user.auth_version:
        raise unauthorized
    return user


def get_user_roles(db: Session, user_id: Any) -> set[str]:
    names = db.scalars(
        select(Role.name)
        .join(UserRole, UserRole.role_id == Role.id)
        .where(UserRole.user_id == user_id)
    )
    return {name.upper() for name in names}


def require_roles(*allowed_roles: str):
    normalized = {role.upper() for role in allowed_roles}

    def dependency(
        user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> User:
        if not get_user_roles(db, user.id).intersection(normalized):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return user

    return dependency
