import asyncio
from datetime import timedelta
from unittest.mock import patch
from uuid import uuid4

import pytest
from sqlalchemy import func, select, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.main import create_app
from app.models import AuditLog, Lead, LeadHistory, LeadNote, LeadReceipt
from app.schemas.leads import CONSENT_VERSION
from app.services import leads
from app.services.auth import now_utc
from tests.client import api_client
from tests.integration.test_auth import auth_context as auth_context
from tests.integration.test_cms import sign_in, write

pytestmark = [pytest.mark.integration, pytest.mark.anyio]
ORIGIN = {"Origin": "http://testserver"}


async def form(client, kind="demo", **changes):
    with patch.object(leads, "now_utc", return_value=now_utc() - timedelta(seconds=2)):
        token = (await client.get("/api/v1/forms/token", params={"kind": kind})).json()
    data = {
        "full_name": "نام آزمون مستقل",
        "consent": True,
        "consent_version": token["consent_version"],
        "form_token": token["token"],
        "idempotency_key": str(uuid4()),
        "source": "home",
    }
    data.update(
        {"phone": "۰۹۱۲۳۴۵۶۷۸۹", "school_name": "مدرسه آزمون", "city": "تهران"}
        if kind == "demo"
        else {
            "contact_method": "email",
            "contact_value": "Test@example.com",
            "subject": "راهنمای شروع",
            "message": "پیام آزمون تماس مستقل",
        }
    )
    return {**data, **changes}


async def send(client, data, kind="demo"):
    return await client.post(
        "/api/v1/leads/demo" if kind == "demo" else "/api/v1/contact", json=data, headers=ORIGIN
    )


async def test_forms_persist_consent_reference_rbac_and_no_public_lookup(auth_context):
    config, engine, password, _ = auth_context
    application = create_app(config)
    async with api_client(application) as client:
        with application.state.session_factory() as runtime:
            assert runtime.scalar(
                text("SELECT has_table_privilege(current_user, 'lead_status_history', 'INSERT')")
            )
            assert not runtime.scalar(
                text("SELECT has_table_privilege(current_user, 'lead_status_history', 'UPDATE')")
            )
            assert not runtime.scalar(
                text("SELECT has_table_privilege(current_user, 'lead_status_history', 'DELETE')")
            )
        for kind in ("demo", "contact"):
            response = await send(client, await form(client, kind), kind)
            assert response.status_code == 201, response.text
            assert set(response.json()) == {"reference_id", "status"}
            assert len(response.json()["reference_id"]) == 35
            assert (
                await client.get("/api/v1/leads/" + response.json()["reference_id"])
            ).status_code == 404
        with Session(engine) as session:
            rows = session.scalars(select(Lead).order_by(Lead.kind)).all()
            assert len(rows) == 2
            assert all(
                row.status == "new" and row.consent_version == CONSENT_VERSION for row in rows
            )
            assert rows[0].contact_value == "test@example.com"
            assert rows[1].contact_value == "+989123456789"
            assert session.scalar(select(func.count()).select_from(LeadHistory)) == 2
        assert (await client.get("/api/v1/admin/leads")).status_code == 401
        await sign_in(client, password, "editor")
        for path in (
            "leads",
            "leads/metrics",
            "leads/assignees",
            f"leads/{rows[0].id}",
            f"leads/{rows[0].id}/notes",
            f"leads/{rows[0].id}/history",
        ):
            assert (await client.get("/api/v1/admin/" + path)).status_code == 403
        assert (
            await write(client, f"leads/{rows[0].id}/notes", {"body": "private"}, 1)
        ).status_code == 403
        client.cookies.clear()
        await sign_in(client, password, "sales")
        assert (await client.get("/api/v1/admin/leads")).json()["pagination"]["total"] == 2


@pytest.mark.parametrize("different_keys", [False, True])
async def test_concurrent_submissions_single_row_and_consistent_receipts(
    auth_context, different_keys
):
    config, engine, _, _ = auth_context
    async with api_client(create_app(config)) as client:
        data = await form(client)
        bodies = [
            {**data, **({"idempotency_key": str(uuid4())} if different_keys else {})}
            for _ in range(6)
        ]
        responses = await asyncio.gather(*(send(client, body) for body in bodies))
        assert all(response.status_code == 201 for response in responses), [
            r.status_code for r in responses
        ]
        assert len({r.json()["reference_id"] for r in responses}) == 1
        with Session(engine) as session:
            assert session.scalar(select(func.count()).select_from(Lead)) == 1
            assert session.scalar(select(func.count()).select_from(LeadReceipt)) == (
                6 if different_keys else 1
            )


