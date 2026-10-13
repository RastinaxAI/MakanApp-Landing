import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

test("Persian document, local font, preview metadata and no third-party requests", async ({
  page,
}) => {
  const external: string[] = [];
  const errors: string[] = [];
  page.on("request", (request) => {
    if (
      !request.url().startsWith("http://127.0.0.1:3100") &&
      !request.url().startsWith("data:")
    )
      external.push(request.url());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "fa");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("main")).toHaveCount(1);
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );
  const loaded = await page.evaluate(async () => {
    await document.fonts.ready;
    return [...document.fonts].some(
      (font) =>
        font.status === "loaded" &&
        font.family.toLowerCase().includes("vazirmatn"),
    );
  });
  expect(loaded).toBe(true);
  expect(external).toEqual([]);
  expect(errors).toEqual([]);
});

for (const width of [320, 360, 390, 479, 480, 768, 1024, 1440]) {
  test(`responsive layout at ${width}px with correct card columns`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const columns = await page
      .getByTestId("role-grid")
      .evaluate(
        (element) =>
          getComputedStyle(element).gridTemplateColumns.split(" ").length,
      );
    expect(columns).toBe(width < 480 ? 1 : width < 1024 ? 2 : 4);
    const headerMenu = page.getByRole("button", { name: "باز کردن منو" });
    if (width < 1024) await expect(headerMenu).toBeVisible();
    else await expect(headerMenu).toBeHidden();
    await expect(page.getByTestId("product-placeholder").first()).toBeVisible();
    if ([390, 768, 1440].includes(width)) {
      const directory = path.resolve(
        "../../docs/qa/step8",
        testInfo.project.name,
      );
      await mkdir(directory, { recursive: true });
      await page.screenshot({
        path: path.join(directory, `home-${width}.png`),
        fullPage: true,
        animations: "disabled",
      });
    }
    await page.goto("/design-system");
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}

test("mobile drawer traps focus, closes with Escape and restores the trigger", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "باز کردن منو" });
  await trigger.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "منوی ماکان" });
  await expect(dialog).toBeVisible();
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press("Tab");
    expect(
      await dialog.evaluate((element) =>
        element.contains(document.activeElement),
      ),
    ).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await dialog.getByRole("link", { name: "امکانات", exact: true }).click();
  await expect(page).toHaveURL(/\/features$/);
  await expect(page.getByRole("dialog")).toBeHidden();
});

test("skip link reaches main, and keyboard focus remains visible", async ({
  page,
}) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "رفتن به محتوای اصلی" });
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  const outline = await skip.evaluate(
    (element) => getComputedStyle(element).outlineWidth,
  );
  expect(Number.parseFloat(outline)).toBeGreaterThanOrEqual(3);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
});

test("RTL tabs, labelled fields and accordion support keyboard interaction", async ({
  page,
}) => {
  await page.goto("/design-system");
  const states = page.getByRole("tab", { name: "حالت‌ها", exact: true });
  await states.focus();
  await page.keyboard.press("ArrowLeft");
  await expect(
    page.getByRole("tab", { name: "فرم", exact: true }),
  ).toBeFocused();
  await expect(
    page.getByLabel("نام و نام خانوادگی", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("نام و نام خانوادگی", { exact: true })
    .fill("آزمایش طراحی");
  await expect(
    page.getByLabel("شماره تماس — نمونه خطا", { exact: true }),
  ).toHaveAttribute("aria-describedby", "specimen-phone-error");
  const consent = page.getByRole("checkbox");
  await expect(consent).not.toBeChecked();
  await consent.focus();
  await page.keyboard.press("Space");
  await expect(consent).toBeChecked();
  expect(await page.locator('button[type="submit"]').count()).toBe(0);
  await page.getByRole("tab", { name: "پرسش‌ها", exact: true }).click();
  const question = page.getByRole("button", {
    name: "آیا می‌توان بدون ماوس از صفحه استفاده کرد؟",
  });
  await question.focus();
  await page.keyboard.press("Enter");
  await expect(question).toHaveAttribute("aria-expanded", "true");
});

test("reduced motion removes smooth scroll, spinner motion and hover translation", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/design-system");
  await expect(page.locator("[data-motion-enabled]")).toHaveAttribute(
    "data-motion-enabled",
    "false",
  );
  expect(
    await page.evaluate(
      () => getComputedStyle(document.documentElement).scrollBehavior,
    ),
  ).toBe("auto");
  const surface = page.locator("[data-motion-enabled]");
  await surface.hover();
  expect(
    await surface.evaluate((element) => getComputedStyle(element).transform),
  ).toBe("none");
  const spinner = page.locator(".animate-spin");
  expect(
    await spinner.evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).animationDuration),
    ),
  ).toBeLessThanOrEqual(0.001);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(surface).toHaveAttribute("data-motion-enabled", "true");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(surface).toHaveAttribute("data-motion-enabled", "false");
});

test("200 percent text enlargement reflows without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 768, height: 900 });
  for (const route of ["/", "/design-system"]) {
    await page.goto(route);
    await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
    await page.evaluate(() => document.fonts.ready);
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      )
      .toBe(true);
  }
});

for (const width of [390, 1440]) {
  test(`axe WCAG audit, all component states and drawer at ${width}px`, async ({
    page,
  }, testInfo) => {
    test.setTimeout(90000);
    await page.setViewportSize({ width, height: 900 });
    const audit = async () => {
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      await testInfo.attach("axe", {
        body: JSON.stringify(result, null, 2),
        contentType: "application/json",
      });
      expect(result.violations).toEqual([]);
    };
    await page.goto("/");
    await audit();
    if (width === 390) {
      await page.getByRole("button", { name: "باز کردن منو" }).click();
      await audit();
      await page.keyboard.press("Escape");
    }
    await page.goto("/design-system");
    await audit();
    for (const name of ["فرم", "پرسش‌ها"]) {
      await page.getByRole("tab", { name, exact: true }).click();
      await audit();
    }
    await page.getByRole("tab", { name: "حالت‌ها", exact: true }).click();
    await page.evaluate(() => {
      if (document.activeElement instanceof HTMLElement)
        document.activeElement.blur();
      window.scrollTo({ top: 0, behavior: "instant" });
    });
    const directory = path.resolve(
      "../../docs/qa/step8",
      testInfo.project.name,
    );
    await mkdir(directory, { recursive: true });
    await page.screenshot({
      path: path.join(directory, `design-system-${width}.png`),
      fullPage: true,
      animations: "disabled",
    });
  });
}

test("missing route returns an actual 404 with a usable recovery link", async ({
  page,
}) => {
  const response = await page.goto("/not-a-real-page");
  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { name: "این صفحه پیدا نشد" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "بازگشت به صفحه اصلی" }).click();
  await expect(page).toHaveURL("/");
});
