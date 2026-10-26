// Read-only UI checks against the actual local Docker website. No forms are submitted.
const { chromium, firefox, webkit } = require("playwright");
const { expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;
const fs = require("node:fs/promises");
const path = require("node:path");
const assert = require("node:assert/strict");
const origin = process.env.PUBLIC_TEST_ORIGIN || "http://127.0.0.1:3100";
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin))
  throw new Error("Local origin required");
const directory = path.resolve("docs/qa/public-polish/runtime");
(async () => {
  await fs.mkdir(directory, { recursive: true });
  const rows = [];
  for (const [name, engine] of [
    ["chromium", chromium],
    ["firefox", firefox],
    ["webkit", webkit],
  ]) {
    const browser = await engine.launch(
      name === "chromium" && process.platform === "win32"
        ? { channel: "msedge" }
        : {},
    );
    try {
      const context = await browser.newContext({ reducedMotion: "reduce" });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      for (const width of [360, 768, 1440]) {
        await page.setViewportSize({ width, height: 960 });
        for (const route of [
          "/demo",
          "/contact",
          "/learn",
          ...(name === "chromium" ? ["/"] : []),
        ]) {
          assert.equal(
            (
              await page.goto(origin + route, { waitUntil: "networkidle" })
            ).status(),
            200,
          );
          await page.evaluate(async () => {
            await document.fonts.ready;
            window.scrollTo(0, 0);
            await new Promise((resolve) =>
              requestAnimationFrame(() => requestAnimationFrame(resolve)),
            );
          });
          assert.equal(
            await page.getByRole("heading", { level: 1 }).count(),
            1,
          );
          const dimensions = await page.evaluate(() => ({
            viewport: innerWidth,
            document: document.documentElement.scrollWidth,
          }));
          assert.ok(
            dimensions.document <= width + 1,
            `${route}@${width}: overflow`,
          );
          if (route === "/demo" || route === "/contact") {
            const font = await page
              .getByLabel("نام و نام خانوادگی", { exact: true })
              .evaluate((el) => getComputedStyle(el).fontSize);
            assert.equal(font, "16px");
            const message = page.locator("textarea");
            assert.ok((await message.boundingBox()).height >= 128);
            await expect(
              page.locator('form button[type="submit"]'),
            ).toBeEnabled({ timeout: 12000 });
          }
          const violations = (
            await new AxeBuilder({ page })
              .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
              .analyze()
          ).violations;
          assert.deepEqual(violations, [], `${name}:${route}@${width}`);
          await page.screenshot({
            path: path.join(
              directory,
              `${name}-${route === "/" ? "home" : route.slice(1)}-${width}.png`,
            ),
            fullPage: true,
            animations: "disabled",
          });
          rows.push({
            engine: name,
            route,
            width,
            overflow: false,
            axe_violations: 0,
          });
        }
      }
      assert.deepEqual(errors, []);
      await context.close();
    } finally {
      await browser.close();
    }
    console.log(`${name}: read-only UI checks passed`);
  }
  await fs.writeFile(
    path.join(directory, "checks.json"),
    JSON.stringify(
      { origin, passed: rows.length, errors: 0, form_submissions: 0, rows },
      null,
      2,
    ),
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
