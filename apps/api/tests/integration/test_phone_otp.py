import asyncio
from datetime import timedelta
from urllib.parse import parse_qs
from uuid import uuid4

import httpx
import pytest
from sqlalchemy import delete, func, select, text, update
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.security import Security, totp_code
from app.main import create_app
from app.models import (
    Admin,
    AdminMfa,
    AdminOtp,
    AdminSession,
    AuditLog,
    RateLimitBucket,
    SmsConfiguration,
)
from app.services.auth import now_utc
from app.services.auth_maintenance import cleanup_expired
from tests.client import api_client
from tests.integration.conftest import migrate

pytestmark = [pytest.mark.integration, pytest.mark.anyio]
PHONE = "09120000001"


@pytest.fixture
def phone_context(database_factory):
    with database_factory() as (_, runtime, engine):
        config = Settings(
            database_url=runtime.render_as_string(hide_password=False),
            app_env="test",
            auth_legacy_password_login=False,
            auth_otp_debug=True,
            auth_otp_resend_seconds=1,
            auth_login_ip_limit=1000,
            auth_login_account_limit=200,
            auth_challenge_limit=1000,
            db_pool_timeout=10,
            db_statement_timeout_ms=10000,
        )
        security = Security(config)
        with Session(engine) as session, session.begin():
            owner = Admin(phone=PHONE, role="owner")
            editor = Admin(phone="09120000002", role="editor")
            session.add_all([owner, editor])
            session.flush()
            ids = {"owner": owner.id, "editor": editor.id}
        yield config, engine, security, ids


async def action(client, path, body=None, method="POST", version=None):
    csrf = (await client.get("/api/v1/admin/auth/csrf")).json()["csrf_token"]
    headers = {"Origin": str(client.base_url).rstrip("/"), "X-CSRF-Token": csrf}
    if version is not None:
        headers["If-Match"] = str(version)
    return await client.request(method, "/api/v1/admin/" + path, headers=headers, json=body)


async def enter(client, phone=PHONE):
    sent = await action(client, "auth/otp/request", {"phone": phone})
    assert sent.status_code == 200
    response = await action(client, "auth/otp/verify", {"phone": phone, "code": "111111"})
    assert response.status_code == 200
    return response


def clear_resend(engine):
    with Session(engine) as session, session.begin():
        session.execute(delete(RateLimitBucket).where(RateLimitBucket.scope == "otp-resend"))


def provider_configuration(engine, security):
    with Session(engine) as session, session.begin():
        session.add(
            SmsConfiguration(
                id=1,
                enabled=True,
                debug_mode=False,
                encrypted_username=security.encrypt("fixture-user", "sms:username"),
                encrypted_password=security.encrypt("fixture-password", "sms:password"),
                body_id=123,
                row_version=1,
            )
        )


async def test_phone_login_normalizes_digits_rotates_cookie_and_consumes_otp(phone_context):
    config, engine, _, _ = phone_context
    async with api_client(create_app(config)) as client:
        sent = await action(client, "auth/otp/request", {"phone": "+۹۸۹۱۲۰۰۰۰۰۰۱"})
        assert sent.status_code == 200 and sent.json()["debug"]
        with Session(engine) as session:
            otp = session.scalar(select(AdminOtp))
            assert otp.code_digest != "111111" and len(otp.code_digest) == 64
        response = await action(client, "auth/otp/verify", {"phone": PHONE, "code": "۱۱۱۱۱۱"})
        assert response.status_code == 200
        assert response.json()["phone"] == PHONE and response.json()["email"] is None
        cookie = response.headers.get_list("set-cookie")[0]
        assert "HttpOnly" in cookie and "SameSite=lax" in cookie
        assert (
            await action(client, "auth/otp/verify", {"phone": PHONE, "code": "111111"})
        ).status_code != 200
        with Session(engine) as session:
            assert session.scalar(select(func.count()).select_from(AdminSession)) == 1


@pytest.mark.parametrize("kind", ["unknown", "inactive"])
async def test_debug_code_never_grants_unregistered_or_disabled_admin(phone_context, kind):
    config, engine, _, _ = phone_context
    phone = PHONE if kind == "inactive" else "09129999999"
    if kind == "inactive":
        with Session(engine) as session, session.begin():
            session.execute(update(Admin).where(Admin.phone == PHONE).values(is_active=False))
    async with api_client(create_app(config)) as client:
        response = await action(client, "auth/otp/request", {"phone": phone})
        assert response.status_code == 200
        response = await action(client, "auth/otp/verify", {"phone": phone, "code": "111111"})
        assert response.status_code == 401
    with Session(engine) as session:
        assert session.scalar(select(func.count()).select_from(Admin)) == 2
        assert session.scalar(select(func.count()).select_from(AdminSession)) == 0


