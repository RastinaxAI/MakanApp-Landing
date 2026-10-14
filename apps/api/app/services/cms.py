import json
import re
from datetime import UTC, datetime
from uuid import UUID

from fastapi import Request
from sqlalchemy import case, func, or_, select
from sqlalchemy import text as sql_text
from sqlalchemy.orm import Session

from app.core.problems import ApiProblem
from app.models import FaqCategory, MediaAsset, Page, PageRevision, PageSection, RevisionMediaRef
from app.schemas.cms import (
    AdminContent,
    ContentInput,
    ContentQuery,
    PublicContent,
    Seo,
    payload_adapter,
)
from app.services.auth import audit, now_utc, principal, require_capability
from app.services.html_safety import MEDIA_URL

RESOURCES = {
    "pages": ("home", "page"),
    "features": ("feature",),
    "audiences": ("audience",),
    "faqs": ("faq",),
    "content": ("home", "page", "feature", "audience", "faq"),
    "learn/contents": ("article", "video"),
    "learn/series": ("series",),
    "blog/articles": ("blog",),
}


def key(kind: str, slug: str) -> str:
    return f"{kind}:{slug}"


def expected_version(request: Request, version: int) -> None:
    value = request.headers.get("if-match", "").strip('"')
    if not value:
        raise ApiProblem(428, "PRECONDITION_REQUIRED", "نسخه محتوا را همراه درخواست بفرستید.")
    if value != str(version):
        raise ApiProblem(
            409, "STALE_VERSION", "محتوا تغییر کرده است؛ آخرین نسخه را دوباره بارگذاری کنید."
        )


def authorize(request: Request, session: Session, mutation=False):
    admin, _, _ = principal(request, session, mutation)
    require_capability(admin, "content")
    return admin


def entity(session: Session, resource: str, entity_id: UUID, lock=False) -> Page:
    query = select(Page).where(Page.id == entity_id, Page.page_type.in_(RESOURCES[resource]))
    if lock:
        query = query.with_for_update()
    item = session.scalar(query)
    if not item:
        raise ApiProblem(404, "NOT_FOUND", "محتوا یافت نشد.")
    return item


def media_ids(data) -> set[UUID]:
    result = set()
    if isinstance(data, dict):
        for name, value in data.items():
            if name.endswith("media_id") and value:
                result.add(UUID(str(value)))
            elif name.endswith("html") and isinstance(value, str):
                for match in re.finditer(r'src="([^"]+)"', value):
                    media_match = MEDIA_URL.fullmatch(match.group(1))
                    if media_match:
                        result.add(UUID(media_match.group(1)))
            else:
                result.update(media_ids(value))
    elif isinstance(data, list):
        for value in data:
            result.update(media_ids(value))
    return result


def attach_media(session: Session, revision: PageRevision, data: dict):
    for media_id in sorted(media_ids(data), key=str):
        media = session.scalar(
            select(MediaAsset).where(MediaAsset.id == media_id).with_for_update()
        )
        if not media:
            raise ApiProblem(422, "MEDIA_NOT_FOUND", "رسانه انتخاب‌شده یافت نشد.")
        session.add(RevisionMediaRef(revision_id=revision.id, media_id=media_id))


def create_revision(session: Session, item: Page, data: ContentInput, actor: UUID | None):
    payload = data.payload.model_dump(mode="json")
    if payload.get("document") is not None:
        payload["document"] = data.payload.document.model_dump(mode="json", exclude_none=True)
        if len(json.dumps(payload, ensure_ascii=False).encode("utf-8")) > 250000:
            raise ApiProblem(
                413, "DOCUMENT_TOO_LARGE", "حجم برگه زیاد است؛ محتوای آن را به چند برگه تقسیم کنید."
            )
    if data.category_id:
        if data.payload.kind != "faq" or not session.get(FaqCategory, data.category_id):
            raise ApiProblem(422, "INVALID_CATEGORY", "دسته پرسش معتبر نیست.")
    number = (
        session.scalar(
            select(func.max(PageRevision.revision_no)).where(PageRevision.page_id == item.id)
        )
        or 0
    ) + 1
    revision = PageRevision(
        page_id=item.id,
        revision_no=number,
        title=data.title,
        content_json={
            "payload": payload,
            "visibility": data.visibility,
            "sort_order": data.sort_order,
        },
        seo_json=data.seo.model_dump(mode="json"),
        indexable=data.seo.indexable,
        category_id=data.category_id,
        created_by=actor,
    )
    session.add(revision)
    session.flush()
    for position, section in enumerate(payload.get("sections", [])):
        session.add(
            PageSection(
                revision_id=revision.id,
                type=section["type"],
                sort_order=position,
                content_json=section,
            )
        )
    attach_media(session, revision, {"payload": payload, "seo": data.seo.model_dump(mode="json")})
    if payload["kind"] in ("article", "video", "blog", "series"):
        from app.services.learning import attach_references

        attach_references(session, item, revision, payload)
    item.working_revision_id = revision.id
    return revision


