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
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        "X-Trace-Id": traceId,
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
async function bridge(request: Request, context: Context) {
  const path = (await context.params).path.join("/");
  const allowed =
    /^(?:analytics\/(?:config|events)|admin\/analytics\/metrics)$/.test(path) ||
    /^(?:forms\/token|leads\/demo|contact|admin\/leads(?:\/(?:assignees|metrics|[0-9a-f-]{36}(?:\/(?:notes|history))?))?)$/.test(
      path,
    ) ||
    /^(?:admin\/(?:learn\/(?:contents|series)|blog\/articles)(?:\/[0-9a-f-]{36}(?:\/(?:preview|revisions|publish|schedule|cancel-schedule|unpublish))?)?|admin\/learn\/(?:categories|tags)(?:\/[0-9a-f-]{36})?|learn\/(?:contents|series|categories|tags)(?:\/[\p{L}\p{N}_-]+)?|blog\/articles(?:\/[\p{L}\p{N}_-]+)?|learn\/views\/[0-9a-f-]{36}(?:\/ticket)?)$/u.test(
      path,
    ) ||
    /^admin\/(auth\/(csrf|login|logout|me|password|sessions(?:\/[0-9a-f-]{36})?|mfa\/(enroll|confirm|disable|recovery-codes))|accounts(?:\/[0-9a-f-]{36})?|dashboard|audit-logs)$/.test(
      path,
    ) ||
    /^admin\/(?:content|pages|features|audiences|faqs|faq-categories|media|settings)(?:\/[0-9a-f-]{36}(?:\/(?:preview|revisions|publish|schedule|cancel-schedule|unpublish|file))?)?$/.test(
      path,
    ) ||
    /^(?:site\/settings|faq-categories|pages\/[\p{L}\p{N}_-]+|(?:features|audiences|faqs)(?:\/[\p{L}\p{N}_-]+)?|media\/[0-9a-f-]{36}(?:\/file)?)$/u.test(
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
      "if-match",
      "user-agent",
      "dnt",
      "sec-gpc",
    ]) {
      const value = request.headers.get(name);
      if (value) headers.set(name, value);
    }
    headers.set(
      "cookie",
      permittedCookies(request.headers.get("cookie") ?? ""),
    );
    let body: ArrayBuffer | undefined;
    if (!["GET", "HEAD"].includes(request.method) && request.body) {
      const reader = request.body.getReader();
      const chunks: Uint8Array[] = [];
      let size = 0;
      for (;;) {
        const chunk = await reader.read();
        if (chunk.done) break;
        size += chunk.value.byteLength;
        const maximum =
          path === "admin/media"
            ? 5 * 1024 * 1024 + 65536
            : /^admin\/(content|pages|features|audiences|faqs|settings|learn|blog)/.test(
                  path,
                )
              ? 262144
              : 16384;
        if (size > maximum) {
          await reader.cancel();
          return failure(413, "PAYLOAD_TOO_LARGE");
        }
        chunks.push(chunk.value);
      }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
      }
      body = bytes.buffer;
    }
    const url = backendUrl(path);
    url.search = new URL(request.url).search;
    const upstream = await fetch(url, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(path === "admin/media" && request.method === "POST" ? 30000 : 12000),
    });
    const out = new Headers({
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    for (const name of [
      "content-type",
      "x-trace-id",
      "retry-after",
      "content-disposition",
      "content-security-policy",
    ]) {
      const value = upstream.headers.get(name);
      if (value) out.set(name, value);
    }
    for (const cookie of upstream.headers.getSetCookie())
      out.append("set-cookie", cookie);
    return new Response(upstream.status === 204 ? null : upstream.body, {
      status: upstream.status,
      headers: out,
    });
  } catch {
    return failure(503, "SERVICE_UNAVAILABLE");
  }
}
export const GET = bridge;
export const POST = bridge;
export const PATCH = bridge;
export const DELETE = bridge;
