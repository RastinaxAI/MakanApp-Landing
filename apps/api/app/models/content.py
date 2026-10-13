from datetime import datetime
from uuid import UUID

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Integer,
    String,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, Timestamps, UUIDPrimaryKey


class Page(UUIDPrimaryKey, Timestamps, Base):
    __tablename__ = "pages"
    __table_args__ = (
        CheckConstraint("length(slug) > 0", name="slug_nonempty"),
        CheckConstraint("row_version >= 1", name="row_version_positive"),
        CheckConstraint(
            "(scheduled_revision_id IS NULL) = (scheduled_at IS NULL)", name="schedule_pair"
        ),
        Index("ix_pages_archived_schedule", "is_archived", "scheduled_at", "id"),
        Index(
            "uq_learning_slug",
            text("split_part(slug, ':', 2)"),
            unique=True,
            postgresql_where=text("page_type IN ('article','video')"),
        ),
        *(
            ForeignKeyConstraint(
                ["id", f"{kind}_revision_id"],
                ["page_revisions.page_id", "page_revisions.id"],
                name=f"fk_pages_{kind}_revision",
                use_alter=True,
                ondelete="RESTRICT",
            )
            for kind in ("working", "published", "scheduled")
        ),
    )
    slug: Mapped[str] = mapped_column(String(180), unique=True)
    page_type: Mapped[str] = mapped_column(String(40))
    working_revision_id: Mapped[UUID | None]
    published_revision_id: Mapped[UUID | None]
    scheduled_revision_id: Mapped[UUID | None]
    scheduled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    is_archived: Mapped[bool] = mapped_column(Boolean, server_default="false")
    row_version: Mapped[int] = mapped_column(Integer, server_default="1")


class PageRevision(UUIDPrimaryKey, Timestamps, Base):
    __tablename__ = "page_revisions"
    __table_args__ = (
        UniqueConstraint("page_id", "revision_no"),
        UniqueConstraint("page_id", "id", name="uq_page_revisions_page_id_id"),
        CheckConstraint("revision_no >= 1", name="revision_no_positive"),
        Index("ix_page_revisions_published", "published_at", "id"),
    )
    page_id: Mapped[UUID] = mapped_column(ForeignKey("pages.id", ondelete="RESTRICT"))
    revision_no: Mapped[int] = mapped_column(Integer)
    title: Mapped[str] = mapped_column(String(180))
    seo_json: Mapped[dict] = mapped_column(JSONB, server_default="{}")
    indexable: Mapped[bool] = mapped_column(Boolean, server_default="true")
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_by: Mapped[UUID | None] = mapped_column(ForeignKey("admins.id", ondelete="RESTRICT"))
    content_json: Mapped[dict] = mapped_column(JSONB, server_default="{}")
    category_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("faq_categories.id", ondelete="RESTRICT")
    )
