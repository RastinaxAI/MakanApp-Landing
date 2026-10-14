"""Add sales relationships without changing or removing any existing Lead."""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0009_demo_crm"
down_revision = "0008_phone_otp"
branch_labels = depends_on = None


def upgrade():
    op.create_table(
        "crm_schools",
        sa.Column("name", sa.String(180), nullable=True),
        sa.Column("city", sa.String(100), nullable=False),
        sa.Column("province", sa.String(100), nullable=False),
        sa.Column("students", sa.Integer(), nullable=True),
        sa.Column("interested_features", postgresql.JSONB(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("last_activity_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("purged_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.CheckConstraint(
            "students IS NULL OR students >= 0", name=op.f("ck_crm_schools_students")
        ),
    )
    op.create_index("ix_crm_schools_name", "crm_schools", ["name"], unique=False)
    op.execute("GRANT SELECT, INSERT, UPDATE ON crm_schools TO makan_api")
    op.create_table(
        "crm_notifications",
        sa.Column(
            "recipient_id",
            sa.Uuid(),
            sa.ForeignKey("admins.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("event_key", sa.String(220), nullable=False, unique=True),
        sa.Column("kind", sa.String(32), nullable=False),
        sa.Column("href", sa.String(120), nullable=False),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
    )
    op.create_index(
        "ix_crm_notifications_recipient_read",
        "crm_notifications",
        ["recipient_id", "read_at"],
        unique=False,
    )
    op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON crm_notifications TO makan_api")
    op.create_table(
        "crm_saved_views",
        sa.Column(
            "admin_id", sa.Uuid(), sa.ForeignKey("admins.id", ondelete="RESTRICT"), nullable=False
        ),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("filters", postgresql.JSONB(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
    )
    op.create_index("ix_crm_saved_views_admin_id", "crm_saved_views", ["admin_id"], unique=False)
    op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON crm_saved_views TO makan_api")
    op.create_table(
        "crm_contacts",
        sa.Column(
            "school_id",
            sa.Uuid(),
            sa.ForeignKey("crm_schools.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "source_lead_id",
            sa.Uuid(),
            sa.ForeignKey("leads.id", ondelete="RESTRICT"),
            nullable=True,
        ),
        sa.Column("full_name", sa.String(120), nullable=True),
        sa.Column("contact_method", sa.String(10), nullable=False),
        sa.Column("contact_value", sa.String(254), nullable=True),
        sa.Column("job_title", sa.String(100), nullable=False),
        sa.Column("is_manager", sa.Boolean(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("last_activity_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("purged_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
    )
    op.create_index(
        "ix_crm_contacts_school_value", "crm_contacts", ["school_id", "contact_value"], unique=False
    )
    op.execute("GRANT SELECT, INSERT, UPDATE ON crm_contacts TO makan_api")
    op.create_table(
        "crm_lead_profiles",
        sa.Column(
            "lead_id", sa.Uuid(), sa.ForeignKey("leads.id", ondelete="RESTRICT"), primary_key=True
        ),
        sa.Column(
            "school_id",
            sa.Uuid(),
            sa.ForeignKey("crm_schools.id", ondelete="RESTRICT"),
            nullable=True,
        ),
        sa.Column("tags", postgresql.JSONB(), nullable=False),
        sa.Column("qualification", sa.Text(), nullable=False),
        sa.Column("converted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "ix_crm_lead_profiles_school_id", "crm_lead_profiles", ["school_id"], unique=False
    )
    op.execute("GRANT SELECT, INSERT, UPDATE ON crm_lead_profiles TO makan_api")
    op.create_table(
        "crm_opportunities",
        sa.Column(
            "lead_id", sa.Uuid(), sa.ForeignKey("leads.id", ondelete="RESTRICT"), nullable=False
        ),
        sa.Column(
            "school_id",
            sa.Uuid(),
            sa.ForeignKey("crm_schools.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("title", sa.String(180), nullable=False),
        sa.Column("stage", sa.String(20), nullable=False),
        sa.Column(
            "assigned_to", sa.Uuid(), sa.ForeignKey("admins.id", ondelete="RESTRICT"), nullable=True
        ),
        sa.Column("estimated_value", sa.Numeric(18, 2), nullable=False),
        sa.Column("expected_close_date", sa.Date(), nullable=True),
        sa.Column("lost_reason", sa.Text(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("last_activity_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.CheckConstraint(
            "stage IN ('new','contacted','qualified','demo_scheduled',"
            "'demo_completed','proposal','negotiation','won','lost')",
            name=op.f("ck_crm_opportunities_stage"),
        ),
        sa.CheckConstraint("estimated_value >= 0", name=op.f("ck_crm_opportunities_value")),
        sa.CheckConstraint(
            "stage != 'lost' OR length(lost_reason) >= 2",
            name=op.f("ck_crm_opportunities_lost_reason"),
        ),
    )
    op.create_index("ix_crm_opportunities_lead_id", "crm_opportunities", ["lead_id"], unique=False)
    op.create_index(
        "ix_crm_opportunities_school_id", "crm_opportunities", ["school_id"], unique=False
    )
    op.create_index(
        "ix_crm_opportunities_stage_assignee",
        "crm_opportunities",
        ["stage", "assigned_to"],
        unique=False,
    )
    op.execute("GRANT SELECT, INSERT, UPDATE ON crm_opportunities TO makan_api")
    op.create_table(
        "crm_activities",
        sa.Column(
            "lead_id", sa.Uuid(), sa.ForeignKey("leads.id", ondelete="RESTRICT"), nullable=False
        ),
        sa.Column(
            "opportunity_id",
            sa.Uuid(),
            sa.ForeignKey("crm_opportunities.id", ondelete="RESTRICT"),
            nullable=True,
        ),
        sa.Column("kind", sa.String(12), nullable=False),
        sa.Column("status", sa.String(12), nullable=False),
        sa.Column("title", sa.String(180), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column(
            "assigned_to", sa.Uuid(), sa.ForeignKey("admins.id", ondelete="RESTRICT"), nullable=True
        ),
        sa.Column("due_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "actor_id", sa.Uuid(), sa.ForeignKey("admins.id", ondelete="RESTRICT"), nullable=False
        ),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.CheckConstraint(
            "status IN ('open','completed','canceled')", name=op.f("ck_crm_activities_status")
        ),
        sa.CheckConstraint(
            "kind IN ('call','meeting','demo','task','note','followup')",
            name=op.f("ck_crm_activities_kind"),
        ),
    )
    op.create_index(
        "ix_crm_activities_due_status", "crm_activities", ["due_at", "status"], unique=False
    )
    op.create_index("ix_crm_activities_lead_id", "crm_activities", ["lead_id"], unique=False)
    op.execute("GRANT SELECT, INSERT, UPDATE ON crm_activities TO makan_api")
    op.create_table(
        "crm_demos",
        sa.Column(
            "lead_id", sa.Uuid(), sa.ForeignKey("leads.id", ondelete="RESTRICT"), nullable=False
        ),
        sa.Column(
            "opportunity_id",
            sa.Uuid(),
            sa.ForeignKey("crm_opportunities.id", ondelete="RESTRICT"),
            nullable=True,
        ),
        sa.Column(
            "assigned_to",
            sa.Uuid(),
            sa.ForeignKey("admins.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.String(12), nullable=False),
        sa.Column("outcome", sa.Text(), nullable=False),
        sa.Column("next_action", sa.Text(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.CheckConstraint(
            "status IN ('scheduled','completed','canceled','no_show')",
            name=op.f("ck_crm_demos_status"),
        ),
        sa.CheckConstraint("ends_at > starts_at", name=op.f("ck_crm_demos_interval")),
    )
    op.create_index("ix_crm_demos_lead_id", "crm_demos", ["lead_id"], unique=False)
    op.create_index(
        "ix_crm_demos_starts_status", "crm_demos", ["starts_at", "status"], unique=False
    )
    op.execute("GRANT SELECT, INSERT, UPDATE ON crm_demos TO makan_api")
    op.create_table(
        "crm_stage_history",
        sa.Column(
            "opportunity_id",
            sa.Uuid(),
            sa.ForeignKey("crm_opportunities.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "actor_id", sa.Uuid(), sa.ForeignKey("admins.id", ondelete="RESTRICT"), nullable=True
        ),
        sa.Column("from_stage", sa.String(20), nullable=True),
        sa.Column("to_stage", sa.String(20), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column("id", sa.Uuid(), primary_key=True),
    )
    op.create_index(
        "ix_crm_stage_history_opportunity_id", "crm_stage_history", ["opportunity_id"], unique=False
    )
    op.execute("GRANT SELECT, INSERT ON crm_stage_history TO makan_api")


def downgrade():
    raise RuntimeError(
        "Destructive downgrade disabled; deploy a compatible renderer "
        "and reviewed forward migration"
    )
