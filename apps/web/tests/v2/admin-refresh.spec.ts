import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { login } from "./helpers";
import { initialPayload } from "../../src/features/learning/types";
import type {
  CmsSettings,
  CmsPage,
  MediaAsset,
} from "../../src/features/cms/types";

const routes = [
  ["learn", "آموزش و وبلاگ"],
  ["learn/taxonomy", "دسته‌ها و برچسب‌های آموزش و وبلاگ"],
  ["media", "رسانه‌های سایت"],
  ["faq-categories", "دسته‌های پرسش متداول"],
  ["accounts", "حساب‌های مدیران"],
  ["settings", "تنظیمات عمومی و SEO"],
  ["settings/sms", "پنل پیامکی"],
  ["audit", "رویدادهای مدیریت"],
  ["security", "امنیت حساب"],
] as const;
const directory = path.resolve("../../docs/qa/admin-refresh");
async function ready(page: Page) {
  await page.waitForFunction(
    () => !document.querySelector("fieldset[disabled]"),
  );
  await page.evaluate(() => document.fonts.ready);
}
async function confirmation(page: Page) {
  await page
    .getByRole("button", { name: "دریافت کد تأیید تغییرات", exact: true })
    .click();
  await page.getByLabel("کد تأیید تغییرات", { exact: true }).fill("111111");
}
async function mutate(page: Page, endpoint: string, data: unknown) {
  const token = (await (
    await page.request.get("/api/v1/admin/auth/csrf")
  ).json()) as { csrf_token: string };
  return page.request.post(`/api/v1/admin/${endpoint}`, {
    headers: {
      Origin: "http://127.0.0.1:3200",
      "X-CSRF-Token": token.csrf_token,
    },
    data,
  });
}