def effective_id(now):
    return case(
        (
            Page.scheduled_revision_id.is_not(None) & (Page.scheduled_at <= now),
            Page.scheduled_revision_id,
        ),
        else_=Page.published_revision_id,
    )


def projection(item: Page, revision: PageRevision, private=False, session: Session | None = None):
    content = revision.content_json
    payload = dict(content["payload"])
    if not private:
        payload.pop("evidence_reference", None)
        payload.pop("related_ids", None)
        payload.pop("item_ids", None)
    fields = dict(
        id=item.id,
        slug=item.slug.split(":", 1)[-1],
        kind=item.page_type,
        title=revision.title,
        revision_id=revision.id,
        revision_no=revision.revision_no,
        payload=payload,
        seo=Seo.model_validate(revision.seo_json),
        visibility=content.get("visibility", True),
        sort_order=content.get("sort_order", 0),
        category_id=revision.category_id,
        published_at=revision.published_at,
        reviewed_at=revision.reviewed_at,
        updated_at=revision.created_at,
        media=[
            {"id": str(m.id), "width": m.width, "height": m.height, "alt_text": m.alt_text}
            for m in session.scalars(
                select(MediaAsset)
                .join(RevisionMediaRef, RevisionMediaRef.media_id == MediaAsset.id)
                .where(RevisionMediaRef.revision_id == revision.id)
            )
        ]
        if session
        else [],
    )
    if private:
        scheduled = bool(item.scheduled_revision_id and item.scheduled_at)
        due = scheduled and item.scheduled_at <= now_utc()
        state = (
            "archived"
            if item.is_archived
            else "scheduled"
            if scheduled and not due
            else "published"
            if due or item.published_revision_id
            else "draft"
        )
        result = AdminContent(
            **fields,
            publication_state=state,
            row_version=item.row_version,
            working_revision_id=item.working_revision_id,
            published_revision_id=item.published_revision_id,
            scheduled_revision_id=item.scheduled_revision_id,
            scheduled_at=item.scheduled_at,
            is_archived=item.is_archived,
        )
    else:
        result = PublicContent(**fields)
    if item.page_type in ("article", "video", "blog", "series"):
        from app.services.learning_html import decorate

        images = [image.model_dump(mode="json") for image in result.media]
        result.payload["body_html"], result.payload["toc"] = decorate(
            result.payload["body_html"], images
        )
        result.payload["transcript_html"], _ = decorate(
            result.payload["transcript_html"], images, "transcript"
        )
    return result


