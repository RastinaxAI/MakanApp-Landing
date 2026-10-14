from datetime import date, datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import Field, ValidationInfo, field_validator, model_validator

from app.schemas.common import PaginatedResponse, PaginationQuery, StrictSchema
from app.schemas.leads import ContactSubmission, LeadDetail, Source, plain

Stage = Literal[
    "new",
    "contacted",
    "qualified",
    "demo_scheduled",
    "demo_completed",
    "proposal",
    "negotiation",
    "won",
    "lost",
]


class TextInput(StrictSchema):
    @field_validator("*", mode="before")
    @classmethod
    def normalize(cls, value):
        return plain(value) if isinstance(value, str) else value


class CrmQuery(PaginationQuery):
    q: str = Field(default="", max_length=120)
    lead_id: UUID | None = None
    school_id: UUID | None = None
    assigned_to: UUID | None = None
    stage: Stage | None = None
    source: Source | None = None
    lead_status: Literal["new", "contacted", "qualified", "closed"] | None = None
    tag: str = Field(default="", max_length=60)
    overdue: bool = False
    date_from: datetime | None = None
    date_to: datetime | None = None

    @model_validator(mode="after")
    def dates(self):
        for value in (self.date_from, self.date_to):
            if value and not value.tzinfo:
                raise ValueError("Timezone required")
        if self.date_from and self.date_to and self.date_from > self.date_to:
            raise ValueError("Invalid date range")
        return self


class SchoolInput(TextInput):
    name: str = Field(min_length=2, max_length=180)
    city: str = Field(default="", max_length=100)
    province: str = Field(default="", max_length=100)
    students: int | None = Field(default=None, ge=0, le=1000000)
    interested_features: list[Literal["messenger", "school", "reports", "ai", "profile"]] = Field(
        default_factory=list, max_length=5
    )


class ContactInput(TextInput):
    school_id: UUID
    source_lead_id: UUID | None = None
    full_name: str = Field(min_length=2, max_length=120)
    contact_method: Literal["phone", "email"] = "phone"
    contact_value: str = Field(min_length=3, max_length=254)
    job_title: str = Field(default="", max_length=100)
    is_manager: bool = False

    @field_validator("contact_value")
    @classmethod
    def valid_contact(cls, value: str, info: ValidationInfo):
        return ContactSubmission.valid_contact(value, info)


class ManualLeadInput(TextInput):
    full_name: str = Field(min_length=2, max_length=120)
    phone: str = Field(max_length=40)
    school_name: str = Field(min_length=2, max_length=180)
    city: str = Field(default="", max_length=100)
    province: str = Field(default="", max_length=100)
    source: Source = "direct"
    consent: Literal[True]
    assigned_to: UUID | None = None

    @field_validator("phone")
    @classmethod
    def phone_number(cls, value):
        from app.schemas.leads import phone

        return phone(value)

    @field_validator("consent", mode="before")
    @classmethod
    def explicit_consent(cls, value):
        if value is not True:
            raise ValueError("Consent required")
        return value


class ProfileInput(TextInput):
    full_name: str = Field(min_length=2, max_length=120)
    contact_method: Literal["phone", "email"] | None = None
    contact_value: str | None = Field(default=None, min_length=3, max_length=254)
    school_id: UUID | None = None
    tags: list[str] = Field(default_factory=list, max_length=20)
    qualification: str = Field(default="", max_length=3000)

    @model_validator(mode="after")
    def contact(self):
        if (self.contact_method is None) != (self.contact_value is None):
            raise ValueError("Contact method and value required together")
        return self

    @field_validator("contact_value")
    @classmethod
    def contact_value_valid(cls, value, info: ValidationInfo):
        return (
            ContactSubmission.valid_contact(value, info)
            if value and info.data.get("contact_method")
            else value
        )

    @field_validator("tags")
    @classmethod
    def valid_tags(cls, value):
        values = list(dict.fromkeys(plain(item) for item in value))
        if any(not item or len(item) > 60 for item in values):
            raise ValueError("Invalid tag")
        return values


class OpportunityInput(TextInput):
    lead_id: UUID
    school_id: UUID
    title: str = Field(min_length=2, max_length=180)
    stage: Stage = "new"
    assigned_to: UUID | None = None
    estimated_value: Decimal = Field(default=Decimal("0"), ge=0, lt=10**15, decimal_places=2)
    expected_close_date: date | None = None
    lost_reason: str = Field(default="", max_length=3000)
    notes: str = Field(default="", max_length=3000)

    @model_validator(mode="after")
    def losing(self):
        if self.stage == "lost" and len(self.lost_reason) < 2:
            raise ValueError("Lost reason required")
        return self


