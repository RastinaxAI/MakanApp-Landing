from datetime import timedelta

import pytest
from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.main import create_app
from app.models import Lead, LeadNote
from app.models.crm import (
    Activity,
    Contact,
    LeadProfile,
    Notification,
    Opportunity,
    School,
    StageHistory,
)
from app.services import crm, leads
from app.services.auth import now_utc
from tests.client import api_client
from tests.integration.test_auth import auth_context as auth_context
from tests.integration.test_cms import sign_in, write
from tests.integration.test_leads import form, send

pytestmark = [pytest.mark.integration, pytest.mark.anyio]


async def created(client, path, data, version=None, method="POST"):
    response = await write(
        client, path if path.startswith("leads") else "crm/" + path, data, version, method
    )
    assert response.status_code in (200, 201), response.text
    return response.json()


async def test_request_to_customer360_pipeline_demo_reporting_and_existing_notes(auth_context):
    config, engine, password, ids = auth_context
    async with api_client(create_app(config)) as client:
        response = await send(client, await form(client))
        assert response.status_code == 201, response.text
        await sign_in(client, password, "sales")
        lead = (await client.get("/api/v1/admin/leads")).json()["items"][0]
        customer = (await client.get(f"/api/v1/admin/leads/{lead['id']}/customer")).json()
        assert customer["school"]["name"] == "مدرسه آزمون"
        assert customer["contacts"]["pagination"]["total"] == 1
        assert customer["requests"]["items"][0]["id"] == lead["id"]
        await write(client, f"leads/{lead['id']}/notes", {"body": "یادداشت قبلی"}, lead["version"])
        opportunity_data = {
            "lead_id": lead["id"],
            "school_id": customer["school"]["id"],
            "title": "فرصت مدرسه",
            "stage": "qualified",
            "assigned_to": str(ids["sales"]),
            "estimated_value": "45000.00",
        }
        opportunity = await created(client, "opportunities", opportunity_data)
        now = now_utc() + timedelta(days=1)
        demo_data = {
            "lead_id": lead["id"],
            "opportunity_id": opportunity["id"],
            "assigned_to": str(ids["sales"]),
            "starts_at": now.isoformat(),
            "ends_at": (now + timedelta(minutes=45)).isoformat(),
        }
        demo = await created(client, "demos", demo_data)
        overlap = await write(client, "crm/demos", demo_data)
        assert overlap.status_code == 409 and overlap.json()["error"]["code"] == "DEMO_OVERLAP"
        demo = await created(
            client,
            "demos/" + demo["id"],
            {
                **demo_data,
                "status": "completed",
                "outcome": "قابلیت‌ها بررسی شد",
                "next_action": "ارسال پیشنهاد",
            },
            demo["version"],
            "PATCH",
        )
        lost = await write(
            client,
            "crm/opportunities/" + opportunity["id"],
            {**opportunity_data, "stage": "lost"},
            opportunity["version"],
            "PATCH",
        )
        assert lost.status_code == 422
        won = await created(
            client,
            "opportunities/" + opportunity["id"],
            {**opportunity_data, "stage": "won"},
            opportunity["version"],
            "PATCH",
        )
        assert won["stage"] == "won"
        lead_after = (await client.get(f"/api/v1/admin/leads/{lead['id']}")).json()
        assert lead_after["status"] == "closed" and lead_after["outcome"] == "won"
        stale = await write(
            client,
            "crm/opportunities/" + opportunity["id"],
            opportunity_data,
            opportunity["version"],
            "PATCH",
        )
        assert stale.status_code == 409
        metrics = (await client.get("/api/v1/admin/crm/dashboard")).json()
        assert metrics["total_leads"] == metrics["completed_demos"] == 1
        assert metrics["lead_to_demo_percent"] == metrics["demo_to_opportunity_percent"] == 100
        assert (
            metrics["performance"][
                1 if metrics["performance"][0]["id"] != str(ids["sales"]) else 0
            ]["won_opportunities"]
            == 1
        )
        updated = (await client.get(f"/api/v1/admin/leads/{lead['id']}/customer")).json()
        assert {"lead_history", "note", "stage", "demo"} <= set(
            item["kind"] for item in updated["timeline"]["items"]
        )
        assert updated["profile"]["converted_at"]
        with Session(engine) as session:
            assert session.scalar(select(func.count()).select_from(Lead)) == 1
            assert session.scalar(select(func.count()).select_from(LeadNote)) == 1
            assert session.scalar(select(func.count()).select_from(StageHistory)) == 2


