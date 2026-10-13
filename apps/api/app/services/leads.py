import base64
import hmac
import json
import secrets
from datetime import timedelta
from uuid import UUID

from fastapi import Request
from sqlalchemy import delete, func, or_, select, text
from sqlalchemy.orm import Session

from app.core.problems import ApiProblem
from app.models import Admin, RateLimitBucket
from app.models.leads import Lead, LeadHistory, LeadNote, LeadReceipt
from app.schemas.common import PaginatedResponse, PaginationMeta
from app.schemas.leads import (
    CONSENT_TEXT,
    CONSENT_VERSION,
    Assignee,
    ContactSubmission,
    DemoSubmission,
    FormToken,
    History,
    LeadDetail,
    LeadMetrics,
    LeadQuery,
    LeadSummary,
    LeadUpdate,
    Note,
    NoteInput,
    SubmissionResult,
)
from app.services.auth import audit, now_utc, origin_guard, principal, require_capability, throttle

RETENTION_DAYS = 180
TOKEN_SECONDS = 3600
RETRY_SECONDS = 86400


def digest(request: Request, purpose: str, value: str) -> str:
    return request.app.state.security.digest("forms-" + purpose, value)


def public_gate(request: Request, scope: str, limit: int, seconds=600, subject=None):
    origin_guard(request, request.method != "GET")
    with request.app.state.limiter_session_factory() as limiter, limiter.begin():
        retry = throttle(
            limiter,
            request.app.state.security,
            "forms-" + scope,
            subject or (request.client.host if request.client else "unknown"),
            limit,
            seconds,
        )
    if retry:
        raise ApiProblem(
            429, "RATE_LIMITED", "تلاش‌های زیادی انجام شده است؛ کمی بعد دوباره تلاش کنید.", retry
        )


def submission_gate(request: Request):
    public_gate(request, "submit", request.app.state.settings.forms_submit_limit)


def issue_token(request: Request, kind: str) -> FormToken:
    public_gate(request, "token", request.app.state.settings.forms_token_limit)
    payload = json.dumps(
        {
            "kind": kind,
            "version": CONSENT_VERSION,
            "issued": int(now_utc().timestamp()),
            "nonce": secrets.token_hex(16),
        },
        sort_keys=True,
        separators=(",", ":"),
    )
    encoded = base64.urlsafe_b64encode(payload.encode()).decode().rstrip("=")
    signature = digest(request, "token", encoded)
    return FormToken(
        token=encoded + "." + signature,
        consent_version=CONSENT_VERSION,
        consent_text=CONSENT_TEXT,
        retention_days=RETENTION_DAYS,
        expires_in=TOKEN_SECONDS,
    )


def check_token(request: Request, token: str, kind: str) -> int:
    try:
        encoded, signature = token.split(".")
        if not hmac.compare_digest(digest(request, "token", encoded), signature):
            raise ValueError()
        payload = json.loads(base64.urlsafe_b64decode(encoded + "=" * (-len(encoded) % 4)))
        if payload["kind"] != kind or payload["version"] != CONSENT_VERSION:
            raise ValueError()
        return int(now_utc().timestamp()) - int(payload["issued"])
    except (ValueError, KeyError, TypeError, UnicodeError):
        raise ApiProblem(422, "FORM_TOKEN_INVALID", "فرم را تازه‌سازی و دوباره تلاش کنید.") from None


def advisory(session: Session, value: str):
    # Collision only serializes unrelated submissions; never changes their identity.
    key = int.from_bytes(bytes.fromhex(value)[:8], "big", signed=True)
    session.execute(text("SELECT pg_advisory_xact_lock(:key)"), {"key": key})


