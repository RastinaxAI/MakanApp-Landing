import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { randomUUID } from "node:crypto";
import { readFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { login } from "./helpers";

test("public location and illustrated help match all website sections without submitting forms", async ({
  page,
}) => {
  test.setTimeout(180000);
  const mutations: string[] = [];
  page.on("request", (request) => {
    if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method()))
      mutations.push(request.url());
  });
  for (const [route, title, image] of [
    ["/", "صفحهٔ اصلی ماکان", "home"],
    ["/features", "امکانات ماکان", "features"],
    ["/solutions", "راهکار مناسب شما", "solutions"],
    ["/learn", "آموزش ماکان", "learn"],
    ["/blog", "وبلاگ ماکان", "blog"],
    ["/faq", "پرسش‌های متداول", "faq"],
    ["/demo", "درخواست دمو", "demo"],
    ["/contact", "تماس با ماکان", "contact"],
  ]) {
    expect((await page.goto(route!))?.status()).toBe(200);
    await expect(
      page.getByRole("complementary", { name: "موقعیت و راهنمای صفحه" }),
    ).toContainText(title!);
    const opener = page.getByRole("button", {
      name: "راهنمای تصویری این صفحه",
      exact: true,
    });
    await opener.click();
    const dialog = page.getByRole("dialog", { name: title, exact: true });
    await expect(dialog).toBeVisible();
    await expect(dialog.locator("img")).toHaveAttribute(
      "src",
      `/guides/site/${image}.png`,
    );
    expect((await page.request.get(`/guides/site/${image}.png`)).status()).toBe(
      200,
    );
    await expect(dialog.locator('a[href^="/admin"]')).toHaveCount(0);
    await dialog.getByRole("button", { name: "بعدی", exact: true }).click();
    await expect(dialog.getByRole("status")).toContainText("گام ۲ از");
    await page.keyboard.press("Escape");
    await expect(opener).toBeFocused();
  }
  await page.goto("/");
  await page
    .getByRole("button", { name: "راهنمای تصویری این صفحه", exact: true })
    .click();
  const homeGuide = page.getByRole("dialog", {
    name: "صفحهٔ اصلی ماکان",
    exact: true,
  });
  await homeGuide.getByRole("button", { name: "بعدی", exact: true }).click();
  await homeGuide.getByRole("button", { name: "بعدی", exact: true }).click();
  await homeGuide
    .getByRole("link", { name: "درخواست دمو", exact: true })
    .click();
  await expect(page).toHaveURL(/\/demo\?source=home$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(mutations).toEqual([]);
});

