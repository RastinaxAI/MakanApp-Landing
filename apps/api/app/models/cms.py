from uuid import UUID

from sqlalchemy import BigInteger, CheckConstraint, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, Timestamps, UUIDPrimaryKey


class FaqCategory(UUIDPrimaryKey, Timestamps, Base):
    __tablename__ = "faq_categories"
    __table_args__ = (CheckConstraint("sort_order >= 0", name="sort_positive"),)
    slug: Mapped[str] = mapped_column(String(160), unique=True)
    title: Mapped[str] = mapped_column(String(180))
    sort_order: Mapped[int] = mapped_column(Integer, server_default="0")


class PageSection(UUIDPrimaryKey, Base):
    __tablename__ = "page_sections"
    __table_args__ = (
        UniqueConstraint("revision_id", "sort_order"),
        CheckConstraint("sort_order >= 0", name="sort_positive"),
        CheckConstraint("schema_version = 1", name="supported_schema"),
    )
    revision_id: Mapped[UUID] = mapped_column(ForeignKey("page_revisions.id", ondelete="RESTRICT"))
    type: Mapped[str] = mapped_column(String(40))
    schema_version: Mapped[int] = mapped_column(Integer, server_default="1")
    sort_order: Mapped[int] = mapped_column(Integer)
    content_json: Mapped[dict] = mapped_column(JSONB)


class MediaAsset(UUIDPrimaryKey, Timestamps, Base):
    __tablename__ = "media_assets"
    __table_args__ = (
        CheckConstraint("size_bytes > 0 AND width > 0 AND height > 0", name="positive_dimensions"),
        CheckConstraint("visibility IN ('private','public')", name="visibility"),
    )
    storage_key: Mapped[str] = mapped_column(String(80), unique=True)
    original_filename: Mapped[str] = mapped_column(String(180))
    mime_type: Mapped[str] = mapped_column(String(80))
    size_bytes: Mapped[int] = mapped_column(BigInteger)
    width: Mapped[int] = mapped_column(Integer)
    height: Mapped[int] = mapped_column(Integer)
    checksum_sha256: Mapped[str] = mapped_column(String(64))
    alt_text: Mapped[str] = mapped_column(String(500))
    visibility: Mapped[str] = mapped_column(String(10), server_default="private")
    created_by: Mapped[UUID] = mapped_column(ForeignKey("admins.id", ondelete="RESTRICT"))


class RevisionMediaRef(Base):
    __tablename__ = "revision_media_refs"
    revision_id: Mapped[UUID] = mapped_column(
        ForeignKey("page_revisions.id", ondelete="RESTRICT"), primary_key=True
    )
    media_id: Mapped[UUID] = mapped_column(
        ForeignKey("media_assets.id", ondelete="RESTRICT"), primary_key=True
    )


class SiteSetting(Timestamps, Base):
    __tablename__ = "site_settings"
    key: Mapped[str] = mapped_column(String(40), primary_key=True)
    value_json: Mapped[dict] = mapped_column(JSONB)
    schema_version: Mapped[int] = mapped_column(Integer, server_default="1")
    row_version: Mapped[int] = mapped_column(Integer, server_default="1")
    updated_by: Mapped[UUID | None] = mapped_column(ForeignKey("admins.id", ondelete="RESTRICT"))


class SettingMediaRef(Base):
    __tablename__ = "setting_media_refs"
    setting_key: Mapped[str] = mapped_column(
        ForeignKey("site_settings.key", ondelete="RESTRICT"), primary_key=True
    )
    media_id: Mapped[UUID] = mapped_column(
        ForeignKey("media_assets.id", ondelete="RESTRICT"), primary_key=True
    )
