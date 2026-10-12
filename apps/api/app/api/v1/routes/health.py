from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from app.core.errors import error_response
from app.schemas.common import ErrorResponse, HealthResponse
from app.services.health import database_ready

router = APIRouter(prefix="/health", tags=["health"])


@router.get("/live", response_model=HealthResponse)
def live() -> HealthResponse:
    return HealthResponse(status="ok")


@router.get("/ready", response_model=HealthResponse, responses={503: {"model": ErrorResponse}})
def ready(request: Request) -> HealthResponse | JSONResponse:
    if not database_ready(request.app.state.engine, request.app.state.migration_heads):
        return error_response(request, 503, "SERVICE_UNAVAILABLE", "سرویس موقتاً در دسترس نیست.")
    return HealthResponse(status="ok")
