from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from app.db.session import get_session
from app.models import Page
from app.schemas.seo import CrawlManifest, CrawlQuery, SeoPage, SeoStatus
from app.services import seo

router = APIRouter(tags=["seo"])
SessionDep = Annotated[Session, Depends(get_session)]


@router.get("/seo/status", response_model=SeoStatus)
def status(request: Request, session: SessionDep):
    with session.begin():
        origin = seo.origin(session)
        enabled = bool(request.app.state.settings.seo_indexing_enabled and origin)
        return dict(
            origin=origin,
            enabled=enabled,
            shard_size=seo.SHARD_SIZE,
            counts=seo.counts(session) if enabled else {"pages": 0, "learning": 0},
        )


@router.get("/seo/page", response_model=SeoPage)
def page(request: Request, session: SessionDep, path: str = Query(max_length=500)):
    with session.begin():
        return {
            "indexable": bool(
                request.app.state.settings.seo_indexing_enabled
                and seo.origin(session)
                and seo.is_indexable(session, path)
            )
        }


@router.get("/seo/sitemap", response_model=CrawlManifest)
def sitemap(request: Request, session: SessionDep, query: Annotated[CrawlQuery, Query()]):
    with session.begin():
        if not request.app.state.settings.seo_indexing_enabled or not seo.origin(session):
            return {"items": []}
        rows = session.execute(
            seo.eligible(query.group)
            .order_by(Page.id)
            .offset(query.shard * seo.SHARD_SIZE)
            .limit(seo.SHARD_SIZE)
        )
        return {
            "items": [
                {
                    "path": seo.path_for(page),
                    "updated_at": max(
                        revision.created_at, revision.published_at or revision.created_at
                    ),
                }
                for page, revision in rows
            ]
        }
