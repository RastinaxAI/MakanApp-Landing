import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import type { LearningAdmin } from "../../src/features/learning/types";

test.beforeEach(() => test.setTimeout(120000));
test.afterEach(async ({ page }) => {
  // Only the dedicated E2E database is used; remove publication of this spec's fixtures.
  for (const resource of ["learn/series", "learn/contents", "blog/articles"]) {
    const response = await page.request.get(
      `/api/v1/admin/${resource}?page_size=100`,
    );
    if (!response.ok()) continue;
    for (const item of (await response.json()).items as LearningAdmin[]) {
      if (item.published_revision_id || item.scheduled_revision_id)
        expect(
          (
            await mutate(
              page,
              `${resource}/${item.id}/unpublish`,
              undefined,
              item.row_version,
            )
          ).status(),
        ).toBe(200);
    }
  }
});
async function login(page: Page, role = "editor") {
  await page.goto("/admin/login");
  await page
    .getByLabel("ایمیل مدیر", { exact: true })
    .fill(`${role}@example.com`);
  await page
    .getByLabel("رمز عبور", { exact: true })
    .fill(process.env.E2E_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "ورود به پنل", exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
}
async function mutate(
  page: Page,
  endpoint: string,
  data?: unknown,
  version?: number,
  method = "POST",
) {
  const csrf = await page.request.get("/api/v1/admin/auth/csrf");
  expect(csrf.status()).toBe(200);
  return page.request.fetch(`/api/v1/admin/${endpoint}`, {
    method,
    headers: {
      Origin: process.env.E2E_BASE_URL ?? "http://127.0.0.1:3100",
      "X-CSRF-Token": (await csrf.json()).csrf_token,
      ...(version ? { "If-Match": String(version) } : {}),
    },
    data,
  });
}
async function image(page: Page) {
  const token = (
    await (await page.request.get("/api/v1/admin/auth/csrf")).json()
  ).csrf_token;
  const response = await page.request.post("/api/v1/admin/media", {
    headers: {
      Origin: process.env.E2E_BASE_URL ?? "http://127.0.0.1:3100",
      "X-CSRF-Token": token,
    },
    multipart: {
      alt_text: "تصویر واقعی آزمون آموزش",
      file: {
        name: "learning.png",
        mimeType: "image/png",
        buffer: await import("node:fs/promises").then((fs) =>
          fs.readFile(path.resolve("tests/fixtures/cms.png")),
        ),
      },
    },
  });
  expect(response.status()).toBe(201);
  return (await response.json()).id as string;
}
async function fixture(
  page: Page,
  slug: string,
  kind = "article",
  extra: Record<string, unknown> = {},
  publish = true,
) {
  const resource =
    kind === "series"
      ? "learn/series"
      : kind === "blog"
        ? "blog/articles"
        : "learn/contents";
  const r = await mutate(page, resource, {
    slug,
    title: slug,
    payload: {
      kind,
      headline: slug,
      summary: "محتوای آزمون در دیتابیس جداگانه",
      body_html: "<h2>اولین قدم</h2><p>متن بازبینی‌شده آزمون</p>",
      audiences: ["teacher"],
      ...extra,
    },
  });
  expect(r.status()).toBe(201);
  let result = (await r.json()) as LearningAdmin;
  if (publish) {
    const p = await mutate(
      page,
      `${resource}/${result.id}/publish`,
      { revision_id: result.revision_id },
      result.row_version,
    );
    expect(p.status()).toBe(200);
    result = await p.json();
  }
  return result;
}
async function save(page: Page) {
  await page.getByRole("button", { name: "ذخیره نسخه", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("نسخه جدید ذخیره شد");
}
async function publish(page: Page) {
  await page
    .getByRole("button", { name: "انتشار نسخه ذخیره‌شده", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "وضعیت انتشار به‌روز شد",
  );
}

test("learning article UI creates rich text, taxonomy, inline images, preview and a real public article", async ({
  page,
}, info) => {
  await login(page);
  const media = await image(page);
  const slug = `ui-article-${info.project.name}`;
  const categorySlug = `ui-category-${info.project.name}`;
  await page.goto("/admin/learn/taxonomy");
  await page
    .getByLabel("عنوان دسته یا برچسب", { exact: true })
    .fill(`شروع تأییدشده ${info.project.name}`);
  await page
    .getByLabel("آدرس دسته یا برچسب", { exact: true })
    .fill(categorySlug);
  await page
    .getByRole("button", { name: "ذخیره دسته یا برچسب", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("ذخیره شد");
  await page.goto("/admin/learn/new?kind=article");
  await page.getByLabel("عنوان مدیریتی", { exact: true }).fill("راهنمای آزمون");
  await page.getByLabel("آدرس (Slug)", { exact: true }).fill(slug);
  await page
    .getByLabel("عنوان عمومی", { exact: true })
    .fill("راهنمای تأییدشده آزمون");
  await page
    .getByLabel("چکیده", { exact: true })
    .fill("چکیده واقعی برای آزمون ذخیره‌سازی");
  await page.getByLabel("معلم", { exact: true }).check();
  await page
    .getByLabel(`شروع تأییدشده ${info.project.name}`, { exact: true })
    .check();
  const rich = page.getByRole("textbox", {
    name: "متن اصلی آموزش",
    exact: true,
  });
  await rich.fill("گام نخست");
  await page.getByRole("button", { name: "عنوان ۲", exact: true }).click();
  await rich.press("End");
  await rich.press("Enter");
  await rich.pressSequentially("متن راهنما");
  await page
    .getByLabel("تصویر داخل متن اصلی آموزش", { exact: true })
    .selectOption(media);
  await page.getByRole("button", { name: "درج تصویر", exact: true }).click();
  await save(page);
  await expect(page).toHaveURL(/\/admin\/learn\/[0-9a-f-]+\?kind=article/);
  const id = new URL(page.url()).pathname.split("/").pop()!;
  const stored = await (
    await page.request.get(`/api/v1/admin/learn/contents/${id}`)
  ).json();
  expect(stored.payload.body_html).toContain("متن راهنما");
  expect(stored.payload.category_ids).toHaveLength(1);
  expect(
    (await page.request.get(`/api/v1/learn/contents/${slug}`)).status(),
  ).toBe(404);
  await page.goto(`/admin/learn/preview/${id}?kind=article`);
  await expect(
    page.getByRole("heading", { level: 1, name: "راهنمای تأییدشده آزمون" }),
  ).toBeVisible();
  await expect(page.locator("meta[name=robots]")).toHaveAttribute(
    "content",
    /noindex/,
  );
  await expect(
    page.locator(`.cms-rich-text img[src='/api/v1/admin/media/${media}/file']`),
  ).toHaveAttribute("width", /\d+/);
  await page.goto(`/admin/learn/${id}?kind=article`);
  await publish(page);
  await page.goto(`/learn/articles/${slug}`);
  expect((await page.request.get(`/learn/videos/${slug}`)).status()).toBe(404);
  await expect(
    page.getByRole("heading", { level: 1, name: "راهنمای تأییدشده آزمون" }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "فهرست مطالب" }),
  ).toContainText("گام نخست");
  await expect(
    page.locator(`.cms-rich-text img[src='/api/v1/media/${media}/file']`),
  ).toHaveAttribute("loading", "lazy");
  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  await test.info().attach("learning-article-axe", {
    body: JSON.stringify(axe),
    contentType: "application/json",
  });
  expect(axe.violations).toEqual([]);
  await page.goto(
    `/learn?category=${categorySlug}&audience=teacher&type=article&q=ذخیره`,
  );
  await expect(
    page.getByRole("link", { name: "راهنمای تأییدشده آزمون", exact: true }),
  ).toBeVisible();
  await page.goto(`/learn/categories/${categorySlug}`);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: `شروع تأییدشده ${info.project.name}`,
    }),
  ).toBeVisible();
});

test("Aparat video UI stores manual metadata and loads only on click with responsive fallback", async ({
  page,
}, info) => {
  await login(page);
  const media = await image(page);
  const slug = `ui-video-${info.project.name}`;
  await page.goto("/admin/learn/new?kind=video");
  await page.getByLabel("عنوان مدیریتی", { exact: true }).fill("ویدیوی آزمون");
  await page.getByLabel("آدرس (Slug)", { exact: true }).fill(slug);
  await page
    .getByLabel("عنوان عمومی", { exact: true })
    .fill("آموزش ویدیویی آزمون");
  await page
    .getByLabel("چکیده", { exact: true })
    .fill("اطلاعات دستی برای بررسی پلیر");
  await page.getByLabel("معلم", { exact: true }).check();
  await page
    .getByLabel("شناسه یا لینک آپارات", { exact: true })
    .fill("https://www.aparat.com/v/abc12");
  await page.getByLabel("مدت ویدیو (ثانیه)", { exact: true }).fill("95");
  await page
    .getByLabel("تصویر شاخص / پوستر", { exact: true })
    .selectOption(media);
  await save(page);
  await publish(page);
  const requests: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("aparat.com")) requests.push(r.url());
  });
  await page.route("https://www.aparat.com/**", (r) =>
    r.abort("internetdisconnected"),
  );
  await page.goto(`/learn/videos/${slug}`);
  expect((await page.request.get(`/learn/articles/${slug}`)).status()).toBe(
    404,
  );
  await expect(
    page.getByRole("heading", { level: 1, name: "آموزش ویدیویی آزمون" }),
  ).toBeVisible();
  await expect(page.locator("iframe")).toHaveCount(0);
  expect(requests).toHaveLength(0);
  await page
    .getByRole("button", { name: "بارگذاری ویدیو", exact: true })
    .click();
  await expect(page.locator("iframe")).toHaveAttribute(
    "src",
    "https://www.aparat.com/video/video/embed/videohash/abc12/vt/frame",
  );
  await expect.poll(() => requests.length).toBe(1);
  expect(requests[0]).not.toContain("autoplay");
  for (const width of [360, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const box = await page.getByTestId("aparat-player").boundingBox();
    expect(box).not.toBeNull();
    expect(Math.abs(box!.width / box!.height - 16 / 9)).toBeLessThan(0.04);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
  }
  await expect(
    page.getByRole("status").filter({ hasText: "وضعیت پخش داخل پلیر" }),
  ).toBeVisible({ timeout: 15000 });
  await page.getByRole("button", { name: "تلاش دوباره", exact: true }).click();
  await expect.poll(() => requests.length).toBe(2);
  await expect(
    page.getByRole("link", { name: /مشاهده در آپارات/ }),
  ).toHaveAttribute("href", "https://www.aparat.com/v/abc12");
});

