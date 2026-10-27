import asyncio
import secrets
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta

import httpx
import pytest
from sqlalchemy import func, select, text, update
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.security import Security
from app.main import create_app
from app.models import (
    Admin,
    AdminMfa,
    AdminSession,
    AuditLog,
    AuthChallenge,
    RateLimitBucket,
)
from app.services.auth import now_utc, throttle
from tests.client import api_client

pytestmark = [pytest.mark.integration, pytest.mark.anyio]


@pytest.fixture
def auth_context(database_factory):
    with database_factory() as (_, runtime, engine):
        config = Settings(
            auth_legacy_password_login=True,
            database_url=runtime.render_as_string(hide_password=False),
            auth_login_ip_limit=1000,
            auth_login_account_limit=200,
            auth_challenge_limit=1000,
            # Functional integration fixtures are not latency benchmarks.
            # Keep production's 3s defaults; allow shared CI/development hosts 10s.
            db_pool_timeout=10,
            db_statement_timeout_ms=10000,
        )
        security = Security(config)
        password = secrets.token_urlsafe(24)
        ids = {}
        with Session(engine) as session, session.begin():
            for role in ("owner", "editor", "sales"):
                admin = Admin(
                    email=f"{role}@example.com",
                    role=role,
                    password_hash=security.hasher.hash(password),
                )
                session.add(admin)
                session.flush()
                ids[role] = admin.id
        yield config, engine, password, ids


async def sign_in(client, password, role="owner"):
    csrf = (await client.get("/api/v1/admin/auth/csrf")).json()["csrf_token"]
    return await client.post(
        "/api/v1/admin/auth/login",
        headers={"Origin": str(client.base_url).rstrip("/"), "X-CSRF-Token": csrf},
        json={"email": f"{role}@example.com", "password": password},
    )


async def mutation(client, path, method="POST", body=None, csrf=True, origin="http://testserver"):
    headers = {"Origin": origin}
    if csrf:
        headers["X-CSRF-Token"] = (await client.get("/api/v1/admin/auth/csrf")).json()["csrf_token"]
    return await client.request(method, "/api/v1/admin/" + path, headers=headers, json=body)


async def test_login_cookie_digest_logout_and_fixation(auth_context):
    config, engine, password, _ = auth_context
    async with api_client(create_app(config)) as client:
        forged = "A" * 43
        client.cookies.set("makan_session", forged, domain="testserver.local", path="/")
        response = await sign_in(client, password)
        assert response.status_code == 200 and response.json()["role"] == "owner"
        token = client.cookies.get("makan_session")
        assert token != forged
        cookie = response.headers.get_list("set-cookie")[0]
        assert (
            "HttpOnly" in cookie
            and "SameSite=lax" in cookie
            and "Path=/" in cookie
            and "Domain=" not in cookie
        )
        with Session(engine) as session:
            row = session.scalar(select(AdminSession))
            assert token not in row.token_digest and len(row.token_digest) == 64
            assert len(row.csrf_digest) == 64
        assert (await client.get("/api/v1/admin/auth/me")).status_code == 200
        assert (await mutation(client, "auth/logout")).status_code == 204
        assert client.cookies.get("makan_session") is None
        client.cookies.set("makan_session", token)
        assert (await client.get("/api/v1/admin/auth/me")).status_code == 401


async def test_owner_can_revoke_another_administrators_session(auth_context):
    config, _, password, ids = auth_context
    app = create_app(config)
    async with api_client(app) as owner:
        await sign_in(owner, password)
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://testserver"
        ) as editor:
            await sign_in(editor, password, "editor")
            own = (await editor.get("/api/v1/admin/auth/sessions")).json()[0]
            assert (
                await editor.get(f"/api/v1/admin/auth/sessions?admin_id={ids['owner']}")
            ).status_code == 403
            response = await owner.get(f"/api/v1/admin/auth/sessions?admin_id={ids['editor']}")
            assert response.status_code == 200 and response.json()[0]["id"] == own["id"]
            assert (
                await mutation(owner, f"auth/sessions/{own['id']}", "DELETE")
            ).status_code == 204
            assert (await editor.get("/api/v1/admin/auth/me")).status_code == 401


