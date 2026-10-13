from datetime import datetime
from uuid import UUID

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, Timestamps, UUIDPrimaryKey


class Lead(UUIDPrimaryKey, Timestamps, Base):
    __tablename__ = "leads"
    __table_args__ = (
        CheckConstraint("kind IN ('demo','contact')", name="kind"),
        CheckConstraint("contact_method IN ('phone','email')", name="contact_method"),
        CheckConstraint("kind != 'demo' OR contact_method = 'phone'", name="demo_phone"),
        CheckConstraint("status IN ('new','contacted','qualified','closed')", name="status"),
        CheckConstraint(
            "(status = 'closed' AND outcome IS NOT NULL AND "
            "outcome IN ('won','lost','no_response','duplicate','resolved')) "
            "OR (status != 'closed' AND outcome IS NULL)",
            name="closed_outcome",
        ),
        CheckConstraint(
            "kind = 'demo' OR outcome IS NULL OR outcome != 'won'", name="contract_demo"
        ),
        CheckConstraint(
            "purged_at IS NOT NULL OR (full_name IS NOT NULL AND contact_value IS NOT NULL)",
            name="personal_data",
        ),
        CheckConstraint("version >= 1", name="version"),
        Index("ix_leads_status_created", "status", "created_at"),
        Index("ix_leads_kind_created", "kind", "created_at"),
        Index("ix_leads_retention", "last_activity_at", postgresql_where="purged_at IS NULL"),
        Index("ix_leads_fingerprint_created", "fingerprint", "created_at"),
    )
    reference_id: Mapped[str] = mapped_column(String(40), unique=True)
    kind: Mapped[str] = mapped_column(String(10))
    full_name: Mapped[str | None] = mapped_column(String(120))
    contact_method: Mapped[str] = mapped_column(String(10))
    contact_value: Mapped[str | None] = mapped_column(String(254))
    details: Mapped[dict] = mapped_column(JSONB)
    source: Mapped[str] = mapped_column(String(20))
    consent_version: Mapped[str] = mapped_column(String(32))
    consent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String(16), default="new", server_default="new")
    outcome: Mapped[str | None] = mapped_column(String(16))
    assigned_to: Mapped[UUID | None] = mapped_column(ForeignKey("admins.id", ondelete="RESTRICT"))
    version: Mapped[int] = mapped_column(Integer, default=1, server_default="1")
    fingerprint: Mapped[str | None] = mapped_column(String(64))
    last_activity_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    purged_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class LeadReceipt(Base):
    __tablename__ = "lead_receipts"
    __table_args__ = (Index("ix_lead_receipts_expiry", "expires_at"),)
    key_digest: Mapped[str] = mapped_column(String(64), primary_key=True)
    body_digest: Mapped[str] = mapped_column(String(64))
    lead_id: Mapped[UUID] = mapped_column(ForeignKey("leads.id", ondelete="RESTRICT"))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class LeadNote(UUIDPrimaryKey, Base):
    __tablename__ = "lead_notes"
    __table_args__ = (Index("ix_lead_notes_lead_created", "lead_id", "created_at"),)
    lead_id: Mapped[UUID] = mapped_column(ForeignKey("leads.id", ondelete="CASCADE"))
    actor_id: Mapped[UUID] = mapped_column(ForeignKey("admins.id", ondelete="RESTRICT"))
    body: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class LeadHistory(UUIDPrimaryKey, Base):
    __tablename__ = "lead_status_history"
    __table_args__ = (Index("ix_lead_history_lead_created", "lead_id", "created_at"),)
    lead_id: Mapped[UUID] = mapped_column(ForeignKey("leads.id", ondelete="CASCADE"))
    actor_id: Mapped[UUID | None] = mapped_column(ForeignKey("admins.id", ondelete="RESTRICT"))
    changes: Mapped[dict] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
