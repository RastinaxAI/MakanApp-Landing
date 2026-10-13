"""Only the private, authenticated edge may attest a client IP address."""

import hmac
from ipaddress import ip_address

from starlette.datastructures import Headers
from starlette.types import ASGIApp, Receive, Scope, Send

from app.core.config import Settings


class TrustedProxyMiddleware:
    def __init__(self, app: ASGIApp, settings: Settings):
        self.app = app
        self.secret = (
            settings.proxy_shared_secret.get_secret_value()
            if settings.proxy_shared_secret is not None
            else None
        )

    async def __call__(self, scope: Scope, receive: Receive, send: Send):
        if scope["type"] == "http" and self.secret:
            headers = Headers(scope=scope)
            supplied = headers.get("x-makan-proxy-key", "")
            if hmac.compare_digest(supplied.encode(), self.secret.encode()):
                try:
                    address = str(ip_address(headers.get("x-makan-client-ip", "")))
                except ValueError:
                    # Invalid assertions fail closed to the actual network peer.
                    address = None
                if address:
                    scope = dict(scope)
                    scope["client"] = (address, 0)
        await self.app(scope, receive, send)