async def test_production_rejects_legacy_password_login(auth_context):
    config, _, password, _ = auth_context
    config = config.model_copy(
        update={
            "app_env": "production",
            "auth_allowed_origins": ["https://testserver"],
            "auth_legacy_password_login": False,
        }
    )
    async with api_client(create_app(config), "https://testserver") as client:
        response = await sign_in(client, password)
        assert response.status_code == 410


async def test_login_csrf_origin_consumption_and_expiry(auth_context):
    config, engine, password, _ = auth_context
    async with api_client(create_app(config)) as client:
        body = {"email": "owner@example.com", "password": password}
        assert (await client.post("/api/v1/admin/auth/login", json=body)).status_code == 403
        csrf = (await client.get("/api/v1/admin/auth/csrf")).json()["csrf_token"]
        headers = {"Origin": "http://testserver", "X-CSRF-Token": csrf}
        assert (
            await client.post(
                "/api/v1/admin/auth/login",
                json=body,
                headers={**headers, "Origin": "https://evil.example.com"},
            )
        ).status_code == 403
        assert (
            await client.get("/api/v1/admin/auth/csrf", headers={"Sec-Fetch-Site": "cross-site"})
        ).status_code == 403
        failed = await client.post(
            "/api/v1/admin/auth/login", json={**body, "password": "wrong"}, headers=headers
        )
        assert failed.status_code == 401
        assert (
            await client.post("/api/v1/admin/auth/login", json=body, headers=headers)
        ).status_code == 403
        await client.get("/api/v1/admin/auth/csrf")
        with Session(engine) as session, session.begin():
            session.execute(
                update(AuthChallenge).values(expires_at=now_utc() - timedelta(seconds=1))
            )
        assert (
            await client.post("/api/v1/admin/auth/login", json=body, headers=headers)
        ).status_code == 403


@pytest.mark.parametrize("state", ["idle", "absolute", "revoked", "inactive"])
async def test_stale_or_inactive_session_is_unauthorized(auth_context, state):
    config, engine, password, ids = auth_context
    async with api_client(create_app(config)) as client:
        assert (await sign_in(client, password)).status_code == 200
        with Session(engine) as session, session.begin():
            if state == "inactive":
                session.execute(
                    update(Admin).where(Admin.id == ids["owner"]).values(is_active=False)
                )
            else:
                key = {
                    "idle": "idle_expires_at",
                    "absolute": "expires_at",
                    "revoked": "revoked_at",
                }[state]
                session.execute(
                    update(AdminSession).values(**{key: now_utc() - timedelta(seconds=1)})
                )
        assert (await client.get("/api/v1/admin/auth/me")).status_code == 401


async def test_role_matrix_and_unknown_field_protection(auth_context):
    config, _, password, _ = auth_context
    async with api_client(create_app(config)) as client:
        for path in ("accounts", "audit-logs", "dashboard", "auth/sessions"):
            assert (
                await client.get("/api/v1/admin/" + path, headers={"X-Role": "owner"})
            ).status_code == 401
        for role in ("editor", "sales", "owner"):
            client.cookies.clear()
            assert (await sign_in(client, password, role)).status_code == 200
            for path in ("accounts", "audit-logs"):
                assert (await client.get("/api/v1/admin/" + path)).status_code == (
                    200 if role == "owner" else 403
                )
            assert (await client.get("/api/v1/admin/dashboard")).status_code == 200
        assert (await client.get("/api/v1/admin/accounts?page_size=101")).status_code == 422
        assert (await client.get("/api/v1/admin/accounts?include_draft=true")).status_code == 422
        assert (await mutation(client, "auth/logout", csrf=False)).status_code == 403
        assert (
            await mutation(client, "auth/logout", origin="https://evil.example.com")
        ).status_code == 403