def submit(data: DemoSubmission | ContactSubmission, kind: str, request: Request, session: Session):
    if data.website:
        raise ApiProblem(
            422, "SUBMISSION_REJECTED", "درخواست معتبر نیست. فرم را دوباره بررسی کنید."
        )
    if data.consent_version != CONSENT_VERSION:
        raise ApiProblem(409, "CONSENT_CHANGED", "متن رضایت تغییر کرده است؛ فرم را تازه‌سازی کنید.")
    age = check_token(request, data.form_token, kind)
    payload = data.model_dump(mode="json", exclude={"form_token", "idempotency_key", "website"})
    canonical = json.dumps({"kind": kind, **payload}, sort_keys=True, ensure_ascii=False)
    body_digest = digest(request, "body", canonical)
    key_digest = digest(request, "key", str(data.idempotency_key))
    contact_method = "phone" if kind == "demo" else data.contact_method
    contact_value = data.phone if kind == "demo" else data.contact_value
    fingerprint = digest(
        request,
        "duplicate",
        json.dumps(
            {"kind": kind, **{k: v for k, v in payload.items() if k != "source"}},
            sort_keys=True,
            ensure_ascii=False,
        ),
    )
    now = now_utc()
    with session.begin():
        advisory(session, key_digest)
        receipt = session.get(LeadReceipt, key_digest)
        if receipt and receipt.expires_at > now:
            if receipt.body_digest != body_digest:
                raise ApiProblem(
                    409,
                    "IDEMPOTENCY_CONFLICT",
                    "اطلاعات این تلاش تغییر کرده است؛ درخواست تازه‌ای آغاز کنید.",
                )
            lead = session.get(Lead, receipt.lead_id)
            return SubmissionResult(reference_id=lead.reference_id)
        if age < 1 or age > TOKEN_SECONDS:
            raise ApiProblem(
                422,
                "FORM_TOKEN_EXPIRED",
                "فرم تازه شده یا زمان آن گذشته است؛ کمی بعد دوباره تلاش کنید.",
            )
        if receipt:
            session.delete(receipt)
            session.flush()
        advisory(session, fingerprint)
        lead = session.scalar(
            select(Lead)
            .where(
                Lead.fingerprint == fingerprint,
                Lead.created_at >= now - timedelta(seconds=RETRY_SECONDS),
                Lead.purged_at.is_(None),
            )
            .order_by(Lead.created_at.desc())
            .limit(1)
        )
        if not lead:
            public_gate(
                request,
                "contact",
                request.app.state.settings.forms_contact_limit,
                86400,
                contact_value,
            )
            details = payload.copy()
            for field in (
                "full_name",
                "phone",
                "contact_method",
                "contact_value",
                "consent",
                "consent_version",
                "source",
            ):
                details.pop(field, None)
            lead = Lead(
                reference_id="MK-" + secrets.token_urlsafe(24),
                kind=kind,
                full_name=data.full_name,
                contact_method=contact_method,
                contact_value=contact_value,
                details=details,
                source=data.source,
                consent_version=CONSENT_VERSION,
                consent_at=now,
                fingerprint=fingerprint,
                last_activity_at=now,
            )
            session.add(lead)
            session.flush()
            session.add(
                LeadHistory(
                    lead_id=lead.id, changes={"status": {"from": None, "to": "new"}}, created_at=now
                )
            )
            audit(
                session,
                request,
                "lead.received",
                None,
                lead.id,
                {"kind": kind, "source": data.source},
                "lead",
            )
        session.add(
            LeadReceipt(
                key_digest=key_digest,
                body_digest=body_digest,
                lead_id=lead.id,
                expires_at=now + timedelta(seconds=RETRY_SECONDS),
            )
        )
        result = SubmissionResult(reference_id=lead.reference_id)
    # Context committed successfully before returning any success to HTTP.
    return result


def authorize(request: Request, session: Session, mutation=False):
    admin, _, _ = principal(request, session, mutation)
    require_capability(admin, "leads")
    return admin


def projection(row, detail=False):
    fields = LeadDetail.model_fields if detail else LeadSummary.model_fields
    return (LeadDetail if detail else LeadSummary)(**{key: getattr(row, key) for key in fields})


