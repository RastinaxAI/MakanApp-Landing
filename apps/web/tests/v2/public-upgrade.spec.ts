import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

test("preserved public URLs, metadata, one main heading and responsive premium sections", async ({
  page,
  request,
}, info) => {
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
    "/blog",
    "/learn",
  ];
  const titles = new Set<string>();
  for (const route of routes) {
    const response = await request.get(route);
    expect(response.status(), route).toBe(200);
    const html = await response.text();
    expect((html.match(/<h1\b/g) ?? []).length, route).toBe(1);
    const title = html.match(/<title>(.*?)<\/title>/)?.[1];
    expect(title, route).toBeTruthy();
    expect(titles.has(title!), route).toBe(false);
    titles.add(title!);
    expect(html).toContain("noindex");
  }
  const dir = path.resolve("../../docs/qa/v2-step4", info.project.name);
  await mkdir(dir, { recursive: true });
  for (const width of [1440, 768, 360]) {
    await page.setViewportSize({ width, height: 960 });
    for (const route of ["/", "/features/messenger", "/solutions/schools"]) {
      await page.goto(route);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${route}@${width}`,
      ).toBe(true);
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(result.violations, `${route}@${width}`).toEqual([]);
      await page.screenshot({
        path: path.join(
          dir,
          `${route === "/" ? "home" : route.split("/").pop()}-${width}.png`,
        ),
        fullPage: true,
      });
    }
  }
  await page.goto("/features/ai");
  await expect(page.getByText("در نقشه راه", { exact: true })).toBeVisible();
  await page.goto("/demo");
  await expect(
    page.getByRole("button", { name: "ثبت درخواست دمو", exact: true }),
  ).toBeEnabled();
});
