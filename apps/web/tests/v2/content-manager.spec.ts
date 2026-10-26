import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { login } from "./helpers";
import type { AdminContent, CmsPage } from "../../src/features/cms/types";

async function search(page: Page, title: string) {
  await page.getByLabel("جست‌وجوی عنوان", { exact: true }).fill(title);
  await page.getByRole("button", { name: "اعمال فیلتر", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "اعمال فیلتر", exact: true }),
  ).toBeEnabled();
}

test("content desk creates durable drafts and archives with confirmation without losing history", async ({
  page,
}) => {
  await login(page);
  await page.goto("/admin/content");
  await expect(
    page.getByLabel("عنوان محتوای جدید", { exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "افزودن محتوا", exact: true }).click();
  const name = `محتوای پذیرش ${randomUUID().slice(0, 8)}`;
  const slug = `desk-${randomUUID().slice(0, 8)}`;
  const dialog = page.getByRole("dialog", {
    name: "محتوای تازه بسازید",
    exact: true,
  });
  await dialog.getByLabel("عنوان محتوای جدید", { exact: true }).fill(name);
  await dialog.getByLabel("آدرس محتوای جدید", { exact: true }).fill(slug);
  await dialog
    .getByRole("button", { name: "ایجاد پیش‌نویس", exact: true })
    .click();
  await expect(page).toHaveURL(/\/admin\/content\/[0-9a-f-]{36}\/builder$/);
  const id = page.url().split("/").at(-2)!;
  const saved = (await (
    await page.request.get(`/api/v1/admin/content/${id}`)
  ).json()) as AdminContent;
  expect(saved).toMatchObject({
    title: name,
    slug,
    kind: "page",
    publication_state: "draft",
  });
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "صفحه‌ساز ماکان", exact: true }),
  ).toBeVisible();
  expect((await page.request.get(`/${slug}`)).status()).toBe(404);
  await page.goto("/admin/content");
  await search(page, name);
  const row = page
    .getByRole("list", { name: "محتواهای سایت" })
    .getByRole("listitem", { name, exact: true });
  await expect(row).toBeVisible();
  await expect(
    row.getByRole("link", { name: "ویرایش", exact: true }),
  ).toHaveAttribute("href", `/admin/content/${id}`);
  expect((await page.request.get(`/admin/preview/${id}`)).status()).toBe(200);
  await row
    .getByRole("button", { name: `گزینه‌های ${name}`, exact: true })
    .click();
  await expect(
    page.getByRole("menuitem", { name: "تاریخچهٔ نسخه‌ها", exact: true }),
  ).toHaveAttribute("href", `/admin/content/${id}/revisions`);
  await page.getByRole("menuitem", { name: "بایگانی", exact: true }).click();
  await row.getByRole("button", { name: "انصراف", exact: true }).click();
  expect(
    (
      (await (
        await page.request.get(`/api/v1/admin/content/${id}`)
      ).json()) as AdminContent
    ).is_archived,
  ).toBe(false);
  await row
    .getByRole("button", { name: `گزینه‌های ${name}`, exact: true })
    .click();
  await page.getByRole("menuitem", { name: "بایگانی", exact: true }).click();
  await row.getByRole("button", { name: "تأیید بایگانی", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "محتوا بایگانی شد" }),
  ).toBeVisible();
  await expect(row).toHaveCount(0);
  await page
    .getByRole("group", { name: "نمایش بر اساس وضعیت", exact: true })
    .getByRole("button", { name: "بایگانی", exact: true })
    .click();
  await expect(row).toBeVisible();
  const archived = (await (
    await page.request.get(`/api/v1/admin/content/${id}`)
  ).json()) as AdminContent;
  expect(archived.publication_state).toBe("archived");
  expect(archived.revision_no).toBe(saved.revision_no);
  expect(archived.working_revision_id).toBe(saved.working_revision_id);
});

