"""Durable public requests, idempotency receipts, CRM notes and history.

Revision ID: 0006_leads
Revises: 0005_learning
"""

import sqlalchemy as sa

from alembic import op

revision = "0006_leads"
down_revision = "0005_learning"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "leads",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("reference_id", sa.String(40), nullable=False, unique=True),
        sa.Column("kind", sa.String(10), nullable=False),
        sa.Column("full_name", sa.String(120)),
        sa.Column("contact_method", sa.String(10), nullable=False),
        sa.Column("contact_value", sa.String(254)),
        sa.Column("details", sa.dialects.postgresql.JSONB(), nullable=False),
        sa.Column("source", sa.String(20), nullable=False),
        sa.Column("consent_version", sa.String(32), nullable=False),
        sa.Column("consent_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.String(16), nullable=False, server_default="new"),
        sa.Column("outcome", sa.String(16)),
        sa.Column("assigned_to", sa.Uuid(), sa.ForeignKey("admins.id", ondelete="RESTRICT")),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("fingerprint", sa.String(64)),
        sa.Column("last_activity_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("purged_at", sa.DateTime(timezone=True)),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.CheckConstraint("kind IN ('demo','contact')", name="kind"),
        sa.CheckConstraint("contact_method IN ('phone','email')", name="contact_method"),
        sa.CheckConstraint("kind != 'demo' OR contact_method = 'phone'", name="demo_phone"),
        sa.CheckConstraint("status IN ('new','contacted','qualified','closed')", name="status"),
        sa.CheckConstraint(
            "(status = 'closed' AND outcome IS NOT NULL AND "
            "outcome IN ('won','lost','no_response','duplicate','resolved')) "
            "OR (status != 'closed' AND outcome IS NULL)",
            name="closed_outcome",
        ),
        sa.CheckConstraint(
            "kind = 'demo' OR outcome IS NULL OR outcome != 'won'", name="contract_demo"
        ),
        sa.CheckConstraint(
            "purged_at IS NOT NULL OR (full_name IS NOT NULL AND contact_value IS NOT NULL)",
            name="personal_data",
        ),
        sa.CheckConstraint("version >= 1", name="version"),
    )
    for name, columns in (
        ("status_created", ["status", "created_at"]),
        ("kind_created", ["kind", "created_at"]),
        ("fingerprint_created", ["fingerprint", "created_at"]),
    ):
        op.create_index("ix_leads_" + name, "leads", columns)
    op.create_index(
        "ix_leads_retention",
        "leads",
        ["last_activity_at"],
        postgresql_where=sa.text("purged_at IS NULL"),
    )
    op.create_table(
        "lead_receipts",
        sa.Column("key_digest", sa.String(64), primary_key=True),
        sa.Column("body_digest", sa.String(64), nullable=False),
        sa.Column(
            "lead_id", sa.Uuid(), sa.ForeignKey("leads.id", ondelete="RESTRICT"), nullable=False
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_lead_receipts_expiry", "lead_receipts", ["expires_at"])
    op.create_table(
        "lead_notes",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "lead_id", sa.Uuid(), sa.ForeignKey("leads.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column(
            "actor_id", sa.Uuid(), sa.ForeignKey("admins.id", ondelete="RESTRICT"), nullable=False
        ),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_lead_notes_lead_created", "lead_notes", ["lead_id", "created_at"])
    op.create_table(
        "lead_status_history",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "lead_id", sa.Uuid(), sa.ForeignKey("leads.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("actor_id", sa.Uuid(), sa.ForeignKey("admins.id", ondelete="RESTRICT")),
        sa.Column("changes", sa.dialects.postgresql.JSONB(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index(
        "ix_lead_history_lead_created", "lead_status_history", ["lead_id", "created_at"]
    )
    op.execute("GRANT SELECT, INSERT, UPDATE ON leads TO makan_api")
    # PostgreSQL row locks in receipt cleanup require UPDATE, even without changing its body.
    op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON lead_receipts TO makan_api")
    op.execute("GRANT SELECT, INSERT, DELETE ON lead_notes TO makan_api")
    op.execute("GRANT SELECT, INSERT ON lead_status_history TO makan_api")


def downgrade():
    raise RuntimeError("Destructive downgrade is disabled; use a reviewed forward migration")
