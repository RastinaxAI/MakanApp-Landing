# وب‌سایت ماکان

وضعیت فعلی: STEP 2، سیستم طراحی و چیدمان واکنش‌گرا. Backend، CMS، CRM و فرم ذخیره‌سازی هنوز ساخته نشده‌اند. این خروجی پیش‌نمایش بررسی طراحی است و با noindex و robots مسدود محافظت می‌شود؛ انتشار عمومی محصول محسوب نمی‌شود.

## اجرا

Node 24 LTS پیشنهاد می‌شود (`.nvmrc`). وابستگی‌ها در package-lock قفل شده‌اند. از ریشه پروژه:

```powershell
npm ci
npm run dev
```

صفحه چیدمان: `http://127.0.0.1:3000/`؛ راهنمای زنده کامپوننت‌ها: `http://127.0.0.1:3000/design-system`.

برای اجرای خروجی تولید:

```powershell
npm run build
npm start
```

start از server مستقل تولیدشده Next و فایل‌های static/public محلی استفاده می‌کند. به‌صورت پیش‌فرض فقط روی loopback اجرا می‌شود. پورت دلخواه: `npm start -- --port 3200` یا `npm run dev -- --port 3200`. Docker و Reverse Proxy تولید در STEP 10 تکمیل خواهند شد؛ این مرحله آزمون Docker ندارد.

## بررسی کیفیت

```powershell
npm run lint
npm run typecheck
npm run build
npx playwright install chromium firefox webkit
npm run test:e2e
```

Playwright سرور تولید مجزا روی پورت 3100 راه می‌اندازد؛ قبل آن build لازم است. ۱۷ سناریو برای هر موتور اجرا می‌شوند: RTL، فونت محلی، عرض‌های 320/360/390/479/480/768/1024/1440، منو و focus trap، skip link، tab/accordion/checkbox، reduced motion، بزرگ‌کردن متن، axe و 404. جای test واقعی API در مراحل بعد حفظ شده است.

اگر دانلود Chromium از سرویس رسمی در دسترس نیست و Edge نصب شده، در PowerShell:

```powershell
$env:PLAYWRIGHT_CHROMIUM_CHANNEL='msedge'
npx playwright install firefox webkit
npm run test:e2e
```

این متغیر فقط پروژه chromium را روی Edge اجرا می‌کند؛ Firefox و WebKit همچنان نسخه‌های مدیریت‌شده Playwright هستند. حذف متغیر برای بازگشت به Chromium bundled: `Remove-Item Env:PLAYWRIGHT_CHROMIUM_CHANNEL`. نسخه مرورگر و محدودیت دانلود باید در گزارش تست ثبت شود.

## ساختار و تغییر طراحی

- `apps/web/src/styles/tokens.css`: رنگ‌ها، typography scale، فاصله، radius، shadow، breakpoints و motion.
- `apps/web/src/styles/globals.css`: RTL shell، container، grid و قواعد focus/reduced motion.
- `apps/web/src/components/ui`: هشت primitive از registry رسمی shadcn و دو جزء اختصاصی status/motion.
- `apps/web/src/components/layout`: Header/Footer/Brand/Container و providers.
- `apps/web/src/features/design-system`: نمونه تعامل‌ها؛ بدون ثبت داده یا API ساختگی.
- `apps/web/public/fonts`: وزیرمتن متغیر محلی و OFL.
- `apps/web/tests/e2e`: پذیرش UI روی سرور production.
- `docs`: تصمیم‌ها، وضعیت نیازمندی‌ها، گزارش مرحله و screenshots واقعی QA.

منبع shadcn: سبک new-york، CLI نسخه قفل‌شده 4.21.4. تغییرات پروژه روی primitives شامل ترجمه close، محل close در RTL، هدف لمسی، کنتراست hover/focus و utilities محلی‌اند. فرمان add بعدی را به‌صورت overwrite بدون بازبینی اجرا نکنید. Next.js در اجرای dev فایل نسخه‌محور `apps/web/AGENTS.md` را ایجاد می‌کند؛ راهنمای همان نسخه در node_modules/next/dist/docs قابل خواندن است.

فونت: Vazirmatn / [منبع رسمی](https://github.com/rastikerdar/vazirmatn)، بسته Fontsource 5.3.0، مجوز SIL OFL 1.1 همراه فایل نگهداری شده است. هیچ تصویر ساختگی محصول، آمار مشتری یا لوگوی جدید به‌عنوان دارایی رسمی معرفی نشده است. رنگ‌ها پیشنهادی و برند متنی موقت‌اند.

سند مبنا و برنامه کامل در [گزارش تحلیل](docs/analysis-report.md)، [سیستم طراحی](docs/ui-design-system.md) و [برنامه اجرا](docs/implementation-plan.md) قرار دارند. نتیجه این مرحله در `docs/step-2-report.md` ثبت می‌شود. قبل از STEP 3 تأیید کاربر لازم است؛ Push فقط با مجوز صریح.
