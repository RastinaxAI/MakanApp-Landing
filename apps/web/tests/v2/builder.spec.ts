import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { mkdir } from "node:fs/promises";
import type { AdminContent } from "../../src/features/cms/types";

import { login, drag } from "./helpers";

test("visual canvas creates nested content, changes mobile style, saves refreshes publishes real demo and restores", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await login(page);
  // Upload through the existing real media UI; no file or API fixture replaces storage.
  await page.goto("/admin/media");
  const labels = await page.locator("label").allTextContents();
  test.info().annotations.push({
    type: "media labels",
    description: labels.join(" / "),
  });
  await page
    .getByLabel("متن جایگزین تصویر", { exact: true })
    .fill("رسانهٔ آزمون پذیرش صفحه‌ساز");
  await page
    .locator('input[type="file"]')
    .setInputFiles(path.resolve("public/brand/makan-logo.png"));
  await page.getByRole("button", { name: /بارگذاری/ }).click();
  await expect(page.getByRole("status")).toContainText(/بارگذاری|ذخیره|ثبت/);
  await page.goto("/admin/content");
  const slug = `builder-${info.project.name}-${randomUUID().slice(0, 8)}`;
  await page
    .getByLabel("عنوان محتوای جدید", { exact: true })
    .fill("صفحهٔ پذیرش بصری ماکان");
  await page.getByLabel("آدرس محتوای جدید", { exact: true }).fill(slug);
  await page
    .getByRole("button", { name: "ایجاد پیش‌نویس", exact: true })
    .click();
  await expect(page).toHaveURL(/\/admin\/content\/[0-9a-f-]{36}$/);
  const identifier = page.url().split("/").pop()!;
  const initial: AdminContent = await (
    await page.request.get(`/api/v1/admin/content/${identifier}`)
  ).json();
  await page
    .getByRole("link", { name: "باز کردن صفحه‌ساز بصری", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "صفحه‌ساز ماکان", exact: true }),
  ).toBeVisible();
  const canvas = page.frameLocator("iframe").first();
  await drag(page, "کانتینر", canvas.getByTestId("dropzone:root:default-zone"));
  await expect(canvas.locator('[data-widget="Container"]')).toHaveCount(1);
  const containerId = await canvas
    .locator('[data-widget="Container"]')
    .getAttribute("data-node-id");
  const slot = canvas.locator(`[data-puck-dropzone^="${containerId}:"]`);
  await drag(page, "عنوان", slot);
  await expect(slot.locator('[data-widget="Heading"]')).toHaveCount(1);
  await slot
    .getByRole("textbox", { name: "ویرایش عنوان در صفحه" })
    .fill("تیتر زندهٔ مدرسه");
  await slot.getByRole("textbox", { name: "ویرایش عنوان در صفحه" }).blur();
  await drag(page, "تصویر", slot);
  await expect(canvas.locator('[data-widget="Image"]')).toHaveCount(1);
  await page
    .getByLabel("تصویر", { exact: true })
    .filter({ visible: true })
    .selectOption({ label: "رسانهٔ آزمون پذیرش صفحه‌ساز · makan-logo.png" });
  await drag(page, "فرم درخواست دمو", slot);
  await expect(canvas.locator('[data-widget="DemoForm"]')).toHaveCount(1);
  await page
    .getByLabel("انتخاب عنصر صفحه", { exact: true })
    .selectOption(
      (await slot
        .locator('[data-widget="Heading"]')
        .getAttribute("data-node-id")) || "",
    );
  await expect(
    page.getByLabel("عنوان", { exact: true }).filter({ visible: true }),
  ).toHaveValue("تیتر زندهٔ مدرسه");
  await expect(slot.locator("[data-node-id]")).toHaveCount(3);
  const orderBefore = await slot
    .locator("[data-node-id]")
    .evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("data-node-id")),
    );
  const moveDown = page.getByRole("button", {
    name: "انتقال پایین",
    exact: true,
  });
  if (await moveDown.isEnabled()) await moveDown.click();
  else
    await page
      .getByRole("button", { name: "انتقال بالا", exact: true })
      .click();
  await expect
    .poll(() =>
      slot
        .locator("[data-node-id]")
        .evaluateAll((elements) =>
          elements.map((element) => element.getAttribute("data-node-id")),
        ),
    )
    .not.toEqual(orderBefore);
  await page
    .getByText("فاصله، تایپوگرافی و سطح", { exact: true })
    .filter({ visible: true })
    .click();
  await page
    .getByLabel("اندازه متن base", { exact: true })
    .filter({ visible: true })
    .fill("40");
  await page
    .getByLabel("فاصله داخلی base", { exact: true })
    .filter({ visible: true })
    .fill("16");
  await page
    .getByLabel("خانواده فونت base", { exact: true })
    .filter({ visible: true })
    .selectOption("sans");
  await page
    .getByText("رنگ و نمایش", { exact: true })
    .filter({ visible: true })
    .click();
  await page
    .getByLabel("رنگ متن base", { exact: true })
    .filter({ visible: true })
    .fill("#1266df");
  await page
    .getByLabel("حالت تنظیم Style", { exact: true })
    .filter({ visible: true })
    .selectOption("mobile");
  await page
    .getByLabel("اندازه متن mobile", { exact: true })
    .filter({ visible: true })
    .fill("20");
  await page.getByLabel("نمای صفحه‌ساز", { exact: true }).selectOption("390");
  await expect(slot.locator('[data-widget="Heading"]')).toHaveCSS(
    "font-size",
    "20px",
  );
  await page.getByLabel("نمای صفحه‌ساز", { exact: true }).selectOption("1440");
  await expect(slot.locator('[data-widget="Heading"]')).toHaveCSS(
    "font-size",
    "40px",
  );
  await page
    .getByRole("button", { name: "ذخیره صفحه‌ساز", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "در دیتابیس ذخیره شد" }),
  ).toContainText("در دیتابیس ذخیره شد");
  const saved: AdminContent = await (
    await page.request.get(`/api/v1/admin/content/${identifier}`)
  ).json();
  expect(saved.payload.kind).toBe("page");
  if (saved.payload.kind !== "page") throw new Error("Page expected");
  expect(
    saved.payload.document?.nodes.find((node) => node.type === "Container")
      ?.children,
  ).toHaveLength(3);
  expect((await page.request.get(`/${slug}`)).status()).toBe(404);
  await page.reload();
  await expect(
    slot.getByRole("textbox", { name: "ویرایش عنوان در صفحه" }),
  ).toHaveText("تیتر زندهٔ مدرسه");
  await page.getByRole("button", { name: "انتشار", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "ذخیره و منتشر شد" }),
  ).toContainText("ذخیره و منتشر شد");
  await page.goto(`/${slug}`);
  await expect(
    page.getByRole("heading", { name: "تیتر زندهٔ مدرسه", exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("نام و نام خانوادگی", { exact: true })
    .fill("پذیرش صفحه‌ساز " + randomUUID().slice(0, 8));
  await page.getByLabel("شماره تماس", { exact: true }).fill("09120000001");
  await page
    .getByLabel("نام مدرسه یا مؤسسه", { exact: true })
    .fill("مدرسهٔ آزمون مستقل");
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "ثبت درخواست دمو", exact: true })
    .click();
  await expect(
    page.getByText("درخواست شما ثبت شد.", { exact: true }),
  ).toBeVisible();
  const reference = (await page.getByTestId("reference-id").innerText()).trim();
  await page.goto(`/admin/leads?q=${reference}`);
  await expect(page.getByText(reference, { exact: true })).toBeVisible();
  await page.goto(`/admin/content/${identifier}/revisions`);
  await page
    .getByRole("listitem")
    .filter({ hasText: "نسخه ۱" })
    .getByRole("button", { name: "بازیابی برای ویرایش", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "پیش‌نویس تازه بازیابی شد",
  );
  expect((await page.request.get(`/${slug}`)).status()).toBe(200);
  const restored: AdminContent = await (
    await page.request.get(`/api/v1/admin/content/${identifier}`)
  ).json();
  expect(restored.published_revision_id).not.toBe(initial.revision_id);
  expect(
    restored.payload.kind === "page" && restored.payload.document == null,
  ).toBe(true);
  await mkdir(path.resolve("../../docs/qa/v2-step6"), { recursive: true });
  await page.screenshot({
    path: path.resolve(
      `../../docs/qa/v2-step6/revisions-${info.project.name}.png`,
    ),
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
