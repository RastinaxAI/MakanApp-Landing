from datetime import datetime
from enum import StrEnum
from typing import Literal
from uuid import UUID

from pydantic import EmailStr, Field, field_validator

from app.schemas.common import StrictSchema


class Role(StrEnum):
    owner = "owner"
    editor = "editor"
    sales = "sales"


class LoginInput(StrictSchema):
    email: EmailStr = Field(max_length=254)
    password: str = Field(min_length=1, max_length=128)
    mfa_code: str | None = Field(default=None, max_length=48)

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value):
        return value.strip().lower() if isinstance(value, str) else value


class Reauthentication(StrictSchema):
    current_password: str = Field(min_length=1, max_length=128)
    mfa_code: str | None = Field(default=None, max_length=48)


class AccountCreate(Reauthentication):
    email: EmailStr = Field(max_length=254)
    password: str = Field(min_length=15, max_length=128)
    role: Role

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value):
        return value.strip().lower() if isinstance(value, str) else value


class AccountUpdate(Reauthentication):
    role: Role | None = None
    is_active: bool | None = None


class PasswordUpdate(Reauthentication):
    new_password: str = Field(min_length=15, max_length=128)


class MfaConfirm(StrictSchema):
    code: str = Field(pattern=r"^\d{6}$")


class Profile(StrictSchema):
    id: UUID
    email: str
    role: Role
    capabilities: list[str]
    mfa_enabled: bool


class Account(StrictSchema):
    id: UUID
    email: str
    role: Role
    is_active: bool
    created_at: datetime
    last_login_at: datetime | None


class CsrfResponse(StrictSchema):
    csrf_token: str


class SessionInfo(StrictSchema):
    id: UUID
    created_at: datetime
    last_seen_at: datetime
    expires_at: datetime
    current: bool


class SessionQuery(StrictSchema):
    admin_id: UUID | None = None


class MfaEnrollment(StrictSchema):
    secret: str
    otpauth_url: str


class RecoveryCodes(StrictSchema):
    recovery_codes: list[str]


class AuditEvent(StrictSchema):
    id: UUID
    action: str
    actor_id: UUID | None
    entity_id: UUID | None
    created_at: datetime


class Dashboard(StrictSchema):
    metrics: dict[str, int]
    modules: dict[str, Literal["ready", "pending"]]