def conditions(query: LeadQuery):
    result = []
    for key in ("kind", "status", "source", "assigned_to"):
        if value := getattr(query, key):
            result.append(getattr(Lead, key) == value)
    if not query.include_purged:
        result.append(Lead.purged_at.is_(None))
    if query.date_from:
        result.append(Lead.created_at >= query.date_from)
    if query.date_to:
        result.append(Lead.created_at < query.date_to)
    if query.q:
        term = (
            "%"
            + query.q.strip().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
            + "%"
        )
        result.append(
            or_(
                *(
                    column.ilike(term, escape="\\")
                    for column in (
                        Lead.full_name,
                        Lead.contact_value,
                        Lead.reference_id,
                        Lead.details["school_name"].astext,
                        Lead.details["subject"].astext,
                    )
                )
            )
        )
    return result


def listing(request, session, query):
    with session.begin():
        authorize(request, session)
        filters = conditions(query)
        total = session.scalar(select(func.count()).select_from(Lead).where(*filters))
        rows = session.scalars(
            select(Lead)
            .where(*filters)
            .order_by(Lead.created_at.desc(), Lead.id)
            .offset(query.offset)
            .limit(query.page_size)
        ).all()
        return PaginatedResponse(
            items=[projection(row) for row in rows],
            pagination=PaginationMeta(
                page=query.page,
                page_size=query.page_size,
                total=total,
                pages=(total + query.page_size - 1) // query.page_size,
            ),
        )


def get_row(session, identifier, lock=False):
    statement = select(Lead).where(Lead.id == identifier)
    row = session.scalar(statement.with_for_update() if lock else statement)
    if not row:
        raise ApiProblem(404, "NOT_FOUND", "درخواست پیدا نشد.")
    return row


def detail(request, session, identifier):
    with session.begin():
        authorize(request, session)
        return projection(get_row(session, identifier), True)


def expected(request, row):
    header = request.headers.get("if-match", "").strip('"')
    if not header:
        raise ApiProblem(428, "VERSION_REQUIRED", "نسخه درخواست لازم است.")
    if not header.isdigit() or int(header) != row.version:
        raise ApiProblem(409, "VERSION_CONFLICT", "درخواست تغییر کرده است؛ صفحه را تازه‌سازی کنید.")
    if row.purged_at:
        raise ApiProblem(409, "LEAD_PURGED", "اطلاعات شخصی این درخواست حذف شده است.")


def update_lead(request, session, identifier, data: LeadUpdate):
    with session.begin():
        admin = authorize(request, session, True)
        row = get_row(session, identifier, True)
        expected(request, row)
        if data.outcome == "won" and row.kind != "demo":
            raise ApiProblem(422, "INVALID_OUTCOME", "قرارداد تنها برای درخواست دمو ثبت می‌شود.")
        if data.assigned_to:
            assignee = session.scalar(
                select(Admin).where(
                    Admin.id == data.assigned_to,
                    Admin.is_active.is_(True),
                    Admin.role.in_(("owner", "sales")),
                )
            )
            if not assignee:
                raise ApiProblem(422, "INVALID_ASSIGNEE", "مسئول باید مدیر فعال مالک یا فروش باشد.")
        changes = {}
        for key, value in data.model_dump().items():
            old = getattr(row, key)
            if old != value:
                changes[key] = {
                    "from": str(old) if isinstance(old, UUID) else old,
                    "to": str(value) if isinstance(value, UUID) else value,
                }
                setattr(row, key, value)
        if changes:
            row.last_activity_at = now_utc()
            row.version += 1
            session.add(
                LeadHistory(
                    lead_id=row.id,
                    actor_id=admin.id,
                    changes=changes,
                    created_at=row.last_activity_at,
                )
            )
            audit(session, request, "lead.updated", admin.id, row.id, changes, "lead")
        return projection(row, True)


def add_note(request, session, identifier, data: NoteInput):
    with session.begin():
        admin = authorize(request, session, True)
        row = get_row(session, identifier, True)
        expected(request, row)
        row.last_activity_at = now_utc()
        row.version += 1
        note = LeadNote(
            lead_id=row.id, actor_id=admin.id, body=data.body, created_at=row.last_activity_at
        )
        session.add(note)
        session.flush()
        audit(
            session, request, "lead.note_added", admin.id, row.id, {"note_id": str(note.id)}, "lead"
        )
        return Note(**{key: getattr(note, key) for key in Note.model_fields})