for (const width of [320, 768, 1440]) {
  test(`public illustrated guide is accessible and usable at ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/learn");
    const opener = page.getByRole("button", {
      name: "راهنمای تصویری این صفحه",
      exact: true,
    });
    await opener.click();
    const dialog = page.getByRole("dialog", {
      name: "آموزش ماکان",
      exact: true,
    });
    await expect(dialog).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    const directory = path.resolve(
      `../../docs/qa/illustrated-help/${info.project.name}`,
    );
    await mkdir(directory, { recursive: true });
    await page.screenshot({
      path: path.join(directory, `public-guide-${width}.png`),
    });
    const imageButton = dialog.getByRole("button", {
      name: "بزرگنمایی تصویر: نمای آموزش ماکان",
      exact: true,
    });
    await imageButton.click();
    const zoom = page.getByRole("dialog", {
      name: "نمای آموزش ماکان",
      exact: true,
    });
    await expect(zoom).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(zoom).toHaveCount(0);
    await expect(dialog).toBeVisible();
    await expect(imageButton).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(opener).toBeFocused();
    await opener.click();
    await dialog
      .getByRole("link", { name: "انتخاب مسیر یادگیری", exact: true })
      .click();
    await expect(dialog).toHaveCount(0);
    await expect(page).toHaveURL(/\/learn$/);
  });
}

test("admin guide center requires authentication", async ({ page }) => {
  await page.goto("/admin/help");
  await expect(page).toHaveURL(/\/admin\/login$/);
  await expect(
    page.getByRole("heading", { name: "راهنمای تصویری پنل", exact: true }),
  ).toHaveCount(0);
});

async function mutate(
  page: Page,
  route: string,
  data: unknown,
  version?: number,
) {
  const csrf = (
    await (await page.request.get("/api/v1/admin/auth/csrf")).json()
  ).csrf_token;
  const response = await page.request.post(`/api/v1/admin/${route}`, {
    headers: {
      Origin: "http://127.0.0.1:3200",
      "X-CSRF-Token": csrf,
      ...(version ? { "If-Match": String(version) } : {}),
    },
    data,
  });
  expect(response.status(), await response.text()).toBe(version ? 200 : 201);
  return response.json();
}

test("contextual guide matches the actual workspace and viewing it never submits changes", async ({
  page,
}) => {
  test.setTimeout(240000);
  await login(page);
  const mutations: string[] = [];
  page.on("request", (request) => {
    if (["POST", "PATCH", "PUT", "DELETE"].includes(request.method()))
      mutations.push(request.url());
  });
  for (const [route, title, image] of [
    ["content", "محتوای سایت", "content"],
    ["builder", "قالب‌ها و طراحی سایت", "library"],
    ["learn", "آموزش و وبلاگ", "learning"],
    ["learn/new?kind=article", "ساخت آموزش تصویری", "learning-editor"],
    ["learn/taxonomy", "دسته‌ها و برچسب‌های آموزش", "taxonomy"],
    ["media", "رسانه‌های سایت", "media"],
    ["faq-categories", "دسته‌های پرسش متداول", "faq"],
    ["crm", "فروش و درخواست دمو", "crm"],
    ["leads", "درخواست‌ها و پیگیری", "leads"],
    ["accounts", "حساب‌های مدیران", "accounts"],
    ["settings/sms", "اتصال پنل پیامکی", "sms"],
    ["settings", "تنظیمات عمومی و SEO", "settings"],
    ["audit", "رویدادهای مدیریت", "audit"],
    ["security", "امنیت و نشست‌های حساب", "security"],
  ]) {
    expect((await page.goto(`/admin/${route}`))?.status()).toBe(200);
    const location = page.url();
    const opener = page.getByRole("button", {
      name: "راهنمای این صفحه",
      exact: true,
    });
    await opener.click();
    const dialog = page.getByRole("dialog", { name: title, exact: true });
    await expect(dialog).toBeVisible();
    await expect(dialog.locator(".guide-location")).toContainText(title!);
    await expect(dialog.locator("img")).toHaveAttribute(
      "src",
      `/guides/admin/${image}.png`,
    );
    expect(
      (await page.request.get(`/guides/admin/${image}.png`)).status(),
    ).toBe(200);
    await expect(dialog.getByRole("status")).toContainText("گام ۱ از");
    await dialog.getByRole("button", { name: "بعدی", exact: true }).click();
    await expect(dialog.getByRole("status")).toContainText("گام ۲ از");
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(opener).toBeFocused();
    expect(page.url()).toBe(location);
  }
  expect(mutations).toEqual([]);
});

test("guide center searches actual tasks and respects editor and sales navigation", async ({
  page,
}) => {
  await login(page, "09120000002");
  await page.goto("/admin/help");
  await expect(
    page.getByRole("button", {
      name: "مشاهده راهنما: محتوای سایت",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "مشاهده راهنما: حساب‌های مدیران",
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", {
      name: "مشاهده راهنما: فروش و درخواست دمو",
      exact: true,
    }),
  ).toHaveCount(0);
  await page
    .getByRole("searchbox", { name: "جست‌وجو در راهنمای پنل", exact: true })
    .fill("تغییر عکس");
  await expect(
    page.getByRole("button", {
      name: "مشاهده راهنما: طراحی با صفحه‌ساز",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("searchbox").fill("عبارت پیدا نشدنی زژژژ");
  await expect(
    page.getByText("راهنمایی با این عبارت پیدا نشد.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "نمایش همهٔ راهنماها", exact: true })
    .click();
  await page.getByRole("button", { name: "خروج", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/login$/);
  await login(page, "09120000003");
  await page.goto("/admin/help");
  await expect(
    page.getByRole("button", {
      name: "مشاهده راهنما: فروش و درخواست دمو",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "مشاهده راهنما: محتوای سایت",
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "راهنمای تصویری پنل", exact: true }),
  ).toHaveAttribute("aria-current", "page");
});

test("fullscreen page builder exposes its own guide without saving or publishing the page", async ({
  page,
}) => {
  await login(page);
  await page.goto("/admin/content");
  await page.getByRole("button", { name: "افزودن محتوا", exact: true }).click();
  await page
    .getByLabel("عنوان محتوای جدید", { exact: true })
    .fill("آزمون راهنمای صفحه‌ساز");
  await page
    .getByLabel("آدرس محتوای جدید", { exact: true })
    .fill(`guide-canvas-${randomUUID().slice(0, 8)}`);
  await page
    .getByRole("button", { name: "ایجاد پیش‌نویس", exact: true })
    .click();
  await expect(page).toHaveURL(/\/admin\/content\/[^/]+\/builder$/);
  const id = page.url().split("/").at(-2)!;
  const before = await (
    await page.request.get(`/api/v1/admin/content/${id}`)
  ).json();
  const help = page.getByRole("button", {
    name: "راهنمای این صفحه",
    exact: true,
  });
  await expect(help).toHaveCount(1);
  await help.click();
  const dialog = page.getByRole("dialog", {
    name: "طراحی با صفحه‌ساز",
    exact: true,
  });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "بعدی", exact: true }).click();
  await expect(dialog.locator("img")).toHaveAttribute(
    "src",
    "/guides/admin/canvas-image.png",
  );
  await expect(dialog.getByRole("status")).toContainText("ویرایش عنصر");
  await page.keyboard.press("Escape");
  await expect(help).toBeFocused();
  const after = await (
    await page.request.get(`/api/v1/admin/content/${id}`)
  ).json();
  expect(after.revision_id).toBe(before.revision_id);
  expect(after.published_revision_id).toBeNull();
});

for (const width of [320, 768, 1440]) {
  test(`guide dialog and nested image viewer work at ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 900 });
    await login(page);
    await page.goto("/admin/content");
    await page
      .getByRole("button", { name: "راهنمای این صفحه", exact: true })
      .click();
    const dialog = page.getByRole("dialog", {
      name: "محتوای سایت",
      exact: true,
    });
    await expect(dialog).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    expect(
      await dialog.evaluate(
        (element) => element.scrollWidth <= element.clientWidth + 1,
      ),
    ).toBe(true);
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    const directory = path.resolve(
      `../../docs/qa/illustrated-help/${info.project.name}`,
    );
    await mkdir(directory, { recursive: true });
    await page.screenshot({
      path: path.join(directory, `context-guide-${width}.png`),
      fullPage: false,
    });
    const image = dialog.getByRole("button", {
      name: "بزرگنمایی تصویر: نمای محتوای سایت",
      exact: true,
    });
    await image.click();
    const zoom = page.getByRole("dialog", {
      name: "نمای محتوای سایت",
      exact: true,
    });
    await expect(zoom).toBeVisible();
    await zoom
      .getByRole("button", { name: "اندازهٔ اصلی", exact: true })
      .click();
    await expect(
      zoom.getByRole("button", { name: "جا شدن در صفحه", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    await page.keyboard.press("Escape");
    await expect(zoom).toHaveCount(0);
    await expect(dialog).toBeVisible();
    await expect(image).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "راهنمای این صفحه", exact: true }),
    ).toBeFocused();
  });
}

