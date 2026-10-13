import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const routes = [
  "/",
  "/features",
  "/features/messenger",
  "/features/school",
  "/features/reports",
  "/features/ai",
  "/solutions",
  "/solutions/schools",
  "/solutions/teachers",
  "/solutions/parents",
  "/solutions/students",
  "/demo",
  "/contact",
  "/about",
  "/faq",
  "/privacy",
  "/terms",
  "/blog",
  "/learn",
];

test("all PRD public routes render SSR Persian content, one H1 and distinct metadata", async ({
  request,
}) => {
  const titles = new Set<string>();
  const descriptions = new Set<string>();
  const localLinks = new Set<string>();
  for (const route of routes) {
    const response = await request.get(route);
    expect(response.status(), route).toBe(200);
    const html = await response.text();
    expect(html, route).toMatch(/<html[^>]*lang="fa"[^>]*dir="rtl"/);
    expect((html.match(/<h1\b/g) ?? []).length, route).toBe(1);
    const title = html.match(/<title>(.*?)<\/title>/)?.[1];
    const description = html.match(
      /<meta name="description" content="([^"]*)"/,
    )?.[1];
    expect(title, route).toBeTruthy();
    expect(description, route).toBeTruthy();
    expect(titles.has(title!), `duplicate title on ${route}`).toBe(false);
    expect(
      descriptions.has(description!),
      `duplicate description on ${route}`,
    ).toBe(false);
    titles.add(title!);
    descriptions.add(description!);
    expect(html).toContain("noindex");
    for (const match of html.matchAll(/<a\b[^>]*href="([^"]+)"/g)) {
      if (match[1]?.startsWith("/")) localLinks.add(match[1].split("#")[0]!);
    }
  }
  for (const href of localLinks)
    expect((await request.get(href)).status(), `broken link ${href}`).toBe(200);
  for (const route of [
    "/features/not-real",
    "/solutions/not-real",
    "/learn/articles/not-published",
    "/blog/not-published",
  ]) {
    expect((await request.get(route)).status(), route).toBe(404);
  }
});

test("homepage follows PRD order and handles ready vs roadmap product tabs", async ({
  page,
}) => {
  await page.goto("/");
  expect(
    await page
      .locator("[data-section]")
      .evaluateAll((elements) =>
        elements.map((element) => element.getAttribute("data-section")),
      ),
  ).toEqual([
    "hero",
    "challenge",
    "features",
    "audiences",
    "experience",
    "onboarding",
    "trust",
  ]);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "مدرسه هوشمندتر",
  );
  await expect(
    page.getByRole("link", { name: "مشاهده امکانات", exact: true }),
  ).toHaveAttribute("href", "/features");
  await expect(
    page.getByRole("tab", { name: "پیام‌رسان", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page.getByRole("tab", { name: "پیام‌رسان", exact: true }).focus();
  await page.keyboard.press("ArrowLeft");
  await expect(
    page.getByRole("tab", { name: "مدرسه", exact: true }),
  ).toBeFocused();
  await page.getByRole("tab", { name: "هوش مصنوعی", exact: true }).click();
  const panel = page.getByRole("tabpanel");
  await expect(panel.getByText("در نقشه راه", { exact: true })).toBeVisible();
  await expect(panel).toContainText("این بخش دموی هوش مصنوعی نیست");
  await expect(panel.getByRole("link")).toHaveAttribute("href", "/features/ai");
  await expect(page.locator("iframe")).toHaveCount(0);
  await expect(page.locator('section[data-section="learn"]')).toHaveCount(0);
  await page
    .getByRole("link", { name: "درخواست دموی ماکان", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/demo$/);
  await expect(
    page.getByText("ثبت درخواست فعلاً فعال نیست.", { exact: true }),
  ).toBeVisible();
});

test("feature pages honor user confirmation and never present an operational AI demo", async ({
  page,
}) => {
  for (const slug of ["messenger", "school", "reports"]) {
    await page.goto(`/features/${slug}`);
    await expect(page.getByText("آماده", { exact: true })).toBeVisible();
    await expect(
      page
        .getByRole("link", { name: "درخواست دموی ماکان", exact: true })
        .first(),
    ).toHaveAttribute("href", "/demo");
  }
  await page.goto("/features/ai");
  await expect(page.getByText("در نقشه راه", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "در نقشه راه؛ بدون دموی فعال" }),
  ).toBeVisible();
  await expect(page.locator("textarea, input, iframe")).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "مشاهده امکانات آماده" }),
  ).toHaveAttribute("href", "/features");
});

