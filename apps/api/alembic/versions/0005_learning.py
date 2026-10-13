"""Versioned library, relational taxonomy/series and qualified views.

Revision ID: 0005_learning
Revises: 0004_cms
"""

import sqlalchemy as sa

from alembic import op

revision = "0005_learning"
down_revision = "0004_cms"
branch_labels = None
depends_on = None


def upgrade():
    for table in ("learning_categories", "learning_tags"):
        op.create_table(
            table,
            sa.Column("id", sa.Uuid(), primary_key=True),
            sa.Column("slug", sa.String(160), nullable=False),
            sa.Column("title", sa.String(180), nullable=False),
            sa.Column("domain", sa.String(10), nullable=False),
            sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                nullable=False,
                server_default=sa.func.now(),
            ),
            sa.Column(
                "updated_at",
                sa.DateTime(timezone=True),
                nullable=False,
                server_default=sa.func.now(),
            ),
            sa.UniqueConstraint("domain", "slug"),
            sa.CheckConstraint("domain IN ('learn','blog')", name="domain"),
            sa.CheckConstraint("sort_order >= 0", name="sort_positive"),
        )
    for table, key, target in (
        ("learning_revision_categories", "category_id", "learning_categories"),
        ("learning_revision_tags", "tag_id", "learning_tags"),
        ("learning_revision_relations", "content_id", "pages"),
    ):
        op.create_table(
            table,
            sa.Column(
                "revision_id",
                sa.Uuid(),
                sa.ForeignKey("page_revisions.id", ondelete="RESTRICT"),
                primary_key=True,
            ),
            sa.Column(
                key, sa.Uuid(), sa.ForeignKey(f"{target}.id", ondelete="RESTRICT"), primary_key=True
            ),
        )
    op.create_table(
        "learning_series_items",
        sa.Column(
            "revision_id",
            sa.Uuid(),
            sa.ForeignKey("page_revisions.id", ondelete="RESTRICT"),
            primary_key=True,
        ),
        sa.Column(
            "content_id",
            sa.Uuid(),
            sa.ForeignKey("pages.id", ondelete="RESTRICT"),
            primary_key=True,
        ),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.UniqueConstraint("revision_id", "position"),
        sa.CheckConstraint("position >= 0", name="position_positive"),
    )
    op.create_table(
        "learning_views",
        sa.Column(
            "content_id",
            sa.Uuid(),
            sa.ForeignKey("pages.id", ondelete="RESTRICT"),
            primary_key=True,
        ),
        sa.Column("viewer_digest", sa.String(64), primary_key=True),
        sa.Column("day", sa.String(10), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_learning_views_expiry", "learning_views", ["expires_at"])
    op.create_table(
        "learning_stats",
        sa.Column(
            "content_id",
            sa.Uuid(),
            sa.ForeignKey("pages.id", ondelete="RESTRICT"),
            primary_key=True,
        ),
        sa.Column("qualified_views", sa.Integer(), nullable=False, server_default="0"),
        sa.CheckConstraint("qualified_views >= 0", name="views_positive"),
    )
    op.execute(
        "CREATE UNIQUE INDEX uq_learning_slug ON pages ((split_part(slug, ':', 2))) "
        "WHERE page_type IN ('article','video')"
    )
    op.execute(
        "GRANT SELECT, INSERT, UPDATE, DELETE ON learning_categories, learning_tags, "
        "learning_revision_categories, learning_revision_tags, learning_revision_relations, "
        "learning_series_items, learning_views, learning_stats TO makan_api"
    )


def downgrade():
    raise RuntimeError("Destructive downgrade is disabled; use a reviewed forward migration")
