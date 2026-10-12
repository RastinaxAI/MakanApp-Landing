"""HTTPX smoke against the real Docker process, without reading or printing secrets."""

import argparse
import json
import time
from uuid import UUID

import httpx

parser = argparse.ArgumentParser()
parser.add_argument("--ready-status", type=int, choices=[200, 503], default=200)
args = parser.parse_args()
with httpx.Client(base_url="http://127.0.0.1:8000", timeout=8) as client:
    for _attempt in range(20):
        try:
            response = client.get("/api/v1/health/live")
            if response.status_code == 200:
                break
        except httpx.TransportError:
            pass
        time.sleep(0.5)
    else:
        raise RuntimeError("Docker API did not become live")
    assert response.json() == {"status": "ok"}
    UUID(response.headers["x-trace-id"])
    ready = client.get("/api/v1/health/ready")
    assert ready.status_code == args.ready_status
    if args.ready_status == 503:
        assert ready.json()["error"]["code"] == "SERVICE_UNAVAILABLE"
        assert ready.json()["trace_id"] == ready.headers["x-trace-id"]
    schema = client.get("/api/v1/openapi.json")
    assert schema.status_code == 200
    assert "/api/v1/admin/auth/login" in schema.json()["paths"]
    assert client.get("/api/v1/admin/auth/me").status_code == 401
    assert client.get("/api/v1/admin/accounts").status_code == 401
    assert client.get("/api/v1/admin/audit-logs").status_code == 401
    if args.ready_status == 200:
        challenge = client.get("/api/v1/admin/auth/csrf")
        assert challenge.status_code == 200 and len(challenge.json()["csrf_token"]) == 64
        assert "HttpOnly" in challenge.headers["set-cookie"]
        assert "SameSite=lax" in challenge.headers["set-cookie"]
        assert (
            client.post(
                "/api/v1/admin/auth/login",
                headers={"Origin": "https://evil.example.com"},
                json={"email": "invalid@example.com", "password": "invalid"},
            ).status_code
            == 403
        )
    assert client.get("/api/v1/pages/home").status_code == 404
    assert ready.headers["cache-control"] == "no-store"
    print(
        json.dumps(
            {
                "live": 200,
                "ready": ready.status_code,
                "openapi": 200,
                "trace_header": True,
                "next_phase_routes_absent": True,
                "admin_guest_rejected": True,
            }
        )
    )
