"""Versioned editorial references and public library queries."""

import hashlib
import hmac
import re
import time
from datetime import timedelta
from uuid import UUID

from sqlalchemy import exists, func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.core.problems import ApiProblem
from app.models import (
    LearningCategory,
    LearningStats,
    LearningTag,
    LearningView,
    Page,
    PageRevision,
    RevisionCategory,
    RevisionRelation,
    RevisionTag,
    SeriesItem,
)
from app.schemas.learning import LibraryQuery
from app.services import cms
from app.services.auth import now_utc, throttle

KINDS = {"learn": ("article", "video"), "blog": ("blog",), "series": ("series",)}


def attach_references(session, item, revision, payload):
    domain = "blog" if payload["kind"] == "blog" else "learn"
    for model, ref, field, idfield in (
        (LearningCategory, RevisionCategory, "category_ids", "category_id"),
        (LearningTag, RevisionTag, "tag_ids", "tag_id"),
    ):
        for value in sorted(payload[field]):
            row = session.scalar(select(model).where(model.id == UUID(value)).with_for_update())
            if not row or row.domain != domain:
                raise ApiProblem(422, "INVALID_TAXONOMY", "دسته یا برچسب با این بخش سازگار نیست.")
            session.add(ref(revision_id=revision.id, **{idfield: row.id}))
    for field, ref in (("related_ids", RevisionRelation), ("item_ids", SeriesItem)):
        for position, value in enumerate(payload[field]):
            row = session.get(Page, UUID(value))
            if not row or row.id == item.id or row.page_type not in KINDS[domain]:
                raise ApiProblem(422, "INVALID_REFERENCE", "آموزش مرتبط یا قسمت مجموعه معتبر نیست.")
            values = {"revision_id": revision.id, "content_id": row.id}
            if ref is SeriesItem:
                values["position"] = position
            session.add(ref(**values))


def publication_checks(payload):
    from app.services.learning_html import decorate

    for html in (payload.body_html, payload.transcript_html):
        _, headings = decorate(html, [])
        if any(not heading["text"].strip() for heading in headings):
            raise ApiProblem(422, "EMPTY_HEADING", "عنوان‌های داخل متن نباید خالی باشند.")
    if not payload.summary.strip() or not payload.audiences:
        raise ApiProblem(422, "INCOMPLETE_CONTENT", "چکیده و نقش مخاطب را ثبت کنید.")
    if (
        payload.kind in ("article", "blog")
        and not re.sub(r"<[^>]+>", "", payload.body_html).strip()
    ):
        raise ApiProblem(422, "INCOMPLETE_CONTENT", "متن مقاله را ثبت کنید.")
    if payload.kind == "video" and not (
        payload.aparat_id and payload.duration_seconds and payload.cover_media_id
    ):
        raise ApiProblem(422, "INCOMPLETE_VIDEO", "شناسه، مدت و پوستر تأییدشده ویدیو لازم است.")
    if payload.kind == "series" and not payload.item_ids:
        raise ApiProblem(422, "EMPTY_SERIES", "حداقل یک قسمت برای مجموعه انتخاب کنید.")


def public_rows(kinds):
    return (
        select(Page, PageRevision)
        .join(PageRevision, PageRevision.id == cms.effective_id(now_utc()))
        .where(
            Page.page_type.in_(kinds),
            Page.is_archived.is_(False),
            PageRevision.content_json["visibility"].as_boolean().is_(True),
        )
    )


def card(session, page, revision, include_body=False):
    result = cms.projection(page, revision, session=session).model_dump(mode="json")
    if not include_body:
        result["payload"]["body_html"] = ""
        result["payload"]["transcript_html"] = ""
        result["payload"]["toc"] = []
        result["payload"]["sources"] = []
        cover_id = result["payload"].get("cover_media_id")
        result["media"] = [image for image in result["media"] if image["id"] == cover_id]
    result["qualified_views"] = (
        session.scalar(
            select(LearningStats.qualified_views).where(LearningStats.content_id == page.id)
        )
        or 0
    )
    result["categories"] = [
        tax_dict(row)
        for row in session.scalars(
            select(LearningCategory)
            .join(RevisionCategory, RevisionCategory.category_id == LearningCategory.id)
            .where(RevisionCategory.revision_id == revision.id)
            .order_by(LearningCategory.sort_order, LearningCategory.id)
        )
    ]
    result["tags"] = [
        tax_dict(row)
        for row in session.scalars(
            select(LearningTag)
            .join(RevisionTag, RevisionTag.tag_id == LearningTag.id)
            .where(RevisionTag.revision_id == revision.id)
            .order_by(LearningTag.sort_order, LearningTag.id)
        )
    ]
    return result


