import asyncio
from datetime import timedelta
from io import BytesIO
from uuid import uuid4

import pytest
from PIL import Image
from sqlalchemy import func, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.main import create_app
from app.models import Page, PageRevision, RevisionMediaRef
from app.services import cms
from app.services.auth import now_utc
from tests.client import api_client
from tests.integration.test_auth import auth_context as auth_context
from tests.integration.test_auth import sign_in as authenticate

pytestmark = [pytest.mark.integration, pytest.mark.anyio]


async def sign_in(client, password, role="owner"):
    response = await authenticate(client, password, role)
    assert response.status_code == 200, response.text
    return response


def document(slug="cms-test", headline="First published text"):
    return {
        "slug": slug,
        "title": headline,
        "payload": {
            "kind": "page",
            "headline": headline,
            "summary": "Real isolated acceptance fixture",
            "sections": [{"type": "rich-text", "title": "Details", "body_html": "<p>Content</p>"}],
        },
    }


async def write(client, path, data=None, version=None, method="POST", files=None):
    token = (await client.get("/api/v1/admin/auth/csrf")).json()["csrf_token"]
    headers = {"Origin": "http://testserver", "X-CSRF-Token": token}
    if version:
        headers["If-Match"] = str(version)
    if files:
        return await client.request(
            method, "/api/v1/admin/" + path, headers=headers, files=files, data=data
        )
    return await client.request(method, "/api/v1/admin/" + path, headers=headers, json=data)


def image_file():
    output = BytesIO()
    Image.new("RGB", (24, 16), "teal").save(output, "PNG")
    return output.getvalue()


async def test_draft_publish_edit_snapshot_revisions_and_archive(auth_context):
    config, engine, password, _ = auth_context
    async with api_client(create_app(config)) as client:
        assert (await client.get("/api/v1/admin/pages")).status_code == 401
        await sign_in(client, password, "sales")
        assert (await client.get("/api/v1/admin/pages")).status_code == 403
        client.cookies.clear()
        await sign_in(client, password, "editor")
        created = await write(client, "pages", document())
        assert created.status_code == 201
        d = created.json()
        eid = d["id"]
        assert (await client.get("/api/v1/pages/cms-test")).status_code == 404
        assert (await client.get(f"/api/v1/admin/pages/{eid}/preview")).status_code == 200
        published = await write(
            client, f"pages/{eid}/publish", {"revision_id": d["revision_id"]}, 1
        )
        assert published.status_code == 200
        assert (await client.get("/api/v1/pages/cms-test")).json()["payload"][
            "headline"
        ] == "First published text"
        changed = await write(
            client, f"pages/{eid}", document(headline="Private second draft"), 2, "PATCH"
        )
        assert changed.status_code == 200
        assert (await client.get("/api/v1/pages/cms-test")).json()["payload"][
            "headline"
        ] == "First published text"
        stale = await write(client, f"pages/{eid}", document(headline="Stale write"), 2, "PATCH")
        assert stale.status_code == 409
        assert (
            await write(
                client, f"pages/{eid}/publish", {"revision_id": changed.json()["revision_id"]}, 3
            )
        ).status_code == 200
        assert (await client.get("/api/v1/pages/cms-test")).json()["payload"][
            "headline"
        ] == "Private second draft"
        revisions = (await client.get(f"/api/v1/admin/pages/{eid}/revisions")).json()
        assert revisions["pagination"]["total"] == 2
        assert (await write(client, f"pages/{eid}/unpublish", version=4)).status_code == 200
        assert (await client.get("/api/v1/pages/cms-test")).status_code == 404
        assert (await write(client, f"pages/{eid}", version=5, method="DELETE")).status_code == 200
        assert (await write(client, f"pages/{eid}", document(), 6, "PATCH")).status_code == 409
        with Session(engine) as db:
            assert db.scalar(select(func.count()).select_from(PageRevision)) == 2


