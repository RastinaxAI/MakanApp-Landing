from datetime import datetime
from uuid import UUID

from sqlalchemy import (
    BigInteger,
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


class AdminSession(UUIDPrimaryKey, Timestamps, Base):
    __tablename__ = "admin_sessions"
    __table_args__ = (
        Index("ix_admin_sessions_admin_revoked", "admin_id", "revoked_at"),
        Index("ix_admin_sessions_expires", "expires_at"),
    )
    admin_id: Mapped[UUID] = mapped_column(ForeignKey("admins.id", ondelete="RESTRICT"))
    token_digest: Mapped[str] = mapped_column(String(64), unique=True)
    csrf_digest: Mapped[str] = mapped_column(String(64))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    idle_expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class AuthChallenge(UUIDPrimaryKey, Timestamps, Base):
    __tablename__ = "auth_challenges"
    __table_args__ = (Index("ix_auth_challenges_expires", "expires_at"),)
    token_digest: Mapped[str] = mapped_column(String(64), unique=True)
    csrf_digest: Mapped[str] = mapped_column(String(64))
    purpose: Mapped[str] = mapped_column(String(20), server_default="login")
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class RateLimitBucket(Base):
    __tablename__ = "rate_limit_buckets"
    __table_args__ = (
        CheckConstraint("count >= 0", name="count_nonnegative"),
        Index("ix_rate_limit_buckets_expires", "expires_at"),
    )
    scope: Mapped[str] = mapped_column(String(40), primary_key=True)
    subject_hmac: Mapped[str] = mapped_column(String(64), primary_key=True)
    window_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), primary_key=True)
    count: Mapped[int] = mapped_column(Integer)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class AdminMfa(Timestamps, Base):
    __tablename__ = "admin_mfa"
    admin_id: Mapped[UUID] = mapped_column(
        ForeignKey("admins.id", ondelete="RESTRICT"), primary_key=True
    )
    encrypted_totp_secret: Mapped[bytes] = mapped_column(LargeBinary)
    enabled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    pending_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_used_step: Mapped[int] = mapped_column(BigInteger, server_default="-1")


class AdminRecoveryCode(Base):
    __tablename__ = "admin_recovery_codes"
    admin_id: Mapped[UUID] = mapped_column(
        ForeignKey("admins.id", ondelete="RESTRICT"), primary_key=True
    )
    code_digest: Mapped[str] = mapped_column(String(64), primary_key=True)
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
