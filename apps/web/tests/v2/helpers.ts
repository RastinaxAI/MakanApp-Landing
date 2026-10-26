import { expect, type Page, type Locator } from "@playwright/test";
export async function login(page: Page, phone = "09120000001") {
  await page.goto("/admin/login");
  await page.getByLabel("شماره همراه", { exact: true }).fill(phone);
  await page
    .getByRole("button", { name: "دریافت کد ورود", exact: true })
    .click();
  await page.getByLabel("کد ورود", { exact: true }).fill("111111");
  await page.getByRole("button", { name: "ورود به پنل", exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
}
export async function selectElement(page: Page, id: string) {
  const node = page
    .frameLocator("iframe")
    .first()
    .locator(`[data-node-id="${id}"]`);
  await node.scrollIntoViewIfNeeded();
  // Click the real canvas; the editor overlay receives pointer events for selection.
  await node.click({ position: { x: 12, y: 12 }, force: true });
  await expect(
    page.getByRole("button", { name: "ویرایش عنصر", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
}
export async function drag(page: Page, name: string, target: Locator) {
  const point = async (box: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) => {
    const frame = await page.locator("iframe").first().boundingBox();
    const viewport = page.viewportSize();
    if (!frame || !viewport) throw new Error("Canvas viewport is unavailable");
    const top = Math.max(box.y + 8, frame.y + 32, 64);
    const bottom = Math.min(
      box.y + box.height - 8,
      frame.y + frame.height - 32,
      viewport.height - 64,
    );
    if (bottom < top)
      throw new Error("Drop target is outside the visible canvas");
    // Aim at the insertion boundary, not the centre of a tall image inside it.
    return { x: box.x + box.width / 2, y: Math.min(top + 16, bottom) };
  };
  await page.getByRole("button", { name: "عناصر", exact: true }).click();
  const source = page
    .getByRole("complementary", { name: "پنل کناری صفحه‌ساز", exact: true })
    .getByRole("button", { name, exact: true });
  await target.scrollIntoViewIfNeeded();
  await source.scrollIntoViewIfNeeded();
  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();
  expect(sourceBox).not.toBeNull();
  expect(targetBox).not.toBeNull();
  if (!sourceBox || !targetBox)
    throw new Error("Drag controls must be visible");
  await page.mouse.move(
    sourceBox.x + sourceBox.width / 2,
    sourceBox.y + sourceBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    sourceBox.x + sourceBox.width / 2 + 10,
    sourceBox.y + sourceBox.height / 2 + 10,
    { steps: 5 },
  );
  const initial = await point(targetBox);
  await page.mouse.move(initial.x, initial.y, { steps: 25 });
  await page.waitForTimeout(150);
  for (let pass = 0; pass < 2; pass++) {
    const adjusted = await target.boundingBox();
    if (!adjusted) throw new Error("Dropzone disappeared during drag");
    const visible = await point(adjusted);
    await page.mouse.move(visible.x, visible.y, { steps: 8 });
    await page.waitForTimeout(150);
  }
  await page.mouse.up();
}
