import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.main import create_app
from app.models import AnalyticsEvent
from tests.client import api_client
from tests.integration.test_analytics import HEADERS, event
from tests.integration.test_auth import auth_context as auth_context

pytestmark = [pytest.mark.integration, pytest.mark.anyio]


async def test_vitals_keep_latest_sequence_and_resist_different_session_or_metric(auth_context):
    config, engine, _, _ = auth_context
    body = event("web_vital", metric_name="INP", metric_value=220.0, metric_revision=1)
    async with api_client(
        create_app(config.model_copy(update={"analytics_enabled": True}))
    ) as client:

        async def post(data):
            result = await client.post("/api/v1/analytics/events", headers=HEADERS, json=data)
            assert result.status_code == 200, result.text

        await post(body)
        await post({**body, "metric_value": 180.0, "metric_revision": 3})
        await post({**body, "metric_value": 600.0, "metric_revision": 2})
        await post({**body, "metric_name": "LCP", "metric_value": 900.0, "metric_revision": 4})
        await post(
            {
                **body,
                "session_id": event()["session_id"],
                "metric_value": 1000.0,
                "metric_revision": 4,
            }
        )
    with Session(engine) as session:
        row = session.scalar(select(AnalyticsEvent))
        assert row.metric_value == 180 and row.metric_revision == 3 and row.metric_name == "INP"
