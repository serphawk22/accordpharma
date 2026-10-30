import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from decimal import Decimal

from app.core.audit import record_audit
from app.core.permissions import SALES_ROLES, can_access_account, can_access_contact
from app.core.security import get_current_user, get_user_roles, require_roles
from app.db.session import get_db
from app.models import (
    Account,
    Contact,
    CustomerOrder,
    Distributor,
    InventoryBalance,
    InventoryLotBalance,
    InventoryMovement,
    InventorySnapshot,
    Notification,
    OrderItem,
    Product,
    SupportCase,
    SupportComment,
    Tender,
    User,
)
from app.schemas.api import (
    DistributorOut,
    InventoryAdjustment,
    InventoryLotOut,
    InventoryMovementOut,
    InventoryOut,
    NotificationOut,
    OrderCreate,
    OrderItemOut,
    OrderOut,
    OrderPatch,
    SupportCommentCreate,
    SupportCommentOut,
    SupportTicketCreate,
    SupportTicketOut,
    SupportTicketPatch,
    TenderCreate,
    TenderOut,
    TenderPatch,
)
from app.services.inventory import (
    InsufficientInventory,
    InventoryLotConflict,
    apply_inventory_change,
    requires_lot_tracking,
    reserve_order_inventory,
)

router = APIRouter(prefix="/api/v1")
ORDER_READ_ROLES = (
    "SUPER_ADMIN",
    "ADMIN",
    "SALES_MANAGER",
    "MEDICAL_REPRESENTATIVE",
    "DISTRIBUTOR_MANAGER",
    "INVENTORY_MANAGER",
    "EXECUTIVE",
)
ORDER_CREATE_ROLES = (
    "SUPER_ADMIN",
    "ADMIN",
    "SALES_MANAGER",
    "MEDICAL_REPRESENTATIVE",
    "DISTRIBUTOR_MANAGER",
    "EXECUTIVE",
)
DISTRIBUTOR_READ_ROLES = (
    "SUPER_ADMIN",
    "ADMIN",
    "SALES_MANAGER",
    "MEDICAL_REPRESENTATIVE",
    "DISTRIBUTOR_MANAGER",
    "INVENTORY_MANAGER",
    "EXECUTIVE",
)
INVENTORY_READ_ROLES = (
    "SUPER_ADMIN",
    "ADMIN",
    "SALES_MANAGER",
    "MEDICAL_REPRESENTATIVE",
    "DISTRIBUTOR_MANAGER",
    "INVENTORY_MANAGER",
    "EXECUTIVE",
)
SUPPORT_ROLES = ("SUPER_ADMIN", "ADMIN", "CUSTOMER_SUPPORT")
TENDER_STATES = {"draft", "open", "submitted", "awarded", "closed", "cancelled"}
SUPPORT_STATES = {"open", "in_progress", "waiting", "resolved", "closed"}


def _inventory_output(db: Session, balances: list[InventoryBalance]) -> list[InventoryOut]:
    if not balances:
        return []
    prod_ids = {b.product_id for b in balances}
    dist_ids = {b.distributor_id for b in balances}
    products = {p.id: p for p in db.scalars(select(Product).where(Product.id.in_(prod_ids)))} if prod_ids else {}
    dist_rows = db.execute(
        select(Distributor.id, Account.name).join(Account, Account.id == Distributor.account_id).where(Distributor.id.in_(dist_ids))
    ).all() if dist_ids else []
    dist_names = {row[0]: row[1] for row in dist_rows}
    return [
        InventoryOut(
            id=b.id,
            distributor_id=b.distributor_id,
            distributor_name=dist_names.get(b.distributor_id, "Central Warehouse"),
            product_id=b.product_id,
            product_name=products[b.product_id].name if b.product_id in products else "Pharmaceutical Product",
            product_sku=products[b.product_id].sku if b.product_id in products else None,
            product_category=products[b.product_id].category if b.product_id in products else None,
            quantity=b.quantity,
            updated_at=b.updated_at,
        )
        for b in balances
    ]


def _inventory_lots_output(db: Session, lots: list[InventoryLotBalance]) -> list[InventoryLotOut]:
    if not lots:
        return []
    prod_ids = {l.product_id for l in lots}
    dist_ids = {l.distributor_id for l in lots}
    products = {p.id: p for p in db.scalars(select(Product).where(Product.id.in_(prod_ids)))} if prod_ids else {}
    dist_rows = db.execute(
        select(Distributor.id, Account.name).join(Account, Account.id == Distributor.account_id).where(Distributor.id.in_(dist_ids))
    ).all() if dist_ids else []
    dist_names = {row[0]: row[1] for row in dist_rows}
    return [
        InventoryLotOut(
            id=l.id,
            distributor_id=l.distributor_id,
            distributor_name=dist_names.get(l.distributor_id, "Warehouse"),
            product_id=l.product_id,
            product_name=products[l.product_id].name if l.product_id in products else "Pharmaceutical Product",
            product_sku=products[l.product_id].sku if l.product_id in products else None,
            product_category=products[l.product_id].category if l.product_id in products else None,
            lot_number=l.lot_number,
            batch_number=l.batch_number,
            expiry_date=l.expiry_date,
            storage_conditions=l.storage_conditions,
            quantity=l.quantity,
            updated_at=l.updated_at,
        )
        for l in lots
    ]


