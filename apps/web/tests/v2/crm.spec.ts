import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { login } from "./helpers";

test("real lead, school, contacts, qualification, drag pipeline, demo outcome, followup and reports", async ({
  page,
}, info) => {
  const index = ["chromium", "firefox", "webkit"].indexOf(info.project.name);
  const unique = randomUUID().slice(0, 8);
  const name = `مدیر ${unique}`;
  const title = `مدرسهٔ ${unique}`;
  const phone = `09126666${String(index + 110).padStart(3, "0")}`;
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await login(page);
  await page.goto("/admin/crm");
  await expect(
    page.getByRole("heading", { name: "فروش و درخواست دمو", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "ثبت سریع لید", exact: true }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel(/نام مسئول/).fill(name);
  await dialog.getByLabel(/شماره تماس/).fill(phone);
  await dialog.getByLabel(/مدرسه یا آموزشگاه/).fill(title);
  await dialog.getByLabel(/رضایت ذخیره/).check();
  await dialog
    .getByRole("button", { name: "ذخیرهٔ اطلاعات", exact: true })
    .click();
  await expect(dialog).toBeHidden();
  await page.getByRole("tab", { name: "لیدها", exact: true }).click();
  await page.getByRole("link", { name, exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  const id = page.url().split("/").pop()!;
  await page
    .getByRole("button", { name: "ارزیابی و ویرایش لید", exact: true })
    .click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel(/برچسب‌ها/).fill("مدرسه، اولویت");
  await dialog
    .getByLabel("نتیجهٔ ارزیابی", { exact: true })
    .fill("به گزارش‌ها و ارتباط با والدین نیاز دارد.");
  await dialog
    .getByRole("button", { name: "ذخیرهٔ اطلاعات", exact: true })
    .click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("اولویت", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "ویرایش مدرسه", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("شهر", { exact: true }).fill("تهران");
  await dialog.getByLabel("استان", { exact: true }).fill("تهران");
  await dialog
    .getByLabel("تعداد تقریبی دانش‌آموزان", { exact: true })
    .fill("450");
  await dialog.getByLabel("گزارش‌ها", { exact: true }).check();
  await dialog
    .getByRole("button", { name: "ذخیرهٔ اطلاعات", exact: true })
    .click();
  await expect(dialog).toBeHidden();
  await page.getByRole("tab", { name: "افراد", exact: true }).click();
  await page.getByRole("button", { name: "افزودن فرد", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel(/نام فرد/).fill("مسئول آموزش");
  await dialog.getByLabel(/شماره یا ایمیل/).fill("invalid");
  await dialog
    .getByRole("button", { name: "ذخیرهٔ اطلاعات", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toBeVisible();
  await dialog
    .getByLabel(/شماره یا ایمیل/)
    .fill(`09129999${String(index + 120).padStart(3, "0")}`);
  await dialog.getByLabel("سمت", { exact: true }).fill("معاون");
  await dialog
    .getByRole("button", { name: "ذخیرهٔ اطلاعات", exact: true })
    .click();
  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole("heading", { name: "مسئول آموزش", exact: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "فرصت‌ها", exact: true }).click();
  await page.getByRole("button", { name: "فرصت جدید", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel(/عنوان فرصت/).fill(`فرصت ${unique}`);
  await dialog.getByLabel("ارزش تخمینی (تومان)", { exact: true }).fill("95000");
  await dialog
    .getByLabel("مرحلهٔ فروش", { exact: true })
    .selectOption("qualified");
  await dialog
    .getByRole("button", { name: "ذخیرهٔ اطلاعات", exact: true })
    .click();
  await expect(dialog).toBeHidden();
  const card = page
    .locator("[data-opportunity]")
    .filter({ hasText: `فرصت ${unique}` });
  await page
    .locator('[data-stage="qualified"]')
    .evaluate((el) => el.scrollIntoView({ block: "nearest", inline: "start" }));
  await card
    .getByRole("button", { name: `جابه‌جایی فرصت ${unique}`, exact: true })
    .dragTo(page.locator('[data-stage="demo_scheduled"]'));
  await expect(
    page.locator('[data-stage="demo_scheduled"] [data-opportunity]'),
  ).toHaveCount(1);
  await page.getByRole("tab", { name: "دموها", exact: true }).click();
  await page
    .getByRole("button", { name: "زمان‌بندی دمو", exact: true })
    .click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel(/کارشناس دمو/).selectOption({ label: "09120000001" });
  const start = new Date(Date.now() + (index + 2) * 86400000);
  const end = new Date(start.getTime() + 2700000);
  await dialog.getByLabel(/شروع جلسه/).fill(start.toISOString().slice(0, 16));
  await dialog.getByLabel(/پایان جلسه/).fill(end.toISOString().slice(0, 16));
  await dialog
    .getByLabel("فرصت مرتبط", { exact: true })
    .selectOption({ label: `فرصت ${unique}` });
  await dialog
    .getByRole("button", { name: "ذخیرهٔ اطلاعات", exact: true })
    .click();
  await expect(dialog).toBeHidden();
  await page.getByRole("button", { name: "ویرایش دمو", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("وضعیت جلسه", { exact: true })
    .selectOption("completed");
  await dialog
    .getByLabel(/نتیجهٔ دمو/)
    .fill("جلسه برگزار شد و نیازها مشخص شدند.");
  await dialog.getByLabel(/اقدام بعدی/).fill("ارسال پیشنهاد برای مدیر مدرسه");
  await dialog
    .getByRole("button", { name: "ذخیرهٔ اطلاعات", exact: true })
    .click();
  await expect(dialog).toBeHidden();
  await expect(
    page.getByText(/جلسه برگزار شد و نیازها مشخص شدند/),
  ).toBeVisible();
  await page.getByRole("tab", { name: "فعالیت‌ها", exact: true }).click();
  await page.getByRole("button", { name: "فعالیت جدید", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel(/عنوان فعالیت/).fill("تماس بعد از دمو");
  await dialog
    .getByLabel("نوع فعالیت", { exact: true })
    .selectOption("followup");
  await dialog
    .getByLabel(/زمان پیگیری/)
    .fill(new Date(Date.now() - 3600000).toISOString().slice(0, 16));
  await dialog
    .getByRole("button", { name: "ذخیرهٔ اطلاعات", exact: true })
    .click();
  await expect(dialog).toBeHidden();
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  await page.getByRole("tab", { name: "فعالیت‌ها", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "تماس بعد از دمو", exact: true }),
  ).toBeVisible();
  const data = await (
    await page.request.get(`/api/v1/admin/leads/${id}/customer`)
  ).json();
  expect(data.contacts.pagination.total).toBe(2);
  expect(data.school.students).toBe(450);
  expect(data.demos.items[0].status).toBe("completed");
  expect(data.opportunities.items[0].stage).toBe("demo_scheduled");
  expect(data.profile.tags).toContain("اولویت");
  const dir = path.resolve("../../docs/qa", process.env.MAKAN_QA_PHASE || "v2-step5", info.project.name);
  await mkdir(dir, { recursive: true });
  for (const width of [1440, 768, 360]) {
    await page.setViewportSize({ width, height: 960 });
    await page.getByRole("tab", { name: "تاریخچه", exact: true }).click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    await page.screenshot({
      path: path.join(dir, `customer-${width}.png`),
      fullPage: true,
    });
  }
  await page.goto("/admin/crm");
  await page.getByRole("tab", { name: "لیدها", exact: true }).click();
  await page
    .getByText("جست‌وجو، فیلتر و نماهای ذخیره‌شده", { exact: true })
    .click();
  await page.getByLabel("نام، مدرسه یا شماره", { exact: true }).fill(name);
  await page.getByRole("button", { name: "اعمال فیلتر", exact: true }).click();
  await expect(page.getByRole("link", { name, exact: true })).toBeVisible();
  await page
    .getByLabel("نام نمای جدید", { exact: true })
    .fill(`پیگیری ${unique}`);
  await page
    .getByRole("button", { name: "ذخیرهٔ نمای فعلی", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: `پیگیری ${unique}`, exact: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "گزارش فروش", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "دمو برگزارشده", exact: true }),
  ).toBeVisible();
  const metrics = await (
    await page.request.get(
      `/api/v1/admin/crm/dashboard?q=${encodeURIComponent(name)}`,
    )
  ).json();
  expect(metrics.total_leads).toBe(1);
  expect(metrics.completed_demos).toBe(1);
  expect(metrics.overdue_followups).toBe(1);
  expect(metrics.demo_to_opportunity_percent).toBe(100);
  expect(errors).toEqual([]);
});
