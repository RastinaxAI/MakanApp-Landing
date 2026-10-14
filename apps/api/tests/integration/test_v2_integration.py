from datetime import timedelta

import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.main import create_app
from app.models import Lead
from app.models.crm import Contact
from app.services import leads
from app.services.auth import now_utc
from tests.client import api_client
from tests.integration.test_cms import document, write
from tests.integration.test_leads import form, send
from tests.integration.test_phone_otp import enter
from tests.integration.test_phone_otp import phone_context as phone_context

pytestmark = [pytest.mark.integration, pytest.mark.anyio]


@pytest.mark.parametrize("hidden", ["parent_mobile", "parent_desktop", "heading_mobile"])
async def test_public_main_heading_cannot_be_hidden_by_own_or_parent_responsive_styles(
    phone_context, hidden
):
    config, _, _, _ = phone_context
    async with api_client(create_app(config)) as client:
        await enter(client)
        data = document("heading-" + hidden)
        parent = (
            {"mobile": {"hidden": True}}
            if hidden == "parent_mobile"
            else {
                "base": {"hidden": True},
                "mobile": {"hidden": False},
                "tablet": {"hidden": False},
            }
            if hidden == "parent_desktop"
            else {}
        )
        data["payload"]["document"] = {
            "nodes": [
                {
                    "id": "container",
                    "type": "Container",
                    "styles": parent,
                    "children": [
                        {
                            "id": "title",
                            "type": "Heading",
                            "props": {"title": "عنوان عمومی", "level": 1},
                            "styles": {"mobile": {"hidden": True}}
                            if hidden == "heading_mobile"
                            else {},
                        }
                    ],
                }
            ]
        }
        result = await write(client, "content", data)
        assert result.status_code == 201, result.text
        value = result.json()
        published = await write(
            client,
            f"content/{value['id']}/publish",
            {"revision_id": value["revision_id"]},
            value["row_version"],
        )
        assert published.status_code == 422, published.text
        assert published.json()["error"]["code"] == "HEADING_VISIBILITY"
        assert (await client.get("/api/v1/pages/" + data["slug"])).status_code == 404


async def test_shared_contact_retention_preserves_new_consented_request_and_scrubs_old_name(
    phone_context,
):
    config, engine, _, _ = phone_context
    async with api_client(create_app(config)) as client:
        assert (
            await send(client, await form(client, full_name="شخص قبلی", job_title="سمت قبلی"))
        ).status_code == 201
        assert (
            await send(client, await form(client, full_name="شخص جدید", job_title="سمت جدید"))
        ).status_code == 201
        with Session(engine) as session, session.begin():
            rows = session.scalars(select(Lead).order_by(Lead.created_at)).all()
            assert len(rows) == 2
            assert len(session.scalars(select(Contact)).all()) == 1
            rows[0].last_activity_at = now_utc() - timedelta(days=181)
            session.flush()
            assert leads.purge(session)["purged"] == 1
        with Session(engine) as session:
            contact = session.scalar(select(Contact))
            assert contact.full_name == "شخص جدید"
            assert contact.job_title == "سمت جدید"
            assert contact.contact_value is not None
            assert contact.purged_at is None
            assert contact.is_manager is False
