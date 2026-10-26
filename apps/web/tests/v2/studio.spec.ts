import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { login, drag } from "./helpers";
import type { AdminContent } from "../../src/features/cms/types";

test("studio keeps settings beside the canvas and saves real drag-and-drop content across devices", async ({
  page,
}, info) => {
  const errors: string[] = [];
  const designRequests: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (
      /\/api\/v1\/(forms\/token|leads\/demo|contact)(\?|$)/.test(request.url())
    )
      designRequests.push(request.url());
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await login(page);
  await page.goto("/admin/content");
  await page.getByRole("button", { name: "افزودن محتوا", exact: true }).click();
  const slug = `studio-${info.project.name}-${randomUUID().slice(0, 8)}`;
  await page
    .getByLabel("عنوان محتوای جدید", { exact: true })
    .fill("پذیرش استودیوی طراحی");
  await page.getByLabel("آدرس محتوای جدید", { exact: true }).fill(slug);
  await page
    .getByRole("button", { name: "ایجاد پیش‌نویس", exact: true })
    .click();
  await expect(page).toHaveURL(/\/admin\/content\/[0-9a-f-]{36}\/builder$/);
  const id = page.url().split("/").at(-2)!;
  await expect(
    page.getByRole("heading", { name: "صفحه‌ساز ماکان", exact: true }),
  ).toBeVisible();
  const sidebar = page.getByRole("complementary", {
    name: "پنل کناری صفحه‌ساز",
    exact: true,
  });
  const canvas = page.frameLocator("iframe").first();
  const surface = page.getByRole("region", {
    name: "بوم طراحی صفحه",
    exact: true,
  });
  await expect(page.getByLabel("عنوان برگه", { exact: true })).toBeHidden();
  await expect(surface.locator("input, textarea, select")).toHaveCount(0);
  await expect(canvas.getByRole("toolbar")).toHaveCount(0);
  const widthBefore = (await surface.boundingBox())!.width;
  await page
    .getByRole("button", { name: "پنهان‌کردن پنل کناری", exact: true })
    .click();
  await expect(sidebar).toBeHidden();
  expect((await surface.boundingBox())!.width).toBeGreaterThan(
    widthBefore + 250,
  );
  await page.getByRole("button", { name: "عناصر", exact: true }).click();
  await sidebar.getByLabel("جست‌وجوی عناصر", { exact: true }).fill("پیدانشدنی");
  await expect(sidebar.getByRole("status")).toContainText("عنصری پیدا نشد");
  await sidebar.getByLabel("جست‌وجوی عناصر", { exact: true }).fill("");

  await drag(page, "کانتینر", canvas.getByTestId("dropzone:root:default-zone"));
  const container = canvas.locator('[data-widget="Container"]');
  await expect(container).toHaveCount(1);
  const containerId = await container.getAttribute("data-node-id");
  const slot = canvas.locator(`[data-puck-dropzone^="${containerId}:"]`);
  await drag(page, "عنوان", slot);
  await expect(
    sidebar.getByRole("tab", { name: "محتوا", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  const inline = slot.getByRole("textbox", {
    name: "ویرایش عنوان در صفحه",
    exact: true,
  });
  await inline.fill("مدرسه با ");
  await inline.pressSequentially("ماکان");
  await inline.blur();
  await expect(sidebar.getByLabel("عنوان", { exact: true })).toHaveValue(
    "مدرسه با ماکان",
  );

  await drag(page, "تب‌ها", slot);
  await sidebar.getByLabel("عنوان تب", { exact: true }).fill("معرفی مدرسه");
  await sidebar
    .getByLabel("تیتر داخل تب", { exact: true })
    .fill("ویرایش تصویر از کنار صفحه");
  await sidebar
    .getByRole("button", { name: "تصویر داخل تب", exact: true })
    .click();
  await sidebar
    .getByRole("button", { name: "انتخاب یا بارگذاری تصویر", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("فایل تصویر در کتابخانه", { exact: true })
    .setInputFiles(path.resolve("public/brand/makan-logo.png"));
  await dialog
    .getByLabel("متن جایگزین در کتابخانه", { exact: true })
    .fill("تصویر آزمون استودیو");
  await dialog
    .getByRole("button", { name: "بارگذاری و انتخاب", exact: true })
    .click();
  await expect(dialog).toBeHidden();
  await expect(
    canvas.getByRole("img", { name: "تصویر آزمون استودیو", exact: true }),
  ).toBeVisible();
  await canvas.getByRole("tab", { name: "تب دوم", exact: true }).click();
  await expect(sidebar.getByLabel("عنوان تب", { exact: true })).toHaveValue(
    "تب دوم",
  );
  await sidebar.getByLabel("عنوان تب", { exact: true }).fill("ارتباط با مدرسه");
  await canvas.getByRole("tab", { name: "معرفی مدرسه", exact: true }).click();
  await expect(sidebar.getByLabel("عنوان تب", { exact: true })).toHaveValue(
    "معرفی مدرسه",
  );
  await drag(page, "فرم درخواست دمو", slot);
  await expect(slot.locator('[data-widget="DemoForm"]')).toHaveCount(1);
  await expect(slot.locator('form[data-request-kind="demo"]')).toBeVisible();
  expect(designRequests).toEqual([]);

  await page.getByRole("button", { name: "تنظیمات برگه", exact: true }).click();
  await expect(sidebar.getByLabel("عنوان برگه", { exact: true })).toBeVisible();
  await expect(surface.locator("input, textarea, select")).toHaveCount(0);
  await sidebar
    .getByLabel("عنوان برگه", { exact: true })
    .fill("مدرسه در استودیو");
  await page
    .getByRole("button", { name: "ذخیره صفحه‌ساز", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "در دیتابیس ذخیره شد" }),
  ).toBeVisible();
  const saved = (await (
    await page.request.get(`/api/v1/admin/content/${id}`)
  ).json()) as AdminContent;
  expect(saved.title).toBe("مدرسه در استودیو");
  expect(saved.payload.kind).toBe("page");
  if (saved.payload.kind !== "page") throw new Error("Page expected");
  const savedContainer = saved.payload.document?.nodes.find(
    (node) => node.type === "Container",
  );
  expect(savedContainer?.children).toHaveLength(3);
  expect(savedContainer?.children.map((node) => node.type)).toEqual(
    expect.arrayContaining(["Heading", "Tabs", "DemoForm"]),
  );
  expect((await page.request.get(`/${slug}`)).status()).toBe(404);
  expect(
    (
      await page.request.get(
        `/admin/preview/${id}?revision=${saved.revision_id}`,
      )
    ).status(),
  ).toBe(200);
  await page.reload();
  await expect(
    canvas.getByRole("img", { name: "تصویر آزمون استودیو", exact: true }),
  ).toBeVisible();
  await expect(inline).toHaveText("مدرسه با ماکان");
  await inline.fill("مدرسه هوشمند با ماکان");
  await inline.press("ControlOrMeta+s");
  await expect(
    page.getByRole("status").filter({ hasText: "در دیتابیس ذخیره شد" }),
  ).toBeVisible();
  const shortcutSaved = (await (
    await page.request.get(`/api/v1/admin/content/${id}`)
  ).json()) as AdminContent;
  if (shortcutSaved.payload.kind !== "page") throw new Error("Page expected");
  expect(
    shortcutSaved.payload.document?.nodes
      .find((node) => node.type === "Container")
      ?.children.find((node) => node.type === "Heading")?.props.title,
  ).toBe("مدرسه هوشمند با ماکان");
  await page.getByRole("button", { name: "نمای موبایل", exact: true }).click();
  expect(await canvas.locator("body").evaluate(() => window.innerWidth)).toBe(
    390,
  );
  await page.getByRole("button", { name: "نمای دسکتاپ", exact: true }).click();
  expect(await canvas.locator("body").evaluate(() => window.innerWidth)).toBe(
    1440,
  );
  await canvas.getByRole("tab", { name: "معرفی مدرسه", exact: true }).click();
  await expect(sidebar.getByLabel("عنوان تب", { exact: true })).toHaveValue(
    "معرفی مدرسه",
  );
  await mkdir(path.resolve("../../docs/qa/builder-studio"), {
    recursive: true,
  });
  await page.screenshot({
    path: path.resolve(
      `../../docs/qa/builder-studio/studio-desktop-${info.project.name}.png`,
    ),
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "نمای موبایل", exact: true }).click();
  await expect(sidebar).toBeVisible();
  expect(
    await page
      .locator(".builder-studio")
      .evaluate((element) => element.scrollWidth <= element.clientWidth),
  ).toBe(true);
  await page.screenshot({
    path: path.resolve(
      `../../docs/qa/builder-studio/studio-mobile-${info.project.name}.png`,
    ),
  });
  await page.getByRole("button", { name: "انتشار", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "منتشر شد" }),
  ).toBeVisible();
  await page.goto(`/${slug}`);
  await expect(
    page.getByRole("heading", { name: "مدرسه هوشمند با ماکان", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: "تصویر آزمون استودیو", exact: true }),
  ).toBeVisible();
  await expect(page.locator('form[data-request-kind="demo"]')).toBeVisible();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  expect(errors).toEqual([]);
});