async def test_manual_intake_assignment_duplicates_tags_filters_private_views_and_rbac(
    auth_context,
):
    config, engine, password, ids = auth_context
    async with api_client(create_app(config)) as client:
        assert (await client.get("/api/v1/admin/crm/schools")).status_code == 401
        await sign_in(client, password, "editor")
        assert (await client.get("/api/v1/admin/crm/dashboard")).status_code == 403
        client.cookies.clear()
        await sign_in(client, password)
        await created(
            client,
            "automations",
            {"auto_assign": True, "assignment_mode": "fixed", "fixed_assignee": str(ids["sales"])},
            1,
            "PUT",
        )
        data = {
            "full_name": "مدیر آزمون",
            "phone": "09123456789",
            "school_name": "آموزشگاه آزمون",
            "consent": True,
        }
        lead = await created(client, "leads", data)
        assert lead["assigned_to"] == str(ids["sales"])
        assert (await client.get("/api/v1/admin/leads", params={"q": "۰۹۱۲۳۴۵۶۷۸۹"})).json()[
            "pagination"
        ]["total"] == 1
        assert (
            await client.get("/api/v1/admin/crm/dashboard", params={"q": "۰۹۱۲۳۴۵۶۷۸۹"})
        ).json()["total_leads"] == 1
        assert (await write(client, "leads", data)).status_code == 409
        customer = (await client.get(f"/api/v1/admin/leads/{lead['id']}/customer")).json()
        await created(
            client,
            f"leads/{lead['id']}/profile",
            {
                "full_name": "مدیر اصلاح‌شده",
                "school_id": customer["school"]["id"],
                "tags": ["آموزشگاه", "پیگیری"],
                "qualification": "مدرسه به گزارش نیاز دارد",
            },
            lead["version"],
            "PATCH",
        )
        filtered = (
            await client.get("/api/v1/admin/leads", params={"tag": "آموزشگاه", "q": "اصلاح"})
        ).json()
        assert filtered["pagination"]["total"] == 1
        contact_data = {
            "school_id": customer["school"]["id"],
            "full_name": "مسئول آموزش",
            "contact_value": "09129999999",
            "is_manager": False,
        }
        contact = await created(client, "contacts", contact_data)
        assert contact["contact_value"] == "+989129999999"
        assert (await write(client, "crm/contacts", contact_data)).status_code == 409
        view = await created(
            client, "views", {"name": "آموزشگاه‌ها", "filters": {"tag": "آموزشگاه"}}
        )
        client.cookies.clear()
        await sign_in(client, password, "sales")
        assert (await client.get("/api/v1/admin/crm/views")).json()["pagination"]["total"] == 0
        assert (await client.get("/api/v1/admin/crm/views/" + view["id"])).status_code == 404
        assert (
            await write(client, "crm/automations", {"auto_assign": False}, 2, "PUT")
        ).status_code == 403
        notices = (await client.get("/api/v1/admin/crm/notifications")).json()
        assert {n["kind"] for n in notices["items"]} == {"new_lead", "assigned"}
        assert (
            await write(client, "crm/notifications/" + notices["items"][0]["id"] + "/read")
        ).status_code == 200
        assert (await client.post("/api/v1/admin/leads", json=data)).status_code == 403


