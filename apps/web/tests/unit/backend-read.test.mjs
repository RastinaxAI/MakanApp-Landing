import { test } from "node:test";
import assert from "node:assert/strict";
import { backendRead } from "../../src/lib/backend-read.ts";

const url = new URL("http://127.0.0.1:8000/api/v1/site/settings");
const reset = () =>
  new TypeError("fetch failed", { cause: { code: "UND_ERR_SOCKET" } });

test("stale connection retries once and preserves read-only request options", async () => {
  const calls = [];
  const result = await backendRead(
    url,
    {
      cache: "no-store",
      redirect: "manual",
      headers: { Cookie: "test=fixture" },
    },
    async (_url, options) => {
      calls.push(options);
      if (calls.length === 1) throw reset();
      return new Response("ok");
    },
  );
  assert.equal(await result.text(), "ok");
  assert.equal(calls.length, 2);
  for (const call of calls) {
    assert.equal(call.method, "GET");
    assert.equal(call.body, undefined);
    assert.equal(call.cache, "no-store");
    assert.equal(call.redirect, "manual");
    assert.deepEqual(call.headers, { Cookie: "test=fixture" });
  }
  assert.notEqual(calls[0].signal, calls[1].signal);
});

test("repeated connection errors stop at two attempts", async () => {
  let calls = 0;
  await assert.rejects(
    backendRead(url, {}, async () => {
      calls++;
      throw reset();
    }),
  );
  assert.equal(calls, 2);
});

test("HTTP errors and authentication responses are returned without retry", async () => {
  for (const status of [401, 404, 503]) {
    let calls = 0;
    const result = await backendRead(url, {}, async () => {
      calls++;
      return new Response("unavailable", { status });
    });
    assert.equal(result.status, status);
    assert.equal(calls, 1);
  }
});

test("unrelated exceptions, including a timeout not caused by our signal, never retry", async () => {
  for (const error of [
    new DOMException("timeout", "TimeoutError"),
    new TypeError("invalid", { cause: { code: "INVALID_URL" } }),
  ]) {
    let calls = 0;
    await assert.rejects(
      backendRead(url, {}, async () => {
        calls++;
        throw error;
      }),
    );
    assert.equal(calls, 1);
  }
});

test("a stalled read gets one fresh attempt within the total deadline", async () => {
  let calls = 0;
  const result = await backendRead(
    url,
    {},
    async (_url, options) => {
      if (++calls === 1) {
        await new Promise((_, reject) => {
          options.signal.addEventListener(
            "abort",
            () => reject(options.signal.reason),
            { once: true },
          );
          // AbortSignal timers do not keep Node's event loop alive.
          const keepAlive = setTimeout(() => {}, 2000);
          options.signal.addEventListener(
            "abort",
            () => clearTimeout(keepAlive),
            { once: true },
          );
        });
      }
      return new Response("recovered");
    },
    { attemptMs: 20, totalMs: 2000 },
  );
  assert.equal(await result.text(), "recovered");
  assert.equal(calls, 2);
});

test("a deadline spent on the first attempt is never extended by a retry", async () => {
  let calls = 0;
  await assert.rejects(
    backendRead(
      url,
      {},
      async () => {
        calls++;
        await new Promise((resolve) => setTimeout(resolve, 30));
        throw reset();
      },
      { attemptMs: 10, totalMs: 15 },
    ),
  );
  assert.equal(calls, 1);
});

test("exhausted timeouts become a regular Error that Next can annotate", async () => {
  let calls = 0;
  const keepAlive = setTimeout(() => {}, 3000);
  try {
    await assert.rejects(
      backendRead(
        url,
        {},
        async (_url, options) => {
          calls++;
          await new Promise((_, reject) =>
            options.signal.addEventListener(
              "abort",
              () => reject(options.signal.reason),
              { once: true },
            ),
          );
        },
        { attemptMs: 15, totalMs: 2000 },
      ),
      (error) => {
        assert.equal(error.message, "Backend read deadline exceeded");
        error.message = "annotated";
        assert.equal(error.cause.name, "TimeoutError");
        return true;
      },
    );
    assert.equal(calls, 2);
  } finally {
    clearTimeout(keepAlive);
  }
});
