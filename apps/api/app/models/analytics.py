from datetime import date, datetime
from uuid import UUID

from sqlalchemy import CheckConstraint, Date, DateTime, Float, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class AnalyticsEvent(Base):
    __tablename__ = "analytics_events"
    __table_args__ = (
        CheckConstraint("channel IN ('direct','organic','referral')", name="channel"),
        CheckConstraint(
            "name IN ('hero_demo_click','navigation_cta_click','feature_tab_view',"
            "'demo_form_start','demo_form_submit_success','demo_form_submit_error',"
            "'contact_click','faq_expand','session_start','page_view','web_vital')",
            name="name",
        ),
        CheckConstraint(
            "(name = 'web_vital' AND metric_name IN ('LCP','INP','CLS') AND "
            "metric_value IS NOT NULL AND metric_revision IS NOT NULL) OR "
            "(name != 'web_vital' AND metric_name IS NULL AND metric_value IS NULL "
            "AND metric_revision IS NULL)",
            name="metric_pair",
        ),
        CheckConstraint("length(session_digest) = 64", name="digest_length"),
        CheckConstraint("metric_value IS NULL OR metric_value >= 0", name="metric_positive"),
        CheckConstraint("metric_revision IS NULL OR metric_revision >= 0", name="metric_revision"),
        Index("ix_analytics_day_event", "day", "name"),
        Index("ix_analytics_day_session", "day", "session_digest"),
    )
    id: Mapped[UUID] = mapped_column(primary_key=True)
    session_digest: Mapped[str] = mapped_column(String(64))
    day: Mapped[date] = mapped_column(Date)
    name: Mapped[str] = mapped_column(String(40))
    path: Mapped[str] = mapped_column(String(40))
    channel: Mapped[str] = mapped_column(String(16))
    error_kind: Mapped[str | None] = mapped_column(String(16))
    metric_name: Mapped[str | None] = mapped_column(String(3))
    metric_value: Mapped[float | None] = mapped_column(Float)
    metric_revision: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
