from datetime import timedelta
from uuid import uuid4

import pytest
from sqlalchemy.orm import Session

from app.main import create_app
from app.models import Page, PageRevision, SiteSetting
from app.services.auth import now_utc
from tests.client import api_client
from tests.integration.test_auth import auth_context as auth_context

pytestmark = [pytest.mark.integration, pytest.mark.anyio]


def seed(engine, origin="https://makan.example", count=1, slug=None):
    with Session(engine) as session, session.begin():
        session.add(SiteSetting(key="general", value_json={"site_url": origin}))
        for i in range(count):
            page = Page(id=uuid4(), slug=f"article:{slug or f'fixture-{i}'}", page_type="article")
            session.add(page)
            session.flush()
            rev = PageRevision(
                page_id=page.id,
                revision_no=1,
                title="Fixture",
                indexable=True,
                seo_json={"indexable": True},
                published_at=now_utc(),
                content_json={"visibility": True, "payload": {"kind": "article"}},
            )
            session.add(rev)
            session.flush()
            page.working_revision_id = page.published_revision_id = rev.id


@pytest.mark.parametrize(
    "enabled,origin,expected",
    [
        (False, "https://makan.example", False),
        (True, None, False),
        (True, "https://makan.example/path", False),
        (True, "https://makan.example", True),
    ],
)
async def test_release_requires_origin_and_flag(auth_context, enabled, origin, expected):
    config, engine, _, _ = auth_context
    seed(engine, origin)
    async with api_client(
        create_app(config.model_copy(update={"seo_indexing_enabled": enabled}))
    ) as client:
        assert (await client.get("/api/v1/seo/status")).json()["enabled"] is expected
        rows = (await client.get("/api/v1/seo/sitemap?group=learning")).json()["items"]
        assert bool(rows) is expected
        assert (await client.get("/api/v1/seo/page?path=/learn/articles/fixture-0")).json()[
            "indexable"
        ] is expected


async def test_draft_schedule_visibility_archive_and_effective_revision(auth_context):
    config, engine, _, _ = auth_context
    seed(engine)
    config = config.model_copy(update={"seo_indexing_enabled": True})
    async with api_client(create_app(config)) as client:

        async def count():
            return len((await client.get("/api/v1/seo/sitemap?group=learning")).json()["items"])

        assert await count() == 1
        with Session(engine) as session, session.begin():
            page = session.query(Page).one()
            rev = PageRevision(
                page_id=page.id,
                revision_no=2,
                title="Private draft",
                indexable=False,
                seo_json={"indexable": False},
                content_json={"visibility": True, "payload": {"kind": "article"}},
            )
            session.add(rev)
            session.flush()
            page.working_revision_id = page.scheduled_revision_id = rev.id
            page.scheduled_at = now_utc() + timedelta(hours=1)
        assert (
            await count() == 1
        )  # Future draft does not replace the published crawl representation.
        with Session(engine) as session, session.begin():
            session.query(Page).one().scheduled_at = now_utc() - timedelta(seconds=1)
        assert await count() == 0
        with Session(engine) as session, session.begin():
            page = session.query(Page).one()
            page.scheduled_revision_id = page.scheduled_at = None
            session.get(PageRevision, page.published_revision_id).content_json = {
                "visibility": False,
                "payload": {"kind": "article"},
            }
        assert await count() == 0
        with Session(engine) as session, session.begin():
            page = session.query(Page).one()
            session.get(PageRevision, page.published_revision_id).content_json = {
                "visibility": True,
                "payload": {"kind": "article"},
            }
            page.is_archived = True
        assert await count() == 0
        for path in (
            "/admin",
            "/learn/articles/fixture-0?x=private",
            "/api/v1/seo/status",
            "/blog/fixture-0",
        ):
            assert not (await client.get("/api/v1/seo/page", params={"path": path})).json()[
                "indexable"
            ]


async def test_crawl_partitions_have_no_100_item_truncation(auth_context):
    config, engine, _, _ = auth_context
    seed(engine, count=1005)
    async with api_client(
        create_app(config.model_copy(update={"seo_indexing_enabled": True}))
    ) as client:
        status = (await client.get("/api/v1/seo/status")).json()
        assert status["counts"] == {"pages": 0, "learning": 1005}
        rows = []
        for shard in range(3):
            rows += (await client.get(f"/api/v1/seo/sitemap?group=learning&shard={shard}")).json()[
                "items"
            ]
        assert len(rows) == len({row["path"] for row in rows}) == 1005
        assert all(row["updated_at"] for row in rows)


async def test_empty_libraries_legal_drafts_unknown_pages_not_indexable(auth_context):
    config, engine, _, _ = auth_context
    with Session(engine) as session, session.begin():
        session.add(SiteSetting(key="general", value_json={"site_url": "https://makan.example"}))
        for slug in ("learn", "blog", "privacy", "design-system", "home"):
            page = Page(slug=f"page:{slug}", page_type="page")
            session.add(page)
            session.flush()
            rev = PageRevision(
                page_id=page.id,
                revision_no=1,
                title=slug,
                indexable=True,
                content_json={
                    "visibility": True,
                    "payload": {"kind": "page", "legal_draft": slug == "privacy"},
                },
            )
            session.add(rev)
            session.flush()
            page.published_revision_id = page.working_revision_id = rev.id
    async with api_client(
        create_app(config.model_copy(update={"seo_indexing_enabled": True}))
    ) as client:
        assert (await client.get("/api/v1/seo/sitemap?group=pages")).json()["items"] == []


async def test_persian_slug_encoded_and_readable_paths_have_same_eligibility(auth_context):
    from urllib.parse import quote

    config, engine, _, _ = auth_context
    slug = "راهنما-آزمون"
    seed(engine, slug=slug)
    path = "/learn/articles/" + slug
    async with api_client(
        create_app(config.model_copy(update={"seo_indexing_enabled": True}))
    ) as client:
        for value in (path, quote(path, safe="/")):
            assert (await client.get("/api/v1/seo/page", params={"path": value})).json()[
                "indexable"
            ]
        assert (await client.get("/api/v1/seo/sitemap?group=learning")).json()["items"][0][
            "path"
        ] == quote(path, safe="/")
