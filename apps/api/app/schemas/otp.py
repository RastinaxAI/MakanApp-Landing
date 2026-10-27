import re
from typing import Literal

from pydantic import Field, SecretStr, field_validator

from app.schemas.common import StrictSchema


def normalize_phone(value: str) -> str:
    value = value.translate(str.maketrans("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩", "01234567890123456789"))
    value = re.sub(r"[\s()-]", "", value)
    if value.startswith("+98"):
        value = "0" + value[3:]
    elif value.startswith("0098"):
        value = "0" + value[4:]
    if not re.fullmatch(r"09[0-9]{9}", value):
        raise ValueError("شماره همراه معتبر ایران را وارد کنید.")
    return value


class OtpRequest(StrictSchema):
    phone: str = Field(min_length=10, max_length=24)

    @field_validator("phone")
    @classmethod
    def normalize(cls, value):
        return normalize_phone(value)


class OtpVerify(OtpRequest):
    code: str = Field(pattern=r"^[0-9]{6}$")

    @field_validator("code", mode="before")
    @classmethod
    def digits(cls, value):
        return (
            value.translate(str.maketrans("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩", "01234567890123456789")).strip()
            if isinstance(value, str)
            else value
        )


class OtpStatus(StrictSchema):
    accepted: bool = True
    retry_after: int = 60
    expires_in: int = 300
    debug: bool = False
    message: str = "اگر شماره شما در فهرست مدیران فعال باشد، کد ورود ارسال می‌شود."


class LoginConfiguration(StrictSchema):
    debug: bool
    legacy: bool = False


class SmsSettingsOutput(StrictSchema):
    provider: Literal["melipayamak"] = "melipayamak"
    enabled: bool = False
    debug_mode: bool = False
    debug_allowed: bool = False
    credentials_configured: bool = False
    body_id: int | None = None
    row_version: int = 1


class SmsSettingsInput(StrictSchema):
    enabled: bool
    debug_mode: bool
    username: SecretStr | None = Field(default=None, min_length=1, max_length=128)
    password: SecretStr | None = Field(default=None, min_length=1, max_length=256)
    body_id: int | None = Field(default=None, ge=1, le=2147483647)
    confirmation_code: str = Field(pattern=r"^[0-9]{6}$")
