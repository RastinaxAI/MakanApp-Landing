from typing import Annotated

from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api.v1.routes.admin import cookie
from app.core.problems import ApiProblem
from app.db.session import get_session
from app.models import SmsConfiguration
from app.schemas.auth import Profile
from app.schemas.otp import (
    LoginConfiguration,
    OtpRequest,
    OtpStatus,
    OtpVerify,
    SmsSettingsInput,
    SmsSettingsOutput,
)
from app.services import otp, sms
from app.services.auth import audit, principal, reauthenticate, require_capability
from app.services.cms import expected_version

router = APIRouter(prefix="/admin", tags=["phone-authentication"])
SessionDep = Annotated[Session, Depends(get_session)]


@router.get("/auth/config", response_model=LoginConfiguration)
def configuration(request: Request, session: SessionDep):
    settings = request.app.state.settings
    return LoginConfiguration(
        debug=sms.local_debug(settings, session.get(SmsConfiguration, 1)),
        legacy=settings.auth_legacy_password_login and settings.app_env == "test",
    )


@router.post("/auth/otp/request", response_model=OtpStatus)
def send(data: OtpRequest, request: Request, session: SessionDep):
    return otp.request_code(request, session, data.phone)


@router.post("/auth/otp/verify", response_model=Profile)
def verify(data: OtpVerify, request: Request, response: Response, session: SessionDep):
    result, token = otp.verify_login(request, session, data)
    settings = request.app.state.settings
    cookie(response, request, settings.session_cookie, token, settings.auth_session_seconds)
    cookie(response, request, settings.challenge_cookie, "", 0)
    return result


@router.post("/auth/otp/reauth", response_model=OtpStatus)
def step_up(request: Request, session: SessionDep):
    return otp.request_code(request, session, None, "reauth")


@router.get("/settings/sms", response_model=SmsSettingsOutput)
def settings(request: Request, session: SessionDep):
    with session.begin():
        admin, _, _ = principal(request, session)
        require_capability(admin, "settings")
        return sms.read_settings(session, request.app.state.settings)


@router.patch("/settings/sms", response_model=SmsSettingsOutput)
def save(data: SmsSettingsInput, request: Request, session: SessionDep):
    with session.begin():
        admin, _, _ = principal(request, session, True)
        require_capability(admin, "settings")
        reauthenticate(request, session, admin, data.confirmation_code)
        session.execute(text("SELECT pg_advisory_xact_lock(74120800)"))
        current = sms.read_settings(session, request.app.state.settings)
        expected_version(request, current.row_version)
        if data.debug_mode and request.app.state.settings.app_env not in ("development", "test"):
            raise ApiProblem(422, "DEBUG_FORBIDDEN", "ورود با کد ثابت در محیط انتشار مجاز نیست.")
        row = session.get(SmsConfiguration, 1)
        if not row:
            row = SmsConfiguration(id=1, row_version=1)
            session.add(row)
        security = request.app.state.security
        if data.username is not None:
            row.encrypted_username = security.encrypt(
                data.username.get_secret_value(), "sms:username"
            )
        if data.password is not None:
            row.encrypted_password = security.encrypt(
                data.password.get_secret_value(), "sms:password"
            )
        row.body_id, row.debug_mode, row.enabled = data.body_id, data.debug_mode, data.enabled
        if not data.debug_mode and not sms.configured(row):
            raise ApiProblem(
                422,
                "SMS_CONFIGURATION_REQUIRED",
                "برای ورود واقعی نام کاربری، رمز و شناسه الگوی تأییدشده را ثبت کنید. "
                "اتصال پنل باید فعال باشد.",
            )
        row.row_version = current.row_version + 1
        audit(
            session,
            request,
            "settings.sms_updated",
            admin.id,
            changes={"enabled": row.enabled, "debug_mode": row.debug_mode},
            entity_type="settings",
        )
        session.flush()
        return sms.read_settings(session, request.app.state.settings)


@router.post("/settings/sms/check")
def check(request: Request, session: SessionDep):
    with session.begin():
        admin, _, _ = principal(request, session, True)
        require_capability(admin, "settings")
        row = session.get(SmsConfiguration, 1)
        if not row or not row.encrypted_username or not row.encrypted_password:
            raise ApiProblem(422, "SMS_CONFIGURATION_REQUIRED", "ابتدا مشخصات پنل را ذخیره کنید.")
    sms.provider_call(request, row, "GetCredit", {})
    return {
        "connected": True,
        "message": "ارتباط و اطلاعات ورود پنل تأیید شد؛ این بررسی پیامک ارسال نمی‌کند.",
    }
