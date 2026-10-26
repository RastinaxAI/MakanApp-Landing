import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { login } from "./helpers";
import { defaultGlobals, emptyStyles } from "../../src/features/builder/types";
import type { AdminContent } from "../../src/features/cms/types";

async function create(
  page: Page,
  resource: string,
  data: unknown,
  version?: number,
  method = "POST",
) {
  const csrf = await (await page.request.get("/api/v1/admin/auth/csrf")).json();
  const response = await page.request.fetch(`/api/v1/admin/${resource}`, {
    method,
    headers: {
      Origin: process.env.E2E_BASE_URL || "http://127.0.0.1:3200",
      "X-CSRF-Token": csrf.csrf_token,
      ...(version ? { "If-Match": String(version) } : {}),
    },
    data,
  });
  expect(response.status(), await response.text()).toBe(version ? 200 : 201);
  return response.json();
}

for (const domain of ["learn", "blog"] as const) {
  test(`${domain}: search and popup filters use published database content and shareable URLs`, async ({
    page,
  }) => {
    await login(page);
    const term = `search-${randomUUID().slice(0, 8)}`;
    const category = await create(page, "learn/categories", {
      domain,
      slug: `${term}-category`,
      title: "دسته آزمون جست‌وجو",
    });
    const tag = await create(page, "learn/tags", {
      domain,
      slug: `${term}-tag`,
      title: "برچسب آزمون",
    });
    const resource = domain === "learn" ? "learn/contents" : "blog/articles";
    for (const audience of ["teacher", "parent", "draft"]) {
      const item = await create(page, resource, {
        slug: `${term}-${audience}`,
        title: `${term} ${audience}`,
        payload: {
          kind: domain === "learn" ? "article" : "blog",
          headline: `${term} ${audience}`,
          summary: "محتوای آزمون در پایگاه داده جداگانه",
          body_html: "<p>محتوای واقعی آزمون جست‌وجو و فیلتر</p>",
          audiences: [audience === "draft" ? "teacher" : audience],
          level: "beginner",
          topic: "getting-started",
          category_ids: [category.id],
          tag_ids: [tag.id],
        },
      });
      if (audience !== "draft")
        await create(
          page,
          `${resource}/${item.id}/publish`,
          { revision_id: item.revision_id },
          item.row_version,
        );
    }
    await page.goto(`/${domain}`);
    await page
      .getByRole("search")
      .getByLabel("جست‌وجو", { exact: true })
      .fill(term);
    await page
      .getByRole("search")
      .getByRole("button", { name: "جست‌وجو", exact: true })
      .click();
    await expect(page.locator(".public-learning-card")).toHaveCount(2);
    await expect(page.getByRole("link", { name: `${term} draft` })).toHaveCount(
      0,
    );
    await page.getByRole("button", { name: "فیلترها", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("مخاطب", { exact: true }).selectOption("teacher");
    await dialog
      .getByLabel("موضوع", { exact: true })
      .selectOption("getting-started");
    await dialog
      .getByLabel("دسته‌بندی", { exact: true })
      .selectOption(category.slug);
    await dialog.getByLabel("برچسب", { exact: true }).selectOption(tag.slug);
    await dialog
      .getByLabel("مرتب‌سازی", { exact: true })
      .selectOption("popular");
    if (domain === "learn")
      await dialog
        .getByLabel("نوع محتوا", { exact: true })
        .selectOption("article");
    else
      await expect(dialog.getByLabel("نوع محتوا", { exact: true })).toHaveCount(
        0,
      );
    await dialog.getByRole("button", { name: "اعمال فیلترها" }).click();
    await expect(page.locator(".public-learning-card")).toHaveCount(1);
    let url = new URL(page.url());
    expect(url.searchParams.get("q")).toBe(term);
    expect(url.searchParams.get("audience")).toBe("teacher");
    expect(url.searchParams.get("category")).toBe(category.slug);
    expect(url.searchParams.has("page")).toBe(false);
    await page.reload();
    await expect(page.locator(".public-learning-card")).toHaveCount(1);
    await page.getByRole("button", { name: "فیلترها", exact: true }).click();
    await expect(dialog.getByLabel("برچسب", { exact: true })).toHaveValue(
      tag.slug,
    );
    await dialog.getByLabel("مخاطب", { exact: true }).selectOption("parent");
    await dialog.getByRole("button", { name: "انصراف", exact: true }).click();
    await page.getByRole("button", { name: "فیلترها", exact: true }).click();
    await expect(dialog.getByLabel("مخاطب", { exact: true })).toHaveValue(
      "teacher",
    );
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("button", { name: "فیلترها", exact: true }),
    ).toBeFocused();
    await page
      .getByRole("search")
      .getByLabel("جست‌وجو", { exact: true })
      .fill(`${term} ناموجود`);
    await page
      .getByRole("search")
      .getByRole("button", { name: "جست‌وجو", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "مطلبی با این فیلترها یافت نشد." }),
    ).toBeVisible();
    url = new URL(page.url());
    expect(url.searchParams.get("tag")).toBe(tag.slug);
    expect(url.searchParams.get("sort")).toBe("popular");
    await page
      .getByRole("link", { name: "حذف فیلتر مخاطب", exact: true })
      .click();
    await expect(page).toHaveURL((url) => !url.searchParams.has("audience"));
    await page
      .getByRole("link", { name: "پاک‌کردن فیلترها", exact: true })
      .click();
    await expect(page).toHaveURL(new RegExp(`/${domain}$`));
    await expect(
      page.getByRole("search").getByLabel("جست‌وجو", { exact: true }),
    ).toHaveValue("");
    if (domain === "learn") {
      await page.goto(`/learn/categories/${category.slug}`);
      await page.getByRole("button", { name: "فیلترها", exact: true }).click();
      await expect(dialog.getByLabel("دسته‌بندی", { exact: true })).toHaveCount(
        0,
      );
      await dialog.getByLabel("مخاطب", { exact: true }).selectOption("teacher");
      await dialog.getByRole("button", { name: "اعمال فیلترها" }).click();
      expect(new URL(page.url()).pathname).toBe(
        `/learn/categories/${category.slug}`,
      );
      await expect(page.locator(".public-learning-card")).toHaveCount(1);
    }
  });
}