def page_list(session: Session, query: ContentQuery, resource="content", public=False):
    ref = effective_id(now_utc()) if public else Page.working_revision_id
    statement = (
        select(Page, PageRevision)
        .join(PageRevision, PageRevision.id == ref)
        .where(Page.page_type.in_(RESOURCES[resource]))
    )
    if public:
        statement = statement.where(
            Page.is_archived.is_(False),
            PageRevision.content_json["visibility"].as_boolean().is_(True),
            public_document(),
        )
    elif query.status == "archived":
        statement = statement.where(Page.is_archived.is_(True))
    else:
        statement = statement.where(Page.is_archived.is_(False))
    if query.kind:
        statement = statement.where(Page.page_type == query.kind)
    if query.category_id:
        statement = statement.where(PageRevision.category_id == query.category_id)
    if query.q:
        text = query.q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        statement = statement.where(PageRevision.title.ilike(f"%{text}%", escape="\\"))
    if not public and query.status:
        if query.status == "draft":
            statement = statement.where(
                or_(
                    effective_id(now_utc()).is_(None),
                    Page.working_revision_id != effective_id(now_utc()),
                )
            )
        elif query.status == "scheduled":
            statement = statement.where(
                Page.scheduled_revision_id.is_not(None), Page.scheduled_at > now_utc()
            )
        elif query.status == "published":
            statement = statement.where(effective_id(now_utc()).is_not(None))
    total = session.scalar(select(func.count()).select_from(statement.subquery()))
    rows = session.execute(
        statement.order_by(PageRevision.content_json["sort_order"].as_integer(), Page.id)
        .offset(query.offset)
        .limit(query.page_size)
    )
    return {
        "items": [projection(p, r, not public, session) for p, r in rows],
        "pagination": {
            "page": query.page,
            "page_size": query.page_size,
            "total": total,
            "pages": (total + query.page_size - 1) // query.page_size,
        },
    }


def get_public(session: Session, kinds: tuple[str, ...], slug: str):
    row = session.execute(
        select(Page, PageRevision)
        .join(PageRevision, PageRevision.id == effective_id(now_utc()))
        .where(
            Page.page_type.in_(kinds),
            Page.slug.in_([key(kind, slug) for kind in kinds]),
            Page.is_archived.is_(False),
            PageRevision.content_json["visibility"].as_boolean().is_(True),
            public_document(),
        )
    ).first()
    if not row:
        raise ApiProblem(404, "NOT_FOUND", "صفحه منتشرشده یافت نشد.")
    return projection(*row, session=session)


def public_document():
    return (
        func.coalesce(
            PageRevision.content_json["payload"]["document"]["purpose"].as_string(), "page"
        )
        == "page"
    )


def save(
    request: Request,
    session: Session,
    resource: str,
    data: ContentInput,
    entity_id: UUID | None = None,
):
    with session.begin():
        admin = authorize(request, session, True)
        if data.payload.kind not in RESOURCES[resource] or (
            data.payload.kind == "home" and data.slug != "home"
        ):
            raise ApiProblem(422, "INVALID_KIND", "نوع محتوا با این مسیر سازگار نیست.")
        slug = key(data.payload.kind, data.slug)
        # Serialize equal slug reservations, including two concurrent creates.
        session.execute(
            sql_text("SELECT pg_advisory_xact_lock(hashtextextended(:slug, 741206))"),
            {"slug": "learn:" + data.slug if data.payload.kind in ("article", "video") else slug},
        )
        if entity_id:
            item = entity(session, resource, entity_id, True)
            expected_version(request, item.row_version)
            if item.is_archived:
                raise ApiProblem(409, "ARCHIVED", "محتوای بایگانی‌شده قابل ویرایش نیست.")
            if item.page_type != data.payload.kind:
                raise ApiProblem(409, "IMMUTABLE_KIND", "نوع محتوا قابل تغییر نیست.")
            if item.slug != slug and session.scalar(
                select(PageRevision.id)
                .where(PageRevision.page_id == item.id, PageRevision.published_at.is_not(None))
                .limit(1)
            ):
                raise ApiProblem(409, "IMMUTABLE_SLUG", "آدرس محتوای منتشرشده ثابت است.")
            item.row_version += 1
        else:
            item = Page(slug=slug, page_type=data.payload.kind)
        if session.scalar(
            select(Page.id).where(Page.slug == slug, Page.id != item.id if entity_id else True)
        ):
            raise ApiProblem(409, "SLUG_EXISTS", "این آدرس قبلاً ثبت شده است.")
        if data.payload.kind in ("article", "video") and session.scalar(
            select(Page.id).where(
                Page.slug.in_([key(k, data.slug) for k in ("article", "video")]),
                Page.id != item.id if entity_id else True,
            )
        ):
            raise ApiProblem(409, "SLUG_EXISTS", "این آدرس آموزش قبلاً ثبت شده است.")
        item.slug = slug
        session.add(item)
        session.flush()
        revision = create_revision(session, item, data, admin.id)
        audit(
            session,
            request,
            "content.updated" if entity_id else "content.created",
            admin.id,
            item.id,
            {"revision_no": revision.revision_no},
            "content",
        )
        session.flush()
        return projection(item, revision, True, session)


