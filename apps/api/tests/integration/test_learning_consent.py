import pytest
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.main import create_app
from app.models import LearningStats, LearningView
from tests.client import api_client
from tests.integration.test_auth import auth_context as auth_context
from tests.integration.test_cms import sign_in
from tests.integration.test_learning import content, create

pytestmark = [pytest.mark.integration, pytest.mark.anyio]


@pytest.mark.parametrize(
    "enabled,headers,consent,status",
    [
        (False, {}, True, 403),
        (True, {}, False, 403),
        (True, {"DNT": "1"}, True, 403),
        (True, {"Sec-GPC": "1"}, True, 403),
        (True, {}, 1, 422),
    ],
)
async def test_qualified_view_requires_optional_consent_and_respects_privacy(
    auth_context, enabled, headers, consent, status
):
    config, engine, password, _ = auth_context
    config = config.model_copy(update={"analytics_enabled": enabled})
    async with api_client(create_app(config)) as client:
        await sign_in(client, password)
        row = await create(client, content("consent-view"), True)
        result = await client.post(
            f"/api/v1/learn/views/{row['id']}",
            headers={
                "Origin": "http://testserver",
                "User-Agent": "Mozilla/5.0 Acceptance",
                **headers,
            },
            json={
                "ticket": "0." + "a" * 64,
                "consent": consent,
                "policy_version": "analytics-2026-10-13-v1",
            },
        )
        assert result.status_code == status
    with Session(engine) as session:
        assert session.scalar(select(func.count()).select_from(LearningView)) == 0
        assert session.scalar(select(func.count()).select_from(LearningStats)) == 0
