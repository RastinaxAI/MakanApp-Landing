# گزارش بررسی‌های تازه — V2 / STEP 0

تاریخ: ۱۴ اکتبر ۲۰۲۶. Commit مبنا: `6b64c35f636847a786cad62258323eb4149411d8`.

## نتایج بازاجرا

| بررسی | نتیجهٔ واقعی | دامنه و محدودیت |
|---|---|---|
| Pytest Unit | **۷۴ passed**، ۱۰٫۲۹ ثانیه | tests/unit؛ اعتبارسنجی، امنیت، learning safety، backup crypto و operator guards |
| Pytest Integration | **۱۳۵ passed**، ۳۰۸٫۲۳ ثانیه | tests/integration با PostgreSQL مجزای 15432؛ CMS/CRM/auth/OTP/SEO/learning/operations/schema |
| مجموع Backend | **۲۰۹ passed، بدون failed/skipped** | حاصل دو اجرای کامل unit و integration در این ممیزی؛ ادعای اجرای E2E جدید نیست |
| Ruff | passed | `ruff check apps/api scripts`، بدون اصلاح کد |
| ESLint | passed | workspace وب، بدون fix |
| TypeScript | passed | `tsc --noEmit --incremental false`؛ بدون تغییر next-env یا tsbuildinfo توسط این فرمان |
| Production Next.js + Docker image | passed | Dockerfile موجود، build واقعی Next و TypeScript داخل container؛ سورس میزبان بازنویسی نشد |
| Actionlint | passed | workflow موجود GitHub Actions؛ اجرای remote CI در این مرحله انجام نشد |
| Development Compose config | passed | profileهای tools/website، config --quiet؛ سرویس‌های اصلی جایگزین نشدند |
| Production Compose config | passed با ورودی موقت اعتبارسنجی | دامنهٔ audit.invalid و کلیدهای تصادفی فقط در process؛ هیچ سرویس Production شروع نشد |
| Secret scan موجود | passed | ۴۲ credential شناخته‌شدهٔ محلی؛ هیچ فایل در دسترس Git حاوی این مقادیر نبود؛ اسکن عمومی entropy/OCR نیست |
| Health live/ready | 200 / 200 | API فعلی در حال اجرا |
| Public route smoke | ۷ صفحهٔ عمومی + login: 200 | فقط GET؛ ثبت فرم/ورود در DB اصلی انجام نشد |
| Guest CRM | 401 | درخواست GET بدون ورود؛ نقش‌ها و mutationها در integration مستقل تست شدند |
| Browser desktop/mobile | RTL، یک H1، بدون overflow افقی | Chromium/Edge مستقل، ۱۴۴۰×۱۰۰۰ و ۳۹۰×۸۴۴؛ screenshot و DOM check، نه full axe یا visual regression |
| Database قبل/بعد | بدون تغییر موجودی بررسی‌شده | ۲۶ صفحه منتشرشده، ۲۹ revision، ۰ رسانه، ۰ لید، ۱ مدیر؛ head همچنان 0008_phone_otp |
| Source diff | بدون تغییر جدید کد | تنها tracked diff قبلی next-env.d.ts باقی مانده؛ SHA256 پایین ثابت بود |

Image ساخته‌شده برای ممیزی: `makan-landing-v2-audit-web:step0` با شناسهٔ `sha256:8dae313cbb65d3d8154ebf5ebc034a5ad2c0ceefecaf64a96ef3b2de3f7ea0a8`.

مرحلهٔ Next build داخل Docker حدود ۴۷۷ ثانیه طول کشید. این زمان روی میزبان فعلی، معیار سرعت سایت یا Core Web Vitals نیست. Image فقط ساخته شد و جایگزین سرویس جاری نشد.

## تست‌های اجراشده چه چیزی را ثابت می‌کنند؟

- CMS: ذخیره و انتشار واقعی، جدایی Draft/Published، schedule، rollback تراکنش، concurrency، slug، sanitizer، settings/RBAC و رسانهٔ private/public.
- CRM موجود: commit فرم، retry/idempotency هم‌زمان، خطای commit، validation/rate limit، تخصیص، یادداشت، تاریخچه، filter، metric و purge.
- Auth: OTP، مجوز/نشست/CSRF/MFA و محدودیت‌ها در fixtures مستقل. ارسال به MeliPayamak با transport کنترل‌شدهٔ تست انجام می‌شود، نه SMS واقعی.
- DB: schema/model parity، migration موجود، قیود، نقش runtime محدود و حفظ مدیر در upgrade seeded قبلی.

