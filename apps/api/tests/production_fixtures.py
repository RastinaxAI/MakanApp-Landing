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
            for role in ("owner", "editor", "sales"):
                session.add(
                    Admin(
                        email=f"{role}@example.com",
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
