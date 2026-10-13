import hmac
import secrets
from datetime import timedelta
from uuid import uuid4

from fastapi import Request
from sqlalchemy import select, text, update
from sqlalchemy.orm import Session

from app.core.problems import ApiProblem, unauthorized
from app.core.security import opaque_token, valid_token
from app.models import Admin, AdminOtp, AdminSession, SmsConfiguration
from app.schemas.otp import OtpStatus
from app.services.auth import (
    audit,
    now_utc,
    origin_guard,
    principal,
    profile,
    throttle,
    verify_challenge,
)
from app.services.mfa import verify_second_factor
from app.services.sms import configured, local_debug, send_code


def binding(request: Request, purpose: str) -> str:
    settings = request.app.state.settings
    token = request.cookies.get(
        settings.session_cookie if purpose == "reauth" else settings.challenge_cookie
    )
    if not valid_token(token):
        raise unauthorized()
    return request.app.state.security.digest("otp-binding:" + purpose, token)


def request_code(request: Request, session: Session, phone: str | None, purpose="login"):
    origin_guard(request)
    security, settings = request.app.state.security, request.app.state.settings
    problem, row_id, sms_row, recipient, code = None, None, None, None, None
    with session.begin():
        if purpose == "reauth":
            admin, _, _ = principal(request, session, True)
            phone = admin.phone
            if not phone:
                raise ApiProblem(
                    409,
                    "PHONE_REQUIRED",
                    "ابتدا شماره همراه حساب مدیر را با ابزار راه‌اندازی ثبت کنید.",
                )
        else:
            verify_challenge(request, session, consume=False)
            admin = session.scalar(
                select(Admin).where(Admin.phone == phone, Admin.is_active.is_(True))
            )
        bind = binding(request, purpose)
        subject = security.digest("otp-phone", phone)
        session.execute(text("SELECT pg_advisory_xact_lock(:key)"), {"key": int(subject[:15], 16)})
        ip = request.client.host if request.client else "unknown"
        limits = [
            throttle(session, security, "otp-send-ip", ip, settings.auth_login_ip_limit, 900),
            throttle(
                session, security, "otp-send-phone", phone, settings.auth_login_account_limit, 900
            ),
            throttle(
                session,
                security,
                "otp-resend",
                purpose + ":" + phone,
                1,
                settings.auth_otp_resend_seconds,
            ),
        ]
        retry = max(x or 0 for x in limits)
        sms_row = session.get(SmsConfiguration, 1)
        debug = local_debug(settings, sms_row)
        if retry:
            problem = ApiProblem(429, "RATE_LIMITED", "برای درخواست دوباره کد کمی صبر کنید.", retry)
        elif not debug and not configured(sms_row):
            problem = ApiProblem(
                503,
                "SMS_NOT_CONFIGURED",
                "ورود پیامکی هنوز راه‌اندازی نشده است؛ با مدیر سایت تماس بگیرید.",
            )
        else:
            session.execute(
                update(AdminOtp)
                .where(
                    AdminOtp.binding_digest == bind,
                    AdminOtp.purpose == purpose,
                    AdminOtp.used_at.is_(None),
                )
                .values(used_at=now_utc())
            )
            row_id = uuid4()
            code = "111111" if debug else f"{secrets.randbelow(1000000):06d}"
            while not debug and code == "111111":
                code = f"{secrets.randbelow(1000000):06d}"
            session.add(
                AdminOtp(
                    id=row_id,
                    admin_id=admin.id if admin else None,
                    binding_digest=bind,
                    phone_digest=subject,
                    code_digest=security.digest("otp:" + str(row_id), code),
                    purpose=purpose,
                    delivered=debug or not admin,
                    debug_code=debug,
                    expires_at=now_utc() + timedelta(minutes=5),
                )
            )
            recipient = phone if admin else None
    if problem:
        raise problem
    if not debug and recipient:
        try:
            send_code(request, sms_row, recipient, code)
        except ApiProblem:
            with session.begin():
                session.execute(
                    update(AdminOtp).where(AdminOtp.id == row_id).values(used_at=now_utc())
                )
            raise
        with session.begin():
            session.execute(
                update(AdminOtp)
                .where(AdminOtp.id == row_id, AdminOtp.used_at.is_(None))
                .values(delivered=True)
            )
    return OtpStatus(debug=debug, retry_after=settings.auth_otp_resend_seconds)