test("audience journeys have distinct actions and explicit access boundaries", async ({
  page,
}) => {
  await page.goto("/solutions/schools");
  await expect(
    page.getByRole("link", { name: "درخواست دمو برای مدرسه من" }).first(),
  ).toHaveAttribute("href", "/demo");
  await page.goto("/solutions/teachers");
  await expect(
    page.getByRole("link", { name: "آشنایی با امکانات آموزشی" }).first(),
  ).toHaveAttribute("href", "/features/school");
  await page.goto("/solutions/parents");
  await expect(page.getByText(/والد اطلاعات فرزندان دیگر/)).toBeVisible();
  await expect(
    page.getByRole("link", { name: "آشنایی با گزارش‌ها" }).first(),
  ).toHaveAttribute("href", "/features/reports");
  await page.goto("/solutions/students");
  await expect(
    page.getByRole("link", { name: "آشنایی با بخش مدرسه" }).first(),
  ).toHaveAttribute("href", "/features/school");
});

test("draft forms cannot accept data, post requests or show fake success", async ({
  page,
}) => {
  const submissions: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST") submissions.push(request.url());
  });
  for (const route of ["/demo", "/contact"]) {
    await page.goto(route);
    await expect(
      page.getByText("ثبت درخواست فعلاً فعال نیست.", { exact: true }),
    ).toBeVisible();
    for (const field of await page
      .locator("fieldset input, fieldset textarea, fieldset select")
      .all())
      await expect(field).toBeDisabled();
    await expect(page.locator("fieldset button")).toBeDisabled();
    await expect(page.locator("form")).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.length)).toBe(0);
  }
  expect(submissions).toEqual([]);
});

test("empty content libraries and legal drafts remain honest and separate", async ({
  page,
}) => {
  for (const route of ["/learn", "/blog"]) {
    await page.goto(route);
    await expect(
      page.getByRole("heading", { name: "هنوز مطلبی منتشر نشده است." }),
    ).toBeVisible();
    await expect(page.locator("iframe")).toHaveCount(0);
  }
  for (const route of ["/privacy", "/terms"]) {
    await page.goto(route);
    await expect(
      page.getByRole("heading", {
        name: "پیش‌نویس برای بازبینی؛ هنوز مصوب نیست",
      }),
    ).toBeVisible();
  }
  await page.goto("/faq");
  const trigger = page.getByRole("button", {
    name: "آیا دستیار هوش مصنوعی اکنون فعال است؟",
    exact: true,
  });
  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByText(/خیر. Copilot و تحلیل هوشمند/)).toBeVisible();
});

for (const width of [360, 768, 1440]) {
  test(`representative public layouts reflow and pass axe at ${width}px`, async ({
    page,
  }, testInfo) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: 900 });
    for (const route of [
      "/features",
      "/features/school",
      "/features/ai",
      "/solutions/schools",
      "/demo",
      "/privacy",
    ]) {
      await page.goto(route);
      await page.evaluate(() => document.fonts.ready);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        route,
      ).toBe(true);
      const audit = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      await testInfo.attach(`axe-${route}`, {
        body: JSON.stringify(audit),
        contentType: "application/json",
      });
      expect(audit.violations, route).toEqual([]);
      if (
        ["/features/school", "/solutions/schools", "/demo"].includes(route) &&
        [360, 1440].includes(width)
      ) {
        const directory = path.resolve(
          "../../docs/qa/step6",
          testInfo.project.name,
        );
        await mkdir(directory, { recursive: true });
        await page.evaluate(() =>
          window.scrollTo({ top: 0, behavior: "instant" }),
        );
        await page.screenshot({
          path: path.join(
            directory,
            `${route.slice(1).replaceAll("/", "-")}-${width}.png`,
          ),
          fullPage: true,
          animations: "disabled",
        });
      }
    }
  });
}

test("public mobile navigation and demo backtracking remain usable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/solutions/parents");
  await page.getByRole("button", { name: "باز کردن منو" }).click();
  const menu = page.getByRole("dialog", { name: "منوی ماکان" });
  await menu.getByRole("link", { name: "آموزش ماکان", exact: true }).click();
  await expect(page).toHaveURL(/\/learn$/);
  await expect(menu).toBeHidden();
  await page.goBack();
  await expect(page).toHaveURL(/\/solutions\/parents$/);
  await page.getByRole("button", { name: "باز کردن منو" }).click();
  await menu
    .getByRole("link", { name: "درخواست دموی ماکان", exact: true })
    .click();
  await expect(page).toHaveURL(/\/demo$/);
});