async def test_wrong_attempts_persist_and_lock_out_even_the_correct_code(phone_context):
    config, engine, _, _ = phone_context
    async with api_client(create_app(config)) as client:
        await action(client, "auth/otp/request", {"phone": PHONE})
        for _ in range(5):
            assert (
                await action(client, "auth/otp/verify", {"phone": PHONE, "code": "999999"})
            ).status_code == 401
        assert (
            await action(client, "auth/otp/verify", {"phone": PHONE, "code": "111111"})
        ).status_code == 401
    with Session(engine) as session:
        assert session.scalar(select(AdminOtp)).attempts == 5


async def test_expiry_cross_browser_csrf_and_resend_limit(phone_context):
    config, engine, _, _ = phone_context
    config = config.model_copy(update={"auth_otp_resend_seconds": 60})
    app = create_app(config)
    async with api_client(app) as client:
        assert (
            await client.post("/api/v1/admin/auth/otp/request", json={"phone": PHONE})
        ).status_code == 403
        await action(client, "auth/otp/request", {"phone": PHONE})
        assert (await action(client, "auth/otp/request", {"phone": PHONE})).status_code == 429
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://testserver"
        ) as other:
            assert (
                await action(other, "auth/otp/verify", {"phone": PHONE, "code": "111111"})
            ).status_code == 401
        with Session(engine) as session, session.begin():
            session.execute(update(AdminOtp).values(expires_at=now_utc() - timedelta(seconds=1)))
        assert (
            await action(client, "auth/otp/verify", {"phone": PHONE, "code": "111111"})
        ).status_code == 401
        with Session(engine) as session, session.begin():
            assert cleanup_expired(session, now_utc())["otps"] == 1


async def test_concurrent_verify_creates_one_session(phone_context):
    config, engine, _, _ = phone_context
    async with api_client(create_app(config)) as client:
        await action(client, "auth/otp/request", {"phone": PHONE})
        csrf = (await client.get("/api/v1/admin/auth/csrf")).json()["csrf_token"]
        headers = {"Origin": "http://testserver", "X-CSRF-Token": csrf}
        body = {"phone": PHONE, "code": "111111"}
        responses = await asyncio.gather(
            *(
                client.post("/api/v1/admin/auth/otp/verify", headers=headers, json=body)
                for _ in range(2)
            )
        )
        assert sorted(r.status_code for r in responses) in ([200, 401], [200, 403])
    with Session(engine) as session:
        assert session.scalar(select(func.count()).select_from(AdminSession)) == 1


