const resetCodes = new Set(["UND_ERR_SOCKET", "ECONNRESET", "EPIPE"]);

function connectionReset(error: unknown): boolean {
  if (!(error instanceof Error) || !error.cause || typeof error.cause !== "object") return false;
  const cause = error.cause as { code?: unknown };
  return typeof cause.code === "string" && resetCodes.has(cause.code);
}

/** One bounded retry for a stale keep-alive socket; never retries an HTTP error or a write. */
export async function backendRead(
  url: URL,
  options: Omit<RequestInit, "method" | "body" | "signal"> = {},
  fetcher: typeof fetch = fetch,
): Promise<Response> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await fetcher(url, {
        ...options,
        method: "GET",
        body: undefined,
        signal: AbortSignal.timeout(8000),
      });
    } catch (error) {
      if (attempt || !connectionReset(error)) throw error;
    }
  }
  throw new Error("Backend read unavailable");
}
