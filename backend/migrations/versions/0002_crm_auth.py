"""Add authentication and CRM workflow fields.

Revision ID: 0002_crm_auth
Revises: 0001_initial
"""
import uuid

import sqlalchemy as sa
from alembic import context, op
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy import inspect, select

from app.models import Base

revision = "0002_crm_auth"
down_revision = "0001_initial"
branch_labels = None
depends_on = None

def _create_new_tables(offline: bool) -> None:
    existing = set() if offline else set(inspect(op.get_bind()).get_table_names())
    definitions = (
        (
            "refresh_tokens",
            sa.Column("id", sa.Uuid(), nullable=False),
            sa.Column("user_id", sa.Uuid(), nullable=False),
            sa.Column("token_hash", sa.String(64), nullable=False),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("revoked_at", sa.DateTime(timezone=True)),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("token_hash"),
        ),
        (
            "password_reset_tokens",
            sa.Column("id", sa.Uuid(), nullable=False),
            sa.Column("user_id", sa.Uuid(), nullable=False),
            sa.Column("token_hash", sa.String(64), nullable=False),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("used_at", sa.DateTime(timezone=True)),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("token_hash"),
        ),
        (
            "auth_rate_limits",
            sa.Column("rate_limit_key", sa.String(64), nullable=False),
            sa.Column("window_started_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("failures", sa.Integer(), nullable=False, server_default=sa.text("0")),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
            sa.PrimaryKeyConstraint("rate_limit_key"),
        ),
        (
            "inventory_lot_balances",
            sa.Column("id", sa.Uuid(), nullable=False),
            sa.Column("distributor_id", sa.Uuid(), nullable=False),
            sa.Column("product_id", sa.Uuid(), nullable=False),
            sa.Column("lot_number", sa.String(120), nullable=False),
            sa.Column("batch_number", sa.String(120)),
            sa.Column("expiry_date", sa.Date()),
            sa.Column("storage_conditions", sa.String(200)),
            sa.Column("quantity", sa.Integer(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
            sa.CheckConstraint("quantity >= 0", name="ck_inventory_lot_quantity_nonnegative"),
            sa.ForeignKeyConstraint(["distributor_id"], ["distributors.id"]),
            sa.ForeignKeyConstraint(["product_id"], ["products.id"]),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint(
                "distributor_id",
                "product_id",
                "lot_number",
                name="uq_inventory_lot_distributor_product_lot",
            ),
        ),
        (
            "inventory_movements",
            sa.Column("id", sa.Uuid(), nullable=False),
            sa.Column("inventory_snapshot_id", sa.Uuid(), nullable=False),
            sa.Column("inventory_lot_id", sa.Uuid()),
            sa.Column("changed_by_id", sa.Uuid(), nullable=False),
            sa.Column("quantity_delta", sa.Integer(), nullable=False),
            sa.Column("reason", sa.String(240), nullable=False),
            sa.Column("lot_number", sa.String(120)),
            sa.Column("batch_number", sa.String(120)),
            sa.Column("expiry_date", sa.Date()),
            sa.Column("storage_conditions", sa.String(200)),
            sa.Column("idempotency_key", sa.String(160)),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(["inventory_snapshot_id"], ["inventory_snapshots.id"]),
            sa.ForeignKeyConstraint(["inventory_lot_id"], ["inventory_lot_balances.id"]),
            sa.ForeignKeyConstraint(["changed_by_id"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("idempotency_key", name="uq_inventory_movements_idempotency_key"),
        ),
        (
            "inventory_balances",
            sa.Column("id", sa.Uuid(), nullable=False),
            sa.Column("distributor_id", sa.Uuid(), nullable=False),
            sa.Column("product_id", sa.Uuid(), nullable=False),
            sa.Column("quantity", sa.Integer(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
            sa.CheckConstraint("quantity >= 0", name="ck_inventory_balance_quantity_nonnegative"),
            sa.ForeignKeyConstraint(["distributor_id"], ["distributors.id"]),
            sa.ForeignKeyConstraint(["product_id"], ["products.id"]),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint(
                "distributor_id", "product_id", name="uq_inventory_balance_distributor_product"
            ),
        ),
        (
            "support_comments",
            sa.Column("id", sa.Uuid(), nullable=False),
            sa.Column("case_id", sa.Uuid(), nullable=False),
            sa.Column("author_id", sa.Uuid(), nullable=False),
            sa.Column("body", sa.Text(), nullable=False),
            sa.Column("is_internal", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(["case_id"], ["support_cases.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["author_id"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
        ),
    )
    for definition in definitions:
        name, *columns_and_constraints = definition
        if name not in existing:
            op.create_table(name, *columns_and_constraints, if_not_exists=offline)

    indexes = (
        ("ix_refresh_tokens_user_id", "refresh_tokens", ["user_id"]),
        ("ix_password_reset_tokens_user_id", "password_reset_tokens", ["user_id"]),
        ("ix_inventory_movements_inventory_snapshot_id", "inventory_movements", ["inventory_snapshot_id"]),
        ("ix_inventory_movements_inventory_lot_id", "inventory_movements", ["inventory_lot_id"]),
        ("ix_support_comments_case_id", "support_comments", ["case_id"]),
    )
    for name, table_name, columns in indexes:
        if offline or name not in {item["name"] for item in inspect(op.get_bind()).get_indexes(table_name)}:
            op.create_index(name, table_name, columns, if_not_exists=offline)


def _existing_columns(table_name: str) -> set[str]:
    inspector = inspect(op.get_bind())
    if table_name not in inspector.get_table_names():
        return set()
    return {column["name"] for column in inspector.get_columns(table_name)}


def upgrade() -> None:
    bind = op.get_bind()
    if context.is_offline_mode():
        _create_new_tables(offline=True)
        additions = {
            "users": [
                ("territory", "VARCHAR(120)"),
                ("auth_version", "INTEGER DEFAULT 0 NOT NULL"),
            ],
            "accounts": [
                ("territory", "VARCHAR(120)"),
                ("assigned_employee_id", "UUID"),
                ("archived_at", "TIMESTAMP WITH TIME ZONE"),
            ],
            "contacts": [
                ("professional_category", "VARCHAR(100)"),
                ("territory", "VARCHAR(120)"),
                ("assigned_rep_id", "UUID"),
                ("status", "VARCHAR(40) DEFAULT 'active' NOT NULL"),
            ],
            "products": [("category", "VARCHAR(100)"), ("is_active", "BOOLEAN DEFAULT TRUE NOT NULL")],
            "opportunities": [("probability", "INTEGER DEFAULT 0 NOT NULL"), ("next_action", "VARCHAR(240)")],
            "sales_activities": [("opportunity_id", "UUID")],
            "orders": [("created_by_id", "UUID"), ("idempotency_key", "VARCHAR(160)")],
            "distributors": [("assigned_manager_id", "UUID")],
            "pharmacovigilance_intake": [("assigned_to_id", "UUID")],
            "inventory_movements": [("inventory_lot_id", "UUID")],
            "tenders": [
                ("owner_id", "UUID"),
                ("requirements", "TEXT"),
                ("review_status", "VARCHAR(40) DEFAULT 'pending' NOT NULL"),
            ],
            "support_cases": [
                ("priority", "VARCHAR(30) DEFAULT 'normal' NOT NULL"),
                ("assigned_to_id", "UUID"),
                ("sla_due_at", "TIMESTAMP WITH TIME ZONE"),
            ],
        }
        for table_name, columns in additions.items():
            for column_name, sql_type in columns:
                op.execute(
                    sa.text(
                        f'ALTER TABLE "{table_name}" ADD COLUMN IF NOT EXISTS "{column_name}" {sql_type}'
                    )
                )
        op.execute(
            sa.text(
                "DO $$ BEGIN "
                "IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = "
                "'uq_orders_creator_idempotency_key' AND conrelid = 'orders'::regclass) THEN "
                "ALTER TABLE orders ADD CONSTRAINT uq_orders_creator_idempotency_key "
                "UNIQUE (created_by_id, idempotency_key); END IF; END $$;"
            )
        )
        for table_name, index_name, columns in (
            ("accounts", "ix_accounts_territory", ["territory"]),
            ("contacts", "ix_contacts_territory", ["territory"]),
            ("contacts", "ix_contacts_assigned_rep_id", ["assigned_rep_id"]),
            ("accounts", "ix_accounts_assigned_employee_id", ["assigned_employee_id"]),
            ("opportunities", "ix_opportunities_owner_id", ["owner_id"]),
            ("orders", "ix_orders_account_id", ["account_id"]),
            ("tenders", "ix_tenders_owner_id", ["owner_id"]),
            ("support_cases", "ix_support_cases_assigned_to_id", ["assigned_to_id"]),
            ("distributors", "ix_distributors_assigned_manager_id", ["assigned_manager_id"]),
            ("inventory_movements", "ix_inventory_movements_inventory_lot_id", ["inventory_lot_id"]),
            (
                "pharmacovigilance_intake",
                "ix_pharmacovigilance_intake_assigned_to_id",
                ["assigned_to_id"],
            ),
        ):
            columns_sql = ", ".join(f'"{column}"' for column in columns)
            op.execute(sa.text(f'CREATE INDEX IF NOT EXISTS "{index_name}" ON "{table_name}" ({columns_sql})'))
        for table_name, constraint_name, column_name, referred_table in (
            ("accounts", "fk_accounts_assigned_employee_id_users", "assigned_employee_id", "users"),
            ("contacts", "fk_contacts_assigned_rep_id_users", "assigned_rep_id", "users"),
            ("orders", "fk_orders_created_by_id_users", "created_by_id", "users"),
            ("distributors", "fk_distributors_assigned_manager_id_users", "assigned_manager_id", "users"),
            ("tenders", "fk_tenders_owner_id_users", "owner_id", "users"),
            ("support_cases", "fk_support_cases_assigned_to_id_users", "assigned_to_id", "users"),
            ("sales_activities", "fk_sales_activities_opportunity_id_opportunities", "opportunity_id", "opportunities"),
            (
                "pharmacovigilance_intake",
                "fk_pharmacovigilance_intake_assigned_to_id_users",
                "assigned_to_id",
                "users",
            ),
            (
                "inventory_movements",
                "fk_inventory_movements_inventory_lot_id_inventory_lot_balances",
                "inventory_lot_id",
                "inventory_lot_balances",
            ),
        ):
            op.execute(
                sa.text(
                    "DO $$ BEGIN IF NOT EXISTS "
                    f"(SELECT 1 FROM pg_constraint WHERE conname = '{constraint_name}' "
                    f"AND conrelid = '{table_name}'::regclass) THEN "
                    f'ALTER TABLE "{table_name}" ADD CONSTRAINT "{constraint_name}" '
                    f'FOREIGN KEY ("{column_name}") REFERENCES "{referred_table}" ("id"); '
                    "END IF; END $$;"
                )
            )
        op.execute(
            sa.text(
                "UPDATE roles SET name = 'SUPER_ADMIN' WHERE lower(name) = 'administrator' "
                "AND NOT EXISTS (SELECT 1 FROM roles WHERE name = 'SUPER_ADMIN')"
            )
        )
        op.execute(
            sa.text(
                "INSERT INTO user_roles (user_id, role_id) "
                "SELECT ur.user_id, target.id FROM user_roles ur "
                "JOIN roles old ON old.id = ur.role_id AND lower(old.name) = 'administrator' "
                "JOIN roles target ON target.name = 'SUPER_ADMIN' "
                "ON CONFLICT (user_id, role_id) DO NOTHING"
            )
        )
        op.execute(
            sa.text(
                "DELETE FROM user_roles WHERE role_id IN (SELECT id FROM roles WHERE lower(name) = 'administrator')"
            )
        )
        op.execute(sa.text("DELETE FROM roles WHERE lower(name) = 'administrator'"))
        for role_name in (
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
        ):
            op.execute(
                sa.text(
                    "INSERT INTO roles (id, name, description, created_at, updated_at) VALUES "
                    "(:id, :name, :description, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) "
                    "ON CONFLICT (name) DO NOTHING"
                ).bindparams(
                    id=str(uuid.uuid4()),
                    name=role_name,
                    description=f"Accord Pharma {role_name.replace('_', ' ').title()} role",
                )
            )
        return
    _create_new_tables(offline=False)

    column_additions: dict[str, list[tuple[str, sa.types.TypeEngine, bool, object | None]]] = {
        "users": [
            ("territory", sa.String(120), True, None),
            ("auth_version", sa.Integer(), False, sa.text("0")),
        ],
        "accounts": [
            ("territory", sa.String(120), True, None),
            ("assigned_employee_id", sa.Uuid(), True, None),
            ("archived_at", sa.DateTime(timezone=True), True, None),
        ],
        "contacts": [
            ("professional_category", sa.String(100), True, None),
            ("territory", sa.String(120), True, None),
            ("assigned_rep_id", sa.Uuid(), True, None),
            ("status", sa.String(40), False, sa.text("'active'")),
        ],
        "products": [
            ("category", sa.String(100), True, None),
            ("is_active", sa.Boolean(), False, sa.true()),
        ],
        "opportunities": [
            ("probability", sa.Integer(), False, sa.text("0")),
            ("next_action", sa.String(240), True, None),
        ],
        "sales_activities": [("opportunity_id", sa.Uuid(), True, None)],
        "orders": [
            ("created_by_id", sa.Uuid(), True, None),
            ("idempotency_key", sa.String(160), True, None),
        ],
        "distributors": [("assigned_manager_id", sa.Uuid(), True, None)],
        "pharmacovigilance_intake": [("assigned_to_id", sa.Uuid(), True, None)],
        "inventory_movements": [("inventory_lot_id", sa.Uuid(), True, None)],
        "tenders": [
            ("owner_id", sa.Uuid(), True, None),
            ("requirements", sa.Text(), True, None),
            ("review_status", sa.String(40), False, sa.text("'pending'")),
        ],
        "support_cases": [
            ("priority", sa.String(30), False, sa.text("'normal'")),
            ("assigned_to_id", sa.Uuid(), True, None),
            ("sla_due_at", sa.DateTime(timezone=True), True, None),
        ],
    }
    for table_name, additions in column_additions.items():
        existing = _existing_columns(table_name)
        for column_name, column_type, nullable, server_default in additions:
            if column_name not in existing:
                op.add_column(
                    table_name,
                    sa.Column(column_name, column_type, nullable=nullable, server_default=server_default),
                )

    existing_constraints = {constraint["name"] for constraint in inspect(bind).get_unique_constraints("orders")}
    if "uq_orders_creator_idempotency_key" not in existing_constraints:
        op.create_unique_constraint(
            "uq_orders_creator_idempotency_key", "orders", ["created_by_id", "idempotency_key"]
        )

    for table_name, index_name, columns in (
        ("accounts", "ix_accounts_territory", ["territory"]),
        ("contacts", "ix_contacts_territory", ["territory"]),
        ("contacts", "ix_contacts_assigned_rep_id", ["assigned_rep_id"]),
        ("accounts", "ix_accounts_assigned_employee_id", ["assigned_employee_id"]),
        ("opportunities", "ix_opportunities_owner_id", ["owner_id"]),
        ("orders", "ix_orders_account_id", ["account_id"]),
        ("tenders", "ix_tenders_owner_id", ["owner_id"]),
        ("support_cases", "ix_support_cases_assigned_to_id", ["assigned_to_id"]),
        ("distributors", "ix_distributors_assigned_manager_id", ["assigned_manager_id"]),
        ("inventory_movements", "ix_inventory_movements_inventory_lot_id", ["inventory_lot_id"]),
        (
            "pharmacovigilance_intake",
            "ix_pharmacovigilance_intake_assigned_to_id",
            ["assigned_to_id"],
        ),
    ):
        if index_name not in {item["name"] for item in inspect(bind).get_indexes(table_name)}:
            op.create_index(index_name, table_name, columns)

    foreign_keys = (
        ("accounts", "fk_accounts_assigned_employee_id_users", "assigned_employee_id", "users"),
        ("contacts", "fk_contacts_assigned_rep_id_users", "assigned_rep_id", "users"),
        ("orders", "fk_orders_created_by_id_users", "created_by_id", "users"),
        ("distributors", "fk_distributors_assigned_manager_id_users", "assigned_manager_id", "users"),
        ("tenders", "fk_tenders_owner_id_users", "owner_id", "users"),
        ("support_cases", "fk_support_cases_assigned_to_id_users", "assigned_to_id", "users"),
        ("sales_activities", "fk_sales_activities_opportunity_id_opportunities", "opportunity_id", "opportunities"),
        (
            "pharmacovigilance_intake",
            "fk_pharmacovigilance_intake_assigned_to_id_users",
            "assigned_to_id",
            "users",
        ),
        (
            "inventory_movements",
            "fk_inventory_movements_inventory_lot_id_inventory_lot_balances",
            "inventory_lot_id",
            "inventory_lot_balances",
        ),
    )
    for table_name, constraint_name, column_name, referred_table in foreign_keys:
        existing_columns = {
            tuple(item["constrained_columns"]) for item in inspect(bind).get_foreign_keys(table_name)
        }
        if (column_name,) not in existing_columns:
            op.create_foreign_key(
                constraint_name, table_name, referred_table, [column_name], ["id"]
            )

    role_table = Base.metadata.tables["roles"]
    user_role_table = Base.metadata.tables["user_roles"]
    old_admin = bind.execute(
        select(role_table.c.id).where(sa.func.lower(role_table.c.name) == "administrator")
    ).scalar_one_or_none()
    canonical_admin = bind.execute(
        select(role_table.c.id).where(role_table.c.name == "SUPER_ADMIN")
    ).scalar_one_or_none()
    if old_admin is not None and canonical_admin is None:
        bind.execute(sa.update(role_table).where(role_table.c.id == old_admin).values(name="SUPER_ADMIN"))
    elif old_admin is not None:
        bind.execute(
            pg_insert(user_role_table)
            .from_select(
                [user_role_table.c.user_id, user_role_table.c.role_id],
                select(user_role_table.c.user_id, sa.literal(canonical_admin)).where(
                    user_role_table.c.role_id == old_admin
                ),
            )
            .on_conflict_do_nothing()
        )
        bind.execute(sa.delete(user_role_table).where(user_role_table.c.role_id == old_admin))
        bind.execute(sa.delete(role_table).where(role_table.c.id == old_admin))

    for role_name in (
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
    ):
        if bind.execute(select(role_table.c.id).where(role_table.c.name == role_name)).scalar_one_or_none() is None:
            bind.execute(
                sa.insert(role_table).values(
                    id=uuid.uuid4(),
                    name=role_name,
                    description=f"Accord Pharma {role_name.replace('_', ' ').title()} role",
                )
            )


def downgrade() -> None:
    raise RuntimeError("This production-safe schema migration is forward-only; use a reviewed recovery migration.")