def events(request, session, identifier, query, notes=False):
    with session.begin():
        authorize(request, session)
        get_row(session, identifier)
        model, schema = (LeadNote, Note) if notes else (LeadHistory, History)
        total = session.scalar(
            select(func.count()).select_from(model).where(model.lead_id == identifier)
        )
        rows = session.scalars(
            select(model)
            .where(model.lead_id == identifier)
            .order_by(model.created_at.desc(), model.id)
            .offset(query.offset)
            .limit(query.page_size)
        ).all()
        return PaginatedResponse(
            items=[
                schema(**{key: getattr(row, key) for key in schema.model_fields}) for row in rows
            ],
            pagination=PaginationMeta(
                page=query.page,
                page_size=query.page_size,
                total=total,
                pages=(total + query.page_size - 1) // query.page_size,
            ),
        )


def assignees(request, session):
    with session.begin():
        authorize(request, session)
        rows = session.scalars(
            select(Admin)
            .where(Admin.is_active.is_(True), Admin.role.in_(("owner", "sales")))
            .order_by(Admin.email)
        ).all()
        return [Assignee(id=row.id, email=row.email) for row in rows]


def metrics(request, session, query):
    with session.begin():
        authorize(request, session)
        filters = conditions(query.model_copy(update={"include_purged": True}))
        # Cohort: created_at in [from,to); latest manually recorded status/outcome.
        rows = session.execute(
            select(Lead.kind, Lead.status, Lead.outcome, Lead.source, func.count())
            .where(*filters)
            .group_by(Lead.kind, Lead.status, Lead.outcome, Lead.source)
        ).all()
        source = {}
        for _kind, _status, _outcome, item_source, count in rows:
            source[item_source] = source.get(item_source, 0) + count
        return LeadMetrics(
            total=sum(r[4] for r in rows),
            demo=sum(r[4] for r in rows if r[0] == "demo"),
            contact=sum(r[4] for r in rows if r[0] == "contact"),
            qualified=sum(r[4] for r in rows if r[1] == "qualified"),
            contracts=sum(r[4] for r in rows if r[0] == "demo" and r[2] == "won"),
            by_source=source,
            date_from=query.date_from,
            date_to=query.date_to,
        )


def purge(session, batch_size=1000, now=None):
    now = now or now_utc()
    rows = session.scalars(
        select(Lead)
        .where(
            Lead.purged_at.is_(None), Lead.last_activity_at < now - timedelta(days=RETENTION_DAYS)
        )
        .order_by(Lead.last_activity_at, Lead.id)
        .limit(batch_size)
        .with_for_update(skip_locked=True)
    ).all()
    for row in rows:
        session.execute(delete(LeadNote).where(LeadNote.lead_id == row.id))
        session.execute(delete(LeadReceipt).where(LeadReceipt.lead_id == row.id))
        row.full_name = row.contact_value = row.fingerprint = None
        row.details = {}
        row.purged_at = now
        row.version += 1
        audit(
            session, None, "lead.purged", None, row.id, {"retention_days": RETENTION_DAYS}, "lead"
        )
    expired = session.scalars(
        select(LeadReceipt)
        .where(LeadReceipt.expires_at < now)
        .limit(batch_size)
        .with_for_update(skip_locked=True)
    ).all()
    for receipt in expired:
        session.delete(receipt)
    buckets = session.scalars(
        select(RateLimitBucket)
        .where(RateLimitBucket.scope.like("forms-%"), RateLimitBucket.expires_at < now)
        .limit(batch_size)
        .with_for_update(skip_locked=True)
    ).all()
    for bucket in buckets:
        session.delete(bucket)
    return {
        "purged": len(rows),
        "expired_receipts": len(expired),
        "expired_rate_buckets": len(buckets),
    }
