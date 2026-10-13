import asyncio
from datetime import timedelta
from uuid import UUID, uuid4

import pytest
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.main import create_app
from app.models import (
    LearningStats,
    LearningView,
    SeriesItem,
)
from app.services import cms, learning
from app.services.auth import now_utc
from tests.client import api_client
from tests.integration.test_auth import auth_context as auth_context
from tests.integration.test_cms import image_file, sign_in, write

pytestmark = [pytest.mark.integration, pytest.mark.anyio]


def content(slug="article-first", kind="article", **values):
    return {
        "slug": slug,
        "title": slug,
        "payload": {
            "kind": kind,
            "headline": slug,
            "summary": "A verified editorial summary",
            "body_html": "<h2>Start</h2><p>Real isolated database fixture</p>",
            "audiences": ["teacher"],
            **values,
        },
    }


async def create(client, data, publish=False):
    path = (
        "blog/articles"
        if data["payload"]["kind"] == "blog"
        else "learn/series"
        if data["payload"]["kind"] == "series"
        else "learn/contents"
    )
    response = await write(client, path, data)
    assert response.status_code == 201, response.text
    row = response.json()
    if publish:
        response = await write(
            client,
            f"{path}/{row['id']}/publish",
            {"revision_id": row["revision_id"]},
            row["row_version"],
        )
        assert response.status_code == 200, response.text
        row = response.json()
    return row


async def test_learning_auth_draft_preview_publish_version_and_archive(auth_context):
    config, _, password, _ = auth_context
    async with api_client(create_app(config)) as client:
        assert (await client.get("/api/v1/admin/learn/contents")).status_code == 401
        await sign_in(client, password, "sales")
        assert (await write(client, "learn/contents", content())).status_code == 403
        client.cookies.clear()
        await sign_in(client, password, "editor")
        row = await create(client, content())
        path = f"learn/contents/{row['id']}"
        assert (await client.get("/api/v1/learn/contents/article-first")).status_code == 404
        preview = await client.get(f"/api/v1/admin/{path}/preview")
        assert preview.json()["payload"]["toc"][0]["id"] == "section-1"
        assert (
            await write(client, path + "/publish", {"revision_id": row["revision_id"]}, 1)
        ).status_code == 200
        changed = content(headline="Private edit")
        response = await write(client, path, changed, 2, "PATCH")
        assert response.status_code == 200
        assert (await client.get("/api/v1/learn/contents/article-first")).json()["payload"][
            "headline"
        ] == "article-first"
        assert (await write(client, path, changed, 2, "PATCH")).status_code == 409
        assert (await write(client, path, changed, method="PATCH")).status_code == 428
        assert (await client.get(f"/api/v1/admin/{path}/revisions")).json()["pagination"][
            "total"
        ] == 2
        assert (await write(client, path, version=3, method="DELETE")).status_code == 200
        assert (await client.get("/api/v1/learn/contents/article-first")).status_code == 404
        assert (
            await write(client, path + "/publish", {"revision_id": row["revision_id"]}, 4)
        ).status_code == 409


async def test_taxonomy_crud_domain_references_search_filters_and_pagination(auth_context):
    config, _, password, _ = auth_context
    async with api_client(create_app(config)) as client:
        await sign_in(client, password)
        category = (
            await write(
                client, "learn/categories", {"slug": "start", "title": "Start", "domain": "learn"}
            )
        ).json()
        tag = (
            await write(
                client, "learn/tags", {"slug": "begin", "title": "Begin", "domain": "learn"}
            )
        ).json()
        other = (
            await write(
                client, "learn/categories", {"slug": "start", "title": "Blog", "domain": "blog"}
            )
        ).json()
        assert (await client.get("/api/v1/learn/categories")).json()["items"] == []
        assert (
            await write(client, "learn/contents", content(category_ids=[other["id"]]))
        ).status_code == 422
        assert (
            await write(client, "learn/contents", content(category_ids=[str(uuid4())]))
        ).status_code == 422
        for slug in ("filter-a", "filter-b", "filter-c"):
            await create(
                client, content(slug, category_ids=[category["id"]], tag_ids=[tag["id"]]), True
            )
        await create(client, content("hidden", category_ids=[other["id"]], kind="blog"))
        await create(client, content("blog-published", kind="blog"), True)
        result = (
            await client.get(
                "/api/v1/learn/contents?type=article&audience=teacher&level=beginner&topic=getting-started&category=start&tag=begin&q=editorial&page_size=2"
            )
        ).json()
        assert result["pagination"]["total"] == 3 and len(result["items"]) == 2
        assert all(row["kind"] == "article" for row in result["items"])
        assert (await client.get("/api/v1/learn/contents?audience=parent")).json()["pagination"][
            "total"
        ] == 0
        assert (await client.get("/api/v1/learn/contents?q=%25")).json()["pagination"]["total"] == 0
        assert (await client.get("/api/v1/blog/articles")).json()["pagination"]["total"] == 1
        assert (await client.get("/api/v1/learn/categories/start")).status_code == 200
        assert (await client.get("/api/v1/learn/categories?domain=blog")).json()["items"] == []
        assert (
            await write(client, f"learn/categories/{category['id']}", method="DELETE")
        ).status_code == 409
        assert (await write(client, f"learn/tags/{tag['id']}", method="DELETE")).status_code == 409
        assert (
            await write(
                client,
                f"learn/categories/{category['id']}",
                {"slug": "changed", "title": "changed", "domain": "learn"},
                method="PATCH",
            )
        ).status_code == 409
        updated = await write(
            client,
            f"learn/categories/{category['id']}",
            {"slug": "start", "title": "Renamed", "domain": "learn", "sort_order": 4},
            method="PATCH",
        )
        assert updated.status_code == 200
        unused = (await write(client, "learn/tags", {"slug": "unused", "title": "Unused"})).json()
        assert (
            await write(client, f"learn/tags/{unused['id']}", method="DELETE")
        ).status_code == 204
        assert (await client.get("/api/v1/learn/contents?page_size=101")).status_code == 422


