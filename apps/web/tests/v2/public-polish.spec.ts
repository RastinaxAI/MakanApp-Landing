import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { login } from "./helpers";

const routes = [
  "/",
  "/features",
  "/features/messenger",
  "/features/school",
  "/features/reports",
  "/features/ai",
  "/solutions",
  "/solutions/schools",
  "/solutions/teachers",
  "/solutions/parents",
  "/solutions/students",
  "/demo",
  "/contact",
  "/about",
  "/faq",
  "/privacy",
  "/terms",
  "/learn",
  "/blog",
  "/learn/series",
];
const capture = new Set([
  "/",
  "/features/messenger",
  "/solutions/schools",
  "/demo",
  "/learn",
  "/about",
  "/privacy",
]);
test("marketing links do not fetch whole destination pages before selection", async ({
  page,
}) => {
  const prefetches: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).searchParams.has("_rsc"))
      prefetches.push(request.url());
  });
  await page.goto("/");
  await page.evaluate(async () => {
    await document.fonts.ready;
    for (let y = 0; y < document.documentElement.scrollHeight; y += 500) {
      window.scrollTo(0, y);
      await new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      );
    }
  });
  // Observe the absence of background prefetching; unrelated browser traffic need not become idle.
  await page.waitForTimeout(1000);
  expect(prefetches).toEqual([]);
  await expect(page.locator(".public-header-cta")).toHaveAttribute(
    "href",
    "/demo?source=home",
  );
});

for (const width of [360, 768, 1440]) {
  test(`public pages preserve content, SEO and accessible layout at ${width}px`, async ({
    page,
  }, info) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.setViewportSize({ width, height: 960 });
    const directory = path.resolve(
      `../../docs/qa/${process.env.MAKAN_QA_PHASE || "public-polish"}/${info.project.name}`,
    );
    await mkdir(directory, { recursive: true });
    const titles = new Set<string>();
    for (const route of routes) {
      expect((await page.goto(route))?.status(), route).toBe(200);
      await expect(page.locator(".public-site")).toBeVisible();
      await expect(page.getByRole("main")).toHaveCount(1);
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      const title = await page.title();
      expect(titles.has(title), route).toBe(false);
      titles.add(title);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
        "content",
        /noindex/,
      );
      await page.evaluate(async () => {
        await document.fonts.ready;
        window.scrollTo(0, 0);
        await new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        );
      });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
        `${route}@${width}`,
      ).toBeLessThanOrEqual(width + 1);
      await expect(page.locator(".public-header-cta")).toBeVisible();
      if (
        ["/", "/demo", "/learn", "/features/messenger", "/privacy"].includes(
          route,
        )
      ) {
        const axe = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        expect(axe.violations, `${route}@${width}`).toEqual([]);
      }
      if (capture.has(route))
        await page.screenshot({
          path: path.join(
            directory,
            `${route === "/" ? "home" : route.replaceAll("/", "-").slice(1)}-${width}.png`,
          ),
          fullPage: true,
          animations: "disabled",
        });
    }
    expect(errors).toEqual([]);
  });
}

