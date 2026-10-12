import base64
import secrets

import pytest
from cryptography.exceptions import InvalidTag
from pydantic import ValidationError

from app.core.config import Settings
from app.core.security import Security, matching_totp_step, opaque_token, totp_code, valid_token
from app.schemas.auth import AccountCreate

URL = "postgresql+psycopg://test:test@127.0.0.1:9/test"


@pytest.mark.parametrize(
    "seconds,expected",
    [
        (59, "287082"),
        (1111111109, "081804"),
        (1111111111, "050471"),
        (1234567890, "005924"),
        (2000000000, "279037"),
        (20000000000, "353130"),
    ],
)
def test_rfc6238_sha1_reference_vectors_truncated_to_six_digits(seconds, expected):
    secret = base64.b32encode(b"12345678901234567890").decode()
    assert totp_code(secret, seconds // 30) == expected


def test_totp_replay_window_and_token_entropy():
    secret = base64.b32encode(b"12345678901234567890").decode()
    assert matching_totp_step(secret, "287082", 59, -1) == 1
    assert matching_totp_step(secret, "۲۸۷۰۸۲", 59, -1) == 1
    assert matching_totp_step(secret, "😀", 59, -1) is None
    assert matching_totp_step(secret, "287082", 59, 1) is None
    assert matching_totp_step(secret, "287082", 120, -1) is None
    token = opaque_token()
    assert valid_token(token) and len(token) == 43
    assert not valid_token("../../secret")


def test_argon2_and_mfa_cipher_redaction_and_aad():
    security = Security(Settings(database_url=URL))
    value = "fixture password only, 15+ chars"
    hashed = security.hasher.hash(value)
    assert hashed.startswith("$argon2id$") and value not in hashed
    assert security.password_matches(hashed, value)
    assert not security.password_matches(hashed, "wrong")
    assert not security.password_matches("invalid-hash", value)
    encrypted = security.encrypt("TOTP-TEST-SECRET", "account-a")
    assert b"TOTP-TEST-SECRET" not in encrypted
    assert security.decrypt(encrypted, "account-a") == "TOTP-TEST-SECRET"
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
