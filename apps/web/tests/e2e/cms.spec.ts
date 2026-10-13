import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import type {
  AdminContent,
  CmsSettings,
  FaqCategory,
} from "../../src/features/cms/types";

test.beforeEach(() => test.setTimeout(120_000));
async function login(page: Page, role = "editor") {
  await page.goto("/admin/login");
  await page
    .getByLabel("ایمیل مدیر", { exact: true })
    .fill(`${role}@example.com`);
  await page
    .getByLabel("رمز عبور", { exact: true })
    .fill(process.env.E2E_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "ورود به پنل", exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
}
async function mutate(
  page: Page,
  endpoint: string,
  method: string,
  data?: unknown,
  version?: number,
) {
  const csrf = await page.request.get("/api/v1/admin/auth/csrf");
  expect(csrf.status()).toBe(200);
  return page.request.fetch(`/api/v1/admin/${endpoint}`, {
    method,
    headers: {
      Origin: "http://127.0.0.1:3100",
      "X-CSRF-Token": (await csrf.json()).csrf_token,
      ...(version ? { "If-Match": String(version) } : {}),
    },
    data,
  });
}
async function makePage(page: Page, slug: string) {
  const response = await mutate(page, "content", "POST", {
    title: "صفحه آزمون واقعی CMS",
    slug,
    payload: {
      kind: "page",
      headline: "تیتر خصوصی آزمون",
      summary: "آزمون پذیرش در دیتابیس مجزای واقعی",
      sections: [
        { type: "rich-text", title: "توضیح", body_html: "<p>متن اولیه</p>" },
      ],
    },
  });
  expect(response.status()).toBe(201);
  return (await response.json()) as AdminContent;
}

test("CMS home, feature and audience editors publish their own data and preserve prior versions", async ({
  page,
}, info) => {
  await login(page);
  const initial = await (
    await page.request.get("/api/v1/admin/content?page_size=100")
  ).json();
  for (const [kind, slug] of [
    ["home", "home"],
    ["feature", "school"],
    ["audience", "teachers"],
  ]) {
    const source = initial.items.find(
      (item: AdminContent) => item.kind === kind && item.slug === slug,
    ) as AdminContent;
    try {
      await page.goto(`/admin/content/${source.id}`);
      const headline = `تیتر پذیرش ${kind} ${info.project.name}`;
      await page
        .getByLabel(kind === "home" ? "عنوان بخش 1" : "تیتر اصلی", {
          exact: true,
        })
        .fill(headline);
      if (kind === "audience") {
        const pains = page.getByLabel("مسئله‌های مخاطب؛ هر سطر یک مورد", {
          exact: true,
        });
        await pains.fill("مسئله اول");
        await pains.press("End");
        await pains.press("Enter");
        await pains.pressSequentially("مسئله دوم");
        await expect(pains).toHaveValue("مسئله اول\nمسئله دوم");
        const related = page.getByLabel("امکانات مرتبط؛ آدرس‌ها با ویرگول", {
          exact: true,
        });
        await related.fill("school");
        await related.press("End");
        await related.pressSequentially(",reports");
        await expect(related).toHaveValue("school,reports");
      }
      await page
        .getByRole("button", { name: "ذخیره پیش‌نویس", exact: true })
        .click();
      await expect(page.getByRole("status")).toContainText("پیش‌نویس ذخیره شد");
      const apiRoute =
        kind === "home"
          ? "pages/home"
          : kind === "feature"
            ? "features/school"
            : "audiences/teachers";
      const draftCheck = await (
        await page.request.get(`/api/v1/${apiRoute}`)
      ).json();
      expect(JSON.stringify(draftCheck.payload)).not.toContain(headline);
      await page
        .getByRole("link", { name: "پیش‌نمایش خصوصی", exact: true })
        .click();
      await expect(page.getByRole("heading", { level: 1 })).toContainText(
        headline,
      );
      await page
        .getByRole("link", { name: "بازگشت به ویرایش", exact: true })
        .click();
      await page
        .getByRole("button", { name: "انتشار نسخه ذخیره‌شده", exact: true })
        .click();
      await expect(page.getByRole("status")).toContainText("موفقیت");
      const route =
        kind === "home"
          ? "/"
          : kind === "feature"
            ? "/features/school"
            : "/solutions/teachers";
      await page.goto(route);
      await expect(page.getByRole("heading", { level: 1 })).toContainText(
        headline,
      );
    } finally {
      const current = (await (
        await page.request.get(`/api/v1/admin/content/${source.id}`)
      ).json()) as AdminContent;
      expect(
        (
          await mutate(
            page,
            `content/${source.id}/publish`,
            "POST",
            { revision_id: source.published_revision_id },
            current.row_version,
          )
        ).status(),
      ).toBe(200);
    }
  }
  const specialSlug = {
    chromium: "constructor",
    firefox: "toString",
    webkit: "__proto__",
  }[info.project.name]!;
  for (const kind of ["feature", "audience"] as const) {
    const source = initial.items.find(
      (item: AdminContent) => item.kind === kind,
    ) as AdminContent;
    const response = await mutate(page, "content", "POST", {
      slug: specialSlug,
      title: "عنوان آزمون آدرس ویژه",
      payload: {
        ...source.payload,
        ...(kind === "feature"
          ? { readiness: "roadmap", evidence_reference: "" }
          : {}),
      },
    });
    expect(response.status()).toBe(201);
    const content = (await response.json()) as AdminContent;
    try {
      expect(
        (
          await mutate(
            page,
            `content/${content.id}/publish`,
            "POST",
            { revision_id: content.revision_id },
            content.row_version,
          )
        ).status(),
      ).toBe(200);
      const route = kind === "feature" ? "/features" : "/solutions";
      expect((await page.goto(route))!.status()).toBe(200);
      await expect(
        page.locator(
          `a[href="${kind === "feature" ? "/features" : "/solutions"}/${specialSlug}"]`,
        ),
      ).toBeVisible();
    } finally {
      const current = (await (
        await page.request.get(`/api/v1/admin/content/${content.id}`)
      ).json()) as AdminContent;
      expect(
        (
          await mutate(
            page,
            `content/${content.id}`,
            "DELETE",
            undefined,
            current.row_version,
          )
        ).status(),
      ).toBe(200);
    }
  }
});

test("CMS UI creates, previews privately, publishes and restores an immutable revision", async ({
  page,
  browser,
}, info) => {
  await login(page);
  await page.goto("/admin/content");
  const slug = `ui-${info.project.name}`;
  await page
    .getByLabel("عنوان محتوای جدید", { exact: true })
    .fill("صفحه ایجادشده از پنل");
  await page.getByLabel("آدرس محتوای جدید", { exact: true }).fill(slug);
  await page
    .getByRole("button", { name: "ایجاد پیش‌نویس", exact: true })
    .click();
  await expect(page).toHaveURL(/\/admin\/content\/[0-9a-f-]{36}$/);
  const id = page.url().split("/").pop()!;
  const ssr = await (await page.request.get(`/admin/content/${id}`)).text();
  expect(ssr).toMatch(/<fieldset[^>]*disabled=""/);
  await page
    .getByLabel("تیتر اصلی", { exact: true })
    .fill("تیتر خصوصی نسخه نخست");
  await page
    .getByLabel("عنوان SEO", { exact: true })
    .fill("عنوان مستقل آزمون CMS");
  await page
    .getByRole("button", { name: "ذخیره پیش‌نویس", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("پیش‌نویس ذخیره شد");
  expect((await page.request.get(`/${slug}`)).status()).toBe(404);
  await page
    .getByRole("link", { name: "پیش‌نمایش خصوصی", exact: true })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "تیتر خصوصی نسخه نخست",
  );
  const guest = await browser.newContext();
  const guestPage = await guest.newPage();
  await guestPage.goto(page.url());
  await expect(guestPage).toHaveURL(/\/admin\/login$/);
  await guest.close();
  await page
    .getByRole("link", { name: "بازگشت به ویرایش", exact: true })
    .click();
  await page
    .getByRole("button", { name: "انتشار نسخه ذخیره‌شده", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("موفقیت");
  const original = await page.request.get(`/${slug}`);
  expect(original.status()).toBe(200);
  expect(await original.text()).toContain("تیتر خصوصی نسخه نخست");
  await page
    .getByLabel("تیتر اصلی", { exact: true })
    .fill("پیش‌نویس دوم منتشرنشده");
  await page
    .getByRole("button", { name: "ذخیره پیش‌نویس", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("پیش‌نویس ذخیره شد");
  const publicJson = await page.request.get(`/api/v1/pages/${slug}`);
  expect((await publicJson.json()).payload.headline).toBe(
    "تیتر خصوصی نسخه نخست",
  );
  const history = await page.request.get(
    `/api/v1/admin/content/${id}/revisions`,
  );
  expect((await history.json()).pagination.total).toBe(3);
  await page
    .getByRole("link", { name: "تاریخچه نسخه‌ها", exact: true })
    .click();
  const latest = page.getByRole("listitem").first();
  await latest
    .getByRole("button", { name: "انتشار این نسخه", exact: true })
    .click();
  await latest
    .getByRole("button", { name: "تأیید انتشار نسخه", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("عمومی شد");
  expect(
    (await (await page.request.get(`/api/v1/pages/${slug}`)).json()).payload
      .headline,
  ).toBe("پیش‌نویس دوم منتشرنشده");
  const earlier = page.getByRole("listitem").nth(1);
  await earlier
    .getByRole("button", { name: "انتشار این نسخه", exact: true })
    .click();
  await earlier
    .getByRole("button", { name: "تأیید انتشار نسخه", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("عمومی شد");
  expect(
    (await (await page.request.get(`/api/v1/pages/${slug}`)).json()).payload
      .headline,
  ).toBe("تیتر خصوصی نسخه نخست");
  await page.goto("/admin/content");
  await page
    .getByLabel("جست‌وجوی عنوان", { exact: true })
    .fill("صفحه ایجادشده از پنل");
  await page.getByRole("button", { name: "اعمال فیلتر", exact: true }).click();
  const row = page.getByRole("listitem").filter({ hasText: slug });
  await row.getByRole("button", { name: "بایگانی", exact: true }).click();
  await row.getByRole("button", { name: "تأیید بایگانی", exact: true }).click();
  await expect(row).toHaveCount(0);
  const archived = (await (
    await page.request.get(`/api/v1/admin/content/${id}`)
  ).json()) as AdminContent;
  expect(archived.publication_state).toBe("archived");
  expect((await page.request.get(`/${slug}`)).status()).toBe(404);
  await page.goto(`/admin/content/${id}`);
  await expect(
    page.getByRole("button", { name: "ذخیره پیش‌نویس", exact: true }),
  ).toBeDisabled();
  await expect(page.getByLabel("تیتر اصلی", { exact: true })).toBeDisabled();
});

test("CMS schedule, validation, rich text sanitization and stale writes use real API", async ({
  page,
}, info) => {
  await login(page);
  const content = await makePage(page, `schedule-${info.project.name}`);
  await page.goto(`/admin/content/${content.id}`);
  const editor = page.getByRole("textbox", { name: "متن بخش 1", exact: true });
  await editor.fill("پاراگراف نوشته‌شده در ویرایشگر");
  await editor.press("Control+a");
  await page.getByRole("button", { name: "پررنگ", exact: true }).click();
  await page
    .getByRole("button", { name: "ذخیره پیش‌نویس", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("پیش‌نویس ذخیره شد");
  let saved = (await (
    await page.request.get(`/api/v1/admin/content/${content.id}`)
  ).json()) as AdminContent;
  expect(saved.payload.kind).toBe("page");
  if (saved.payload.kind === "page")
    expect(saved.payload.sections[0]!.body_html).toContain("<strong>");
  const evil = {
    ...saved.payload,
    sections: [
      {
        type: "rich-text",
        title: "محتوای پاک",
        body_html:
          '<script>window.cmsXss=1</script><p onclick="alert(1)">متن امن</p><iframe src="https://evil.example.com"></iframe>',
      },
    ],
  };
  const clean = await mutate(
    page,
    `content/${content.id}`,
    "PATCH",
    { slug: content.slug, title: content.title, payload: evil },
    saved.row_version,
  );
  expect(clean.status()).toBe(200);
  saved = await clean.json();
  const stale = await mutate(
    page,
    `content/${content.id}`,
    "PATCH",
    { slug: content.slug, title: content.title, payload: evil },
    content.row_version,
  );
  expect(stale.status()).toBe(409);
  await page.reload();
  const future = new Date(Date.now() + 3600_000);
  const local = new Date(future.getTime() - future.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
  await page.getByLabel("تاریخ و ساعت انتشار", { exact: true }).fill(local);
  await page
    .getByRole("button", { name: "ثبت زمان‌بندی", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("موفقیت");
  expect(
    (await page.request.get(`/api/v1/pages/${content.slug}`)).status(),
  ).toBe(404);
  await page
    .getByRole("button", { name: "لغو زمان‌بندی", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("موفقیت");
  await page
    .getByRole("link", { name: "پیش‌نمایش خصوصی", exact: true })
    .click();
  await expect(page.getByText("متن امن", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => Object.hasOwn(window, "cmsXss"))).toBe(
    false,
  );
  await expect(page.locator("iframe")).toHaveCount(0);
  await page
    .getByRole("link", { name: "بازگشت به ویرایش", exact: true })
    .click();
  await page
    .getByRole("button", { name: "انتشار نسخه ذخیره‌شده", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("موفقیت");
  await page.getByRole("button", { name: "توقف انتشار", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("موفقیت");
  expect(
    (await page.request.get(`/api/v1/pages/${content.slug}`)).status(),
  ).toBe(404);
});

test("CMS media upload stays private until publication and protects referenced files", async ({
  page,
}, info) => {
  await login(page);
  await page.goto("/admin/media");
  const alt = `تصویر پذیرش ${info.project.name}`;
  await expect(page.getByLabel("فایل تصویر", { exact: true })).toBeEnabled();
  await page
    .getByLabel("فایل تصویر", { exact: true })
    .setInputFiles(path.resolve("tests/fixtures/cms.png"));
  await page.getByLabel("متن جایگزین تصویر", { exact: true }).fill(alt);
  await page
    .getByRole("button", { name: "بارگذاری تصویر", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("فضای خصوصی");
  const mediaList = await (
    await page.request.get("/api/v1/admin/media?page_size=100")
  ).json();
  const asset = mediaList.items.find(
    (m: { alt_text: string }) => m.alt_text === alt,
  );
  expect(asset).toBeTruthy();
  expect(
    (await page.request.get(`/api/v1/media/${asset.id}/file`)).status(),
  ).toBe(404);
  const content = await makePage(page, `image-${info.project.name}`);
  await page.goto(`/admin/content/${content.id}`);
  await page.getByLabel("تصویر بخش 1", { exact: true }).selectOption(asset.id);
  await page.getByLabel("عنوان بخش 1", { exact: true }).fill("");
  await page
    .getByRole("button", { name: "ذخیره پیش‌نویس", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("پیش‌نویس ذخیره شد");
  await page
    .getByRole("link", { name: "پیش‌نمایش خصوصی", exact: true })
    .click();
  await expect(page.getByRole("img", { name: alt, exact: true })).toBeVisible();
  const privateImage = page.getByRole("img", { name: alt, exact: true });
  await privateImage.scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      privateImage.evaluate((img: HTMLImageElement) => img.naturalWidth),
    )
    .toBe(48);
  await page
    .getByRole("link", { name: "بازگشت به ویرایش", exact: true })
    .click();
  await page
    .getByRole("button", { name: "انتشار نسخه ذخیره‌شده", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("موفقیت");
  const file = await page.request.get(`/api/v1/media/${asset.id}/file`);
  expect(file.status()).toBe(200);
  expect(file.headers()["content-type"]).toContain("image/webp");
  await page.goto(`/${content.slug}`);
  await expect(page.locator("h2").filter({ hasText: /^\s*$/ })).toHaveCount(0);
  const image = page.getByRole("img", { name: alt, exact: true });
  await expect(image).toBeVisible();
  await expect
    .poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBeGreaterThan(0);
  const metadata = await page.request.get(`/api/v1/media/${asset.id}`);
  expect(Object.keys(await metadata.json()).sort()).toEqual([
    "alt_text",
    "height",
    "id",
    "width",
  ]);
  expect((await mutate(page, `media/${asset.id}`, "DELETE")).status()).toBe(
    409,
  );
});

test("CMS categorized FAQ editing reaches public SSR and owner settings enforce roles", async ({
  page,
}, info) => {
  await login(page);
  await page.goto("/admin/faq-categories");
  const slug = `faq-${info.project.name}`;
  await page
    .getByLabel("نام دسته", { exact: true })
    .fill(`دسته آزمون ${info.project.name}`);
  await page.getByLabel("آدرس دسته", { exact: true }).fill(slug);
  await page.getByRole("button", { name: "ذخیره دسته", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("ذخیره شد");
  const cats = (
    await (
      await page.request.get("/api/v1/admin/faq-categories?page_size=100")
    ).json()
  ).items as FaqCategory[];
  const category = cats.find((c) => c.slug === slug)!;
  const created = await mutate(page, "faqs", "POST", {
    slug,
    title: "پرسش پذیرش",
    category_id: category.id,
    payload: {
      kind: "faq",
      question: `پرسش پذیرش ${info.project.name}؟`,
      answer: "پاسخ اولیه",
    },
  });
  expect(created.status()).toBe(201);
  const faq = (await created.json()) as AdminContent;
  await page.goto(`/admin/content/${faq.id}`);
  await page
    .getByLabel("پاسخ متنی", { exact: true })
    .fill("پاسخ تأییدشده از پنل مدیریت");
  await page
    .getByRole("button", { name: "ذخیره پیش‌نویس", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("پیش‌نویس ذخیره شد");
  const storedFaq = (await (
    await page.request.get(`/api/v1/admin/content/${faq.id}`)
  ).json()) as AdminContent;
  expect(storedFaq.payload.kind).toBe("faq");
  if (storedFaq.payload.kind === "faq")
    expect(storedFaq.payload.answer).toBe("پاسخ تأییدشده از پنل مدیریت");
  await page
    .getByRole("button", { name: "انتشار نسخه ذخیره‌شده", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("موفقیت");
  await page.goto(`/faq?category=${category.id}`);
  await page
    .getByRole("button", {
      name: `پرسش پذیرش ${info.project.name}؟`,
      exact: true,
    })
    .click();
  await expect(
    page.getByText("پاسخ تأییدشده از پنل مدیریت", { exact: true }),
  ).toBeVisible();
  expect(
    (await mutate(page, `faq-categories/${category.id}`, "DELETE")).status(),
  ).toBe(409);
  await page.goto("/admin/settings");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "برای این بخش دسترسی ندارید.",
  );
  expect((await page.request.get("/api/v1/admin/settings")).status()).toBe(403);
});

test("CMS owner saves official contact settings and public rendering reads the database", async ({
  page,
}) => {
  await login(page, "owner");
  const original = (await (
    await page.request.get("/api/v1/admin/settings")
  ).json()) as CmsSettings;
  try {
    await page.goto("/admin/settings");
    await page
      .getByLabel("ایمیل رسمی", { exact: true })
      .fill("cms-acceptance@example.com");
    await page
      .getByRole("button", { name: "ذخیره تنظیمات", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText("ذخیره شد");
    await page.goto("/contact");
    await expect(
      page
        .getByRole("link", { name: "cms-acceptance@example.com", exact: true })
        .first(),
    ).toHaveAttribute("href", "mailto:cms-acceptance@example.com");
  } finally {
    const current = (await (
      await page.request.get("/api/v1/admin/settings")
    ).json()) as CmsSettings;
    expect(
      (
        await mutate(
          page,
          "settings",
          "PATCH",
          { general: original.general, seo: original.seo },
          current.row_version,
        )
      ).status(),
    ).toBe(200);
  }
});

for (const width of [360, 768, 1440])
  test(`CMS responsive forms and private preview pass axe at ${width}px`, async ({
    page,
  }, info) => {
    await login(page, "owner");
    await page.setViewportSize({ width, height: 900 });
    const content = await makePage(page, `audit-${width}-${info.project.name}`);
    for (const route of [
      "/admin/content",
      `/admin/content/${content.id}`,
      "/admin/media",
      "/admin/settings",
      `/admin/preview/${content.id}`,
    ]) {
      await page.goto(route);
      if (!route.includes("/preview/"))
        await expect(
          page.getByRole("main").locator("fieldset").first(),
        ).not.toHaveAttribute("disabled", "");
      if (route.includes(content.id) && !route.includes("/preview/"))
        await expect(
          page.getByRole("textbox", { name: "متن بخش 1", exact: true }),
        ).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        route,
      ).toBe(true);
      const audit = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      await info.attach(`axe-cms-${route}`, {
        body: JSON.stringify(audit),
        contentType: "application/json",
      });
      expect(audit.violations, route).toEqual([]);
      const directory = path.resolve("../../docs/qa/step6", info.project.name);
      await mkdir(directory, { recursive: true });
      await page.screenshot({
        path: path.join(
          directory,
          `cms-${route.includes("preview") ? "preview" : route.includes(content.id) ? "editor" : route.split("/").pop()}-${width}.png`,
        ),
        fullPage: true,
        animations: "disabled",
      });
    }
  });