async def test_failed_login_is_generic_and_rate_limit_is_persistent(auth_context):
    config, engine, _, _ = auth_context
    config = config.model_copy(update={"auth_login_account_limit": 2})
    async with api_client(create_app(config)) as client:
        first = await sign_in(client, "wrong")
        csrf = (await client.get("/api/v1/admin/auth/csrf")).json()["csrf_token"]
        other = await client.post(
            "/api/v1/admin/auth/login",
            headers={"Origin": "http://testserver", "X-CSRF-Token": csrf},
            json={"email": "missing@example.com", "password": "wrong"},
        )
        assert (
            first.status_code == other.status_code == 401
            and first.json()["error"] == other.json()["error"]
        )
        assert (await sign_in(client, "wrong")).status_code == 401
        limited = await sign_in(client, "wrong")
        assert limited.status_code == 429 and int(limited.headers["retry-after"]) > 0
        with Session(engine) as session:
            values = session.scalars(select(RateLimitBucket.subject_hmac)).all()
            assert all("owner" not in value and "127.0.0.1" not in value for value in values)
            assert (
                session.scalar(
                    select(func.count())
                    .select_from(AuditLog)
                    .where(AuditLog.action == "auth.login_failed")
                )
                == 3
            )


async def test_last_owner_account_mutation_audit_and_revocation(auth_context):
    config, engine, password, ids = auth_context
    async with api_client(create_app(config)) as client:
        await sign_in(client, password)
        body = {"current_password": password, "is_active": False}
        assert (
            await mutation(client, f"accounts/{ids['owner']}", "PATCH", body)
        ).status_code == 409
        assert (
            await mutation(client, f"accounts/{ids['editor']}", "PATCH", body)
        ).status_code == 200
        response = await mutation(
            client,
            "accounts",
            "POST",
            {
                "email": "new@example.com",
                "password": "a valid fixture password",
                "role": "sales",
                "current_password": password,
            },
        )
        assert response.status_code == 201 and "password" not in response.text
        duplicate = await mutation(
            client,
            "accounts",
            "POST",
            {
                "email": "new@example.com",
                "password": "a valid fixture password",
                "role": "sales",
                "current_password": password,
            },
        )
        assert duplicate.status_code == 409
        with Session(engine) as session:
            assert not session.get(Admin, ids["editor"]).is_active
            assert (
                session.scalar(
                    select(func.count())
                    .select_from(AuditLog)
                    .where(AuditLog.action == "admin.updated")
                )
                == 1
            )


async def test_password_change_and_reauthentication_throttle(auth_context):
    config, engine, password, _ = auth_context
    config = config.model_copy(update={"auth_login_account_limit": 2})
    async with api_client(create_app(config)) as client:
        await sign_in(client, password)
        for _ in range(2):
            assert (
                await mutation(
                    client,
                    "auth/password",
                    "PATCH",
                    {"current_password": "wrong", "new_password": "a new valid fixture password"},
                )
            ).status_code == 401
        limited = await mutation(
            client,
            "auth/password",
            "PATCH",
            {"current_password": password, "new_password": "a new valid fixture password"},
        )
        assert limited.status_code == 429
        with Session(engine) as session, session.begin():
            session.execute(text("DELETE FROM rate_limit_buckets WHERE scope='reauth'"))
        assert (
            await mutation(
                client,
                "auth/password",
                "PATCH",
                {"current_password": password, "new_password": "a new valid fixture password"},
            )
        ).status_code == 204
        assert (await client.get("/api/v1/admin/auth/me")).status_code == 401
        with Session(engine) as session, session.begin():
            session.execute(text("DELETE FROM rate_limit_buckets WHERE scope='login-account'"))
        assert (await sign_in(client, password)).status_code == 401
        assert (await sign_in(client, "a new valid fixture password")).status_code == 200


async def test_session_revoke_and_cross_account_denial(auth_context):
    config, _, password, _ = auth_context
    app = create_app(config)
    async with api_client(app) as client:
        await sign_in(client, password, "editor")
        item = (await client.get("/api/v1/admin/auth/sessions")).json()[0]
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://testserver"
        ) as other:
            await sign_in(other, password, "sales")
            assert (
                await mutation(other, f"auth/sessions/{item['id']}", "DELETE")
            ).status_code == 404
        assert (await mutation(client, f"auth/sessions/{item['id']}", "DELETE")).status_code == 204
        assert (await client.get("/api/v1/admin/auth/me")).status_code == 401


