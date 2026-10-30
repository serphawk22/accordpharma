import uuid
from datetime import date, datetime, timezone

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import InventoryBalance, InventoryLotBalance, InventoryMovement, InventorySnapshot


class InsufficientInventory(Exception):
    pass


class InventoryLotConflict(Exception):
    pass


LOT_TRACKED_CATEGORIES = frozenset(
    {"pharmaceutical", "pharmaceutical_product", "medicinal_product", "medicine"}
)


def requires_lot_tracking(category: str | None) -> bool:
    return category is not None and category.casefold() in LOT_TRACKED_CATEGORIES


def apply_inventory_change(
    db: Session,
    *,
    distributor_id: uuid.UUID,
    product_id: uuid.UUID,
    quantity_delta: int,
    changed_by_id: uuid.UUID,
    reason: str,
    idempotency_key: str | None = None,
    lot_number: str | None = None,
    batch_number: str | None = None,
    expiry_date: date | None = None,
    storage_conditions: str | None = None,
) -> InventoryMovement:
    if idempotency_key:
        existing = db.scalar(
            select(InventoryMovement)
            .join(InventorySnapshot, InventorySnapshot.id == InventoryMovement.inventory_snapshot_id)
            .where(
                InventoryMovement.idempotency_key == idempotency_key,
                InventorySnapshot.distributor_id == distributor_id,
                InventorySnapshot.product_id == product_id,
            )
        )
        if existing is not None:
            return existing

    if quantity_delta < 0 and db.scalar(
        select(InventoryBalance.id).where(
            InventoryBalance.distributor_id == distributor_id,
            InventoryBalance.product_id == product_id,
        )
    ) is None:
        raise InsufficientInventory

    now = datetime.now(timezone.utc)
    lot_id = None
    if lot_number is not None:
        lot_statement = pg_insert(InventoryLotBalance).values(
            id=uuid.uuid4(),
            distributor_id=distributor_id,
            product_id=product_id,
            lot_number=lot_number,
            batch_number=batch_number,
            expiry_date=expiry_date,
            storage_conditions=storage_conditions,
            quantity=quantity_delta,
            updated_at=now,
        )
        lot_statement = lot_statement.on_conflict_do_update(
            constraint="uq_inventory_lot_distributor_product_lot",
            set_={
                "quantity": InventoryLotBalance.quantity + quantity_delta,
                "updated_at": now,
            },
            where=InventoryLotBalance.quantity + quantity_delta >= 0,
        ).returning(
            InventoryLotBalance.id,
            InventoryLotBalance.quantity,
            InventoryLotBalance.batch_number,
            InventoryLotBalance.expiry_date,
            InventoryLotBalance.storage_conditions,
        )
        try:
            lot_result = db.execute(lot_statement).one_or_none()
        except IntegrityError:
            db.rollback()
            raise InsufficientInventory from None
        if lot_result is None:
            raise InsufficientInventory
        lot_id = lot_result[0]
        if (
            (batch_number is not None and batch_number != lot_result.batch_number)
            or (expiry_date is not None and expiry_date != lot_result.expiry_date)
            or (
                storage_conditions is not None
                and storage_conditions != lot_result.storage_conditions
            )
        ):
            raise InventoryLotConflict
    elif quantity_delta < 0 and db.scalar(
        select(InventoryLotBalance.id).where(
            InventoryLotBalance.distributor_id == distributor_id,
            InventoryLotBalance.product_id == product_id,
            InventoryLotBalance.quantity > 0,
        )
    ) is not None:
        raise InsufficientInventory

    statement = pg_insert(InventoryBalance).values(
        id=uuid.uuid4(),
        distributor_id=distributor_id,
        product_id=product_id,
        quantity=quantity_delta,
        updated_at=now,
    )
    statement = statement.on_conflict_do_update(
        constraint="uq_inventory_balance_distributor_product",
        set_={
            "quantity": InventoryBalance.quantity + quantity_delta,
            "updated_at": now,
        },
        where=InventoryBalance.quantity + quantity_delta >= 0,
    ).returning(InventoryBalance.quantity)
    try:
        new_quantity = db.scalar(statement)
    except IntegrityError:
        db.rollback()
        raise InsufficientInventory from None
    if new_quantity is None or new_quantity < 0:
        raise InsufficientInventory

    snapshot = InventorySnapshot(
        distributor_id=distributor_id,
        product_id=product_id,
        quantity=new_quantity,
        snapshot_at=now,
    )
    db.add(snapshot)
    db.flush()
    movement = InventoryMovement(
        inventory_snapshot_id=snapshot.id,
        inventory_lot_id=lot_id,
        changed_by_id=changed_by_id,
        quantity_delta=quantity_delta,
        reason=reason,
        idempotency_key=idempotency_key,
        lot_number=lot_number,
        batch_number=batch_number,
        expiry_date=expiry_date,
        storage_conditions=storage_conditions,
    )
    db.add(movement)
    db.flush()
    return movement


def reserve_order_inventory(
    db: Session,
    *,
    distributor_id: uuid.UUID,
    product_id: uuid.UUID,
    quantity: int,
    order_id: uuid.UUID,
    order_item_id: uuid.UUID,
    changed_by_id: uuid.UUID,
    reason: str,
    require_lots: bool = False,
) -> list[InventoryMovement]:
    lots = db.scalars(
        select(InventoryLotBalance)
        .where(
            InventoryLotBalance.distributor_id == distributor_id,
            InventoryLotBalance.product_id == product_id,
            InventoryLotBalance.quantity > 0,
            (
                InventoryLotBalance.expiry_date.is_(None)
                | (InventoryLotBalance.expiry_date >= datetime.now(timezone.utc).date())
            ),
        )
        .order_by(InventoryLotBalance.expiry_date.asc().nullslast(), InventoryLotBalance.id)
        .with_for_update()
    ).all()
    if not lots:
        has_tracked_lots = db.scalar(
            select(InventoryLotBalance.id).where(
                InventoryLotBalance.distributor_id == distributor_id,
                InventoryLotBalance.product_id == product_id,
            )
        )
        if require_lots or has_tracked_lots is not None:
            raise InsufficientInventory
        return [
            apply_inventory_change(
                db,
                distributor_id=distributor_id,
                product_id=product_id,
                quantity_delta=-quantity,
                changed_by_id=changed_by_id,
                reason=reason,
                idempotency_key=f"order-submit:{order_id}:{order_item_id}",
            )
        ]
    if sum(lot.quantity for lot in lots) < quantity:
        raise InsufficientInventory

    remaining = quantity
    movements: list[InventoryMovement] = []
    for lot in lots:
        reserved_quantity = min(lot.quantity, remaining)
        movement = apply_inventory_change(
            db,
            distributor_id=distributor_id,
            product_id=product_id,
            quantity_delta=-reserved_quantity,
            changed_by_id=changed_by_id,
            reason=reason,
            idempotency_key=f"order-submit:{order_id}:{order_item_id}:{lot.id}",
            lot_number=lot.lot_number,
            batch_number=lot.batch_number,
            expiry_date=lot.expiry_date,
            storage_conditions=lot.storage_conditions,
        )
        movements.append(movement)
        remaining -= reserved_quantity
        if remaining == 0:
            break
    return movements
