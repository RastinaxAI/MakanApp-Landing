import { test, expect as baseExpect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createHmac } from "node:crypto";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const password = process.env.E2E_ADMIN_PASSWORD;
const expect = baseExpect.configure({ timeout: 15000 });
if (!password)
  throw new Error("Real API/DB fixtures require scripts/test-web-admin.ps1");
async function login(
  page: import("@playwright/test").Page,
  email = "owner@example.com",
  pw = password!,
) {
  await page.goto("/admin/login");
  await page.getByLabel("ایمیل مدیر", { exact: true }).fill(email);
  await page.getByLabel("رمز عبور", { exact: true }).fill(pw);
  await page.getByRole("button", { name: "ورود به پنل", exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
}
async function mutation(
  page: import("@playwright/test").Page,
  endpoint: string,
  method: string,
  body?: unknown,
) {
  const csrf = await page.request.get("/api/v1/admin/auth/csrf");
  expect(csrf.status()).toBe(200);
  return page.request.fetch(`/api/v1/admin/${endpoint}`, {
    method,
    headers: {
      Origin: "http://127.0.0.1:3100",
      "X-CSRF-Token": (await csrf.json()).csrf_token,
    },
    data: body,
  });
}
function totp(secret: string) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const character of secret)
    bits += alphabet.indexOf(character).toString(2).padStart(5, "0");
  const key = Buffer.from(
    bits.match(/.{8}/g)!.map((value) => parseInt(value, 2)),
  );
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const digest = createHmac("sha1", key).update(message).digest();
  const offset = digest[digest.length - 1]! & 15;
  return String((digest.readUInt32BE(offset) & 0x7fffffff) % 1000000).padStart(
    6,
    "0",
  );
}

test.beforeEach(() => { test.setTimeout(90000); });

test("guest pages redirect, API rejects guest and hostile CSRF", async ({
  page, browser,
}, testInfo) => {
  await testInfo.attach("runtime-versions", { body: JSON.stringify({ node: process.version, engine: browser.browserType().name(), browser: browser.version(), platform: process.platform, workers: testInfo.config.workers }), contentType: "application/json" });
  await page.goto("/admin/accounts");
  await expect(page).toHaveURL(/\/admin\/login$/);
  expect((await page.request.get("/api/v1/admin/accounts")).status()).toBe(401);
  const blocked = await page.request.post("/api/v1/admin/auth/login", {
    headers: { Origin: "https://evil.example.com" },
    data: { email: "owner@example.com", password: "incorrect" },
  });
  expect(blocked.status()).toBe(403);
  await page.getByRole("button", { name: "ورود به پنل", exact: true }).click();
  await expect(page.getByRole("alert").first()).toBeVisible();
});

test("real login logout, private cookie and noindex CSP", async ({
  page,
  context,
}, testInfo) => {
  const result = await page.goto("/admin/login");
  expect(result?.headers()["content-security-policy"]).toContain("'nonce-");
  expect(result?.headers()["content-security-policy"]).not.toContain(
    "script-src 'self' 'unsafe-inline'",
  );
  expect(result?.headers()["x-robots-tag"]).toContain("noindex");
  const loginResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/admin/auth/login") &&
      response.request().method() === "POST",
  );
  await login(page);
  const wireCookies = (await (await loginResponse).headersArray()).filter(
    (header) => header.name.toLowerCase() === "set-cookie",
  );
  expect(
    wireCookies.some(
      (header) =>
        header.value.startsWith("makan_session=") &&
        /;\s*SameSite=Lax/i.test(header.value),
    ),
  ).toBe(true);
  await expect(
    page.getByRole("heading", { name: "داشبورد مدیریت", exact: true }),
  ).toBeVisible();
  const cookies = await context.cookies();
  const session = cookies.find((cookie) => cookie.name === "makan_session");
  expect(session?.httpOnly).toBe(true);
  const windowsWebkit =
    testInfo.project.name === "webkit" && process.platform === "win32";
  // Upstream v1.64.0 tests document Windows WebKit's unsupported SameSite snapshot.
  // Wire-level SameSite=Lax is still required above on every engine.
  if (windowsWebkit)
    testInfo.annotations.push({
      type: "platform",
      description:
        "Windows WebKit SameSite metadata limitation: https://github.com/microsoft/playwright/blob/v1.64.0/tests/library/browsercontext-cookies.spec.ts",
    });
  expect(session?.sameSite).toBe(windowsWebkit ? "None" : "Lax");
  // Tamper only with HTML to model a parser-inserted XSS payload. The real SSR,
  // authentication API and CSP response header are retained unchanged.
  await page.route("**/admin", async (route) => {
    const response = await route.fetch();
    const html = await response.text();
    await route.fulfill({
      response,
      body: html.replace(
        "</body>",
        "<script>window.cspProbe=true</script></body>",
      ),
    });
  });
  await page.reload();
  await page.unroute("**/admin");
  expect(
    await page.evaluate(
      () =>
        (window as typeof window & { cspProbe?: boolean }).cspProbe ?? false,
    ),
  ).toBe(false);
  expect(
    await page.evaluate(() => ({
      cookie: document.cookie,
      local: localStorage.length,
      session: sessionStorage.length,
    })),
  ).toEqual({ cookie: "", local: 0, session: 0 });
  await page.getByRole("button", { name: "خروج", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/login$/);
  expect((await page.request.get("/api/v1/admin/auth/me")).status()).toBe(401);
  await page.goto("/admin/security");
  await expect(page).toHaveURL(/\/admin\/login$/);
});

