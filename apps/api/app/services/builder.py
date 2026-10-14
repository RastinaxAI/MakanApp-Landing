"""Templates, site parts and globals extend the existing revisioned CMS."""

from fastapi import Request
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.core.problems import ApiProblem
from app.models import Page, PageRevision, SiteSetting
from app.schemas.builder import BuilderSettings
from app.services import cms
from app.services.auth import audit, now_utc, principal, require_capability

KEY = "builder"


def settings(session: Session):
    row = session.get(SiteSetting, KEY)
    return {
        **BuilderSettings.model_validate(row.value_json if row else {}).model_dump(mode="json"),
        "row_version": row.row_version if row else 1,
    }


def site_part(session: Session, identifier, purpose: str):
    if not identifier:
        return None
    row = session.execute(
        select(Page, PageRevision)
        .join(PageRevision, PageRevision.id == cms.effective_id(now_utc()))
        .where(
            Page.id == identifier,
            Page.is_archived.is_(False),
            PageRevision.content_json["visibility"].as_boolean().is_(True),
        )
    ).first()
    if not row:
        return None
    payload = row[1].content_json["payload"]
    if payload.get("kind") != "page" or (payload.get("document") or {}).get("purpose") != purpose:
        return None
    return cms.projection(*row, session=session).model_dump(mode="json")


def public_site(session: Session):
    value = settings(session)
    return {
        "globals": value["globals"],
        "header": site_part(session, value["header_page_id"], "header"),
        "footer": site_part(session, value["footer_page_id"], "footer"),
    }


def update(request: Request, session: Session, data: BuilderSettings):
    with session.begin():
        admin, _, _ = principal(request, session, True)
        require_capability(admin, "settings")
        session.execute(text("SELECT pg_advisory_xact_lock(74120602)"))
        current = settings(session)
        cms.expected_version(request, current["row_version"])
        for purpose in ("header", "footer"):
            identifier = getattr(data, purpose + "_page_id")
            if identifier and not site_part(session, identifier, purpose):
                raise ApiProblem(
                    422,
                    "SITE_PART_NOT_PUBLISHED",
                    "سربرگ/پابرگ باید نسخهٔ منتشرشده و کاربرد صحیح داشته باشد.",
                )
        row = session.get(SiteSetting, KEY)
        if not row:
            row = SiteSetting(key=KEY, value_json={}, updated_by=admin.id)
            session.add(row)
        row.value_json = data.model_dump(mode="json")
        row.row_version = current["row_version"] + 1
        row.updated_by = admin.id
        audit(
            session,
            request,
            "builder.settings.updated",
            admin.id,
            entity_type="settings",
            changes={"keys": ["globals", "header_page_id", "footer_page_id"]},
        )
        session.flush()
        return settings(session)


def library(session: Session, purpose: str | None, page: int, page_size: int):
    statement = (
        select(Page, PageRevision)
        .join(PageRevision, PageRevision.id == Page.working_revision_id)
        .where(
            Page.page_type == "page",
            Page.is_archived.is_(False),
            PageRevision.content_json["payload"]["document"].is_not(None),
        )
    )
    if purpose:
        statement = statement.where(
            PageRevision.content_json["payload"]["document"]["purpose"].as_string() == purpose
        )
    else:
        statement = statement.where(
            PageRevision.content_json["payload"]["document"]["purpose"]
            .as_string()
            .in_(("template", "section", "header", "footer"))
        )
    from sqlalchemy import func

    total = session.scalar(select(func.count()).select_from(statement.subquery()))
    rows = session.execute(
        statement.order_by(Page.updated_at.desc(), Page.id)
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return {
        "items": [
            cms.projection(*row, private=True, session=session).model_dump(mode="json")
            for row in rows
        ],
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "pages": (total + page_size - 1) // page_size,
        },
    }
