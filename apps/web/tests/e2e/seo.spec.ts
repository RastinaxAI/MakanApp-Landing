import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

test("crawl index and partition agree with SSR canonical and exclude private thin future content", async ({
  request,
  page,
}) => {
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Allow: /");
  expect(robots).toContain("Disallow: /admin/");
  const index = await (await request.get("/sitemap.xml")).text();
  const maps = [...index.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
    (m) => new URL(m[1]!).pathname,
  );
  expect(maps).toContain("/learn/sitemap/0.xml");
  const locations: string[] = [];
  for (const map of maps) {
    const response = await request.get(map);
    expect(response.status()).toBe(200);
    locations.push(
      ...[...(await response.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map(
        (m) => m[1]!,
      ),
    );
  }
  expect(locations).toContain(
    "https://makan.example/learn/articles/seo-article",
  );
  expect(locations).toContain("https://makan.example/learn/videos/seo-video");
  expect(
    locations.some((url) =>
      /seo-draft|seo-future|admin|design-system|\/privacy$|\/terms$|\/blog$/.test(
        url,
      ),
    ),
  ).toBe(false);
  for (const route of [
    "/",
    "/features",
    "/solutions/schools",
    "/demo",
    "/learn/articles/seo-article",
    "/learn/videos/seo-video",
  ]) {
    await page.goto(route);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("link[rel=canonical]")).toHaveAttribute(
      "href",
      `https://makan.example${route === "/" ? "/" : route}`,
    );
    await expect(page.locator("meta[name=robots]")).toHaveAttribute(
      "content",
      /index, follow/,
    );
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
      "content",
      /summary/,
    );
    await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute(
      "content",
      "fa_IR",
    );
  }
  await page.goto("/learn?tag=unused");
  await expect(page.locator("meta[name=robots]")).toHaveAttribute(
    "content",
    /noindex/,
  );
  await expect(page.locator("link[rel=canonical]")).toHaveAttribute(
    "href",
    "https://makan.example/learn",
  );
  expect((await request.get("/learn/articles/seo-draft")).status()).toBe(404);
  expect((await request.get("/learn/videos/seo-article")).status()).toBe(404);
});

test("real metadata produces matching safe JSON-LD and no player request before click", async ({
  page,
}, info) => {
  test.setTimeout(90000);
  const thirdParty: string[] = [];
  const viewRequests: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("aparat.com")) thirdParty.push(r.url());
    if (r.url().includes("/learn/views/")) viewRequests.push(r.url());
  });
  await page.goto("/");
  const graphs = await page
    .locator('script[type="application/ld+json"]')
    .allTextContents();
  const home = graphs.flatMap((text) => JSON.parse(text));
  expect(home.some((g) => g["@type"] === "Organization" && !g.logo)).toBe(true);
  expect(
    home.some(
      (g) =>
        g["@type"] === "SoftwareApplication" && !g.offers && !g.aggregateRating,
    ),
  ).toBe(true);
  const faq = home.find((g) => g["@type"] === "FAQPage");
  expect(faq.mainEntity).toHaveLength(
    await page.locator("[data-faq-list] button").count(),
  );
  await page.goto("/learn/articles/seo-article?series=ignored");
  await expect(page.locator("link[rel=canonical]")).toHaveAttribute(
    "href",
    "https://makan.example/learn/articles/seo-article",
  );
  const article = (
    await page.locator('script[type="application/ld+json"]').allTextContents()
  ).flatMap((text) => JSON.parse(text));
  expect(
    article.some(
      (g) => g["@type"] === "Article" && g.datePublished && g.dateModified,
    ),
  ).toBe(true);
  await page.goto("/learn/videos/seo-video");
  const video = (
    await page.locator('script[type="application/ld+json"]').allTextContents()
  )
    .flatMap((text) => JSON.parse(text))
    .find((g) => g["@type"] === "VideoObject");
  expect(video.uploadDate).toContain("2026-10-01");
  expect(video.duration).toBe("PT120S");
  expect(video.embedUrl).toMatch(
    /^https:\/\/www.aparat.com\/video\/video\/embed\/videohash\/oda3f7q\/vt\/frame$/,
  );
  expect(thirdParty).toEqual([]);
  await expect(page.locator("iframe")).toHaveCount(0);
  const dir = path.resolve(
    `../../docs/qa/${process.env.MAKAN_QA_PHASE ?? "step10"}`,
  );
  await mkdir(dir, { recursive: true });
  for (const width of [360, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    const result = await new AxeBuilder({ page }).analyze();
    expect(result.violations).toEqual([]);
    await writeFile(
      path.join(dir, `seo-axe-${info.project.name}-${width}.json`),
      JSON.stringify(
        {
          url: result.url,
          timestamp: result.timestamp,
          testEngine: result.testEngine,
          violations: result.violations,
          passed_checks: result.passes.length,
        },
        null,
        2,
      ),
    );
    await page.screenshot({
      path: path.join(dir, `seo-video-${info.project.name}-${width}.png`),
      fullPage: true,
    });
  }
  expect(viewRequests).toEqual([]);
});

