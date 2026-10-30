import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.audit import record_audit
from app.core.security import get_user_roles, require_roles
from app.db.session import get_db
from app.models import PharmacovigilanceIntake, User
from app.schemas.restricted import (
    PharmacovigilanceCreate,
    PharmacovigilanceOut,
    PharmacovigilancePatch,
)

router = APIRouter(prefix="/api/v1/pharmacovigilance")
PV_ROLES = ("SUPER_ADMIN", "PHARMACOVIGILANCE_OFFICER")
VALID_TRANSITIONS = {
    "received": {"received", "in_review"},
    "in_review": {"in_review", "follow_up", "closed"},
    "follow_up": {"follow_up", "in_review", "closed"},
    "closed": {"closed", "in_review"},
}


@router.get("/intakes", response_model=list[PharmacovigilanceOut])
def list_intakes(
    limit: int = Query(default=25, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    actor: User = Depends(require_roles(*PV_ROLES)),
    db: Session = Depends(get_db),
) -> list[PharmacovigilanceIntake]:
    query = select(PharmacovigilanceIntake)
    if "SUPER_ADMIN" not in get_user_roles(db, actor.id):
        query = query.where(
            or_(
                PharmacovigilanceIntake.assigned_to_id.is_(None),
                PharmacovigilanceIntake.assigned_to_id == actor.id,
            )
        )
    records = list(
        db.scalars(
            query.order_by(PharmacovigilanceIntake.received_at.desc()).limit(limit).offset(offset)
        )
    )
    for record in records:
        record_audit(
            db,
            actor_id=actor.id,
            action="restricted_record_accessed",
            entity_type="pharmacovigilance_intake",
            entity_id=record.id,
        )
    return records


@router.post("/intakes", response_model=PharmacovigilanceOut, status_code=201)
def create_intake(
    payload: PharmacovigilanceCreate,
    actor: User = Depends(require_roles(*PV_ROLES)),
    db: Session = Depends(get_db),
) -> PharmacovigilanceIntake:
    if db.scalar(
        select(PharmacovigilanceIntake.id).where(
            PharmacovigilanceIntake.report_reference == payload.report_reference
        )
    ) is not None:
        raise HTTPException(status_code=409, detail="Safety report reference already exists")
    record = PharmacovigilanceIntake(
        report_reference=payload.report_reference,
        status="received",
        restricted_payload=payload.restricted_payload,
        assigned_to_id=actor.id,
    )
    db.add(record)
    db.flush()
    record_audit(
        db,
        actor_id=actor.id,
        action="restricted_record_created",
        entity_type="pharmacovigilance_intake",
        entity_id=record.id,
    )
    return record


@router.get("/intakes/{intake_id}", response_model=PharmacovigilanceOut)
def get_intake(
    intake_id: uuid.UUID,
    actor: User = Depends(require_roles(*PV_ROLES)),
    db: Session = Depends(get_db),
) -> PharmacovigilanceIntake:
    record = db.get(PharmacovigilanceIntake, intake_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Safety record not found")
    if (
        "SUPER_ADMIN" not in get_user_roles(db, actor.id)
        and record.assigned_to_id not in (None, actor.id)
    ):
        raise HTTPException(status_code=404, detail="Safety record not found")
    record_audit(
        db,
        actor_id=actor.id,
        action="restricted_record_accessed",
        entity_type="pharmacovigilance_intake",
        entity_id=record.id,
    )
    return record


@router.patch("/intakes/{intake_id}", response_model=PharmacovigilanceOut)
def update_intake(
    intake_id: uuid.UUID,
    payload: PharmacovigilancePatch,
    actor: User = Depends(require_roles(*PV_ROLES)),
    db: Session = Depends(get_db),
) -> PharmacovigilanceIntake:
    query = select(PharmacovigilanceIntake).where(PharmacovigilanceIntake.id == intake_id).with_for_update()
    if "SUPER_ADMIN" not in get_user_roles(db, actor.id):
        query = query.where(PharmacovigilanceIntake.assigned_to_id == actor.id)
    record = db.scalar(query)
    if record is None:
        raise HTTPException(status_code=404, detail="Safety record not found")
    if record.status not in VALID_TRANSITIONS or payload.status not in VALID_TRANSITIONS[record.status]:
        raise HTTPException(status_code=409, detail="Invalid safety record status transition")
    before = record.status
    record.status = payload.status
    record_audit(
        db,
        actor_id=actor.id,
        action="restricted_record_status_changed",
        entity_type="pharmacovigilance_intake",
        entity_id=record.id,
        before={"status": before},
        after={"status": record.status},
    )
    return record
