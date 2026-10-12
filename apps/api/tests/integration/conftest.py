import os
from contextlib import contextmanager
from uuid import uuid4

import psycopg
import pytest
from alembic.config import Config
from psycopg import sql
from sqlalchemy.engine import make_url

from alembic import command
from app.core.config import Settings
from app.db.session import build_engine


@pytest.fixture(scope="session")
def test_control_url():
    value = os.environ.get("TEST_DATABASE_ADMIN_URL")
    if not value:
        pytest.fail("TEST_DATABASE_ADMIN_URL is required; integration tests cannot silently skip")
    url = make_url(value)
    if (
        url.drivername != "postgresql+psycopg"
        or url.username != "postgres"
        or url.host not in ("127.0.0.1", "localhost")
        or url.port != 15432
        or url.database != "makan_test_control"
    ):
        pytest.fail("Only the dedicated localhost:15432/makan_test_control instance is allowed")
    return url


@pytest.fixture
def database_factory(test_control_url):
    @contextmanager
    def provision(revision="head"):
        name = "makan_test_" + uuid4().hex
        control = test_control_url.set(drivername="postgresql")
        owner = test_control_url.set(
            database=name,
            username="makan_migrator",
            password=os.environ["TEST_MIGRATION_DB_PASSWORD"],
        )
        runtime = owner.set(username="makan_api", password=os.environ["TEST_API_DB_PASSWORD"])
        with psycopg.connect(
            control.render_as_string(hide_password=False), autocommit=True
        ) as connection:
            connection.execute(
                sql.SQL("CREATE DATABASE {} OWNER makan_migrator").format(sql.Identifier(name))
            )
        try:
            with psycopg.connect(
                owner.set(drivername="postgresql").render_as_string(hide_password=False),
                autocommit=True,
            ) as connection:
                connection.execute("REVOKE ALL ON SCHEMA public FROM PUBLIC")
                connection.execute("ALTER SCHEMA public OWNER TO makan_migrator")
                connection.execute("GRANT USAGE ON SCHEMA public TO makan_api")
                connection.execute(
                    sql.SQL("REVOKE ALL ON DATABASE {} FROM PUBLIC").format(sql.Identifier(name))
                )
                connection.execute(
                    sql.SQL("GRANT CONNECT ON DATABASE {} TO makan_api").format(
                        sql.Identifier(name)
                    )
                )
            engine = build_engine(
                Settings(database_url=owner.render_as_string(hide_password=False))
            )
            try:
                if revision:
                    migrate(engine, revision)
                yield owner, runtime, engine
            finally:
                engine.dispose()
        finally:
            # Only this fixture's generated database is deleted, on the verified test instance.
            if not name.startswith("makan_test_") or len(name) != 43:
                raise RuntimeError("Unsafe test database cleanup target")
            with psycopg.connect(
                control.render_as_string(hide_password=False), autocommit=True
            ) as connection:
                connection.execute(
                    sql.SQL("DROP DATABASE {} WITH (FORCE)").format(sql.Identifier(name))
                )

    return provision


def migrate(engine, revision="head"):
    config = Config("alembic.ini")
    with engine.begin() as connection:
        config.attributes["connection"] = connection
        command.upgrade(config, revision)
