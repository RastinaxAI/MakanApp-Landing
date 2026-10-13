import json
import secrets

import pytest


@pytest.fixture(autouse=True)
def auth_test_environment(monkeypatch):
    monkeypatch.setenv("AUTH_SECRET", secrets.token_hex(32))
    monkeypatch.setenv("AUTH_MFA_KEY", secrets.token_hex(32))
    monkeypatch.setenv("PROXY_SHARED_SECRET", secrets.token_hex(32))
    monkeypatch.setenv("AUTH_ALLOWED_ORIGINS", json.dumps(["http://testserver"]))


@pytest.fixture
def anyio_backend():
    return "asyncio"