test("editor and sales cannot read owner resources", async ({
  page,
  context,
}) => {
  for (const role of ["editor", "sales"]) {
    await context.clearCookies();
    await login(page, `${role}@example.com`);
    await expect(
      page.getByRole("link", { name: "حساب‌های مدیران", exact: true }),
    ).toHaveCount(0);
    expect((await page.request.get("/api/v1/admin/accounts")).status()).toBe(
      403,
    );
    await page.goto("/admin/accounts");
    await expect(
      page.getByRole("heading", { name: "برای این بخش دسترسی ندارید." }),
    ).toBeVisible();
    await page.getByRole("button", { name: "خروج", exact: true }).click();
  }
});

test("owner creates and deactivates an account with a real audit event", async ({
  page,
}, testInfo) => {
  await login(page);
  await page
    .getByRole("link", { name: "حساب‌های مدیران", exact: true })
    .click();
  await page.getByLabel("رمز فعلی شما", { exact: true }).fill(password!);
  const email = `created-${testInfo.project.name}@example.com`;
  await page.getByLabel("ایمیل مدیر جدید", { exact: true }).fill(email);
  await page
    .getByLabel("رمز اولیه، حداقل ۱۵ نویسه", { exact: true })
    .fill("Long-browser-fixture-password!");
  await page
    .getByRole("button", { name: "ایجاد حساب مدیر", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("حساب مدیر ذخیره شد.");
  // The real fixture has more than one page; new accounts are ordered last.
  await expect(page.getByRole("button", { name: "صفحه بعد", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "صفحه بعد", exact: true }).click();
  await expect(page.getByText(email, { exact: true })).toBeVisible();
  await page.getByLabel("رمز فعلی شما", { exact: true }).fill(password!);
  const card = page
    .locator("li")
    .filter({ has: page.getByText(email, { exact: true }) });
  await card.getByRole("button", { name: "غیرفعال کردن", exact: true }).click();
  await expect(card).toContainText("غیرفعال");
  await page
    .getByRole("link", { name: "رویدادهای مدیریت", exact: true })
    .click();
  await expect(page.getByText("ایجاد حساب", { exact: true }).first()).toBeVisible();
  const events = await page.request.get("/api/v1/admin/audit-logs?page_size=100");
  const accounts = await page.request.get("/api/v1/admin/accounts?page_size=100");
  const created = (await accounts.json()).items.find((item: { email: string }) => item.email === email);
  expect(created).toBeDefined();
  expect((await events.json()).items.some((event: { action: string; entity_id: string }) => event.action === "admin.created" && event.entity_id === created.id)).toBe(true);
});

test("MFA enrollment, recovery login and disabling are real", async ({
  page,
}, testInfo) => {
  const email = `editor-mfa-${testInfo.project.name}@example.com`;
  await login(page, email);
  await page.getByRole("link", { name: "امنیت حساب", exact: true }).click();
  await page.getByLabel("رمز فعلی", { exact: true }).fill(password!);
  await page
    .getByRole("button", { name: "شروع فعال‌سازی MFA", exact: true })
    .click();
  const secret = await page
    .getByLabel("کلید راه‌اندازی", { exact: true })
    .inputValue();
  expect(secret).toHaveLength(32);
  await page.getByLabel("کد تأیید برنامه", { exact: true }).fill(totp(secret));
  const confirmation = page.waitForResponse(response => response.url().endsWith("/auth/mfa/confirm") && response.request().method() === "POST");
  await page
    .getByRole("button", { name: "تأیید و فعال‌سازی MFA", exact: true })
    .click();
  expect((await confirmation).status()).toBe(200);
  await expect(
    page.getByRole("heading", {
      name: "کدهای بازیابی؛ فقط همین بار نمایش داده می‌شوند",
    }),
  ).toBeVisible();
  const codes = await page.locator("ul[dir=ltr] li").allTextContents();
  expect(codes).toHaveLength(8);
  await page
    .getByRole("button", {
      name: "کدها را ذخیره کردم؛ ورود دوباره",
      exact: true,
    })
    .click();
  await page
    .getByLabel("ایمیل مدیر", { exact: true })
    .fill(email);
  await page.getByLabel("رمز عبور", { exact: true }).fill(password!);
  await page
    .getByLabel("کد دومرحله‌ای یا کد بازیابی", { exact: true })
    .fill(codes[0]!);
  await page.getByRole("button", { name: "ورود به پنل", exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await page.getByRole("link", { name: "امنیت حساب", exact: true }).click();
  await page.getByLabel("رمز فعلی", { exact: true }).fill(password!);
  await page.getByLabel("کد MFA یا بازیابی", { exact: true }).fill(codes[1]!);
  await page
    .getByRole("button", { name: "غیرفعال‌سازی MFA", exact: true })
    .click();
  await expect(page).toHaveURL(/\/admin\/login$/);
});

test("password change closes sessions and accepts the new password", async ({
  page,
}, testInfo) => {
  const email = `sales-password-${testInfo.project.name}@example.com`;
  await login(page, email);
  await page.getByRole("link", { name: "امنیت حساب", exact: true }).click();
  const next = "Changed-browser-fixture-password!";
  await page.getByLabel("رمز فعلی", { exact: true }).fill(password!);
  await page.getByLabel("رمز جدید، حداقل ۱۵ نویسه", { exact: true }).fill(next);
  await page
    .getByRole("button", { name: "تغییر رمز و بستن نشست‌ها", exact: true })
    .click();
  await expect(page).toHaveURL(/\/admin\/login$/);
  expect((await page.request.get("/api/v1/admin/auth/me")).status()).toBe(401);
  await login(page, email, next);
  expect(
    (
      await mutation(page, "auth/password", "PATCH", {
        current_password: next,
        new_password: password,
      })
    ).status(),
  ).toBe(204);
});

for (const width of [360, 768, 1440])
  test(`admin keyboard responsive and axe at ${width}px`, async ({
    page,
  }, testInfo) => {
    test.setTimeout(90000);
    await page.setViewportSize({ width, height: 900 });
    for (const route of [
      "/admin/login",
      "/admin",
      "/admin/accounts",
      "/admin/audit",
      "/admin/security",
    ]) {
      if (route === "/admin") await login(page);
      else await page.goto(route);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        route,
      ).toBe(true);
      const audit = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      await testInfo.attach(`axe-${route}`, {
        body: JSON.stringify(audit),
        contentType: "application/json",
      });
      expect(audit.violations, route).toEqual([]);
      if ([360, 1440].includes(width)) {
        const directory = path.resolve(
          "../../docs/qa/step9",
          testInfo.project.name,
        );
        await mkdir(directory, { recursive: true });
        await page.screenshot({
          path: path.join(
            directory,
            `${route.slice(1).replaceAll("/", "-")}-${width}.png`,
          ),
          fullPage: true,
          animations: "disabled",
        });
      }
    }
    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("link", { name: "رفتن به محتوای پنل" }),
    ).toBeFocused();
  });
