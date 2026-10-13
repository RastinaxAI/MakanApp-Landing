from typing import Literal

from pydantic import UUID4, Field, StrictBool, model_validator

from app.schemas.common import StrictSchema

POLICY_VERSION = "analytics-2026-10-13-v1"
EventName = Literal[
    "hero_demo_click",
    "navigation_cta_click",
    "feature_tab_view",
    "demo_form_start",
    "demo_form_submit_success",
    "demo_form_submit_error",
    "contact_click",
    "faq_expand",
    "session_start",
    "page_view",
    "web_vital",
]
PagePath = Literal[
    "/",
    "/features",
    "/features/:slug",
    "/solutions",
    "/solutions/:slug",
    "/about",
    "/faq",
    "/demo",
    "/contact",
    "/privacy",
    "/terms",
    "/learn",
    "/blog",
    "/learn/articles/:slug",
    "/learn/videos/:slug",
    "/learn/series",
    "/learn/series/:slug",
    "/learn/categories/:slug",
    "/blog/:slug",
]


class AnalyticsInput(StrictSchema):
    id: UUID4
    session_id: UUID4
    consent: StrictBool
    policy_version: Literal["analytics-2026-10-13-v1"]
    name: EventName
    path: PagePath
    channel: Literal["direct", "organic", "referral"] = "direct"
    error_kind: Literal["validation", "server", "network", "rate_limit"] | None = None
    metric_name: Literal["LCP", "INP", "CLS"] | None = None
    metric_value: float | None = Field(
        default=None, ge=0, le=600000, allow_inf_nan=False, strict=True
    )
    metric_revision: int | None = Field(default=None, ge=0, le=10000, strict=True)

    @model_validator(mode="after")
    def payload(self):
        if self.consent is not True:
            raise ValueError("Optional analytics consent required")
        if self.name == "web_vital":
            if self.metric_name is None or self.metric_value is None:
                raise ValueError("A complete metric is required")
            if self.metric_revision is None:
                self.metric_revision = 0
            if self.metric_name == "CLS" and self.metric_value > 100:
                raise ValueError("CLS must be a layout shift score")
        elif (
            self.metric_name is not None
            or self.metric_value is not None
            or self.metric_revision is not None
        ):
            raise ValueError("Metric fields are only valid for web_vital")
        if (self.name == "demo_form_submit_error") != (self.error_kind is not None):
            raise ValueError("Error category is required only for a form error")
        return self


class AnalyticsConfig(StrictSchema):
    enabled: bool
    policy_version: str
    retention_days: int


class AnalyticsResult(StrictSchema):
    accepted: bool


class VitalSummary(StrictSchema):
    count: int
    p75: float | None
    enough_samples: bool


class AnalyticsMetrics(StrictSchema):
    days: int
    scope: str
    sessions: int
    organic_sessions: int
    events: dict[str, int]
    demo_conversion_rate: float | None
    form_success_rate: float | None
    form_error_rate: float | None
    vitals: dict[str, VitalSummary]
