# وب‌سایت ماکان

وضعیت فعلی: STEP 5، ورود امن مدیر، MFA اختیاری و پنل پایه متصل به FastAPI/PostgreSQL واقعی، کنار صفحات عمومی مرحله۳. CMS، CRM و فرم ذخیره‌سازی هنوز ساخته نشده‌اند. وب برای بررسی پیش از انتشار با noindex و robots مسدود است؛ انتشار Production محسوب نمی‌شود.

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

DB تست مستقل است؛ تست‌ها SQLite یا API ساختگی ندارند. جزئیات پذیرش مرحله۴ در [گزارش STEP4](docs/step-4-report.md) ثبت می‌شود. ورود و پنل مرحله۵ طبق [راهنمای مدیر](docs/admin-runbook.md) اجرا می‌شوند؛ حساب پیش‌فرض وجود ندارد. CMS مرحله۶ طبق [راهنمای محتوا](docs/cms-runbook.md) اجرا می‌شود؛ فرم‌های واقعی در مرحله۸ هستند.

پس از migration، اولین مالک واقعی را با ایمیل خود بسازید؛ رمز بدون نمایش پرسیده می‌شود:

```powershell
docker compose exec -it api python -m app.commands.admin bootstrap --email YOUR_REAL_EMAIL
```

مسیر ورود `/admin/login`، امنیت/MFA در `/admin/security` و حساب‌ها/audit مخصوص مالک هستند. کلیدها، recovery و محدودیت‌ها در راهنمای مدیر آمده‌اند.

## بررسی کیفیت

```powershell
npm run lint
npm run typecheck
npm run build
npx playwright install chromium firefox webkit
./scripts/test-web-admin.ps1
```

Playwright سرور تولید مجزا روی پورت 3100 راه می‌اندازد؛ قبل آن build لازم است. ۲۷ سناریوی عمومی، ۹ سناریوی امنیت پنل و ۹ سناریوی CMS برای هر موتور اجرا می‌شوند: RTL، فونت محلی، عرض‌های 320/360/390/479/480/768/1024/1440، منو و focus trap، skip link، tab/accordion/checkbox، reduced motion، بزرگ‌کردن متن، axe، 404، همه مسیرهای سند، یکتایی metadata، لینک‌ها، ترتیب Home، وضعیت AI و فرم غیرفعال. ورود/خروج، RBAC، حساب واقعی، MFA/بازیابی، تغییر رمز و CSP نیز بررسی می‌شوند. DB تست فعال لازم است؛ اسکریپت پنل API واقعی روی۸۱۰۰ و DB اختصاصی موقت می‌سازد و cleanup محدود به همان اجراست. خروجی‌های QA این مرحله در `docs/qa/step6` هستند؛ QA قبلی حفظ شده است.

اگر دانلود Chromium از سرویس رسمی در دسترس نیست و Edge نصب شده، در PowerShell:

```powershell
$env:PLAYWRIGHT_CHROMIUM_CHANNEL='msedge'
npx playwright install firefox webkit
./scripts/test-web-admin.ps1
```

این متغیر فقط پروژه chromium را روی Edge اجرا می‌کند؛ Firefox و WebKit همچنان نسخه‌های مدیریت‌شده Playwright هستند. حذف متغیر برای بازگشت به Chromium bundled: `Remove-Item Env:PLAYWRIGHT_CHROMIUM_CHANNEL`. نسخه مرورگر و محدودیت دانلود باید در گزارش تست ثبت شود.

## ساختار و تغییر طراحی

- `apps/web/src/styles/tokens.css`: رنگ‌ها، typography scale، فاصله، radius، shadow، breakpoints و motion.
- `apps/web/src/styles/globals.css`: RTL shell، container، grid و قواعد focus/reduced motion.
- `apps/web/src/components/ui`: هشت primitive از registry رسمی shadcn و دو جزء اختصاصی status/motion.
- `apps/web/src/components/layout`: Header/Footer/Brand/Container و providers.
- `apps/web/src/features/design-system`: نمونه تعامل‌ها؛ بدون ثبت داده یا API ساختگی.
- `apps/web/src/features/marketing`: کارت‌های مخاطبان/امکانات، FAQ و تب تجربه محصول متصل به CMS؛ copy اولیه در manifest API حفظ شده است.
- `apps/web/src/components/marketing`: hero، CTA، جایگاه تصویر، کانال تماس و صفحات عمومی مشترک.
- `apps/web/public/fonts`: وزیرمتن متغیر محلی و OFL.
- `apps/web/tests/e2e`: پذیرش UI روی سرور production.
- `docs`: تصمیم‌ها، وضعیت نیازمندی‌ها، گزارش مرحله و screenshots واقعی QA.

منبع shadcn: سبک new-york، CLI نسخه قفل‌شده 4.21.4. تغییرات پروژه روی primitives شامل ترجمه close، محل close در RTL، هدف لمسی، کنتراست hover/focus و utilities محلی‌اند. فرمان add بعدی را به‌صورت overwrite بدون بازبینی اجرا نکنید. Next.js در اجرای dev فایل نسخه‌محور `apps/web/AGENTS.md` را ایجاد می‌کند؛ راهنمای همان نسخه در node_modules/next/dist/docs قابل خواندن است.

فونت: Vazirmatn / [منبع رسمی](https://github.com/rastikerdar/vazirmatn)، بسته Fontsource 5.3.0، مجوز SIL OFL 1.1 همراه فایل نگهداری شده است. هیچ تصویر ساختگی محصول، آمار مشتری یا لوگوی جدید به‌عنوان دارایی رسمی معرفی نشده است. رنگ‌ها پیشنهادی و برند متنی موقت‌اند.

سند مبنا و برنامه کامل در [گزارش تحلیل](docs/analysis-report.md)، [سیستم طراحی](docs/ui-design-system.md) و [برنامه اجرا](docs/implementation-plan.md) قرار دارند. گزارش‌های قبلی در `docs/step-2-report.md` و `docs/step-3-report.md` حفظ شده‌اند. منشأ و محدودیت copy در `docs/content-review-step3.md` است. [گزارش STEP5](docs/step-5-report.md) شواهد و ریسک باز dev dependency را ثبت می‌کند؛ audit وابستگی‌های runtime وب صفر finding دارد، اما ابزارهای توسعه به‌علت braces دارای ۹ هشدار high از یک advisory هستند. انتشار Production تأیید نشده است. STEP6 با درخواست کاربر اجرا می‌شود؛ STEP7 به تأیید بعدی کاربر وابسته است. Push فقط با مجوز صریح.

## CMS فعال مرحله۶

صفحات عمومی از API منتشرشده PostgreSQL خوانده می‌شوند؛ بعد migration فرمان `docker compose exec -T api python -m app.commands.import_content` را اجرا کنید. محتوا از سورس تألیف‌شده قبلی وارد می‌شود و import تکراری ویرایش مدیر را تغییر نمی‌دهد. پس از ساخت مالک واقعی، `/admin/content`، `/admin/media`، `/admin/faq-categories` و `/admin/settings` فعال‌اند. تنظیمات مخصوص مالک است؛ محتوا برای مالک/ویرایشگر. [راهنمای CMS](docs/cms-runbook.md) و [تصمیم‌های معماری](docs/step-6-decisions.md) جزئیات snapshot، انتشار، تصویر خصوصی و گیت‌های باقی‌مانده را توضیح می‌دهند. API نسخه0.6.0 است؛ volume دیتابیس و رسانه مستقل‌اند. وب در نبود Backend خطای قابل‌فهم نشان می‌دهد و نسخه hardcode را جایگزین CMS نمی‌کند.