test("all nine workspaces are responsive accessible and show real configured state", async ({
  page,
}, info) => {
  test.setTimeout(300000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await login(page);
  await mkdir(directory, { recursive: true });
  for (const [route, title] of routes) {
    await page.setViewportSize({ width: 1440, height: 1000 });
    expect((await page.goto(`/admin/${route}`))?.status()).toBe(200);
    await expect(
      page.getByRole("heading", { name: title, level: 1, exact: true }),
    ).toBeVisible();
    await ready(page);
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
          .analyze()
      ).violations,
      route,
    ).toEqual([]);
    await page.screenshot({
      path: path.join(
        directory,
        `${route.replaceAll("/", "-")}-desktop-${info.project.name}.png`,
      ),
    });
    for (const width of [1200, 1024, 768, 480, 360]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${route} at ${width}`,
      ).toBe(true);
    }
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
          .analyze()
      ).violations,
      route,
    ).toEqual([]);
    await page.screenshot({
      path: path.join(
        directory,
        `${route.replaceAll("/", "-")}-mobile-${info.project.name}.png`,
      ),
    });
  }
  expect(errors).toEqual([]);
});

test("learning list preserves title and publication filters through server pagination", async ({
  page,
}) => {
  await login(page);
  const name = `آموزش پذیرش ${randomUUID().slice(0, 8)}`;
  for (let offset = 0; offset < 21; offset += 3)
    await Promise.all(
      Array.from({ length: Math.min(3, 21 - offset) }, async (_, i) => {
        const title = `${name} ${offset + i}`;
        const response = await mutate(page, "learn/contents", {
          title,
          slug: `learn-${randomUUID()}`,
          payload: { ...initialPayload("article"), headline: title },
        });
        expect(response.status()).toBe(201);
      }),
    );
  await page.goto("/admin/learn?kind=article");
  await page.getByLabel("جست‌وجوی عنوان", { exact: true }).fill(name);
  await page.getByLabel("وضعیت", { exact: true }).selectOption("draft");
  await page.getByRole("button", { name: "جست‌وجو", exact: true }).click();
  const rows = page
    .getByRole("list", { name: "محتواهای آموزشی", exact: true })
    .getByRole("listitem");
  await expect(rows).toHaveCount(20);
  await page
    .getByRole("navigation", { name: "صفحه‌بندی مدیریت", exact: true })
    .getByRole("link", { name: "صفحه ۲", exact: true })
    .click();
  await expect(rows).toHaveCount(1);
  await expect(page.getByLabel("جست‌وجوی عنوان", { exact: true })).toHaveValue(
    name,
  );
  await expect(page.getByLabel("وضعیت", { exact: true })).toHaveValue("draft");
  await expect(page).toHaveURL(/page=2/);
  await rows.getByRole("link").click();
  await expect(page).toHaveURL(/\/admin\/learn\/[0-9a-f-]{36}/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("ویرایش");
  await page.goto("/admin/learn?kind=video");
  await expect(
    page
      .getByRole("link", { name: "ایجاد ویدیوی آپارات", exact: true })
      .first(),
  ).toHaveAttribute("href", "/admin/learn/new?kind=video");
});

test("taxonomy and FAQ categories create edit and confirm deletion through real APIs", async ({
  page,
}) => {
  await login(page, "09120000002");
  const suffix = randomUUID().slice(0, 8);
  await page.goto("/admin/learn/taxonomy");
  for (const type of ["categories", "tags"]) {
    for (const domain of ["learn", "blog"]) {
      await page.getByLabel("نوع", { exact: true }).selectOption(type);
      await page.getByLabel("بخش", { exact: true }).selectOption(domain);
      const title = `دسته آزمون ${type} ${domain} ${suffix}`;
      await page.getByLabel("عنوان دسته یا برچسب", { exact: true }).fill(title);
      await page
        .getByLabel("آدرس دسته یا برچسب", { exact: true })
        .fill(`taxonomy-${type}-${domain}-${suffix}`);
      await page
        .getByRole("button", { name: "ذخیره دسته یا برچسب", exact: true })
        .click();
      await expect(page.getByRole("status")).toContainText("ذخیره شد");
      await page
        .getByRole("button", { name: `ویرایش ${title}`, exact: true })
        .click();
      await page
        .getByLabel("عنوان دسته یا برچسب", { exact: true })
        .fill(`${title} ویرایش`);
      await page
        .getByRole("button", { name: "ذخیره دسته یا برچسب", exact: true })
        .click();
      await expect(
        page.getByRole("button", {
          name: `ویرایش ${title} ویرایش`,
          exact: true,
        }),
      ).toBeVisible();
      await page.reload();
      await page.getByLabel("نوع", { exact: true }).selectOption(type);
      await page
        .getByRole("button", { name: `حذف ${title} ویرایش`, exact: true })
        .click();
      await page
        .getByRole("button", { name: `تأیید حذف ${title} ویرایش`, exact: true })
        .click();
      await expect(page.getByRole("status")).toContainText("حذف شد");
    }
  }
  await page.goto("/admin/faq-categories");
  const title = `پرسش آزمون ${suffix}`;
  await page.getByLabel("نام دسته", { exact: true }).fill(title);
  await page.getByLabel("آدرس دسته", { exact: true }).fill(`faq-${suffix}`);
  await page.getByRole("button", { name: "ذخیره دسته", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("ذخیره شد");
  await page
    .getByRole("button", { name: `ویرایش ${title}`, exact: true })
    .click();
  await page
    .getByRole("button", { name: "حذف دسته بدون استفاده", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: `ویرایش ${title}`, exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "تأیید حذف دسته", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: `ویرایش ${title}`, exact: true }),
  ).toHaveCount(0);
});

test("media upload metadata private file and unused deletion remain real", async ({
  page,
}, info) => {
  await login(page, "09120000002");
  await page.goto("/admin/media");
  await page.getByRole("button", { name: "افزودن تصویر", exact: true }).click();
  const dialog = page.getByRole("dialog", {
    name: "بارگذاری تصویر",
    exact: true,
  });
  const alt = `تصویر آزمون ${randomUUID().slice(0, 8)}`;
  await dialog
    .getByLabel("فایل تصویر", { exact: true })
    .setInputFiles(path.resolve("public/brand/makan-logo.png"));
  await dialog.getByLabel("متن جایگزین تصویر", { exact: true }).fill(alt);
  await dialog
    .getByRole("button", { name: "بارگذاری تصویر", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("status")).toContainText("ذخیره شد");
  const data = (await (
    await page.request.get("/api/v1/admin/media?page_size=100")
  ).json()) as CmsPage<MediaAsset>;
  const item = data.items.find((row) => row.alt_text === alt)!;
  expect(item.visibility).toBe("private");
  expect(
    (await page.request.get(`/api/v1/admin/media/${item.id}/file`)).status(),
  ).toBe(200);
  const card = page
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name: alt, exact: true }) });
  await card
    .getByRole("button", { name: "ویرایش مشخصات", exact: true })
    .click();
  await card
    .getByLabel("متن جایگزین جدید", { exact: true })
    .fill(`${alt} ویرایش`);
  await card.getByRole("button", { name: "ذخیره مشخصات", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("مشخصات رسانه ذخیره شد");
  await page.reload();
  const changed = page.getByRole("article").filter({
    has: page.getByRole("heading", { name: `${alt} ویرایش`, exact: true }),
  });
  await expect(changed).toBeVisible();
  await page.screenshot({
    path: path.join(directory, `media-populated-${info.project.name}.png`),
  });
  await changed.getByRole("button", { name: "حذف رسانه", exact: true }).click();
  await changed
    .getByRole("button", { name: "تأیید حذف رسانه", exact: true })
    .click();
  await expect(changed).toHaveCount(0);
  expect(
    (await page.request.get(`/api/v1/admin/media/${item.id}/file`)).status(),
  ).toBe(404);
});

test("site settings and SMS configuration persist without exposing service secrets", async ({
  page,
}) => {
  await login(page);
  const original = (await (
    await page.request.get("/api/v1/admin/settings")
  ).json()) as CmsSettings;
  await page.goto("/admin/settings");
  const title = `ماکان آزمون ${randomUUID().slice(0, 8)}`;
  await page.getByLabel("نام برند", { exact: true }).fill(title);
  await page.getByLabel("عنوان پیش‌فرض SEO", { exact: true }).fill(title);
  await page
    .getByRole("button", { name: "ذخیره تنظیمات", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("تنظیمات سایت ذخیره شد");
  await page.reload();
  await expect(page.getByLabel("نام برند", { exact: true })).toHaveValue(title);
  await expect(
    page.getByLabel("عنوان پیش‌فرض SEO", { exact: true }),
  ).toHaveValue(title);
  await page
    .getByLabel("نام برند", { exact: true })
    .fill(original.general.brand_name);
  await page
    .getByLabel("عنوان پیش‌فرض SEO", { exact: true })
    .fill(original.seo.default_title);
  await page
    .getByRole("button", { name: "ذخیره تنظیمات", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("ذخیره شد");
  await page.goto("/admin/settings/sms");
  await page
    .getByLabel("نام کاربری ملی‌پیامک", { exact: true })
    .fill("isolated-browser-fixture");
  await page
    .getByLabel("رمز وب‌سرویس ملی‌پیامک", { exact: true })
    .fill("fixture-not-real-credentials");
  await page
    .getByLabel("شناسه الگوی خدماتی (Body ID)", { exact: true })
    .fill("123");
  await confirmation(page);
  await page
    .getByRole("button", { name: "ذخیره تنظیمات پیامک", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "تنظیمات پنل پیامکی ذخیره شد" }),
  ).toBeVisible();
  await expect(
    page.getByLabel("رمز وب‌سرویس ملی‌پیامک", { exact: true }),
  ).toHaveValue("");
  await page.reload();
  await expect(
    page.getByLabel("شناسه الگوی خدماتی (Body ID)", { exact: true }),
  ).toHaveValue("123");
  const body = await (
    await page.request.get("/api/v1/admin/settings/sms")
  ).text();
  expect(body).not.toContain("fixture-not-real-credentials");
  expect(body).not.toContain("isolated-browser-fixture");
});

test("owner account changes keep reauthentication authorization and audit logging", async ({
  page,
}, info) => {
  await login(page);
  await page.goto("/admin/accounts");
  const phone = `0912222333${info.project.name === "chromium" ? "1" : info.project.name === "firefox" ? "2" : "3"}`;
  await page.getByLabel("شماره همراه مدیر جدید", { exact: true }).fill(phone);
  await confirmation(page);
  await page
    .getByRole("button", { name: "ایجاد حساب مدیر", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "حساب مدیر ایجاد شد" }),
  ).toBeVisible();
  const row = page.getByRole("listitem", { name: phone, exact: true });
  await expect(row).toBeVisible();
  await expect(
    row.getByRole("button", { name: "غیرفعال‌کردن", exact: true }),
  ).toBeDisabled();
  await confirmation(page);
  await row.getByRole("button", { name: "غیرفعال‌کردن", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "تغییر ثبت شد" }),
  ).toBeVisible();
  await expect(row).toContainText("غیرفعال");
  await page.goto("/admin/audit");
  await expect(
    page.getByText("ورود با کد پیامکی", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByText("ایجاد حساب", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByText("تغییر حساب", { exact: true }).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "خروج", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/login$/);
  await login(page, "09120000002");
  for (const route of ["accounts", "settings", "settings/sms", "audit"]) {
    await page.goto(`/admin/${route}`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "دسترسی ندارید",
    );
    expect(
      (
        await page.request.get(
          `/api/v1/admin/${route === "audit" ? "audit-logs" : route}`,
        )
      ).status(),
    ).toBe(403);
  }
});

test("OTP security keeps real session revocation without authenticator enrollment", async ({
  page,
  browser,
}, info) => {
  await login(page);
  await page.goto("/admin/accounts");
  const phone = `0912333444${info.project.name === "chromium" ? "1" : info.project.name === "firefox" ? "2" : "3"}`;
  await page.getByLabel("شماره همراه مدیر جدید", { exact: true }).fill(phone);
  await confirmation(page);
  await page
    .getByRole("button", { name: "ایجاد حساب مدیر", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "حساب مدیر ایجاد شد" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "خروج", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/login$/);
  await login(page, phone);
  const context = await browser.newContext({
    baseURL: "http://127.0.0.1:3200",
  });
  try {
    const other = await context.newPage();
    await login(other, phone);
    await page.goto("/admin/security");
    await page.getByRole("button", { name: "بستن نشست", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "بستن نشست", exact: true }),
    ).toHaveCount(0);
    expect((await other.request.get("/api/v1/admin/auth/me")).status()).toBe(
      401,
    );
  } finally {
    await context.close();
  }
  await expect(
    page.getByText(/MFA|Authenticator|دومرحله‌ای|کدهای بازیابی/),
  ).toHaveCount(0);
  await expect(
    page.getByText("شماره همراه و کد پیامکی", { exact: true }),
  ).toBeVisible();
  expect((await mutate(page, "auth/mfa/enroll", {})).status()).toBe(404);
});
