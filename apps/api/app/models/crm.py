"""Sales relationships extend the existing Lead; they do not replace requests."""

from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, Timestamps, UUIDPrimaryKey

STAGES = (
    "new",
    "contacted",
    "qualified",
    "demo_scheduled",
    "demo_completed",
    "proposal",
    "negotiation",
    "won",
    "lost",
)


class School(UUIDPrimaryKey, Timestamps, Base):
    __tablename__ = "crm_schools"
    __table_args__ = (CheckConstraint("students IS NULL OR students >= 0", name="students"),)
    name: Mapped[str | None] = mapped_column(String(180), index=True)
    city: Mapped[str] = mapped_column(String(100), default="")
    province: Mapped[str] = mapped_column(String(100), default="")
    students: Mapped[int | None] = mapped_column(Integer)
    interested_features: Mapped[list] = mapped_column(JSONB, default=list)
    version: Mapped[int] = mapped_column(Integer, default=1)
    last_activity_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    purged_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class Contact(UUIDPrimaryKey, Timestamps, Base):
    __tablename__ = "crm_contacts"
    __table_args__ = (Index("ix_crm_contacts_school_value", "school_id", "contact_value"),)
    school_id: Mapped[UUID] = mapped_column(ForeignKey("crm_schools.id", ondelete="RESTRICT"))
    source_lead_id: Mapped[UUID | None] = mapped_column(ForeignKey("leads.id", ondelete="RESTRICT"))
    full_name: Mapped[str | None] = mapped_column(String(120))
    contact_method: Mapped[str] = mapped_column(String(10))
    contact_value: Mapped[str | None] = mapped_column(String(254))
    job_title: Mapped[str] = mapped_column(String(100), default="")
    is_manager: Mapped[bool] = mapped_column(Boolean, default=False)
    version: Mapped[int] = mapped_column(Integer, default=1)
    last_activity_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    purged_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class LeadProfile(Base):
    __tablename__ = "crm_lead_profiles"
    lead_id: Mapped[UUID] = mapped_column(
        ForeignKey("leads.id", ondelete="RESTRICT"), primary_key=True
    )
    school_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("crm_schools.id", ondelete="RESTRICT"), index=True
    )
    tags: Mapped[list] = mapped_column(JSONB, default=list)
    qualification: Mapped[str] = mapped_column(Text, default="")
    converted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class Opportunity(UUIDPrimaryKey, Timestamps, Base):
    __tablename__ = "crm_opportunities"
    __table_args__ = (
        CheckConstraint(
            "stage IN ('new','contacted','qualified','demo_scheduled',"
            "'demo_completed','proposal','negotiation','won','lost')",
            name="stage",
        ),
        CheckConstraint("estimated_value >= 0", name="value"),
        CheckConstraint("stage != 'lost' OR length(lost_reason) >= 2", name="lost_reason"),
        Index("ix_crm_opportunities_stage_assignee", "stage", "assigned_to"),
    )
    lead_id: Mapped[UUID] = mapped_column(ForeignKey("leads.id", ondelete="RESTRICT"), index=True)
    school_id: Mapped[UUID] = mapped_column(
        ForeignKey("crm_schools.id", ondelete="RESTRICT"), index=True
    )
    title: Mapped[str] = mapped_column(String(180))
    stage: Mapped[str] = mapped_column(String(20), default="new")
    assigned_to: Mapped[UUID | None] = mapped_column(ForeignKey("admins.id", ondelete="RESTRICT"))
    estimated_value: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=0)
    expected_close_date: Mapped[date | None] = mapped_column(Date)
    lost_reason: Mapped[str] = mapped_column(Text, default="")
    notes: Mapped[str] = mapped_column(Text, default="")
    version: Mapped[int] = mapped_column(Integer, default=1)
    last_activity_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class StageHistory(UUIDPrimaryKey, Base):
    __tablename__ = "crm_stage_history"
    opportunity_id: Mapped[UUID] = mapped_column(
        ForeignKey("crm_opportunities.id", ondelete="RESTRICT"), index=True
    )
    actor_id: Mapped[UUID | None] = mapped_column(ForeignKey("admins.id", ondelete="RESTRICT"))
    from_stage: Mapped[str | None] = mapped_column(String(20))
    to_stage: Mapped[str] = mapped_column(String(20))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class Activity(UUIDPrimaryKey, Timestamps, Base):
    __tablename__ = "crm_activities"
    __table_args__ = (
        CheckConstraint("kind IN ('call','meeting','demo','task','note','followup')", name="kind"),
        CheckConstraint("status IN ('open','completed','canceled')", name="status"),
        Index("ix_crm_activities_due_status", "due_at", "status"),
    )
    lead_id: Mapped[UUID] = mapped_column(ForeignKey("leads.id", ondelete="RESTRICT"), index=True)
    opportunity_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("crm_opportunities.id", ondelete="RESTRICT")
    )
    kind: Mapped[str] = mapped_column(String(12))
    status: Mapped[str] = mapped_column(String(12), default="open")
    title: Mapped[str] = mapped_column(String(180))
    body: Mapped[str] = mapped_column(Text, default="")
    assigned_to: Mapped[UUID | None] = mapped_column(ForeignKey("admins.id", ondelete="RESTRICT"))
    due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    actor_id: Mapped[UUID] = mapped_column(ForeignKey("admins.id", ondelete="RESTRICT"))
    version: Mapped[int] = mapped_column(Integer, default=1)


class DemoSession(UUIDPrimaryKey, Timestamps, Base):
    __tablename__ = "crm_demos"
    __table_args__ = (
        CheckConstraint("ends_at > starts_at", name="interval"),
        CheckConstraint("status IN ('scheduled','completed','canceled','no_show')", name="status"),
        Index("ix_crm_demos_starts_status", "starts_at", "status"),
    )
    lead_id: Mapped[UUID] = mapped_column(ForeignKey("leads.id", ondelete="RESTRICT"), index=True)
    opportunity_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("crm_opportunities.id", ondelete="RESTRICT")
    )
    assigned_to: Mapped[UUID] = mapped_column(ForeignKey("admins.id", ondelete="RESTRICT"))
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String(12), default="scheduled")
    outcome: Mapped[str] = mapped_column(Text, default="")
    next_action: Mapped[str] = mapped_column(Text, default="")
    version: Mapped[int] = mapped_column(Integer, default=1)


class Notification(UUIDPrimaryKey, Timestamps, Base):
    __tablename__ = "crm_notifications"
    __table_args__ = (Index("ix_crm_notifications_recipient_read", "recipient_id", "read_at"),)
    recipient_id: Mapped[UUID] = mapped_column(ForeignKey("admins.id", ondelete="RESTRICT"))
    event_key: Mapped[str] = mapped_column(String(220), unique=True)
    kind: Mapped[str] = mapped_column(String(32))
    href: Mapped[str] = mapped_column(String(120))
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class SavedView(UUIDPrimaryKey, Timestamps, Base):
    __tablename__ = "crm_saved_views"
    admin_id: Mapped[UUID] = mapped_column(ForeignKey("admins.id", ondelete="RESTRICT"), index=True)
    name: Mapped[str] = mapped_column(String(100))
    filters: Mapped[dict] = mapped_column(JSONB)
    version: Mapped[int] = mapped_column(Integer, default=1)
