import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const password = process.env.E2E_ADMIN_PASSWORD;
if (!password)
  throw new Error("Use the isolated real PostgreSQL E2E launcher.");
test.beforeEach(() => test.setTimeout(120000));
async function login(page: Page, role = "sales") {
  await page.goto("/admin/login");
  await page
    .getByLabel("ایمیل مدیر", { exact: true })
    .fill(`${role}@example.com`);
  await page.getByLabel("رمز عبور", { exact: true }).fill(password!);
  await page.getByRole("button", { name: "ورود به پنل", exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
}
async function logout(page: Page) {
  await Promise.all([
    page.waitForURL(/\/admin\/login$/, { waitUntil: "load" }),
    page.getByRole("button", { name: "خروج", exact: true }).click(),
  ]);
  await expect(
    page.getByRole("heading", { name: "ورود مدیر", exact: true }),
  ).toBeVisible();
}
async function demo(page: Page, name: string, source = "home") {
  await page.goto(`/demo?source=${source}`);
  await expect(
    page.getByRole("button", { name: "ثبت درخواست دمو", exact: true }),
  ).toBeEnabled();
  await page.getByLabel("نام و نام خانوادگی", { exact: true }).fill(name);
  await page.getByLabel("شماره تماس", { exact: true }).fill("۰۹۱۲۳۴۵۶۷۸۹");
  await page
    .getByLabel("نام مدرسه یا مؤسسه", { exact: true })
    .fill("مدرسه آزمون مستقل");
  await page.getByLabel("شهر — اختیاری", { exact: true }).fill("تهران");
  await page
    .getByLabel("توضیحات — اختیاری", { exact: true })
    .fill("بررسی نیاز مدرسه");
  await page.getByRole("checkbox").check();
}
async function saved(page: Page) {
  await page
    .getByRole("button", { name: /^(ثبت درخواست دمو|ارسال پیام)$/ })
    .click();
  await expect(
    page.getByText("درخواست شما ثبت شد.", { exact: true }),
  ).toBeVisible();
  const reference = (await page.getByTestId("reference-id").innerText()).trim();
  expect(reference).toMatch(/^MK-[A-Za-z0-9_-]{32}$/);
  return reference;
}
test("real demo saves consent source, sales manages assignment notes outcome and owner sees actual contract", async ({
  page,
}) => {
  const name = "پذیرش دمو " + randomUUID();
  await demo(page, name, "solutions");
  const reference = await saved(page);
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
  await login(page);
  await page.goto(`/admin/leads?q=${encodeURIComponent(name)}`);
  await expect(
    page.getByRole("heading", { name: "درخواست‌ها و پیگیری", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name, exact: true }).click();
  await expect(page.getByText(reference, { exact: true })).toBeVisible();
  await expect(
    page.getByText("مدرسه آزمون مستقل", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("وضعیت", { exact: true }).selectOption("qualified");
  await page
    .getByLabel("مسئول پیگیری", { exact: true })
    .selectOption({ label: "sales@example.com" });
  await page.getByRole("button", { name: "ذخیره پیگیری", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("پیگیری ذخیره شد.");
  await page
    .getByLabel("یادداشت داخلی", { exact: true })
    .fill("پیگیری خصوصی؛ زمان جلسه هنوز تعیین نشده");
  await page.getByRole("button", { name: "ثبت یادداشت", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("یادداشت ثبت شد.");
  await expect(
    page.getByText("پیگیری خصوصی؛ زمان جلسه هنوز تعیین نشده", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("وضعیت", { exact: true }).selectOption("closed");
  await page.getByLabel("نتیجه نهایی", { exact: true }).selectOption("won");
  await page.getByRole("button", { name: "ذخیره پیگیری", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("پیگیری ذخیره شد.");
  const metrics = await page.request.get(
    `/api/v1/admin/leads/metrics?q=${encodeURIComponent(name)}`,
  );
  expect(metrics.status()).toBe(200);
  expect((await metrics.json()).contracts).toBe(1);
  await page.reload();
  await expect(page.getByLabel("نتیجه نهایی", { exact: true })).toHaveValue(
    "won",
  );
  await expect(
    page.getByLabel("مسئول پیگیری", { exact: true }),
  ).not.toHaveValue("");
  const detailUrl = page.url();
  await logout(page);
  await login(page, "owner");
  await page.goto(detailUrl);
  await expect(page.getByText(reference, { exact: true })).toBeVisible();
});

test("contact validates fields consent, persists email and editor cannot read request or notes", async ({
  page,
}) => {
  const name = "پذیرش تماس " + randomUUID();
  await page.goto("/contact?source=blog");
  const submit = page.getByRole("button", { name: "ارسال پیام", exact: true });
  await expect(submit).toBeEnabled();
  await submit.click();
  await expect(
    page.getByText("برای ثبت درخواست، رضایت لازم است.", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("نام و نام خانوادگی", { exact: true }).fill(name);
  await page.getByLabel("روش تماس", { exact: true }).selectOption("email");
  await page
    .getByLabel("شماره تماس یا ایمیل", { exact: true })
    .fill("invalid@");
  await page.getByLabel("موضوع", { exact: true }).fill("بررسی همکاری");
  await page
    .getByLabel("پیام", { exact: true })
    .fill("اطلاعات تکمیلی برای بررسی همکاری");
  await page.getByRole("checkbox").check();
  await submit.click();
  await expect(
    page.getByText("ایمیل معتبر وارد کنید.", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("شماره تماس یا ایمیل", { exact: true })
    .fill(`${randomUUID()}@example.test`);
  const reference = await saved(page);
  await login(page);
  const list = await page.request.get(
    `/api/v1/admin/leads?q=${encodeURIComponent(name)}`,
  );
  const lead = (await list.json()).items[0];
  expect(lead.reference_id).toBe(reference);
  expect(lead.kind).toBe("contact");
  expect(lead.source).toBe("blog");
  await page.goto(`/admin/leads/${lead.id}`);
  await expect(page.getByText("بررسی همکاری", { exact: true })).toBeVisible();
  await logout(page);
  await login(page, "editor");
  await page.goto(`/admin/leads/${lead.id}`);
  await expect(
    page.getByRole("heading", {
      name: "برای این بخش دسترسی ندارید.",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByText(name, { exact: true })).toHaveCount(0);
  expect(
    (await page.request.get(`/api/v1/admin/leads/${lead.id}`)).status(),
  ).toBe(403);
  expect(
    (await page.request.get(`/api/v1/admin/leads/${lead.id}/notes`)).status(),
  ).toBe(403);
});

test("lost response after real commit retries safely and 422 429 failures preserve inputs", async ({
  page,
}) => {
  const name = "تلاش مجدد " + randomUUID();
  await demo(page, name);
  let attempts = 0;
  await page.route("**/api/v1/leads/demo", async (route) => {
    attempts++;
    if (attempts === 1) {
      await route.fetch();
      await route.abort("failed");
    } else await route.continue();
  });
  await page
    .getByRole("button", { name: "ثبت درخواست دمو", exact: true })
    .click();
  await expect(page.locator("form").getByRole("alert")).toContainText(
    "با همین اطلاعات دوباره تلاش کنید",
  );
  await expect(
    page.getByLabel("نام و نام خانوادگی", { exact: true }),
  ).toHaveValue(name);
  await saved(page);
  await page.unroute("**/api/v1/leads/demo");
  await login(page);
  const list = await page.request.get(
    `/api/v1/admin/leads?q=${encodeURIComponent(name)}`,
  );
  expect((await list.json()).pagination.total).toBe(1);
  await logout(page);
  await demo(page, name + " خطا");
  await page.route("**/api/v1/leads/demo", async (route) => {
    const data = route.request().postDataJSON();
    await route.continue({
      postData: JSON.stringify({ ...data, phone: "123" }),
    });
  });
  await page
    .getByRole("button", { name: "ثبت درخواست دمو", exact: true })
    .click();
  await expect(page.getByLabel("شماره تماس", { exact: true })).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await page.unroute("**/api/v1/leads/demo");
  // UI fault injection only; real shared PostgreSQL 429 is covered in API integration tests.
  await page.route("**/api/v1/leads/demo", (route) =>
    route.fulfill({
      status: 429,
      headers: { "Retry-After": "2" },
      contentType: "application/json",
      body: JSON.stringify({
        error: {
          code: "RATE_LIMITED",
          message: "کمی بعد تلاش کنید.",
          details: [],
        },
      }),
    }),
  );
  await page.getByLabel("شماره تماس", { exact: true }).fill("09123456789");
  await page
    .getByRole("button", { name: "ثبت درخواست دمو", exact: true })
    .click();
  await expect(
    page.locator("form").getByRole("alert").filter({ hasText: "ثانیه" }),
  ).toContainText("2 ثانیه");
  await expect(
    page.getByLabel("نام و نام خانوادگی", { exact: true }),
  ).toHaveValue(name + " خطا");
  await page.unroute("**/api/v1/leads/demo");
  await saved(page);
});

test("forms and CRM are responsive accessible and keyboard consent is independent of submission", async ({
  page,
}, info) => {
  const directory = path.resolve("../../docs/qa/step8", info.project.name);
  await mkdir(directory, { recursive: true });
  for (const width of [360, 768, 1440])
    for (const kind of ["demo", "contact"]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(`/${kind}`);
      await expect(page.locator('form button[type="submit"]')).toBeEnabled();
      const checkbox = page.getByRole("checkbox");
      await expect(checkbox).not.toBeChecked();
      await checkbox.focus();
      await page.keyboard.press("Space");
      await expect(checkbox).toBeChecked();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width + 1);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      await writeFile(
        path.join(directory, `form-${kind}-${width}-axe.json`),
        JSON.stringify({ violations: results.violations }, null, 2),
      );
      expect(results.violations).toEqual([]);
      await page.screenshot({
        path: path.join(directory, `form-${kind}-${width}.png`),
        fullPage: true,
      });
    }
  const name = "طراحی پیگیری " + randomUUID();
  await demo(page, name);
  await saved(page);
  await login(page);
  const data = await page.request.get(
    `/api/v1/admin/leads?q=${encodeURIComponent(name)}`,
  );
  const lead = (await data.json()).items[0];
  for (const width of [360, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(`/admin/leads/${lead.id}`);
    await expect(
      page.getByRole("button", { name: "ذخیره پیگیری", exact: true }),
    ).toBeEnabled();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width + 1);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    await writeFile(
      path.join(directory, `crm-${width}-axe.json`),
      JSON.stringify({ violations: results.violations }, null, 2),
    );
    expect(results.violations).toEqual([]);
    await page.screenshot({
      path: path.join(directory, `crm-${width}.png`),
      fullPage: true,
    });
  }
});