def publication_checks(session: Session, item: Page, revision: PageRevision, expose=True):
    payload = payload_adapter.validate_python(revision.content_json["payload"])
    headline = payload.question if payload.kind == "faq" else payload.headline
    if payload.kind in ("article", "video", "blog", "series"):
        from app.services.learning import publication_checks as learning_checks

        learning_checks(payload)
    if payload.kind in ("home", "page", "feature", "audience") and payload.document is not None:
        if payload.document.purpose in ("template", "section"):
            expose = False
        nodes = payload.document.all_nodes()
        h1_count = sum(
            node.type == "Hero"
            or (node.type == "Heading" and node.props.level == 1)
            or (node.type == "LegacySection" and node.props.legacy_section["type"] == "hero")
            for node in nodes
        )
        expected_h1 = 1 if payload.kind in ("home", "feature", "audience") else 0
        if h1_count != expected_h1 and not (
            payload.kind == "page"
            and payload.document.purpose in ("page", "template")
            and h1_count <= 1
        ):
            raise ApiProblem(
                422,
                "HEADING_STRUCTURE",
                "تیتر اصلی باید یکتا باشد. خانه و معرفی محصول/مخاطب یک H1 دارند؛ "
                "برگه بدون H1 از مشخصات خود تیتر می‌گیرد.",
            )
        if not nodes:
            raise ApiProblem(422, "INCOMPLETE_CONTENT", "سند صفحه خالی است.")
        if payload.kind != "page" and payload.document.purpose != "page":
            raise ApiProblem(422, "INVALID_PURPOSE", "صفحهٔ خانه باید برگهٔ عمومی بماند.")
        for node in nodes:
            if node.type in ("Hero", "Heading") and not node.props.title.strip():
                raise ApiProblem(422, "INCOMPLETE_WIDGET", "عنوان ویجت را کامل کنید.")
            if (
                node.type == "LegacySection"
                and node.props.legacy_section["type"] == "hero"
                and not node.props.legacy_section["title"].strip()
            ):
                raise ApiProblem(422, "INCOMPLETE_WIDGET", "عنوان اصلی بخش موجود را کامل کنید.")
            references = (
                [("feature", node.props.feature_slug)]
                if node.type in ("FeatureStory", "ProductShowcase")
                else [("faq", slug) for slug in node.props.faq_slugs]
                if node.type == "FAQ"
                else []
            )
            for kind, slug in references:
                try:
                    get_public(session, (kind,), slug)
                except ApiProblem as error:
                    if error.status == 404:
                        raise ApiProblem(
                            422, "UNRESOLVED_WIDGET", "مرجع ویجت باید محتوای منتشرشده و موجود باشد."
                        ) from None
                    raise
            if node.type == "Video" and not node.props.aparat_id:
                raise ApiProblem(422, "INCOMPLETE_WIDGET", "شناسهٔ ویدیوی آپارات را کامل کنید.")
            if node.type == "Image" and not node.props.media_id:
                raise ApiProblem(422, "INCOMPLETE_WIDGET", "تصویر را از رسانه‌ها انتخاب کنید.")
            if payload.document.purpose in ("header", "footer") and node.type in (
                "Hero",
                "DemoForm",
                "ContactForm",
            ):
                raise ApiProblem(
                    422, "INVALID_SITE_PART", "تیتر اصلی و فرم درخواست باید داخل برگه باشند."
                )
        if item.published_revision_id:
            old = session.get(PageRevision, item.published_revision_id)
            old_doc = old.content_json.get("payload", {}).get("document") or {}
            if old_doc.get("purpose", "page") != payload.document.purpose:
                raise ApiProblem(
                    409, "PURPOSE_IMMUTABLE", "کاربرد برگهٔ منتشرشده تغییر نمی‌کند؛ برگهٔ تازه بسازید."
                )
    if not headline.strip() or (
        payload.kind == "home"
        and payload.document is None
        and not next(s.title for s in payload.sections if s.type == "hero").strip()
    ):
        raise ApiProblem(422, "INCOMPLETE_CONTENT", "عنوان عمومی محتوا نباید خالی باشد.")
    if (
        payload.kind == "feature"
        and payload.readiness != "roadmap"
        and not payload.evidence_reference.strip()
    ):
        raise ApiProblem(
            422, "EVIDENCE_REQUIRED", "برای امکانات آماده یا بخشی آماده، مرجع تأیید محصول لازم است."
        )
    for media in session.scalars(
        select(MediaAsset)
        .join(RevisionMediaRef, RevisionMediaRef.media_id == MediaAsset.id)
        .where(RevisionMediaRef.revision_id == revision.id)
        .with_for_update()
    ):
        if not media.alt_text.strip():
            raise ApiProblem(422, "ALT_REQUIRED", "متن جایگزین تصویر را ثبت کنید.")
        if expose and revision.content_json.get("visibility", True):
            media.visibility = "public"
    revision.reviewed_at = now_utc()


