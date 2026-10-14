import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { mkdir } from "node:fs/promises";
import { login, drag } from "./helpers";
import type { AdminContent, CmsPage } from "../../src/features/cms/types";

test("reusable sections, undo redo, viewport resize and autosave survive refresh", async ({
  page,
}, info) => {
  await login(page);
  await page.goto("/admin/builder");
  const name = "قالب پذیرش " + randomUUID().slice(0, 8);
  await page.getByLabel("نام قالب تازه", { exact: true }).fill(name);
  await page
    .getByRole("button", { name: "ساخت و بازکردن صفحه‌ساز", exact: true })
    .click();
  await expect(page).toHaveURL(/\/admin\/content\/[0-9a-f-]{36}\/builder$/);
  const identifier = page.url().split("/").at(-2)!;
  const canvas = page.frameLocator("iframe").first();
  const container = canvas.locator('[data-widget="Container"]');
  await expect(container).toHaveCount(1);
  const slot = canvas.locator(
    `[data-puck-dropzone^="${await container.getAttribute("data-node-id")}:"]`,
  );
  await drag(page, "عنوان", slot);
  const text = canvas.getByRole("textbox", { name: "ویرایش عنوان در صفحه" });
  await text.fill(name);
  await text.blur();
  const headingId = await canvas
    .locator('[data-widget="Heading"]')
    .getAttribute("data-node-id");
  await page
    .getByLabel("انتخاب عنصر صفحه", { exact: true })
    .selectOption(headingId!);
  await page
    .getByText("قالب، بخش آماده و کپی / جای‌گذاری", { exact: true })
    .click();
  await page
    .getByLabel("نام بخش قابل استفاده مجدد", { exact: true })
    .fill(name);
  await page.getByRole("button", { name: "ذخیره بخش", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "بخش در همان CMS" }),
  ).toBeVisible();
  const library = (await (
    await page.request.get(
      "/api/v1/admin/builder/library?purpose=section&page_size=100",
    )
  ).json()) as CmsPage<AdminContent>;
  const section = library.items.find((row) => row.title === name);
  expect(section).toBeDefined();
  await page.getByRole("button", { name: "کپی عنصر", exact: true }).click();
  await page
    .getByRole("button", { name: "جای‌گذاری عنصر", exact: true })
    .click();
  await expect(canvas.locator('[data-widget="Heading"]')).toHaveCount(2);
  // The editor groups consecutive edits into a in-memory undo checkpoint (250ms).
  await page.waitForTimeout(350);
  await page.getByRole("button", { name: "واگرد", exact: true }).click();
  await expect(canvas.locator('[data-widget="Heading"]')).toHaveCount(1);
  await page.getByRole("button", { name: "انجام دوباره", exact: true }).click();
  await expect(canvas.locator('[data-widget="Heading"]')).toHaveCount(2);
  await page
    .getByLabel("انتخاب عنصر صفحه", { exact: true })
    .selectOption(headingId!);
  await page.getByLabel("نمای صفحه‌ساز", { exact: true }).selectOption("390");
  const heading = canvas.locator(`[data-node-id="${headingId}"]`);
  const oldWidth = await heading.evaluate(
    (element) => element.getBoundingClientRect().width,
  );
  await canvas.locator('button[aria-label="تغییر عرض عنصر"]').focus();
  await page.keyboard.press("ArrowLeft");
  await expect
    .poll(() =>
      heading.evaluate((element) => element.getBoundingClientRect().width),
    )
    .not.toBe(oldWidth);
  await page.clock.install();
  await page.clock.fastForward(95000);
  await expect(
    page.getByRole("status").filter({ hasText: "در دیتابیس ذخیره شد" }),
  ).toBeVisible();
  const saved = (await (
    await page.request.get(`/api/v1/admin/content/${identifier}`)
  ).json()) as AdminContent;
  expect(saved.revision_no).toBeGreaterThan(1);
  if (saved.payload.kind !== "page") throw new Error("Page required");
  expect(saved.payload.document?.purpose).toBe("template");
  const children = saved.payload.document?.nodes[0]?.children || [];
  expect(new Set(children.map((node) => node.id)).size).toBe(2);
  expect(
    children.find((node) => node.id === headingId)?.styles.mobile.width,
  ).toMatch(/px$/);
  expect(
    children.find((node) => node.id === headingId)?.styles.base.width,
  ).toBeUndefined();
  await page.reload();
  await expect(canvas.locator('[data-widget="Heading"]')).toHaveCount(2);
  await page.getByRole("button", { name: "انتشار", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "ذخیره و منتشر شد" }),
  ).toBeVisible();
  expect((await page.request.get(`/${saved.slug}`)).status()).toBe(404);
  await mkdir(
    path.resolve(`../../docs/qa/${process.env.MAKAN_QA_PHASE || "v2-step6"}`),
    { recursive: true },
  );
  await page.screenshot({
    path: path.resolve(
      `../../docs/qa/${process.env.MAKAN_QA_PHASE || "v2-step6"}/canvas-${info.project.name}.png`,
    ),
    fullPage: true,
  });
});

