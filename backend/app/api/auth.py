import logging
import smtplib
import uuid
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
import secrets
from hashlib import sha256

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import case, delete, select, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.core.audit import record_audit
from app.core.security import (
    create_access_token,
    create_refresh_token,
    get_current_user,
    get_user_roles,
    hash_opaque_token,
    hash_password,
    require_roles,
    validate_auth_configuration,
    verify_password,
)
from app.db.session import get_db
from app.models import AuthRateLimit, PasswordResetToken, RefreshToken, Role, User, UserRole
from app.schemas.api import (
    LoginRequest,
    PasswordChange,
    PasswordForgot,
    PasswordReset,
    RefreshRequest,
    TokenResponse,
    UserCreate,
    UserOut,
    UserPatch,
    UserStatusPatch,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1")
ADMIN_ROLES = ("SUPER_ADMIN", "ADMIN")
ALL_ROLES = {
    "SUPER_ADMIN",
    "ADMIN",
    "SALES_MANAGER",
    "MEDICAL_REPRESENTATIVE",
    "DISTRIBUTOR_MANAGER",
    "INVENTORY_MANAGER",
    "TENDER_MANAGER",
    "CUSTOMER_SUPPORT",
    "COMPLIANCE_OFFICER",
    "PHARMACOVIGILANCE_OFFICER",
    "EXECUTIVE",
}
GENERIC_RESET_MESSAGE = "If the account exists, password reset instructions will be sent."


def _token_response(
    db: Session, user: User, settings: Settings, refresh: str | None = None
) -> TokenResponse:
    refresh_token = refresh or create_refresh_token()
    now = datetime.now(timezone.utc)
    db.add(
        RefreshToken(
            user_id=user.id,
            token_hash=hash_opaque_token(refresh_token),
            expires_at=now + timedelta(days=settings.refresh_token_days),
        )
    )
    return TokenResponse(
        access_token=create_access_token(user, settings),
        refresh_token=refresh_token,
        expires_in=settings.access_token_minutes * 60,
    )


def _user_out(db: Session, user: User) -> UserOut:
    return _users_out(db, [user])[0]


def _users_out(db: Session, users: list[User]) -> list[UserOut]:
    if not users:
        return []
    user_ids = [user.id for user in users]
    role_rows = db.execute(
        select(UserRole.user_id, Role.name)
        .join(Role, Role.id == UserRole.role_id)
        .where(UserRole.user_id.in_(user_ids))
    )
    roles_by_user: dict[uuid.UUID, list[str]] = {}
    for user_id, role_name in role_rows:
        roles_by_user.setdefault(user_id, []).append(role_name.upper())
    return [
        UserOut(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            is_active=user.is_active,
            territory=user.territory,
            roles=sorted(roles_by_user.get(user.id, [])),
            created_at=user.created_at,
        )
        for user in users
    ]


def _deliver_reset(settings: Settings, email: str, token: str) -> None:
    if not all((settings.smtp_host, settings.smtp_from_email)) or not settings.smtp_use_tls:
        raise RuntimeError("Password reset email delivery is not configured")
    if settings.app_env.lower() == "production" and not settings.frontend_url.startswith("https://"):
        raise RuntimeError("Password reset links require HTTPS in production")
    message = EmailMessage()
    message["Subject"] = "Password reset"
    message["From"] = settings.smtp_from_email
    message["To"] = email
    reset_url = f"{settings.frontend_url.rstrip('/')}/reset-password#token={token}"
    message.set_content(f"Use this one-time link to reset your password: {reset_url}\n")
    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as smtp:
        smtp.starttls()
        if settings.smtp_username:
            smtp.login(settings.smtp_username, settings.smtp_password)
        smtp.send_message(message)


def _assign_roles(db: Session, user: User, roles: list[str]) -> None:
    normalized = {role.strip().upper() for role in roles}
    if not normalized.issubset(ALL_ROLES):
        raise HTTPException(status_code=422, detail="Unknown role")
    db.execute(delete(UserRole).where(UserRole.user_id == user.id))
    role_records = db.scalars(select(Role).where(Role.name.in_(normalized))).all() if normalized else []
    if len(role_records) != len(normalized):
        raise HTTPException(status_code=409, detail="Role configuration is incomplete")
    db.add_all(UserRole(user_id=user.id, role_id=role.id) for role in role_records)
    db.flush()


@router.post("/auth/login", response_model=TokenResponse)
def login(
    payload: LoginRequest,
    request: Request,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> TokenResponse:
    try:
        validate_auth_configuration(settings)
    except RuntimeError:
        raise HTTPException(status_code=503, detail="Authentication is not configured") from None
    email = str(payload.email).lower()
    rate_key = sha256(f"{email}:{request.client.host if request.client else 'unknown'}".encode()).hexdigest()
    now = datetime.now(timezone.utc)
    window_start = now - timedelta(minutes=15)
    statement = pg_insert(AuthRateLimit).values(
        rate_limit_key=rate_key,
        window_started_at=now,
        failures=1,
        updated_at=now,
    )
    statement = statement.on_conflict_do_update(
        index_elements=[AuthRateLimit.rate_limit_key],
        set_={
            "window_started_at": case(
                (AuthRateLimit.window_started_at < window_start, now),
                else_=AuthRateLimit.window_started_at,
            ),
            "failures": case(
                (AuthRateLimit.window_started_at < window_start, 1),
                else_=AuthRateLimit.failures + 1,
            ),
            "updated_at": now,
        },
    ).returning(AuthRateLimit.failures)
    attempts = db.scalar(statement)
    if attempts is not None and attempts > 8:
        db.rollback()
        raise HTTPException(status_code=429, detail="Too many login attempts; try again later")
    user = db.scalar(select(User).where(User.email == email))
    if user is None or not user.is_active or not verify_password(payload.password, user.password_hash):
        record_audit(
            db,
            actor_id=user.id if user else None,
            action="login_failed",
            entity_type="user",
            entity_id=user.id if user else None,
        )
        db.commit()
        raise HTTPException(status_code=401, detail="Invalid email or password")
    db.execute(delete(AuthRateLimit).where(AuthRateLimit.rate_limit_key == rate_key))
    record_audit(db, actor_id=user.id, action="login_succeeded", entity_type="user", entity_id=user.id)
    return _token_response(db, user, settings)


@router.post("/auth/refresh", response_model=TokenResponse)
def refresh_tokens(
    payload: RefreshRequest,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> TokenResponse:
    now = datetime.now(timezone.utc)
    token = db.scalar(
        select(RefreshToken)
        .where(RefreshToken.token_hash == hash_opaque_token(payload.refresh_token))
        .with_for_update()
    )
    if token is None:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    if token.revoked_at is not None:
        db.execute(
            update(RefreshToken)
            .where(RefreshToken.user_id == token.user_id, RefreshToken.revoked_at.is_(None))
            .values(revoked_at=now)
        )
        db.commit()
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    if token.expires_at <= now:
        token.revoked_at = now
        db.commit()
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    user = db.get(User, token.user_id)
    if user is None or not user.is_active:
        token.revoked_at = now
        db.commit()
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    token.revoked_at = now
    return _token_response(db, user, settings)


@router.post("/auth/logout", status_code=204)
def logout(
    payload: RefreshRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    if payload is not None:
        token = db.scalar(
            select(RefreshToken).where(
                RefreshToken.user_id == user.id,
                RefreshToken.token_hash == hash_opaque_token(payload.refresh_token),
                RefreshToken.revoked_at.is_(None),
            )
        )
        if token is not None:
            token.revoked_at = datetime.now(timezone.utc)
    record_audit(db, actor_id=user.id, action="logout", entity_type="user", entity_id=user.id)


@router.get("/auth/me", response_model=UserOut)
def me(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> UserOut:
    return _user_out(db, user)


@router.post("/auth/change-password", status_code=204)
def change_password(
    payload: PasswordChange,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if payload.current_password == payload.new_password:
        raise HTTPException(status_code=422, detail="New password must differ from current password")
    user.password_hash = hash_password(payload.new_password)
    user.auth_version += 1
    now = datetime.now(timezone.utc)
    db.execute(
        update(RefreshToken)
        .where(RefreshToken.user_id == user.id, RefreshToken.revoked_at.is_(None))
        .values(revoked_at=now)
    )
    db.execute(
        update(PasswordResetToken)
        .where(PasswordResetToken.user_id == user.id, PasswordResetToken.used_at.is_(None))
        .values(used_at=now)
    )
    record_audit(db, actor_id=user.id, action="password_changed", entity_type="user", entity_id=user.id)


@router.post("/auth/forgot-password")
def forgot_password(
    payload: PasswordForgot,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> dict[str, str]:
    user = db.scalar(select(User).where(User.email == str(payload.email).lower(), User.is_active.is_(True)))
    if user is not None:
        token_value = secrets.token_urlsafe(32)
        db.execute(
            update(PasswordResetToken)
            .where(PasswordResetToken.user_id == user.id, PasswordResetToken.used_at.is_(None))
            .values(used_at=datetime.now(timezone.utc))
        )
        reset_token = PasswordResetToken(
            user_id=user.id,
            token_hash=hash_opaque_token(token_value),
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=settings.password_reset_minutes),
        )
        db.add(reset_token)
        db.flush()
        try:
            _deliver_reset(settings, user.email, token_value)
        except (OSError, smtplib.SMTPException, RuntimeError):
            reset_token.used_at = datetime.now(timezone.utc)
            logger.error("Password reset delivery failed; SMTP configuration or service is unavailable")
    return {"message": GENERIC_RESET_MESSAGE}


@router.post("/auth/reset-password", status_code=204)
def reset_password(
    payload: PasswordReset,
    db: Session = Depends(get_db),
) -> None:
    now = datetime.now(timezone.utc)
    token = db.scalar(
        select(PasswordResetToken)
        .where(PasswordResetToken.token_hash == hash_opaque_token(payload.token))
        .with_for_update()
    )
    if token is None or token.used_at is not None or token.expires_at <= now:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    user = db.get(User, token.user_id)
    if user is None or not user.is_active:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    token.used_at = now
    user.password_hash = hash_password(payload.new_password)
    user.auth_version += 1
    db.execute(
        update(RefreshToken)
        .where(RefreshToken.user_id == user.id, RefreshToken.revoked_at.is_(None))
        .values(revoked_at=now)
    )
    db.execute(
        update(PasswordResetToken)
        .where(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.used_at.is_(None),
            PasswordResetToken.id != token.id,
        )
        .values(used_at=now)
    )
    record_audit(db, actor_id=user.id, action="password_reset", entity_type="user", entity_id=user.id)


@router.get("/users", response_model=list[UserOut])
def list_users(
    limit: int = 50,
    offset: int = 0,
    _: User = Depends(require_roles(*ADMIN_ROLES)),
    db: Session = Depends(get_db),
) -> list[UserOut]:
    if limit < 1 or limit > 100 or offset < 0:
        raise HTTPException(status_code=422, detail="Invalid pagination")
    users = db.scalars(select(User).order_by(User.created_at.desc()).limit(limit).offset(offset)).all()
    return _users_out(db, list(users))


@router.get("/users/{user_id}", response_model=UserOut)
def get_user(
    user_id: uuid.UUID,
    _: User = Depends(require_roles(*ADMIN_ROLES)),
    db: Session = Depends(get_db),
) -> UserOut:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return _user_out(db, user)


@router.post("/users", response_model=UserOut, status_code=201)
def create_user(
    payload: UserCreate,
    actor: User = Depends(require_roles(*ADMIN_ROLES)),
    db: Session = Depends(get_db),
) -> UserOut:
    actor_roles = get_user_roles(db, actor.id)
    requested_roles = {role.upper() for role in payload.roles} or {"MEDICAL_REPRESENTATIVE"}
    if "SUPER_ADMIN" in requested_roles and "SUPER_ADMIN" not in actor_roles:
        raise HTTPException(status_code=403, detail="Only a super administrator can grant that role")
    if db.scalar(select(User.id).where(User.email == str(payload.email).lower())) is not None:
        raise HTTPException(status_code=409, detail="A user with this email already exists")
    user = User(
        email=str(payload.email).lower(),
        full_name=payload.full_name,
        password_hash=hash_password(payload.password),
        territory=payload.territory,
    )
    db.add(user)
    db.flush()
    _assign_roles(db, user, list(requested_roles))
    record_audit(
        db,
        actor_id=actor.id,
        action="user_created",
        entity_type="user",
        entity_id=user.id,
        after={"email": user.email, "roles": sorted(requested_roles)},
    )
    return _user_out(db, user)


@router.patch("/users/{user_id}", response_model=UserOut)
def patch_user(
    user_id: uuid.UUID,
    payload: UserPatch,
    actor: User = Depends(require_roles(*ADMIN_ROLES)),
    db: Session = Depends(get_db),
) -> UserOut:
    target = db.get(User, user_id)
    if target is None:
        raise HTTPException(status_code=404, detail="User not found")
    actor_roles = get_user_roles(db, actor.id)
    target_roles = get_user_roles(db, target.id)
    if "SUPER_ADMIN" in target_roles and "SUPER_ADMIN" not in actor_roles:
        raise HTTPException(status_code=403, detail="Only a super administrator can modify that account")
    changes = payload.model_dump(exclude_unset=True)
    requested_roles = changes.pop("roles", None)
    if requested_roles is not None:
        if target.id == actor.id:
            raise HTTPException(status_code=403, detail="Administrators cannot change their own roles")
        normalized = {role.upper() for role in requested_roles}
        if "SUPER_ADMIN" in normalized and "SUPER_ADMIN" not in actor_roles:
            raise HTTPException(status_code=403, detail="Only a super administrator can grant that role")
        _assign_roles(db, target, list(normalized))
    before = {"full_name": target.full_name, "territory": target.territory, "roles": sorted(target_roles)}
    for field, value in changes.items():
        setattr(target, field, value)
    record_audit(
        db,
        actor_id=actor.id,
        action="user_updated",
        entity_type="user",
        entity_id=target.id,
        before=before,
        after={**changes, "roles": sorted(get_user_roles(db, target.id))},
    )
    return _user_out(db, target)


@router.patch("/users/{user_id}/status", response_model=UserOut)
def patch_user_status(
    user_id: uuid.UUID,
    payload: UserStatusPatch,
    actor: User = Depends(require_roles(*ADMIN_ROLES)),
    db: Session = Depends(get_db),
) -> UserOut:
    target = db.get(User, user_id)
    if target is None:
        raise HTTPException(status_code=404, detail="User not found")
    actor_roles = get_user_roles(db, actor.id)
    if target.id == actor.id and not payload.is_active:
        raise HTTPException(status_code=422, detail="Administrators cannot deactivate themselves")
    if "SUPER_ADMIN" in get_user_roles(db, target.id) and "SUPER_ADMIN" not in actor_roles:
        raise HTTPException(status_code=403, detail="Only a super administrator can modify that account")
    target.is_active = payload.is_active
    target.auth_version += 1
    if not target.is_active:
        db.execute(
            update(RefreshToken)
            .where(RefreshToken.user_id == target.id, RefreshToken.revoked_at.is_(None))
            .values(revoked_at=datetime.now(timezone.utc))
        )
    record_audit(
        db,
        actor_id=actor.id,
        action="user_status_changed",
        entity_type="user",
        entity_id=target.id,
        after={"is_active": target.is_active},
    )
    return _user_out(db, target)
