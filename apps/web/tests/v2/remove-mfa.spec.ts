import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { login } from "./helpers";

test("SMS login, security, accounts and provider settings contain no MFA controls", async ({
  page,
}, info) => {
  await login(page);
  for (const route of ["security", "accounts", "settings/sms"]) {
    await page.goto(`/admin/${route}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(
      page.getByText(/MFA|Authenticator|دومرحله‌ای|کدهای بازیابی/),
    ).toHaveCount(0);
    await expect(
      page.locator('input[id*="mfa"], input[id*="second-factor"]'),
    ).toHaveCount(0);
  }
  await page.goto("/admin/security");
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 960 });
    await page.evaluate(() => document.fonts.ready);
    await expect(
      page.getByText("شماره همراه و کد پیامکی", { exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    const directory = path.resolve(
      `../../docs/qa/remove-mfa/${info.project.name}`,
    );
    await mkdir(directory, { recursive: true });
    await page.screenshot({
      path: path.join(directory, `security-${width}.png`),
      fullPage: true,
    });
  }
  const profile = await page.request.get("/api/v1/admin/auth/me");
  expect(profile.status()).toBe(200);
  expect(await profile.json()).not.toHaveProperty("mfa_enabled");
  for (const endpoint of ["enroll", "confirm", "disable", "recovery-codes"]) {
    const response = await page.request.post(
      `/api/v1/admin/auth/mfa/${endpoint}`,
      { data: {} },
    );
    expect(response.status()).toBe(404);
  }
});

test("session revocation remains effective after removal", async ({
  page,
  browser,
}) => {
  await login(page);
  const other = await browser.newContext({ baseURL: "http://127.0.0.1:3200" });
  try {
    const otherPage = await other.newPage();
    await login(otherPage);
    await page.goto("/admin/security");
    // This fixture may include earlier sessions; revoke each other session.
    const close = page.getByRole("button", { name: "بستن نشست", exact: true });
    while (await close.count()) {
      const count = await close.count();
      await close.first().click();
      await expect(close).toHaveCount(count - 1);
    }
    expect(
      (await otherPage.request.get("/api/v1/admin/auth/me")).status(),
    ).toBe(401);
    await page
      .getByRole("button", { name: "خروج از نشست فعلی", exact: true })
      .click();
    await expect(page).toHaveURL(/\/admin\/login$/);
    expect((await page.request.get("/api/v1/admin/auth/me")).status()).toBe(
      401,
    );
  } finally {
    await other.close();
  }
});
