from functools import partial
from inspect import signature
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, Query, Request, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import exists, func, select
from sqlalchemy.orm import Session

from app.core.problems import ApiProblem
from app.db.session import get_session
from app.models import FaqCategory, MediaAsset, PageRevision
from app.schemas.builder import (
    BuilderLibraryQuery,
    BuilderSettings,
    BuilderSettingsOutput,
    VisualDocument,
)
from app.schemas.cms import (
    AdminContent,
    BuilderPublicSite,
    Category,
    CategoryInput,
    ContentInput,
    ContentQuery,
    ImageRef,
    MediaInfo,
    MediaUpdate,
    PublicContent,
    RevisionAction,
    RevisionInfo,
    ScheduleAction,
    SettingsInput,
    SettingsOutput,
)
from app.schemas.common import ErrorResponse, PaginatedResponse, PaginationQuery
from app.services import builder, cms, media, site_settings
from app.services.auth import audit, principal, require_capability

router = APIRouter(
    tags=["cms"],
    responses={
        code: {"model": ErrorResponse} for code in (401, 403, 404, 409, 413, 415, 422, 428, 503)
    },
)
SessionDep = Annotated[Session, Depends(get_session)]
Resource = Literal["pages", "features", "audiences", "faqs", "content"]


@router.get("/site/builder", response_model=BuilderPublicSite)
def public_builder(session: SessionDep):
    with session.begin():
        return builder.public_site(session)


@router.get("/admin/builder/settings", response_model=BuilderSettingsOutput)
def builder_settings(request: Request, session: SessionDep):
    with session.begin():
        cms.authorize(request, session)
        return builder.settings(session)


@router.patch("/admin/builder/settings", response_model=BuilderSettingsOutput)
def builder_settings_update(data: BuilderSettings, request: Request, session: SessionDep):
    return builder.update(request, session, data)


@router.post("/admin/builder/validate", response_model=VisualDocument)
def builder_validate(data: VisualDocument, request: Request, session: SessionDep):
    with session.begin():
        cms.authorize(request, session, True)
        return data


@router.get("/admin/builder/library", response_model=PaginatedResponse[AdminContent])
def builder_library(
    request: Request,
    session: SessionDep,
    query: Annotated[BuilderLibraryQuery, Query()],
):
    with session.begin():
        cms.authorize(request, session)
        return builder.library(session, query.purpose, query.page, query.page_size)


@router.get("/site/settings", response_model=SettingsOutput)
def public_settings(session: SessionDep):
    with session.begin():
        return site_settings.read(session)


@router.get("/admin/settings", response_model=SettingsOutput)
def settings(request: Request, session: SessionDep):
    with session.begin():
        admin, _, _ = principal(request, session)
        require_capability(admin, "settings")
        return site_settings.read(session)


@router.patch("/admin/settings", response_model=SettingsOutput)
def update_settings(data: SettingsInput, request: Request, session: SessionDep):
    return site_settings.update(request, session, data)


@router.get("/admin/faq-categories", response_model=PaginatedResponse[Category])
def categories(request: Request, session: SessionDep, query: Annotated[PaginationQuery, Query()]):
    with session.begin():
        cms.authorize(request, session)
        items = [
            Category(id=row.id, slug=row.slug, title=row.title, sort_order=row.sort_order)
            for row in session.scalars(
                select(FaqCategory)
                .order_by(FaqCategory.sort_order, FaqCategory.id)
                .offset(query.offset)
                .limit(query.page_size)
            )
        ]
        total = session.scalar(select(func.count()).select_from(FaqCategory))
        return {
            "items": items,
            "pagination": {
                "page": query.page,
                "page_size": query.page_size,
                "total": total,
                "pages": (total + query.page_size - 1) // query.page_size,
            },
        }


@router.post("/admin/faq-categories", response_model=Category, status_code=201)
def create_category(data: CategoryInput, request: Request, session: SessionDep):
    with session.begin():
        admin = cms.authorize(request, session, True)
        if session.scalar(select(FaqCategory.id).where(FaqCategory.slug == data.slug)):
            raise ApiProblem(409, "SLUG_EXISTS", "آدرس دسته تکراری است.")
        row = FaqCategory(**data.model_dump())
        session.add(row)
        session.flush()
        audit(
            session, request, "faq-category.created", admin.id, row.id, entity_type="faq-category"
        )
        return Category(id=row.id, **data.model_dump())


@router.patch("/admin/faq-categories/{category_id}", response_model=Category)
def update_category(category_id: UUID, data: CategoryInput, request: Request, session: SessionDep):
    with session.begin():
        admin = cms.authorize(request, session, True)
        row = session.scalar(
            select(FaqCategory).where(FaqCategory.id == category_id).with_for_update()
        )
        if not row:
            raise ApiProblem(404, "NOT_FOUND", "دسته یافت نشد.")
        if session.scalar(
            select(FaqCategory.id).where(
                FaqCategory.slug == data.slug, FaqCategory.id != category_id
            )
        ):
            raise ApiProblem(409, "SLUG_EXISTS", "آدرس دسته تکراری است.")
        for name, value in data.model_dump().items():
            setattr(row, name, value)
        audit(
            session, request, "faq-category.updated", admin.id, row.id, entity_type="faq-category"
        )
        return Category(id=row.id, **data.model_dump())


