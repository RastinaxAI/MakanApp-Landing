from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from app.db.session import get_session
from app.schemas.common import ErrorResponse, PaginatedResponse, PaginationQuery
from app.schemas.leads import (
    Assignee,
    ContactSubmission,
    DemoSubmission,
    FormToken,
    History,
    LeadDetail,
    LeadMetrics,
    LeadQuery,
    LeadSummary,
    LeadUpdate,
    Note,
    NoteInput,
    SubmissionResult,
)
from app.services import leads

router = APIRouter(
    tags=["leads"],
    responses={
        code: {"model": ErrorResponse} for code in (401, 403, 404, 409, 413, 422, 428, 429, 503)
    },
)
SessionDep = Annotated[Session, Depends(get_session)]


@router.get("/forms/token", response_model=FormToken)
def token(request: Request, kind: Literal["demo", "contact"]):
    return leads.issue_token(request, kind)


@router.post(
    "/leads/demo",
    status_code=201,
    response_model=SubmissionResult,
    dependencies=[Depends(leads.submission_gate)],
)
def demo(data: DemoSubmission, request: Request, session: SessionDep):
    return leads.submit(data, "demo", request, session)


@router.post(
    "/contact",
    status_code=201,
    response_model=SubmissionResult,
    dependencies=[Depends(leads.submission_gate)],
)
def contact(data: ContactSubmission, request: Request, session: SessionDep):
    return leads.submit(data, "contact", request, session)


@router.get("/admin/leads", response_model=PaginatedResponse[LeadSummary])
def listing(request: Request, session: SessionDep, query: Annotated[LeadQuery, Query()]):
    return leads.listing(request, session, query)


@router.get("/admin/leads/assignees", response_model=list[Assignee])
def assignees(request: Request, session: SessionDep):
    return leads.assignees(request, session)


@router.get("/admin/leads/metrics", response_model=LeadMetrics)
def metrics(request: Request, session: SessionDep, query: Annotated[LeadQuery, Query()]):
    return leads.metrics(request, session, query)


@router.get("/admin/leads/{identifier}", response_model=LeadDetail)
def detail(identifier: UUID, request: Request, session: SessionDep):
    return leads.detail(request, session, identifier)


@router.patch("/admin/leads/{identifier}", response_model=LeadDetail)
def update(identifier: UUID, data: LeadUpdate, request: Request, session: SessionDep):
    return leads.update_lead(request, session, identifier, data)


@router.get("/admin/leads/{identifier}/notes", response_model=PaginatedResponse[Note])
def notes(
    identifier: UUID,
    request: Request,
    session: SessionDep,
    query: Annotated[PaginationQuery, Query()],
):
    return leads.events(request, session, identifier, query, True)


@router.post("/admin/leads/{identifier}/notes", status_code=201, response_model=Note)
def add_note(identifier: UUID, data: NoteInput, request: Request, session: SessionDep):
    return leads.add_note(request, session, identifier, data)


@router.get("/admin/leads/{identifier}/history", response_model=PaginatedResponse[History])
def history(
    identifier: UUID,
    request: Request,
    session: SessionDep,
    query: Annotated[PaginationQuery, Query()],
):
    return leads.events(request, session, identifier, query)
