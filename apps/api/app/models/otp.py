from datetime import datetime
from uuid import UUID

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    LargeBinary,
    String,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, Timestamps, UUIDPrimaryKey


class AdminOtp(UUIDPrimaryKey, Timestamps, Base):
    __tablename__ = "admin_otps"
    __table_args__ = (
        CheckConstraint("purpose IN ('login','reauth')", name="purpose"),
        CheckConstraint("attempts >= 0 AND attempts <= 5", name="attempts"),
        Index("ix_admin_otps_binding", "binding_digest", "purpose", "created_at"),
        Index("ix_admin_otps_expires", "expires_at"),
    )
    admin_id: Mapped[UUID | None] = mapped_column(ForeignKey("admins.id", ondelete="RESTRICT"))
    binding_digest: Mapped[str] = mapped_column(String(64))
    phone_digest: Mapped[str] = mapped_column(String(64))
    code_digest: Mapped[str] = mapped_column(String(64))
    purpose: Mapped[str] = mapped_column(String(16))
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    delivered: Mapped[bool] = mapped_column(Boolean, default=False)
    debug_code: Mapped[bool] = mapped_column(Boolean, default=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class SmsConfiguration(Timestamps, Base):
    __tablename__ = "sms_configuration"
    __table_args__ = (CheckConstraint("id = 1", name="singleton"),)
    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    debug_mode: Mapped[bool] = mapped_column(Boolean, default=False)
    encrypted_username: Mapped[bytes | None] = mapped_column(LargeBinary)
    encrypted_password: Mapped[bytes | None] = mapped_column(LargeBinary)
    body_id: Mapped[int | None] = mapped_column(Integer)
    row_version: Mapped[int] = mapped_column(Integer, default=1)
