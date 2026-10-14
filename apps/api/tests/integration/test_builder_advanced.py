import pytest
from sqlalchemy.orm import Session

from app.main import create_app
from app.schemas.cms import ContentQuery
from app.services import cms
from tests.client import api_client
from tests.integration.test_cms import document, write
from tests.integration.test_phone_otp import enter
from tests.integration.test_phone_otp import phone_context as phone_context

pytestmark = [pytest.mark.integration, pytest.mark.anyio]


def part(slug="site-header", purpose="header", title="درخواست دمو"):
    value = document(slug)
    value["seo"] = {"indexable": True}
    value["payload"]["document"] = {
        "purpose": purpose,
        "nodes": [{"id": "link_1", "type": "Button", "props": {"label": title, "href": "/demo"}}],
    }
    return value


async def publish(client, row):
    response = await write(
        client,
        f"content/{row['id']}/publish",
        {"revision_id": row["revision_id"]},
        row["row_version"],
    )
    assert response.status_code == 200, response.text
    return response.json()


async def test_library_site_parts_preserve_published_snapshot_and_private_routes(phone_context):
    config, engine, _, _ = phone_context
    async with api_client(create_app(config)) as client:
        assert (await client.get("/api/v1/admin/builder/library")).status_code == 401
        assert (await client.get("/api/v1/site/builder")).json()["header"] is None
        await enter(client)
        row = (await write(client, "content", part())).json()
        row = await publish(client, row)
        assert (await client.get("/api/v1/pages/site-header")).status_code == 404
        with Session(engine) as session:
            assert (
                cms.page_list(session, ContentQuery(), "pages", public=True)["pagination"]["total"]
                == 0
            )
        settings = (await client.get("/api/v1/admin/builder/settings")).json()
        version = settings.pop("row_version")
        settings["header_page_id"] = row["id"]
        response = await write(client, "builder/settings", settings, version, "PATCH")
        assert response.status_code == 200, response.text
        assert (
            await write(client, "builder/settings", settings, version, "PATCH")
        ).status_code == 409
        public = (await client.get("/api/v1/site/builder")).json()
        assert public["header"]["revision_id"] == row["revision_id"]
        assert "created_by" not in public["header"]
        data = part(title="پیش‌نویس تازه")
        updated = await write(client, f"content/{row['id']}", data, row["row_version"], "PATCH")
        assert updated.status_code == 200
        assert (await client.get("/api/v1/site/builder")).json()["header"]["revision_id"] == row[
            "revision_id"
        ]
        library = (await client.get("/api/v1/admin/builder/library?purpose=header")).json()
        assert library["pagination"]["total"] == 1
        assert (
            library["items"][0]["payload"]["document"]["nodes"][0]["props"]["label"]
            == "پیش‌نویس تازه"
        )
        client.cookies.clear()
        await enter(client, "09120000002")
        assert (await client.get("/api/v1/admin/builder/library")).status_code == 200
        assert (await write(client, "builder/settings", settings, 2, "PATCH")).status_code == 403


async def test_builder_clipboard_validation_and_incomplete_widget_publication(phone_context):
    config, _, _, _ = phone_context
    async with api_client(create_app(config)) as client:
        await enter(client)
        sanitized = await write(
            client,
            "builder/validate",
            {
                "nodes": [
                    {
                        "id": "text",
                        "type": "RichText",
                        "props": {"body_html": '<p onclick="bad()">متن</p><script>bad()</script>'},
                    }
                ]
            },
        )
        assert sanitized.status_code == 200
        assert sanitized.json()["nodes"][0]["props"]["body_html"] == "<p>متن</p>"
        unsafe = {
            "nodes": [
                {
                    "id": "text",
                    "type": "RichText",
                    "styles": {"base": {"width": "expression(alert(1))"}},
                }
            ]
        }
        assert (await write(client, "builder/validate", unsafe)).status_code == 422
        for kind, props in (
            ("Video", {}),
            ("Image", {}),
            ("FeatureStory", {"feature_slug": "missing"}),
            ("FAQ", {"faq_slugs": ["missing"]}),
        ):
            data = document("incomplete-" + kind.lower())
            data["payload"]["document"] = {
                "nodes": [{"id": "widget", "type": kind, "props": props}]
            }
            created = await write(client, "content", data)
            assert created.status_code == 201, created.text
            row = created.json()
            response = await write(
                client,
                f"content/{row['id']}/publish",
                {"revision_id": row["revision_id"]},
                row["row_version"],
            )
            assert response.status_code == 422, response.text
            assert (await client.get(f"/api/v1/pages/{data['slug']}")).status_code == 404


async def test_site_part_binding_requires_publication_correct_role_and_safe_globals(phone_context):
    config, _, _, _ = phone_context
    async with api_client(create_app(config)) as client:
        await enter(client)
        row = (await write(client, "content", part(purpose="section"))).json()
        settings = (await client.get("/api/v1/admin/builder/settings")).json()
        version = settings.pop("row_version")
        settings["header_page_id"] = row["id"]
        assert (
            await write(client, "builder/settings", settings, version, "PATCH")
        ).status_code == 422
        await publish(client, row)
        assert (
            await write(client, "builder/settings", settings, version, "PATCH")
        ).status_code == 422
        settings["header_page_id"] = None
        settings["globals"]["colors"]["brand"] = "red;position:fixed"
        assert (
            await write(client, "builder/settings", settings, version, "PATCH")
        ).status_code == 422


async def test_published_template_does_not_expose_private_media(phone_context, tmp_path):
    from io import BytesIO

    from PIL import Image

    config, _, _, _ = phone_context
    config = config.model_copy(update={"media_root": tmp_path})
    async with api_client(create_app(config)) as client:
        await enter(client)
        image = BytesIO()
        Image.new("RGB", (24, 24), "blue").save(image, "PNG")
        uploaded = await write(
            client,
            "media",
            {"alt_text": "تصویر خصوصی قالب"},
            files={"file": ("private.png", image.getvalue(), "image/png")},
        )
        assert uploaded.status_code == 201
        media_id = uploaded.json()["id"]
        data = part("private-template", "template")
        data["payload"]["document"]["nodes"] = [
            {"id": "image", "type": "Image", "props": {"media_id": media_id}}
        ]
        row = (await write(client, "content", data)).json()
        await publish(client, row)
        assert (await client.get(f"/api/v1/media/{media_id}/file")).status_code == 404
        assert (await client.get(f"/api/v1/admin/media/{media_id}/file")).status_code == 200
