from uuid import UUID

import pytest
from sqlalchemy.orm import Session

from app.main import create_app
from app.models import Page, PageRevision
from app.services import learning
from app.services.auth import throttle
from app.services.learning_intro import NEW, OLD, refresh_intro
from tests.client import api_client
from tests.integration.test_auth import auth_context as auth_context
from tests.integration.test_cms import sign_in, write
from tests.integration.test_learning import content, create

pytestmark = [pytest.mark.integration, pytest.mark.anyio]


async def test_large_editorial_body_bounds_and_empty_heading(auth_context):
    config, _, password, _ = auth_context
    async with api_client(create_app(config)) as client:
        await sign_in(client, password)
        body = "<p>" + "متن " * 8000 + "</p>"
        response = await write(client, "learn/contents", content("large", body_html=body))
        assert response.status_code == 201, response.text
        token = (await client.get("/api/v1/admin/auth/csrf")).json()["csrf_token"]
        response = await client.post(
            "/api/v1/admin/learn/contents",
            headers={
                "Origin": "http://testserver",
                "X-CSRF-Token": token,
                "Content-Type": "application/json",
            },
            content="x" * 262145,
        )
        assert response.status_code == 413
        row = await create(client, content("empty-heading", body_html="<h2></h2><p>Content</p>"))
        assert (
            await write(
                client,
                f"learn/contents/{row['id']}/publish",
                {"revision_id": row["revision_id"]},
                1,
            )
        ).status_code == 422


async def test_ticket_and_view_rate_limits_are_shared_database_state(auth_context, monkeypatch):
    config, engine, password, _ = auth_context
    app = create_app(config)
    async with api_client(app) as client:
        await sign_in(client, password)
        row = await create(client, content("limited"), True)
        client.headers["User-Agent"] = "Mozilla/5.0 AcceptanceBrowser"
        endpoint = f"/api/v1/learn/views/{row['id']}"
        ticket = (await client.get(endpoint + "/ticket")).json()["ticket"]
        viewer = (
            "127.0.0.1:"
            + __import__("hashlib").sha256(client.headers["User-Agent"].encode()).hexdigest()
        )
        # Client ASGI transport host is 127.0.0.1, matching the real subject function.
        with Session(engine) as db, db.begin():
            for _ in range(100):
                throttle(db, app.state.security, "learn-ticket", viewer, 100, 600)
        limited = await client.get(endpoint + "/ticket")
        assert limited.status_code == 429 and int(limited.headers["retry-after"]) > 0
        timestamp = int(ticket.split(".")[0])
        monkeypatch.setattr(learning.time, "time", lambda: timestamp + 21)
        with Session(engine) as db, db.begin():
            for _ in range(60):
                throttle(db, app.state.security, "learn-view", viewer, 60, 600)
        limited = await client.post(
            endpoint, headers={"Origin": "http://testserver"}, json={"ticket": ticket}
        )
        assert limited.status_code == 429 and int(limited.headers["retry-after"]) > 0


async def test_legacy_intro_refresh_is_immutable_idempotent_and_preserves_editor_work(auth_context):
    config, engine, password, _ = auth_context
    async with api_client(create_app(config)) as client:
        await sign_in(client, password)
        row = (
            await write(
                client,
                "pages",
                {
                    "slug": "learn",
                    "title": "Learn",
                    "payload": {
                        "kind": "page",
                        "headline": "Learn",
                        "summary": OLD,
                        "sections": [],
                    },
                    "seo": {"description": OLD},
                },
            )
        ).json()
        assert (
            await write(
                client, f"pages/{row['id']}/publish", {"revision_id": row["revision_id"]}, 1
            )
        ).status_code == 200
        with Session(engine) as db, db.begin():
            assert not refresh_intro(db)  # administrator author is preserved
            page = db.get(Page, UUID(row["id"]))
            page.row_version = 1  # model an untouched system import
            revision = db.get(PageRevision, UUID(row["revision_id"]))
            revision.created_by = None
        with Session(engine) as db, db.begin():
            assert refresh_intro(db)
            db.flush()
            assert not refresh_intro(db)
            assert (
                db.get(PageRevision, UUID(row["revision_id"])).content_json["payload"]["summary"]
                == OLD
            )
        assert (await client.get("/api/v1/pages/learn")).json()["payload"]["summary"] == NEW
