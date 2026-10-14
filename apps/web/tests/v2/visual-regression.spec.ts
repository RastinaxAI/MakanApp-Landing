import { test, expect } from "@playwright/test";

test("verified local render remains stable on desktop and mobile", async ({ page }) => {
  test.skip(process.platform !== "win32", "Windows baselines require a separately reviewed Linux baseline; responsive and axe gates still run on Linux.");
  for (const width of [1440, 360]) {
    await page.setViewportSize({ width, height: 960 });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator("body")).toHaveCSS("font-family", /vazirmatn/i);
    await expect(page.locator('main [data-section="hero"]')).toHaveScreenshot(`home-hero-${width}.png`, {
      animations: "disabled",
      caret: "hide",
      maxDiffPixelRatio: 0.001,
    });
    await page.goto("/features/messenger");
    await page.evaluate(() => document.fonts.ready);
    await expect(page).toHaveScreenshot(`messenger-${width}.png`, {
      animations: "disabled",
      caret: "hide",
      fullPage: true,
      maxDiffPixelRatio: 0.001,
    });
  }
});
