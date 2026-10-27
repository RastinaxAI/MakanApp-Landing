import secrets

import pytest
from cryptography.exceptions import InvalidTag
from pydantic import ValidationError

from app.core.config import Settings
from app.core.security import Security, opaque_token, valid_token
from app.schemas.auth import AccountCreate

URL = "postgresql+psycopg://test:test@127.0.0.1:9/test"


def test_session_token_entropy_and_format():
    token = opaque_token()
    assert valid_token(token) and len(token) == 43
    assert not valid_token("../../secret")


def test_argon2_and_provider_cipher_redaction_and_aad():
    security = Security(Settings(database_url=URL))
    value = "fixture password only, 15+ chars"
    hashed = security.hasher.hash(value)
    assert hashed.startswith("$argon2id$") and value not in hashed
    assert security.password_matches(hashed, value)
    assert not security.password_matches(hashed, "wrong")
    assert not security.password_matches("invalid-hash", value)
    encrypted = security.encrypt("SMS-TEST-SECRET", "account-a")
    assert b"SMS-TEST-SECRET" not in encrypted
    assert security.decrypt(encrypted, "account-a") == "SMS-TEST-SECRET"
    with pytest.raises(InvalidTag):
        security.decrypt(encrypted, "account-b")


def test_missing_weak_equal_keys_and_unsafe_origins_fail(monkeypatch):
    monkeypatch.delenv("AUTH_SECRET")
    with pytest.raises(ValidationError):
        Settings(database_url=URL)
    for secret in ("weak", "g" * 64):
        with pytest.raises(ValidationError):
            Settings(database_url=URL, auth_secret=secret)
    key = secrets.token_hex(32)
    with pytest.raises(ValidationError):
        Settings(database_url=URL, auth_secret=key, auth_mfa_key=key)
    for origin in (
        "http://evil.example.com",
        "https://safe.example.com/path",
        "https://user:pw@safe.example.com",
        "null",
    ):
        with pytest.raises(ValidationError):
            Settings(database_url=URL, auth_secret=key, auth_allowed_origins=[origin])
    with pytest.raises(ValidationError):
        Settings(database_url=URL, auth_secret=key, app_env="production")


def test_account_password_policy_and_unknown_fields():
    with pytest.raises(ValidationError):
        AccountCreate(
            email="staff@example.com", password="short", role="editor", current_password="current"
        )
    with pytest.raises(ValidationError):
        AccountCreate(
            email="staff@example.com",
            password="long fixture password",
            role="root",
            current_password="current",
        )
