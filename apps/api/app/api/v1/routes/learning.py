from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import exists, func, select, text
from sqlalchemy.orm import Session

from app.core.problems import ApiProblem
from app.db.session import get_session
from app.models import LearningCategory, LearningTag, RevisionCategory, RevisionTag
from app.schemas.common import ErrorResponse, PaginatedResponse, PaginationQuery
from app.schemas.learning import LibraryQuery, Taxonomy, TaxonomyInput, TaxonomyQuery, ViewInput
from app.schemas.library_responses import LibraryContent, LibraryDetail, ViewResult, ViewTicket
from app.services import cms, learning
from app.services.auth import audit

router = APIRouter(
    tags=["learning"],
    responses={code: {"model": ErrorResponse} for code in (401, 403, 404, 409, 413, 422, 429, 503)},
)
SessionDep = Annotated[Session, Depends(get_session)]
TABLES = {
    "categories": (LearningCategory, RevisionCategory, "category_id"),
    "tags": (LearningTag, RevisionTag, "tag_id"),
}


@router.get("/learn/contents", response_model=PaginatedResponse[LibraryContent])
def contents(session: SessionDep, query: Annotated[LibraryQuery, Query()]):
    with session.begin():
        return learning.listing(session, query)


@router.get("/blog/articles", response_model=PaginatedResponse[LibraryContent])
def blog(session: SessionDep, query: Annotated[LibraryQuery, Query()]):
    with session.begin():
        return learning.listing(session, query, "blog")


@router.get("/learn/series", response_model=PaginatedResponse[LibraryContent])
def series(session: SessionDep, query: Annotated[LibraryQuery, Query()]):
    with session.begin():
        return learning.listing(session, query, "series")


@router.get("/learn/contents/{slug}", response_model=LibraryDetail)
def content(slug: str, session: SessionDep, series: str | None = Query(None, max_length=160)):
    with session.begin():
        return learning.detail(session, slug, series_slug=series)


@router.get("/blog/articles/{slug}", response_model=LibraryDetail)
def blog_detail(slug: str, session: SessionDep):
    with session.begin():
        return learning.detail(session, slug, "blog")


@router.get("/learn/series/{slug}", response_model=LibraryDetail)
def series_detail(slug: str, session: SessionDep):
    with session.begin():
        return learning.detail(session, slug, "series")


@router.get("/learn/views/{content_id}/ticket", response_model=ViewTicket)
def view_ticket(content_id: UUID, request: Request, session: SessionDep):
    with session.begin():
        row = learning.public_by_id(session, content_id)
        if not row or row["kind"] == "series":
            raise ApiProblem(404, "NOT_FOUND", "محتوا یافت نشد.")
        return {"ticket": learning.ticket(request, content_id)}


@router.post("/learn/views/{content_id}", response_model=ViewResult)
def record_view(content_id: UUID, data: ViewInput, request: Request, session: SessionDep):
    with session.begin():
        return learning.qualified_view(request, session, content_id, data.ticket)


@router.get("/learn/{taxonomy}", response_model=PaginatedResponse[Taxonomy])
def public_taxonomy(
    taxonomy: Literal["categories", "tags"],
    session: SessionDep,
    query: Annotated[TaxonomyQuery, Query()],
):
    with session.begin():
        model, ref, key = TABLES[taxonomy]
        statement = learning.public_taxonomy(session, model, ref, key, query.domain)
        total = session.scalar(select(func.count()).select_from(statement.subquery()))
        return {
            "items": [
                learning.tax_dict(row)
                for row in session.scalars(statement.offset(query.offset).limit(query.page_size))
            ],
            "pagination": {
                "page": query.page,
                "page_size": query.page_size,
                "total": total,
                "pages": (total + query.page_size - 1) // query.page_size,
            },
        }


@router.get("/learn/categories/{slug}", response_model=Taxonomy)
def category_detail(slug: str, session: SessionDep):
    with session.begin():
        row = session.scalar(
            learning.public_taxonomy(
                session, LearningCategory, RevisionCategory, "category_id", "learn"
            ).where(LearningCategory.slug == slug)
        )
        if not row:
            raise ApiProblem(404, "NOT_FOUND", "دسته منتشرشده یافت نشد.")
        return learning.tax_dict(row)