class ActivityInput(TextInput):
    lead_id: UUID
    opportunity_id: UUID | None = None
    kind: Literal["call", "meeting", "demo", "task", "note", "followup"]
    status: Literal["open", "completed", "canceled"] = "open"
    title: str = Field(min_length=2, max_length=180)
    body: str = Field(default="", max_length=3000)
    assigned_to: UUID | None = None
    due_at: datetime | None = None

    @field_validator("due_at")
    @classmethod
    def timezone(cls, value):
        if value and not value.tzinfo:
            raise ValueError("Timezone required")
        return value


class DemoInput(TextInput):
    lead_id: UUID
    opportunity_id: UUID | None = None
    assigned_to: UUID
    starts_at: datetime
    ends_at: datetime
    status: Literal["scheduled", "completed", "canceled", "no_show"] = "scheduled"
    outcome: str = Field(default="", max_length=3000)
    next_action: str = Field(default="", max_length=3000)

    @model_validator(mode="after")
    def interval(self):
        if not self.starts_at.tzinfo or not self.ends_at.tzinfo:
            raise ValueError("Timezone required")
        if not 900 <= (self.ends_at - self.starts_at).total_seconds() <= 14400:
            raise ValueError("Demo duration must be 15 minutes to 4 hours")
        if self.status == "completed" and (len(self.outcome) < 2 or len(self.next_action) < 2):
            raise ValueError("Outcome and next action required")
        return self


class AutomationInput(StrictSchema):
    auto_assign: bool = False
    assignment_mode: Literal["least_open", "fixed"] = "least_open"
    fixed_assignee: UUID | None = None
    reminders_enabled: bool = True
    inactive_days: int = Field(default=14, ge=1, le=90)

    @model_validator(mode="after")
    def fixed(self):
        if self.auto_assign and self.assignment_mode == "fixed" and not self.fixed_assignee:
            raise ValueError("Assignee required")
        return self


class SavedViewInput(TextInput):
    name: str = Field(min_length=2, max_length=100)
    filters: CrmQuery


class Record(StrictSchema):
    id: UUID
    version: int
    created_at: datetime
    updated_at: datetime


class SchoolRecord(SchoolInput, Record):
    name: str | None
    last_activity_at: datetime
    purged_at: datetime | None


class ContactRecord(Record):
    school_id: UUID
    source_lead_id: UUID | None
    full_name: str | None
    contact_method: str
    contact_value: str | None
    job_title: str
    is_manager: bool
    last_activity_at: datetime
    purged_at: datetime | None


class OpportunityRecord(OpportunityInput, Record):
    last_activity_at: datetime


class ActivityRecord(ActivityInput, Record):
    completed_at: datetime | None
    actor_id: UUID


class DemoRecord(DemoInput, Record):
    pass


class SavedViewRecord(SavedViewInput, Record):
    admin_id: UUID


class NotificationRecord(StrictSchema):
    id: UUID
    kind: str
    href: str
    read_at: datetime | None
    created_at: datetime


class AutomationRecord(AutomationInput):
    row_version: int


class ProfileRecord(StrictSchema):
    school_id: UUID | None
    tags: list[str]
    qualification: str
    converted_at: datetime | None


class TimelineRecord(StrictSchema):
    id: UUID
    kind: str
    at: datetime
    details: dict


class CustomerRecord(StrictSchema):
    lead: LeadDetail | None
    profile: ProfileRecord
    school: SchoolRecord | None
    requests: list[LeadDetail]
    contacts: PaginatedResponse[ContactRecord]
    opportunities: PaginatedResponse[OpportunityRecord]
    activities: PaginatedResponse[ActivityRecord]
    demos: PaginatedResponse[DemoRecord]
    timeline: PaginatedResponse[TimelineRecord]


class PerformanceRecord(StrictSchema):
    id: UUID
    label: str | None
    completed_activities: int
    completed_demos: int
    won_opportunities: int


class DashboardRecord(StrictSchema):
    total_leads: int
    new_leads: int
    qualified_leads: int
    demo_requests: int
    scheduled_demos: int
    completed_demos: int
    lead_to_demo_percent: float
    demo_to_opportunity_percent: float
    scheduled_leads: int
    completed_leads: int
    overdue_followups: int
    stages: dict[str, int]
    sources: dict[str, int]
    performance: list[PerformanceRecord]
