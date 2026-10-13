// Authentication changes replace the document to discard private route cache and history.
export function resetAdminNavigation(destination: "/admin" | "/admin/login") {
  window.location.replace(destination);
}

export async function adminRequest<T>(
  path: string,
  method = "GET",
  body?: unknown,
  version?: number,
): Promise<T> {
  const headers: Record<string, string> = {};
  if (version !== undefined) headers["If-Match"] = `"${version}"`;
  if (method !== "GET") {
    const challenge = await fetch("/api/v1/admin/auth/csrf", {
      cache: "no-store",
      credentials: "same-origin",
    });
    if (!challenge.ok)
      throw new Error(
        challenge.status === 429
          ? "تلاش‌های زیادی انجام شده است؛ کمی بعد دوباره تلاش کنید."
          : "ارتباط با سرویس برقرار نشد.",
      );
    headers["X-CSRF-Token"] = (await challenge.json()).csrf_token;
    headers["Content-Type"] = "application/json";
  }
  const response = await fetch(`/api/v1/admin/${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: "same-origin",
    cache: "no-store",
  });
  if (!response.ok) {
    const result = await response.json().catch(() => null);
    throw new Error(
      result?.error?.message ?? "درخواست انجام نشد. دوباره تلاش کنید.",
    );
  }
  return (response.status === 204 ? undefined : await response.json()) as T;
}
