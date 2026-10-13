"""Consent-gated first-party analytics without raw identifying inputs."""

import sqlalchemy as sa

from alembic import op

revision = "0007_analytics"
down_revision = "0006_leads"
branch_labels = depends_on = None


def upgrade():
    op.create_table(
        "analytics_events",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("session_digest", sa.String(64), nullable=False),
        sa.Column("day", sa.Date(), nullable=False),
        sa.Column("name", sa.String(40), nullable=False),
        sa.Column("path", sa.String(40), nullable=False),
        sa.Column("channel", sa.String(16), nullable=False),
        sa.Column("error_kind", sa.String(16)),
        sa.Column("metric_name", sa.String(3)),
        sa.Column("metric_value", sa.Float()),
        sa.Column("metric_revision", sa.Integer()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("channel IN ('direct','organic','referral')", name="channel"),
        sa.CheckConstraint(
            "name IN ('hero_demo_click','navigation_cta_click','feature_tab_view',"
            "'demo_form_start','demo_form_submit_success','demo_form_submit_error',"
            "'contact_click','faq_expand','session_start','page_view','web_vital')",
            name="name",
        ),
        sa.CheckConstraint(
            "(name = 'web_vital' AND metric_name IN ('LCP','INP','CLS') AND "
            "metric_value IS NOT NULL AND metric_revision IS NOT NULL) OR "
            "(name != 'web_vital' AND metric_name IS NULL AND metric_value IS NULL "
            "AND metric_revision IS NULL)",
            name="metric_pair",
        ),
        sa.CheckConstraint("length(session_digest) = 64", name="digest_length"),
        sa.CheckConstraint("metric_value IS NULL OR metric_value >= 0", name="metric_positive"),
        sa.CheckConstraint(
            "metric_revision IS NULL OR metric_revision >= 0", name="metric_revision"
        ),
    )
    op.create_index("ix_analytics_day_event", "analytics_events", ["day", "name"])
    op.create_index("ix_analytics_day_session", "analytics_events", ["day", "session_digest"])
    op.execute("GRANT SELECT, INSERT, DELETE ON analytics_events TO makan_api")
    op.execute("GRANT UPDATE (metric_value, metric_revision) ON analytics_events TO makan_api")


def downgrade():
    raise RuntimeError("Destructive downgrade disabled; use a reviewed forward migration")
