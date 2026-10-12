# وب‌سایت ماکان

وضعیت فعلی: STEP 4، زیرساخت مستقل FastAPI/PostgreSQL/Alembic کنار صفحات عمومی مرحله۳. ورود مدیر، CMS، CRM و فرم ذخیره‌سازی هنوز ساخته نشده‌اند. وب برای بررسی پیش از انتشار با noindex و robots مسدود است؛ انتشار Production محسوب نمی‌شود.

## اجرا

Node 24 LTS پیشنهاد می‌شود (`.nvmrc`). وابستگی‌ها در package-lock قفل شده‌اند. از ریشه پروژه:

```powershell
npm ci
npm run dev
```

صفحه اصلی: `http://127.0.0.1:3000/`؛ امکانات: `/features`؛ راهکارهای نقش‌ها: `/solutions`؛ راهنمای زنده کامپوننت‌ها: `/design-system`.

مسیرهای عمومی: امکانات پیام‌رسان/مدرسه/گزارش/AI، راهکارهای مدارس/معلم/والد/دانش‌آموز، درباره، FAQ، دمو، تماس، حریم خصوصی و شرایط استفاده. `/blog` و `/learn` هنوز محتوای منتشرشده ندارند. فرم‌ها غیرفعال‌اند و داده‌ای ثبت نمی‌کنند؛ متن حقوقی پیش‌نویس است.

پیام‌رسان، مدرسه و گزارش‌ها با تأیید مستقیم کاربر «آماده» معرفی می‌شوند. AI در نقشه راه می‌ماند. اطلاعات تماس و لینک ورود رسمی هنوز ارائه نشده‌اند و جعل نمی‌شوند. برای تنظیم مقدارهای عمومی معتبر در توسعه، `.env.example` را به `apps/web/.env.local` کپی و مقدارهای تأییدشده را وارد کنید؛ سپس dev یا build را دوباره اجرا کنید. لینک ورود فقط HTTPS بدون credential پذیرفته می‌شود؛ فایل env خصوصی در Git قرار نمی‌گیرد.

برای اجرای خروجی تولید:

```powershell
npm run build
npm start
```

start از server مستقل تولیدشده Next و فایل‌های static/public محلی استفاده می‌کند. به‌صورت پیش‌فرض فقط روی loopback اجرا می‌شود. پورت دلخواه: `npm start -- --port 3200` یا `npm run dev -- --port 3200`. Docker و Reverse Proxy تولید در STEP 10 تکمیل خواهند شد؛ Compose توسعه Backend در STEP4 ساخته و آزموده شده است.

## Backend مستقل

راهنمای کامل نصب Python/uv، migration، مجوزها و تست در [راهنمای Backend](docs/backend-runbook.md). از ریشه با Docker Desktop فعال:

```powershell
./scripts/setup-development.ps1
docker compose build api migrate
docker compose up -d --wait db
docker compose run --rm migrate
docker compose up -d --wait api
```

API: `http://127.0.0.1:8000/api/v1/docs`؛ سلامت: `/api/v1/health/live` و `/api/v1/health/ready`. PostgreSQL توسعه پورت میزبان ندارد؛ schema فقط با Alembic ساخته می‌شود. داده در volume حفظ می‌شود و توقف با `docker compose down` داده را حذف نمی‌کند. `.env` و `.env.test` خصوصی را در Git قرار ندهید.

Python3.13.16، uv0.13.0 و وابستگی‌های دقیق در `apps/api/pyproject.toml` / `uv.lock` ثبت‌اند. پس از `uv sync --frozen` در apps/api، تست واقعی از ریشه:

```powershell
docker compose --env-file .env.test -f compose.test.yaml up -d --wait
./scripts/test-backend.ps1
docker compose --env-file .env.test -f compose.test.yaml down
```

DB تست مستقل است؛ تست‌ها SQLite یا API ساختگی ندارند. جزئیات پذیرش مرحله۴ در [گزارش STEP4](docs/step-4-report.md) ثبت می‌شود. APIهای ورود/CMS/فرم تا مراحل بعد وجود ندارند؛ قبل از STEP5 تأیید کاربر لازم است.

## بررسی کیفیت

```powershell
npm run lint
npm run typecheck
npm run build
npx playwright install chromium firefox webkit
npm run test:e2e
```

Playwright سرور تولید مجزا روی پورت 3100 راه می‌اندازد؛ قبل آن build لازم است. ۲۷ سناریو برای هر موتور اجرا می‌شوند: RTL، فونت محلی، عرض‌های 320/360/390/479/480/768/1024/1440، منو و focus trap، skip link، tab/accordion/checkbox، reduced motion، بزرگ‌کردن متن، axe، 404، همه مسیرهای سند، یکتایی metadata، لینک‌ها، ترتیب Home، وضعیت AI و فرم غیرفعال. جای test واقعی API در مراحل بعد حفظ شده است.

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
- `apps/web/src/features/marketing`: copy تألیف‌شده از PRD و تأیید محصول، کارت‌های مخاطبان/امکانات، FAQ و تب تجربه محصول؛ انتقال به CMS در STEP6.
- `apps/web/src/components/marketing`: hero، CTA، جایگاه تصویر، کانال تماس و صفحات عمومی مشترک.
- `apps/web/public/fonts`: وزیرمتن متغیر محلی و OFL.
- `apps/web/tests/e2e`: پذیرش UI روی سرور production.
- `docs`: تصمیم‌ها، وضعیت نیازمندی‌ها، گزارش مرحله و screenshots واقعی QA.

منبع shadcn: سبک new-york، CLI نسخه قفل‌شده 4.21.4. تغییرات پروژه روی primitives شامل ترجمه close، محل close در RTL، هدف لمسی، کنتراست hover/focus و utilities محلی‌اند. فرمان add بعدی را به‌صورت overwrite بدون بازبینی اجرا نکنید. Next.js در اجرای dev فایل نسخه‌محور `apps/web/AGENTS.md` را ایجاد می‌کند؛ راهنمای همان نسخه در node_modules/next/dist/docs قابل خواندن است.

فونت: Vazirmatn / [منبع رسمی](https://github.com/rastikerdar/vazirmatn)، بسته Fontsource 5.3.0، مجوز SIL OFL 1.1 همراه فایل نگهداری شده است. هیچ تصویر ساختگی محصول، آمار مشتری یا لوگوی جدید به‌عنوان دارایی رسمی معرفی نشده است. رنگ‌ها پیشنهادی و برند متنی موقت‌اند.

سند مبنا و برنامه کامل در [گزارش تحلیل](docs/analysis-report.md)، [سیستم طراحی](docs/ui-design-system.md) و [برنامه اجرا](docs/implementation-plan.md) قرار دارند. گزارش‌های قبلی در `docs/step-2-report.md` و `docs/step-3-report.md` حفظ شده‌اند. منشأ و محدودیت copy در `docs/content-review-step3.md` است. STEP4 به درخواست کاربر اجرا شده؛ قبل از STEP5 تأیید بعدی لازم است. Push فقط با مجوز صریح.
