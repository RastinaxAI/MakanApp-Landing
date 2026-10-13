import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

for (const path of ["/", "/features", "/solutions/schools", "/demo", "/learn/articles/seo-article", "/learn/videos/seo-video"]) {
test(`production TLS ${path} hydrates under nonce CSP and remains responsive`, async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" && /Content Security Policy|violates.*policy/i.test(message.text())) errors.push(message.text());
  });
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    const csp = response?.headers()["content-security-policy"];
    expect(csp).toContain("nonce-");
    expect(csp).not.toContain("unsafe-eval");
    await expect(page.locator("h1")).toBeVisible();
    for (const width of [360, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    }
    const audit = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    expect(audit.violations).toEqual([]);
    const structured = page.locator('script[type="application/ld+json"]');
    if (path.startsWith("/learn/")) expect(await structured.count()).toBeGreaterThan(0);
    for (const script of await structured.all()) {
      expect(await script.evaluate((element) => (element as HTMLScriptElement).nonce)).toBeTruthy();
      const content = await script.textContent();
      expect(() => JSON.parse(content || "")).not.toThrow();
    }
    if (path.includes("/articles/")) {
      const cover = page.locator("img").first();
      await expect.poll(() => cover.evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
      expect(await cover.getAttribute("src")).toContain("/_next/image");
    }
  expect(errors).toEqual([]);
});
}

test("production administrator session uses secure cookie and survives navigation", async ({ page, context }) => {
  const password = process.env.PRODUCTION_TEST_PASSWORD;
  if (!password) throw new Error("Private isolated administrator password required");
  await page.goto("/admin/login");
  await page.getByLabel("ایمیل مدیر", { exact: true }).fill("owner@example.com");
  await page.getByLabel("رمز عبور", { exact: true }).fill(password);
  const responsePromise = page.waitForResponse((response) => response.url().endsWith("/api/v1/admin/auth/login") && response.request().method() === "POST");
  await page.getByRole("button", { name: "ورود به پنل", exact: true }).click();
  const loginResponse = await responsePromise;
  const sessionHeader = (await loginResponse.headerValues("set-cookie")).find((value) => value.startsWith("__Host-makan_session="));
  expect(sessionHeader).toMatch(/SameSite=Lax/i);
  await expect(page).toHaveURL(/\/admin$/);
  const session = (await context.cookies()).find((cookie) => cookie.name.includes("session"));
  expect(session?.secure).toBe(true);
  expect(session?.httpOnly).toBe(true);
  await page.goto("/admin/leads");
  await expect(page.locator("h1")).toBeVisible();
  const response = await page.request.get("/api/v1/admin/leads");
  expect(response.status()).toBe(200);
});