async def test_changed_body_conflict_and_expired_token_retry(auth_context):
    config, engine, _, _ = auth_context
    async with api_client(create_app(config)) as client:
        data = await form(client)
        first = await send(client, data)
        assert (await send(client, {**data, "school_name": "Changed school"})).status_code == 409
        with patch.object(leads, "now_utc", return_value=now_utc() + timedelta(hours=2)):
            retry = await send(client, data)
            assert retry.json() == first.json()
            assert (
                await send(client, {**data, "idempotency_key": str(uuid4())})
            ).status_code == 422
        with Session(engine) as session:
            assert session.scalar(select(func.count()).select_from(Lead)) == 1


@pytest.mark.parametrize(
    "changes,expected",
    [
        ({"full_name": " "}, 422),
        ({"school_name": ""}, 422),
        ({"phone": "123"}, 422),
        ({"consent": False}, 422),
        ({"consent": 1}, 422),
        ({"consent_version": "old"}, 409),
        ({"website": "spam"}, 422),
        ({"form_token": "x" * 60}, 422),
        ({"idempotency_key": "not-a-uuid"}, 422),
        ({"source": "https://evil.test"}, 422),
        ({"message": "x" * 3001}, 422),
        ({"unexpected": "value"}, 422),
    ],
)
async def test_invalid_forms_never_save(auth_context, changes, expected):
    config, engine, _, _ = auth_context
    async with api_client(create_app(config)) as client:
        response = await send(client, await form(client, **changes))
        assert response.status_code == expected
        assert "نام آزمون" not in response.text
        with Session(engine) as session:
            assert session.scalar(select(func.count()).select_from(Lead)) == 0


async def test_contact_validation_origin_body_limit_and_token_scope(auth_context):
    config, _, _, _ = auth_context
    async with api_client(create_app(config)) as client:
        data = await form(client, "contact", contact_value="bad@")
        assert (await send(client, data, "contact")).status_code == 422
        data = await form(client)
        assert (await client.post("/api/v1/leads/demo", json=data)).status_code == 403
        assert (
            await client.post(
                "/api/v1/leads/demo", json=data, headers={"Origin": "https://evil.test"}
            )
        ).status_code == 403
        assert (
            await client.post("/api/v1/leads/demo", content=b"x" * 17000, headers=ORIGIN)
        ).status_code == 413
        contact = await form(client, "contact")
        assert (
            await send(client, {**data, "form_token": contact["form_token"]})
        ).status_code == 422
        with patch.object(leads, "now_utc", return_value=now_utc() - timedelta(hours=2)):
            assert (await send(client, data)).status_code == 422


async def test_rate_shared_across_apps_and_invalid_payloads(auth_context):
    config, engine, _, _ = auth_context
    config = config.model_copy(update={"forms_submit_limit": 1})
    async with api_client(create_app(config)) as first, api_client(create_app(config)) as second:
        assert (await first.post("/api/v1/leads/demo", json={}, headers=ORIGIN)).status_code == 422
        limited = await second.post("/api/v1/leads/demo", json={}, headers=ORIGIN)
        assert limited.status_code == 429 and int(limited.headers["retry-after"]) > 0
        with Session(engine) as session:
            assert session.scalar(select(func.count()).select_from(Lead)) == 0


async def test_contact_rate_duplicates_do_not_consume_new_lead_quota(auth_context):
    config, _, _, _ = auth_context
    config = config.model_copy(update={"forms_contact_limit": 1})
    async with api_client(create_app(config)) as client:
        data = await form(client)
        first = await send(client, data)
        duplicate = await send(client, {**data, "idempotency_key": str(uuid4()), "source": "learn"})
        assert duplicate.json() == first.json()
        assert (
            await send(client, {**data, "idempotency_key": str(uuid4()), "school_name": "Another"})
        ).status_code == 429


