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
            if scope["path"].startswith("/api/v1/admin/") and scope["method"] in (
                "POST",
                "PATCH",
                "DELETE",
            ):
                body = bytearray()
                limit = 16384
                if scope["path"] == "/api/v1/admin/media":
                    limit = 5 * 1024 * 1024 + 65536
                elif scope["path"].startswith(
                    tuple(
                        f"/api/v1/admin/{name}"
                        for name in (
                            "pages",
                            "features",
                            "audiences",
                            "faqs",
                            "content",
                            "settings",
                        )
                    )
                ):
                    limit = 262144
                while True:
                    part = await receive()
                    if part["type"] == "http.disconnect":
                        return
                    body.extend(part.get("body", b""))
                    if len(body) > limit:
                        await error_response(
                            Request(scope),
                            413,
                            "PAYLOAD_TOO_LARGE",
                            "حجم درخواست بیش از حد مجاز است.",
                        )(scope, receive, send_with_headers)
                        return
                    if not part.get("more_body", False):
                        break
                original_receive = receive
                sent_body = False

                async def limited_receive():
                    nonlocal sent_body
                    if not sent_body:
                        sent_body = True
                        return {"type": "http.request", "body": bytes(body), "more_body": False}
                    return await original_receive()

                receive = limited_receive
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