def listing(session: Session, query: LibraryQuery, domain="learn"):
    statement = public_rows(KINDS[domain])
    payload = PageRevision.content_json["payload"]
    if query.type:
        statement = statement.where(Page.page_type == query.type)
    for name in ("level", "topic"):
        if value := getattr(query, name):
            statement = statement.where(payload[name].as_string() == value)
    if query.audience:
        statement = statement.where(payload["audiences"].contains([query.audience]))
    if query.featured:
        statement = statement.where(payload["featured"].as_boolean().is_(True))
    for model, ref, key, value in (
        (LearningCategory, RevisionCategory, "category_id", query.category),
        (LearningTag, RevisionTag, "tag_id", query.tag),
    ):
        if value:
            statement = statement.where(
                exists(
                    select(ref.revision_id)
                    .join(model, model.id == getattr(ref, key))
                    .where(
                        ref.revision_id == PageRevision.id,
                        model.slug == value,
                        model.domain == ("blog" if domain == "blog" else "learn"),
                    )
                )
            )
    if query.q:
        value = query.q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        statement = statement.where(
            (
                PageRevision.title
                + " "
                + payload["summary"].as_string()
                + " "
                + payload["body_html"].as_string()
            ).ilike(f"%{value}%", escape="\\")
        )
    total = session.scalar(select(func.count()).select_from(statement.subquery()))
    if query.sort == "popular":
        statement = statement.outerjoin(
            LearningStats, LearningStats.content_id == Page.id
        ).order_by(func.coalesce(LearningStats.qualified_views, 0).desc())
    rows = session.execute(
        statement.order_by(PageRevision.published_at.desc(), Page.id)
        .offset(query.offset)
        .limit(query.page_size)
    )
    return {
        "items": [card(session, p, r) for p, r in rows],
        "pagination": {
            "page": query.page,
            "page_size": query.page_size,
            "total": total,
            "pages": (total + query.page_size - 1) // query.page_size,
        },
    }


def tax_dict(row):
    return {name: getattr(row, name) for name in ("id", "slug", "title", "domain", "sort_order")}


def public_taxonomy(session, model, ref, key, domain):
    kinds = KINDS[domain] + (("series",) if domain == "learn" else ())
    return (
        select(model)
        .where(
            model.domain == domain,
            exists(
                public_rows(kinds)
                .join(ref, ref.revision_id == PageRevision.id)
                .where(getattr(ref, key) == model.id)
            ),
        )
        .order_by(model.sort_order, model.id)
    )


def public_by_id(session, content_id):
    row = session.execute(
        public_rows(("article", "video", "blog", "series")).where(Page.id == content_id)
    ).first()
    return card(session, *row) if row else None


