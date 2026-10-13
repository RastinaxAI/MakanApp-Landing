"""MeliPayamak's official HTTPS REST pattern endpoint; credentials never enter logs."""

import json
from decimal import Decimal, InvalidOperation

import httpx
from cryptography.exceptions import InvalidTag
from sqlalchemy.orm import Session

from app.core.problems import ApiProblem
from app.models import SmsConfiguration
from app.schemas.otp import SmsSettingsOutput

BASE_URL = "https://rest.payamak-panel.com/api/SendSMS/"


def local_debug(settings, row: SmsConfiguration | None) -> bool:
    return settings.app_env in ("development", "test") and (
        row.debug_mode if row else settings.auth_otp_debug
    )


def configured(row: SmsConfiguration | None) -> bool:
    return bool(
        row and row.enabled and row.encrypted_username and row.encrypted_password and row.body_id
    )


def read_settings(session: Session, settings) -> SmsSettingsOutput:
    row = session.get(SmsConfiguration, 1)
    return SmsSettingsOutput(
        enabled=bool(row and row.enabled),
        debug_mode=local_debug(settings, row),
        debug_allowed=settings.app_env in ("development", "test"),
        credentials_configured=bool(row and row.encrypted_username and row.encrypted_password),
        body_id=row.body_id if row else None,
        row_version=row.row_version if row else 1,
    )


def provider_call(request, row: SmsConfiguration, method: str, payload: dict):
    security = request.app.state.security
    try:
        credentials = {
            "username": security.decrypt(row.encrypted_username, "sms:username"),
            "password": security.decrypt(row.encrypted_password, "sms:password"),
        }
        # Test transport is injected only by tests; runtime uses verified HTTPS and a fixed host.
        transport = getattr(request.app.state, "sms_test_transport", None)
        with httpx.Client(timeout=8, follow_redirects=False, transport=transport) as client:
            with client.stream(
                "POST", BASE_URL + method, data={**credentials, **payload}
            ) as response:
                response.raise_for_status()
                data = bytearray()
                for chunk in response.iter_bytes():
                    data.extend(chunk)
                    if len(data) > 16384:
                        raise ValueError("Oversized provider response")
                result = json.loads(data)
        if (
            not isinstance(result, dict)
            or type(result.get("RetStatus")) is not int
            or result["RetStatus"] != 1
        ):
            raise ValueError("Provider rejected operation")
        value = str(result.get("Value", ""))
        if method == "BaseServiceNumber" and (
            not value.isascii() or not value.isdigit() or int(value) <= 0
        ):
            raise ValueError("Provider rejected delivery")
        if method == "GetCredit":
            credit = Decimal(value)
            if not credit.is_finite() or credit < 0:
                raise ValueError("Provider rejected credentials")
        return True
    except (
        httpx.HTTPError,
        ValueError,
        TypeError,
        KeyError,
        OverflowError,
        InvalidOperation,
        InvalidTag,
    ):
        raise ApiProblem(
            503, "SMS_UNAVAILABLE", "ارسال پیامک انجام نشد؛ تنظیمات پنل پیامکی را بررسی کنید."
        ) from None


def send_code(request, row: SmsConfiguration, phone: str, code: str):
    return provider_call(
        request, row, "BaseServiceNumber", {"text": code, "to": phone, "bodyId": row.body_id}
    )
