import json
import logging
from uuid import UUID

import pytest
from fastapi import Query
from pydantic import ValidationError

from app.core.config import Settings
from app.core.logging import SafeJsonFormatter
from app.main import create_app
from app.schemas.common import PaginationQuery, StrictSchema
from tests.client import api_client

UNAVAILABLE_DB = "postgresql+psycopg://unit:private-secret@127.0.0.1:9/makan_unit"


@pytest.mark.parametrize(
    "url",
    [
        None,
        "sqlite:///test.db",
        "postgresql://x:y@localhost/db",
        "invalid",
        "postgresql+psycopg://x@localhost/db",
    ],
)
def test_reject_missing_or_non_postgres_configuration(url):
    with pytest.raises(ValidationError) as error:
        Settings(database_url=url)
    assert "private-secret" not in str(error.value)


def test_secret_redaction_and_bounded_configuration():
    settings = Settings(database_url=UNAVAILABLE_DB)
    assert "private-secret" not in repr(settings)
    with pytest.raises(ValidationError):
        Settings(database_url=UNAVAILABLE_DB, db_pool_size=0)
    with pytest.raises(ValidationError):
        Settings(database_url=UNAVAILABLE_DB, app_env="invalid")


def test_strict_pagination_bounds():
    assert PaginationQuery(page=3, page_size=10).offset == 20
    for data in ({"page": 0}, {"page_size": 101}, {"page_size": 0}, {"include_draft": True}):
        with pytest.raises(ValidationError):
            PaginationQuery(**data)


def test_formatter_emits_only_allowed_metadata():
    record = logging.LogRecord(
        "dependency", logging.ERROR, "", 1, "password=private-secret", (), None
    )
    record.body = "private-message"
    assert json.loads(SafeJsonFormatter().format(record))["event"] == "server_log"
    assert "private" not in SafeJsonFormatter().format(record)
    record.name = "makan.api"
    assert "private" not in SafeJsonFormatter().format(record)


@pytest.mark.anyio
async def test_liveness_and_readiness_with_real_refused_connection():
    async with api_client(create_app(Settings(database_url=UNAVAILABLE_DB))) as client:
        response = await client.get("/api/v1/health/live")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}
        UUID(response.headers["x-trace-id"])
        response = await client.get("/api/v1/health/ready")
        assert response.status_code == 503
        assert response.json()["error"]["code"] == "SERVICE_UNAVAILABLE"
        assert "private-secret" not in response.text


@pytest.mark.parametrize("environment", ["staging", "production"])
@pytest.mark.anyio
async def test_documentation_is_disabled_outside_development(environment):
    async with api_client(
        create_app(Settings(database_url=UNAVAILABLE_DB, app_env=environment))
    ) as client:
        for path in ("/api/v1/docs", "/api/v1/openapi.json", "/docs", "/openapi.json"):
            assert (await client.get(path)).status_code == 404


@pytest.mark.anyio
async def test_openapi_contract_and_error_metadata():
    async with api_client(create_app(Settings(database_url=UNAVAILABLE_DB))) as client:
        schema = (await client.get("/api/v1/openapi.json")).json()
        assert set(schema["paths"]) == {"/api/v1/health/live", "/api/v1/health/ready"}
        assert "ErrorResponse" in schema["components"]["schemas"]
        assert (await client.get("/api/v1/docs")).status_code == 200
        for method, path, status in (
            ("GET", "/unknown?phone=09121234567", 404),
            ("POST", "/api/v1/health/live", 405),
        ):
            response = await client.request(method, path, headers={"X-Trace-Id": "user-controlled"})
            assert response.status_code == status
            assert response.json()["trace_id"] == response.headers["x-trace-id"]
            assert response.headers["x-trace-id"] != "user-controlled"
            assert response.headers["cache-control"] == "no-store"
            assert response.headers["x-content-type-options"] == "nosniff"
            assert "09121234567" not in response.text


@pytest.mark.anyio
async def test_validation_unexpected_failure_and_logs_redact_payload(caplog):
    app = create_app(Settings(database_url=UNAVAILABLE_DB))

    class Payload(StrictSchema):
        phone: int

    @app.post("/test/validation")
    def validate(payload: Payload):
        return payload

    @app.get("/test/failure")
    def fail(secret: str = Query()):
        raise RuntimeError(f"private-message {secret}")

    logger = logging.getLogger("makan.api")
    logger.addHandler(caplog.handler)
    try:
        async with api_client(app) as client:
            invalid = await client.post("/test/validation", json={"phone": "private-phone"})
            assert invalid.status_code == 422
            assert "private-phone" not in invalid.text
            assert invalid.json()["error"]["details"][0]["field"] == "phone"
            unknown = await client.post(
                "/test/validation", json={"phone": 1, "private-key": "private-value"}
            )
            assert "private-key" not in unknown.text
            failed = await client.get("/test/failure?secret=private-secret")
            assert failed.status_code == 500
            assert failed.json()["error"]["code"] == "INTERNAL_ERROR"
            assert "private" not in failed.text
            assert failed.headers["x-trace-id"] == failed.json()["trace_id"]
        for record in caplog.records:
            output = SafeJsonFormatter().format(record)
            assert "private" not in output
            if record.name == "makan.api":
                assert record.route in ("/test/validation", "/test/failure")
                assert record.duration_ms >= 0
    finally:
        logger.removeHandler(caplog.handler)
