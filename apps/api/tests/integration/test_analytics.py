from datetime import timedelta
from uuid import uuid4

import pytest
from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.db.session import build_engine
from app.main import create_app
from app.models import AnalyticsEvent
from app.services import analytics
from app.services.auth import now_utc
from tests.client import api_client
from tests.integration.test_auth import auth_context as auth_context
from tests.integration.test_auth import sign_in

pytestmark = [pytest.mark.integration, pytest.mark.anyio]
HEADERS = {"Origin": "http://testserver", "User-Agent": "Mozilla/5.0 acceptance"}


def event(name="session_start", session_id=None, **extra):
    return {
        "id": str(uuid4()),
        "session_id": session_id or str(uuid4()),
        "consent": True,
        "policy_version": "analytics-2026-10-13-v1",
        "name": name,
        "path": "/demo",
        **extra,
    }


async def test_disabled_is_default_and_does_not_write(auth_context):
    config, engine, _, _ = auth_context
    async with api_client(create_app(config)) as client:
        assert not (await client.get("/api/v1/analytics/config")).json()["enabled"]
        assert (
            await client.post("/api/v1/analytics/events", headers=HEADERS, json=event())
        ).status_code == 404
    with Session(engine) as session:
        assert session.scalar(select(func.count()).select_from(AnalyticsEvent)) == 0


@pytest.mark.parametrize(
    "extra",
    [
        {"consent": False},
        {"consent": 1},
        {"policy_version": "old"},
        {"phone": "SECRET_PHONE"},
        {"path": "/admin"},
        {"path": "/demo?phone=SECRET_PHONE"},
        {"name": "arbitrary"},
        {"metric_value": 2},
        {"name": "web_vital"},
        {"name": "web_vital", "metric_name": "INP", "metric_value": float("inf")},
    ],
)
async def test_payload_rejects_pii_invalid_consent_paths_and_metrics(auth_context, extra):
    config, engine, _, _ = auth_context
    async with api_client(
        create_app(config.model_copy(update={"analytics_enabled": True}))
    ) as client:
        # JSON has no infinity representation; exercise its textual unsafe equivalent.
        if extra.get("metric_value") == float("inf"):
            extra["metric_value"] = "Infinity"
        response = await client.post(
            "/api/v1/analytics/events", headers=HEADERS, json=event(**extra)
        )
        assert response.status_code == 422, response.text
        assert "SECRET_PHONE" not in response.text
    with Session(engine) as session:
        assert session.scalar(select(func.count()).select_from(AnalyticsEvent)) == 0


@pytest.mark.parametrize(
    "headers",
    [
        {"DNT": "1"},
        {"Sec-GPC": "1"},
        {"User-Agent": "Googlebot"},
        {"User-Agent": "HeadlessChrome"},
    ],
)
async def test_privacy_signals_and_bots_do_not_write(auth_context, headers):
    config, engine, _, _ = auth_context
    async with api_client(
        create_app(config.model_copy(update={"analytics_enabled": True}))
    ) as client:
        response = await client.post(
            "/api/v1/analytics/events", headers={**HEADERS, **headers}, json=event()
        )
        assert response.json() == {"accepted": False}
    with Session(engine) as session:
        assert session.scalar(select(func.count()).select_from(AnalyticsEvent)) == 0


async def test_origin_rate_duplicate_metrics_authorization_and_purge(auth_context):
    config, engine, password, _ = auth_context
    config = config.model_copy(update={"analytics_enabled": True, "analytics_event_limit": 240})
    nonce = str(uuid4())
    body = event(session_id=nonce, channel="organic")
    async with api_client(create_app(config)) as client:
        assert (await client.get("/api/v1/admin/analytics/metrics")).status_code == 401
        assert (await client.post("/api/v1/analytics/events", json=body)).status_code == 403
        assert (
            await client.post(
                "/api/v1/analytics/events",
                headers={**HEADERS, "Origin": "https://evil.example"},
                json=body,
            )
        ).status_code == 403
        for _ in range(2):
            assert (
                await client.post("/api/v1/analytics/events", headers=HEADERS, json=body)
            ).json()["accepted"]
        for name, extra in [
            ("demo_form_start", {}),
            ("demo_form_submit_success", {}),
            ("demo_form_submit_error", {"error_kind": "validation"}),
            ("web_vital", {"metric_name": "INP", "metric_value": 125}),
        ]:
            assert (
                await client.post(
                    "/api/v1/analytics/events", headers=HEADERS, json=event(name, nonce, **extra)
                )
            ).status_code == 200
        # An event lacking a session_start is stored but excluded from conversion denominators.
        await client.post(
            "/api/v1/analytics/events", headers=HEADERS, json=event("demo_form_submit_success")
        )
        await sign_in(client, password, "editor")
        assert (await client.get("/api/v1/admin/analytics/metrics")).status_code == 403
        client.cookies.clear()
        await sign_in(client, password, "sales")
        m = (await client.get("/api/v1/admin/analytics/metrics")).json()
        assert m["sessions"] == m["organic_sessions"] == 1
        assert m["events"]["session_start"] == 1
        assert m["demo_conversion_rate"] == 1
        assert m["form_success_rate"] == m["form_error_rate"] == 0.5
        assert m["vitals"]["INP"] == {"count": 1, "p75": 125.0, "enough_samples": False}
        assert (await client.get("/api/v1/admin/analytics/metrics?days=31")).status_code == 422
    with Session(engine) as session, session.begin():
        rows = session.scalars(select(AnalyticsEvent)).all()
        assert len(rows) == 6
        assert all(row.session_digest != nonce and len(row.session_digest) == 64 for row in rows)
        assert (
            session.execute(
                text("SELECT has_table_privilege('makan_api','analytics_events','UPDATE')")
            ).scalar()
            is False
        )
        for row in rows:
            row.day = now_utc().date() - timedelta(days=30)
    runtime_engine = build_engine(config)
    try:
        with Session(runtime_engine) as session, session.begin():
            assert analytics.purge(session)["expired_events"] == 6
    finally:
        runtime_engine.dispose()


async def test_shared_rate_limit_and_empty_metrics_null(auth_context):
    config, _, password, _ = auth_context
    config = config.model_copy(update={"analytics_enabled": True, "analytics_event_limit": 1})
    async with api_client(create_app(config)) as first, api_client(create_app(config)) as second:
        assert (
            await first.post("/api/v1/analytics/events", headers=HEADERS, json=event())
        ).status_code == 200
        response = await second.post("/api/v1/analytics/events", headers=HEADERS, json=event())
        assert response.status_code == 429 and int(response.headers["retry-after"]) >= 1
        await sign_in(second, password)
        metrics = (await second.get("/api/v1/admin/analytics/metrics?days=1")).json()
        assert metrics["form_success_rate"] is None
