import json
from copy import deepcopy
from datetime import timedelta
from pathlib import Path

import pytest
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.session import build_engine
from app.models import Admin, Lead, LeadNote, LeadReceipt, Page, PageRevision, RateLimitBucket
from app.schemas.cms import ContentInput
from app.services import form_copy, leads
from app.services.auth import now_utc
from app.services.cms import create_revision
from tests.integration.test_auth import auth_context as auth_context

pytestmark = pytest.mark.integration


@pytest.mark.parametrize("legacy_optional_defaults", [False, True])
def test_policy_copy_refresh_preserves_immutable_old_revision_and_human_changes(
    auth_context, legacy_optional_defaults
):
    _, engine, _, _ = auth_context
    upgrades = json.loads(
        (Path(__file__).parents[2] / "app/data/form-copy-upgrade.json").read_text(encoding="utf-8")
    )
    with Session(engine) as session, session.begin():
        for item in upgrades:
            data = ContentInput(**item["old"])
            page = Page(slug="page:" + data.slug, page_type="page")
            session.add(page)
            session.flush()
            revision = create_revision(session, page, data, None)
            if legacy_optional_defaults:
                legacy = deepcopy(revision.content_json)
                for section in legacy["payload"]["sections"]:
                    section.pop("faq_slugs", None)
                revision.content_json = legacy
            page.published_revision_id = revision.id
        session.flush()
        assert form_copy.refresh_form_copy(session) == 2
    with Session(engine) as session, session.begin():
        assert form_copy.refresh_form_copy(session) == 0
        assert session.scalar(select(func.count()).select_from(PageRevision)) == 4
        original = session.scalar(
            select(PageRevision).where(PageRevision.revision_no == 1).order_by(PageRevision.title)
        )
        assert "غیرفعال" in str(original.content_json)
        assert (
            session.scalar(select(func.count()).select_from(Page).where(Page.row_version == 2)) == 2
        )
    # A human-created revision is never replaced even if its text equals the old seed.
    with Session(engine) as session, session.begin():
        page = session.scalar(select(Page).where(Page.slug == "page:privacy"))
        page.row_version = 1
        old = deepcopy(upgrades[0]["old"])
        actor = session.scalar(select(Admin.id))
        revision = create_revision(session, page, ContentInput(**old), actor)
        page.published_revision_id = revision.id
        session.flush()
        assert form_copy.refresh_form_copy(session) == 0


def test_retention_boundary_recent_activity_and_expired_receipt_cleanup(auth_context):
    config, engine, _, _ = auth_context
    now = now_utc()
    with Session(engine) as session, session.begin():
        for scope in ("forms-contact", "login"):
            session.add(
                RateLimitBucket(
                    scope=scope,
                    subject_hmac="fixture",
                    window_start=now - timedelta(days=1),
                    count=1,
                    expires_at=now - timedelta(hours=1),
                )
            )
        for days in (179, 180, 181):
            row = Lead(
                reference_id=f"acceptance-{days}",
                kind="demo",
                full_name="Private name",
                contact_method="phone",
                contact_value="+989123456789",
                details={"message": "private"},
                source="direct",
                consent_version="2026-10-13-v1",
                consent_at=now,
                last_activity_at=now - timedelta(days=days),
                fingerprint=str(days),
            )
            session.add(row)
            session.flush()
            session.add(
                LeadReceipt(
                    key_digest=str(days),
                    body_digest="fixture",
                    lead_id=row.id,
                    expires_at=now - timedelta(hours=1),
                )
            )
            session.add(
                LeadNote(
                    lead_id=row.id,
                    actor_id=session.scalar(select(Admin.id)),
                    body="Private note",
                    created_at=now,
                )
            )
    runtime = build_engine(config)
    try:
        with Session(runtime) as session, session.begin():
            result = leads.purge(session, now=now)
            assert result == {"purged": 1, "expired_receipts": 2, "expired_rate_buckets": 1}
    finally:
        runtime.dispose()
    with Session(engine) as session:
        assert (
            session.scalar(select(func.count()).select_from(Lead).where(Lead.purged_at.is_(None)))
            == 2
        )
        assert session.scalar(select(func.count()).select_from(LeadNote)) == 2
        assert session.scalar(select(func.count()).select_from(LeadReceipt)) == 0
        assert session.scalar(select(func.count()).select_from(RateLimitBucket)) == 1
