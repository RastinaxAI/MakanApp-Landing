"""Non-destructive conversion of current authored marketing payloads to visual documents."""

from copy import deepcopy
from html import escape

from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.models import Page, PageRevision
from app.schemas.builder import VisualDocument
from app.schemas.cms import ContentInput
from app.services import cms
from app.services.auth import audit, now_utc


def document_from_payload(payload: dict, features: list[dict] | None = None, slug=""):
    def finalize(value):
        if slug in ("features", "solutions"):
            value["nodes"].append(
                {
                    "id": "catalogue",
                    "type": "FeatureIndex" if slug == "features" else "AudienceIndex",
                    "props": {},
                }
            )
        return VisualDocument.model_validate(value).model_dump(mode="json", exclude_none=True)

    if payload.get("document"):
        return deepcopy(payload["document"])
    kind = payload["kind"]
    sections = deepcopy(payload.get("sections", []))
    if kind in ("feature", "audience"):
        roadmap = kind == "feature" and payload["readiness"] == "roadmap"
        sections = [
            {
                "type": "hero",
                "title": payload["headline"],
                "kicker": payload["eyebrow"],
                "description": payload["summary"],
                "items": [],
                "cta_label": "امکانات آمادهٔ ماکان"
                if roadmap
                else "درخواست دموی ماکان"
                if kind == "feature"
                else payload["cta"],
                "cta_href": "/features"
                if roadmap
                else "/demo"
                if kind == "feature"
                else payload["cta_href"],
                "media_id": payload.get("image_media_id"),
            }
        ]
        if kind == "feature":
            sections.extend(
                [
                    {
                        "type": "benefits",
                        "title": "کارکرد در مسیر مدرسه",
                        "description": "",
                        "items": payload["benefits"],
                    },
                    {
                        "type": "onboarding",
                        "title": "مسیر استفاده",
                        "description": "",
                        "items": payload["workflow"],
                    },
                ]
            )
        else:
            sections.extend(
                [
                    {
                        "type": "challenge",
                        "title": "نیازهای روزمرهٔ شما",
                        "description": "",
                        "items": [
                            {"title": "", "description": value} for value in payload["pains"]
                        ],
                    },
                    {
                        "type": "benefits",
                        "title": "ماکان چگونه کمک می‌کند؟",
                        "description": "",
                        "items": payload["benefits"],
                    },
                    {
                        "type": "onboarding",
                        "title": "مسیر همراهی",
                        "description": "",
                        "items": payload["journey"],
                    },
                    {
                        "type": "features",
                        "title": "امکانات مرتبط",
                        "description": "",
                        "items": [
                            {
                                "title": feature["payload"]["title"],
                                "description": feature["payload"]["summary"],
                                "href": "/features/" + feature["slug"],
                            }
                            for feature in features or []
                            if feature["slug"] in payload["related"]
                        ],
                    },
                ]
            )
        if payload.get("body_html"):
            sections.append(
                {
                    "type": "rich-text",
                    "title": "",
                    "description": "",
                    "body_html": payload["body_html"],
                    "items": [],
                }
            )
    if kind == "page" and not sections:
        return finalize(
            {
                "nodes": [
                    {
                        "id": "page_heading",
                        "type": "Heading",
                        "props": {"title": payload["headline"], "level": 1},
                    },
                    {
                        "id": "page_summary",
                        "type": "RichText",
                        "props": {"body_html": "<p>" + escape(payload["summary"]) + "</p>"},
                    },
                ]
            }
        )
    value = {
        "schema_version": 2,
        "nodes": [
            {"id": f"legacy_{index}", "type": "LegacySection", "props": {"legacy_section": section}}
            for index, section in enumerate(sections)
        ],
    }
    return finalize(value)


def upgrade(session: Session, actor=None):
    session.execute(text("SELECT pg_advisory_xact_lock(74120603)"))
    features = cms.page_list(session, cms.ContentQuery(page_size=100), "features", public=True)[
        "items"
    ]
    features = [value.model_dump(mode="json") for value in features]
    rows = session.execute(
        select(Page, PageRevision)
        .join(PageRevision, PageRevision.id == Page.working_revision_id)
        .where(
            Page.page_type.in_(("home", "page", "feature", "audience")), Page.is_archived.is_(False)
        )
        .order_by(Page.id)
        .with_for_update(of=Page)
    ).all()
    result = {"upgraded": [], "skipped": []}
    for page, current in rows:
        payload = deepcopy(current.content_json["payload"])
        if (
            payload.get("document")
            or page.scheduled_revision_id
            or page.working_revision_id != page.published_revision_id
        ):
            result["skipped"].append(str(page.id))
            continue
        payload["document"] = document_from_payload(payload, features, page.slug.split(":", 1)[1])
        data = ContentInput(
            slug=page.slug.split(":", 1)[1],
            title=current.title,
            payload=payload,
            seo=current.seo_json,
            visibility=current.content_json.get("visibility", True),
            sort_order=current.content_json.get("sort_order", 0),
            category_id=current.category_id,
        )
        revision = cms.create_revision(session, page, data, actor)
        cms.publication_checks(session, page, revision)
        revision.published_at = now_utc()
        page.published_revision_id = revision.id
        page.row_version += 1
        audit(
            session,
            None,
            "content.visual_upgraded",
            actor,
            page.id,
            {
                "previous_revision": str(current.id),
                "new_revision": str(revision.id),
                "content_and_urls_preserved": True,
            },
            "content",
        )
        result["upgraded"].append(
            {
                "page_id": str(page.id),
                "previous_revision_id": str(current.id),
                "revision_id": str(revision.id),
            }
        )
    return result