test("mobile navigation, role tabs, FAQ and reduced motion stay usable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 850 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(320);
  const menu = page.getByRole("button", { name: "باز کردن منو" });
  await menu.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "منوی ماکان" });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(menu).toBeFocused();
  const roles = page.getByRole("tablist", { name: "ماکان برای نقش شما" });
  for (const title of ["والدین", "معلم", "دانش‌آموز"]) {
    await roles.getByRole("tab", { name: title, exact: true }).click();
    await expect(
      page.locator(".premium-role-panel").filter({ visible: true }),
    ).toBeVisible();
  }
  const faq = page
    .locator("[data-faq-list]")
    .first()
    .getByRole("button")
    .first();
  await faq.click();
  await expect(faq).toHaveAttribute("aria-expanded", "true");
  await page.goto("/features/messenger");
  await menu.click();
  await expect(
    page
      .getByRole("navigation", { name: "ناوبری موبایل" })
      .getByRole("link", { name: "امکانات", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await page.keyboard.press("Escape");
  await page.goto("/features/ai");
  await expect(page.getByText("در نقشه راه", { exact: true })).toBeVisible();
  expect(
    await page
      .locator(".detail-emblem-symbol")
      .evaluate((el) => getComputedStyle(el).transform),
  ).toBe("none");
  await page.goto("/admin/login");
  await expect(page.locator(".public-site")).toHaveCount(0);
  await expect(page.getByLabel("شماره همراه", { exact: true })).toBeVisible();
});

test("redesigned demo and contact forms persist real requests in CRM", async ({
  page,
}, info) => {
  const index = ["chromium", "firefox", "webkit"].indexOf(info.project.name);
  const name = `پذیرش ظاهر عمومی ${randomUUID().slice(0, 8)}`;
  const references: string[] = [];
  await page.setViewportSize({ width: 390, height: 844 });
  for (const kind of ["demo", "contact"]) {
    await page.goto(`/${kind}?source=home`);
    const submit = page.getByRole("button", {
      name: kind === "demo" ? "ثبت درخواست دمو" : "ارسال پیام",
      exact: true,
    });
    await expect(submit).toBeEnabled();
    await submit.click();
    await expect(page.locator("form [role=alert]").first()).toBeVisible();
    await page.getByLabel("نام و نام خانوادگی", { exact: true }).fill(name);
    if (kind === "demo") {
      await page
        .getByLabel("شماره تماس", { exact: true })
        .fill(`09127777${String(index + 100).padStart(3, "0")}`);
      await page
        .getByLabel("نام مدرسه یا مؤسسه", { exact: true })
        .fill("مدرسه آزمون پذیرش");
    } else {
      await page.getByLabel("روش تماس", { exact: true }).selectOption("email");
      await page
        .getByLabel("شماره تماس یا ایمیل", { exact: true })
        .fill(`public-${index}@example.com`);
      await page
        .getByLabel("موضوع", { exact: true })
        .fill("درخواست اطلاعات بیشتر");
      await page
        .getByLabel("پیام", { exact: true })
        .fill("بررسی مسیر ارتباط با مدرسه و امکانات محصول ماکان");
    }
    await page.getByRole("checkbox").check();
    await submit.click();
    await expect(
      page.getByText("درخواست شما ثبت شد.", { exact: true }),
    ).toBeVisible();
    const reference = (
      await page.getByTestId("reference-id").innerText()
    ).trim();
    expect(reference).toMatch(/^MK-[A-Za-z0-9_-]{32}$/);
    references.push(reference);
  }
  await login(page);
  for (const reference of references) {
    const response = await page.request.get(
      `/api/v1/admin/leads?q=${encodeURIComponent(reference)}`,
    );
    expect(response.ok()).toBe(true);
    const data = await response.json();
    expect(data.items).toHaveLength(1);
    expect(data.items[0]).toMatchObject({
      reference_id: reference,
      source: "home",
      full_name: name,
    });
  }
});

test("small phone and intermediate breakpoints keep the header, hero and fields usable", async ({
  page,
}) => {
  for (const width of [320, 480, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await page.evaluate(async () => {
      await document.fonts.ready;
      await new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      );
    });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width + 1);
    await expect(page.locator(".public-header-cta")).toBeVisible();
    const visual = page.locator(".makan-capability-map");
    expect((await visual.boundingBox())!.width).toBeGreaterThan(250);
    await page.goto("/contact");
    await expect(page.getByLabel("پیام", { exact: true })).toBeVisible();
    expect(
      (await page.getByLabel("پیام", { exact: true }).boundingBox())!.height,
    ).toBeGreaterThanOrEqual(128);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width + 1);
  }
});

test("delayed Persian font does not move the mobile demo introduction", async ({
  page,
}, info) => {
  let releaseFont = () => {};
  const gate = new Promise<void>((resolve) => {
    releaseFont = resolve;
  });
  await page.setViewportSize({ width: 412, height: 823 });
  await page.route("**/*.woff2", async (route) => {
    await gate;
    await route.continue();
  });
  try {
    await page.goto("/demo", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".public-title-multiline")).toBeVisible();
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
    const before = await page.locator(".public-page-hero").boundingBox();
    expect(await page.evaluate(() => document.fonts.status)).toBe("loading");
    releaseFont();
    await page.evaluate(async () => {
      await document.fonts.ready;
      await new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      );
    });
    const after = await page.locator(".public-page-hero").boundingBox();
    expect(Math.abs(after!.height - before!.height)).toBeLessThan(1);
    const directory = path.resolve(
      `../../docs/qa/${process.env.MAKAN_QA_PHASE || "public-polish"}/${info.project.name}`,
    );
    await mkdir(directory, { recursive: true });
    await writeFile(
      path.join(directory, "font-stability.json"),
      JSON.stringify({ before, after }, null, 2),
    );
  } finally {
    releaseFont();
  }
});
