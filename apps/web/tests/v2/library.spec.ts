import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { login } from "./helpers";
import type { AdminContent, CmsPage } from "../../src/features/cms/types";
import type { BuilderSettings } from "../../src/features/builder/types";

test("content editors can use the library without owner-only design settings", async ({
  page,
}) => {
  await login(page, "09120000002");
  await page.goto("/admin/builder");
  await expect(
    page.getByRole("heading", { name: "استودیوی طراحی سایت", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("tab", { name: "طراحی سراسری", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "تنظیم هویت بصری", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "ساخت طرح جدید", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "یک طرح تازه بسازید" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "بستن پنل", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("library creates durable designs and filters actual server categories", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await login(page);
  await page.goto("/admin/builder");
  await expect(
    page.getByRole("heading", { name: "استودیوی طراحی سایت", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("complementary").filter({
      has: page.getByRole("navigation", { name: "بخش‌های مدیریت" }),
    }),
  ).toBeVisible();
  await expect(page.getByLabel("نام قالب تازه", { exact: true })).toHaveCount(
    0,
  );
  const names = [
    `قالب آزمون ${randomUUID().slice(0, 8)}`,
    `بخش آزمون ${randomUUID().slice(0, 8)}`,
  ];
  for (const [index, purpose] of ["template", "section"].entries()) {
    await page
      .getByRole("button", { name: "ساخت طرح جدید", exact: true })
      .click();
    const dialog = page.getByRole("dialog", { name: "یک طرح تازه بسازید" });
    await dialog
      .getByLabel("نام قالب تازه", { exact: true })
      .fill(names[index]!);
    await dialog
      .getByLabel("کاربرد قالب تازه", { exact: true })
      .selectOption(purpose);
    await dialog
      .getByRole("button", { name: "ساخت و بازکردن صفحه‌ساز", exact: true })
      .click();
    await expect(page).toHaveURL(/\/admin\/content\/[0-9a-f-]{36}\/builder$/);
    await expect(
      page.frameLocator("iframe").first().locator('[data-widget="Container"]'),
    ).toHaveCount(1);
    const id = page.url().split("/").at(-2)!;
    const saved = (await (
      await page.request.get(`/api/v1/admin/content/${id}`)
    ).json()) as AdminContent;
    expect(saved.title).toBe(names[index]);
    if (saved.payload.kind !== "page") throw new Error("Page expected");
    expect(saved.payload.document?.purpose).toBe(purpose);
    await page.goto("/admin/builder");
  }
  await page
    .getByLabel("جست‌وجوی طرح‌ها در این صفحه", { exact: true })
    .fill(names[0]!);
  await expect(page.getByRole("article")).toHaveCount(1);
  await expect(
    page.getByRole("article", { name: names[0], exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("وضعیت طرح‌ها در این صفحه", { exact: true })
    .selectOption("published");
  await expect(
    page.getByRole("heading", { name: "طرحی با این مشخصات پیدا نشد" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "پاک کردن فیلترها", exact: true })
    .click();
  await expect(
    page.getByRole("article", { name: names[0], exact: true }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "نوع طرح" })
    .getByRole("link", { name: "بخش آماده", exact: true })
    .click();
  await expect(page).toHaveURL(/purpose=section/);
  await expect(
    page.getByRole("article", { name: names[1], exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("article", { name: names[0], exact: true }),
  ).toHaveCount(0);
  const filtered = (await (
    await page.request.get(
      "/api/v1/admin/builder/library?purpose=section&page_size=50",
    )
  ).json()) as CmsPage<AdminContent>;
  expect(
    filtered.items.every(
      (row) =>
        row.payload.kind === "page" &&
        row.payload.document?.purpose === "section",
    ),
  ).toBe(true);
  await page.reload();
  await expect(
    page.getByRole("article", { name: names[1], exact: true }),
  ).toBeVisible();
  await page.goto("/admin/builder");
  const directory = path.resolve("../../docs/qa/builder-library");
  await mkdir(directory, { recursive: true });
  await page.screenshot({
    path: path.join(directory, `library-desktop-${info.project.name}.png`),
    fullPage: true,
  });
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  for (const width of [1024, 768, 480, 360]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await expect(
      page.getByRole("button", { name: "ساخت طرح جدید", exact: true }),
    ).toBeVisible();
  }
  await page.screenshot({
    path: path.join(directory, `library-mobile-${info.project.name}.png`),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "ساخت طرح جدید", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "ساخت طرح جدید", exact: true }),
  ).toBeFocused();
  expect(errors).toEqual([]);
});

test("global design changes require explicit save and persist after refresh", async ({
  page,
}, info) => {
  await login(page);
  await page.goto("/admin/builder");
  const original = (await (
    await page.request.get("/api/v1/admin/builder/settings")
  ).json()) as BuilderSettings;
  await page.getByRole("tab", { name: "طراحی سراسری", exact: true }).click();
  const save = page.getByRole("button", {
    name: "ذخیره طراحی سراسری",
    exact: true,
  });
  await expect(save).toBeDisabled();
  const replacement =
    original.globals.colors.primary === "#284693" ? "#156fee" : "#284693";
  await page
    .getByLabel("رنگ سراسری primary", { exact: true })
    .fill(replacement);
  await expect(save).toBeEnabled();
  expect(
    (
      (await (
        await page.request.get("/api/v1/admin/builder/settings")
      ).json()) as BuilderSettings
    ).globals.colors.primary,
  ).toBe(original.globals.colors.primary);
  await page.getByRole("tab", { name: "کتابخانه طرح‌ها", exact: true }).click();
  await page
    .getByRole("button", { name: "تنظیم هویت بصری", exact: true })
    .click();
  await expect(
    page.getByLabel("رنگ سراسری primary", { exact: true }),
  ).toHaveValue(replacement);
  await save.click();
  await expect(
    page.getByRole("status").filter({ hasText: "ذخیره شدند" }),
  ).toBeVisible();
  await expect(save).toBeDisabled();
  await page.reload();
  await page.getByRole("tab", { name: "طراحی سراسری", exact: true }).click();
  await expect(
    page.getByLabel("رنگ سراسری primary", { exact: true }),
  ).toHaveValue(replacement);
  for (const width of [1200, 768, 480, 360]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.screenshot({
    path: path.resolve(
      `../../docs/qa/builder-library/settings-mobile-${info.project.name}.png`,
    ),
    fullPage: true,
  });
  await page
    .getByLabel("رنگ سراسری primary", { exact: true })
    .fill(original.globals.colors.primary!);
  await save.click();
  await expect(
    page.getByRole("status").filter({ hasText: "ذخیره شدند" }),
  ).toBeVisible();
});
