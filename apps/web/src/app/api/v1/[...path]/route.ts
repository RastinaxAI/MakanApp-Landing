import { backendUrl, permittedCookies } from "@/lib/admin-api";
import { randomUUID } from "node:crypto";

type Context = { params: Promise<{ path: string[] }> };
function failure(status: number, code: string) {
  const traceId = randomUUID();
  return Response.json(
    {
      error: {
        code,
        message: "درخواست انجام نشد. دوباره تلاش کنید.",
        details: [],
      },
      trace_id: traceId,
    },
    { status, headers: { "Cache-Control": "no-store", "X-Trace-Id": traceId, "X-Content-Type-Options": "nosniff" } },
  );
}
async function bridge(request: Request, context: Context) {
  const path = (await context.params).path.join("/");
  const allowed =
    /^admin\/(auth\/(csrf|login|logout|me|password|sessions(?:\/[0-9a-f-]{36})?|mfa\/(enroll|confirm|disable|recovery-codes))|accounts(?:\/[0-9a-f-]{36})?|dashboard|audit-logs)$/.test(
      path,
    );
  if (!allowed) return failure(404, "NOT_FOUND");
  try {
    const headers = new Headers();
    for (const name of [
      "origin",
      "x-csrf-token",
      "content-type",
      "sec-fetch-site",
    ]) {
      const value = request.headers.get(name);
      if (value) headers.set(name, value);
    }
    headers.set(
      "cookie",
      permittedCookies(request.headers.get("cookie") ?? ""),
    );
    let body: string | undefined;
    if (!["GET", "HEAD"].includes(request.method) && request.body) {
      const reader = request.body.getReader();
      const chunks: Uint8Array[] = [];
      let size = 0;
      for (;;) {
        const chunk = await reader.read();
        if (chunk.done) break;
        size += chunk.value.byteLength;
        if (size > 16384) {
          await reader.cancel();
          return failure(413, "PAYLOAD_TOO_LARGE");
        }
        chunks.push(chunk.value);
      }
      body = Buffer.concat(chunks).toString("utf8");
    }
    const url = backendUrl(path);
    url.search = new URL(request.url).search;
    const upstream = await fetch(url, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(12000),
    });
    const out = new Headers({
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    for (const name of ["content-type", "x-trace-id", "retry-after"]) {
      const value = upstream.headers.get(name);
      if (value) out.set(name, value);
    }
    for (const cookie of upstream.headers.getSetCookie())
      out.append("set-cookie", cookie);
    return new Response(
      upstream.status === 204 ? null : await upstream.text(),
      { status: upstream.status, headers: out },
    );
  } catch {
    return failure(503, "SERVICE_UNAVAILABLE");
  }
}
export const GET = bridge;
export const POST = bridge;
export const PATCH = bridge;
export const DELETE = bridge;
