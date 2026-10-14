import { test } from "node:test";
import assert from "node:assert/strict";
import { backendRead } from "../../src/lib/backend-read.ts";

const url = new URL("http://127.0.0.1:8000/api/v1/site/settings");
const reset = () => new TypeError("fetch failed", { cause: { code: "UND_ERR_SOCKET" } });

test("stale connection retries once and preserves read-only request options", async () => {
  const calls = [];
  const result = await backendRead(url, { cache: "no-store", redirect: "manual", headers: { Cookie: "test=fixture" } }, async (_url, options) => {
    calls.push(options);
    if (calls.length === 1) throw reset();
    return new Response("ok");
  });
  assert.equal(await result.text(), "ok");
  assert.equal(calls.length, 2);
  for (const call of calls) {
    assert.equal(call.method, "GET"); assert.equal(call.body, undefined);
    assert.equal(call.cache, "no-store"); assert.equal(call.redirect, "manual");
    assert.deepEqual(call.headers, { Cookie: "test=fixture" });
  }
  assert.notEqual(calls[0].signal, calls[1].signal);
});

test("repeated connection errors stop at two attempts", async () => {
  let calls = 0;
  await assert.rejects(backendRead(url, {}, async () => { calls++; throw reset(); }));
  assert.equal(calls, 2);
});

test("HTTP errors and authentication responses are returned without retry", async () => {
  for (const status of [401, 404, 503]) {
    let calls = 0;
    const result = await backendRead(url, {}, async () => { calls++; return new Response("unavailable", { status }); });
    assert.equal(result.status, status); assert.equal(calls, 1);
  }
});

test("timeout and unrelated exceptions never retry", async () => {
  for (const error of [new DOMException("timeout", "TimeoutError"), new TypeError("invalid", { cause: { code: "INVALID_URL" } })]) {
    let calls = 0;
    await assert.rejects(backendRead(url, {}, async () => { calls++; throw error; }));
    assert.equal(calls, 1);
  }
});
