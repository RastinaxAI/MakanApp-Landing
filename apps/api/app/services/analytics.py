import re
from datetime import timedelta

from fastapi import Request
from sqlalchemy import delete, func, select, tuple_
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.core.problems import ApiProblem
from app.models import AnalyticsEvent, RateLimitBucket
from app.schemas.analytics import AnalyticsInput
from app.services.auth import now_utc, origin_guard, principal, require_capability, throttle

RETENTION_DAYS = 30
BOT = re.compile(r"bot|crawler|spider|headless|lighthouse|curl|wget", re.I)


def gate(request: Request):
    if not request.app.state.settings.analytics_enabled:
        raise ApiProblem(404, "ANALYTICS_DISABLED", "اندازه‌گیری اختیاری فعال نیست.")
    origin_guard(request)
    length = request.headers.get("content-length", "0")
    if not length.isdecimal() or int(length) > 2048:
        raise ApiProblem(413, "PAYLOAD_TOO_LARGE", "درخواست بیش از حد بزرگ است.")
    with request.app.state.limiter_session_factory() as session, session.begin():
        retry = throttle(
            session,
            request.app.state.security,
            "analytics-event",
            request.client.host if request.client else "unknown",
            request.app.state.settings.analytics_event_limit,
            600,
        )
    if retry:
        raise ApiProblem(429, "RATE_LIMITED", "کمی بعد دوباره تلاش کنید.", retry_after=retry)


def receive(data: AnalyticsInput, request: Request, session: Session):
    if (
        request.headers.get("dnt") == "1"
        or request.headers.get("sec-gpc") == "1"
        or BOT.search(request.headers.get("user-agent", ""))
    ):
        return {"accepted": False}
    if not request.headers.get("user-agent"):
        return {"accepted": False}
    now = now_utc()
    digest = request.app.state.security.digest(
        "analytics-session", f"{now.date()}:{data.session_id}"
    )
    with session.begin():
        statement = insert(AnalyticsEvent).values(
            id=data.id,
            session_digest=digest,
            day=now.date(),
            name=data.name,
            path=data.path,
            channel=data.channel,
            error_kind=data.error_kind,
            metric_name=data.metric_name,
            metric_value=data.metric_value,
            metric_revision=data.metric_revision,
            created_at=now,
        )
        if data.name == "web_vital":
            statement = statement.on_conflict_do_update(
                index_elements=[AnalyticsEvent.id],
                set_={"metric_value": data.metric_value, "metric_revision": data.metric_revision},
                where=(AnalyticsEvent.session_digest == digest)
                & (AnalyticsEvent.name == "web_vital")
                & (AnalyticsEvent.metric_name == data.metric_name)
                & (AnalyticsEvent.path == data.path)
                & (AnalyticsEvent.metric_revision < data.metric_revision),
            )
        else:
            statement = statement.on_conflict_do_nothing(index_elements=[AnalyticsEvent.id])
        session.execute(statement)
    return {"accepted": True}


def metrics(request: Request, session: Session, days: int):
    with session.begin():
        admin, _, _ = principal(request, session)
        require_capability(admin, "leads")
        start = now_utc().date() - timedelta(days=days - 1)
        cohort = (
            select(AnalyticsEvent.session_digest)
            .where(AnalyticsEvent.day >= start, AnalyticsEvent.name == "session_start")
            .distinct()
            .subquery()
        )
        common = (
            AnalyticsEvent.day >= start,
            AnalyticsEvent.session_digest.in_(select(cohort.c.session_digest)),
        )
        sessions = session.scalar(select(func.count()).select_from(cohort))
        organic = session.scalar(
            select(func.count(func.distinct(AnalyticsEvent.session_digest))).where(
                *common, AnalyticsEvent.name == "session_start", AnalyticsEvent.channel == "organic"
            )
        )
        events = dict(
            session.execute(
                select(AnalyticsEvent.name, func.count())
                .where(*common)
                .group_by(AnalyticsEvent.name)
            ).all()
        )
        converted = session.scalar(
            select(func.count(func.distinct(AnalyticsEvent.session_digest))).where(
                *common, AnalyticsEvent.name == "demo_form_submit_success"
            )
        )
        successes = events.get("demo_form_submit_success", 0)
        errors = events.get("demo_form_submit_error", 0)
        attempts = successes + errors
        vitals = {}
        for name in ("LCP", "INP", "CLS"):
            count, p75 = session.execute(
                select(
                    func.count(),
                    func.percentile_cont(0.75).within_group(AnalyticsEvent.metric_value),
                ).where(
                    *common, AnalyticsEvent.name == "web_vital", AnalyticsEvent.metric_name == name
                )
            ).one()
            vitals[name] = {"count": count, "p75": p75, "enough_samples": count >= 100}
        return dict(
            days=days,
            scope="consented_daily_sessions_utc",
            sessions=sessions,
            organic_sessions=organic,
            events=events,
            demo_conversion_rate=converted / sessions if sessions else None,
            form_success_rate=successes / attempts if attempts else None,
            form_error_rate=errors / attempts if attempts else None,
            vitals=vitals,
        )


def purge(session: Session, batch: int = 500):
    if not 1 <= batch <= 5000:
        raise ValueError("Cleanup batch must be between 1 and 5000")
    expired = (
        select(AnalyticsEvent.id)
        .where(AnalyticsEvent.day < now_utc().date() - timedelta(days=RETENTION_DAYS - 1))
        .order_by(AnalyticsEvent.day, AnalyticsEvent.id)
        .limit(batch)
    )
    deleted = session.execute(delete(AnalyticsEvent).where(AnalyticsEvent.id.in_(expired))).rowcount
    stale = (
        select(RateLimitBucket.scope, RateLimitBucket.subject_hmac, RateLimitBucket.window_start)
        .where(RateLimitBucket.scope == "analytics-event", RateLimitBucket.expires_at < now_utc())
        .order_by(RateLimitBucket.window_start, RateLimitBucket.subject_hmac)
        .limit(batch)
    )
    buckets = session.execute(
        delete(RateLimitBucket).where(
            tuple_(
                RateLimitBucket.scope, RateLimitBucket.subject_hmac, RateLimitBucket.window_start
            ).in_(stale)
        )
    ).rowcount
    return {"expired_events": deleted, "expired_rate_buckets": buckets}
