import json
from pathlib import Path

from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.models import FaqCategory, Page, SiteSetting
from app.schemas.cms import ContentInput, SettingsInput
from app.services.auth import audit, now_utc
from app.services.cms import create_revision, key, publication_checks


def import_initial(session: Session) -> int:
    manifest = json.loads(
        (Path(__file__).resolve().parents[1] / "data/initial-marketing.json").read_text(
            encoding="utf-8"
        )
    )
    session.execute(text("SELECT pg_advisory_xact_lock(74120601)"))
    for value in manifest["categories"]:
        if not session.scalar(select(FaqCategory.id).where(FaqCategory.slug == value["slug"])):
            session.add(FaqCategory(**value))
    session.flush()
    category_id = session.scalar(select(FaqCategory.id).where(FaqCategory.slug == "general"))
    count = 0
    for value in manifest["records"]:
        data = ContentInput.model_validate(value)
        slug = key(data.payload.kind, data.slug)
        if session.scalar(select(Page.id).where(Page.slug == slug)):
            continue
        if data.payload.kind == "faq":
            data.category_id = category_id
        item = Page(slug=slug, page_type=data.payload.kind)
        session.add(item)
        session.flush()
        revision = create_revision(session, item, data, None)
        publication_checks(session, item, revision)
        revision.published_at = now_utc()
        item.published_revision_id = revision.id
        audit(
            session,
            None,
            "content.imported",
            None,
            item.id,
            {"source_commit": manifest["source_commit"]},
            "content",
        )
        count += 1
    defaults = SettingsInput(general={}, seo={})
    for name, value in defaults.model_dump(mode="json").items():
        if not session.get(SiteSetting, name):
            session.add(SiteSetting(key=name, value_json=value))
    session.flush()
    return count