async def test_schedule_boundary_and_immutable_target(auth_context, monkeypatch):
    config, _, password, _ = auth_context
    async with api_client(create_app(config)) as client:
        await sign_in(client, password)
        d = (await write(client, "pages", document())).json()
        eid = d["id"]
        at = now_utc() + timedelta(minutes=2)
        assert (
            await write(
                client,
                f"pages/{eid}/schedule",
                {
                    "revision_id": d["revision_id"],
                    "publish_at": at.replace(tzinfo=None).isoformat(),
                },
                1,
            )
        ).status_code == 422
        assert (
            await write(
                client,
                f"pages/{eid}/schedule",
                {"revision_id": d["revision_id"], "publish_at": at.isoformat()},
                1,
            )
        ).status_code == 200
        assert (
            await write(
                client, f"pages/{eid}", document(headline="Later unscheduled draft"), 2, "PATCH"
            )
        ).status_code == 200
        monkeypatch.setattr(cms, "now_utc", lambda: at - timedelta(microseconds=1))
        assert (await client.get("/api/v1/pages/cms-test")).status_code == 404
        assert (await client.get(f"/api/v1/admin/pages/{eid}")).json()[
            "publication_state"
        ] == "scheduled"
        monkeypatch.setattr(cms, "now_utc", lambda: at)
        assert (await client.get(f"/api/v1/admin/pages/{eid}")).json()[
            "publication_state"
        ] == "published"
        assert (await client.get("/api/v1/pages/cms-test")).json()["payload"][
            "headline"
        ] == "First published text"
        assert (await write(client, f"pages/{eid}/cancel-schedule", version=3)).status_code == 200
        assert (await client.get("/api/v1/pages/cms-test")).status_code == 404


async def test_schema_slug_evidence_and_wrong_revision(auth_context):
    config, _, password, _ = auth_context
    async with api_client(create_app(config)) as client:
        await sign_in(client, password)
        data = document()
        d = (await write(client, "pages", data)).json()
        assert (await write(client, "pages", data)).status_code == 409
        assert (
            await write(client, f"pages/{d['id']}/publish", {"revision_id": str(uuid4())}, 1)
        ).status_code == 404
        assert (await write(client, f"pages/{d['id']}", data, method="PATCH")).status_code == 428
        data["payload"]["unknown"] = "secret"
        assert (await write(client, "pages", data)).status_code == 422
        feature = {
            "slug": "test-feature",
            "title": "Test feature",
            "payload": {
                "kind": "feature",
                "title": "Test feature",
                "eyebrow": "Product",
                "headline": "Feature",
                "summary": "Summary",
                "readiness": "available",
                "benefits": [],
                "workflow": [],
                "boundary": "Access",
                "audience": "schools",
            },
        }
        d = (await write(client, "features", feature)).json()
        assert (
            await write(client, f"features/{d['id']}/publish", {"revision_id": d["revision_id"]}, 1)
        ).status_code == 422
        feature["payload"]["evidence_reference"] = "explicit fixture approval"
        edited = (await write(client, f"features/{d['id']}", feature, 1, "PATCH")).json()
        assert (
            await write(
                client, f"features/{d['id']}/publish", {"revision_id": edited["revision_id"]}, 2
            )
        ).status_code == 200
        public = (await client.get("/api/v1/features/test-feature")).json()
        assert "evidence_reference" not in public["payload"]
        feature["slug"] = "changed-url"
        assert (await write(client, f"features/{d['id']}", feature, 3, "PATCH")).status_code == 409


async def test_sanitization_is_stored_and_invalid_links_rejected(auth_context):
    config, _, password, _ = auth_context
    async with api_client(create_app(config)) as client:
        await sign_in(client, password)
        data = document()
        data["payload"]["sections"][0]["body_html"] = (
            '<script>alert(1)</script><p onclick="x()" style="position:fixed">Safe</p>'
            '<a href="javascript:alert(1)">link</a>'
            '<iframe src="https://evil.example.com"></iframe><svg/onload=alert(1)>'
        )
        d = (await write(client, "pages", data)).json()
        html = d["payload"]["sections"][0]["body_html"]
        assert "Safe" in html and not any(
            x in html for x in ("script", "onclick", "style=", "javascript", "iframe", "svg")
        )
        data["slug"] = "bad-link"
        data["payload"]["sections"][0]["cta_href"] = "//evil.example.com"
        assert (await write(client, "pages", data)).status_code == 422
        data["slug"] = "invalid-html-media"
        data["payload"]["sections"][0]["cta_href"] = "/demo"
        data["payload"]["sections"][0]["body_html"] = (
            '<img src="/api/v1/media/' + "-" * 36 + '/file" alt="Invalid">'
        )
        sanitized = await write(client, "pages", data)
        assert sanitized.status_code == 201
        assert "src=" not in sanitized.json()["payload"]["sections"][0]["body_html"]