test("mixed series UI orders articles and videos and protects unpublished members", async ({
  page,
}, info) => {
  await login(page);
  const media = await image(page);
  const a = await fixture(page, `series-a-${info.project.name}`);
  const hidden = await fixture(
    page,
    `series-private-${info.project.name}`,
    "article",
    {},
    false,
  );
  const b = await fixture(page, `series-b-${info.project.name}`, "video", {
    aparat_id: "abc12",
    duration_seconds: 90,
    cover_media_id: media,
  });
  const slug = `ui-series-${info.project.name}`;
  await page.goto("/admin/learn/new?kind=series");
  await page.getByLabel("عنوان مدیریتی", { exact: true }).fill("مجموعه آزمون");
  await page.getByLabel("آدرس (Slug)", { exact: true }).fill(slug);
  await page
    .getByLabel("عنوان عمومی", { exact: true })
    .fill("شروع گام‌به‌گام آزمون");
  await page
    .getByLabel("چکیده", { exact: true })
    .fill("ترکیب مقاله و ویدیو برای آزمون");
  await page.getByLabel("معلم", { exact: true }).check();
  const parts = page.getByRole("group", {
    name: "قسمت‌های مجموعه",
    exact: true,
  });
  for (const item of [a, hidden, b])
    await parts.getByLabel(item.title, { exact: true }).check();
  await save(page);
  await publish(page);
  const id = new URL(page.url()).pathname.split("/").pop()!;
  await page.goto(`/learn/series/${slug}`);
  await expect(
    page.getByRole("link", { name: new RegExp(a.title) }),
  ).toBeVisible();
  await expect(page.getByText(hidden.title, { exact: false })).toHaveCount(0);
  await page.goto(`/learn/articles/${a.slug}?series=${slug}`);
  await expect(
    page.getByRole("navigation", { name: "آموزش قبلی و بعدی" }),
  ).toContainText(b.title);
  await page.goto(`/admin/learn/${id}?kind=series`);
  await page
    .getByRole("button", { name: "بالاتر", exact: true })
    .nth(2)
    .click();
  await page
    .getByRole("button", { name: "بالاتر", exact: true })
    .nth(1)
    .click();
  await save(page);
  expect(
    (await (await page.request.get(`/api/v1/learn/series/${slug}`)).json())
      .items[0].id,
  ).toBe(a.id);
  await publish(page);
  expect(
    (await (await page.request.get(`/api/v1/learn/series/${slug}`)).json())
      .items[0].id,
  ).toBe(b.id);
  await page
    .getByRole("button", { name: "نمایش تاریخچه", exact: true })
    .click();
  await page
    .getByRole("button", { name: "انتشار نسخه 1", exact: true })
    .click();
  await page
    .getByRole("button", { name: "تأیید انتشار نسخه 1", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "وضعیت انتشار به‌روز شد",
  );
  expect(
    (await (await page.request.get(`/api/v1/learn/series/${slug}`)).json())
      .items[0].id,
  ).toBe(a.id);
});

test("blog publication is independent and draft routes remain private", async ({
  page,
}, info) => {
  await login(page);
  const row = await fixture(
    page,
    `blog-${info.project.name}`,
    "blog",
    {},
    false,
  );
  expect((await page.request.get(`/blog/${row.slug}`)).status()).toBe(404);
  await page.goto(`/admin/learn/${row.id}?kind=blog`);
  await publish(page);
  await page.goto(`/blog/${row.slug}`);
  await expect(
    page.getByRole("heading", { level: 1, name: row.title }),
  ).toBeVisible();
  expect(
    (
      await (
        await page.request.get(`/api/v1/learn/contents?q=${row.slug}`)
      ).json()
    ).pagination.total,
  ).toBe(0);
  await page.goto(`/admin/learn/${row.id}?kind=blog`);
  await page
    .getByRole("button", { name: "بایگانی محتوا", exact: true })
    .click();
  await page
    .getByRole("button", { name: "تأیید تغییر وضعیت", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "وضعیت انتشار به‌روز شد",
  );
  await expect(
    page.getByRole("button", { name: "ذخیره نسخه", exact: true }),
  ).toBeDisabled();
  expect((await page.request.get(`/blog/${row.slug}`)).status()).toBe(404);
});

test("learning home selection displays zero to three real published cards", async ({
  page,
}, info) => {
  await login(page);
  await page.goto("/");
  await expect(page.locator('[data-section="learning"]')).toHaveCount(0);
  for (let n = 1; n <= 4; n++) {
    await fixture(page, `featured-${info.project.name}-${n}`, "article", {
      featured: true,
    });
    await page.goto("/");
    await expect(page.locator('[data-section="learning"] article')).toHaveCount(
      Math.min(n, 3),
    );
    await expect(page.locator('[data-section="learning"] iframe')).toHaveCount(
      0,
    );
  }
  // Restore the shared per-run database so the next browser can also verify zero-state.
  const all = await (
    await page.request.get("/api/v1/admin/learn/contents?page_size=100")
  ).json();
  for (const item of all.items.filter((i: LearningAdmin) =>
    i.slug.startsWith(`featured-${info.project.name}-`),
  ))
    expect(
      (
        await mutate(
          page,
          `learn/contents/${item.id}/unpublish`,
          undefined,
          item.row_version,
        )
      ).status(),
    ).toBe(200);
});

for (const width of [360, 768, 1440])
  test(`learning management and library are accessible at ${width}px`, async ({
    page,
  }, info) => {
    await login(page);
    const categoryTitle = `دسته آزمون دسترس‌پذیری ${info.project.name} ${width}`;
    const category = await mutate(page, "learn/categories", {
      domain: "learn",
      slug: `a11y-${info.project.name}-${width}`,
      title: categoryTitle,
      sort_order: 0,
    });
    expect(category.status()).toBe(201);
    await page.setViewportSize({ width, height: 900 });
    const directory = path.resolve(
      `../../docs/qa/${process.env.MAKAN_QA_PHASE ?? "step10"}`,
      info.project.name,
    );
    await mkdir(directory, { recursive: true });
    for (const [name, url] of [
      ["library", "/learn"],
      ["blog", "/blog"],
      ["learn-admin", "/admin/learn"],
      ["learn-taxonomy", "/admin/learn/taxonomy"],
      ["learn-editor", "/admin/learn/new?kind=article"],
    ] as const) {
      await page.goto(url);
      if (url.includes("new?"))
        await expect(
          page.getByRole("textbox", { name: "متن اصلی آموزش", exact: true }),
        ).toBeVisible();
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      if (url === "/admin/learn/taxonomy")
        await expect(
          page.getByRole("button", {
            name: `حذف ${categoryTitle}`,
            exact: true,
          }),
        ).toBeEnabled();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      ).toBe(true);
      const axe = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      await test.info().attach(`${name}-${width}-axe`, {
        body: JSON.stringify(axe),
        contentType: "application/json",
      });
      expect(axe.violations).toEqual([]);
      await page.screenshot({
        path: path.join(directory, `${name}-${width}.png`),
        fullPage: true,
      });
    }
  });

for (const width of [360, 768, 1440])
  test(`published learning details remain accessible at ${width}px`, async ({
    page,
  }, info) => {
    await login(page);
    await page.setViewportSize({ width, height: 900 });
    const media = await image(page);
    const suffix = `${info.project.name}-${width}`;
    const a = await fixture(page, `detail-article-${suffix}`, "article", {
      cover_media_id: media,
      body_html: `<h2>گام اول</h2><p>راهنمای آموزشی</p><img src="/api/v1/media/${media}/file"><h3>بررسی نتیجه</h3><p>متن معتبر</p>`,
    });
    const b = await fixture(page, `detail-video-${suffix}`, "video", {
      cover_media_id: media,
      aparat_id: "abc12",
      duration_seconds: 95,
      related_ids: [a.id],
      transcript_html: "<h2>متن همراه ویدیو</h2><p>متن واقعی fixture</p>",
    });
    const series = await fixture(page, `detail-series-${suffix}`, "series", {
      cover_media_id: media,
      item_ids: [a.id, b.id],
    });
    const blog = await fixture(page, `detail-blog-${suffix}`, "blog", {
      cover_media_id: media,
    });
    const directory = path.resolve(
      `../../docs/qa/${process.env.MAKAN_QA_PHASE ?? "step10"}`,
      info.project.name,
    );
    await mkdir(directory, { recursive: true });
    for (const [name, url] of [
      ["article-detail", `/learn/articles/${a.slug}?series=${series.slug}`],
      ["video-detail", `/learn/videos/${b.slug}`],
      ["series-detail", `/learn/series/${series.slug}`],
      ["blog-detail", `/blog/${blog.slug}`],
    ] as const) {
      await page.goto(url);
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      ).toBe(true);
      const ids = await page
        .locator("[id]")
        .evaluateAll((nodes) => nodes.map((n) => n.id));
      expect(new Set(ids).size).toBe(ids.length);
      await expect(page.locator("iframe")).toHaveCount(0);
      const axe = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      await test.info().attach(`${name}-${width}-axe`, {
        body: JSON.stringify(axe),
        contentType: "application/json",
      });
      expect(axe.violations).toEqual([]);
      await page.screenshot({
        path: path.join(directory, `${name}-${width}.png`),
        fullPage: true,
      });
    }
  });
