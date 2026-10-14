import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const output = path.resolve(`../../docs/qa/${process.env.MAKAN_QA_PHASE ?? "brand-refresh"}`);

for (const width of [390, 768, 1440]) {
  test(`branded homepage is accessible and fits ${width}px`, async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    const brand = page.getByRole("banner").getByRole("link", { name: /صفحه اصلی/ });
    const logo = brand.locator("img");
    await expect.poll(() => logo.evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    expect(await logo.getAttribute("src")).toContain("makan-logo.png");
    await expect(page.getByText("نشان متنی موقت", { exact: true })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const audit = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    await mkdir(output, { recursive: true });
    await testInfo.attach("axe-brand", { body: JSON.stringify({ url: page.url(), violations: audit.violations }), contentType: "application/json" });
    expect(audit.violations).toEqual([]);
    expect(errors).toEqual([]);
    await page.screenshot({ path: path.join(output, `${testInfo.project.name}-home-${width}.png`), fullPage: true, animations: "disabled" });
  });
}

test("public pages and administrator login remain legible in the blue theme", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  for (const route of ["/features", "/solutions/schools", "/demo", "/contact", "/admin/login", "/design-system"]) {
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const audit = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    expect(audit.violations, route).toEqual([]);
  }
});

test("mobile menu and main action remain usable with keyboard and reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "رفتن به محتوای اصلی" })).toBeFocused();
  await page.getByRole("button", { name: "باز کردن منو" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  const action = page.getByRole("main").getByRole("link", { name: /درخواست.*دمو/ }).first();
  await action.click();
  await expect(page).toHaveURL(/\/demo(?:\?|$)/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});
