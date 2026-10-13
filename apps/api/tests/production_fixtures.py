"""Only executed through the private stdin of an isolated acceptance API container."""

import os

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.security import Security
from app.db.session import build_engine
from app.models import Admin, SiteSetting
from app.services.content_import import import_initial


def seed_fixture(password, origin, seo_source):
    if not os.environ.get("APP_ENV") == "staging" or not origin.startswith("https://localhost:"):
        raise RuntimeError("Production fixtures require isolated localhost staging")
    config = Settings()
    engine = build_engine(config)
    security = Security(config)
    try:
        with Session(engine) as session, session.begin():
            if session.scalar(select(Admin.id).limit(1)):
                raise RuntimeError("Fixture account registry must be empty")
            import_initial(session)
            for role_index, role in enumerate(("owner", "editor", "sales")):
                session.add(
                    Admin(
                        email=f"{role}@example.com",
                        phone=f"0912000000{role_index + 1}",
                        role=role,
                        password_hash=security.hasher.hash(password),
                    )
                )
            session.flush()
            owner = session.scalar(select(Admin.id).where(Admin.role == "owner"))
            namespace = {"__name__": "acceptance_seo_fixtures"}
            exec(compile(seo_source, "isolated-seo-fixtures", "exec"), namespace)
            namespace["seed"](session, config, owner)
            general = session.get(SiteSetting, "general")
            general.value_json = {**general.value_json, "site_url": origin}
        print("Isolated HTTPS acceptance fixtures created; no product account created.")
    finally:
        engine.dispose()


def seed_otp_delivery(phone, challenge, code, origin):
    """Controlled delivery fixture, never a runtime route or a real SMS delivery assertion."""
    from datetime import timedelta
    from uuid import uuid4

    from app.models import AdminOtp
    from app.services.auth import now_utc

    if os.environ.get("APP_ENV") != "staging" or not origin.startswith("https://localhost:"):
        raise RuntimeError("Isolated localhost staging fixture required")
    config = Settings()
    security = Security(config)
    engine = build_engine(config)
    try:
        with Session(engine) as session, session.begin():
            admin = session.scalar(
                select(Admin).where(Admin.phone == phone, Admin.is_active.is_(True))
            )
            if not admin:
                raise RuntimeError("Fixture account missing")
            identifier = uuid4()
            session.add(
                AdminOtp(
                    id=identifier,
                    admin_id=admin.id,
                    binding_digest=security.digest("otp-binding:login", challenge),
                    phone_digest=security.digest("otp-phone", phone),
                    code_digest=security.digest("otp:" + str(identifier), code),
                    purpose="login",
                    debug_code=False,
                    delivered=True,
                    expires_at=now_utc() + timedelta(minutes=5),
                )
            )
    finally:
        engine.dispose()
