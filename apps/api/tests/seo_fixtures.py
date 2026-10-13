"""Isolated crawl/Lighthouse fixtures, never imported into the application database."""

from datetime import timedelta
from uuid import uuid4

from PIL import Image
from sqlalchemy import select

from app.models import MediaAsset, Page, PageRevision, SiteSetting
from app.schemas.cms import ContentInput
from app.services import cms
from app.services.auth import now_utc


def seed(session, settings, owner_id):
    general = session.get(SiteSetting, "general")
    general.value_json = {**general.value_json, "site_url": "https://makan.example"}
    for page in session.scalars(
        select(Page).where(Page.page_type.in_(("home", "page", "feature", "audience")))
    ):
        previous = session.get(PageRevision, page.published_revision_id)
        data = ContentInput.model_validate(
            {
                "slug": page.slug.split(":", 1)[-1],
                "title": previous.title,
                "payload": previous.content_json["payload"],
                "visibility": True,
                "seo": {**previous.seo_json, "indexable": True},
            }
        )
        revision = cms.create_revision(session, page, data, None)
        revision.published_at = now_utc()
        page.published_revision_id = revision.id
        page.row_version += 1
    media_id = uuid4()
    settings.media_root.mkdir(parents=True, exist_ok=True)
    filename = f"{media_id.hex}.webp"
    image_path = settings.media_root / filename
    Image.new("RGB", (1200, 675), "#186356").save(image_path, "WEBP")
    import hashlib

    session.add(
        MediaAsset(
            id=media_id,
            storage_key=filename,
            original_filename="seo-fixture.webp",
            mime_type="image/webp",
            size_bytes=image_path.stat().st_size,
            width=1200,
            height=675,
            checksum_sha256=hashlib.sha256(image_path.read_bytes()).hexdigest(),
            alt_text="پوستر آزمون مستقل؛ محتوای محصول نیست",
            visibility="public",
            created_by=owner_id,
        )
    )
    session.flush()
    for kind, slug in (
        ("article", "seo-article"),
        ("video", "seo-video"),
        ("article", "seo-draft"),
        ("article", "seo-future"),
    ):
        page = Page(slug=cms.key(kind, slug), page_type=kind)
        session.add(page)
        session.flush()
        data = ContentInput.model_validate(
            {
                "slug": slug,
                "title": f"آزمون مستقل {slug}",
                "seo": {
                    "title": f"آزمون مستقل {slug}",
                    "description": "محتوای آزمون مستقل پذیرش؛ در سایت اصلی منتشر نمی‌شود.",
                    "indexable": True,
                },
                "payload": {
                    "kind": kind,
                    "headline": f"آزمون مستقل {slug}",
                    "summary": "محتوای مستقل بررسی SEO؛ در سایت اصلی منتشر نمی‌شود.",
                    "audiences": ["teacher"],
                    "body_html": "<h2>راهنمای آزمون</h2><p>"
                    + "این متن برای آزمون رندر، خوانایی و ثبت ابعاد صفحه در محیط مستقل است. " * 35
                    + "</p>",
                    "cover_media_id": str(media_id),
                    "aparat_id": "oda3f7q" if kind == "video" else None,
                    "duration_seconds": 120 if kind == "video" else None,
                    "video_uploaded_at": "2026-10-01T00:00:00Z" if kind == "video" else None,
                },
            }
        )
        revision = cms.create_revision(session, page, data, None)
        if slug == "seo-future":
            page.scheduled_revision_id = revision.id
            page.scheduled_at = revision.published_at = now_utc() + timedelta(hours=1)
        elif slug != "seo-draft":
            cms.publication_checks(session, page, revision)
            revision.published_at = now_utc()
            page.published_revision_id = revision.id
