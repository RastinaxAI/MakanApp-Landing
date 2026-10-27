const resetCodes = new Set(["UND_ERR_SOCKET", "ECONNRESET", "EPIPE"]);

function connectionReset(error: unknown): boolean {
  if (
    !(error instanceof Error) ||
    !error.cause ||
    typeof error.cause !== "object"
  )
    return false;
  const cause = error.cause as { code?: unknown };
  return typeof cause.code === "string" && resetCodes.has(cause.code);
}

/** Read-only retries share one deadline; HTTP errors and writes are never retried. */
export async function backendRead(
  url: URL,
  options: Omit<RequestInit, "method" | "body" | "signal"> = {},
  fetcher: typeof fetch = fetch,
  timing = { attemptMs: 4000, totalMs: 8000 },
): Promise<Response> {
  const deadline = Date.now() + timing.totalMs;
  for (let attempt = 0; attempt < 2; attempt++) {
    const remaining = deadline - Date.now();
    const signal = AbortSignal.timeout(
      Math.max(1, Math.min(timing.attemptMs, remaining)),
    );
    try {
      return await fetcher(url, {
        ...options,
        method: "GET",
        body: undefined,
        signal,
      });
    } catch (error) {
      if (
        attempt ||
        (!signal.aborted && !connectionReset(error)) ||
        Date.now() >= deadline
      ) {
        if (signal.aborted)
          throw new Error("Backend read deadline exceeded", { cause: error });
        throw error;
      }
    }
  }
  throw new Error("Backend read unavailable");
}
