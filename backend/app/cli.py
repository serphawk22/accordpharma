import argparse
import getpass
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from pwdlib import PasswordHash
from sqlalchemy import select

from app.config import get_settings
from app.demo_data import seed_demo_records
from app.schemas.api import validate_password_strength
from app.db.session import get_session_factory
from app.models import (
    Account,
    Contact,
    CustomerOrder,
    Distributor,
    InventoryBalance,
    InventoryMovement,
    InventorySnapshot,
    Notification,
    Opportunity,
    OrderItem,
    Product,
    Role,
    SupportCase,
    Tender,
    User,
    UserRole,
)

DEMO_ROLE_NAMES = (
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
)


def create_admin() -> None:
    email = input("Administrator email: ").strip().lower()
    full_name = input("Administrator name: ").strip()
    password = getpass.getpass("Administrator password (minimum 12 characters): ")
    confirmation = getpass.getpass("Confirm password: ")
    if len(password) < 12:
        raise SystemExit("Password must be at least 12 characters.")
    try:
        validate_password_strength(password)
    except ValueError as exc:
        raise SystemExit(str(exc)) from None
    if password != confirmation:
        raise SystemExit("Passwords do not match.")
    if not email or not full_name:
        raise SystemExit("Email and name are required.")

    with get_session_factory()() as session, session.begin():
        if session.scalar(select(User.id).where(User.email == email)) is not None:
            raise SystemExit("A user with that email already exists.")
        role = session.scalar(select(Role).where(Role.name == "SUPER_ADMIN"))
        if role is None:
            raise SystemExit("Roles are missing; run `alembic upgrade head` first.")
        user = User(
            email=email,
            full_name=full_name,
            password_hash=PasswordHash.recommended().hash(password),
        )
        session.add(user)
        session.flush()
        session.add(UserRole(user_id=user.id, role_id=role.id))
    print(f"Administrator account created for {email}.")


