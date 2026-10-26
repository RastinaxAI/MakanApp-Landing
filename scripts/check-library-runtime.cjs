// Read-only verification of the deployed public pages; never creates production fixtures.
const { chromium, firefox, webkit } = require("playwright");
const { expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;
const fs = require("node:fs/promises");
const path = require("node:path");

async function main() {
  const origin = process.env.PUBLIC_TEST_ORIGIN || "http://127.0.0.1:3100";
  const url = new URL(origin);
  if (!["127.0.0.1", "localhost", "[::1]"].includes(url.hostname))
    throw new Error("Local verification only");
  const directory = path.resolve("docs/qa/public-library-search/runtime");
  await fs.mkdir(directory, { recursive: true });
  const checks = [];
  for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
    const browser = await engine.launch({
      ...(name === "chromium" && process.platform === "win32"
        ? { channel: "msedge" }
        : {}),
    });
    try {
      const context = await browser.newContext({ baseURL: origin });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      for (const width of name === "chromium" ? [320, 768, 1440] : [360]) {
        await page.setViewportSize({ width, height: width < 600 ? 640 : 960 });
        for (const route of ["learn", "blog", "solutions"]) {
          expect(
            (await page.goto(`/${route}`))?.status(),
            `${name}/${width}/${route}`,
          ).toBe(200);
          await page.evaluate(() => document.fonts.ready);
          const heading = page.getByRole("heading", { level: 1 });
          await expect(heading).toHaveCount(1);
          await expect(heading).toHaveCSS("text-align", "center");
          const box = await heading.evaluate((element) => {
            const range = document.createRange();
            range.selectNodeContents(element);
            const bounds = range.getBoundingClientRect();
            return { x: bounds.x, width: bounds.width };
          });
          expect(Math.abs(box.x + box.width / 2 - width / 2)).toBeLessThan(2);
          expect(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth + 1,
            ),
          ).toBe(true);
          await page.screenshot({
            path: path.join(directory, `${name}-${route}-${width}.png`),
          });
          if (route !== "solutions") {
            await page
              .getByRole("button", { name: "فیلترها", exact: true })
              .click();
            const dialog = page.getByRole("dialog");
            await expect(dialog).toBeVisible();
            await dialog
              .getByLabel("موضوع", { exact: true })
              .selectOption("reports");
            await dialog
              .getByLabel("مرتب‌سازی", { exact: true })
              .scrollIntoViewIfNeeded();
            await expect(
              dialog.getByRole("button", {
                name: "اعمال فیلترها",
                exact: true,
              }),
            ).toBeVisible();
            expect(
              (
                await new AxeBuilder({ page })
                  .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
                  .analyze()
              ).violations,
            ).toEqual([]);
            await page.screenshot({
              path: path.join(
                directory,
                `${name}-${route}-filters-${width}.png`,
              ),
            });
            await page.keyboard.press("Escape");
            await expect(dialog).toHaveCount(0);
            await expect(
              page.getByRole("button", { name: "فیلترها", exact: true }),
            ).toBeFocused();
          }
          checks.push({ browser: name, width, route, passed: true });
        }
      }
      expect(errors).toEqual([]);
    } finally {
      await browser.close();
    }
  }
  await fs.writeFile(
    path.join(directory, "checks.json"),
    JSON.stringify({ origin, checks }, null, 2),
  );
  console.log(`${checks.length} deployed public page checks passed`);
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