async def test_video_validation_sanitization_inline_media_and_public_release(
    auth_context, tmp_path
):
    config, _, password, _ = auth_context
    config = config.model_copy(update={"media_root": str(tmp_path)})
    async with api_client(create_app(config)) as client:
        await sign_in(client, password)
        image = (
            await write(
                client,
                "media",
                {"alt_text": "True poster"},
                files={"file": ("cover.png", image_file(), "image/png")},
            )
        ).json()
        row = await create(
            client, content("video", kind="video", aparat_id="https://www.aparat.com/v/abc12")
        )
        assert row["payload"]["aparat_id"] == "abc12"
        assert (
            await write(
                client,
                f"learn/contents/{row['id']}/publish",
                {"revision_id": row["revision_id"]},
                1,
            )
        ).status_code == 422
        body = (
            f'<h2>Steps</h2><img src="/api/v1/media/{image["id"]}/file" '
            'onerror="alert(1)"><iframe src="https://evil.test"></iframe>'
            "<script>alert(1)</script>"
        )
        published = await create(
            client,
            content(
                "safe-video",
                kind="video",
                aparat_id="abc12",
                duration_seconds=95,
                cover_media_id=image["id"],
                body_html=body,
                transcript_html="<p>Real transcript</p>",
            ),
            True,
        )
        value = (await client.get("/api/v1/learn/contents/safe-video")).json()
        assert value["payload"]["duration_seconds"] == 95
        assert 'width="24"' in value["payload"]["body_html"]
        assert (
            "script" not in value["payload"]["body_html"]
            and "iframe" not in value["payload"]["body_html"]
        )
        assert (await client.get(f"/api/v1/media/{image['id']}/file")).status_code == 200
        assert (await write(client, f"media/{image['id']}", method="DELETE")).status_code == 409
        assert (
            await write(
                client,
                "learn/contents",
                content("unsafe", kind="video", aparat_id="https://evil.test/v/abc12"),
            )
        ).status_code == 422
        assert (
            await write(client, "learn/contents", content("safe-video", kind="article"))
        ).status_code == 409
        assert published["reviewed_at"]


async def test_mixed_series_reorder_immutable_snapshot_and_private_members(auth_context, tmp_path):
    config, engine, password, _ = auth_context
    config = config.model_copy(update={"media_root": str(tmp_path)})
    async with api_client(create_app(config)) as client:
        await sign_in(client, password)
        image = (
            await write(
                client,
                "media",
                {"alt_text": "Poster"},
                files={"file": ("p.png", image_file(), "image/png")},
            )
        ).json()
        a = await create(client, content("first"), True)
        draft = await create(client, content("private-member"))
        b = await create(
            client,
            content(
                "second",
                kind="video",
                aparat_id="abc12",
                duration_seconds=45,
                cover_media_id=image["id"],
            ),
            True,
        )
        series = await create(
            client,
            content("start-series", kind="series", item_ids=[a["id"], draft["id"], b["id"]]),
            True,
        )
        await create(client, content("related", related_ids=[draft["id"], a["id"]]), True)
        value = (await client.get("/api/v1/learn/series/start-series")).json()
        assert [v["slug"] for v in value["items"]] == ["first", "second"]
        assert "item_ids" not in value["payload"] and "private-member" not in str(value)
        detail = (await client.get("/api/v1/learn/contents/first?series=start-series")).json()
        assert detail["previous"] is None and detail["next"]["slug"] == "second"
        assert (await client.get("/api/v1/learn/contents/related")).json()["related"][0][
            "slug"
        ] == "first"
        changed = content("start-series", kind="series", item_ids=[b["id"], a["id"]])
        response = await write(client, f"learn/series/{series['id']}", changed, 2, "PATCH")
        assert response.status_code == 200
        assert (await client.get("/api/v1/learn/series/start-series")).json()["items"][0][
            "slug"
        ] == "first"
        new = response.json()
        assert (
            await write(
                client,
                f"learn/series/{series['id']}/publish",
                {"revision_id": new["revision_id"]},
                3,
            )
        ).status_code == 200
        assert (await client.get("/api/v1/learn/series/start-series")).json()["items"][0][
            "slug"
        ] == "second"
        assert (
            await write(
                client, "learn/series", content("dup", kind="series", item_ids=[a["id"], a["id"]])
            )
        ).status_code == 422
        with Session(engine) as db:
            assert db.scalar(select(func.count()).select_from(SeriesItem)) == 5
        with pytest.raises(IntegrityError), Session(engine) as db, db.begin():
            db.add(
                SeriesItem(
                    revision_id=UUID(new["revision_id"]), content_id=UUID(draft["id"]), position=0
                )
            )


