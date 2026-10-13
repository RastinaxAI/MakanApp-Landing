import json
import secrets

import httpx
import pytest
from pydantic import ValidationError
from starlette.applications import Starlette
from starlette.responses import JSONResponse
from starlette.routing import Route

from app.core.config import Settings
from app.core.trusted_proxy import TrustedProxyMiddleware

URL = "postgresql+psycopg://unit:private-test-password@127.0.0.1:9/unit"


def test_production_requires_separate_valid_proxy_key(monkeypatch):
    monkeypatch.delenv("PROXY_SHARED_SECRET", raising=False)
    for key in (None, "invalid", Settings(database_url=URL).auth_secret.get_secret_value()):
        with pytest.raises(ValidationError):
            Settings(
                database_url=URL,
                app_env="production",
                auth_allowed_origins=["https://testserver"],
                proxy_shared_secret=key,
            )


@pytest.mark.anyio
@pytest.mark.parametrize(
    "mode,ip,expected",
    [
        ("missing", "203.0.113.10", "10.9.0.12"),
        ("wrong", "203.0.113.10", "10.9.0.12"),
        ("valid", "203.0.113.10", "203.0.113.10"),
        ("valid", "2001:db8::a", "2001:db8::a"),
        ("valid", "203.0.113.10, 203.0.113.11", "10.9.0.12"),
        ("valid", "not-an-address", "10.9.0.12"),
    ],
)
async def test_only_authenticated_edge_changes_peer(mode, ip, expected):
    secret = secrets.token_hex(32)

    async def peer(request):
        return JSONResponse({"peer": request.client.host})

    app = TrustedProxyMiddleware(
        Starlette(routes=[Route("/", peer)]), Settings(database_url=URL, proxy_shared_secret=secret)
    )
    headers = {
        "X-Makan-Client-IP": ip,
        "X-Forwarded-For": "198.51.100.99",
        "X-Real-IP": "198.51.100.98",
    }
    if mode != "missing":
        headers["X-Makan-Proxy-Key"] = secret if mode == "valid" else "forged"
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app, client=("10.9.0.12", 777)),
        base_url="http://testserver",
    ) as client:
        result = await client.get("/", headers=headers)
        assert result.json() == {"peer": expected}
        assert secret not in json.dumps(dict(result.headers))