def seed_demo(record_count: int = 100, use_existing_admin: bool = False) -> None:
    settings = get_settings()
    if settings.app_env.lower() != "development" or not settings.allow_demo_seed:
        raise SystemExit(
            "Demo seeding is disabled. Set APP_ENV=development and ALLOW_DEMO_SEED=true only for a development database."
        )
    if record_count < 100:
        raise SystemExit("At least 100 demonstration records are required.")
    password_hash = None
    if not use_existing_admin:
        password = getpass.getpass("Shared fictional demo-user password (minimum 12 characters): ")
        confirmation = getpass.getpass("Confirm demo-user password: ")
        if len(password) < 12:
            raise SystemExit("Password must be at least 12 characters.")
        try:
            validate_password_strength(password)
        except ValueError as exc:
            raise SystemExit(str(exc)) from None
        if password != confirmation:
            raise SystemExit("Passwords do not match.")
        password_hash = PasswordHash.recommended().hash(password)

    with get_session_factory()() as session, session.begin():
        if use_existing_admin:
            admin = session.scalar(
                select(User)
                .join(UserRole, UserRole.user_id == User.id)
                .join(Role, Role.id == UserRole.role_id)
                .where(Role.name == "SUPER_ADMIN")
            )
            if admin is None:
                raise SystemExit("No SUPER_ADMIN user exists; create one before seeding demo data.")
            demo_users = {role_name: admin for role_name in DEMO_ROLE_NAMES}
        else:
            roles = {
                role.name: role
                for role in session.scalars(select(Role).where(Role.name.in_(DEMO_ROLE_NAMES))).all()
            }
            if set(roles) != set(DEMO_ROLE_NAMES):
                raise SystemExit("Roles are missing; run `alembic upgrade head` first.")
            demo_users = {}
            for role_name in DEMO_ROLE_NAMES:
                email = f"demo+{role_name.lower()}@example.invalid"
                user = session.scalar(select(User).where(User.email == email))
                if user is None:
                    user = User(
                        email=email,
                        full_name=f"Fictional {role_name.replace('_', ' ').title()}",
                        password_hash=password_hash,
                        territory="DEMO",
                    )
                    session.add(user)
                    session.flush()
                role_link = session.get(UserRole, (user.id, roles[role_name].id))
                if role_link is None:
                    session.add(UserRole(user_id=user.id, role_id=roles[role_name].id))
                demo_users[role_name] = user
        session.flush()

        account = session.scalar(select(Account).where(Account.name == "Fictional Northstar Clinic"))
        if account is None:
            account = Account(
                name="Fictional Northstar Clinic",
                account_type="healthcare_provider",
                market="DEMO",
                territory="DEMO",
                assigned_employee_id=demo_users["MEDICAL_REPRESENTATIVE"].id,
            )
            session.add(account)
            session.flush()
        contact = session.scalar(
            select(Contact).where(
                Contact.account_id == account.id,
                Contact.full_name == "Fictional Casey Example",
            )
        )
        if contact is None:
            session.add(
                Contact(
                    account_id=account.id,
                    full_name="Fictional Casey Example",
                    email="casey@example.invalid",
                    title="Demo Contact",
                    professional_category="Fictional healthcare professional",
                    territory="DEMO",
                    assigned_rep_id=demo_users["MEDICAL_REPRESENTATIVE"].id,
                )
            )
        product = session.scalar(select(Product).where(Product.sku == "DEMO-001"))
        if product is None:
            product = Product(
                name="Fictional Cardiomax 10 mg",
                sku="DEMO-001",
                description="Fictional demonstration-only product; not for clinical use.",
                category="Fictional demo",
            )
            session.add(product)
            session.flush()
        distributor = session.scalar(select(Distributor).where(Distributor.account_id == account.id))
        if distributor is None:
            distributor = Distributor(
                account_id=account.id,
                region="DEMO",
                assigned_manager_id=demo_users["DISTRIBUTOR_MANAGER"].id,
            )
            session.add(distributor)
            session.flush()
        opportunity = session.scalar(
            select(Opportunity).where(
                Opportunity.account_id == account.id,
                Opportunity.name == "Fictional Northstar Demo Opportunity",
            )
        )
        if opportunity is None:
            opportunity = Opportunity(
                account_id=account.id,
                owner_id=demo_users["MEDICAL_REPRESENTATIVE"].id,
                name="Fictional Northstar Demo Opportunity",
                stage="proposal",
                estimated_value=Decimal("1250.00"),
                probability=50,
                next_action="Review fictional demo proposal",
                expected_close_date=(datetime.now(timezone.utc) + timedelta(days=45)).date(),
            )
            session.add(opportunity)
        demo_order = session.scalar(select(CustomerOrder).where(CustomerOrder.order_number == "DEMO-ORDER-001"))
        if demo_order is None:
            demo_order = CustomerOrder(
                order_number="DEMO-ORDER-001",
                account_id=account.id,
                distributor_id=distributor.id,
                created_by_id=demo_users["MEDICAL_REPRESENTATIVE"].id,
                status="draft",
            )
            session.add(demo_order)
            session.flush()
            session.add(
                OrderItem(
                    order_id=demo_order.id,
                    product_id=product.id,
                    quantity=2,
                    unit_price=Decimal("10.00"),
                )
            )
        balance = session.scalar(
            select(InventoryBalance).where(
                InventoryBalance.distributor_id == distributor.id,
                InventoryBalance.product_id == product.id,
            )
        )
        if balance is None:
            now = datetime.now(timezone.utc)
            balance = InventoryBalance(
                distributor_id=distributor.id,
                product_id=product.id,
                quantity=100,
                updated_at=now,
            )
            snapshot = InventorySnapshot(
                distributor_id=distributor.id,
                product_id=product.id,
                quantity=100,
                snapshot_at=now,
            )
            session.add(snapshot)
            session.flush()
            session.add(balance)
            session.add(
                InventoryMovement(
                    inventory_snapshot_id=snapshot.id,
                    changed_by_id=demo_users["INVENTORY_MANAGER"].id,
                    quantity_delta=100,
                    reason="Fictional demonstration starting balance; not real inventory",
                    idempotency_key="fictional-demo-inventory-initial",
                )
            )
        if session.scalar(select(Tender.id).where(Tender.reference == "DEMO-TENDER-001")) is None:
            session.add(
                Tender(
                    account_id=account.id,
                    reference="DEMO-TENDER-001",
                    title="Fictional Demo Public Tender",
                    status="open",
                    due_at=datetime.now(timezone.utc) + timedelta(days=21),
                    owner_id=demo_users["TENDER_MANAGER"].id,
                    requirements="Fictional demonstration requirements.",
                )
            )
        if session.scalar(
            select(SupportCase.id).where(SupportCase.case_number == "DEMO-CASE-001")
        ) is None:
            session.add(
                SupportCase(
                    account_id=account.id,
                    case_number="DEMO-CASE-001",
                    subject="Fictional demo support request",
                    status="open",
                    priority="normal",
                    description="Fictional support content.",
                    assigned_to_id=demo_users["CUSTOMER_SUPPORT"].id,
                )
            )
        for role_name, demo_user in demo_users.items():
            title = f"Fictional {role_name.replace('_', ' ').title()} notification"
            if session.scalar(
                select(Notification.id).where(
                    Notification.user_id == demo_user.id,
                    Notification.title == title,
                )
            ) is None:
                session.add(
                    Notification(
                        user_id=demo_user.id,
                        title=title,
                        body="This notification and all linked demonstration records are fictional.",
                    )
                )
        seed_demo_records(session, demo_users, record_count)
    print("Fictional demonstration data is ready.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Accord Pharma development setup commands")
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("create-admin", help="Create a development administrator securely")
    seed_command = commands.add_parser("seed-demo", help="Add idempotent fictional demonstration data")
    seed_command.add_argument(
        "--records",
        type=int,
        default=100,
        help="At least 100 records per CRM/operations data table (default: 100)",
    )
    seed_command.add_argument(
        "--use-existing-admin",
        action="store_true",
        help="Use the existing SUPER_ADMIN for demo records without creating demo logins",
    )
    args = parser.parse_args()
    command = args.command
    if command == "create-admin":
        create_admin()
    elif command == "seed-demo":
        seed_demo(args.records, args.use_existing_admin)


if __name__ == "__main__":
    main()