test("published product guides filter by role, expose reading position and enlarge real stored media", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await login(page);
  const csrf = (
    await (await page.request.get("/api/v1/admin/auth/csrf")).json()
  ).csrf_token;
  const upload = await page.request.post("/api/v1/admin/media", {
    headers: { Origin: "http://127.0.0.1:3200", "X-CSRF-Token": csrf },
    multipart: {
      alt_text: "تصویر آموزشی آزمون",
      file: {
        name: "guide.png",
        mimeType: "image/png",
        buffer: await readFile(path.resolve("tests/fixtures/cms.png")),
      },
    },
  });
  expect(upload.status()).toBe(201);
  const media = (await upload.json()).id as string;
  const slug = `guide-${info.project.name}-${randomUUID().slice(0, 8)}`;
  const paragraph =
    "این متن فقط در پایگاه دادهٔ مستقل آزمون قرار دارد و برای بررسی خواندن مرحله‌های یک راهنما استفاده می‌شود. ".repeat(
      12,
    );
  const article = await mutate(page, "learn/contents", {
    slug,
    title: `راهنمای تصویری ${slug}`,
    payload: {
      kind: "article",
      headline: `راهنمای تصویری ${slug}`,
      summary: "راهنمای آزمایشی با تصویر و عنوان‌های مرحله‌ای",
      audiences: ["teacher"],
      level: "beginner",
      topic: "getting-started",
      body_html: `<h2>ورود به فضای کاری</h2><p>${paragraph}</p><img src="/api/v1/media/${media}/file" alt="تصویر آموزشی آزمون"><h2>پیدا کردن بخش موردنظر</h2><p>${paragraph}</p><h2>ادامهٔ مسیر</h2><p>${paragraph}</p>`,
      category_ids: [],
      tag_ids: [],
    },
  });
  await mutate(
    page,
    `learn/contents/${article.id}/publish`,
    { revision_id: article.revision_id },
    article.row_version,
  );
  const draft = await mutate(page, "learn/contents", {
    slug: `${slug}-private`,
    title: `پیش‌نویس ${slug}`,
    payload: {
      kind: "article",
      headline: `پیش‌نویس ${slug}`,
      summary: "این پیش‌نویس نباید عمومی شود.",
      body_html: "<p>محتوای خصوصی آزمون</p>",
      audiences: ["teacher"],
      level: "beginner",
      topic: "getting-started",
      category_ids: [],
      tag_ids: [],
    },
  });
  expect(draft.publication_state).toBe("draft");
  await page.goto("/learn");
  await page.getByRole("link", { name: /معلم هستم/ }).click();
  await expect(page).toHaveURL(/audience=teacher/);
  expect(new URL(page.url()).searchParams.get("audience")).toBe("teacher");
  expect(new URL(page.url()).searchParams.get("topic")).toBe("getting-started");
  await expect(page.locator(".learning-current-path")).toContainText("معلم");
  await expect(
    page.getByRole("link", { name: `راهنمای تصویری ${slug}`, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: `پیش‌نویس ${slug}`, exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("link", { name: `راهنمای تصویری ${slug}`, exact: true })
    .click();
  await expect(
    page.getByRole("navigation", { name: "فهرست مطالب", exact: true }),
  ).toContainText("پیدا کردن بخش موردنظر");
  await expect(page.locator(".guide-reading-position")).toContainText(
    "بخش ۱ از ۳",
  );
  await page
    .getByRole("button", { name: "بخش بعدی راهنما", exact: true })
    .click();
  await expect(page.locator(".guide-reading-position")).toContainText(
    "بخش ۲ از ۳",
  );
  await expect(page).toHaveURL(/#.+/);
  // Ordinary scrolling also updates the location, without using the guide buttons.
  await page
    .getByRole("heading", { name: "ادامهٔ مسیر", exact: true })
    .evaluate((heading) =>
      heading.scrollIntoView({ behavior: "instant", block: "start" }),
    );
  await expect(page.locator(".guide-reading-position")).toContainText(
    "بخش ۳ از ۳",
  );
  await page
    .getByRole("button", { name: "بخش قبلی راهنما", exact: true })
    .click();
  await expect(page.locator(".guide-reading-position")).toContainText(
    "بخش ۲ از ۳",
  );
  await page
    .getByRole("button", { name: "بخش قبلی راهنما", exact: true })
    .click();
  await expect(page.locator(".guide-reading-position")).toContainText(
    "بخش ۱ از ۳",
  );
  await page.getByText("بخش‌های این راهنما", { exact: true }).click();
  await page
    .getByRole("navigation", { name: "فهرست مطالب", exact: true })
    .getByRole("link", { name: "۳ · ادامهٔ مسیر", exact: true })
    .click();
  await expect(page.locator(".guide-reading-position")).toContainText(
    "بخش ۳ از ۳",
  );
  await expect(
    page.locator(".guide-reading-tools details"),
  ).not.toHaveAttribute("open");
  await expect(
    page.getByRole("heading", { name: "ادامهٔ مسیر", exact: true }),
  ).toBeInViewport();
  await page
    .getByRole("button", { name: "بخش قبلی راهنما", exact: true })
    .click();
  await expect(page.locator(".guide-reading-position")).toContainText(
    "بخش ۲ از ۳",
  );
  await page
    .getByRole("button", { name: "بخش قبلی راهنما", exact: true })
    .click();
  await expect(page.locator(".guide-reading-position")).toContainText(
    "بخش ۱ از ۳",
  );
  const openImage = page.getByRole("button", {
    name: "باز کردن تصویر ۱: تصویر آموزشی آزمون",
    exact: true,
  });
  await openImage.click();
  const zoom = page.getByRole("dialog", {
    name: "تصویر آموزشی آزمون",
    exact: true,
  });
  await expect(zoom.locator("img")).toHaveAttribute(
    "src",
    `/api/v1/media/${media}/file`,
  );
  await page.keyboard.press("Escape");
  await expect(openImage).toBeFocused();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  const directory = path.resolve(
    `../../docs/qa/illustrated-help/${info.project.name}`,
  );
  await mkdir(directory, { recursive: true });
  await page.screenshot({
    path: path.join(directory, "product-guide-reader-390.png"),
    fullPage: false,
  });
});
