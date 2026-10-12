"""Dedicated real PostgreSQL fixture and API process for browser acceptance."""

import os
from pathlib import Path
from uuid import uuid4

import psycopg
import uvicorn
from alembic.config import Config
from psycopg import sql
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session

from alembic import command
from app.core.config import Settings
from app.core.security import Security
from app.db.session import build_engine
from app.main import create_app
from app.models import Admin

control = make_url(os.environ["TEST_DATABASE_ADMIN_URL"])
if control.host != "127.0.0.1" or control.port != 15432 or control.database != "makan_test_control":
    raise RuntimeError("Only the dedicated loopback test database may be used")
name = "makan_test_e2e_" + uuid4().hex
admin_url = control.set(drivername="postgresql")
owner = control.set(
    database=name, username="makan_migrator", password=os.environ["TEST_MIGRATION_DB_PASSWORD"]
)
runtime = owner.set(username="makan_api", password=os.environ["TEST_API_DB_PASSWORD"])
with psycopg.connect(
    admin_url.render_as_string(hide_password=False), autocommit=True
) as connection:
    connection.execute(
        sql.SQL("CREATE DATABASE {} OWNER makan_migrator").format(sql.Identifier(name))
    )
# Private cleanup marker contains no credential; force-stop teardown can remove this exact fixture.
Path("../../.preview/e2e-db-name.txt").write_text(name, encoding="utf-8")
engine = build_engine(Settings(database_url=owner.render_as_string(hide_password=False)))
try:
    with engine.begin() as connection:
        connection.exec_driver_sql(
            sql.SQL("GRANT CONNECT ON DATABASE {} TO makan_api")
            .format(sql.Identifier(name))
            .as_string()
        )
        connection.exec_driver_sql("REVOKE ALL ON SCHEMA public FROM PUBLIC")
        connection.exec_driver_sql("ALTER SCHEMA public OWNER TO makan_migrator")
        connection.exec_driver_sql("GRANT USAGE ON SCHEMA public TO makan_api")
        config = Config("alembic.ini")
        config.attributes["connection"] = connection
        command.upgrade(config, "head")
    settings = Settings(
        database_url=runtime.render_as_string(hide_password=False),
        app_env="test",
        auth_allowed_origins=["http://127.0.0.1:3100"],
        auth_login_ip_limit=1000,
        auth_login_account_limit=200,
        auth_challenge_limit=1000,
    )
    security = Security(settings)
    with Session(engine) as session, session.begin():
        for role in ("owner", "editor", "sales"):
            for suffix in (
                "",
                *(
                    f"-{kind}-{browser}"
                    for kind in ("mfa", "password")
                    for browser in ("chromium", "firefox", "webkit")
                ),
            ):
                session.add(
                    Admin(
                        email=f"{role}{suffix}@example.com",
                        role=role,
                        password_hash=security.hasher.hash(os.environ["E2E_ADMIN_PASSWORD"]),
                    )
                )
    uvicorn.run(
        create_app(settings), host="127.0.0.1", port=8100, log_config=None, access_log=False
    )
finally:
    engine.dispose()
    with psycopg.connect(
        admin_url.render_as_string(hide_password=False), autocommit=True
    ) as connection:
        connection.execute(sql.SQL("DROP DATABASE {} WITH (FORCE)").format(sql.Identifier(name)))
