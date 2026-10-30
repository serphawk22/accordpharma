from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import require_roles
from app.db.session import get_db
from app.models import AuditEvent, User
from app.schemas.api import AuditEventOut

router = APIRouter(prefix="/api/v1/audit-events")


@router.get("", response_model=list[AuditEventOut])
def list_audit_events(
    entity_type: str | None = None,
    entity_id: UUID | None = None,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    _: User = Depends(require_roles("SUPER_ADMIN", "ADMIN", "COMPLIANCE_OFFICER")),
    db: Session = Depends(get_db),
) -> list[AuditEvent]:
    query = select(AuditEvent)
    if entity_type:
        query = query.where(AuditEvent.entity_type == entity_type)
    if entity_id:
        query = query.where(AuditEvent.entity_id == entity_id)
    return list(
        db.scalars(query.order_by(AuditEvent.created_at.desc()).limit(limit).offset(offset))
    )