@router.delete("/admin/faq-categories/{category_id}", status_code=204)
def delete_category(category_id: UUID, request: Request, session: SessionDep):
    with session.begin():
        admin = cms.authorize(request, session, True)
        row = session.get(FaqCategory, category_id)
        if not row:
            raise ApiProblem(404, "NOT_FOUND", "دسته یافت نشد.")
        if session.scalar(select(exists().where(PageRevision.category_id == category_id))):
            raise ApiProblem(409, "CATEGORY_IN_USE", "دسته در نسخه محتوا استفاده شده است.")
        session.delete(row)
        audit(
            session,
            request,
            "faq-category.deleted",
            admin.id,
            category_id,
            entity_type="faq-category",
        )


@router.get("/faq-categories", response_model=list[Category])
def public_categories(session: SessionDep):
    with session.begin():
        from app.models import Page

        rows = session.scalars(
            select(FaqCategory)
            .where(
                exists().where(
                    PageRevision.category_id == FaqCategory.id,
                    PageRevision.page_id == Page.id,
                    PageRevision.id == cms.effective_id(cms.now_utc()),
                    Page.is_archived.is_(False),
                    PageRevision.content_json["visibility"].as_boolean().is_(True),
                )
            )
            .order_by(FaqCategory.sort_order, FaqCategory.id)
            .limit(100)
        )
        return [
            Category(id=r.id, slug=r.slug, title=r.title, sort_order=r.sort_order) for r in rows
        ]


@router.get("/admin/media", response_model=PaginatedResponse[MediaInfo])
def media_list(request: Request, query: Annotated[PaginationQuery, Query()], session: SessionDep):
    with session.begin():
        cms.authorize(request, session)
        total = session.scalar(select(func.count()).select_from(MediaAsset))
        rows = session.scalars(
            select(MediaAsset)
            .order_by(MediaAsset.created_at.desc(), MediaAsset.id)
            .offset(query.offset)
            .limit(query.page_size)
        )
        return {
            "items": [media.info(r, session) for r in rows],
            "pagination": {
                "page": query.page,
                "page_size": query.page_size,
                "total": total,
                "pages": (total + query.page_size - 1) // query.page_size,
            },
        }


@router.post("/admin/media", response_model=MediaInfo, status_code=201)
def upload(
    request: Request,
    session: SessionDep,
    file: Annotated[UploadFile, File()],
    alt_text: Annotated[str, Form(min_length=1, max_length=500)],
):
    return media.upload(request, session, file, alt_text)


@router.patch("/admin/media/{media_id}", response_model=MediaInfo)
def change_media(media_id: UUID, data: MediaUpdate, request: Request, session: SessionDep):
    return media.change(request, session, media_id, data)


@router.delete("/admin/media/{media_id}", status_code=204)
def delete_media(media_id: UUID, request: Request, session: SessionDep):
    media.remove(request, session, media_id)


@router.get("/admin/media/{media_id}/file")
def private_file(media_id: UUID, request: Request, session: SessionDep):
    return FileResponse(
        media.file_path(request, session, media_id, True),
        media_type="image/webp",
        headers={
            "Content-Disposition": "inline",
            "Content-Security-Policy": "default-src 'none'; sandbox",
        },
    )


@router.get("/media/{media_id}/file")
def public_file(media_id: UUID, request: Request, session: SessionDep):
    return FileResponse(
        media.file_path(request, session, media_id),
        media_type="image/webp",
        headers={
            "Content-Disposition": "inline",
            "Content-Security-Policy": "default-src 'none'; sandbox",
        },
    )


@router.get("/media/{media_id}", response_model=ImageRef)
def public_image_info(media_id: UUID, session: SessionDep):
    with session.begin():
        item = session.get(MediaAsset, media_id)
        if not item or (
            item.visibility != "public" and not media.public_reference(session, media_id)
        ):
            raise ApiProblem(404, "NOT_FOUND", "رسانه یافت نشد.")
        return ImageRef(id=item.id, width=item.width, height=item.height, alt_text=item.alt_text)


@router.get("/admin/{resource}", response_model=PaginatedResponse[AdminContent])
def list_content(
    resource: Resource,
    request: Request,
    query: Annotated[ContentQuery, Query()],
    session: SessionDep,
):
    with session.begin():
        cms.authorize(request, session)
        return cms.page_list(session, query, resource)


@router.post("/admin/{resource}", response_model=AdminContent, status_code=201)
def create_content(resource: Resource, data: ContentInput, request: Request, session: SessionDep):
    return cms.save(request, session, resource, data)


@router.get("/admin/{resource}/{entity_id}", response_model=AdminContent)
def read_content(resource: Resource, entity_id: UUID, request: Request, session: SessionDep):
    with session.begin():
        cms.authorize(request, session)
        item = cms.entity(session, resource, entity_id)
        return cms.projection(
            item, session.get(PageRevision, item.working_revision_id), True, session
        )


