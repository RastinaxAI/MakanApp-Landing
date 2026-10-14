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
    const top = Math.max(box.y + 8, frame.y + 8, 64);
    const bottom = Math.min(
      box.y + box.height - 8,
      frame.y + frame.height - 8,
      viewport.height - 45,
    );
    if (bottom < top)
      throw new Error("Drop target is outside the visible canvas");
    return { x: box.x + box.width / 2, y: (top + bottom) / 2 };
  };
  const source = page.getByText(name, { exact: true }).first().locator("..");
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