test("optional consent refuses tracking then records exact events without PII and withdrawal stops sends", async ({
  page,
}) => {
  test.setTimeout(90000);
  const events: Record<string, unknown>[] = [];
  page.on("request", (r) => {
    if (r.url().endsWith("/analytics/events")) events.push(r.postDataJSON());
  });
  await page.goto("/");
  expect(await (await page.request.get("/")).text()).toContain("اجازه نمی‌دهم");
  await page
    .getByRole("button", { name: "اجازه نمی‌دهم", exact: true })
    .click();
  const rejectedHtml = await (await page.request.get("/")).text();
  expect(rejectedHtml).toContain("تنظیم اندازه‌گیری اختیاری");
  expect(rejectedHtml).not.toContain("اجازه نمی‌دهم");
  await page.getByRole("tab", { name: "مدرسه", exact: true }).click();
  await page.waitForTimeout(350);
  expect(events).toEqual([]);
  await page.getByRole("button", { name: "تنظیم اندازه‌گیری اختیاری" }).click();
  await page.getByRole("button", { name: "اجازه می‌دهم", exact: true }).click();
  await expect
    .poll(() => events.some((e) => e.name === "session_start"))
    .toBe(true);
  await page.getByRole("tab", { name: "پیام‌رسان", exact: true }).click();
  await page.locator("[data-faq-list] button").first().click();
  await page.locator("[data-section=hero] a[href^='/demo']").click();
  await page
    .getByLabel("نام و نام خانوادگی", { exact: true })
    .fill("نام خصوصی آزمایش");
  await expect
    .poll(() => events.some((e) => e.name === "demo_form_start"))
    .toBe(true);
  await page
    .getByRole("button", { name: "ثبت درخواست دمو", exact: true })
    .click();
  await expect
    .poll(() =>
      events.some(
        (e) =>
          e.name === "demo_form_submit_error" && e.error_kind === "validation",
      ),
    )
    .toBe(true);
  await page.getByLabel("شماره تماس", { exact: true }).fill("09123456789");
  await page
    .getByLabel("نام مدرسه یا مؤسسه", { exact: true })
    .fill("مدرسه خصوصی آزمون");
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "ثبت درخواست دمو", exact: true })
    .click();
  await expect
    .poll(() => events.some((e) => e.name === "demo_form_submit_success"))
    .toBe(true);
  await expect(page.locator("meta[name=robots]")).toHaveAttribute(
    "content",
    /noindex/,
  );
  await page.goto("/");
  await page.locator("header a[href='/demo']").first().click();
  await expect(page).toHaveURL(/\/demo$/);
  const demoTitle = (
    await (await page.request.get("/api/v1/pages/demo")).json()
  ).payload.headline;
  await expect(
    page.getByRole("heading", { name: demoTitle, exact: true }),
  ).toBeVisible();
  await expect
    .poll(() => events.some((e) => e.name === "navigation_cta_click"))
    .toBe(true);
  await page.locator("footer a[href='/contact']").first().click();
  await expect(page).toHaveURL(/\/contact$/);
  const contactTitle = (
    await (await page.request.get("/api/v1/pages/contact")).json()
  ).payload.headline;
  await expect(
    page.getByRole("heading", { name: contactTitle, exact: true }),
  ).toBeVisible();
  await expect
    .poll(() => events.some((e) => e.name === "contact_click"))
    .toBe(true);
  expect(events.some((e) => e.name === "hero_demo_click")).toBe(true);
  expect(events.some((e) => e.name === "feature_tab_view")).toBe(true);
  expect(events.some((e) => e.name === "faq_expand")).toBe(true);
  const payloads = JSON.stringify(events);
  expect(payloads).not.toContain("نام خصوصی");
  expect(payloads).not.toContain("09123456789");
  expect(payloads).not.toContain("مدرسه خصوصی");
  expect(
    events.every(
      (e) =>
        !Object.keys(e).some((key) =>
          /phone|email|message|referrer|token|ip|agent/.test(key),
        ),
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "تنظیم اندازه‌گیری اختیاری" }).click();
  await page
    .getByRole("button", { name: "اجازه نمی‌دهم", exact: true })
    .click();
  await page.waitForTimeout(350);
  const count = events.length;
  await page.goto("/features");
  await page.waitForTimeout(350);
  expect(events).toHaveLength(count);
});

