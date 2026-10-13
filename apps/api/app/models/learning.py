from datetime import datetime
from uuid import UUID

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, Timestamps, UUIDPrimaryKey


class LearningCategory(UUIDPrimaryKey, Timestamps, Base):
    __tablename__ = "learning_categories"
    __table_args__ = (
        UniqueConstraint("domain", "slug"),
        CheckConstraint("domain IN ('learn','blog')", name="domain"),
        CheckConstraint("sort_order >= 0", name="sort_positive"),
    )
    slug: Mapped[str] = mapped_column(String(160))
    title: Mapped[str] = mapped_column(String(180))
    domain: Mapped[str] = mapped_column(String(10))
    sort_order: Mapped[int] = mapped_column(Integer, server_default="0")


class LearningTag(UUIDPrimaryKey, Timestamps, Base):
    __tablename__ = "learning_tags"
    __table_args__ = (
        UniqueConstraint("domain", "slug"),
        CheckConstraint("domain IN ('learn','blog')", name="domain"),
        CheckConstraint("sort_order >= 0", name="sort_positive"),
    )
    slug: Mapped[str] = mapped_column(String(160))
    title: Mapped[str] = mapped_column(String(180))
    domain: Mapped[str] = mapped_column(String(10))
    sort_order: Mapped[int] = mapped_column(Integer, server_default="0")


class RevisionCategory(Base):
    __tablename__ = "learning_revision_categories"
    revision_id: Mapped[UUID] = mapped_column(
        ForeignKey("page_revisions.id", ondelete="RESTRICT"), primary_key=True
    )
    category_id: Mapped[UUID] = mapped_column(
        ForeignKey("learning_categories.id", ondelete="RESTRICT"), primary_key=True
    )


class RevisionTag(Base):
    __tablename__ = "learning_revision_tags"
    revision_id: Mapped[UUID] = mapped_column(
        ForeignKey("page_revisions.id", ondelete="RESTRICT"), primary_key=True
    )
    tag_id: Mapped[UUID] = mapped_column(
        ForeignKey("learning_tags.id", ondelete="RESTRICT"), primary_key=True
    )


class RevisionRelation(Base):
    __tablename__ = "learning_revision_relations"
    revision_id: Mapped[UUID] = mapped_column(
        ForeignKey("page_revisions.id", ondelete="RESTRICT"), primary_key=True
    )
    content_id: Mapped[UUID] = mapped_column(
        ForeignKey("pages.id", ondelete="RESTRICT"), primary_key=True
    )


class SeriesItem(Base):
    __tablename__ = "learning_series_items"
    __table_args__ = (
        UniqueConstraint("revision_id", "position"),
        CheckConstraint("position >= 0", name="position_positive"),
    )
    revision_id: Mapped[UUID] = mapped_column(
        ForeignKey("page_revisions.id", ondelete="RESTRICT"), primary_key=True
    )
    content_id: Mapped[UUID] = mapped_column(
        ForeignKey("pages.id", ondelete="RESTRICT"), primary_key=True
    )
    position: Mapped[int] = mapped_column(Integer)


class LearningView(Base):
    __tablename__ = "learning_views"
    __table_args__ = (Index("ix_learning_views_expiry", "expires_at"),)
    content_id: Mapped[UUID] = mapped_column(
        ForeignKey("pages.id", ondelete="RESTRICT"), primary_key=True
    )
    viewer_digest: Mapped[str] = mapped_column(String(64), primary_key=True)
    day: Mapped[str] = mapped_column(String(10), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class LearningStats(Base):
    __tablename__ = "learning_stats"
    __table_args__ = (CheckConstraint("qualified_views >= 0", name="views_positive"),)
    content_id: Mapped[UUID] = mapped_column(
        ForeignKey("pages.id", ondelete="RESTRICT"), primary_key=True
    )
    qualified_views: Mapped[int] = mapped_column(Integer, server_default="0")