def _inventory_movements_output(db: Session, movements: list[InventoryMovement]) -> list[InventoryMovementOut]:
    if not movements:
        return []
    user_ids = {m.changed_by_id for m in movements}
    users = {u.id: u.full_name for u in db.scalars(select(User).where(User.id.in_(user_ids)))} if user_ids else {}
    snap_ids = {m.inventory_snapshot_id for m in movements}
    snapshots = {s.id: s for s in db.scalars(select(InventorySnapshot).where(InventorySnapshot.id.in_(snap_ids)))} if snap_ids else {}
    prod_ids = {s.product_id for s in snapshots.values()}
    dist_ids = {s.distributor_id for s in snapshots.values()}
    products = {p.id: p.name for p in db.scalars(select(Product).where(Product.id.in_(prod_ids)))} if prod_ids else {}
    dist_rows = db.execute(
        select(Distributor.id, Account.name).join(Account, Account.id == Distributor.account_id).where(Distributor.id.in_(dist_ids))
    ).all() if dist_ids else []
    dist_names = {row[0]: row[1] for row in dist_rows}

    outs = []
    for m in movements:
        s = snapshots.get(m.inventory_snapshot_id)
        pid = s.product_id if s else None
        did = s.distributor_id if s else None
        outs.append(
            InventoryMovementOut(
                id=m.id,
                inventory_snapshot_id=m.inventory_snapshot_id,
                inventory_lot_id=m.inventory_lot_id,
                changed_by_id=m.changed_by_id,
                changed_by_name=users.get(m.changed_by_id, "System Operator"),
                distributor_id=did,
                distributor_name=dist_names.get(did, "Warehouse") if did else None,
                product_id=pid,
                product_name=products.get(pid, "Product") if pid else None,
                quantity_delta=m.quantity_delta,
                reason=m.reason,
                lot_number=m.lot_number,
                batch_number=m.batch_number,
                expiry_date=m.expiry_date,
                storage_conditions=m.storage_conditions,
                created_at=m.created_at,
            )
        )
    return outs


def _order_output(db: Session, order: CustomerOrder) -> OrderOut:
    items = db.scalars(select(OrderItem).where(OrderItem.order_id == order.id).order_by(OrderItem.id)).all()
    account = db.get(Account, order.account_id)
    distributor_name = None
    if order.distributor_id:
        dist = db.get(Distributor, order.distributor_id)
        if dist:
            dist_acc = db.get(Account, dist.account_id)
            distributor_name = dist_acc.name if dist_acc else None
    item_outs = [OrderItemOut.model_validate(item) for item in items]
    total = sum((Decimal(str(item.quantity)) * Decimal(str(item.unit_price)) for item in items), Decimal("0"))
    return OrderOut(
        id=order.id,
        order_number=order.order_number,
        account_id=order.account_id,
        account_name=account.name if account else None,
        distributor_id=order.distributor_id,
        distributor_name=distributor_name,
        status=order.status,
        order_date=order.order_date,
        items=item_outs,
        total_amount=total,
    )


def _orders_output(db: Session, orders: list[CustomerOrder]) -> list[OrderOut]:
    if not orders:
        return []
    order_ids = [order.id for order in orders]
    items_by_order: dict[uuid.UUID, list[OrderItemOut]] = {}
    for item in db.scalars(
        select(OrderItem)
        .where(OrderItem.order_id.in_(order_ids))
        .order_by(OrderItem.order_id, OrderItem.id)
    ):
        items_by_order.setdefault(item.order_id, []).append(OrderItemOut.model_validate(item))

    account_ids = {order.account_id for order in orders}
    accounts = {a.id: a.name for a in db.scalars(select(Account).where(Account.id.in_(account_ids))).all()}

    dist_ids = {order.distributor_id for order in orders if order.distributor_id}
    dist_names: dict[uuid.UUID, str] = {}
    if dist_ids:
        dists = db.scalars(select(Distributor).where(Distributor.id.in_(dist_ids))).all()
        dist_acc_ids = {d.account_id for d in dists}
        dist_accs = {a.id: a.name for a in db.scalars(select(Account).where(Account.id.in_(dist_acc_ids))).all()}
        for d in dists:
            if d.account_id in dist_accs:
                dist_names[d.id] = dist_accs[d.account_id]

    results: list[OrderOut] = []
    for order in orders:
        items = items_by_order.get(order.id, [])
        total = sum((Decimal(str(item.quantity)) * Decimal(str(item.unit_price)) for item in items), Decimal("0"))
        results.append(
            OrderOut(
                id=order.id,
                order_number=order.order_number,
                account_id=order.account_id,
                account_name=accounts.get(order.account_id),
                distributor_id=order.distributor_id,
                distributor_name=dist_names.get(order.distributor_id) if order.distributor_id else None,
                status=order.status,
                order_date=order.order_date,
                items=items,
                total_amount=total,
            )
        )
    return results


def _account_filter_for_user(db: Session, user: User):
    roles = get_user_roles(db, user.id)
    query = select(Account.id).where(Account.archived_at.is_(None))
    if roles.intersection({"SUPER_ADMIN", "ADMIN", "EXECUTIVE", "INVENTORY_MANAGER"}):
        return query
    if "SALES_MANAGER" in roles:
        return query.where(Account.territory == user.territory)
    if "MEDICAL_REPRESENTATIVE" in roles:
        return query.where(Account.assigned_employee_id == user.id)
    if "DISTRIBUTOR_MANAGER" in roles:
        return query.join(Distributor, Distributor.account_id == Account.id).where(
            Distributor.assigned_manager_id == user.id
        )
    raise HTTPException(status_code=403, detail="Insufficient permissions")


