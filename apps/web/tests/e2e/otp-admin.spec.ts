import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";
const output = path.resolve("../../docs/qa/admin-refresh");
const phone = "09120000001";

async function login(page: import("@playwright/test").Page, number = phone) {
  await page.goto("/admin/login");
  await page.getByLabel("شماره همراه", { exact: true }).fill(number);
  const sent = page.waitForResponse(response => response.url().endsWith("/admin/auth/otp/request") && response.request().method() === "POST");
  await page.getByRole("button", { name: "دریافت کد ورود", exact: true }).click();
  expect((await sent).status()).toBe(200);
  await expect(page.getByLabel("کد ورود", { exact: true })).toBeVisible();
  await page.getByLabel("کد ورود", { exact: true }).fill("111111");
  await page.getByRole("button", { name: "ورود به پنل", exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

test("phone-only login rejects wrong OTP and dashboard aligns on desktop", async ({ page }, info) => {
  await page.setViewportSize({width:1440,height:1000});
  await page.goto("/admin/login");
  await expect(page.getByLabel("ایمیل مدیر",{exact:true})).toHaveCount(0);
  await expect(page.getByLabel("رمز عبور",{exact:true})).toHaveCount(0);
  await expect(page.getByText("حالت توسعه فعال است")).toBeVisible();
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute("href","/brand/makan-icon.svg");
  await page.getByLabel("شماره همراه",{exact:true}).fill("۰۹۱۲۰۰۰۰۰۰۱");
  const sent = page.waitForResponse(response => response.url().endsWith("/admin/auth/otp/request") && response.request().method() === "POST");
  await page.getByRole("button",{name:"دریافت کد ورود",exact:true}).click();
  expect((await sent).status()).toBe(200);
  await page.getByLabel("کد ورود",{exact:true}).fill("999999");
  await page.getByRole("button",{name:"ورود به پنل",exact:true}).click();
  await expect(page.locator("form").getByRole("alert")).toContainText("نادرست");
  await page.getByLabel("کد ورود",{exact:true}).fill("111111");
  await page.getByRole("button",{name:"ورود به پنل",exact:true}).click();
  await expect(page).toHaveURL(/\/admin$/);
  const aside=await page.locator("aside").boundingBox();expect(aside).toBeTruthy();expect(aside!.x+aside!.width).toBeCloseTo(1440,0);
  const audit=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa","wcag22aa"]).analyze();expect(audit.violations).toEqual([]);
  await page.getByRole("heading",{level:1}).click();
  await mkdir(output,{recursive:true}); await page.screenshot({path:path.join(output,`${info.project.name}-dashboard-1440.png`),fullPage:true});
});

test("mobile drawer, protected settings and new SMS panel remain accessible", async ({page},info)=>{
  await page.setViewportSize({width:390,height:900});await login(page);
  await page.getByRole("button",{name:"باز کردن منوی مدیریت"}).click();
  const menu=page.getByRole("dialog");await expect(menu).toBeVisible();
  const close = menu.getByRole("button",{name:"بستن پنل",exact:true});
  for (const hovered of [false, true]) {
    if (hovered) await close.hover();
    const contrast = await close.evaluate((element) => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 1;
      const context = canvas.getContext("2d")!;
      const rgba = (value: string) => {
        context.clearRect(0, 0, 1, 1);
        context.fillStyle = value;
        context.fillRect(0, 0, 1, 1);
        return Array.from(context.getImageData(0, 0, 1, 1).data);
      };
      const luminance = (rgb: number[]) => {
        const channels = rgb.slice(0, 3).map(value => {
          const channel = value / 255;
          return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
        });
        const [red = 0, green = 0, blue = 0] = channels;
        return red * 0.2126 + green * 0.7152 + blue * 0.0722;
      };
      const style = getComputedStyle(element);
      let background = rgba(style.backgroundColor);
      if (background[3] === 0) background = rgba(getComputedStyle(element.closest('[role="dialog"]')!).backgroundColor);
      const foregroundLuminance = luminance(rgba(style.color));
      const backgroundLuminance = luminance(background);
      return (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) / (Math.min(foregroundLuminance, backgroundLuminance) + 0.05);
    });
    expect(contrast, hovered ? "hover close icon contrast" : "close icon contrast").toBeGreaterThanOrEqual(3);
  }
  const menuAudit=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa","wcag22aa"]).analyze();expect(menuAudit.violations).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button",{name:"باز کردن منوی مدیریت"})).toBeFocused();
  await page.getByRole("button",{name:"باز کردن منوی مدیریت"}).click();
  await menu.getByRole("link",{name:"پنل پیامکی",exact:true}).click();
  await expect(page).toHaveURL(/\/admin\/settings\/sms$/);
  await expect(page.getByRole("heading",{level:1})).toHaveText("پنل پیامکی");
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByLabel("نام کاربری ملی‌پیامک",{exact:true}).fill("browser-fixture");
  await page.getByLabel("رمز وب‌سرویس ملی‌پیامک",{exact:true}).fill("fixture-not-real-credentials");
  await page.getByLabel("شناسه الگوی خدماتی (Body ID)",{exact:true}).fill("123");
  await page.getByLabel("اتصال پنل پیامکی فعال باشد").check();
  await page.getByRole("button",{name:"دریافت کد تأیید تغییرات",exact:true}).click();
  await page.getByLabel("کد تأیید تغییرات",{exact:true}).fill("111111");
  await page.getByRole("button",{name:"ذخیره تنظیمات پیامک",exact:true}).click();
  await expect(page.getByRole("status").filter({hasText:"تنظیمات پنل پیامکی ذخیره شد"})).toBeVisible();
  await expect(page.getByLabel("رمز وب‌سرویس ملی‌پیامک",{exact:true})).toHaveValue("");
  const audit=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa","wcag22aa"]).analyze();expect(audit.violations).toEqual([]);
  await page.getByRole("heading",{level:1}).click();
  await page.screenshot({path:path.join(output,`${info.project.name}-sms-390.png`),fullPage:true});
});