def restore_revision(
    request: Request, session: Session, resource: str, entity_id: UUID, revision_id: UUID
):
    """Create a new working snapshot; published content and all historical data remain intact."""
    with session.begin():
        admin = authorize(request, session, True)
        item = entity(session, resource, entity_id, True)
        expected_version(request, item.row_version)
        if item.is_archived:
            raise ApiProblem(409, "ARCHIVED", "محتوای بایگانی‌شده قابل بازیابی برای ویرایش نیست.")
        previous = session.get(PageRevision, revision_id)
        if not previous or previous.page_id != item.id:
            raise ApiProblem(404, "NOT_FOUND", "نسخه یافت نشد.")
        data = ContentInput(
            slug=item.slug.split(":", 1)[-1],
            title=previous.title,
            payload=previous.content_json["payload"],
            seo=previous.seo_json,
            visibility=previous.content_json.get("visibility", True),
            sort_order=previous.content_json.get("sort_order", 0),
            category_id=previous.category_id,
        )
        revision = create_revision(session, item, data, admin.id)
        item.row_version += 1
        audit(
            session,
            request,
            "content.restored_to_draft",
            admin.id,
            item.id,
            {"source_revision_id": str(revision_id), "revision_no": revision.revision_no},
            "content",
        )
        session.flush()
        return projection(item, revision, True, session)


def transition(
    request: Request,
    session: Session,
    resource: str,
    entity_id: UUID,
    action: str,
    revision_id: UUID | None = None,
    publish_at: datetime | None = None,
):
    with session.begin():
        admin = authorize(request, session, True)
        item = entity(session, resource, entity_id, True)
        expected_version(request, item.row_version)
        if item.is_archived:
            raise ApiProblem(409, "ARCHIVED", "محتوا بایگانی شده است.")
        if action in ("publish", "schedule"):
            revision = session.scalar(
                select(PageRevision).where(
                    PageRevision.id == revision_id, PageRevision.page_id == item.id
                )
            )
            if not revision:
                raise ApiProblem(404, "NOT_FOUND", "نسخه یافت نشد.")
            # Scheduling validates references but must not expose its private media early.
            if action == "schedule":
                if not publish_at or publish_at <= now_utc():
                    raise ApiProblem(422, "INVALID_SCHEDULE", "زمان انتشار باید در آینده باشد.")
                publication_checks(session, item, revision, False)
                revision.published_at = publish_at.astimezone(UTC)
                item.scheduled_revision_id, item.scheduled_at = (
                    revision.id,
                    publish_at.astimezone(UTC),
                )
            else:
                publication_checks(session, item, revision)
                revision.published_at = now_utc()
                item.published_revision_id = revision.id
                item.scheduled_revision_id = item.scheduled_at = None
        elif action == "cancel-schedule":
            item.scheduled_revision_id = item.scheduled_at = None
        elif action in ("unpublish", "archive"):
            item.published_revision_id = item.scheduled_revision_id = item.scheduled_at = None
            item.is_archived = action == "archive"
        item.row_version += 1
        audit(
            session,
            request,
            f"content.{action}",
            admin.id,
            item.id,
            {"revision_id": str(revision_id) if revision_id else None},
            "content",
        )
        session.flush()
        return projection(item, session.get(PageRevision, item.working_revision_id), True, session)