def detail(session, slug, domain="learn", series_slug=None):
    row = session.execute(
        public_rows(KINDS[domain]).where(
            Page.slug.in_([cms.key(kind, slug) for kind in KINDS[domain]])
        )
    ).first()
    if not row:
        raise ApiProblem(404, "NOT_FOUND", "محتوای منتشرشده یافت نشد.")
    page, revision = row
    result = card(session, page, revision, include_body=True)
    result["related"] = [
        item
        for value in session.scalars(
            select(RevisionRelation.content_id)
            .where(RevisionRelation.revision_id == revision.id)
            .order_by(RevisionRelation.content_id)
        )
        if (item := public_by_id(session, value))
    ]
    result["items"] = []
    result["series"] = []
    result["previous"] = result["next"] = None
    if domain == "series":
        result["items"] = [
            item
            for value in session.scalars(
                select(SeriesItem.content_id)
                .where(SeriesItem.revision_id == revision.id)
                .order_by(SeriesItem.position)
            )
            if (item := public_by_id(session, value))
        ]
    elif domain == "learn":
        series_rows = session.execute(
            public_rows(("series",))
            .where(
                exists().where(
                    SeriesItem.revision_id == PageRevision.id, SeriesItem.content_id == page.id
                )
            )
            .order_by(PageRevision.published_at.desc(), Page.id)
        )
        for sp, sr in series_rows:
            result["series"].append(card(session, sp, sr))
        selected = (
            next((s for s in result["series"] if s["slug"] == series_slug), None)
            if series_slug
            else next(iter(result["series"]), None)
        )
        if selected:
            result["active_series"] = selected["slug"]
            sequence = detail(session, selected["slug"], "series")["items"]
            idx = next(i for i, value in enumerate(sequence) if value["id"] == str(page.id))
            result["previous"] = sequence[idx - 1] if idx else None
            result["next"] = sequence[idx + 1] if idx + 1 < len(sequence) else None
    return result


def subject(request):
    ua = request.headers.get("user-agent", "")[:500]
    if not ua or re.search(r"bot|crawl|spider|headless|curl|python|httpx", ua, re.I):
        raise ApiProblem(422, "UNQUALIFIED_VIEW", "بازدید واجد شرایط نیست.")
    host = request.client.host if request.client else "unknown"
    return f"{host}:{hashlib.sha256(ua.encode()).hexdigest()}"


def ticket(request, content_id):
    timestamp = int(time.time())
    security = request.app.state.security
    viewer = subject(request)
    with request.app.state.limiter_session_factory() as limiter, limiter.begin():
        retry = throttle(limiter, security, "learn-ticket", viewer, 100, 600)
    if retry:
        raise ApiProblem(429, "RATE_LIMITED", "کمی بعد دوباره تلاش کنید.", retry_after=retry)
    proof = security.digest("view-ticket", f"{content_id}:{timestamp}:{viewer}")
    return f"{timestamp}.{proof}"


def qualified_view(request, session, content_id, value):
    origin = request.headers.get("origin")
    if origin not in request.app.state.settings.auth_allowed_origins:
        raise ApiProblem(403, "INVALID_ORIGIN", "مبدأ درخواست معتبر نیست.")
    viewer = subject(request)
    security = request.app.state.security
    try:
        timestamp, signature = value.split(".")
        elapsed = time.time() - int(timestamp)
        valid = 20 <= elapsed <= 600 and hmac.compare_digest(
            signature, security.digest("view-ticket", f"{content_id}:{timestamp}:{viewer}")
        )
    except (ValueError, OverflowError):
        valid = False
    if not valid:
        raise ApiProblem(
            422, "INVALID_VIEW_TICKET", "بازدید هنوز واجد شرایط نیست یا منقضی شده است."
        )
    with request.app.state.limiter_session_factory() as limiter, limiter.begin():
        retry = throttle(limiter, security, "learn-view", viewer, 60, 600)
    if retry:
        raise ApiProblem(429, "RATE_LIMITED", "کمی بعد دوباره تلاش کنید.", retry_after=retry)
    row = public_by_id(session, content_id)
    if not row or row["kind"] == "series":
        raise ApiProblem(404, "NOT_FOUND", "محتوا یافت نشد.")
    now = now_utc()
    digest = security.digest("view", f"{now.date()}:{viewer}")
    added = session.scalar(
        insert(LearningView)
        .values(
            content_id=content_id,
            viewer_digest=digest,
            day=str(now.date()),
            created_at=now,
            expires_at=now + timedelta(days=2),
        )
        .on_conflict_do_nothing()
        .returning(LearningView.content_id)
    )
    if added:
        session.execute(
            insert(LearningStats)
            .values(content_id=content_id, qualified_views=1)
            .on_conflict_do_update(
                index_elements=[LearningStats.content_id],
                set_={"qualified_views": LearningStats.qualified_views + 1},
            )
        )
    return {"counted": bool(added)}