async def test_enabled_mfa_cannot_be_bypassed_by_sms_or_debug(phone_context):
    config, engine, security, ids = phone_context
    secret = "JBSWY3DPEHPK3PXP"
    with Session(engine) as session, session.begin():
        session.add(
            AdminMfa(
                admin_id=ids["owner"],
                encrypted_totp_secret=security.encrypt(secret, str(ids["owner"])),
                enabled_at=now_utc(),
                last_used_step=-1,
            )
        )
    async with api_client(create_app(config)) as client:
        await action(client, "auth/otp/request", {"phone": PHONE})
        response = await action(client, "auth/otp/verify", {"phone": PHONE, "code": "111111"})
        assert response.status_code == 401 and response.json()["error"]["code"] == "MFA_REQUIRED"
        assert (
            await action(
                client,
                "auth/otp/verify",
                {
                    "phone": PHONE,
                    "code": "111111",
                    "mfa_code": totp_code(secret, int(now_utc().timestamp() // 30)),
                },
            )
        ).status_code == 200


async def test_sensitive_actions_require_one_time_session_bound_confirmation(phone_context):
    config, engine, _, _ = phone_context
    async with api_client(create_app(config)) as client:
        await enter(client)
        body = {"phone": "09120000003", "role": "editor", "confirmation_code": "111111"}
        assert (await action(client, "accounts", body)).status_code == 401
        assert (await action(client, "auth/otp/reauth")).status_code == 200
        response = await action(client, "accounts", body)
        assert response.status_code == 201 and response.json()["phone"] == body["phone"]
        assert (
            await action(client, "accounts", {**body, "phone": "09120000004"})
        ).status_code == 401
        clear_resend(engine)
        await action(client, "auth/otp/reauth")
        assert (
            await action(
                client, "accounts", {**body, "phone": "09120000004", "confirmation_code": "999999"}
            )
        ).status_code == 401
        with Session(engine) as session:
            assert (
                session.scalar(
                    select(AdminOtp)
                    .where(AdminOtp.purpose == "reauth")
                    .order_by(AdminOtp.created_at.desc())
                ).attempts
                == 1
            )


async def test_sms_settings_are_owner_only_encrypted_and_not_public(phone_context):
    config, engine, _, _ = phone_context
    async with api_client(create_app(config)) as client:
        await enter(client)
        settings = (await client.get("/api/v1/admin/settings/sms")).json()
        assert settings["debug_mode"] and settings["debug_allowed"]
        await action(client, "auth/otp/reauth")
        body = {
            "enabled": True,
            "debug_mode": True,
            "username": "fixture-user",
            "password": "fixture-password",
            "body_id": 123,
            "confirmation_code": "111111",
        }
        response = await action(client, "settings/sms", body, "PATCH", 1)
        assert response.status_code == 200 and response.json()["credentials_configured"]
        assert "fixture-password" not in response.text and "fixture-user" not in response.text
        with Session(engine) as session:
            row = session.get(SmsConfiguration, 1)
            assert b"fixture-password" not in row.encrypted_password
            assert "fixture-password" not in str(
                [x.field_changes_json for x in session.scalars(select(AuditLog))]
            )
        assert "sms" not in (await client.get("/api/v1/site/settings")).json()
    clear_resend(engine)
    async with api_client(create_app(config)) as editor:
        await enter(editor, "09120000002")
        assert (await editor.get("/api/v1/admin/settings/sms")).status_code == 403
        assert (await action(editor, "settings/sms/check")).status_code == 403


async def test_non_debug_official_rest_contract_random_code_and_secure_production_cookie(
    phone_context,
):
    config, engine, security, _ = phone_context
    provider_configuration(engine, security)
    config = config.model_copy(
        update={
            "app_env": "production",
            "auth_otp_debug": False,
            "auth_otp_resend_seconds": 60,
            "auth_allowed_origins": ["https://testserver"],
        }
    )
    app = create_app(config)
    sent = {}

    def handle(request):
        assert str(request.url) == "https://rest.payamak-panel.com/api/SendSMS/BaseServiceNumber"
        payload = parse_qs(request.content.decode())
        assert (
            payload["username"] == ["fixture-user"]
            and payload["password"] == ["fixture-password"]
            and payload["bodyId"] == ["123"]
        )
        sent["code"] = payload["text"][0]
        assert len(sent["code"]) == 6
        return httpx.Response(200, json={"RetStatus": 1, "Value": "987654321"})

    async with api_client(app, "https://testserver") as client:
        app.state.sms_test_transport = httpx.MockTransport(handle)
        response = await action(client, "auth/otp/request", {"phone": PHONE})
        assert response.status_code == 200 and not response.json()["debug"]
        assert "code" not in response.json()
        response = await action(client, "auth/otp/verify", {"phone": PHONE, "code": sent["code"]})
        assert response.status_code == 200
        header = response.headers.get_list("set-cookie")[0]
        assert (
            header.startswith("__Host-makan_session=")
            and "Secure" in header
            and "HttpOnly" in header
        )
        assert (await client.get("/api/v1/admin/auth/config")).json() == {
            "debug": False,
            "legacy": False,
        }


@pytest.mark.parametrize(
    "result",
    [
        {"RetStatus": 0, "Value": "-1"},
        {"RetStatus": 1, "Value": "0"},
        {"RetStatus": 1, "Value": "-2"},
        None,
    ],
)
async def test_provider_failure_never_falls_back_to_fixed_code(phone_context, result):
    config, engine, security, _ = phone_context
    provider_configuration(engine, security)
    app = create_app(config)
    async with api_client(app) as client:
        app.state.sms_test_transport = httpx.MockTransport(
            lambda request: httpx.Response(200, json=result)
        )
        assert (await action(client, "auth/otp/request", {"phone": PHONE})).status_code == 503
        assert (
            await action(client, "auth/otp/verify", {"phone": PHONE, "code": "111111"})
        ).status_code == 401


async def test_no_sms_configuration_fails_closed_and_disabled_debug_is_not_a_bypass(phone_context):
    config, _, _, _ = phone_context
    config = config.model_copy(update={"auth_otp_debug": False})
    async with api_client(create_app(config)) as client:
        assert (await action(client, "auth/otp/request", {"phone": PHONE})).status_code == 503
        assert (
            await client.post(
                "/api/v1/admin/auth/login",
                headers={"Origin": "http://testserver"},
                json={"email": "old@example.com", "password": "anything"},
            )
        ).status_code == 410


def test_forward_migration_preserves_legacy_owner_without_inventing_phone(database_factory):
    with database_factory("0007_analytics") as (_, _, engine):
        identifier = uuid4()
        with engine.begin() as connection:
            connection.execute(
                text(
                    "INSERT INTO admins (id,email,password_hash,role) "
                    "VALUES (:id,:email,:hash,:role)"
                ),
                {
                    "id": identifier,
                    "email": "legacy@example.com",
                    "hash": "preserved-legacy-hash",
                    "role": "owner",
                },
            )
        migrate(engine)
        with Session(engine) as session:
            row = session.get(Admin, identifier)
            assert (
                row.email == "legacy@example.com"
                and row.password_hash == "preserved-legacy-hash"
                and row.phone is None
            )
            assert (
                session.scalar(text("SELECT version_num FROM alembic_version")) == "0008_phone_otp"
            )


@pytest.mark.parametrize("env", ["staging", "production"])
def test_fixed_debug_and_test_only_legacy_configuration_rejected(phone_context, env):
    config, _, _, _ = phone_context
    base = {
        **config.model_dump(),
        "app_env": env,
        "auth_allowed_origins": ["https://example.com"],
        "auth_otp_resend_seconds": 60,
        "auth_legacy_password_login": False,
    }
    with pytest.raises(ValueError):
        Settings(**{**base, "auth_otp_debug": True})
    with pytest.raises(ValueError):
        Settings(**{**base, "auth_otp_debug": False, "auth_legacy_password_login": True})


async def test_turning_debug_off_invalidates_outstanding_fixed_code(phone_context):
    config, engine, _, _ = phone_context
    async with api_client(create_app(config)) as client:
        await action(client, "auth/otp/request", {"phone": PHONE})
        with Session(engine) as session, session.begin():
            session.add(SmsConfiguration(id=1, enabled=False, debug_mode=False, row_version=1))
        assert (
            await action(client, "auth/otp/verify", {"phone": PHONE, "code": "111111"})
        ).status_code == 401


async def test_last_owner_is_protected_and_consumed_confirmation_cannot_be_replayed(phone_context):
    config, engine, _, ids = phone_context
    async with api_client(create_app(config)) as client:
        await enter(client)
        await action(client, "auth/otp/reauth")
        response = await action(
            client,
            "accounts/" + str(ids["owner"]),
            {"is_active": False, "confirmation_code": "111111"},
            "PATCH",
        )
        assert response.status_code == 409
        with Session(engine) as session:
            assert session.get(Admin, ids["owner"]).is_active
            assert (
                session.scalar(select(AdminOtp).where(AdminOtp.purpose == "reauth")).used_at
                is not None
            )


def test_phone_bootstrap_and_private_sms_operator_configuration(database_factory, monkeypatch):
    import sys

    from app.commands import admin as admin_command
    from app.commands import sms as sms_command

    with database_factory() as (_, runtime, engine):
        monkeypatch.setenv("DATABASE_URL", runtime.render_as_string(hide_password=False))
        monkeypatch.setattr(sys, "argv", ["admin", "bootstrap", "--phone", PHONE])
        admin_command.main()
        with Session(engine) as session:
            owner = session.scalar(select(Admin))
            assert owner.phone == PHONE and owner.email is None and owner.password_hash is None
        monkeypatch.setattr(sys, "argv", ["sms", "configure"])
        credentials = iter(["operator-fixture-user", "operator-fixture-password"])
        monkeypatch.setattr(sms_command, "getpass", lambda prompt: next(credentials))
        monkeypatch.setattr("builtins.input", lambda prompt: "123")
        sms_command.main()
        with Session(engine) as session:
            setting = session.get(SmsConfiguration, 1)
            assert setting.enabled and not setting.debug_mode
            assert b"operator-fixture-password" not in setting.encrypted_password
            assert session.scalar(select(func.count()).select_from(AuditLog)) == 2


def test_operator_cannot_enable_fixed_debug_in_production(phone_context, monkeypatch):
    import sys

    from app.commands import sms as sms_command

    config, _, _, _ = phone_context
    production = config.model_copy(update={"app_env": "production", "auth_otp_debug": False})
    monkeypatch.setattr(sms_command, "Settings", lambda: production)
    monkeypatch.setattr(sys, "argv", ["sms", "reset-debug"])
    with pytest.raises(SystemExit):
        sms_command.main()
