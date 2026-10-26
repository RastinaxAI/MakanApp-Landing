import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { login } from "./helpers";
import {
  initialPayload,
  resourceFor,
  type LearningPayload,
} from "../../src/features/learning/types";

const directory = path.resolve("../../docs/qa/admin-unified");
async function ready(page: Page) {
  await page.waitForFunction(
    () => !document.querySelector("fieldset[disabled]"),
  );
  await page.evaluate(() => document.fonts.ready);
}
async function create(page: Page, resource: string, data: unknown) {
  const csrf = await (await page.request.get("/api/v1/admin/auth/csrf")).json();
  const response = await page.request.post(`/api/v1/admin/${resource}`, {
    headers: {
      "X-CSRF-Token": csrf.csrf_token,
      Origin: "http://127.0.0.1:3200",
    },
    data,
  });
  expect(response.status(), `${resource}: ${await response.text()}`).toBe(201);
  return response.json();
}
async function review(page: Page, name: string, engine: string, full = true) {
  await ready(page);
  await mkdir(directory, { recursive: true });
  for (const [width, label] of [
    [1440, "desktop"],
    [360, "mobile"],
  ] as const) {
    await page.setViewportSize({ width, height: 1000 });
    await page.evaluate(() => {
      window.scrollTo({ left: 0, top: 0, behavior: "instant" });
      return new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
    });
    if (
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      )
    ) {
      const layout = await page.evaluate(() =>
        Array.from(
          document.querySelectorAll(
            "html,body,#admin-main,.admin-page,[data-slot='tabs'],[role='tabpanel'],.crm-board,.crm-table-scroll,.crm-lane",
          ),
        ).map((element) => {
          const box = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return {
            tag: element.tagName,
            class: element.className,
            width: box.width,
            x: box.x,
            scrollWidth: element.scrollWidth,
            minWidth: style.minWidth,
            display: style.display,
            columns: style.gridTemplateColumns,
            overflow: style.overflow,
            position: style.position,
            scrollLeft: element.scrollLeft,
          };
        }),
      );
      await test.info().attach(`overflow-${name}-${width}`, {
        body: JSON.stringify(layout),
        contentType: "application/json",
      });
    }
    expect
      .soft(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${name} ${width}`,
      )
      .toBe(true);
    const axe = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect.soft(axe.violations, `${name} ${label}`).toEqual([]);
    await page.screenshot({
      path: path.join(directory, `${name}-${label}-${engine}.png`),
    });
  }
  if (full)
    for (const width of [1200, 1024, 768, 480]) {
      await page.setViewportSize({ width, height: 900 });
      expect
        .soft(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          `${name} ${width}`,
        )
        .toBe(true);
    }
}

test("login shares the content desk language and keeps the real two stage OTP flow", async ({
  page,
}, info) => {
  await page.goto("/admin/login");
  await expect(
    page.getByRole("heading", { name: "ورود مدیر", exact: true }),
  ).toBeVisible();
  await review(page, "login-phone", info.project.name);
  await page.getByLabel("شماره همراه", { exact: true }).fill("09120000001");
  await page
    .getByRole("button", { name: "دریافت کد ورود", exact: true })
    .click();
  await expect(page.getByLabel("کد ورود", { exact: true })).toBeVisible();
  await review(page, "login-otp", info.project.name, false);
  await page.getByLabel("کد ورود", { exact: true }).fill("111111");
  await page.getByRole("button", { name: "ورود به پنل", exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
});

test("all remaining admin routes and nested editors follow the approved content reference", async ({
  page,
}, info) => {
  test.setTimeout(600000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await login(page);
  const suffix = randomUUID().slice(0, 8);
  const cms = await create(page, "content", {
    title: `برگهٔ هماهنگی ${suffix}`,
    slug: `unified-${suffix}`,
    payload: {
      kind: "page",
      headline: "برگهٔ آزمون",
      summary: "شرح برگهٔ آزمون",
      sections: [],
    },
  });
  const faq = await create(page, "content", {
    title: `پرسش هماهنگی ${suffix}`,
    slug: `unified-faq-${suffix}`,
    payload: {
      kind: "faq",
      question: "ماکان چگونه به مدرسه کمک می‌کند؟",
      answer: "امکانات آموزشی و ارتباطی را در یک فضای یکپارچه ارائه می‌کند.",
    },
  });
  const lead = await create(page, "leads", {
    full_name: `مسئول آزمون ${suffix}`,
    phone: `0912777888${info.project.name === "chromium" ? "1" : info.project.name === "firefox" ? "2" : "3"}`,
    school_name: `مدرسه آزمون ${suffix}`,
    consent: true,
  });
  const school = await create(page, "crm/schools", {
    name: `آموزشگاه آزمون ${suffix}`,
    city: "تهران",
  });
  const routes: [string, string][] = [
    ["dashboard", "/admin"],
    ["library", "/admin/builder"],
    ["content-reference", "/admin/content"],
    ["crm", "/admin/crm"],
    ["requests", "/admin/leads"],
    ["analytics", "/admin/analytics"],
    ["content-faq", `/admin/content/${faq.id}`],
    ["content-metadata", `/admin/content/${cms.id}?mode=metadata`],
    ["revisions", `/admin/content/${cms.id}/revisions`],
    ["request-detail", `/admin/leads/${lead.id}`],
    ["customer-lead", `/admin/crm/leads/${lead.id}`],
    ["customer-school", `/admin/crm/schools/${school.id}`],
  ];
  for (const kind of [
    "article",
    "video",
    "series",
    "blog",
  ] as LearningPayload["kind"][]) {
    const item = await create(page, resourceFor(kind), {
      title: `آموزش ${kind} ${suffix}`,
      slug: `unified-${kind}-${suffix}`,
      payload: {
        ...initialPayload(kind),
        headline: `راهنمای ${kind}`,
        summary: "راهنمای واقعی برای بررسی نمایش و ذخیرهٔ محتوا",
      },
    });
    routes.push(
      [`learn-new-${kind}`, `/admin/learn/new?kind=${kind}`],
      [`learn-edit-${kind}`, `/admin/learn/${item.id}?kind=${kind}`],
    );
    if (kind === "article")
      routes.push([
        "learn-preview",
        `/admin/learn/preview/${item.id}?kind=article`,
      ]);
  }
  routes.push(["content-preview", `/admin/preview/${cms.id}`]);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/admin/content");
  await ready(page);
  const reference = await page
    .getByRole("heading", { level: 1 })
    .evaluate((element) => {
      const s = getComputedStyle(element);
      return {
        fontFamily: s.fontFamily,
        fontSize: s.fontSize,
        fontWeight: s.fontWeight,
      };
    });
  for (const [name, url] of routes) {
    await page.setViewportSize({ width: 1440, height: 1000 });
    expect((await page.goto(url))?.status(), name).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await ready(page);
    if (!name.includes("preview")) {
      const current = await page
        .getByRole("heading", { level: 1 })
        .evaluate((element) => {
          const s = getComputedStyle(element);
          return {
            fontFamily: s.fontFamily,
            fontSize: s.fontSize,
            fontWeight: s.fontWeight,
          };
        });
      expect(current, name).toEqual(reference);
    }
    await review(page, name, info.project.name);
  }
  expect(errors).toEqual([]);
});

test("CRM views filters and real record dialog retain the shared layout", async ({
  page,
}, info) => {
  test.setTimeout(300000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await login(page);
  const suffix = randomUUID().slice(0, 8);
  const lead = await create(page, "leads", {
    full_name: `مدیر تب‌ها ${suffix}`,
    phone: `0912444555${info.project.name === "chromium" ? "1" : info.project.name === "firefox" ? "2" : "3"}`,
    school_name: `مدرسه تب‌ها ${suffix}`,
    consent: true,
  });
  const customer = await (
    await page.request.get(`/api/v1/admin/leads/${lead.id}/customer`)
  ).json();
  await create(page, "crm/opportunities", {
    lead_id: lead.id,
    school_id: customer.school.id,
    title: `فرصت تب‌ها ${suffix}`,
    stage: "qualified",
  });
  await page.goto("/admin/crm");
  for (const [label, endpoint] of [
    ["لیدها", "leads?"],
    ["مدارس", "crm/schools?"],
    ["کانبان فروش", "crm/opportunities?"],
    ["فعالیت‌ها", "crm/activities?"],
    ["جلسه‌های دمو", "crm/demos?"],
    ["اعلان‌ها", "crm/notifications?"],
    ["اتوماسیون", "crm/automations?"],
    ["گزارش فروش", "crm/dashboard?"],
  ]) {
    await Promise.all([
      page.waitForResponse(
        (response) =>
          response.url().includes(`/api/v1/admin/${endpoint}`) &&
          response.request().method() === "GET" &&
          response.status() === 200,
      ),
      page.getByRole("tab", { name: label, exact: true }).click(),
    ]);
    await expect(
      page.getByRole("status").filter({ hasText: "در حال دریافت اطلاعات" }),
    ).toHaveCount(0);
    await review(page, `crm-view-${label}`, info.project.name, false);
  }
  await page
    .getByRole("button", {
      name: "جست‌وجو، فیلتر و نماهای ذخیره‌شده",
      exact: true,
    })
    .click();
  await review(page, "crm-filters", info.project.name, false);
  await page.getByRole("button", { name: "ثبت سریع لید", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await review(page, "crm-new-lead", info.project.name, false);
  expect(errors).toEqual([]);
});