async def test_scheduled_learning_hides_private_media_and_member_metadata(
    auth_context, tmp_path, monkeypatch
):
    config, _, password, _ = auth_context
    config = config.model_copy(update={"media_root": str(tmp_path)})
    async with api_client(create_app(config)) as client:
        await sign_in(client, password)
        image = (
            await write(
                client,
                "media",
                {"alt_text": "Private image"},
                files={"file": ("p.png", image_file(), "image/png")},
            )
        ).json()
        row = await create(client, content("scheduled", cover_media_id=image["id"]))
        at = now_utc() + timedelta(minutes=5)
        response = await write(
            client,
            f"learn/contents/{row['id']}/schedule",
            {"revision_id": row["revision_id"], "publish_at": at.isoformat()},
            1,
        )
        assert response.status_code == 200
        assert (await client.get("/api/v1/learn/contents/scheduled")).status_code == 404
        assert (await client.get(f"/api/v1/media/{image['id']}/file")).status_code == 404
        monkeypatch.setattr(cms, "now_utc", lambda: at)
        monkeypatch.setattr(learning, "now_utc", lambda: at)
        monkeypatch.setattr("app.services.media.now_utc", lambda: at)
        assert (await client.get("/api/v1/learn/contents/scheduled")).status_code == 200
        assert (await client.get(f"/api/v1/media/{image['id']}/file")).status_code == 200


async def test_featured_zero_one_two_three_and_no_unpublished(auth_context):
    config, _, password, _ = auth_context
    async with api_client(create_app(config)) as client:
        await sign_in(client, password)
        await create(client, content("draft-featured", featured=True))
        assert (await client.get("/api/v1/learn/contents?featured=true&page_size=3")).json()[
            "items"
        ] == []
        for n in range(1, 5):
            await create(client, content(f"featured-{n}", featured=True), True)
            result = (await client.get("/api/v1/learn/contents?featured=true&page_size=3")).json()
            assert len(result["items"]) == min(n, 3)
            assert result["items"][0]["slug"] == f"featured-{n}"


async def test_qualified_views_dwell_bot_signature_origin_dedupe_concurrency_and_popular(
    auth_context, monkeypatch
):
    config, engine, password, _ = auth_context
    config = config.model_copy(update={"analytics_enabled": True})
    async with api_client(create_app(config)) as client:
        await sign_in(client, password)
        row = await create(client, content("watched"), True)
        await create(client, content("newer"), True)
        public = api_client(create_app(config))
        async with public as browser:
            browser.headers["User-Agent"] = "Mozilla/5.0 AcceptanceBrowser"
            endpoint = f"/api/v1/learn/views/{row['id']}"
            ticket = (await browser.get(endpoint + "/ticket")).json()["ticket"]
            headers = {"Origin": "http://testserver"}
            assert (
                await browser.post(
                    endpoint,
                    headers=headers,
                    json={
                        "ticket": ticket,
                        "consent": True,
                        "policy_version": "analytics-2026-10-13-v1",
                    },
                )
            ).status_code == 422
            timestamp = int(ticket.split(".")[0])
            monkeypatch.setattr(learning.time, "time", lambda: timestamp + 21)
            assert (
                await browser.post(
                    endpoint,
                    headers={"Origin": "https://evil.test"},
                    json={
                        "ticket": ticket,
                        "consent": True,
                        "policy_version": "analytics-2026-10-13-v1",
                    },
                )
            ).status_code == 403
            assert (
                await browser.post(
                    endpoint,
                    headers=headers,
                    json={
                        "ticket": ticket[:-1] + "x",
                        "consent": True,
                        "policy_version": "analytics-2026-10-13-v1",
                    },
                )
            ).status_code == 422
            results = await asyncio.gather(
                *[
                    browser.post(
                        endpoint,
                        headers=headers,
                        json={
                            "ticket": ticket,
                            "consent": True,
                            "policy_version": "analytics-2026-10-13-v1",
                        },
                    )
                    for _ in range(4)
                ]
            )
            assert all(r.status_code == 200 for r in results)
            assert sum(r.json()["counted"] for r in results) == 1
            with Session(engine) as db:
                assert db.scalar(select(LearningStats.qualified_views)) == 1
                viewer = db.scalar(select(LearningView))
                assert "Mozilla" not in viewer.viewer_digest and len(viewer.viewer_digest) == 64
            ranked = (await browser.get("/api/v1/learn/contents?sort=popular")).json()
            assert ranked["items"][0]["slug"] == "watched"
            browser.headers["User-Agent"] = "Googlebot"
            assert (await browser.get(endpoint + "/ticket")).status_code == 422