async def test_audit_failure_rolls_back_content(auth_context, monkeypatch):
    config, engine, password, _ = auth_context
    async with api_client(create_app(config)) as client:
        await sign_in(client, password)

        def fail(*args, **kwargs):
            raise SQLAlchemyError("private failure")

        monkeypatch.setattr(cms, "audit", fail)
        response = await write(client, "pages", document())
        assert response.status_code == 503 and "private failure" not in response.text
        with Session(engine) as db:
            assert db.scalar(select(func.count()).select_from(Page)) == 0


async def test_concurrent_versions_allow_only_one_write(auth_context):
    config, _, password, _ = auth_context
    async with api_client(create_app(config)) as client:
        await sign_in(client, password)
        d = (await write(client, "pages", document())).json()
        replies = await asyncio.gather(
            *(
                write(client, f"pages/{d['id']}", document(headline=f"Edit {i}"), 1, "PATCH")
                for i in range(2)
            )
        )
        assert sorted(r.status_code for r in replies) == [200, 409]


async def test_concurrent_slug_creation_returns_conflict(auth_context):
    config, _, password, _ = auth_context
    async with api_client(create_app(config)) as client:
        await sign_in(client, password)
        replies = await asyncio.gather(*(write(client, "pages", document()) for _ in range(2)))
        assert sorted(r.status_code for r in replies) == [201, 409]


async def test_faq_category_visibility_and_protected_delete(auth_context):
    config, _, password, _ = auth_context
    async with api_client(create_app(config)) as client:
        await sign_in(client, password)
        category = (
            await write(client, "faq-categories", {"slug": "start", "title": "Getting started"})
        ).json()
        data = {
            "slug": "how",
            "title": "How?",
            "category_id": category["id"],
            "payload": {"kind": "faq", "question": "How?", "answer": "Answer"},
        }
        d = (await write(client, "faqs", data)).json()
        assert (await client.get("/api/v1/faq-categories")).json() == []
        assert (
            await write(client, f"faqs/{d['id']}/publish", {"revision_id": d["revision_id"]}, 1)
        ).status_code == 200
        assert len((await client.get("/api/v1/faq-categories")).json()) == 1
        assert (await client.get("/api/v1/faqs?category_id=" + category["id"])).json()[
            "pagination"
        ]["total"] == 1
        assert (
            await write(client, "faq-categories/" + category["id"], method="DELETE")
        ).status_code == 409


async def test_category_pagination_order_and_page_route_validation(auth_context):
    config, _, password, _ = auth_context
    async with api_client(create_app(config)) as client:
        await sign_in(client, password)
        for i in range(3):
            assert (
                await write(
                    client,
                    "faq-categories",
                    {"slug": f"cat-{i}", "title": f"Category {i}", "sort_order": 2 - i},
                )
            ).status_code == 201
        first = (await client.get("/api/v1/admin/faq-categories?page_size=2")).json()
        second = (await client.get("/api/v1/admin/faq-categories?page=2&page_size=2")).json()
        assert first["pagination"]["total"] == 3 and first["pagination"]["pages"] == 2
        assert [row["slug"] for row in first["items"] + second["items"]] == [
            "cat-2",
            "cat-1",
            "cat-0",
        ]
        assert (await client.get("/api/v1/admin/faq-categories?page_size=101")).status_code == 422
        for slug in ("home", "admin", "api", "design-system"):
            assert (await write(client, "pages", document(slug))).status_code == 422
        data = document()
        data["payload"]["sections"] = [{"type": "hero"}]
        assert (await write(client, "pages", data)).status_code == 422


async def test_blank_public_title_cannot_be_published(auth_context):
    config, _, password, _ = auth_context
    async with api_client(create_app(config)) as client:
        await sign_in(client, password)
        data = document(headline=" ")
        assert (await write(client, "pages", data)).status_code == 422
        data["title"] = "Valid internal title"
        d = (await write(client, "pages", data)).json()
        assert (
            await write(client, f"pages/{d['id']}/publish", {"revision_id": d["revision_id"]}, 1)
        ).status_code == 422
        assert (await client.get("/api/v1/pages/cms-test")).status_code == 404


