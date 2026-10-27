// Invoked by the existing disposable DB/API/browser lifecycle, never production.
const { chromium } = require("playwright");
const { expect: baseExpect } = require("@playwright/test");
const expect = baseExpect.configure({ timeout: 20000 });
const fs = require("node:fs/promises");
const path = require("node:path");

async function main() {
  if (
    process.env.E2E_BASE_URL !== "http://127.0.0.1:3200" ||
    process.env.E2E_OTP_ONLY !== "1"
  ) {
    throw new Error(
      "Only the isolated OTP fixture started by run-v2-quality.py is allowed.",
    );
  }
  const directory = path.resolve("apps/web/public/guides/admin");
  const qa = path.resolve("docs/qa", process.env.MAKAN_QA_PHASE);
  await fs.mkdir(directory, { recursive: true });
  await fs.mkdir(qa, { recursive: true });
  const browser = await chromium.launch(
    process.platform === "win32" ? { channel: "msedge" } : {},
  );
  const captures = [];
  try {
    const context = await browser.newContext({
      baseURL: process.env.E2E_BASE_URL,
      viewport: { width: 1440, height: 960 },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    await page.goto("/admin/login");
    await page.getByLabel("شماره همراه", { exact: true }).fill("09120000001");
    await page
      .getByRole("button", { name: "دریافت کد ورود", exact: true })
      .click();
    await page.getByLabel("کد ورود", { exact: true }).fill("111111");
    await page
      .getByRole("button", { name: "ورود به پنل", exact: true })
      .click();
    await expect(page).toHaveURL(/\/admin$/);
    async function capture(name, route, focus) {
      expect((await page.goto(route))?.status()).toBe(200);
      await expect(
        page.getByRole("heading", { level: 1 }).first(),
      ).toBeVisible();
      await page.waitForFunction(
        () => !document.querySelector("fieldset[disabled]"),
      );
      await page.evaluate(() => document.fonts.ready);
      if (focus) await focus(page);
      await page.evaluate(() => {
        for (const identity of document.querySelectorAll(
          ".admin-workspace > aside [dir=ltr]",
        ))
          identity.textContent = "حساب آموزشی";
      });
      await page.screenshot({
        path: path.join(directory, `${name}.png`),
        fullPage: false,
        animations: "disabled",
      });
      captures.push({
        name,
        width: 1440,
        height: 960,
        route: route.replace(
          /[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}/g,
          "{fixture-id}",
        ),
        source:
          "isolated real application; training account; identity redacted",
      });
    }
    const routes = {
      dashboard: "/admin",
      content: "/admin/content",
      library: "/admin/builder",
      learning: "/admin/learn",
      "learning-editor": "/admin/learn/new?kind=article",
      taxonomy: "/admin/learn/taxonomy",
      media: "/admin/media",
      faq: "/admin/faq-categories",
      crm: "/admin/crm",
      leads: "/admin/leads",
      analytics: "/admin/analytics",
      accounts: "/admin/accounts",
      settings: "/admin/settings",
      sms: "/admin/settings/sms",
      audit: "/admin/audit",
      security: "/admin/security",
    };
    for (const [name, route] of Object.entries(routes))
      await capture(name, route);

    // Create a real temporary page via the UI to illustrate the canvas and image inspector.
    await page.goto("/admin/media");
    await page
      .getByRole("button", { name: "افزودن تصویر", exact: true })
      .click();
    await page
      .getByLabel("متن جایگزین تصویر", { exact: true })
      .fill("لوگوی ماکان برای نمونهٔ آموزشی صفحه‌ساز");
    await page
      .locator('input[type="file"]')
      .setInputFiles(path.resolve("apps/web/public/brand/makan-logo.png"));
    await page.getByRole("button", { name: /بارگذاری/ }).click();
    await expect(page.getByRole("status")).toContainText(/بارگذاری|ذخیره|ثبت/);
    const token = (
      await (await page.request.get("/api/v1/admin/auth/csrf")).json()
    ).csrf_token;
    const lesson = await page.request.post("/api/v1/admin/learn/contents", {
      headers: { Origin: process.env.E2E_BASE_URL, "X-CSRF-Token": token },
      data: {
        slug: "guide-capture-lesson",
        title: "نمونهٔ آموزشی درج تصویر",
        payload: {
          kind: "article",
          headline: "نمونهٔ آموزشی درج تصویر",
          summary:
            "این پیش‌نویس فقط برای تهیهٔ تصویر رابط پنل در محیط آزمون است.",
          body_html:
            "<h2>مرحلهٔ اول</h2><p>متن نمونهٔ محیط آموزشی؛ این محتوا در سایت اصلی ثبت نمی‌شود.</p>",
          audiences: ["teacher"],
          level: "beginner",
          topic: "getting-started",
          category_ids: [],
          tag_ids: [],
        },
      },
    });
    expect(lesson.status()).toBe(201);
    const lessonId = (await lesson.json()).id;
    await capture(
      "learning-inline",
      `/admin/learn/${lessonId}?kind=article`,
      async (current) =>
        current
          .getByLabel("تصویر داخل متن اصلی آموزش", { exact: true })
          .scrollIntoViewIfNeeded(),
    );
    await capture(
      "learning-publish",
      `/admin/learn/${lessonId}?kind=article`,
      async (current) =>
        current
          .getByRole("heading", { name: "انتشار و سابقه", exact: true })
          .scrollIntoViewIfNeeded(),
    );
    await page.goto("/admin/content");
    await page
      .getByRole("button", { name: "افزودن محتوا", exact: true })
      .click();
    await page
      .getByLabel("عنوان محتوای جدید", { exact: true })
      .fill("نمونهٔ آموزشی طراحی برگه");
    await page
      .getByLabel("آدرس محتوای جدید", { exact: true })
      .fill("guide-capture-page");
    await page
      .getByRole("button", { name: "ایجاد پیش‌نویس", exact: true })
      .click();
    await expect(page).toHaveURL(/\/admin\/content\/[^/]+\/builder$/);
    const id = page.url().split("/").at(-2);
    const canvasRoute = `/admin/content/${id}/builder`;
    await capture("canvas", canvasRoute);
    await page.getByRole("button", { name: "عناصر", exact: true }).click();
    // Puck's native drag-and-drop, with the same pointer path as acceptance tests.
    const source = page
      .getByRole("complementary", { name: "پنل کناری صفحه‌ساز", exact: true })
      .getByRole("button", { name: "تصویر", exact: true });
    const canvas = page.frameLocator("iframe").first();
    const target = canvas.getByTestId("dropzone:root:default-zone");
    await source.scrollIntoViewIfNeeded();
    const from = await source.boundingBox();
    const to = await target.boundingBox();
    if (!from || !to) throw new Error("Canvas drag targets not visible");
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      from.x + from.width / 2 + 12,
      from.y + from.height / 2,
      { steps: 4 },
    );
    await page.mouse.move(
      to.x + to.width / 2,
      to.y + Math.min(60, to.height / 2),
      { steps: 30 },
    );
    await page.mouse.up();
    await expect(canvas.locator('[data-widget="Image"]')).toHaveCount(1);
    await page
      .getByLabel("تصویر", { exact: true })
      .filter({ visible: true })
      .selectOption({
        label: "لوگوی ماکان برای نمونهٔ آموزشی صفحه‌ساز · makan-logo.png",
      });
    await page
      .getByRole("button", { name: "ذخیره صفحه‌ساز", exact: true })
      .click();
    await expect(page.getByText("ذخیره‌شده", { exact: true })).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({
      path: path.join(directory, "canvas-image.png"),
      fullPage: false,
      animations: "disabled",
    });
    captures.push({
      name: "canvas-image",
      width: 1440,
      height: 960,
      route: "/admin/content/{fixture-id}/builder",
      source: "real image inspector and temporary media in isolated database",
    });
    await capture("content-editor", `/admin/content/${id}?mode=metadata`);
    await capture("revisions", `/admin/content/${id}/revisions`);
    const detail = await (
      await page.request.get(`/api/v1/admin/content/${id}`)
    ).json();
    await capture(
      "preview",
      `/admin/preview/${id}?revision=${detail.revision_id}`,
    );
    await fs.writeFile(
      path.join(qa, "guide-assets.json"),
      JSON.stringify(
        { captures, production_mutations: 0, external_sms_sent: 0 },
        null,
        2,
      ),
    );
    console.log(
      `Captured ${captures.length} real admin screenshots from the isolated training environment.`,
    );
    await context.close();
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