test("privacy signals block collection and admin page is noindex", async ({
  browser,
  request,
  page: adminPage,
}) => {
  const context = await browser.newContext();
  await context.addInitScript(() =>
    Object.defineProperty(navigator, "globalPrivacyControl", { value: true }),
  );
  const page = await context.newPage();
  const events: string[] = [];
  page.on("request", (r) => {
    if (r.url().endsWith("/analytics/events")) events.push(r.url());
  });
  await page.goto((process.env.E2E_BASE_URL ?? "http://127.0.0.1:3100") + "/");
  await expect(
    page.getByRole("button", { name: "تنظیم اندازه‌گیری اختیاری" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "تنظیم اندازه‌گیری اختیاری" }).click();
  await expect(
    page.getByRole("button", { name: "اجازه می‌دهم", exact: true }),
  ).toBeDisabled();
  expect(events).toEqual([]);
  await context.close();
  const html = await (await request.get("/admin/login")).text();
  expect(html).toMatch(/name="robots" content="noindex/);
  for (const signal of ["DNT", "Sec-GPC"]) {
    const response = await request.post("/api/v1/analytics/events", {
      headers: {
        Origin: process.env.E2E_BASE_URL ?? "http://127.0.0.1:3100",
        "User-Agent": "Mozilla/5.0 browser acceptance",
        [signal]: "1",
      },
      data: {
        id: crypto.randomUUID(),
        session_id: crypto.randomUUID(),
        consent: true,
        policy_version: "analytics-2026-10-13-v1",
        name: "session_start",
        path: "/",
      },
    });
    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({ accepted: false });
  }
  await adminPage.goto("/admin/login");
  await adminPage
    .getByLabel("ایمیل مدیر", { exact: true })
    .fill("owner@example.com");
  await adminPage
    .getByLabel("رمز عبور", { exact: true })
    .fill(process.env.E2E_ADMIN_PASSWORD!);
  await adminPage
    .getByRole("button", { name: "ورود به پنل", exact: true })
    .click();
  await expect(adminPage).toHaveURL(/\/admin$/);
  await adminPage.goto("/admin/analytics");
  await expect(
    adminPage.getByRole("heading", {
      name: "اندازه‌گیری استفاده و سرعت",
      exact: true,
    }),
  ).toBeVisible();
  await expect(adminPage.locator("meta[name=robots]")).toHaveAttribute(
    "content",
    /noindex/,
  );
  expect(
    (await new AxeBuilder({ page: adminPage }).analyze()).violations,
  ).toEqual([]);
});
