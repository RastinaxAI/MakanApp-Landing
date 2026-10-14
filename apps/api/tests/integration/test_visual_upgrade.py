from copy import deepcopy

import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Page, PageRevision
from app.schemas.cms import ContentInput
from app.services import cms
from app.services.content_import import import_initial
from app.services.visual_upgrade import upgrade
from tests.integration.test_phone_otp import phone_context as phone_context

pytestmark = pytest.mark.integration


def test_visual_conversion_preserves_all_original_fields_ids_urls_and_old_revisions(phone_context):
    _, engine, _, _ = phone_context
    with Session(engine) as session, session.begin():
        assert import_initial(session) == 26
        old = {
            str(page.id): {
                "slug": page.slug,
                "revision": str(revision.id),
                "title": revision.title,
                "seo": deepcopy(revision.seo_json),
                "content": deepcopy(revision.content_json),
            }
            for page, revision in session.execute(
                select(Page, PageRevision).join(
                    PageRevision, PageRevision.id == Page.published_revision_id
                )
            )
        }
    with Session(engine) as session, session.begin():
        result = upgrade(session)
        assert len(result["upgraded"]) > 8
    with Session(engine) as session, session.begin():
        for page, revision in session.execute(
            select(Page, PageRevision).join(
                PageRevision, PageRevision.id == Page.published_revision_id
            )
        ):
            previous = old[str(page.id)]
            assert page.slug == previous["slug"]
            assert revision.title == previous["title"]
            assert revision.seo_json == previous["seo"]
            assert (
                session.get(PageRevision, previous["revision"]).content_json == previous["content"]
            )
            current = deepcopy(revision.content_json)
            original = deepcopy(previous["content"])
            if current["payload"]["kind"] != "faq":
                assert current["payload"]["document"]["schema_version"] == 2
                current["payload"].pop("document", None)
                original["payload"].pop("document", None)
            assert current == original
            kind, slug = page.slug.split(":", 1)
            assert cms.get_public(session, (kind,), slug).id == page.id
        assert upgrade(session)["upgraded"] == []


def test_visual_conversion_leaves_existing_working_drafts_and_publication_pointers_untouched(
    phone_context,
):
    _, engine, _, _ = phone_context
    with Session(engine) as session, session.begin():
        import_initial(session)
        page = session.scalar(select(Page).where(Page.slug == "page:about"))
        original = session.get(PageRevision, page.working_revision_id)
        data = ContentInput(
            slug="about",
            title="پیش‌نویس مستقل",
            payload=original.content_json["payload"],
            seo=original.seo_json,
        )
        draft = cms.create_revision(session, page, data, None)
        identifier, public_id, draft_id = page.id, page.published_revision_id, draft.id
    with Session(engine) as session, session.begin():
        result = upgrade(session)
        assert str(identifier) in result["skipped"]
        page = session.get(Page, identifier)
        assert page.published_revision_id == public_id
        assert page.working_revision_id == draft_id
