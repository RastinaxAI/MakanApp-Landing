import { test, expect, type Page } from "@playwright/test";
async function write(
  page: Page,
  path: string,
  data: unknown,
  version?: number,
) {
  const token = (
    await (await page.request.get("/api/v1/admin/auth/csrf")).json()
  ).csrf_token;
  const response = await page.request.post(`/api/v1/admin/${path}`, {
    headers: {
      Origin: process.env.E2E_BASE_URL ?? "http://127.0.0.1:3100",
      "X-CSRF-Token": token,
      ...(version ? { "If-Match": String(version) } : {}),
    },
    data,
  });
  expect(response.status()).toBe(version ? 200 : 201);
  return response.json();
}
test("published series-only taxonomy has a usable filtered category page", async ({
  page,
}, info) => {
  await page.goto("/admin/login");
  await page
    .getByLabel("ایمیل مدیر", { exact: true })
    .fill("editor@example.com");
  await page
    .getByLabel("رمز عبور", { exact: true })
    .fill(process.env.E2E_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "ورود به پنل", exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
  const slug = `series-category-${info.project.name}`;
  const category = await write(page, "learn/categories", {
    slug,
    title: "دسته اختصاصی مجموعه",
  });
  const member = await write(page, "learn/contents", {
    slug: `cat-member-${info.project.name}`,
    title: "قسمت واقعی آزمون",
    payload: {
      kind: "article",
      headline: "قسمت واقعی آزمون",
      summary: "آزمون رابطه دسته مجموعه در دیتابیس جداگانه",
      body_html: "<h2>شروع</h2><p>راهنمای آزمون</p>",
      audiences: ["teacher"],
    },
  });
  await write(
    page,
    `learn/contents/${member.id}/publish`,
    { revision_id: member.revision_id },
    1,
  );
  const series = await write(page, "learn/series", {
    slug: `cat-series-${info.project.name}`,
    title: "مجموعه دسته‌دار",
    payload: {
      kind: "series",
      headline: "مجموعه دسته‌دار",
      summary: "آزمون فیلتر و لینک واقعی مجموعه",
      audiences: ["teacher"],
      item_ids: [member.id],
      category_ids: [category.id],
    },
  });
  await write(
    page,
    `learn/series/${series.id}/publish`,
    { revision_id: series.revision_id },
    1,
  );
  expect((await page.request.get(`/learn/categories/${slug}`)).status()).toBe(
    200,
  );
  await page.goto(`/learn/categories/${slug}`);
  await expect(
    page.getByRole("heading", { level: 1, name: "دسته اختصاصی مجموعه" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "مجموعه دسته‌دار", exact: true }),
  ).toHaveAttribute("href", `/learn/series/${series.slug}`);
  await page.goto(`/learn?category=${slug}&audience=parent`);
  await expect(
    page.getByRole("link", { name: "مجموعه دسته‌دار", exact: true }),
  ).toHaveCount(0);
});