def _authorize_distributor(
    db: Session,
    user: User,
    distributor_id: uuid.UUID,
    order_account_id: uuid.UUID | None = None,
) -> Distributor:
    distributor = db.get(Distributor, distributor_id)
    if distributor is None:
        raise HTTPException(status_code=404, detail="Distributor not found")
    roles = get_user_roles(db, user.id)
    if roles.intersection({"SUPER_ADMIN", "ADMIN", "INVENTORY_MANAGER"}):
        return distributor
    if "DISTRIBUTOR_MANAGER" in roles:
        account = db.get(Account, distributor.account_id)
        if account is None or account.archived_at is not None or distributor.assigned_manager_id != user.id:
            raise HTTPException(status_code=404, detail="Distributor not found")
        return distributor
    if roles.intersection({"SALES_MANAGER", "MEDICAL_REPRESENTATIVE"}):
        if order_account_id is None or distributor.account_id != order_account_id:
            raise HTTPException(status_code=403, detail="Distributor is not authorized for this account")
        can_access_account(db, user, distributor.account_id)
        return distributor
    raise HTTPException(status_code=403, detail="Insufficient permissions")


def _authorize_order(db: Session, order: CustomerOrder, user: User) -> None:
    allowed_ids = db.scalars(_account_filter_for_user(db, user)).all()
    if order.account_id not in allowed_ids:
        raise HTTPException(status_code=404, detail="Order not found")


@router.get("/orders", response_model=list[OrderOut])
def list_orders(
    status: str | None = None,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    user: User = Depends(require_roles(*ORDER_READ_ROLES)),
    db: Session = Depends(get_db),
) -> list[OrderOut]:
    query = select(CustomerOrder).where(CustomerOrder.account_id.in_(_account_filter_for_user(db, user)))
    if status:
        query = query.where(CustomerOrder.status == status)
    orders = db.scalars(query.order_by(CustomerOrder.order_date.desc()).limit(limit).offset(offset)).all()
    return _orders_output(db, list(orders))


@router.get("/orders/{order_id}", response_model=OrderOut)
def get_order(
    order_id: uuid.UUID,
    user: User = Depends(require_roles(*ORDER_READ_ROLES)),
    db: Session = Depends(get_db),
) -> OrderOut:
    order = db.get(CustomerOrder, order_id)
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")
    _authorize_order(db, order, user)
    return _order_output(db, order)


@router.post("/orders", response_model=OrderOut, status_code=201)
def create_order(
    payload: OrderCreate,
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key", max_length=160),
    user: User = Depends(require_roles(*ORDER_CREATE_ROLES)),
    db: Session = Depends(get_db),
) -> OrderOut:
    roles = get_user_roles(db, user.id)
    if "DISTRIBUTOR_MANAGER" in roles and not roles.intersection({"SUPER_ADMIN", "ADMIN"}):
        if payload.distributor_id is None:
            raise HTTPException(status_code=422, detail="Distributor managers must specify their distributor")
        distributor = _authorize_distributor(db, user, payload.distributor_id, payload.account_id)
        if distributor.account_id != payload.account_id:
            raise HTTPException(status_code=403, detail="Order account does not match the assigned distributor")
    else:
        can_access_account(db, user, payload.account_id)
    if idempotency_key:
        existing = db.scalar(
            select(CustomerOrder).where(
                CustomerOrder.created_by_id == user.id,
                CustomerOrder.idempotency_key == idempotency_key,
            )
        )
        if existing is not None:
            return _order_output(db, existing)
    if payload.distributor_id is not None:
        _authorize_distributor(db, user, payload.distributor_id, payload.account_id)
    unique_products = {item.product_id for item in payload.items}
    if len(unique_products) != len(payload.items):
        raise HTTPException(status_code=422, detail="Each product may appear only once in an order")
    products = db.scalars(select(Product).where(Product.id.in_(unique_products))).all()
    if len(products) != len(unique_products) or any(not product.is_active for product in products):
        raise HTTPException(status_code=422, detail="Order includes an unavailable product")

    order = CustomerOrder(
        order_number=f"ORD-{uuid.uuid4().hex[:20].upper()}",
        account_id=payload.account_id,
        distributor_id=payload.distributor_id,
        created_by_id=user.id,
        idempotency_key=idempotency_key,
        status="draft",
    )
    db.add(order)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        if idempotency_key:
            existing = db.scalar(
                select(CustomerOrder).where(
                    CustomerOrder.created_by_id == user.id,
                    CustomerOrder.idempotency_key == idempotency_key,
                )
            )
            if existing is not None:
                return _order_output(db, existing)
        raise HTTPException(status_code=409, detail="Order could not be created with the supplied values") from None
    db.add_all(
        OrderItem(
            order_id=order.id,
            product_id=item.product_id,
            quantity=item.quantity,
            unit_price=item.unit_price,
        )
        for item in payload.items
    )
    db.flush()
    record_audit(db, actor_id=user.id, action="order_created", entity_type="order", entity_id=order.id)
    return _order_output(db, order)


