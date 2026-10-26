import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { mkdir } from "node:fs/promises";
import { login, drag, selectElement } from "./helpers";
import type { AdminContent } from "../../src/features/cms/types";

test("element controls edit tab text and image, upload in canvas, reload publish and preserve homepage tabs", async ({
  page,
}, info) => {
  page.setDefaultTimeout(30000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await login(page);
  await page.goto("/admin/content");
  await page.getByRole("button", { name: "افزودن محتوا", exact: true }).click();
  const slug = `tab-edit-${info.project.name}-${randomUUID().slice(0, 8)}`;
  await page
    .getByLabel("عنوان محتوای جدید", { exact: true })
    .filter({ visible: true })
    .fill("آزمون کنترل عناصر");
  await page
    .getByLabel("آدرس محتوای جدید", { exact: true })
    .filter({ visible: true })
    .fill(slug);
  await page
    .getByRole("button", { name: "ایجاد پیش‌نویس", exact: true })
    .click();
  await expect(page).toHaveURL(/\/admin\/content\/[0-9a-f-]{36}\/builder$/);
  const id = page.url().split("/").at(-2)!;
  const canvas = page.frameLocator("iframe").first();
  await drag(page, "تب‌ها", canvas.getByTestId("dropzone:root:default-zone"));
  await expect(
    page.getByRole("tab", { name: "محتوا", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page
    .getByLabel("عنوان تب", { exact: true })
    .filter({ visible: true })
    .fill("معرفی مدرسه");
  await page
    .getByLabel("تیتر داخل تب", { exact: true })
    .filter({ visible: true })
    .fill("مدرسه در یک نگاه");
  await page
    .getByLabel("متن تب", { exact: true })
    .filter({ visible: true })
    .fill("متن قابل ویرایش اولین تب");
  const picker = page.getByRole("button", {
    name: "انتخاب یا بارگذاری تصویر",
    exact: true,
  });
  await page
    .getByRole("button", { name: "تصویر داخل تب", exact: true })
    .click();
  await picker.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog
    .getByLabel("فایل تصویر در کتابخانه", { exact: true })
    .filter({ visible: true })
    .setInputFiles(path.resolve("public/brand/makan-logo.png"));
  await dialog
    .getByLabel("متن جایگزین در کتابخانه", { exact: true })
    .filter({ visible: true })
    .fill("تصویر تب پذیرش");
  await dialog
    .getByRole("button", { name: "بارگذاری و انتخاب", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  await expect(
    canvas.getByRole("img", { name: "تصویر تب پذیرش", exact: true }),
  ).toBeVisible();
  await canvas.getByRole("tab", { name: "تب دوم", exact: true }).click();
  await page.getByRole("button", { name: "متن و پیوند", exact: true }).click();
  await expect(
    page.getByLabel("عنوان تب", { exact: true }).filter({ visible: true }),
  ).toHaveValue("تب دوم");
  await page
    .getByLabel("عنوان تب", { exact: true })
    .filter({ visible: true })
    .fill("راه ارتباطی");
  await page
    .getByLabel("متن تب", { exact: true })
    .filter({ visible: true })
    .fill("محتوای تب دوم مستقل است");
  await page.getByRole("button", { name: "افزودن تب", exact: true }).click();
  await page
    .getByLabel("عنوان تب", { exact: true })
    .filter({ visible: true })
    .fill("تب سوم");
  await page.getByRole("button", { name: "مورد بالاتر", exact: true }).click();
  await expect(
    canvas.locator('[data-widget="Tabs"]').getByRole("tab"),
  ).toHaveText(["معرفی مدرسه", "تب سوم", "راه ارتباطی"]);
  await page.getByRole("button", { name: "حذف مورد", exact: true }).click();
  await page.getByRole("tab", { name: "استایل", exact: true }).click();
  await page
    .getByLabel("رنگ متن base", { exact: true })
    .filter({ visible: true })
    .fill("#1266df");
  await page.getByRole("tab", { name: "پیشرفته", exact: true }).click();
  await page
    .getByLabel("فاصله داخلی base", { exact: true })
    .filter({ visible: true })
    .fill("24");
  await page.getByRole("tab", { name: "محتوا", exact: true }).click();
  await expect(
    page.getByLabel("عنوان تب", { exact: true }).filter({ visible: true }),
  ).toHaveValue("معرفی مدرسه");
  await page
    .getByRole("button", { name: "ذخیره صفحه‌ساز", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "در دیتابیس ذخیره شد" }),
  ).toBeVisible();
  const saved: AdminContent = await (
    await page.request.get(`/api/v1/admin/content/${id}`)
  ).json();
  if (saved.payload.kind !== "page") throw new Error("Page expected");
  const items = saved.payload.document!.nodes.find(
    (node) => node.type === "Tabs",
  )!.props.items!;
  expect(items).toHaveLength(2);
  expect(items[0]?.heading).toBe("مدرسه در یک نگاه");
  expect(items[0]?.media_id).toBeTruthy();
  expect(items[1]?.media_id || null).toBeNull();
  expect(
    (
      await page.request.get(`/api/v1/media/${items[0]!.media_id}/file`)
    ).status(),
  ).toBe(404);
  await page.reload();
  await expect(
    canvas
      .locator('[data-widget="Tabs"]')
      .getByRole("tab", { name: "معرفی مدرسه", exact: true }),
  ).toBeVisible();
  await selectElement(
    page,
    saved.payload.document!.nodes.find((node) => node.type === "Tabs")!.id,
  );
  await expect(
    page.getByLabel("عنوان تب", { exact: true }).filter({ visible: true }),
  ).toHaveValue("معرفی مدرسه");
  await expect(
    canvas.getByRole("img", { name: "تصویر تب پذیرش" }),
  ).toBeVisible();
  await mkdir(path.resolve("../../docs/qa/builder-studio"), {
    recursive: true,
  });
  await page
    .getByRole("button", { name: "تصویر داخل تب", exact: true })
    .click();
  await expect(picker).toBeVisible();
  await picker.scrollIntoViewIfNeeded();
  expect(
    await picker.evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: path.resolve(
      `../../docs/qa/builder-studio/editor-desktop-${info.project.name}.png`,
    ),
    fullPage: true,
  });
  await page.goto(`/admin/preview/${id}?revision=${saved.revision_id}`);
  await expect(page.getByRole("img", { name: "تصویر تب پذیرش" })).toBeVisible();
  await page.goto(`/admin/content/${id}/builder`);
  await page
    .getByRole("button", { name: "انتشار", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "منتشر شد" }),
  ).toBeVisible();
  await page.goto(`/${slug}`);
  await expect(page.getByRole("img", { name: "تصویر تب پذیرش" })).toBeVisible();
  await page.getByRole("tab", { name: "راه ارتباطی", exact: true }).click();
  await expect(
    page.getByText("محتوای تب دوم مستقل است", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: "تصویر تب پذیرش" }),
  ).not.toBeVisible();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("tab", { name: "معرفی مدرسه", exact: true }).click();
  await expect(page.getByRole("img", { name: "تصویر تب پذیرش" })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: path.resolve(
      `../../docs/qa/builder-studio/tabs-mobile-${info.project.name}.png`,
    ),
    fullPage: true,
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  const home = (
    await (
      await page.request.get("/api/v1/admin/content?kind=home&page_size=100")
    ).json()
  ).items[0] as AdminContent;
  const publishedBefore = home.published_revision_id;
  await page.goto(`/admin/content/${home.id}/builder`);
  const audienceSection = canvas.locator('[data-section="audiences"]');
  await audienceSection.getByRole("tab").nth(1).click();
  await expect(
    page.getByLabel("متن تب", { exact: true }).filter({ visible: true }),
  ).toBeVisible();
  await page
    .getByLabel("تیتر داخل تب", { exact: true })
    .filter({ visible: true })
    .fill("تصویر و متن مستقل مخاطب");
  await page
    .getByLabel("متن تب", { exact: true })
    .filter({ visible: true })
    .fill("محتوای اختصاصی همین تب صفحه اصلی");
  await page
    .getByRole("button", { name: "تصویر داخل تب", exact: true })
    .click();
  await page
    .getByLabel("تصویر تب", { exact: true })
    .filter({ visible: true })
    .selectOption(items[0]!.media_id!);
  await expect(
    audienceSection.getByRole("img", { name: "تصویر تب پذیرش" }),
  ).toBeVisible();
  await expect(
    audienceSection.getByRole("heading", { name: "تصویر و متن مستقل مخاطب" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "ذخیره صفحه‌ساز", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "در دیتابیس ذخیره شد" }),
  ).toBeVisible();
  const modified = (await (
    await page.request.get(`/api/v1/admin/content/${home.id}`)
  ).json()) as AdminContent;
  expect(modified.published_revision_id).toBe(publishedBefore);
  await page.reload();
  await audienceSection.getByRole("tab").nth(1).click();
  await expect(
    page.getByLabel("تیتر داخل تب", { exact: true }).filter({ visible: true }),
  ).toHaveValue("تصویر و متن مستقل مخاطب");
  await expect(
    audienceSection.getByRole("img", { name: "تصویر تب پذیرش" }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "ویرایش عنصر", exact: true }).click();
  await page.getByRole("button", { name: "نمای موبایل", exact: true }).click();
  await expect(
    page.getByLabel("تیتر داخل تب", { exact: true }).filter({ visible: true }),
  ).toBeVisible();
  await page
    .getByLabel("تیتر داخل تب", { exact: true })
    .filter({ visible: true })
    .fill("ویرایش تب از موبایل");
  await page.screenshot({
    path: path.resolve(
      `../../docs/qa/builder-studio/editor-mobile-${info.project.name}.png`,
    ),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "ذخیره صفحه‌ساز", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "در دیتابیس ذخیره شد" }),
  ).toBeVisible();
  const mobile = (await (
    await page.request.get(`/api/v1/admin/content/${home.id}`)
  ).json()) as AdminContent;
  expect(mobile.published_revision_id).toBe(publishedBefore);
  if (mobile.payload.kind !== "home") throw new Error("Home expected");
  expect(
    mobile.payload.document!.nodes.find(
      (node) => node.props.legacy_section?.type === "audiences",
    )!.props.items![1]?.heading,
  ).toBe("ویرایش تب از موبایل");
  expect(errors).toEqual([]);
});
