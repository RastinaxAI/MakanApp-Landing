import re
import unicodedata
from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import UUID4, Field, ValidationInfo, field_validator, model_validator

from app.schemas.common import PaginationQuery, StrictSchema

Kind = Literal["demo", "contact"]
Status = Literal["new", "contacted", "qualified", "closed"]
Outcome = Literal["won", "lost", "no_response", "duplicate", "resolved"]
Source = Literal["direct", "home", "features", "solutions", "learn", "blog", "demo", "contact"]
DIGITS = str.maketrans("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩", "01234567890123456789")
CONSENT_VERSION = "2026-10-13-v1"
CONSENT_TEXT = "با ذخیره اطلاعات این فرم و تماس درباره همین درخواست طبق سیاست حریم خصوصی موافقم."


def plain(value: str) -> str:
    value = unicodedata.normalize("NFKC", value).strip()
    if any(ord(char) < 32 and char not in "\n\t" for char in value):
        raise ValueError("Invalid text")
    return value


def phone(value: str) -> str:
    value = re.sub(r"[ ()-]", "", value.translate(DIGITS))
    if value.startswith("0098"):
        value = "+98" + value[4:]
    elif value.startswith("0"):
        value = "+98" + value[1:]
    if not re.fullmatch(r"\+98[1-9][0-9]{9}", value):
        raise ValueError("Invalid Iranian telephone")
    return value


class Submission(StrictSchema):
    full_name: str = Field(min_length=2, max_length=120)
    consent: Literal[True]
    consent_version: str = Field(max_length=32)
    form_token: str = Field(min_length=40, max_length=1024)
    idempotency_key: UUID4
    website: str = Field(default="", max_length=200)
    source: Source = "direct"

    @field_validator("consent", mode="before")
    @classmethod
    def explicit_consent(cls, value):
        if value is not True:
            raise ValueError("Explicit consent required")
        return value

    @field_validator("full_name", mode="before")
    @classmethod
    def clean_name(cls, value):
        return plain(value) if isinstance(value, str) else value


class DemoSubmission(Submission):
    phone: str = Field(max_length=40)
    school_name: str = Field(min_length=2, max_length=180)
    city: str = Field(default="", max_length=100)
    job_title: str = Field(default="", max_length=100)
    student_count_range: Literal["", "under100", "100-299", "300-599", "600-999", "1000plus"] = ""
    message: str = Field(default="", max_length=3000)

    @field_validator("phone")
    @classmethod
    def clean_phone(cls, value):
        return phone(value)

    @field_validator("school_name", "city", "job_title", "message", mode="before")
    @classmethod
    def clean_text(cls, value):
        return plain(value) if isinstance(value, str) else value


class ContactSubmission(Submission):
    contact_method: Literal["phone", "email"]
    contact_value: str = Field(min_length=3, max_length=254)
    subject: str = Field(min_length=2, max_length=180)
    message: str = Field(min_length=2, max_length=3000)

    @field_validator("subject", "message", "contact_value", mode="before")
    @classmethod
    def clean_text(cls, value):
        return plain(value) if isinstance(value, str) else value

    @field_validator("contact_value")
    @classmethod
    def valid_contact(cls, value: str, info: ValidationInfo):
        if info.data.get("contact_method") == "phone":
            value = phone(value)
        else:
            value = value.lower()
            if not re.fullmatch(
                r"[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,63}",
                value,
            ):
                raise ValueError("Invalid email")
        return value


class FormToken(StrictSchema):
    token: str
    consent_version: str
    consent_text: str
    retention_days: int
    expires_in: int


class SubmissionResult(StrictSchema):
    reference_id: str
    status: Literal["received"] = "received"


class LeadQuery(PaginationQuery):
    kind: Kind | None = None
    status: Status | None = None
    source: Source | None = None
    assigned_to: UUID | None = None
    q: str = Field(default="", max_length=120)
    date_from: datetime | None = None
    date_to: datetime | None = None
    include_purged: bool = False

    @model_validator(mode="after")
    def dates(self):
        for value in (self.date_from, self.date_to):
            if value and value.tzinfo is None:
                raise ValueError("Timezone required")
        if self.date_from and self.date_to and self.date_from > self.date_to:
            raise ValueError("Invalid date range")
        return self


class LeadSummary(StrictSchema):
    id: UUID
    reference_id: str
    kind: Kind
    full_name: str | None
    contact_method: Literal["phone", "email"]
    contact_value: str | None
    source: Source
    status: Status
    outcome: Outcome | None
    assigned_to: UUID | None
    created_at: datetime
    last_activity_at: datetime
    purged_at: datetime | None
    version: int


class LeadDetail(LeadSummary):
    details: dict
    consent_version: str
    consent_at: datetime


class LeadUpdate(StrictSchema):
    status: Status
    outcome: Outcome | None = None
    assigned_to: UUID | None = None

    @model_validator(mode="after")
    def closing(self):
        if (self.status == "closed") != (self.outcome is not None):
            raise ValueError("Closed outcome required only when closed")
        return self


class NoteInput(StrictSchema):
    body: str = Field(min_length=2, max_length=3000)

    @field_validator("body", mode="before")
    @classmethod
    def clean(cls, value):
        return plain(value) if isinstance(value, str) else value


class Note(StrictSchema):
    id: UUID
    actor_id: UUID
    body: str
    created_at: datetime


class History(StrictSchema):
    id: UUID
    actor_id: UUID | None
    changes: dict
    created_at: datetime


class Assignee(StrictSchema):
    id: UUID
    email: str | None
    phone: str | None = None


class LeadMetrics(StrictSchema):
    total: int
    demo: int
    contact: int
    qualified: int
    contracts: int
    by_source: dict[str, int]
    date_from: datetime | None
    date_to: datetime | None
