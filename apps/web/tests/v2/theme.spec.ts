import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { login } from "./helpers";
import type { AdminContent } from "../../src/features/cms/types";
test("global colors and fonts participate in undo redo and durable document revisions", async ({
  page,
}) => {
  await login(page);
  await page.goto("/admin/builder");
  await page
    .getByLabel("نام قالب تازه", { exact: true })
    .fill("آزمون رنگ و فونت " + randomUUID().slice(0, 8));
  await page
    .getByRole("button", { name: "ساخت و بازکردن صفحه‌ساز", exact: true })
    .click();
  await expect(page).toHaveURL(/\/admin\/content\/[0-9a-f-]{36}\/builder$/);
  const id = page.url().split("/").at(-2)!;
  const canvas = page.frameLocator("iframe").first();
  const root = canvas.locator("[data-builder-scope]");
  await page
    .getByRole("button", { name: "رنگ و فونت برگه", exact: true })
    .click();
  await page
    .getByLabel("فونت سراسری", { exact: true })
    .filter({ visible: true })
    .selectOption("mono");
  await expect(root).toHaveCSS("font-family", "monospace");
  await page.waitForTimeout(350);
  await page.getByRole("button", { name: "واگرد", exact: true }).click();
  await expect(root).not.toHaveCSS("font-family", "monospace");
  await page.getByRole("button", { name: "انجام دوباره", exact: true }).click();
  await expect(root).toHaveCSS("font-family", "monospace");
  await page
    .getByLabel("رنگ سراسری primary", { exact: true })
    .filter({ visible: true })
    .fill("#284693");
  await expect
    .poll(() =>
      root.evaluate((element) =>
        getComputedStyle(element).getPropertyValue("--builder-primary").trim(),
      ),
    )
    .toBe("#284693");
  await page
    .getByRole("button", { name: "ذخیره صفحه‌ساز", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "در دیتابیس ذخیره شد" }),
  ).toBeVisible();
  const data = (await (
    await page.request.get(`/api/v1/admin/content/${id}`)
  ).json()) as AdminContent;
  if (data.payload.kind !== "page") throw new Error("Page required");
  expect(data.payload.document?.globals).toMatchObject({
    font: "mono",
    inherit_site: false,
    colors: { primary: "#284693" },
  });
  await page.reload();
  await expect(root).toHaveCSS("font-family", "monospace");
  await expect
    .poll(() =>
      root.evaluate((element) =>
        getComputedStyle(element).getPropertyValue("--builder-primary").trim(),
      ),
    )
    .toBe("#284693");
});
