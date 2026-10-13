import pytest

from app.main import create_app
from tests.client import api_client
from tests.integration.test_auth import auth_context as auth_context
from tests.integration.test_cms import sign_in, write
from tests.integration.test_learning import content, create

pytestmark = [pytest.mark.integration, pytest.mark.anyio]


async def test_series_only_category_and_tag_publication_visibility(auth_context):
    config, _, password, _ = auth_context
    async with api_client(create_app(config)) as client:
        await sign_in(client, password)
        category = (
            await write(
                client,
                "learn/categories",
                {"slug": "collection-only", "title": "Collection-only category"},
            )
        ).json()
        tag = (
            await write(client, "learn/tags", {"slug": "collection-tag", "title": "Collection tag"})
        ).json()
        article = await create(client, content("member"), True)
        series = await create(
            client,
            content(
                "category-series",
                kind="series",
                item_ids=[article["id"]],
                category_ids=[category["id"]],
                tag_ids=[tag["id"]],
            ),
        )
        assert (await client.get("/api/v1/learn/categories/collection-only")).status_code == 404
        assert (await client.get("/api/v1/learn/tags")).json()["items"] == []
        assert (
            await write(
                client,
                f"learn/series/{series['id']}/publish",
                {"revision_id": series["revision_id"]},
                1,
            )
        ).status_code == 200
        assert (await client.get("/api/v1/learn/categories/collection-only")).status_code == 200
        assert (await client.get("/api/v1/learn/tags")).json()["items"][0]["id"] == tag["id"]
        assert (
            await client.get("/api/v1/learn/series?category=collection-only&tag=collection-tag")
        ).json()["pagination"]["total"] == 1
        assert (await client.get("/api/v1/learn/contents?category=collection-only")).json()[
            "items"
        ] == []
        assert (
            await write(client, f"learn/series/{series['id']}/unpublish", version=2)
        ).status_code == 200
        assert (await client.get("/api/v1/learn/categories/collection-only")).status_code == 404
