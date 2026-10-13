import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

for (const path of ["/", "/features", "/solutions/schools", "/demo", "/learn/articles/seo-article", "/learn/videos/seo-video", "/admin/login"]) {
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
    if (path === "/admin/login") {
      await expect(page.getByLabel("شماره همراه", { exact: true })).toBeVisible();
      await expect(page.getByText("حالت توسعه فعال است")).toHaveCount(0);
      await expect(page.locator('form input[type="password"], form input[type="email"]')).toHaveCount(0);
    }
    if (path === "/") {
      const icon = await page.request.get("/brand/makan-icon.svg");
      expect(icon.status()).toBe(200);
      expect((await icon.body()).length).toBeLessThan(10_000);
      expect(await page.evaluate(() => new Promise<boolean>((resolve) => {
        const image = new Image();
        image.onload = () => resolve(image.naturalWidth === 128 && image.naturalHeight === 128);
        image.onerror = () => resolve(false);
        image.src = "/brand/makan-icon.svg";
      }))).toBe(true);
    }
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
      const cover = page.getByRole("main").locator("img").first();
      await expect.poll(() => cover.evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
      expect(await cover.getAttribute("src")).toContain("/_next/image");
    }
  expect(errors).toEqual([]);
});
}

test("production administrator session uses secure cookie and survives navigation", async ({ page, context }) => {
  const sessionToken = process.env.PRODUCTION_TEST_SESSION;
  const origin = process.env.PRODUCTION_TEST_ORIGIN;
  if (!sessionToken || !origin) throw new Error("Private controlled HTTPS OTP session required");
  await context.addCookies([{name:"__Host-makan_session",value:sessionToken,url:origin,secure:true,httpOnly:true,sameSite:"Lax"}]);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin$/);
  const session = (await context.cookies()).find((cookie) => cookie.name.includes("session"));
  expect(session?.secure).toBe(true);
  expect(session?.httpOnly).toBe(true);
  await page.goto("/admin/leads");
  await expect(page.locator("h1")).toBeVisible();
  const response = await page.request.get("/api/v1/admin/leads");
  expect(response.status()).toBe(200);
});
