from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request, Response
from sqlalchemy.orm import Session

from app.db.session import get_session
from app.schemas.auth import (
    Account,
    AccountCreate,
    AccountUpdate,
    AuditEvent,
    CsrfResponse,
    Dashboard,
    LoginInput,
    MfaConfirm,
    MfaEnrollment,
    PasswordUpdate,
    Profile,
    Reauthentication,
    RecoveryCodes,
    SessionInfo,
    SessionQuery,
)
from app.schemas.common import ErrorResponse, PaginatedResponse, PaginationQuery
from app.services import admin_operations as operations
from app.services.auth import (
    csrf_challenge,
    login,
    principal,
    profile,
)

router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    responses={code: {"model": ErrorResponse} for code in (401, 403, 404, 409, 413, 422, 429, 503)},
)
SessionDep = Annotated[Session, Depends(get_session)]
PaginationDep = Annotated[PaginationQuery, Query()]


def cookie(response: Response, request: Request, name: str, value: str, age: int) -> None:
    response.set_cookie(
        name,
        value,
        max_age=age,
        httponly=True,
        secure=request.app.state.settings.secure_cookies,
        samesite="lax",
        path="/",
    )


def clear_session(response: Response, request: Request) -> None:
    cookie(response, request, request.app.state.settings.session_cookie, "", 0)


@router.get("/auth/csrf", response_model=CsrfResponse)
def csrf(request: Request, response: Response, session: SessionDep):
    token, challenge = csrf_challenge(request, session)
    if challenge:
        cookie(response, request, request.app.state.settings.challenge_cookie, challenge, 300)
    return CsrfResponse(csrf_token=token)


@router.post("/auth/login", response_model=Profile)
def sign_in(data: LoginInput, request: Request, response: Response, session: SessionDep):
    result, token = login(request, session, data)
    config = request.app.state.settings
    cookie(response, request, config.session_cookie, token, config.auth_session_seconds)
    cookie(response, request, config.challenge_cookie, "", 0)
    return result


@router.get("/auth/me", response_model=Profile)
def me(request: Request, session: SessionDep):
    with session.begin():
        admin, _, _ = principal(request, session)
        return profile(session, admin)


@router.post("/auth/logout", status_code=204)
def logout(request: Request, response: Response, session: SessionDep):
    result = operations.logout(request, session)
    clear_session(response, request)
    return result


@router.get("/auth/sessions", response_model=list[SessionInfo])
def sessions(request: Request, session: SessionDep, query: Annotated[SessionQuery, Query()]):
    return operations.sessions(request, session, query)


@router.delete("/auth/sessions/{session_id}", status_code=204)
def revoke(session_id: UUID, request: Request, response: Response, session: SessionDep):
    own = operations.revoke(session_id, request, session)
    if own:
        clear_session(response, request)


@router.patch("/auth/password", status_code=204)
def password(
    data: PasswordUpdate,
    request: Request,
    response: Response,
    session: SessionDep,
):
    result = operations.password(data, request, session)
    clear_session(response, request)
    return result


@router.get("/accounts", response_model=PaginatedResponse[Account])
def accounts(request: Request, query: PaginationDep, session: SessionDep):
    return operations.accounts(request, query, session)


@router.post("/accounts", status_code=201, response_model=Account)
def create_account(data: AccountCreate, request: Request, session: SessionDep):
    return operations.create_account(data, request, session)


@router.patch("/accounts/{account_id}", response_model=Account)
def change_account(account_id: UUID, data: AccountUpdate, request: Request, session: SessionDep):
    return operations.change_account(account_id, data, request, session)


@router.get("/audit-logs", response_model=PaginatedResponse[AuditEvent])
def audit_logs(request: Request, query: PaginationDep, session: SessionDep):
    return operations.audit_logs(request, query, session)


@router.get("/dashboard", response_model=Dashboard)
def dashboard(request: Request, session: SessionDep):
    return operations.dashboard(request, session)


@router.post("/auth/mfa/enroll", response_model=MfaEnrollment)
def enroll(data: Reauthentication, request: Request, session: SessionDep):
    return operations.enroll(data, request, session)


@router.post("/auth/mfa/confirm", response_model=RecoveryCodes)
def confirm(data: MfaConfirm, request: Request, response: Response, session: SessionDep):
    result = operations.confirm(data, request, session)
    clear_session(response, request)
    return result


@router.post("/auth/mfa/disable", status_code=204)
def disable(
    data: Reauthentication,
    request: Request,
    response: Response,
    session: SessionDep,
):
    result = operations.disable(data, request, session)
    clear_session(response, request)
    return result


@router.post("/auth/mfa/recovery-codes", response_model=RecoveryCodes)
def recovery(data: Reauthentication, request: Request, session: SessionDep):
    return operations.recovery(data, request, session)
