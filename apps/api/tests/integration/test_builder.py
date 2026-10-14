from io import BytesIO

import pytest
from PIL import Image
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.main import create_app
from app.models import Page, PageRevision, RevisionMediaRef
from tests.client import api_client
from tests.integration.test_cms import document, write
from tests.integration.test_phone_otp import enter
from tests.integration.test_phone_otp import phone_context as phone_context

pytestmark = [pytest.mark.integration, pytest.mark.anyio]


def visual_document(media_id=None):
    return {
        "schema_version": 2,
        "nodes": [
            {
                "id": "container_1",
                "type": "Container",
                "styles": {
                    "base": {"display": "grid", "columns": 2, "gap": 24},
                    "mobile": {"columns": 1},
                },
                "children": [
                    {
                        "id": "heading_1",
                        "type": "Heading",
                        "props": {"title": "عنوان بصری", "level": 2},
                    },
                    {"id": "image_1", "type": "Image", "props": {"media_id": media_id}},
                    {"id": "form_1", "type": "DemoForm"},
                    {
                        "id": "tabs_1",
                        "type": "Tabs",
                        "props": {
                            "items": [
                                {
                                    "title": "تب اول",
                                    "heading": "تیتر تب",
                                    "eyebrow": "عنوان کوتاه",
                                    "text": "متن مستقل",
                                    "media_id": media_id,
                                    "body_html": (
                                        '<p onclick="bad()">محتوا</p><script>bad()</script>'
                                    ),
                                }
                            ]
                        },
                    },
                ],
            }
        ],
    }


async def test_visual_save_reload_publish_restore_preserves_legacy_and_media(
    phone_context, tmp_path
):
    config, engine, _, _ = phone_context
    config = config.model_copy(update={"media_root": tmp_path})
    async with api_client(create_app(config)) as client:
        await enter(client)
        created = (await write(client, "content", document("visual-flow"))).json()
        identifier, legacy_revision = created["id"], created["revision_id"]
        published = (
            await write(
                client,
                f"content/{identifier}/publish",
                {"revision_id": legacy_revision},
                created["row_version"],
            )
        ).json()
        output = BytesIO()
        Image.new("RGB", (36, 24), "blue").save(output, "PNG")
        uploaded = await write(
            client,
            "media",
            {"alt_text": "تصویر آزمون واقعی"},
            files={"file": ("test.png", output.getvalue(), "image/png")},
        )
        assert uploaded.status_code == 201
        media_id = uploaded.json()["id"]
        data = document("visual-flow")
        data["payload"]["document"] = visual_document(media_id)
        changed = await write(
            client, f"content/{identifier}", data, published["row_version"], "PATCH"
        )
        assert changed.status_code == 200
        working = changed.json()
        reloaded = (await client.get(f"/api/v1/admin/content/{identifier}")).json()
        assert (
            reloaded["payload"]["document"]["nodes"][0]["children"][0]["props"]["title"]
            == "عنوان بصری"
        )
        assert reloaded["payload"]["document"]["nodes"][0]["styles"]["mobile"] == {"columns": 1}
        tab = reloaded["payload"]["document"]["nodes"][0]["children"][3]["props"]["items"][0]
        assert tab["heading"] == "تیتر تب"
        assert tab["eyebrow"] == "عنوان کوتاه"
        assert tab["media_id"] == media_id
        assert tab["body_html"] == "<p>محتوا</p>"
        assert (await client.get("/api/v1/pages/visual-flow")).json()["payload"].get(
            "document"
        ) is None
        assert (await client.get(f"/api/v1/media/{media_id}/file")).status_code == 404
        visual = (
            await write(
                client,
                f"content/{identifier}/publish",
                {"revision_id": working["revision_id"]},
                working["row_version"],
            )
        ).json()
        assert (await client.get("/api/v1/pages/visual-flow")).json()["payload"]["document"][
            "schema_version"
        ] == 2
        assert (await client.get(f"/api/v1/media/{media_id}/file")).status_code == 200
        restored = await write(
            client,
            f"content/{identifier}/revisions/{legacy_revision}/restore",
            version=visual["row_version"],
        )
        assert restored.status_code == 200
        restored = restored.json()
        assert restored["revision_id"] != legacy_revision
        assert restored["published_revision_id"] == visual["published_revision_id"]
        assert restored["payload"].get("document") is None
        assert (await client.get("/api/v1/pages/visual-flow")).json()["payload"]["document"]
        stale = await write(
            client,
            f"content/{identifier}/revisions/{legacy_revision}/restore",
            version=visual["row_version"],
        )
        assert stale.status_code == 409
        with Session(engine) as session:
            assert (
                session.scalar(
                    select(func.count())
                    .select_from(PageRevision)
                    .where(PageRevision.page_id == identifier)
                )
                == 3
            )
            assert session.scalar(select(func.count()).select_from(RevisionMediaRef)) == 1
            assert session.get(Page, identifier).slug == "page:visual-flow"


async def test_builder_server_validation_rbac_and_publication_heading_rules(phone_context):
    config, engine, _, _ = phone_context
    async with api_client(create_app(config)) as client:
        await enter(client, "09120000002")
        data = document("builder-validation")
        data["payload"]["document"] = visual_document()
        initial = (await write(client, "content", data)).json()
        data["payload"]["document"]["nodes"][0]["children"][0]["props"]["level"] = 1
        data["payload"]["document"]["nodes"][0]["children"].append(
            {"id": "another_heading", "type": "Heading", "props": {"title": "دوم", "level": 1}}
        )
        saved = await write(
            client, f"content/{initial['id']}", data, initial["row_version"], "PATCH"
        )
        assert saved.status_code == 200
        result = await write(
            client,
            f"content/{initial['id']}/publish",
            {"revision_id": saved.json()["revision_id"]},
            saved.json()["row_version"],
        )
        assert result.status_code == 422
        assert result.json()["error"]["code"] == "HEADING_STRUCTURE"
        data["payload"]["document"]["nodes"][0]["styles"]["base"]["background"] = (
            "url(https://evil.test)"
        )
        assert (await write(client, "content", data)).status_code == 422
        client.cookies.clear()
        assert (await client.get(f"/api/v1/admin/content/{initial['id']}")).status_code == 401
        with Session(engine) as session:
            assert session.scalar(select(func.count()).select_from(Page)) == 1
