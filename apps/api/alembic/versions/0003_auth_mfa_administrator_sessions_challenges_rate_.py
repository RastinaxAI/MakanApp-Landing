"""Administrator sessions challenges rate limits and optional MFA

Revision ID: 0003_auth_mfa
Revises: 0002_page_revision_core
"""

import sqlalchemy as sa

from alembic import op

revision = "0003_auth_mfa"
down_revision = "0002_page_revision_core"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "auth_challenges",
        sa.Column("token_digest", sa.String(length=64), nullable=False),
        sa.Column("csrf_digest", sa.String(length=64), nullable=False),
        sa.Column("purpose", sa.String(length=20), server_default="login", nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_auth_challenges")),
        sa.UniqueConstraint("token_digest", name=op.f("uq_auth_challenges_token_digest")),
    )
    op.create_index("ix_auth_challenges_expires", "auth_challenges", ["expires_at"], unique=False)
    op.create_table(
        "rate_limit_buckets",
        sa.Column("scope", sa.String(length=40), nullable=False),
        sa.Column("subject_hmac", sa.String(length=64), nullable=False),
        sa.Column("window_start", sa.DateTime(timezone=True), nullable=False),
        sa.Column("count", sa.Integer(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("count >= 0", name=op.f("ck_rate_limit_buckets_count_nonnegative")),
        sa.PrimaryKeyConstraint(
            "scope", "subject_hmac", "window_start", name=op.f("pk_rate_limit_buckets")
        ),
    )
    op.create_index(
        "ix_rate_limit_buckets_expires", "rate_limit_buckets", ["expires_at"], unique=False
    )
    op.create_table(
        "admin_mfa",
        sa.Column("admin_id", sa.Uuid(), nullable=False),
        sa.Column("encrypted_totp_secret", sa.LargeBinary(), nullable=False),
        sa.Column("enabled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("pending_expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_used_step", sa.BigInteger(), server_default="-1", nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["admin_id"],
            ["admins.id"],
            name=op.f("fk_admin_mfa_admin_id_admins"),
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("admin_id", name=op.f("pk_admin_mfa")),
    )
    op.create_table(
        "admin_recovery_codes",
        sa.Column("admin_id", sa.Uuid(), nullable=False),
        sa.Column("code_digest", sa.String(length=64), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["admin_id"],
            ["admins.id"],
            name=op.f("fk_admin_recovery_codes_admin_id_admins"),
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("admin_id", "code_digest", name=op.f("pk_admin_recovery_codes")),
    )
    op.create_table(
        "admin_sessions",
        sa.Column("admin_id", sa.Uuid(), nullable=False),
        sa.Column("token_digest", sa.String(length=64), nullable=False),
        sa.Column("csrf_digest", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("idle_expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["admin_id"],
            ["admins.id"],
            name=op.f("fk_admin_sessions_admin_id_admins"),
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_admin_sessions")),
        sa.UniqueConstraint("token_digest", name=op.f("uq_admin_sessions_token_digest")),
    )
    op.create_index(
        "ix_admin_sessions_admin_revoked",
        "admin_sessions",
        ["admin_id", "revoked_at"],
        unique=False,
    )
    op.create_index("ix_admin_sessions_expires", "admin_sessions", ["expires_at"], unique=False)

    op.execute(
        "GRANT SELECT, INSERT, UPDATE, DELETE ON admin_sessions, auth_challenges, "
        "rate_limit_buckets, admin_mfa, admin_recovery_codes TO makan_api"
    )


def downgrade() -> None:
    raise RuntimeError("Destructive downgrade is disabled; use a reviewed forward migration")