async def test_retired_mfa_does_not_block_legacy_regression_login(auth_context):
    config, engine, password, ids = auth_context
    with Session(engine) as session, session.begin():
        session.add(
            AdminMfa(
                admin_id=ids["owner"],
                encrypted_totp_secret=b"retired",
                enabled_at=now_utc(),
                last_used_step=-1,
            )
        )
    async with api_client(create_app(config)) as client:
        response = await sign_in(client, password)
        assert response.status_code == 200
        assert "mfa_enabled" not in response.json()
        assert (
            await mutation(
                client,
                "accounts",
                body={
                    "email": "new@example.com",
                    "password": password,
                    "role": "editor",
                    "current_password": password,
                },
            )
        ).status_code == 201


async def test_body_limit_and_no_auth_draft_routes(auth_context):
    config, _, _, _ = auth_context
    async with api_client(create_app(config)) as client:
        assert (
            await client.post("/api/v1/admin/auth/login", content="a" * 16385)
        ).status_code == 413
        assert (await client.get("/api/v1/pages/home")).status_code == 404


async def test_concurrent_last_owner_changes_keep_one_active_owner(auth_context):
    config, engine, password, ids = auth_context
    app = create_app(config)
    async with api_client(app) as first:
        with Session(engine) as session, session.begin():
            extra = Admin(
                email="owner2@example.com",
                role="owner",
                password_hash=app.state.security.hasher.hash(password),
            )
            session.add(extra)
            session.flush()
            second_id = extra.id
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://testserver"
        ) as second:
            assert (await sign_in(first, password)).status_code == 200
            assert (await sign_in(second, password, "owner2")).status_code == 200
            result = await asyncio.gather(
                mutation(
                    first,
                    f"accounts/{ids['owner']}",
                    "PATCH",
                    {"current_password": password, "is_active": False},
                ),
                mutation(
                    second,
                    f"accounts/{second_id}",
                    "PATCH",
                    {"current_password": password, "is_active": False},
                ),
            )
            assert sorted(item.status_code for item in result) == [200, 409]
        with Session(engine) as session:
            assert (
                session.scalar(
                    select(func.count())
                    .select_from(Admin)
                    .where(Admin.role == "owner", Admin.is_active.is_(True))
                )
                == 1
            )


async def test_audit_failure_rolls_back_sensitive_mutation(auth_context):
    config, engine, password, _ = auth_context
    async with api_client(create_app(config)) as client:
        await sign_in(client, password)
        with engine.begin() as connection:
            connection.execute(text("REVOKE INSERT ON audit_logs FROM makan_api"))
        response = await mutation(
            client,
            "accounts",
            "POST",
            {
                "email": "rollback@example.com",
                "password": "a valid fixture password",
                "role": "editor",
                "current_password": password,
            },
        )
        assert response.status_code == 503 and "password" not in response.text
        with Session(engine) as session:
            assert (
                session.scalar(select(Admin.id).where(Admin.email == "rollback@example.com"))
                is None
            )


async def test_forwarded_ip_cannot_bypass_login_limit(auth_context):
    config, _, _, _ = auth_context
    config = config.model_copy(update={"auth_login_ip_limit": 1})
    async with api_client(create_app(config)) as client:
        assert (await sign_in(client, "wrong")).status_code == 401
        csrf = (await client.get("/api/v1/admin/auth/csrf")).json()["csrf_token"]
        response = await client.post(
            "/api/v1/admin/auth/login",
            headers={
                "Origin": "http://testserver",
                "X-CSRF-Token": csrf,
                "X-Forwarded-For": "192.0.2.10",
            },
            json={"email": "editor@example.com", "password": "wrong"},
        )
        assert response.status_code == 429