test("header builder publishes binds draft isolation and restores the original site header", async ({
  page,
}) => {
  await login(page);
  await page.goto("/admin/builder");
  const name = "سربرگ پذیرش " + randomUUID().slice(0, 8);
  await page.getByLabel("نام قالب تازه", { exact: true }).fill(name);
  await page
    .getByLabel("کاربرد قالب تازه", { exact: true })
    .selectOption("header");
  await page
    .getByRole("button", { name: "ساخت و بازکردن صفحه‌ساز", exact: true })
    .click();
  const canvas = page.frameLocator("iframe").first();
  const container = canvas.locator('[data-widget="Container"]');
  await expect(container).toHaveCount(1);
  const slot = canvas.locator(
    `[data-puck-dropzone^="${await container.getAttribute("data-node-id")}:"]`,
  );
  await drag(page, "دکمه", slot);
  await expect(canvas.locator('[data-widget="Button"]')).toHaveCount(1);
  await page
    .getByLabel("متن دکمه", { exact: true })
    .filter({ visible: true })
    .fill(name);
  await page.getByRole("button", { name: "انتشار", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "ذخیره و منتشر شد" }),
  ).toBeVisible();
  const identifier = page.url().split("/").at(-2)!;
  await page.goto("/admin/builder");
  await page
    .getByLabel("اتصال سربرگ", { exact: true })
    .selectOption(identifier);
  await page
    .getByRole("button", { name: "ذخیره طراحی سراسری", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("ذخیره شدند");
  await page.goto("/");
  await expect(
    page.getByRole("banner").getByRole("link", { name, exact: true }),
  ).toBeVisible();
  await page.goto(`/admin/content/${identifier}/builder`);
  const buttonId = await canvas
    .locator('[data-widget="Button"]')
    .getAttribute("data-node-id");
  await page
    .getByLabel("انتخاب عنصر صفحه", { exact: true })
    .selectOption(buttonId!);
  await page
    .getByLabel("متن دکمه", { exact: true })
    .filter({ visible: true })
    .fill("تغییر پیش‌نویس");
  await page
    .getByRole("button", { name: "ذخیره صفحه‌ساز", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "در دیتابیس ذخیره شد" }),
  ).toBeVisible();
  await page.goto("/");
  await expect(
    page.getByRole("banner").getByRole("link", { name, exact: true }),
  ).toBeVisible();
  await page.goto("/admin/builder");
  await page.getByLabel("اتصال سربرگ", { exact: true }).selectOption("");
  await page
    .getByRole("button", { name: "ذخیره طراحی سراسری", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("ذخیره شدند");
  await page.goto("/");
  await expect(
    page.getByRole("banner").getByRole("link", { name, exact: true }),
  ).toHaveCount(0);
  await expect(page.getByRole("banner").getByRole("navigation")).toBeVisible();
});