این تست‌ها، قابلیت‌هایی مثل Canvas، nested widgets، school/opportunity/demo management یا مهاجرت V2 را تأیید نمی‌کنند؛ چنین قابلیت‌هایی هنوز پیاده نیستند.

## تلاش‌های اولیه و اصلاح روش اجرا

1. یک invocation اولیهٔ Pytest از ریشهٔ repository آغاز شد. پیش از تکمیل متوقف شد چون fixtures باید از apps/api و پس از آماده‌شدن PostgreSQL اجرا شوند. هیچ نتیجهٔ موفق برای آن invocation محسوب نشده است. unit و integration سپس از apps/api به‌طور کامل پاس شدند.
2. Production Compose با فایل example که عمداً secret/domain خالی دارد، interpolation را رد کرد. این نقص Compose نیست؛ بار دوم فقط برای config validation، ورودی موقت process فراهم شد و بررسی پاس شد. این ورودی، تنظیم Production یا مجوز deployment نیست.
3. ابزار متنی وب مرجع blubank را با redirect loop باز نکرد؛ مرورگر مستقل صفحه را باز و snapshot تهیه کرد.

هیچ کد برنامه‌ای برای رفع این موارد تغییر نکرد.

## حفظ داده و Workspace

SQL اصلی در `BEGIN READ ONLY` اجرا شد. fixtureهای integration تنها DBهایی با نام کنترل‌شده در localhost:15432 ایجاد/حذف می‌کنند و به DB اصلی دسترسی ندارند. سرویس موقت db-test پس از بررسی متوقف شد؛ api/db/web اصلی همچنان healthy بودند.

SHA256 تغییر موجود و دست‌نخوردهٔ `apps/web/next-env.d.ts`:

`8ec3ce3779934093a914a35207c1ffdd6d2ba6b4a504a67b81f61f6da6272398`

فایل‌های جدید این ممیزی:

- `docs/v2-step0-audit.md`
- `docs/v2-technical-plan.md`
- `docs/v2-data-preservation.md`
- `docs/v2-step0-verification.md`
- `docs/qa/v2-step0/secret-scan.json`
- `docs/qa/v2-step0/verification.json`
- `docs/qa/v2-step0/pytest-unit.xml`
- `docs/qa/v2-step0/pytest-integration.xml`

API تغییرکرده: **هیچ**. Migration جدید: **هیچ**. قابلیت اجرایی ارتقایافته/جدید: **هیچ در STEP 0**. قابلیت‌های فعلی حفظ شدند؛ خروجی جدید، گزارش و طرح ارتقاست.

Commit جدید: **انجام نشد**؛ تغییر کد مجاز نیست و گزارش‌های ممیزی برای بررسی باقی مانده‌اند. Push: **انجام نشد**.

## شواهد و محدودیت‌های باقی‌مانده

JUnitهای اجرای تازه در همین پوشهٔ QA نگهداری می‌شوند. تصاویر وضعیت فعلی و DOM summary در `.preview/v2-audit/` هستند؛ این پوشهٔ خصوصی در Git نیست. تصاویر، screenshot نمونهٔ طراحی V2 محسوب نمی‌شوند.

Build و تست‌های قبلی TLS/restore/E2E/axe در `docs/qa/admin-refresh` شواهد تاریخی‌اند. در STEP 0 full E2E، تست سه موتور، Lighthouse، WCAG کامل، visual regression، fresh Production restore یا ارسال واقعی SMS بازاجرا نشده است. بر همین اساس ادعای Production deployment، امتیاز Performance یا تکمیل دسترس‌پذیری V2 نداریم.

ایراد D-01 FAQ از مسیر کد اثبات شده؛ برای آن تست منتشرکردن برگهٔ جدید در محیط اصلی اجرا نشده و اصلاح نیز انجام نشده است.

**توقف:** STEP 0 پایان یافته؛ STEP 1، نمونهٔ Hero + دو بخش و screenshots طراحی جدید، تا تأیید کاربر شروع نمی‌شوند.