test("phone owner can manage accounts and all admin modules fit tablet",async({page},info)=>{
  await page.setViewportSize({width:768,height:1000});await login(page);
  for(const route of ["/admin/content","/admin/learn","/admin/media","/admin/faq-categories","/admin/leads","/admin/settings","/admin/security","/admin/accounts"]){
    const response=await page.goto(route);expect(response?.status(),route).toBe(200);await expect(page.getByRole("heading",{level:1})).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),route).toBe(true);
  }
  await page.getByLabel("شماره همراه مدیر جدید",{exact:true}).fill(`0912111111${info.project.name==="chromium"?"1":info.project.name==="firefox"?"2":"3"}`);
  await page.getByRole("button",{name:"دریافت کد تأیید تغییرات",exact:true}).click();
  await page.getByLabel("کد تأیید تغییرات",{exact:true}).fill("111111");
  await page.getByRole("button",{name:"ایجاد حساب مدیر",exact:true}).click();
  await expect(page.getByRole("status").filter({hasText:"حساب مدیر ایجاد شد"})).toBeVisible();
  const audit=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa","wcag22aa"]).analyze();expect(audit.violations).toEqual([]);
});

test("unknown phones gain no account and editors cannot access SMS credentials",async({page})=>{
  await page.goto("/admin/login");await page.getByLabel("شماره همراه",{exact:true}).fill("09129999999");await page.getByRole("button",{name:"دریافت کد ورود",exact:true}).click();await page.getByLabel("کد ورود",{exact:true}).fill("111111");await page.getByRole("button",{name:"ورود به پنل",exact:true}).click();await expect(page.locator("form").getByRole("alert")).toContainText("نادرست");
  await login(page,"09120000002");
  const response=await page.request.get("/api/v1/admin/settings/sms");expect(response.status()).toBe(403);
  await page.goto("/admin/settings/sms");await expect(page.getByRole("heading",{level:1})).toContainText("دسترسی ندارید");
});
