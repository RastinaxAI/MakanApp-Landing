import { test } from "node:test";
import assert from "node:assert/strict";
import { createPublicReadCoalescer } from "../../src/lib/public-read-coalescer.ts";

test("concurrent visitors share one pending read, not a stored content snapshot", async () => {
  const read = createPublicReadCoalescer();
  let calls = 0;
  let release;
  const load = () => {
    calls++;
    return new Promise((resolve) => {
      release = resolve;
    });
  };
  const visitors = Array.from({ length: 40 }, () =>
    read("/pages/features", load),
  );
  release({ revision: 1 });
  assert.equal(calls, 1);
  assert.deepEqual(
    await Promise.all(visitors),
    Array(40).fill({ revision: 1 }),
  );
  assert.deepEqual(
    await read("/pages/features", async () => ({ revision: 2 })),
    { revision: 2 },
  );
});

test("filters and slugs never share another page's pending result", async () => {
  const read = createPublicReadCoalescer();
  const results = await Promise.all([
    read("/learn?audience=teacher", async () => "teacher"),
    read("/learn?audience=parent", async () => "parent"),
    read("/pages/privacy", async () => "privacy"),
  ]);
  assert.deepEqual(results, ["teacher", "parent", "privacy"]);
});

test("failures are cleared and unpublishing is observed on the next read", async () => {
  const read = createPublicReadCoalescer();
  await assert.rejects(
    read("/pages/example", async () => {
      throw new Error("offline");
    }),
  );
  assert.equal(await read("/pages/example", async () => 200), 200);
  assert.equal(await read("/pages/example", async () => 404), 404);
});

test("distinct keys beyond the pending limit are not retained", async () => {
  const read = createPublicReadCoalescer(1);
  let release;
  const first = read(
    "/first",
    () =>
      new Promise((resolve) => {
        release = resolve;
      }),
  );
  let calls = 0;
  await Promise.all([
    read("/second", async () => ++calls),
    read("/second", async () => ++calls),
  ]);
  assert.equal(calls, 2);
  release("ok");
  assert.equal(await first, "ok");
});
