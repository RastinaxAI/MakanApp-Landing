import logging
from time import perf_counter
from uuid import uuid4

from starlette.requests import Request
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.core.errors import error_response


class RequestContextMiddleware:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        trace_id = str(uuid4())
        scope.setdefault("state", {})["trace_id"] = trace_id
        started = perf_counter()
        status = 500
        headers_sent = False

        async def send_with_headers(message: Message) -> None:
            nonlocal status, headers_sent
            if message["type"] == "http.response.start":
                headers_sent = True
                status = message["status"]
                message["headers"] = [
                    *message.get("headers", []),
                    (b"x-trace-id", trace_id.encode()),
                    (b"cache-control", b"no-store"),
                    (b"x-content-type-options", b"nosniff"),
                ]
            await send(message)

        try:
            await self.app(scope, receive, send_with_headers)
        except Exception:
            if headers_sent:
                raise
            response = error_response(
                Request(scope), 500, "INTERNAL_ERROR", "خطای داخلی رخ داد. دوباره تلاش کنید."
            )
            await response(scope, receive, send_with_headers)
        finally:
            route = getattr(scope.get("route"), "path", "unmatched")
            logging.getLogger("makan.api").info(
                "request_completed",
                extra={
                    "trace_id": trace_id,
                    "method": scope["method"],
                    "route": route,
                    "status": status,
                    "duration_ms": round((perf_counter() - started) * 1000, 2),
                    "error_code": scope["state"].get("error_code"),
                },
            )