test("centered introductions and filter popup work on phone, tablet and desktop", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const directory = path.resolve(
    `../../docs/qa/${process.env.MAKAN_QA_PHASE || "public-library-search"}/${info.project.name}`,
  );
  await mkdir(directory, { recursive: true });
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: width === 320 ? 640 : 960 });
    for (const route of ["learn", "blog", "solutions"]) {
      expect((await page.goto(`/${route}`))?.status()).toBe(200);
      await page.evaluate(() => document.fonts.ready);
      const heading = page.getByRole("heading", { level: 1 });
      await expect(heading).toHaveCount(1);
      await expect(heading).toHaveCSS("text-align", "center");
      const box = await heading.evaluate((element) => {
        const range = document.createRange();
        range.selectNodeContents(element);
        const bounds = range.getBoundingClientRect();
        return { x: bounds.x, width: bounds.width };
      });
      expect(box).not.toBeNull();
      expect(Math.abs(box!.x + box!.width / 2 - width / 2)).toBeLessThan(2);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      ).toBe(true);
      await page.screenshot({
        path: path.join(directory, `${route}-${width}.png`),
      });
      if (route !== "solutions") {
        await page
          .getByRole("button", { name: "فیلترها", exact: true })
          .click();
        const dialog = page.getByRole("dialog");
        await expect(dialog).toBeVisible();
        const bounds = await dialog.boundingBox();
        expect(bounds!.x).toBeGreaterThanOrEqual(0);
        expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
        expect(bounds!.y).toBeGreaterThanOrEqual(0);
        expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(
          page.viewportSize()!.height,
        );
        await dialog
          .getByLabel("مرتب‌سازی", { exact: true })
          .scrollIntoViewIfNeeded();
        await expect(
          dialog.getByRole("button", { name: "اعمال فیلترها" }),
        ).toBeVisible();
        expect(
          (
            await new AxeBuilder({ page })
              .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
              .analyze()
          ).violations,
        ).toEqual([]);
        await page.screenshot({
          path: path.join(directory, `${route}-filters-${width}.png`),
        });
        await page.keyboard.press("Escape");
        await expect(dialog).toHaveCount(0);
        await expect(
          page.getByRole("button", { name: "فیلترها", exact: true }),
        ).toBeFocused();
      }
    }
  }
  expect(errors).toEqual([]);
});

test("converted page-builder introductions center the text itself without changing stored content", async ({
  page,
}) => {
  await login(page);
  const records = (
    await (
      await page.request.get("/api/v1/admin/content?kind=page&page_size=100")
    ).json()
  ).items as AdminContent[];
  for (const slug of ["learn", "blog", "solutions"]) {
    const original = records.find((item) => item.slug === slug)!;
    expect(original.published_revision_id).toBeTruthy();
    if (original.payload.kind !== "page")
      throw new Error("Page fixture required");
    const title = original.payload.headline;
    try {
      const saved = await create(
        page,
        `content/${original.id}`,
        {
          slug: original.slug,
          title: original.title,
          payload: {
            ...original.payload,
            document: {
              schema_version: 2,
              purpose: "page",
              globals: defaultGlobals,
              nodes: [
                {
                  id: "page_heading",
                  type: "Heading",
                  version: 1,
                  props: { title, level: 1 },
                  styles: emptyStyles(),
                  children: [],
                },
                {
                  id: "page_summary",
                  type: "RichText",
                  version: 1,
                  props: {
                    body_html:
                      "<p>معرفی صفحه با محتوای ذخیره‌شده در صفحه‌ساز ماکان.</p>",
                  },
                  styles: emptyStyles(),
                  children: [],
                },
              ],
            },
          },
          seo: original.seo,
          visibility: original.visibility,
          sort_order: original.sort_order,
        },
        original.row_version,
        "PATCH",
      );
      await create(
        page,
        `content/${saved.id}/publish`,
        { revision_id: saved.revision_id },
        saved.row_version,
      );
      for (const width of [320, 768, 1440]) {
        await page.setViewportSize({ width, height: 960 });
        expect((await page.goto(`/${slug}`))?.status()).toBe(200);
        await page.evaluate(() => document.fonts.ready);
        const heading = page.getByRole("heading", { level: 1 });
        await expect(heading).toHaveText(title);
        await expect(heading).toHaveCSS("text-align", "center");
        const box = await heading.evaluate((element) => {
          const range = document.createRange();
          range.selectNodeContents(element);
          const bounds = range.getBoundingClientRect();
          return { x: bounds.x, width: bounds.width };
        });
        expect(Math.abs(box.x + box.width / 2 - width / 2)).toBeLessThan(2);
        const header = await page.getByRole("banner").boundingBox();
        const bounds = await heading.boundingBox();
        expect(bounds!.y - (header!.y + header!.height)).toBeGreaterThanOrEqual(
          39,
        );
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
        ).toBe(true);
      }
    } finally {
      const current = await (
        await page.request.get(`/api/v1/admin/content/${original.id}`)
      ).json();
      await create(
        page,
        `content/${original.id}/publish`,
        { revision_id: original.published_revision_id },
        current.row_version,
      );
    }
  }
});
