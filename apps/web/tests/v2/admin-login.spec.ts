import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

for (const width of [320, 768, 1440]) {
  test(`login is readable and accessible at ${width}px`, async ({
    page,
  }, info) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewportSize({ width, height: 960 });
    expect((await page.goto("/admin/login"))?.status()).toBe(200);
    await page.evaluate(() => document.fonts.ready);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "ورود به پیشخوان ماکان",
    );
    await expect(page.getByLabel("شماره همراه", { exact: true })).toBeEnabled();
    await expect(page.getByLabel("ایمیل مدیر", { exact: true })).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    await expect(page.locator(".login-brand img")).toHaveCSS(
      "border-radius",
      "10px",
    );
    const phone = page.getByLabel("شماره همراه", { exact: true });
    expect(
      await phone.evaluate((element) =>
        parseFloat(getComputedStyle(element).fontSize),
      ),
    ).toBeGreaterThanOrEqual(16);
    // Firefox can report 55.99997 CSS pixels for a 56px control.
    expect(
      Math.round((await phone.boundingBox())!.height),
    ).toBeGreaterThanOrEqual(56);
    const inputContrast = await phone.evaluate((element) => {
      const luminance = (css: string) => {
        const [r = 0, g = 0, b = 0] = (css.match(/\d+/g) || [])
          .slice(0, 3)
          .map((value) => {
            const channel = Number(value) / 255;
            return channel <= 0.04045
              ? channel / 12.92
              : ((channel + 0.055) / 1.055) ** 2.4;
          });
        return r * 0.2126 + g * 0.7152 + b * 0.0722;
      };
      const style = getComputedStyle(element);
      const border = luminance(style.borderTopColor);
      const background = luminance(style.backgroundColor);
      return (
        (Math.max(border, background) + 0.05) /
        (Math.min(border, background) + 0.05)
      );
    });
    expect(inputContrast).toBeGreaterThanOrEqual(3);
    const panel = page.getByRole("complementary", {
      name: "معرفی پیشخوان ماکان",
    });
    if (width >= 1024) await expect(panel).toBeVisible();
    else await expect(panel).toBeHidden();
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    const directory = path.resolve(
      `../../docs/qa/${process.env.MAKAN_QA_PHASE || "admin-login"}/${info.project.name}`,
    );
    await mkdir(directory, { recursive: true });
    await page.screenshot({
      path: path.join(directory, `login-${width}.png`),
      fullPage: true,
    });
    expect(errors).toEqual([]);
  });
}

test("real OTP login preserves validation, focus, error state and successful authentication", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/admin/login");
  const phone = page.getByLabel("شماره همراه", { exact: true });
  await phone.fill("123");
  await page
    .getByRole("button", { name: "دریافت کد ورود", exact: true })
    .click();
  await expect(page.locator("form").getByRole("alert")).toContainText(
    "شماره همراه معتبر",
  );
  await phone.fill("۰۹۱۲۰۰۰۰۰۰۱");
  const requested = page.waitForResponse(
    (response) =>
      response.url().endsWith("/admin/auth/otp/request") &&
      response.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "دریافت کد ورود", exact: true })
    .click();
  expect((await requested).status()).toBe(200);
  const code = page.getByLabel("کد ورود", { exact: true });
  await expect(code).toBeFocused();
  await expect(phone).toHaveAttribute("readonly", "");
  await expect(page.locator('.login-steps [aria-current="step"]')).toHaveText(
    "۲تأیید کد ورود",
  );
  await expect(
    page.getByRole("button", { name: /ارسال دوباره/ }),
  ).toBeDisabled();
  await code.fill("999999");
  await page.getByRole("button", { name: "ورود به پنل", exact: true }).click();
  await expect(page.locator("form").getByRole("alert")).toContainText("نادرست");
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  const directory = path.resolve(
    `../../docs/qa/${process.env.MAKAN_QA_PHASE || "admin-login"}/${info.project.name}`,
  );
  await mkdir(directory, { recursive: true });
  await page.screenshot({
    path: path.join(directory, "login-otp-error-390.png"),
    fullPage: true,
  });
  await code.fill("۱۱۱۱۱۱");
  await page.getByRole("button", { name: "ورود به پنل", exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
});

test("changing the phone returns to the first step and authenticated visitors are redirected", async ({
  page,
}) => {
  await page.goto("/admin/login");
  await page.getByLabel("شماره همراه", { exact: true }).fill("09120000002");
  await page
    .getByRole("button", { name: "دریافت کد ورود", exact: true })
    .click();
  await expect(page.getByLabel("کد ورود", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "تغییر شماره", exact: true }).click();
  await expect(page.getByLabel("کد ورود", { exact: true })).toHaveCount(0);
  await expect(page.getByLabel("شماره همراه", { exact: true })).toBeEditable();
  await expect(page.getByLabel("شماره همراه", { exact: true })).toBeFocused();
  // Request a different registered test account to respect the real resend cooldown.
  await page.getByLabel("شماره همراه", { exact: true }).fill("09120000003");
  await page
    .getByRole("button", { name: "دریافت کد ورود", exact: true })
    .click();
  await page.getByLabel("کد ورود", { exact: true }).fill("111111");
  await page.getByRole("button", { name: "ورود به پنل", exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto("/admin/login");
  await expect(page).toHaveURL(/\/admin$/);
});
