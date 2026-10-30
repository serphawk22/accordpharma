import json
from typing import Any
import uuid

from sqlalchemy.orm import Session

from app.models import AuditEvent


def record_audit(
    db: Session,
    *,
    actor_id: uuid.UUID | None,
    action: str,
    entity_type: str,
    entity_id: uuid.UUID | None,
    before: dict[str, Any] | None = None,
    after: dict[str, Any] | None = None,
) -> None:
    safe_data = {"before": before, "after": after}
    db.add(
        AuditEvent(
            actor_id=actor_id,
            event_type=action,
            entity_type=entity_type,
            entity_id=entity_id,
            event_data=json.dumps(safe_data, default=str, separators=(",", ":")),
        )
    )