async def test_settings_rbac_validation_and_stale_version(auth_context):
    config, _, password, _ = auth_context
    async with api_client(create_app(config)) as client:
        await sign_in(client, password, "editor")
        assert (await client.get("/api/v1/admin/settings")).status_code == 403
        assert (
            await write(client, "settings", {"general": {}, "seo": {}}, 1, "PATCH")
        ).status_code == 403
        client.cookies.clear()
        await sign_in(client, password)
        d = {
            "general": {
                "brand_name": "Approved fixture brand",
                "app_url": "https://app.example.com",
            },
            "seo": {"default_title": "Site title"},
        }
        assert (await write(client, "settings", d, 1, "PATCH")).status_code == 200
        assert (await client.get("/api/v1/site/settings")).json()["general"]["brand_name"] == d[
            "general"
        ]["brand_name"]
        assert (await write(client, "settings", d, 1, "PATCH")).status_code == 409
        d["general"]["smtp_password"] = "forbidden"
        assert (await write(client, "settings", d, 2, "PATCH")).status_code == 422


async def test_media_real_file_private_public_and_reference_protection(auth_context, tmp_path):
    config, engine, password, _ = auth_context
    config = config.model_copy(update={"media_root": tmp_path})
    async with api_client(create_app(config)) as client:
        await sign_in(client, password, "editor")
        uploaded = await write(
            client,
            "media",
            {"alt_text": "Uploaded image"},
            files={"file": ("../../unsafe.png", image_file(), "image/png")},
        )
        assert uploaded.status_code == 201
        m = uploaded.json()
        mid = m["id"]
        assert m["width"] == 24 and m["height"] == 16 and m["original_filename"] == "unsafe.png"
        assert (await client.get(f"/api/v1/media/{mid}/file")).status_code == 404
        private = await client.get(f"/api/v1/admin/media/{mid}/file")
        assert private.status_code == 200
        assert Image.open(BytesIO(private.content)).format == "WEBP"
        data = document()
        data["payload"]["sections"][0]["media_id"] = mid
        data["visibility"] = False
        d = (await write(client, "pages", data)).json()
        assert (await write(client, f"media/{mid}", method="DELETE")).status_code == 409
        assert (
            await write(client, f"pages/{d['id']}/publish", {"revision_id": d["revision_id"]}, 1)
        ).status_code == 200
        assert (await client.get("/api/v1/pages/cms-test")).status_code == 404
        assert (await client.get(f"/api/v1/media/{mid}/file")).status_code == 404
        data["visibility"] = True
        changed = (await write(client, f"pages/{d['id']}", data, 2, "PATCH")).json()
        assert (
            await write(
                client, f"pages/{d['id']}/publish", {"revision_id": changed["revision_id"]}, 3
            )
        ).status_code == 200
        with Session(engine) as db:
            assert db.scalar(select(func.count()).select_from(RevisionMediaRef)) == 2
    # Recreate the API process with the same storage, rather than an in-memory file mock.
    async with api_client(create_app(config)) as client:
        assert (await client.get(f"/api/v1/media/{mid}/file")).status_code == 200
        assert (await client.get(f"/api/v1/admin/media/{mid}/file")).status_code == 401


async def test_media_spoof_size_svg_and_unused_delete(auth_context, tmp_path):
    config, _, password, _ = auth_context
    config = config.model_copy(update={"media_root": tmp_path})
    async with api_client(create_app(config)) as client:
        await sign_in(client, password)
        for body, mime in [
            (image_file(), "image/jpeg"),
            (b'<svg onload="alert(1)"></svg>', "image/png"),
        ]:
            assert (
                await write(
                    client, "media", {"alt_text": "Image"}, files={"file": ("x.png", body, mime)}
                )
            ).status_code == 415
        assert (
            await write(
                client,
                "media",
                {"alt_text": "Image"},
                files={"file": ("x.png", b"x" * (5 * 1024 * 1024 + 1), "image/png")},
            )
        ).status_code == 413
        d = (
            await write(
                client,
                "media",
                {"alt_text": "Image"},
                files={"file": ("x.png", image_file(), "image/png")},
            )
        ).json()
        assert (await write(client, "media/" + d["id"], method="DELETE")).status_code == 204
        assert list(tmp_path.iterdir()) == []