async def test_postgres_rate_limit_is_atomic_across_connections(auth_context):
    config, engine, _, _ = auth_context
    security = Security(config)

    def consume(_):
        with Session(engine) as session, session.begin():
            return throttle(session, security, "concurrency-fixture", "shared-fixture", 3, 86400)

    with ThreadPoolExecutor(max_workers=8) as pool:
        results = list(pool.map(consume, range(12)))
    assert results.count(None) == 3
    with Session(engine) as session:
        assert (
            session.scalar(
                select(RateLimitBucket.count).where(RateLimitBucket.scope == "concurrency-fixture")
            )
            == 12
        )


async def test_operator_bootstrap_and_recovery_are_audited(database_factory, monkeypatch):
    import sys

    from app.commands import admin as command

    with database_factory() as (_, runtime, engine):
        monkeypatch.setenv("DATABASE_URL", runtime.render_as_string(hide_password=False))
        initial = "first operator fixture password"
        monkeypatch.setattr(command, "getpass", lambda prompt: initial)
        monkeypatch.setattr(sys, "argv", ["admin", "bootstrap", "--email", "bootstrap@example.com"])
        command.main()
        with Session(engine) as session:
            row = session.scalar(select(Admin))
            assert row.role == "owner" and row.password_hash.startswith("$argon2id$")
            assert session.scalar(select(AuditLog.action)) == "admin.bootstrap"
        with pytest.raises(SystemExit):
            command.main()
        app = create_app(
            Settings(
                database_url=runtime.render_as_string(hide_password=False),
                auth_legacy_password_login=True,
            )
        )
        async with api_client(app) as client:
            csrf = (await client.get("/api/v1/admin/auth/csrf")).json()["csrf_token"]
            response = await client.post(
                "/api/v1/admin/auth/login",
                headers={"Origin": "http://testserver", "X-CSRF-Token": csrf},
                json={"email": "bootstrap@example.com", "password": initial},
            )
            assert response.status_code == 200
            monkeypatch.setattr(
                sys, "argv", ["admin", "recover", "--email", "bootstrap@example.com"]
            )
            monkeypatch.setattr(
                command, "getpass", lambda prompt: "recovered operator fixture password"
            )
            command.main()
            assert (await client.get("/api/v1/admin/auth/me")).status_code == 401
        with Session(engine) as session:
            assert (
                session.scalar(
                    select(func.count())
                    .select_from(AuditLog)
                    .where(AuditLog.action == "admin.operator_recovery")
                )
                == 1
            )


async def test_cleanup_is_bounded_and_keeps_live_authentication_and_audit(auth_context):
    from app.services.auth_maintenance import cleanup_expired

    config, engine, password, _ = auth_context
    async with api_client(create_app(config)) as client:
        await sign_in(client, password)
        await client.get("/api/v1/admin/auth/csrf")
        now = now_utc()
        with Session(engine) as session, session.begin():
            for index in range(2):
                session.add(
                    AuthChallenge(
                        token_digest=f"{index + 1:064x}",
                        csrf_digest="0" * 64,
                        expires_at=now - timedelta(seconds=1),
                    )
                )
                session.add(
                    RateLimitBucket(
                        scope="cleanup-fixture",
                        subject_hmac=f"{index + 1:064x}",
                        window_start=now - timedelta(minutes=20),
                        count=1,
                        expires_at=now - timedelta(seconds=1),
                    )
                )
        with Session(engine) as session, session.begin():
            audit_count = session.scalar(select(func.count()).select_from(AuditLog))
            result = cleanup_expired(session, now, 1)
            assert result == {"challenges": 1, "rate_buckets": 1, "otps": 0}
            assert session.scalar(select(func.count()).select_from(AuditLog)) == audit_count
            with pytest.raises(ValueError):
                cleanup_expired(session, now, 0)
        assert (await client.get("/api/v1/admin/auth/me")).status_code == 200
        with Session(engine) as session:
            assert (
                session.scalar(
                    select(func.count())
                    .select_from(AuthChallenge)
                    .where(AuthChallenge.expires_at < now)
                )
                == 1
            )
            assert (
                session.scalar(
                    select(func.count())
                    .select_from(RateLimitBucket)
                    .where(RateLimitBucket.expires_at < now)
                )
                == 1
            )
