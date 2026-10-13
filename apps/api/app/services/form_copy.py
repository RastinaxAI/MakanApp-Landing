"""Refresh only the exact untouched system copy, retaining immutable history."""

import json
from pathlib import Path

from sqlalchemy import select

from app.models import Page, PageRevision
from app.schemas.cms import ContentInput
from app.services.auth import audit, now_utc
from app.services.cms import create_revision, publication_checks


def refresh_form_copy(session):
    upgrades = json.loads(
        (Path(__file__).parents[1] / "data/form-copy-upgrade.json").read_text(encoding="utf-8")
    )
    changed = 0
    for item in upgrades:
        page = session.scalar(
            select(Page).where(Page.slug == "page:" + item["slug"]).with_for_update()
        )
        if (
            not page
            or page.row_version != 1
            or page.is_archived
            or page.scheduled_revision_id
            or page.working_revision_id != page.published_revision_id
        ):
            continue
        revision = session.get(PageRevision, page.working_revision_id)
        if (
            not revision
            or revision.created_by is not None
            or revision.revision_no != 1
            or ContentInput(
                slug=item["slug"], title=revision.title, payload=revision.content_json["payload"]
            ).payload.model_dump(mode="json")
            != ContentInput(**item["old"]).payload.model_dump(mode="json")
        ):
            continue
        data = ContentInput(**item["new"])
        updated = create_revision(session, page, data, None)
        publication_checks(session, page, updated)
        updated.published_at = now_utc()
        page.published_revision_id = updated.id
        page.row_version += 1
        audit(
            session,
            None,
            "content.form-policy-refreshed",
            None,
            page.id,
            {"previous_revision": str(revision.id), "consent_version": "2026-10-13-v1"},
            "content",
        )
        changed += 1
    return changed