@router.get("/admin/learn/{taxonomy}", response_model=PaginatedResponse[Taxonomy])
def admin_taxonomy(
    taxonomy: Literal["categories", "tags"],
    request: Request,
    session: SessionDep,
    query: Annotated[PaginationQuery, Query()],
):
    with session.begin():
        cms.authorize(request, session)
        model = TABLES[taxonomy][0]
        total = session.scalar(select(func.count()).select_from(model))
        rows = session.scalars(
            select(model)
            .order_by(model.domain, model.sort_order, model.id)
            .offset(query.offset)
            .limit(query.page_size)
        )
        return {
            "items": [learning.tax_dict(row) for row in rows],
            "pagination": {
                "page": query.page,
                "page_size": query.page_size,
                "total": total,
                "pages": (total + query.page_size - 1) // query.page_size,
            },
        }


def save_taxonomy(taxonomy, data, request, session, entity_id=None):
    with session.begin():
        admin = cms.authorize(request, session, True)
        model = TABLES[taxonomy][0]
        # Serialize taxonomy reservations; row locks protect revision reference races.
        session.execute(text("SELECT pg_advisory_xact_lock(741207)"))
        row = (
            session.scalar(select(model).where(model.id == entity_id).with_for_update())
            if entity_id
            else model()
        )
        if row is None:
            raise ApiProblem(404, "NOT_FOUND", "دسته یا برچسب یافت نشد.")
        if entity_id and (row.slug != data.slug or row.domain != data.domain):
            raise ApiProblem(409, "IMMUTABLE_SLUG", "آدرس و بخش دسته ثبت‌شده ثابت است.")
        if session.scalar(
            select(model.id).where(
                model.domain == data.domain,
                model.slug == data.slug,
                model.id != entity_id if entity_id else True,
            )
        ):
            raise ApiProblem(409, "SLUG_EXISTS", "آدرس تکراری است.")
        for name, value in data.model_dump().items():
            setattr(row, name, value)
        session.add(row)
        session.flush()
        audit(
            session,
            request,
            f"learn-{taxonomy}.saved",
            admin.id,
            row.id,
            entity_type=f"learn-{taxonomy}",
        )
        return learning.tax_dict(row)


@router.post("/admin/learn/{taxonomy}", response_model=Taxonomy, status_code=201)
def create_taxonomy(
    taxonomy: Literal["categories", "tags"],
    data: TaxonomyInput,
    request: Request,
    session: SessionDep,
):
    return save_taxonomy(taxonomy, data, request, session)


@router.patch("/admin/learn/{taxonomy}/{entity_id}", response_model=Taxonomy)
def update_taxonomy(
    taxonomy: Literal["categories", "tags"],
    entity_id: UUID,
    data: TaxonomyInput,
    request: Request,
    session: SessionDep,
):
    return save_taxonomy(taxonomy, data, request, session, entity_id)


@router.delete("/admin/learn/{taxonomy}/{entity_id}", status_code=204)
def delete_taxonomy(
    taxonomy: Literal["categories", "tags"], entity_id: UUID, request: Request, session: SessionDep
):
    with session.begin():
        admin = cms.authorize(request, session, True)
        session.execute(text("SELECT pg_advisory_xact_lock(741207)"))
        model, ref, key = TABLES[taxonomy]
        row = session.scalar(select(model).where(model.id == entity_id).with_for_update())
        if not row:
            raise ApiProblem(404, "NOT_FOUND", "دسته یا برچسب یافت نشد.")
        if session.scalar(select(exists().where(getattr(ref, key) == entity_id))):
            raise ApiProblem(409, "TAXONOMY_IN_USE", "این مورد در نسخه محتوا استفاده شده است.")
        session.delete(row)
        audit(
            session,
            request,
            f"learn-{taxonomy}.deleted",
            admin.id,
            entity_id,
            entity_type=f"learn-{taxonomy}",
        )
