"""Add phone login and encrypted owner-only SMS configuration without replacing existing data."""

import sqlalchemy as sa

from alembic import op

revision = "0008_phone_otp"
down_revision = "0007_analytics"
branch_labels = depends_on = None


def upgrade():
    op.add_column("admins", sa.Column("phone", sa.String(11)))
    op.create_unique_constraint("uq_admins_phone", "admins", ["phone"])
    op.create_check_constraint(
        "phone_normalized", "admins", "phone IS NULL OR phone ~ '^09[0-9]{9}$'"
    )
    op.alter_column("admins", "email", nullable=True)
    op.alter_column("admins", "password_hash", nullable=True)
    op.create_table(
        "admin_otps",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("admin_id", sa.Uuid(), sa.ForeignKey("admins.id", ondelete="RESTRICT")),
        sa.Column("binding_digest", sa.String(64), nullable=False),
        sa.Column("phone_digest", sa.String(64), nullable=False),
        sa.Column("code_digest", sa.String(64), nullable=False),
        sa.Column("purpose", sa.String(16), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("delivered", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("debug_code", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True)),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.CheckConstraint("purpose IN ('login','reauth')", name="purpose"),
        sa.CheckConstraint("attempts >= 0 AND attempts <= 5", name="attempts"),
    )
    op.create_index(
        "ix_admin_otps_binding", "admin_otps", ["binding_digest", "purpose", "created_at"]
    )
    op.create_index("ix_admin_otps_expires", "admin_otps", ["expires_at"])
    op.create_table(
        "sms_configuration",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("debug_mode", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("encrypted_username", sa.LargeBinary()),
        sa.Column("encrypted_password", sa.LargeBinary()),
        sa.Column("body_id", sa.Integer()),
        sa.Column("row_version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.CheckConstraint("id = 1", name="singleton"),
    )
    op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON admin_otps TO makan_api")
    op.execute("GRANT SELECT, INSERT, UPDATE ON sms_configuration TO makan_api")


def downgrade():
    raise RuntimeError("Destructive downgrade disabled; use a reviewed forward migration")