async def test_failed_commit_no_success_then_safe_retry(auth_context):
    config, engine, _, _ = auth_context
    async with api_client(create_app(config)) as client:
        data = await form(client)
        original = Session.commit
        # Session.begin context uses SessionTransaction.commit, test actual commit boundary.
        from sqlalchemy.orm.session import SessionTransaction

        commit = SessionTransaction.commit

        def failed(transaction, *args, **kwargs):
            if any(isinstance(value, Lead) for value in transaction.session.identity_map.values()):
                raise SQLAlchemyError("acceptance commit failure")
            return commit(transaction, *args, **kwargs)

        with patch.object(SessionTransaction, "commit", failed):
            failed_response = await send(client, data)
        assert failed_response.status_code == 503
        with Session(engine) as session:
            assert session.scalar(select(func.count()).select_from(Lead)) == 0
        success = await send(client, data)
        assert success.status_code == 201
        assert (await send(client, data)).json() == success.json()
        assert Session.commit is original


async def test_crm_assignment_status_notes_history_filters_metrics_and_purge(auth_context):
    config, engine, password, admins = auth_context
    async with api_client(create_app(config)) as client:
        await send(client, await form(client))
        await send(client, await form(client, "contact"), "contact")
        await sign_in(client, password, "sales")
        rows = (await client.get("/api/v1/admin/leads")).json()["items"]
        demo = next(row for row in rows if row["kind"] == "demo")
        identifier = demo["id"]
        assignees = (await client.get("/api/v1/admin/leads/assignees")).json()
        sales = next(row for row in assignees if "sales" in row["email"])
        update = {"status": "qualified", "assigned_to": sales["id"]}
        assert (
            await write(client, f"leads/{identifier}", update, method="PATCH")
        ).status_code == 428
        changed = await write(client, f"leads/{identifier}", update, 1, "PATCH")
        assert changed.status_code == 200 and changed.json()["version"] == 2
        assert (await write(client, f"leads/{identifier}", update, 1, "PATCH")).status_code == 409
        note = await write(client, f"leads/{identifier}/notes", {"body": "یادداشت خصوصی آزمون"}, 2)
        assert note.status_code == 201
        assert (await client.get(f"/api/v1/admin/leads/{identifier}/notes")).json()["items"][0][
            "body"
        ] == "یادداشت خصوصی آزمون"
        qualified = (await client.get("/api/v1/admin/leads/metrics")).json()
        assert qualified["qualified"] == 1 and qualified["contracts"] == 0
        assert (
            await write(client, f"leads/{identifier}", {"status": "closed"}, 3, "PATCH")
        ).status_code == 422
        closed = await write(
            client, f"leads/{identifier}", {"status": "closed", "outcome": "won"}, 3, "PATCH"
        )
        assert closed.status_code == 200
        filtered = (
            await client.get(
                "/api/v1/admin/leads",
                params={
                    "q": "مدرسه",
                    "status": "closed",
                    "kind": "demo",
                    "source": "home",
                    "page_size": 1,
                },
            )
        ).json()
        assert filtered["pagination"]["total"] == 1
        assert (await client.get("/api/v1/admin/leads", params={"q": "%"})).json()["pagination"][
            "total"
        ] == 0
        assert (
            await client.get("/api/v1/admin/leads", params={"date_from": "2099-01-01T00:00:00Z"})
        ).json()["pagination"]["total"] == 0
        assert (
            await client.get("/api/v1/admin/leads", params={"date_from": "2026-01-01"})
        ).status_code == 422
        history = (await client.get(f"/api/v1/admin/leads/{identifier}/history")).json()
        assert history["pagination"]["total"] == 3
        assert (await client.get("/api/v1/admin/leads/metrics")).json()["contracts"] == 1
        with Session(engine) as session, session.begin():
            row = session.get(Lead, identifier)
            row.last_activity_at = now_utc() - timedelta(days=181)
        with Session(engine) as session, session.begin():
            result = leads.purge(session)
            assert result["purged"] == 1
        purged = (await client.get(f"/api/v1/admin/leads/{identifier}")).json()
        assert (
            purged["full_name"] is None
            and purged["contact_value"] is None
            and purged["details"] == {}
        )
        assert (await client.get(f"/api/v1/admin/leads/{identifier}/notes")).json()["pagination"][
            "total"
        ] == 0
        assert (
            await write(client, f"leads/{identifier}", update, purged["version"], "PATCH")
        ).status_code == 409
        assert (await client.get("/api/v1/admin/leads/metrics")).json()["contracts"] == 1
        with Session(engine) as session:
            audit_data = str(session.scalars(select(AuditLog.field_changes_json)).all())
            assert "یادداشت خصوصی" not in audit_data and "0912" not in audit_data
            assert session.scalar(select(func.count()).select_from(LeadNote)) == 0
            assert session.get(Lead, identifier).fingerprint is None
