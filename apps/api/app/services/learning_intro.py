"""A narrowly scoped, immutable copy refresh; never overwrite an editor revision."""

from sqlalchemy import select

from app.models import Page, PageRevision
from app.schemas.cms import ContentInput
from app.services.auth import audit, now_utc
from app.services.cms import create_revision, publication_checks

INTRO = "راهنماهای متنی، ویدیو و مجموعه‌های آموزشی استفاده از ماکان"
OLD = INTRO + "؛ هنوز مطلبی منتشر نشده است."
NEW = INTRO + "."


def refresh_intro(session):
    page = session.scalar(select(Page).where(Page.slug == "page:learn").with_for_update())
    if (
        not page
        or page.row_version != 1
        or page.is_archived
        or page.scheduled_revision_id
        or page.working_revision_id != page.published_revision_id
    ):
        return False
    revision = session.get(PageRevision, page.working_revision_id)
    if (
        not revision
        or revision.created_by is not None
        or revision.revision_no != 1
        or revision.content_json["payload"].get("summary") != OLD
    ):
        return False
    payload = dict(revision.content_json["payload"])
    payload["summary"] = NEW
    seo = dict(revision.seo_json)
    if seo.get("description") == OLD:
        seo["description"] = NEW
    data = ContentInput(
        slug="learn",
        title=revision.title,
        payload=payload,
        seo=seo,
        visibility=revision.content_json.get("visibility", True),
        sort_order=revision.content_json.get("sort_order", 0),
    )
    changed = create_revision(session, page, data, None)
    publication_checks(session, page, changed)
    changed.published_at = now_utc()
    page.published_revision_id = changed.id
    page.row_version += 1
    audit(
        session,
        None,
        "content.learning-intro-refreshed",
        None,
        page.id,
        {"previous_revision": str(revision.id)},
        "content",
    )
    return True
