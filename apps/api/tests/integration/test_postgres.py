from datetime import UTC, datetime
from uuid import uuid4

import pytest
from alembic.autogenerate import compare_metadata
from alembic.runtime.migration import MigrationContext
from sqlalchemy import inspect, select, text
from sqlalchemy.exc import IntegrityError, ProgrammingError
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.db.base import Base
from app.db.session import build_engine
from app.main import create_app
from app.models import Admin, AuditLog, Page, PageRevision
from app.repositories.base import Repository
from app.services.unit_of_work import transaction
from tests.client import api_client
from tests.integration.conftest import migrate

pytestmark = pytest.mark.integration


def administrator():
    # Isolated fixture; no account, password or published marketing content is seeded in dev.
    return Admin(email=f"{uuid4().hex}@example.test", password_hash="test-only-hash", role="owner")


def test_fresh_upgrade_is_idempotent_and_matches_models(database_factory):
    with database_factory() as (_, _, engine):
        assert {
            "admin_sessions",
            "auth_challenges",
            "admin_mfa",
            "admin_recovery_codes",
            "rate_limit_buckets",
            "alembic_version",
            "admins",
            "audit_logs",
            "pages",
            "page_revisions",
            "faq_categories",
            "media_assets",
            "page_sections",
            "revision_media_refs",
            "site_settings",
            "setting_media_refs",
            "learning_categories",
            "learning_tags",
            "learning_revision_categories",
            "learning_revision_tags",
            "learning_revision_relations",
            "learning_series_items",
            "learning_views",
            "learning_stats",
            "leads",
            "lead_receipts",
            "lead_notes",
            "lead_status_history",
            "analytics_events",
        } == set(inspect(engine).get_table_names())
        migrate(engine)
        with engine.connect() as connection:
            assert compare_metadata(MigrationContext.configure(connection), Base.metadata) == []
            assert connection.scalar(text("SHOW server_version")).startswith("17.11")


def test_seeded_prior_revision_upgrade_preserves_data(database_factory):
    with database_factory("0001_admin_core") as (_, _, engine):
        with Session(engine) as session, transaction(session):
            admin = administrator()
            session.add(admin)
            session.flush()
            admin_id = admin.id
            admin_email = admin.email
        assert "pages" not in inspect(engine).get_table_names()
        migrate(engine)
        with Session(engine) as session:
            assert session.get(Admin, admin_id).role == "owner"
            assert session.scalar(select(Admin.email)) == admin_email


@pytest.mark.anyio
async def test_health_requires_current_schema_and_hides_database_details(database_factory):
    with database_factory(None) as (_, runtime, engine):
        app = create_app(Settings(database_url=runtime.render_as_string(hide_password=False)))
        async with api_client(app) as client:
            assert (await client.get("/api/v1/health/live")).status_code == 200
            assert (await client.get("/api/v1/health/ready")).status_code == 503
            migrate(engine, "0001_admin_core")
            assert (await client.get("/api/v1/health/ready")).status_code == 503
            migrate(engine)
            assert (await client.get("/api/v1/health/ready")).json() == {"status": "ok"}
            assert (await client.get("/api/v1/health/ready")).status_code == 200


def test_repository_transaction_commit_and_rollback(database_factory):
    with database_factory() as (_, _, engine):
        with Session(engine) as session:
            repository = Repository(session, Admin)
            with transaction(session):
                admin = administrator()
                repository.add(admin)
            admin_id = admin.id
        with Session(engine) as session:
            assert Repository(session, Admin).get(admin_id) is not None
        with pytest.raises(RuntimeError), Session(engine) as session, transaction(session):
            doomed = administrator()
            session.add(doomed)
            session.flush()
            doomed_id = doomed.id
            raise RuntimeError("rollback")
        with Session(engine) as session:
            assert session.get(Admin, doomed_id) is None


def test_postgres_constraints_revision_ownership_and_timestamps(database_factory):
    with database_factory() as (_, _, engine):
        with Session(engine) as session, transaction(session):
            admin = administrator()
            session.add(admin)
            session.flush()
            page = Page(slug="home", page_type="home")
            other = Page(slug="other", page_type="public")
            session.add_all([page, other])
            session.flush()
            revision = PageRevision(
                page_id=page.id, revision_no=1, title="صفحه اصلی", created_by=admin.id
            )
            session.add(revision)
            session.flush()
            page.working_revision_id = revision.id
            page_id, other_id, revision_id = page.id, other.id, revision.id
            assert page.created_at.utcoffset().total_seconds() == 0
        for mutation in (
            lambda session: session.add(Page(slug="home", page_type="home")),
            lambda session: session.execute(
                text("UPDATE pages SET working_revision_id=:rev WHERE id=:page"),
                {"rev": revision_id, "page": other_id},
            ),
            lambda session: session.execute(
                text("UPDATE pages SET scheduled_at=:time WHERE id=:page"),
                {"time": datetime.now(UTC), "page": page_id},
            ),
            lambda session: session.execute(text("UPDATE admins SET role='guest'")),
            lambda session: session.execute(text("DELETE FROM admins")),
            lambda session: session.execute(text("UPDATE pages SET row_version=0")),
        ):
            with pytest.raises(IntegrityError), Session(engine) as session, transaction(session):
                mutation(session)
                session.flush()


def test_runtime_cannot_modify_schema_or_audit_history(database_factory):
    with database_factory() as (_, runtime, _):
        engine = build_engine(Settings(database_url=runtime.render_as_string(hide_password=False)))
        try:
            with Session(engine) as session, transaction(session):
                admin = administrator()
                session.add(admin)
                session.flush()
                log = AuditLog(
                    actor_id=admin.id, action="fixture", entity_type="admin", trace_id=uuid4()
                )
                session.add(log)
            for statement in (
                "CREATE TABLE forbidden(id int)",
                "DELETE FROM audit_logs",
                "UPDATE audit_logs SET action='changed'",
                "DELETE FROM alembic_version",
            ):
                with pytest.raises(ProgrammingError), engine.begin() as connection:
                    connection.execute(text(statement))
            with engine.connect() as connection:
                assert connection.scalar(text("SELECT count(*) FROM audit_logs")) == 1
        finally:
            engine.dispose()
