"""Sales workflow support: activity lifecycle, tasks, leads, stage/ownership history, notes, targets.

Revision ID: 0003_sales_workflows
Revises: 0002_crm_auth
"""

import sqlalchemy as sa
from alembic import op

revision = "0003_sales_workflows"
down_revision = "0002_crm_auth"
branch_labels = None
depends_on = None

UUID = sa.Uuid(as_uuid=True)
TS = sa.DateTime(timezone=True)


def _ts_cols() -> list[sa.Column]:
    return [
        sa.Column("created_at", TS, nullable=False),
        sa.Column("updated_at", TS, nullable=False),
    ]


def upgrade() -> None:
    # --- sales_activities: lifecycle + outcome capture -------------------------------------
    op.add_column("sales_activities", sa.Column("status", sa.String(30), nullable=False, server_default="completed"))
    op.add_column("sales_activities", sa.Column("contact_id", UUID, sa.ForeignKey("contacts.id")))
    op.add_column("sales_activities", sa.Column("purpose", sa.String(240)))
    op.add_column("sales_activities", sa.Column("location", sa.String(240)))
    op.add_column("sales_activities", sa.Column("priority", sa.String(20), nullable=False, server_default="normal"))
    op.add_column("sales_activities", sa.Column("outcome", sa.Text()))
    op.add_column("sales_activities", sa.Column("products_discussed", sa.Text()))
    op.add_column("sales_activities", sa.Column("objections", sa.Text()))
    op.add_column("sales_activities", sa.Column("commitments", sa.Text()))
    op.add_column("sales_activities", sa.Column("next_action", sa.String(240)))
    op.add_column("sales_activities", sa.Column("completed_at", TS))
    op.add_column("sales_activities", sa.Column("idempotency_key", sa.String(160)))
    op.create_index("ix_sales_activities_status", "sales_activities", ["status"])
    op.create_unique_constraint(
        "uq_sales_activities_owner_idem", "sales_activities", ["owner_id", "idempotency_key"]
    )
    # Pre-existing rows were logged interactions: mark them completed with their original timestamp.
    op.execute("UPDATE sales_activities SET completed_at = occurred_at WHERE completed_at IS NULL")

    # --- opportunities ---------------------------------------------------------------------
    op.add_column("opportunities", sa.Column("priority", sa.String(20), nullable=False, server_default="normal"))
    op.add_column("opportunities", sa.Column("lost_reason", sa.String(240)))
    op.add_column("opportunities", sa.Column("stage_changed_at", TS))
    op.execute("UPDATE opportunities SET stage_changed_at = COALESCE(updated_at, created_at)")

    op.create_table(
        "opportunity_stage_history",
        sa.Column("id", UUID, primary_key=True),
        sa.Column("opportunity_id", UUID, sa.ForeignKey("opportunities.id", ondelete="CASCADE"), nullable=False),
        sa.Column("from_stage", sa.String(60)),
        sa.Column("to_stage", sa.String(60), nullable=False),
        sa.Column("changed_by_id", UUID, sa.ForeignKey("users.id")),
        sa.Column("note", sa.String(240)),
        sa.Column("changed_at", TS, nullable=False),
    )
    op.create_index("ix_opportunity_stage_history_opportunity_id", "opportunity_stage_history", ["opportunity_id"])
    op.create_index("ix_opportunity_stage_history_changed_at", "opportunity_stage_history", ["changed_at"])
    # Seed one baseline row per existing opportunity so stage analytics have a starting point.
    # This records only what is known (current stage, as of creation/last change); it is not invented history.
    op.execute(
        "INSERT INTO opportunity_stage_history (id, opportunity_id, from_stage, to_stage, changed_by_id, note, changed_at) "
        "SELECT gen_random_uuid(), id, NULL, stage, owner_id, 'Baseline at migration', COALESCE(stage_changed_at, created_at) "
        "FROM opportunities"
    )

    # --- ownership history -----------------------------------------------------------------
    op.create_table(
        "assignment_history",
        sa.Column("id", UUID, primary_key=True),
        sa.Column("entity_type", sa.String(40), nullable=False),
        sa.Column("entity_id", UUID, nullable=False),
        sa.Column("account_id", UUID, sa.ForeignKey("accounts.id")),
        sa.Column("from_user_id", UUID, sa.ForeignKey("users.id")),
        sa.Column("to_user_id", UUID, sa.ForeignKey("users.id")),
        sa.Column("changed_by_id", UUID, sa.ForeignKey("users.id")),
        sa.Column("reason", sa.String(240)),
        sa.Column("created_at", TS, nullable=False),
    )
    op.create_index("ix_assignment_history_entity", "assignment_history", ["entity_type", "entity_id"])
    op.create_index("ix_assignment_history_account_id", "assignment_history", ["account_id"])
    op.create_index("ix_assignment_history_created_at", "assignment_history", ["created_at"])

    # --- notes -----------------------------------------------------------------------------
    op.create_table(
        "account_notes",
        sa.Column("id", UUID, primary_key=True),
        sa.Column("account_id", UUID, sa.ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("author_id", UUID, sa.ForeignKey("users.id"), nullable=False),
        sa.Column("activity_id", UUID, sa.ForeignKey("sales_activities.id")),
        sa.Column("content", sa.Text(), nullable=False),
        *_ts_cols(),
    )
    op.create_index("ix_account_notes_account_id", "account_notes", ["account_id"])

    # --- leads -----------------------------------------------------------------------------
    op.create_table(
        "leads",
        sa.Column("id", UUID, primary_key=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("organization", sa.String(200)),
        sa.Column("contact_name", sa.String(200)),
        sa.Column("email", sa.String(320)),
        sa.Column("phone", sa.String(40)),
        sa.Column("source", sa.String(80)),
        sa.Column("status", sa.String(30), nullable=False),
        sa.Column("territory", sa.String(120)),
        sa.Column("assigned_to_id", UUID, sa.ForeignKey("users.id")),
        sa.Column("created_by_id", UUID, sa.ForeignKey("users.id")),
        sa.Column("account_id", UUID, sa.ForeignKey("accounts.id")),
        sa.Column("contact_id", UUID, sa.ForeignKey("contacts.id")),
        sa.Column("opportunity_id", UUID, sa.ForeignKey("opportunities.id")),
        sa.Column("customer_need", sa.Text()),
        sa.Column("product_interest", sa.String(240)),
        sa.Column("decision_process", sa.Text()),
        sa.Column("expected_timeline", sa.String(120)),
        sa.Column("potential_value", sa.Numeric(14, 2)),
        sa.Column("qualification_notes", sa.Text()),
        sa.Column("next_action", sa.String(240)),
        sa.Column("follow_up_date", sa.Date()),
        sa.Column("disqualified_reason", sa.String(240)),
        sa.Column("qualified_at", TS),
        sa.Column("converted_at", TS),
        *_ts_cols(),
    )
    op.create_index("ix_leads_status", "leads", ["status"])
    op.create_index("ix_leads_territory", "leads", ["territory"])
    op.create_index("ix_leads_assigned_to_id", "leads", ["assigned_to_id"])
    op.create_index("ix_leads_account_id", "leads", ["account_id"])

    # --- targets ---------------------------------------------------------------------------
    op.create_table(
        "sales_targets",
        sa.Column("id", UUID, primary_key=True),
        sa.Column("user_id", UUID, sa.ForeignKey("users.id"), nullable=False),
        sa.Column("period_start", sa.Date(), nullable=False),
        sa.Column("amount", sa.Numeric(14, 2), nullable=False),
        sa.Column("set_by_id", UUID, sa.ForeignKey("users.id")),
        *_ts_cols(),
        sa.UniqueConstraint("user_id", "period_start", name="uq_sales_target_user_period"),
    )
    op.create_index("ix_sales_targets_user_id", "sales_targets", ["user_id"])

    # --- tasks -----------------------------------------------------------------------------
    op.add_column("tasks", sa.Column("kind", sa.String(30), nullable=False, server_default="task"))
    op.add_column("tasks", sa.Column("priority", sa.String(20), nullable=False, server_default="normal"))
    op.add_column("tasks", sa.Column("description", sa.Text()))
    op.add_column("tasks", sa.Column("created_by_id", UUID, sa.ForeignKey("users.id")))
    op.add_column("tasks", sa.Column("activity_id", UUID, sa.ForeignKey("sales_activities.id")))
    op.add_column("tasks", sa.Column("completed_at", TS))
    op.add_column("tasks", sa.Column("idempotency_key", sa.String(160)))
    op.create_unique_constraint("uq_tasks_creator_idem", "tasks", ["created_by_id", "idempotency_key"])


def downgrade() -> None:
    raise RuntimeError("0003_sales_workflows is forward-only; restore from backup instead of downgrading")
