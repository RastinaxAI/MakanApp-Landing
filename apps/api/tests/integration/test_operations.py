import secrets
from datetime import timedelta

import pytest
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.commands.maintenance import LOCK, cycle
from app.commands.prepare_restore import prepare
from app.core.config import Settings
from app.main import create_app
from app.models import Admin, AdminSession, AuthChallenge, Page
from app.services.auth import now_utc
from tests.client import api_client

pytestmark = [pytest.mark.integration]


@pytest.mark.anyio
async def test_verified_edge_separates_ip_quota_and_forged_forwarding_cannot(database_factory):
    with database_factory() as (_, runtime, _engine):
        key = secrets.token_hex(32)
        settings = Settings(
            database_url=runtime.render_as_string(hide_password=False),
            proxy_shared_secret=key,
            auth_challenge_limit=1,
        )
        async with api_client(create_app(settings)) as client:
            valid = {"X-Makan-Proxy-Key": key, "X-Makan-Client-IP": "203.0.113.10"}
            assert (await client.get("/api/v1/admin/auth/csrf", headers=valid)).status_code == 200
            assert (await client.get("/api/v1/admin/auth/csrf", headers=valid)).status_code == 429
            valid["X-Makan-Client-IP"] = "203.0.113.11"
            assert (await client.get("/api/v1/admin/auth/csrf", headers=valid)).status_code == 200
            forged = {
                "X-Forwarded-For": "198.51.100.10",
                "X-Makan-Client-IP": "203.0.113.12",
                "X-Makan-Proxy-Key": "forged",
            }
            assert (await client.get("/api/v1/admin/auth/csrf", headers=forged)).status_code == 200
            forged["X-Forwarded-For"] = "198.51.100.11"
            forged["X-Makan-Client-IP"] = "203.0.113.13"
            assert (await client.get("/api/v1/admin/auth/csrf", headers=forged)).status_code == 429


def test_retention_cycle_uses_single_lock_and_preserves_published_content(database_factory):
    with database_factory() as (_, _runtime, engine):
        with Session(engine) as session, session.begin():
            admin = Admin(
                email="fixture-owner@example.com", role="owner", password_hash="fixture-only-unused"
            )
            session.add(admin)
            session.flush()
            session.add(
                AuthChallenge(
                    token_digest=secrets.token_hex(32),
                    csrf_digest=secrets.token_hex(32),
                    expires_at=now_utc() - timedelta(hours=1),
                )
            )
        with engine.connect() as lock:
            lock.exec_driver_sql(f"SELECT pg_advisory_lock({LOCK})")
            assert cycle(engine) == {"skipped_lock": True}
            lock.exec_driver_sql(f"SELECT pg_advisory_unlock({LOCK})")
        result = cycle(engine)
        assert result["auth"]["challenges"] == 1
        with Session(engine) as session:
            assert session.scalar(select(func.count()).select_from(Admin)) == 1
            assert session.scalar(select(func.count()).select_from(Page)) == 0


def test_restore_revokes_recovered_sessions_and_challenges(database_factory):
    with database_factory() as (_, _runtime, engine):
        with Session(engine) as session, session.begin():
            admin = Admin(
                email="fixture-recovery@example.com",
                role="owner",
                password_hash="fixture-only-unused",
            )
            session.add(admin)
            session.flush()
            now = now_utc()
            row = AdminSession(
                admin_id=admin.id,
                token_digest=secrets.token_hex(32),
                csrf_digest=secrets.token_hex(32),
                expires_at=now + timedelta(hours=2),
                idle_expires_at=now + timedelta(minutes=20),
                last_seen_at=now,
            )
            session.add(row)
            session.add(
                AuthChallenge(
                    token_digest=secrets.token_hex(32),
                    csrf_digest=secrets.token_hex(32),
                    expires_at=now + timedelta(minutes=10),
                )
            )
        assert prepare(engine)["revoked_sessions"] == 1
        with Session(engine) as session:
            assert session.scalar(select(AdminSession.revoked_at)) is not None
            assert session.scalar(select(func.count()).select_from(AuthChallenge)) == 0
            assert session.scalar(select(func.count()).select_from(Admin)) == 1
