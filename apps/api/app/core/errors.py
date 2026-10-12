from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError
from starlette.exceptions import HTTPException

from app.schemas.common import ErrorBody, ErrorDetail, ErrorResponse


def error_response(
    request: Request, status: int, code: str, message: str, details: list[ErrorDetail] | None = None
) -> JSONResponse:
    request.state.error_code = code
    body = ErrorResponse(
        error=ErrorBody(code=code, message=message, details=details or []),
        trace_id=request.state.trace_id,
    )
    return JSONResponse(body.model_dump(), status_code=status)


def install_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(RequestValidationError)
    async def validation_error(request: Request, exc: RequestValidationError) -> JSONResponse:
        details = []
        for issue in exc.errors()[:20]:
            # Never serialize input, validator exception text, ctx or unknown field names.
            field = "request" if issue["type"] == "extra_forbidden" else str(issue["loc"][-1])
            details.append(
                ErrorDetail(field=field, code="INVALID_VALUE", message="مقدار معتبر وارد کنید.")
            )
        return error_response(
            request, 422, "VALIDATION_ERROR", "اطلاعات واردشده را بررسی کنید.", details
        )

    @app.exception_handler(HTTPException)
    async def http_error(request: Request, exc: HTTPException) -> JSONResponse:
        codes = {404: "NOT_FOUND", 405: "METHOD_NOT_ALLOWED", 401: "UNAUTHORIZED", 403: "FORBIDDEN"}
        return error_response(
            request,
            exc.status_code,
            codes.get(exc.status_code, "REQUEST_ERROR"),
            "درخواست قابل انجام نیست.",
        )

    @app.exception_handler(SQLAlchemyError)
    async def db_error(request: Request, exc: SQLAlchemyError) -> JSONResponse:
        return error_response(request, 503, "SERVICE_UNAVAILABLE", "سرویس موقتاً در دسترس نیست.")
