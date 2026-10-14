import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { login } from "./helpers";
import type { AdminContent } from "../../src/features/cms/types";
import {
  emptyStyles,
  defaultGlobals,
  widgetLabels,
  type VisualNode,
  type WidgetProps,
} from "../../src/features/builder/types";

async function write(
  page: Page,
  path: string,
  body: unknown,
  version?: number,
  method = "POST",
) {
  const csrf = (
    await (await page.request.get("/api/v1/admin/auth/csrf")).json()
  ).csrf_token;
  const response = await page.request.fetch(`/api/v1/admin/${path}`, {
    method,
    data: body,
    headers: {
      Origin: "http://127.0.0.1:3200",
      "X-CSRF-Token": csrf,
      ...(version ? { "If-Match": String(version) } : {}),
    },
  });
  expect(response.ok(), await response.text()).toBe(true);
  return response;
}
test("all registered widgets share public SSR rendering and interactive controls", async ({
  page,
}) => {
  await login(page);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const csrf = (
    await (await page.request.get("/api/v1/admin/auth/csrf")).json()
  ).csrf_token;
  const uploaded = await page.request.post("/api/v1/admin/media", {
    headers: { Origin: "http://127.0.0.1:3200", "X-CSRF-Token": csrf },
    multipart: {
      alt_text: "رسانهٔ آزمون رجیستری",
      file: {
        name: "logo.png",
        mimeType: "image/png",
        buffer: await readFile("public/brand/makan-logo.png"),
      },
    },
  });
  expect(uploaded.status()).toBe(201);
  const mediaId = (await uploaded.json()).id as string;
  const original = (
    await (
      await page.request.get("/api/v1/admin/content?kind=home&page_size=100")
    ).json()
  ).items[0] as AdminContent;
  if (!original.published_revision_id)
    throw new Error("Published homepage fixture required");
  const publishedBefore = original.published_revision_id;
  const item = {
    title: "محتوای آزمون",
    text: "توضیح آزمون",
    value: "۱۲",
    attribution: "کاربر آزمون",
    href: "/demo",
    media_id: mediaId,
  };
  const build = (
    type: keyof typeof widgetLabels,
    props: WidgetProps = {},
    children: VisualNode[] = [],
  ): VisualNode => ({
    id: `test_${type}`,
    type,
    version: 1,
    props,
    styles: emptyStyles(),
    children,
  });
  const nodes: VisualNode[] = Object.keys(widgetLabels).map((name) => {
    const type = name as keyof typeof widgetLabels;
    const props: WidgetProps = {
      title: `آزمون ${name}`,
      body_html: "<p>متن غنی آزمون</p>",
      items: [item, { ...item, title: "محتوای دوم", text: "توضیح دوم" }],
      media_id: mediaId,
      feature_slug: "messenger",
      aparat_id: "abc12",
      href: "/demo",
      label: `پیوند ${name}`,
    };
    if (type === "LegacySection")
      props.legacy_section = {
        type: "rich-text",
        title: "بخش قدیمی حفظ شده",
        description: "",
        body_html: "<p>متن قدیمی</p>",
        items: [],
      };
    return build(type, props);
  });
  nodes.find((node) => node.type === "Container")!.children = [
    build("Heading", { title: "عنوان در کانتینر" }),
  ];
  nodes.find((node) => node.type === "Container")!.children[0]!.id =
    "nested_heading";
  nodes.find((node) => node.type === "Grid")!.children = [
    build("RichText", { body_html: "<p>متن در Grid</p>" }),
  ];
  nodes.find((node) => node.type === "Grid")!.children[0]!.id = "nested_text";
  const button = nodes.find((node) => node.type === "Button")!;
  button.styles.base = {
    background: "#284693",
    color: "#ffffff",
    radius: 16,
    padding: 20,
  };
  button.styles.hover = { background: "#105bc6" };
  button.styles.focus = { border_color: "#1266df", border_width: 3 };
  const icon = nodes.find((node) => node.type === "Icon")!;
  icon.styles.base = {
    width: "72px",
    height: "72px",
    color: "#176b45",
    background: "#edf7f0",
    radius: 18,
    font_size: 36,
  };
  nodes.push(
    { ...build("DemoForm"), id: "second_demo" },
    {
      ...build("FeatureStory", { feature_slug: "messenger" }),
      id: "second_story",
    },
  );
  const saved = (await (
    await write(
      page,
      `content/${original.id}`,
      {
        title: original.title,
        slug: original.slug,
        payload: {
          ...original.payload,
          document: { schema_version: 2, globals: defaultGlobals, nodes },
        },
        seo: original.seo,
        visibility: original.visibility,
        sort_order: original.sort_order,
      },
      original.row_version,
      "PATCH",
    )
  ).json()) as AdminContent;
  await write(
    page,
    `content/${saved.id}/publish`,
    { revision_id: saved.revision_id },
    saved.row_version,
  );
  await page.goto("/");
  for (const name of Object.keys(widgetLabels))
    await expect(page.locator(`[data-node-id="test_${name}"]`)).toBeVisible();
  await expect(page.locator("main h1")).toHaveCount(1);
  const control = page.locator(
    '[data-node-id="test_Button"] .builder-widget-control',
  );
  await expect(control).toHaveCSS("background-color", "rgb(40, 70, 147)");
  await expect(control).toHaveCSS("border-radius", "16px");
  await expect(control).toHaveCSS("padding-top", "20px");
  await control.hover();
  await expect(control).toHaveCSS("background-color", "rgb(16, 91, 198)");
  await control.focus();
  await expect(control).toHaveCSS("border-top-width", "3px");
  const iconControl = page.locator(
    '[data-node-id="test_Icon"] .builder-widget-control',
  );
  await expect(iconControl).toHaveCSS("color", "rgb(23, 107, 69)");
  await expect(iconControl).toHaveCSS("border-radius", "18px");
  await expect(iconControl).toHaveCSS("width", "72px");
  await expect(iconControl).toHaveCSS("height", "72px");
  await expect(iconControl.locator("svg")).toHaveCSS("width", "36px");
  const ids = await page
    .locator("[id]")
    .evaluateAll((elements) => elements.map((el) => el.id));
  expect(ids.length).toBe(new Set(ids).size);

  await page
    .locator('[data-widget="Tabs"]')
    .getByRole("tab", { name: "محتوای دوم", exact: true })
    .click();
  await expect(
    page.locator('[data-widget="Tabs"]').getByRole("tabpanel").locator("p"),
  ).toHaveText("توضیح دوم");
  await expect(
    page
      .locator('[data-widget="Tabs"]')
      .getByRole("link", { name: "بیشتر بدانید", exact: true }),
  ).toHaveAttribute("href", "/demo?source=home");
  await expect(
    page.locator('[data-widget="Tabs"]').getByRole("img"),
  ).toHaveCount(1);
  await page
    .locator('[data-widget="Carousel"]')
    .getByRole("button", { name: "اسلاید بعدی", exact: true })
    .click();
  await expect(page.locator('[data-widget="Carousel"]')).toContainText(
    "محتوای دوم",
  );
  await page
    .locator('[data-widget="Accordion"]')
    .getByRole("button", { name: "محتوای آزمون", exact: true })
    .click();
  await expect(page.locator('[data-widget="Accordion"]')).toContainText(
    "توضیح آزمون",
  );
  await expect(
    page
      .locator('[data-node-id="test_DemoForm"]')
      .getByLabel("نام و نام خانوادگی"),
  ).toBeEnabled();
  await expect(
    page
      .locator('[data-widget="ContactForm"]')
      .getByLabel("نام و نام خانوادگی"),
  ).toBeEnabled();
  await expect(page.locator('[data-widget="Video"] iframe')).toHaveCount(0);
  await expect(page.locator('[data-widget="ArticleList"]')).toContainText(
    "هنوز مقاله‌ای منتشر نشده",
  );
  expect(errors).toEqual([]);
  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(accessibility.violations).toEqual([]);
  const restoredPublication = (await (
    await write(
      page,
      `content/${original.id}/publish`,
      { revision_id: publishedBefore },
      saved.row_version + 1,
    )
  ).json()) as AdminContent;
  // Restore the working draft too, so the next browser edits the original page.
  await write(
    page,
    `content/${original.id}/revisions/${original.revision_id}/restore`,
    undefined,
    restoredPublication.row_version,
  );
});