@router.patch("/orders/{order_id}", response_model=OrderOut)
def patch_order(
    order_id: uuid.UUID,
    payload: OrderPatch,
    user: User = Depends(require_roles(*ORDER_READ_ROLES)),
    db: Session = Depends(get_db),
) -> OrderOut:
    order = db.scalar(select(CustomerOrder).where(CustomerOrder.id == order_id).with_for_update())
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")
    _authorize_order(db, order, user)
    if order.status != "draft" or payload.status != "submitted":
        raise HTTPException(status_code=409, detail="Only draft orders can be submitted")
    if order.distributor_id is None:
        raise HTTPException(status_code=409, detail="Select a distributor before submitting the order")
    _authorize_distributor(db, user, order.distributor_id, order.account_id)
    items = db.scalars(select(OrderItem).where(OrderItem.order_id == order.id)).all()
    for item in items:
        product = db.get(Product, item.product_id)
        try:
            reserve_order_inventory(
                db,
                distributor_id=order.distributor_id,
                product_id=item.product_id,
                quantity=item.quantity,
                order_id=order.id,
                order_item_id=item.id,
                changed_by_id=user.id,
                reason=f"Order reservation {order.order_number}",
                require_lots=product is not None and requires_lot_tracking(product.category),
            )
        except InsufficientInventory:
            raise HTTPException(status_code=409, detail="Insufficient inventory to submit order") from None
        except InventoryLotConflict:
            raise HTTPException(status_code=409, detail="Inventory lot metadata is inconsistent") from None
    order.status = "submitted"
    record_audit(
        db,
        actor_id=user.id,
        action="order_submitted",
        entity_type="order",
        entity_id=order.id,
        before={"status": "draft"},
        after={"status": "submitted"},
    )
    return _order_output(db, order)


@router.post("/orders/{order_id}/cancel", response_model=OrderOut)
def cancel_order(
    order_id: uuid.UUID,
    user: User = Depends(require_roles(*ORDER_READ_ROLES)),
    db: Session = Depends(get_db),
) -> OrderOut:
    order = db.scalar(select(CustomerOrder).where(CustomerOrder.id == order_id).with_for_update())
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")
    _authorize_order(db, order, user)
    if order.status != "draft":
        raise HTTPException(status_code=409, detail="Only draft orders can be cancelled")
    order.status = "cancelled"
    record_audit(
        db,
        actor_id=user.id,
        action="order_cancelled",
        entity_type="order",
        entity_id=order.id,
        before={"status": "draft"},
        after={"status": "cancelled"},
    )
    return _order_output(db, order)


