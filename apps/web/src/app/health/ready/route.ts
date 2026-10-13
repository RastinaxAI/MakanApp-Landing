import { backendUrl } from "@/lib/admin-api";

export async function GET() {
  let ready = false;
  try {
    const result = await fetch(backendUrl("health/ready"), {
      cache: "no-store", redirect: "manual", signal: AbortSignal.timeout(4000),
    });
    ready = result.ok;
  } catch { /* Readiness reports upstream failure without exposing connection details. */ }
  return Response.json({ status: ready ? "ok" : "unavailable" }, {
    status: ready ? 200 : 503,
    headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
  });
}
