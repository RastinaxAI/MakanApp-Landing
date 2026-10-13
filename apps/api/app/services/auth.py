import hmac
from datetime import UTC, datetime, timedelta
from uuid import UUID

from fastapi import Request
from sqlalchemy import select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.core.problems import ApiProblem, unauthorized
from app.core.security import Security, opaque_token, valid_token
from app.models import Admin, AdminMfa, AdminSession, AuditLog, AuthChallenge, RateLimitBucket
from app.schemas.auth import LoginInput, Profile

CAPABILITIES = {
    "owner": ["accounts", "audit", "content", "leads", "settings"],
    "editor": ["content"],
    "sales": ["leads"],
}


def now_utc() -> datetime:
    return datetime.now(UTC)


def origin_guard(request: Request, mutation: bool = True) -> None:
    origin = request.headers.get("origin")
    if origin is not None and origin not in request.app.state.settings.auth_allowed_origins:
        raise ApiProblem(403, "CSRF_REJECTED", "درخواست ورود یا تغییر معتبر نیست.")
    if mutation and origin is None:
        raise ApiProblem(403, "CSRF_REJECTED", "درخواست ورود یا تغییر معتبر نیست.")
    if request.headers.get("sec-fetch-site") not in (None, "same-origin", "none"):
        raise ApiProblem(403, "CSRF_REJECTED", "درخواست ورود یا تغییر معتبر نیست.")


def audit(
    session: Session,
    request: Request | None,
    action: str,
    actor: UUID | None,
    entity: UUID | None = None,
    changes: dict | None = None,
    entity_type: str = "admin",
) -> None:
    from uuid import uuid4

    session.add(
        AuditLog(
            actor_id=actor,
            action=action,
            entity_type=entity_type,
            entity_id=entity,
            field_changes_json=changes or {},
            trace_id=UUID(request.state.trace_id) if request else uuid4(),
        )
    )


