"""Page identity and revision ownership constraints; CMS routes come in STEP6."""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0002_page_revision_core"
down_revision = "0001_admin_core"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "pages",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("slug", sa.String(180), nullable=False),
        sa.Column("page_type", sa.String(40), nullable=False),
        sa.Column("working_revision_id", sa.Uuid()),
        sa.Column("published_revision_id", sa.Uuid()),
        sa.Column("scheduled_revision_id", sa.Uuid()),
        sa.Column("scheduled_at", sa.DateTime(timezone=True)),
        sa.Column("is_archived", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("row_version", sa.Integer(), server_default=sa.text("1"), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.PrimaryKeyConstraint("id", name="pk_pages"),
        sa.UniqueConstraint("slug", name="uq_pages_slug"),
        sa.CheckConstraint("length(slug) > 0", name="ck_pages_slug_nonempty"),
        sa.CheckConstraint("row_version >= 1", name="ck_pages_row_version_positive"),
        sa.CheckConstraint(
            "(scheduled_revision_id IS NULL) = (scheduled_at IS NULL)",
            name="ck_pages_schedule_pair",
        ),
    )
    op.create_index("ix_pages_archived_schedule", "pages", ["is_archived", "scheduled_at", "id"])
    op.create_table(
        "page_revisions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("page_id", sa.Uuid(), nullable=False),
        sa.Column("revision_no", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(180), nullable=False),
        sa.Column(
            "seo_json", postgresql.JSONB(), server_default=sa.text("'{}'::jsonb"), nullable=False
        ),
        sa.Column("indexable", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("published_at", sa.DateTime(timezone=True)),
        sa.Column("reviewed_at", sa.DateTime(timezone=True)),
        sa.Column("created_by", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.PrimaryKeyConstraint("id", name="pk_page_revisions"),
        sa.UniqueConstraint("page_id", "revision_no", name="uq_page_revisions_page_id"),
        sa.UniqueConstraint("page_id", "id", name="uq_page_revisions_page_id_id"),
        sa.CheckConstraint("revision_no >= 1", name="ck_page_revisions_revision_no_positive"),
        sa.ForeignKeyConstraint(
            ["page_id"], ["pages.id"], ondelete="RESTRICT", name="fk_page_revisions_page_id_pages"
        ),
        sa.ForeignKeyConstraint(
            ["created_by"],
            ["admins.id"],
            ondelete="RESTRICT",
            name="fk_page_revisions_created_by_admins",
        ),
    )
    op.create_index("ix_page_revisions_published", "page_revisions", ["published_at", "id"])
    for kind in ("working", "published", "scheduled"):
        op.create_foreign_key(
            f"fk_pages_{kind}_revision",
            "pages",
            "page_revisions",
            ["id", f"{kind}_revision_id"],
            ["page_id", "id"],
            ondelete="RESTRICT",
        )
    op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON pages, page_revisions TO makan_api")


def downgrade() -> None:
    raise RuntimeError("Destructive downgrade is disabled; use a reviewed forward migration")
