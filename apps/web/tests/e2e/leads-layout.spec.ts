import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

test("CRM list handles long names native filters and reflows at mobile tablet desktop", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  const name = "نامبلند" + randomUUID().replaceAll("-", "") + "آزمونبدونفاصله";
  const token = await (
    await page.request.get("/api/v1/forms/token?kind=demo")
  ).json();
  await new Promise((resolve) => setTimeout(resolve, 1100));
  const response = await page.request.post("/api/v1/leads/demo", {
    headers: { Origin: "http://127.0.0.1:3100" },
    data: {
      full_name: name,
      phone: "09123456789",
      school_name: "مدرسه مستقل آزمون",
      consent: true,
      consent_version: token.consent_version,
      form_token: token.token,
      idempotency_key: randomUUID(),
      source: "home",
    },
  });
  expect(response.status()).toBe(201);
  await page.goto("/admin/login");
  await page
    .getByLabel("ایمیل مدیر", { exact: true })
    .fill("sales@example.com");
  await page
    .getByLabel("رمز عبور", { exact: true })
    .fill(process.env.E2E_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "ورود به پنل", exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/, { timeout: 15000 });
  const directory = path.resolve("../../docs/qa/step8", info.project.name);
  await mkdir(directory, { recursive: true });
  for (const width of [360, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(`/admin/leads?q=${encodeURIComponent(name)}`);
    await expect(page.getByRole("link", { name, exact: true })).toBeVisible();
    const measured = await page.evaluate(
      () => document.documentElement.scrollWidth,
    );
    if (measured > width + 1) {
      const overflow = await page.evaluate(
        (targetWidth) =>
          Array.from(document.querySelectorAll("body *"))
            .map((element) => {
              const box = element.getBoundingClientRect();
              return {
                tag: element.tagName,
                id: element.id,
                class: element.getAttribute("class"),
                left: box.left,
                right: box.right,
                width: box.width,
                scrollWidth: element.scrollWidth,
                clientWidth: element.clientWidth,
              };
            })
            .filter(
              (box) =>
                box.width > targetWidth ||
                box.scrollWidth > box.clientWidth + 1 ||
                box.left < -1 ||
                box.right > targetWidth + 1,
            )
            .slice(0, 30),
        width,
      );
      await info.attach("layout-overflow", {
        body: JSON.stringify(overflow),
        contentType: "application/json",
      });
    }
    expect(measured).toBeLessThanOrEqual(width + 1);
    await page.getByLabel("نوع درخواست", { exact: true }).selectOption("demo");
    await page
      .getByRole("button", { name: "اعمال فیلتر", exact: true })
      .click();
    await expect(page).toHaveURL(/kind=demo/);
    await expect(page.getByRole("link", { name, exact: true })).toBeVisible();
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    await writeFile(
      path.join(directory, `crm-list-${width}-axe.json`),
      JSON.stringify({ violations: result.violations }, null, 2),
    );
    expect(result.violations).toEqual([]);
    await page.screenshot({
      path: path.join(directory, `crm-list-${width}.png`),
      fullPage: true,
    });
  }
});