async def test_automations_are_idempotent_and_do_not_extend_personal_retention(auth_context):
    config, engine, password, ids = auth_context
    async with api_client(create_app(config)) as client:
        await sign_in(client, password)
        lead = await created(
            client,
            "leads",
            {
                "full_name": "مدیر آزمون",
                "phone": "09123456789",
                "school_name": "مدرسه",
                "consent": True,
            },
        )
        customer = (await client.get(f"/api/v1/admin/leads/{lead['id']}/customer")).json()
        due = now_utc() - timedelta(hours=2)
        await created(
            client,
            "activities",
            {
                "lead_id": lead["id"],
                "kind": "followup",
                "title": "تماس با مدرسه",
                "due_at": due.isoformat(),
                "assigned_to": str(ids["sales"]),
            },
        )
        opportunity = await created(
            client,
            "opportunities",
            {
                "lead_id": lead["id"],
                "school_id": customer["school"]["id"],
                "title": "مدرسه",
                "assigned_to": str(ids["sales"]),
            },
        )
        with Session(engine) as session, session.begin():
            row = session.get(Lead, lead["id"])
            before = row.last_activity_at
            session.get(Opportunity, opportunity["id"]).last_activity_at = now_utc() - timedelta(
                days=15
            )
            result = crm.automations(session)
            assert result["notifications"] == 2
            assert crm.automations(session)["notifications"] == 0
            assert row.last_activity_at == before
        assert (await client.get("/api/v1/admin/crm/activities?overdue=true")).json()["pagination"][
            "total"
        ] == 1


async def test_retention_scrubs_all_copied_personal_information_and_preserves_history(auth_context):
    config, engine, password, _ = auth_context
    async with api_client(create_app(config)) as client:
        await sign_in(client, password)
        lead = await created(
            client,
            "leads",
            {
                "full_name": "نام خصوصی",
                "phone": "09123456789",
                "school_name": "نام خصوصی مدرسه",
                "consent": True,
            },
        )
        customer = (await client.get(f"/api/v1/admin/leads/{lead['id']}/customer")).json()
        await created(
            client,
            "activities",
            {"lead_id": lead["id"], "kind": "note", "title": "نام خصوصی", "body": "شماره خصوصی"},
        )
        await created(
            client,
            "opportunities",
            {
                "lead_id": lead["id"],
                "school_id": customer["school"]["id"],
                "title": "نام خصوصی",
                "stage": "lost",
                "lost_reason": "اطلاعات خصوصی",
            },
        )
        with Session(engine) as session, session.begin():
            past = now_utc() - timedelta(days=181)
            session.get(Lead, lead["id"]).last_activity_at = past
            session.get(School, customer["school"]["id"]).last_activity_at = past
            session.flush()
            assert leads.purge(session)["purged"] == 1
            session.flush()
            assert crm.purge_schools(session)["schools_purged"] == 1
        with Session(engine) as session:
            assert session.get(Lead, lead["id"]).full_name is None
            assert session.get(School, customer["school"]["id"]).name is None
            assert all(
                row.full_name is None and row.contact_value is None
                for row in session.scalars(select(Contact))
            )
            assert session.scalar(select(Activity)).body == ""
            assert session.scalar(select(Opportunity)).lost_reason == "اطلاعات حذف‌شده"
            assert session.scalar(select(func.count()).select_from(StageHistory)) == 1


async def test_non_destructive_migration_and_backfill_preserve_existing_lead(database_factory):
    from tests.integration.conftest import migrate

    with database_factory("0008_phone_otp") as (_, _, engine):
        now = now_utc()
        with Session(engine) as session, session.begin():
            row = Lead(
                reference_id="existing-test-request",
                kind="demo",
                full_name="داده قبلی",
                contact_method="phone",
                contact_value="+989123456789",
                details={"school_name": "مدرسه قبلی"},
                source="home",
                consent_version="2026-10-13-v1",
                consent_at=now,
                last_activity_at=now,
            )
            session.add(row)
            session.flush()
            identifier = row.id
        migrate(engine)
        with Session(engine) as session, session.begin():
            assert crm.backfill(session) == 1
            assert crm.backfill(session) == 0
        with Session(engine) as session:
            assert session.get(Lead, identifier).full_name == "داده قبلی"
            assert session.get(LeadProfile, identifier).school_id
            assert session.scalar(select(func.count()).select_from(Notification)) == 0
            assert (
                session.scalar(
                    text("SELECT has_table_privilege('makan_api','crm_stage_history','UPDATE')")
                )
                is False
            )