def find_code(request, session, purpose):
    return session.scalar(
        select(AdminOtp)
        .where(AdminOtp.binding_digest == binding(request, purpose), AdminOtp.purpose == purpose)
        .order_by(AdminOtp.created_at.desc(), AdminOtp.id.desc())
        .limit(1)
        .with_for_update()
    )


def code_matches(request, row, code, session):
    if (
        row
        and row.debug_code
        and not local_debug(request.app.state.settings, session.get(SmsConfiguration, 1))
    ):
        return False
    return bool(
        row
        and row.delivered
        and not row.used_at
        and row.expires_at > now_utc()
        and row.attempts < 5
        and hmac.compare_digest(
            row.code_digest, request.app.state.security.digest("otp:" + str(row.id), code)
        )
    )


def issue_session(request, session, admin):
    settings, security = request.app.state.settings, request.app.state.security
    previous = request.cookies.get(settings.session_cookie)
    if valid_token(previous):
        session.execute(
            update(AdminSession)
            .where(
                AdminSession.token_digest == security.digest("session", previous),
                AdminSession.admin_id == admin.id,
            )
            .values(revoked_at=now_utc())
        )
    token, now = opaque_token(), now_utc()
    session.add(
        AdminSession(
            admin_id=admin.id,
            token_digest=security.digest("session", token),
            csrf_digest=security.digest("csrf-digest", security.csrf("session", token)),
            expires_at=now + timedelta(seconds=settings.auth_session_seconds),
            idle_expires_at=now + timedelta(seconds=settings.auth_idle_seconds),
            last_seen_at=now,
        )
    )
    admin.last_login_at = now
    audit(session, request, "auth.otp_login", admin.id, admin.id)
    return profile(session, admin), token


def verify_login(request, session, data):
    origin_guard(request)
    result, problem = None, None
    with session.begin():
        verify_challenge(request, session, consume=False)
        # Lock order remains account -> disposable authentication record -> session.
        admin = session.scalar(select(Admin).where(Admin.phone == data.phone).with_for_update())
        row = find_code(request, session, "login")
        retry = throttle(
            session,
            request.app.state.security,
            "otp-verify-ip",
            request.client.host if request.client else "unknown",
            request.app.state.settings.auth_login_ip_limit,
            900,
        )
        matched = code_matches(request, row, data.code, session)
        if row and row.attempts < 5:
            row.attempts += 1
        if retry:
            problem = ApiProblem(
                429, "RATE_LIMITED", "تلاش‌های زیادی انجام شده است؛ کمی بعد تلاش کنید.", retry
            )
        elif (
            not matched
            or not admin
            or not admin.is_active
            or row.admin_id != admin.id
            or row.phone_digest != request.app.state.security.digest("otp-phone", data.phone)
        ):
            problem = ApiProblem(
                401, "OTP_INVALID", "کد نادرست یا منقضی است؛ دوباره درخواست کد کنید."
            )
        elif not verify_second_factor(session, request.app.state.security, admin, data.mfa_code):
            problem = ApiProblem(
                401, "MFA_REQUIRED", "کد برنامه تأییدکننده یا کد بازیابی را وارد کنید."
            )
        else:
            row.used_at = now_utc()
            verify_challenge(request, session)
            result = issue_session(request, session, admin)
    if problem:
        raise problem
    return result


def verify_reauthentication(request, admin, code):
    # Persist wrong attempts and consumption even when the surrounding business action rolls back.
    problem = None
    with request.app.state.limiter_session_factory() as session, session.begin():
        row = find_code(request, session, "reauth")
        matched = code_matches(request, row, code, session)
        if row and row.attempts < 5:
            row.attempts += 1
        if not matched or row.admin_id != admin.id:
            problem = ApiProblem(401, "OTP_INVALID", "برای این تغییر کد تأیید جدید درخواست کنید.")
        else:
            row.used_at = now_utc()
    if problem:
        raise problem