async def test_authored_import_is_idempotent_and_preserves_admin_edits(auth_context):
    from app.services.content_import import import_initial

    config, engine, password, _ = auth_context
    with Session(engine) as db, db.begin():
        assert import_initial(db) == 26
    async with api_client(create_app(config)) as client:
        await sign_in(client, password, "editor")
        assert (await client.get("/api/v1/features")).json()["pagination"]["total"] == 4
        home = (await client.get("/api/v1/pages/home")).json()
        data = document("home", "Changed draft")
        data["payload"]["kind"] = "home"
        data["payload"]["sections"] = [{"type": "hero", "title": "Changed"}]
        assert (await write(client, "pages/" + home["id"], data, 1, "PATCH")).status_code == 200
        with Session(engine) as db, db.begin():
            assert import_initial(db) == 0
        assert (await client.get("/api/v1/pages/home")).json()["payload"]["headline"] == home[
            "payload"
        ]["headline"]


async def test_scheduled_private_media_releases_at_server_boundary(
    auth_context, tmp_path, monkeypatch
):
    from app.services import media

    config, _, password, _ = auth_context
    config = config.model_copy(update={"media_root": tmp_path})
    async with api_client(create_app(config)) as client:
        await sign_in(client, password)
        m = (
            await write(
                client,
                "media",
                {"alt_text": "Scheduled image"},
                files={"file": ("x.png", image_file(), "image/png")},
            )
        ).json()
        data = document()
        data["payload"]["sections"][0]["body_html"] = (
            f'<p>Image</p><img src="/api/v1/media/{m["id"]}/file" alt="Scheduled image">'
        )
        d = (await write(client, "pages", data)).json()
        at = now_utc() + timedelta(minutes=2)
        assert (
            await write(
                client,
                f"pages/{d['id']}/schedule",
                {"revision_id": d["revision_id"], "publish_at": at.isoformat()},
                1,
            )
        ).status_code == 200
        monkeypatch.setattr(media, "now_utc", lambda: at - timedelta(microseconds=1))
        assert (await client.get(f"/api/v1/media/{m['id']}/file")).status_code == 404
        assert (await client.get(f"/api/v1/media/{m['id']}")).status_code == 404
        assert (await client.get("/api/v1/admin/media")).json()["items"][0][
            "visibility"
        ] == "private"
        monkeypatch.setattr(media, "now_utc", lambda: at)
        assert (await client.get("/api/v1/admin/media")).json()["items"][0][
            "visibility"
        ] == "public"
        assert (await client.get(f"/api/v1/media/{m['id']}/file")).status_code == 200


async def test_image_exif_removed_pixel_bomb_and_storage_path_rejected(auth_context, tmp_path):
    import struct
    import zlib

    from app.models import MediaAsset

    config, engine, password, _ = auth_context
    config = config.model_copy(update={"media_root": tmp_path})
    output = BytesIO()
    exif = Image.Exif()
    exif[0x010E] = "Private metadata acceptance fixture"
    Image.new("RGB", (20, 12), "blue").save(output, "JPEG", exif=exif)
    async with api_client(create_app(config)) as client:
        await sign_in(client, password)
        d = (
            await write(
                client,
                "media",
                {"alt_text": "Clean image"},
                files={"file": ("x.jpg", output.getvalue(), "image/jpeg")},
            )
        ).json()
        body = (await client.get(f"/api/v1/admin/media/{d['id']}/file")).content
        assert not Image.open(BytesIO(body)).getexif()
        assert b"Private metadata" not in body
        # Valid PNG header announcing >20 MP; decoder must reject before allocating pixels.
        raw = b"IHDR" + struct.pack(">IIBBBBB", 10000, 10000, 8, 2, 0, 0, 0)
        bomb = (
            b"\x89PNG\r\n\x1a\n"
            + struct.pack(">I", 13)
            + raw
            + struct.pack(">I", zlib.crc32(raw))
            + b"\0\0\0\0IEND\xaeB`\x82"
        )
        assert (
            await write(
                client, "media", {"alt_text": "Bomb"}, files={"file": ("x.png", bomb, "image/png")}
            )
        ).status_code == 413
        with Session(engine) as db, db.begin():
            db.get(MediaAsset, d["id"]).storage_key = "../outside.webp"
        assert (await client.get(f"/api/v1/admin/media/{d['id']}/file")).status_code == 404