test("server search type status and pagination keep applied filters coherent", async ({
  page,
}) => {
  await login(page);
  const prefix = `پذیرش فهرست ${randomUUID().slice(0, 8)}`;
  const csrf = (await (
    await page.request.get("/api/v1/admin/auth/csrf")
  ).json()) as { csrf_token: string };
  for (let offset = 0; offset < 21; offset += 3) {
    await Promise.all(
      Array.from({ length: Math.min(3, 21 - offset) }, async (_, index) => {
        const title = `${prefix} ${offset + index}`;
        const response = await page.request.post("/api/v1/admin/content", {
          headers: {
            Origin: "http://127.0.0.1:3200",
            "X-CSRF-Token": csrf.csrf_token,
          },
          data: {
            title,
            slug: `pagination-${randomUUID()}`,
            payload: {
              kind: "page",
              headline: title,
              summary: "",
              sections: [],
            },
          },
        });
        expect(response.status()).toBe(201);
      }),
    );
  }
  await page.goto("/admin/content");
  await page.getByLabel("نوع محتوا", { exact: true }).selectOption("page");
  await search(page, prefix);
  const rows = page
    .getByRole("list", { name: "محتواهای سایت", exact: true })
    .getByRole("listitem");
  await expect(rows).toHaveCount(20);
  await page
    .getByLabel("جست‌وجوی عنوان", { exact: true })
    .fill("این جست‌وجو هنوز اعمال نشده");
  await page.getByRole("button", { name: "صفحه بعد", exact: true }).click();
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText(prefix);
  await expect(page.getByRole("status")).toContainText(
    "نمایش ۲۱ تا ۲۱ از ۲۱ محتوا",
  );
  await page.getByRole("button", { name: "صفحه قبل", exact: true }).click();
  await expect(rows).toHaveCount(20);
  await search(page, prefix);
  const statuses = page.getByRole("group", {
    name: "نمایش بر اساس وضعیت",
    exact: true,
  });
  await statuses.getByRole("button", { name: "منتشرشده", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "محتوایی با این مشخصات پیدا نشد" }),
  ).toBeVisible();
  await statuses.getByRole("button", { name: "پیش‌نویس", exact: true }).click();
  await expect(rows).toHaveCount(20);
  await page
    .getByRole("button", { name: "پاک کردن فیلترها", exact: true })
    .click();
  await expect(page.getByLabel("جست‌وجوی عنوان", { exact: true })).toHaveValue(
    "",
  );
  await expect(page.getByLabel("نوع محتوا", { exact: true })).toHaveValue("");
});

test("responsive content desk and creation sheet are accessible and retain useful API errors", async ({
  page,
}, info) => {
  await login(page, "09120000002");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/admin/content");
  await expect(
    page.getByRole("heading", { name: "مدیریت محتوای سایت", exact: true }),
  ).toBeVisible();
  const directory = path.resolve("../../docs/qa/content-manager");
  await mkdir(directory, { recursive: true });
  await page.screenshot({
    path: path.join(directory, `content-desktop-${info.project.name}.png`),
  });
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  for (const width of [1200, 1024, 768, 480, 360]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
  const firstRow = await page
    .getByRole("list", { name: "محتواهای سایت", exact: true })
    .getByRole("listitem")
    .first()
    .boundingBox();
  expect(firstRow?.y).toBeLessThan(900);
  await page.screenshot({
    path: path.join(directory, `content-mobile-${info.project.name}.png`),
  });
  await page.getByRole("button", { name: "افزودن محتوا", exact: true }).click();
  const dialog = page.getByRole("dialog", {
    name: "محتوای تازه بسازید",
    exact: true,
  });
  await expect(dialog).toBeVisible();
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
    path: path.join(directory, `create-mobile-${info.project.name}.png`),
  });
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "افزودن محتوا", exact: true }),
  ).toBeFocused();
  const slug = `question-${randomUUID().slice(0, 8)}`;
  for (let pass = 0; pass < 2; pass++) {
    if (pass) await page.goto("/admin/content");
    await page
      .getByRole("button", { name: "افزودن محتوا", exact: true })
      .click();
    await dialog
      .getByLabel("نوع محتوای جدید", { exact: true })
      .selectOption("faq");
    await dialog
      .getByLabel("عنوان محتوای جدید", { exact: true })
      .fill("پرسش پذیرش فهرست محتوا");
    await dialog.getByLabel("آدرس محتوای جدید", { exact: true }).fill(slug);
    await dialog
      .getByRole("button", { name: "ایجاد پیش‌نویس", exact: true })
      .click();
    if (!pass) {
      await expect(page).toHaveURL(/\/admin\/content\/[0-9a-f-]{36}$/);
      const id = page.url().split("/").at(-1)!;
      const saved = (await (
        await page.request.get(`/api/v1/admin/content/${id}`)
      ).json()) as AdminContent;
      expect(saved.kind).toBe("faq");
    } else {
      await expect(dialog.getByRole("alert")).toBeVisible();
      await expect(
        dialog.getByLabel("آدرس محتوای جدید", { exact: true }),
      ).toHaveValue(slug);
    }
  }
  const result = (await (
    await page.request.get(
      `/api/v1/admin/content?kind=faq&q=${encodeURIComponent("پرسش پذیرش فهرست محتوا")}&page_size=100`,
    )
  ).json()) as CmsPage<AdminContent>;
  expect(result.items.filter((item) => item.slug === slug)).toHaveLength(1);
});