@router.patch("/admin/{resource}/{entity_id}", response_model=AdminContent)
def update_content(
    resource: Resource, entity_id: UUID, data: ContentInput, request: Request, session: SessionDep
):
    return cms.save(request, session, resource, data, entity_id)


@router.delete("/admin/{resource}/{entity_id}", response_model=AdminContent)
def archive_content(resource: Resource, entity_id: UUID, request: Request, session: SessionDep):
    return cms.transition(request, session, resource, entity_id, "archive")


@router.get(
    "/admin/{resource}/{entity_id}/revisions", response_model=PaginatedResponse[RevisionInfo]
)
def revisions(
    resource: Resource,
    entity_id: UUID,
    request: Request,
    query: Annotated[PaginationQuery, Query()],
    session: SessionDep,
):
    with session.begin():
        cms.authorize(request, session)
        cms.entity(session, resource, entity_id)
        statement = select(PageRevision).where(PageRevision.page_id == entity_id)
        total = session.scalar(select(func.count()).select_from(statement.subquery()))
        rows = session.scalars(
            statement.order_by(PageRevision.revision_no.desc())
            .offset(query.offset)
            .limit(query.page_size)
        )
        return {
            "items": [
                RevisionInfo(
                    id=r.id,
                    revision_no=r.revision_no,
                    title=r.title,
                    created_at=r.created_at,
                    created_by=r.created_by,
                    published_at=r.published_at,
                )
                for r in rows
            ],
            "pagination": {
                "page": query.page,
                "page_size": query.page_size,
                "total": total,
                "pages": (total + query.page_size - 1) // query.page_size,
            },
        }


@router.get("/admin/{resource}/{entity_id}/preview", response_model=AdminContent)
def preview(
    resource: Resource,
    entity_id: UUID,
    request: Request,
    session: SessionDep,
    revision_id: UUID | None = None,
):
    with session.begin():
        cms.authorize(request, session)
        item = cms.entity(session, resource, entity_id)
        revision = session.get(PageRevision, revision_id or item.working_revision_id)
        if not revision or revision.page_id != item.id:
            raise ApiProblem(404, "NOT_FOUND", "نسخه یافت نشد.")
        return cms.projection(item, revision, True, session)


@router.post("/admin/{resource}/{entity_id}/publish", response_model=AdminContent)
def publish(
    resource: Resource, entity_id: UUID, data: RevisionAction, request: Request, session: SessionDep
):
    return cms.transition(request, session, resource, entity_id, "publish", data.revision_id)


@router.post(
    "/admin/{resource}/{entity_id}/revisions/{revision_id}/restore", response_model=AdminContent
)
def restore(
    resource: Resource, entity_id: UUID, revision_id: UUID, request: Request, session: SessionDep
):
    return cms.restore_revision(request, session, resource, entity_id, revision_id)


@router.post("/admin/{resource}/{entity_id}/schedule", response_model=AdminContent)
def schedule(
    resource: Resource, entity_id: UUID, data: ScheduleAction, request: Request, session: SessionDep
):
    return cms.transition(
        request, session, resource, entity_id, "schedule", data.revision_id, data.publish_at
    )


@router.post("/admin/{resource}/{entity_id}/{action}", response_model=AdminContent)
def stop_publication(
    resource: Resource,
    entity_id: UUID,
    action: Literal["cancel-schedule", "unpublish"],
    request: Request,
    session: SessionDep,
):
    return cms.transition(request, session, resource, entity_id, action)


@router.get("/pages/{slug}", response_model=PublicContent)
def page(slug: str, session: SessionDep):
    with session.begin():
        return cms.get_public(session, ("home", "page"), slug)


@router.get("/{resource}", response_model=PaginatedResponse[PublicContent])
def public_list(
    resource: Literal["features", "audiences", "faqs"],
    session: SessionDep,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    q: str = Query("", max_length=100),
    category_id: UUID | None = None,
):
    with session.begin():
        return cms.page_list(
            session,
            ContentQuery(page=page, page_size=page_size, q=q, category_id=category_id),
            resource,
            True,
        )


@router.get("/{resource}/{slug}", response_model=PublicContent)
def public_detail(
    resource: Literal["features", "audiences", "faqs"], slug: str, session: SessionDep
):
    with session.begin():
        return cms.get_public(session, cms.RESOURCES[resource], slug)


# Register explicit REST paths; unknown resources remain 404 and do not shadow docs.
for route in list(router.routes):
    if "{resource}" not in route.path:
        continue
    router.routes.remove(route)
    names = (
        ("features", "audiences", "faqs")
        if not route.path.startswith("/admin/")
        else tuple(cms.RESOURCES)
    )
    for name in names:
        endpoint = partial(route.endpoint, resource=name)
        endpoint.__name__ = f"{route.endpoint.__name__}_{name}"
        original_signature = signature(route.endpoint)
        endpoint.__signature__ = original_signature.replace(
            parameters=[p for p in original_signature.parameters.values() if p.name != "resource"]
        )
        router.add_api_route(
            route.path.replace("{resource}", name),
            endpoint,
            methods=route.methods,
            response_model=route.response_model,
            status_code=route.status_code,
        )