def throttle(
    session: Session, security: Security, scope: str, subject: str, limit: int, seconds: int
) -> int | None:
    now = now_utc()
    start = datetime.fromtimestamp(int(now.timestamp()) // seconds * seconds, UTC)
    end = start + timedelta(seconds=seconds)
    statement = (
        insert(RateLimitBucket)
        .values(
            scope=scope,
            subject_hmac=security.digest("rate", subject),
            window_start=start,
            count=1,
            expires_at=end + timedelta(minutes=5),
        )
        .on_conflict_do_update(
            index_elements=[
                RateLimitBucket.scope,
                RateLimitBucket.subject_hmac,
                RateLimitBucket.window_start,
            ],
            set_={"count": RateLimitBucket.count + 1},
        )
        .returning(RateLimitBucket.count)
    )
    count = session.scalar(statement)
    return max(1, int((end - now).total_seconds())) if count > limit else None


def principal(
    request: Request, session: Session, mutation: bool = False
) -> tuple[Admin, AdminSession, str]:
    config, security = request.app.state.settings, request.app.state.security
    token = request.cookies.get(config.session_cookie)
    if not valid_token(token):
        raise unauthorized()
    item = session.scalar(
        select(AdminSession).where(AdminSession.token_digest == security.digest("session", token))
    )
    if item is None:
        raise unauthorized()
    # Account -> session is the common locking order, including revocation and account changes.
    admin = session.scalar(select(Admin).where(Admin.id == item.admin_id).with_for_update())
    item = session.scalar(
        select(AdminSession)
        .where(AdminSession.id == item.id)
        .execution_options(populate_existing=True)
        .with_for_update()
    )
    now = now_utc()
    if (
        not admin
        or not admin.is_active
        or item.revoked_at
        or item.expires_at <= now
        or item.idle_expires_at <= now
    ):
        raise unauthorized()
    if mutation:
        origin_guard(request)
        csrf = request.headers.get("x-csrf-token", "")
        if len(csrf) != 64 or not hmac.compare_digest(
            item.csrf_digest, security.digest("csrf-digest", csrf)
        ):
            raise ApiProblem(403, "CSRF_REJECTED", "درخواست ورود یا تغییر معتبر نیست.")
    item.last_seen_at = now
    item.idle_expires_at = min(item.expires_at, now + timedelta(seconds=config.auth_idle_seconds))
    return admin, item, token


def profile(session: Session, admin: Admin, legacy: bool = False) -> Profile:
    mfa = session.get(AdminMfa, admin.id)
    return Profile(
        id=admin.id,
        email=admin.email,
        phone=admin.phone,
        login_method="password" if legacy else "otp",
        role=admin.role,
        capabilities=CAPABILITIES[admin.role],
        mfa_enabled=bool(mfa and mfa.enabled_at),
    )


def require_capability(admin: Admin, capability: str) -> None:
    if capability not in CAPABILITIES[admin.role]:
        raise ApiProblem(403, "FORBIDDEN", "برای این بخش دسترسی ندارید.")


def csrf_challenge(request: Request, session: Session) -> tuple[str, str | None]:
    origin_guard(request, False)
    config, security = request.app.state.settings, request.app.state.security
    problem = None
    challenge_token = None
    csrf = ""
    with session.begin():
        retry = throttle(
            session,
            security,
            "challenge",
            request.client.host if request.client else "unknown",
            config.auth_challenge_limit,
            300,
        )
        if retry:
            problem = ApiProblem(429, "RATE_LIMITED", "کمی بعد دوباره تلاش کنید.", retry)
        else:
            try:
                _, _, token = principal(request, session)
                csrf = security.csrf("session", token)
            except ApiProblem:
                token = request.cookies.get(config.challenge_cookie)
                existing = (
                    session.scalar(
                        select(AuthChallenge).where(
                            AuthChallenge.token_digest == security.digest("challenge", token or "")
                        )
                    )
                    if valid_token(token)
                    else None
                )
                if existing and not existing.used_at and existing.expires_at > now_utc():
                    csrf = security.csrf("challenge", token)
                else:
                    challenge_token = opaque_token()
                    csrf = security.csrf("challenge", challenge_token)
                    session.add(
                        AuthChallenge(
                            token_digest=security.digest("challenge", challenge_token),
                            csrf_digest=security.digest("csrf-digest", csrf),
                            expires_at=now_utc() + timedelta(minutes=5),
                        )
                    )
    if problem:
        raise problem
    return csrf, challenge_token


def verify_challenge(request: Request, session: Session, consume: bool = True) -> None:
    config, security = request.app.state.settings, request.app.state.security
    token = request.cookies.get(config.challenge_cookie)
    csrf = request.headers.get("x-csrf-token", "")
    if not valid_token(token) or len(csrf) != 64:
        raise ApiProblem(403, "CSRF_REJECTED", "درخواست ورود یا تغییر معتبر نیست.")
    row = session.scalar(
        select(AuthChallenge)
        .where(AuthChallenge.token_digest == security.digest("challenge", token))
        .with_for_update()
    )
    if (
        not row
        or row.purpose != "login"
        or row.used_at
        or row.expires_at <= now_utc()
        or not hmac.compare_digest(row.csrf_digest, security.digest("csrf-digest", csrf))
    ):
        raise ApiProblem(403, "CSRF_REJECTED", "درخواست ورود یا تغییر معتبر نیست.")
    if consume:
        row.used_at = now_utc()


def login(request: Request, session: Session, data: LoginInput) -> tuple[Profile, str]:
    from app.services.mfa import verify_second_factor

    origin_guard(request)
    if (
        not request.app.state.settings.auth_legacy_password_login
        or request.app.state.settings.app_env != "test"
    ):
        raise ApiProblem(
            410, "PHONE_LOGIN_REQUIRED", "برای ورود از شماره همراه و کد پیامکی استفاده کنید."
        )
    config, security = request.app.state.settings, request.app.state.security
    result, new_token, problem = None, None, None
    with session.begin():
        verify_challenge(request, session)
        ip = request.client.host if request.client else "unknown"
        retry_ip = throttle(session, security, "login-ip", ip, config.auth_login_ip_limit, 900)
        retry_account = throttle(
            session,
            security,
            "login-account",
            str(data.email),
            config.auth_login_account_limit,
            900,
        )
        if retry_ip or retry_account:
            problem = ApiProblem(
                429,
                "RATE_LIMITED",
                "تلاش‌های زیادی انجام شده است. کمی بعد دوباره تلاش کنید.",
                max(retry_ip or 0, retry_account or 0),
            )
        else:
            admin = session.scalar(
                select(Admin).where(Admin.email == str(data.email)).with_for_update()
            )
            matched = security.password_matches(
                admin.password_hash if admin else security.dummy_hash, data.password
            )
            if (
                not admin
                or not matched
                or not admin.is_active
                or not verify_second_factor(session, security, admin, data.mfa_code)
            ):
                audit(session, request, "auth.login_failed", admin.id if admin else None)
                problem = unauthorized()
            else:
                if security.hasher.check_needs_rehash(admin.password_hash):
                    admin.password_hash = security.hasher.hash(data.password)
                previous = request.cookies.get(config.session_cookie)
                if valid_token(previous):
                    session.execute(
                        update(AdminSession)
                        .where(
                            AdminSession.token_digest == security.digest("session", previous),
                            AdminSession.admin_id == admin.id,
                        )
                        .values(revoked_at=now_utc())
                    )
                new_token = opaque_token()
                now = now_utc()
                session.add(
                    AdminSession(
                        admin_id=admin.id,
                        token_digest=security.digest("session", new_token),
                        csrf_digest=security.digest(
                            "csrf-digest", security.csrf("session", new_token)
                        ),
                        expires_at=now + timedelta(seconds=config.auth_session_seconds),
                        idle_expires_at=now + timedelta(seconds=config.auth_idle_seconds),
                        last_seen_at=now,
                    )
                )
                admin.last_login_at = now
                audit(session, request, "auth.login", admin.id, admin.id)
                result = profile(session, admin, legacy=True)
    if problem:
        raise problem
    return result, new_token


def reauthenticate(
    request: Request,
    session: Session,
    admin: Admin,
    password: str,
    code: str | None,
    verify_mfa: bool = True,
) -> None:
    from app.services.mfa import verify_second_factor

    security, config = request.app.state.security, request.app.state.settings
    # A failed mutation rolls back its data, but must retain the throttle charge.
    with request.app.state.limiter_session_factory() as limiter, limiter.begin():
        retry = throttle(
            limiter, security, "reauth", str(admin.id), config.auth_login_account_limit, 900
        )
    if retry:
        raise ApiProblem(429, "RATE_LIMITED", "کمی بعد دوباره تلاش کنید.", retry)
    if not config.auth_legacy_password_login or config.app_env != "test":
        from app.services.otp import verify_reauthentication

        verify_reauthentication(request, admin, password)
        if verify_mfa and not verify_second_factor(session, security, admin, code):
            raise unauthorized()
        return
    if not security.password_matches(admin.password_hash or "", password) or (
        verify_mfa and not verify_second_factor(session, security, admin, code)
    ):
        raise unauthorized()


def revoke_all(session: Session, admin_id: UUID) -> None:
    session.execute(
        update(AdminSession)
        .where(AdminSession.admin_id == admin_id, AdminSession.revoked_at.is_(None))
        .values(revoked_at=now_utc())
    )


def charge_sensitive_attempt(request: Request, scope: str, admin_id: UUID) -> None:
    with request.app.state.limiter_session_factory() as limiter, limiter.begin():
        retry = throttle(
            limiter,
            request.app.state.security,
            scope,
            str(admin_id),
            request.app.state.settings.auth_login_account_limit,
            300,
        )
    if retry:
        raise ApiProblem(429, "RATE_LIMITED", "کمی بعد دوباره تلاش کنید.", retry)