@router.get("/inventory", response_model=list[InventoryOut])
def list_inventory(
    distributor_id: uuid.UUID | None = None,
    product_id: uuid.UUID | None = None,
    limit: int = Query(default=100, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    user: User = Depends(require_roles(*INVENTORY_READ_ROLES)),
    db: Session = Depends(get_db),
) -> list[InventoryOut]:
    query = select(InventoryBalance)
    if distributor_id:
        _authorize_distributor(db, user, distributor_id)
        query = query.where(InventoryBalance.distributor_id == distributor_id)
    elif "DISTRIBUTOR_MANAGER" in get_user_roles(db, user.id) and not get_user_roles(db, user.id).intersection(
        {"SUPER_ADMIN", "ADMIN", "INVENTORY_MANAGER"}
    ):
        account_ids = _account_filter_for_user(db, user)
        query = query.where(
            InventoryBalance.distributor_id.in_(
                select(Distributor.id).where(Distributor.account_id.in_(account_ids))
            )
        )
    if product_id:
        query = query.where(InventoryBalance.product_id == product_id)
    balances = list(db.scalars(query.order_by(InventoryBalance.updated_at.desc()).limit(limit).offset(offset)))
    return _inventory_output(db, balances)


@router.get("/inventory/low-stock", response_model=list[InventoryOut])
def low_stock(
    threshold: int = Query(default=20, ge=0, le=1_000_000),
    limit: int = Query(default=100, ge=1, le=100),
    user: User = Depends(require_roles(*INVENTORY_READ_ROLES)),
    db: Session = Depends(get_db),
) -> list[InventoryOut]:
    query = select(InventoryBalance).where(InventoryBalance.quantity <= threshold)
    roles = get_user_roles(db, user.id)
    if "DISTRIBUTOR_MANAGER" in roles and not roles.intersection({"SUPER_ADMIN", "ADMIN", "INVENTORY_MANAGER"}):
        account_ids = _account_filter_for_user(db, user)
        query = query.where(
            InventoryBalance.distributor_id.in_(
                select(Distributor.id).where(Distributor.account_id.in_(account_ids))
            )
        )
    balances = list(db.scalars(query.order_by(InventoryBalance.quantity).limit(limit)))
    return _inventory_output(db, balances)


@router.get("/inventory/lots", response_model=list[InventoryLotOut])
def list_inventory_lots(
    distributor_id: uuid.UUID | None = None,
    product_id: uuid.UUID | None = None,
    limit: int = Query(default=100, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    user: User = Depends(require_roles(*INVENTORY_READ_ROLES)),
    db: Session = Depends(get_db),
) -> list[InventoryLotOut]:
    query = select(InventoryLotBalance)
    roles = get_user_roles(db, user.id)
    if distributor_id is not None:
        _authorize_distributor(db, user, distributor_id)
        query = query.where(InventoryLotBalance.distributor_id == distributor_id)
    elif "DISTRIBUTOR_MANAGER" in roles and not roles.intersection(
        {"SUPER_ADMIN", "ADMIN", "INVENTORY_MANAGER"}
    ):
        account_ids = _account_filter_for_user(db, user)
        query = query.where(
            InventoryLotBalance.distributor_id.in_(
                select(Distributor.id).where(Distributor.account_id.in_(account_ids))
            )
        )
    if product_id is not None:
        query = query.where(InventoryLotBalance.product_id == product_id)
    lots = list(
        db.scalars(
            query.order_by(InventoryLotBalance.expiry_date.asc().nullslast())
            .limit(limit)
            .offset(offset)
        )
    )
    return _inventory_lots_output(db, lots)


def get_inventory(
    inventory_id: uuid.UUID,
    user: User = Depends(require_roles(*INVENTORY_READ_ROLES)),
    db: Session = Depends(get_db),
) -> InventoryOut:
    balance = db.get(InventoryBalance, inventory_id)
    if balance is None:
        raise HTTPException(status_code=404, detail="Inventory record not found")
    _authorize_distributor(db, user, balance.distributor_id)
    return _inventory_output(db, [balance])[0]


@router.post("/inventory/adjustments", response_model=InventoryMovementOut, status_code=201)
def adjust_inventory(
    payload: InventoryAdjustment,
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key", max_length=160),
    user: User = Depends(require_roles("SUPER_ADMIN", "ADMIN", "INVENTORY_MANAGER", "DISTRIBUTOR_MANAGER")),
    db: Session = Depends(get_db),
) -> InventoryMovement:
    _authorize_distributor(db, user, payload.distributor_id)
    product = db.get(Product, payload.product_id)
    if product is None or not product.is_active:
        raise HTTPException(status_code=422, detail="Product is unavailable")
    if requires_lot_tracking(product.category) and not payload.lot_number:
        raise HTTPException(status_code=422, detail="Pharmaceutical inventory adjustments require a lot number")
    if idempotency_key:
        existing = db.scalar(
            select(InventoryMovement)
            .join(InventorySnapshot, InventorySnapshot.id == InventoryMovement.inventory_snapshot_id)
            .where(
                InventoryMovement.idempotency_key == idempotency_key,
            )
        )
        if existing is not None:
            snapshot = db.get(InventorySnapshot, existing.inventory_snapshot_id)
            if (
                snapshot is not None
                and snapshot.distributor_id == payload.distributor_id
                and snapshot.product_id == payload.product_id
            ):
                return existing
            raise HTTPException(status_code=409, detail="Idempotency key was already used for another adjustment")
    try:
        movement = apply_inventory_change(
            db,
            distributor_id=payload.distributor_id,
            product_id=payload.product_id,
            quantity_delta=payload.quantity_delta,
            changed_by_id=user.id,
            reason=payload.reason,
            idempotency_key=idempotency_key,
            lot_number=payload.lot_number,
            batch_number=payload.batch_number,
            expiry_date=payload.expiry_date,
            storage_conditions=payload.storage_conditions,
        )
    except InsufficientInventory:
        raise HTTPException(status_code=409, detail="Inventory adjustment would result in negative stock") from None
    except InventoryLotConflict:
        raise HTTPException(status_code=409, detail="Inventory lot metadata is inconsistent") from None
    except IntegrityError:
        db.rollback()
        if idempotency_key:
            existing = db.scalar(
                select(InventoryMovement)
                .join(InventorySnapshot, InventorySnapshot.id == InventoryMovement.inventory_snapshot_id)
                .where(InventoryMovement.idempotency_key == idempotency_key)
            )
            if existing is not None:
                snapshot = db.get(InventorySnapshot, existing.inventory_snapshot_id)
                if snapshot and snapshot.distributor_id == payload.distributor_id and snapshot.product_id == payload.product_id:
                    return existing
        raise HTTPException(status_code=409, detail="Inventory adjustment could not be applied") from None
    record_audit(
        db,
        actor_id=user.id,
        action="inventory_adjusted",
        entity_type="inventory_movement",
        entity_id=movement.id,
        after={"quantity_delta": payload.quantity_delta, "reason": payload.reason},
    )
    return movement


@router.get("/inventory/movements", response_model=list[InventoryMovementOut])
def list_inventory_movements(
    distributor_id: uuid.UUID | None = None,
    product_id: uuid.UUID | None = None,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    user: User = Depends(require_roles(*INVENTORY_READ_ROLES)),
    db: Session = Depends(get_db),
) -> list[InventoryMovementOut]:
    query = select(InventoryMovement).join(
        InventorySnapshot, InventorySnapshot.id == InventoryMovement.inventory_snapshot_id
    )
    roles = get_user_roles(db, user.id)
    if "DISTRIBUTOR_MANAGER" in roles and not roles.intersection(
        {"SUPER_ADMIN", "ADMIN", "INVENTORY_MANAGER"}
    ):
        account_ids = _account_filter_for_user(db, user)
        query = query.where(
            InventorySnapshot.distributor_id.in_(
                select(Distributor.id).where(Distributor.account_id.in_(account_ids))
            )
        )
    if distributor_id:
        _authorize_distributor(db, user, distributor_id)
        query = query.where(InventorySnapshot.distributor_id == distributor_id)
    if product_id:
        query = query.where(InventorySnapshot.product_id == product_id)
    movements = list(db.scalars(query.order_by(InventoryMovement.created_at.desc()).limit(limit).offset(offset)))
    return _inventory_movements_output(db, movements)


@router.get("/distributors", response_model=list[DistributorOut])
def list_distributors(
    user: User = Depends(require_roles(*DISTRIBUTOR_READ_ROLES)),
    db: Session = Depends(get_db),
) -> list[DistributorOut]:
    dists = list(db.scalars(select(Distributor).order_by(Distributor.region, Distributor.created_at)).all())
    if not dists:
        return []
    account_ids = {d.account_id for d in dists}
    accounts = {a.id: a.name for a in db.scalars(select(Account).where(Account.id.in_(account_ids))).all()}
    manager_ids = {d.assigned_manager_id for d in dists if d.assigned_manager_id}
    managers = {u.id: u.full_name for u in db.scalars(select(User).where(User.id.in_(manager_ids))).all()} if manager_ids else {}
    return [
        DistributorOut(
            id=d.id,
            account_id=d.account_id,
            account_name=accounts.get(d.account_id, "Distributor Organization"),
            region=d.region,
            assigned_manager_id=d.assigned_manager_id,
            assigned_manager_name=managers.get(d.assigned_manager_id),
            created_at=d.created_at,
        )
        for d in dists
    ]


def _tender_output(db: Session, tender: Tender) -> TenderOut:
    acc = db.get(Account, tender.account_id)
    owner = db.get(User, tender.owner_id) if tender.owner_id else None
    return TenderOut(
        id=tender.id,
        account_id=tender.account_id,
        account_name=acc.name if acc else None,
        reference=tender.reference,
        title=tender.title,
        status=tender.status,
        due_at=tender.due_at,
        owner_id=tender.owner_id,
        owner_name=owner.full_name if owner else None,
        requirements=tender.requirements,
        review_status=tender.review_status,
    )


def _tenders_output(db: Session, tenders: list[Tender]) -> list[TenderOut]:
    if not tenders:
        return []
    acc_ids = {t.account_id for t in tenders}
    accs = {a.id: a.name for a in db.scalars(select(Account).where(Account.id.in_(acc_ids))).all()}
    owner_ids = {t.owner_id for t in tenders if t.owner_id}
    owners = {u.id: u.full_name for u in db.scalars(select(User).where(User.id.in_(owner_ids))).all()} if owner_ids else {}
    return [
        TenderOut(
            id=t.id,
            account_id=t.account_id,
            account_name=accs.get(t.account_id),
            reference=t.reference,
            title=t.title,
            status=t.status,
            due_at=t.due_at,
            owner_id=t.owner_id,
            owner_name=owners.get(t.owner_id) if t.owner_id else None,
            requirements=t.requirements,
            review_status=t.review_status,
        )
        for t in tenders
    ]


@router.get("/tenders", response_model=list[TenderOut])
def list_tenders(
    account_id: uuid.UUID | None = None,
    status: str | None = None,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    user: User = Depends(require_roles("SUPER_ADMIN", "ADMIN", "TENDER_MANAGER", "SALES_MANAGER", "MEDICAL_REPRESENTATIVE")),
    db: Session = Depends(get_db),
) -> list[TenderOut]:
    query = select(Tender)
    roles = get_user_roles(db, user.id)
    if "TENDER_MANAGER" not in roles and not roles.intersection({"SUPER_ADMIN", "ADMIN"}):
        query = query.where(
            or_(
                Tender.owner_id == user.id,
                Tender.account_id.in_(_account_filter_for_user(db, user)),
            )
        )
    if account_id:
        query = query.where(Tender.account_id == account_id)
    if status:
        query = query.where(Tender.status == status)
    tenders = list(db.scalars(query.order_by(Tender.due_at.desc().nullslast()).limit(limit).offset(offset)))
    return _tenders_output(db, tenders)


@router.get("/tenders/upcoming-deadlines", response_model=list[TenderOut])
def upcoming_tenders(
    days: int = Query(default=30, ge=1, le=365),
    limit: int = Query(default=100, ge=1, le=100),
    user: User = Depends(require_roles("SUPER_ADMIN", "ADMIN", "TENDER_MANAGER", "SALES_MANAGER")),
    db: Session = Depends(get_db),
) -> list[TenderOut]:
    now = datetime.now(timezone.utc)
    query = select(Tender).where(
        Tender.due_at >= now,
        Tender.due_at <= now + timedelta(days=days),
        Tender.status.not_in({"awarded", "closed", "cancelled"}),
    )
    roles = get_user_roles(db, user.id)
    if "TENDER_MANAGER" not in roles and not roles.intersection({"SUPER_ADMIN", "ADMIN"}):
        query = query.where(Tender.owner_id == user.id)
    tenders = list(db.scalars(query.order_by(Tender.due_at).limit(limit)))
    return _tenders_output(db, tenders)


@router.get("/tenders/{tender_id}", response_model=TenderOut)
def get_tender(
    tender_id: uuid.UUID,
    user: User = Depends(require_roles("SUPER_ADMIN", "ADMIN", "TENDER_MANAGER", "SALES_MANAGER")),
    db: Session = Depends(get_db),
) -> TenderOut:
    tender = db.get(Tender, tender_id)
    if tender is None:
        raise HTTPException(status_code=404, detail="Tender not found")
    roles = get_user_roles(db, user.id)
    if not roles.intersection({"SUPER_ADMIN", "ADMIN", "TENDER_MANAGER"}) and tender.owner_id != user.id:
        raise HTTPException(status_code=404, detail="Tender not found")
    return _tender_output(db, tender)


@router.post("/tenders", response_model=TenderOut, status_code=201)
def create_tender(
    payload: TenderCreate,
    user: User = Depends(require_roles("SUPER_ADMIN", "ADMIN", "TENDER_MANAGER", "SALES_MANAGER", "MEDICAL_REPRESENTATIVE")),
    db: Session = Depends(get_db),
) -> TenderOut:
    if payload.status not in TENDER_STATES:
        raise HTTPException(status_code=422, detail="Unknown tender status")
    account = db.get(Account, payload.account_id)
    if account is None or account.archived_at is not None:
        raise HTTPException(status_code=404, detail="Account not found")
    if db.scalar(select(Tender.id).where(Tender.reference == payload.reference)) is not None:
        raise HTTPException(status_code=409, detail="Tender reference already exists")
    if payload.owner_id is not None and db.get(User, payload.owner_id) is None:
        raise HTTPException(status_code=422, detail="Tender owner does not exist")
    tender = Tender(**payload.model_dump(exclude={"owner_id"}), owner_id=payload.owner_id or user.id)
    db.add(tender)
    db.flush()
    record_audit(db, actor_id=user.id, action="tender_created", entity_type="tender", entity_id=tender.id)
    return _tender_output(db, tender)


@router.patch("/tenders/{tender_id}", response_model=TenderOut)
def patch_tender(
    tender_id: uuid.UUID,
    payload: TenderPatch,
    user: User = Depends(require_roles("SUPER_ADMIN", "ADMIN", "TENDER_MANAGER", "SALES_MANAGER")),
    db: Session = Depends(get_db),
) -> TenderOut:
    tender = db.get(Tender, tender_id)
    if tender is None:
        raise HTTPException(status_code=404, detail="Tender not found")
    changes = payload.model_dump(exclude_unset=True)
    if "status" in changes and changes["status"] is None:
        raise HTTPException(status_code=422, detail="Tender status cannot be null")
    if changes.get("status") is not None:
        if changes["status"] not in TENDER_STATES:
            raise HTTPException(status_code=422, detail="Unknown tender status")
        transitions = {
            "draft": {"draft", "open", "cancelled"},
            "open": {"open", "submitted", "cancelled"},
            "submitted": {"submitted", "awarded", "closed", "cancelled"},
            "awarded": {"awarded", "closed"},
            "closed": {"closed"},
            "cancelled": {"cancelled"},
        }
        if changes["status"] not in transitions[tender.status]:
            raise HTTPException(status_code=409, detail="Invalid tender status transition")
    for field, value in changes.items():
        setattr(tender, field, value)
    record_audit(
        db,
        actor_id=user.id,
        action="tender_updated",
        entity_type="tender",
        entity_id=tender.id,
        after={"changed_fields": sorted(changes)},
    )
    return _tender_output(db, tender)


def _can_access_ticket(db: Session, user: User, ticket: SupportCase) -> None:
    roles = get_user_roles(db, user.id)
    if roles.intersection({"SUPER_ADMIN", "ADMIN"}):
        return
    if "CUSTOMER_SUPPORT" in roles:
        if ticket.assigned_to_id not in (None, user.id):
            raise HTTPException(status_code=404, detail="Ticket not found")
        return
    can_access_account(db, user, ticket.account_id)


@router.get("/support/tickets", response_model=list[SupportTicketOut])
def list_support_tickets(
    status: str | None = None,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    user: User = Depends(require_roles("SUPER_ADMIN", "ADMIN", "CUSTOMER_SUPPORT", *SALES_ROLES)),
    db: Session = Depends(get_db),
) -> list[SupportCase]:
    roles = get_user_roles(db, user.id)
    query = select(SupportCase)
    if "SUPER_ADMIN" not in roles and "ADMIN" not in roles:
        if "CUSTOMER_SUPPORT" in roles:
            query = query.where(or_(SupportCase.assigned_to_id.is_(None), SupportCase.assigned_to_id == user.id))
        else:
            query = query.where(SupportCase.account_id.in_(_account_filter_for_user(db, user)))
    if status:
        query = query.where(SupportCase.status == status)
    return list(db.scalars(query.order_by(SupportCase.created_at.desc()).limit(limit).offset(offset)))


@router.get("/support/tickets/{ticket_id}", response_model=SupportTicketOut)
def get_support_ticket(
    ticket_id: uuid.UUID,
    user: User = Depends(require_roles("SUPER_ADMIN", "ADMIN", "CUSTOMER_SUPPORT", *SALES_ROLES)),
    db: Session = Depends(get_db),
) -> SupportCase:
    ticket = db.get(SupportCase, ticket_id)
    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")
    _can_access_ticket(db, user, ticket)
    return ticket


@router.post("/support/tickets", response_model=SupportTicketOut, status_code=201)
def create_support_ticket(
    payload: SupportTicketCreate,
    user: User = Depends(require_roles("SUPER_ADMIN", "ADMIN", "CUSTOMER_SUPPORT", *SALES_ROLES)),
    db: Session = Depends(get_db),
) -> SupportCase:
    is_support = "CUSTOMER_SUPPORT" in get_user_roles(db, user.id)
    if is_support:
        account = db.get(Account, payload.account_id)
        if account is None or account.archived_at is not None:
            raise HTTPException(status_code=404, detail="Account not found")
    else:
        can_access_account(db, user, payload.account_id)
    if payload.contact_id is not None:
        if "CUSTOMER_SUPPORT" in get_user_roles(db, user.id):
            contact = db.get(Contact, payload.contact_id)
            if contact is None or contact.status == "archived":
                raise HTTPException(status_code=404, detail="Contact not found")
        else:
            contact = can_access_contact(db, user, payload.contact_id)
        if contact.account_id != payload.account_id:
            raise HTTPException(status_code=422, detail="Contact must belong to the selected account")
    ticket = SupportCase(
        account_id=payload.account_id,
        contact_id=payload.contact_id,
        case_number=f"CASE-{uuid.uuid4().hex[:16].upper()}",
        subject=payload.subject,
        description=payload.description,
        priority=payload.priority,
        status="open",
        assigned_to_id=user.id if is_support else None,
    )
    db.add(ticket)
    db.flush()
    record_audit(db, actor_id=user.id, action="support_ticket_created", entity_type="support_case", entity_id=ticket.id)
    return ticket


@router.patch("/support/tickets/{ticket_id}", response_model=SupportTicketOut)
def patch_support_ticket(
    ticket_id: uuid.UUID,
    payload: SupportTicketPatch,
    user: User = Depends(require_roles("SUPER_ADMIN", "ADMIN", "CUSTOMER_SUPPORT")),
    db: Session = Depends(get_db),
) -> SupportCase:
    ticket = db.get(SupportCase, ticket_id)
    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")
    _can_access_ticket(db, user, ticket)
    changes = payload.model_dump(exclude_unset=True)
    if any(field in changes and changes[field] is None for field in ("status", "priority")):
        raise HTTPException(status_code=422, detail="Ticket status and priority cannot be null")
    if changes.get("status") is not None and changes["status"] not in SUPPORT_STATES:
        raise HTTPException(status_code=422, detail="Unknown ticket status")
    if changes.get("status") is not None:
        transitions = {
            "open": {"open", "in_progress", "closed"},
            "in_progress": {"in_progress", "waiting", "resolved", "closed"},
            "waiting": {"waiting", "in_progress", "closed"},
            "resolved": {"resolved", "closed", "open"},
            "closed": {"closed", "open"},
        }
        if changes["status"] not in transitions.get(ticket.status, {ticket.status}):
            raise HTTPException(status_code=409, detail="Invalid support ticket status transition")
    if "assigned_to_id" in changes and changes["assigned_to_id"] is not None:
        assigned_user = db.get(User, changes["assigned_to_id"])
        if assigned_user is None:
            raise HTTPException(status_code=422, detail="Assigned user does not exist")
        if "CUSTOMER_SUPPORT" not in get_user_roles(db, assigned_user.id):
            raise HTTPException(status_code=422, detail="Assigned user must have the customer support role")
    for field, value in changes.items():
        setattr(ticket, field, value)
    record_audit(
        db,
        actor_id=user.id,
        action="support_ticket_updated",
        entity_type="support_case",
        entity_id=ticket.id,
        after={"changed_fields": sorted(changes)},
    )
    return ticket


@router.post(
    "/support/tickets/{ticket_id}/comments",
    response_model=SupportCommentOut,
    status_code=201,
)
def add_support_comment(
    ticket_id: uuid.UUID,
    payload: SupportCommentCreate,
    user: User = Depends(require_roles("SUPER_ADMIN", "ADMIN", "CUSTOMER_SUPPORT", *SALES_ROLES)),
    db: Session = Depends(get_db),
) -> SupportComment:
    ticket = db.get(SupportCase, ticket_id)
    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")
    _can_access_ticket(db, user, ticket)
    support_staff = bool(get_user_roles(db, user.id).intersection({"SUPER_ADMIN", "ADMIN", "CUSTOMER_SUPPORT"}))
    if payload.is_internal and not support_staff:
        raise HTTPException(status_code=403, detail="Only support staff can add internal notes")
    comment = SupportComment(
        case_id=ticket.id,
        author_id=user.id,
        body=payload.body,
        is_internal=payload.is_internal,
    )
    db.add(comment)
    db.flush()
    record_audit(db, actor_id=user.id, action="support_comment_added", entity_type="support_case", entity_id=ticket.id)
    return comment


@router.get("/support/tickets/{ticket_id}/comments", response_model=list[SupportCommentOut])
def list_support_comments(
    ticket_id: uuid.UUID,
    user: User = Depends(require_roles("SUPER_ADMIN", "ADMIN", "CUSTOMER_SUPPORT", *SALES_ROLES)),
    db: Session = Depends(get_db),
) -> list[SupportComment]:
    ticket = db.get(SupportCase, ticket_id)
    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")
    _can_access_ticket(db, user, ticket)
    query = select(SupportComment).where(SupportComment.case_id == ticket_id)
    if not get_user_roles(db, user.id).intersection({"SUPER_ADMIN", "ADMIN", "CUSTOMER_SUPPORT"}):
        query = query.where(SupportComment.is_internal.is_(False))
    return list(db.scalars(query.order_by(SupportComment.created_at)))


@router.get("/notifications", response_model=list[NotificationOut])
def list_notifications(
    unread_only: bool = False,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[Notification]:
    query = select(Notification).where(Notification.user_id == user.id)
    if unread_only:
        query = query.where(Notification.read_at.is_(None))
    return list(db.scalars(query.order_by(Notification.created_at.desc()).limit(limit).offset(offset)))


@router.patch("/notifications/{notification_id}/read", response_model=NotificationOut)
def mark_notification_read(
    notification_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Notification:
    notification = db.scalar(
        select(Notification).where(Notification.id == notification_id, Notification.user_id == user.id)
    )
    if notification is None:
        raise HTTPException(status_code=404, detail="Notification not found")
    notification.read_at = notification.read_at or datetime.now(timezone.utc)
    return notification


@router.patch("/notifications/read-all", status_code=204)
def mark_all_notifications_read(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    notifications = db.scalars(
        select(Notification).where(Notification.user_id == user.id, Notification.read_at.is_(None))
    ).all()
    now = datetime.now(timezone.utc)
    for notification in notifications:
        notification.read_at = now


@router.get("/inventory/{inventory_id}", response_model=InventoryOut)
def inventory_detail(
    inventory_id: uuid.UUID,
    user: User = Depends(require_roles("SUPER_ADMIN", "ADMIN", "INVENTORY_MANAGER", "DISTRIBUTOR_MANAGER")),
    db: Session = Depends(get_db),
) -> InventoryBalance:
    return get_inventory(inventory_id, user, db)
