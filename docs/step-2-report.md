# گزارش تحویل STEP 2 — سیستم طراحی و Layout

تاریخ: ۱۲ اکتبر ۲۰۲۶. محدوده: UI پایه، Design System و layout واکنش‌گرا؛ صفحات بازاریابی نهایی STEP3، API/CMS/auth و فرم ذخیره‌سازی در این مرحله پیاده نشده‌اند. درخواست مستقیم کاربر برای STEP2 مبنای شروع بود؛ bootstrap حداقلی وب به‌عنوان وابستگی همین کار انجام شد.

## خروجی قابل بررسی

دو صفحه اجرایی ساخته شده‌اند: `/` پیش‌نمایش چیدمان عمومی و `/design-system` راهنمای زنده کامپوننت‌ها. header/footer و منوی drawer در هر دو مشترک‌اند. صفحه 404 واقعی نیز ساخته شده است. این build بررسی طراحی، noindex است و robots همه مسیرها را مسدود می‌کند؛ انتشار عمومی محصول نیست.

رنگ، فاصله، typography scale، radius، shadow، breakpoint و زمان حرکت در tokens مرکزی قرار دارند. فونت Vazirmatn متغیر محلی ۴۶۳۰۸ بایت همراه OFL؛ مرورگر برای فونت به سرویس ثالث وصل نمی‌شود. نشان متنی صریحاً موقت و پالت پیشنهادی است. به‌جای داشبورد جعلی، جایگاه تصویر واقعی محصول با برچسب آشکار وجود دارد. هیچ آمار مشتری یا آماده‌بودن AI ساخته نشده است.

Layout کارت‌ها: زیر 480 تک‌ستونه، 480–1023 دو ستون، از 1024 چهار ستون؛ Hero دسکتاپ دو ستون و موبایل/تبلت بازچینش مستقل. CTAها هنگام بزرگ‌شدن متن wrap می‌شوند. ناوبری فعلی لینک‌های واقعی به specimenها دارد؛ مسیرهای محصول و CTA درخواست دمو در مرحله مربوط جایگزین خواهند شد.

primitiveها با CLI رسمی shadcn 4.21.4 از سبک new-york گرفته و برای RTL، focus، contrast، اندازه کنترل و متن فارسی تطبیق داده شدند. نمونه‌ها شامل Button/Input/Textarea/Checkbox/Label/Tabs/Accordion/Sheet و دو جزء اختصاصی StatusBadge/MotionSurface هستند. فیلدهای نمونه submit ندارند؛ پیام تأیید صرفاً نمونه design state است و به عنوان ذخیره واقعی معرفی نمی‌شود.

## نسخه‌های اجراشده

| جزء | نسخه |
|---|---|
| Node gate نهایی | 24.21.0 LTS |
| Node سیستم توسعه | 26.8.1؛ build اولیه نیز موفق بود |
| Next / React / ReactDOM | 16.4.0 / 19.3.0 / 19.3.0 |
| TypeScript / Tailwind | 5.9.3 strict / 4.3.3 |
| ESLint / eslint-config-next | 10.12.0 / 16.4.0 |
| shadcn CLI / Radix / Motion | 4.21.4 / 1.8.0 / 14.1.0 |
| Lucide / Playwright / axe-core adapter | 1.55.0 / 1.64.0 / 4.13.0 |
| فونت Fontsource Vazirmatn | 5.3.0 با فایل OFL |
| مرورگر پروژه chromium | Edge 155.0.4283.45 نصب‌شده، channel=msedge |
| Firefox / WebKit مدیریت‌شده | 157.0 / 27.2 |

نسخه‌های resolved در package-lock ثبت شده‌اند. مسیر دریافت فونت/registry رسمی در README و ui-design-system مشخص است. هیچ provider، secret، account بیرونی یا پروژه Sites ثبت نشده؛ preview فقط محلی است.

## نتایج واقعی کیفیت

| بررسی | نتیجه |
|---|---|
| Build production با Node24، Next standalone | پاس؛ چهار route شامل 404/robots، exit 0 |
| ESLint با max-warnings=0 و Node24 | پاس، exit 0 |
| TypeScript strict/noUncheckedIndexedAccess با Node24 | پاس، exit 0 |
| Playwright روی production standalone | ۵۱/۵۱ پاس، بدون skip/retry/flaky؛ ۱۷ برای هر موتور |
| axe WCAG2A/AA، 2.1AA و 2.2AA در حالت‌های نمونه | ۲۷ audit، صفر violation در حالت‌های تست‌شده |
| عرض‌های 320/360/390/479/480/768/1024/1440 | هر دو صفحه بدون overflow؛ ستون‌های ۱/۲/۴ مطابق مرز |
| منوی موبایل | focus trap، Escape، بازگشت focus، route change و بسته‌شدن پاس |
| keyboard skip/tabs/checkbox/accordion | ورود با Tab و focus واضح، ترتیب RTL و Enter/Space پاس |
| prefers-reduced-motion | حذف smooth scroll/spinner/hover translate و تغییر زنده preference پاس |
| بزرگ‌کردن متن ۲۰۰٪ | هر دو صفحه بدون overflow در سه موتور پاس |
| فونت محلی و network صفحه | font face loaded، درخواست خارج origin صفر، pageerror صفر در تست اصلی |
| 404 واقعی | HTTP404 و recovery link فعال در سه موتور پاس |

آزمون نهایی اصلی ۱۱۵۱۳۳ میلی‌ثانیه طول کشید؛ خلاصه ماشین‌خوان در `docs/qa/step2/final-test-summary.json` همراه Build ID و SHA256 lock است. تعداد ۲۷ از attachmentهای واقعی axe محاسبه شده است. screenshotها از production browser در 390/768/1440 و راهنمای کامپوننت‌ها در 390/1440 برای هر موتور تولید شدند؛ نسخه‌های desktop/mobile به‌صورت بصری بررسی شدند.

فرمان‌های gate نهایی (از apps/web، Node24 با npm exec):

```powershell
npm exec --offline --package=node@24 -- node ../../node_modules/next/dist/bin/next build
npm exec --offline --package=node@24 -- node ../../node_modules/eslint/bin/eslint.js . --max-warnings 0
npm exec --offline --package=node@24 -- node ../../node_modules/typescript/bin/tsc --noEmit
$env:PLAYWRIGHT_CHROMIUM_CHANNEL='msedge'
npm exec --offline --package=node@24 -- node ../../node_modules/@playwright/test/cli.js test
```

cache Node24 پیش‌تر با npm exec دریافت شد. روی میزبان تازه از نصب رسمی Node24 و فرمان‌های README استفاده شود، نه فرض موجودبودن cache. پس از موفقیت suite اصلی، فقط حالت capture screenshot اصلاح شد تا header چسبان در بالای تصویر قرار گیرد؛ شش سناریوی axe/capture مرتبط مجدداً اجرا شدند: ۶/۶ پاس، exit 0، بدون skip/flaky. نتیجه در screenshot-validation-summary ثبت شد. کد UI بین suite اصلی و capture تغییری نکرده است.

## خطاهای یافته‌شده و اصلاح

اجرای اولیه ۳۹/۵۱ و اجرای دوم ۴۸/۵۱ بود؛ خلاصه‌های تاریخی نگهداری شدند و پذیرش نهایی محسوب نمی‌شوند. موارد اصلاح‌شده: ARIA نامعتبر روی decoration (اکنون aria-hidden)، preference حرکت هنگام hydration (useSyncExternalStore با server snapshot امن)، ردیف CTA در بزرگ‌کردن متن (flex-wrap) و skip link در WebKit (tabIndex صفر). خطای export anonymous در PostCSS lint اصلاح و ESLint unsupported اولیه به خط supported 10 منتقل شد. start تولید اکنون server.js مستقل و static/public را سرو می‌کند؛ هشدار استفاده next start با standalone رفع شد.

دانلود Chrome for Testing از سرویس رسمی خطای 403 منطقه‌ای داد؛ بنابراین chromium bundle نصب و تست نشده است. جایگزین آزمون Chromium، Edge واقعی همین دستگاه بوده؛ Firefox و WebKit با مسیر رسمی خود نصب و اجرا شدند. این گزارش آزمون واقعی Safari روی دستگاه Apple یا تلفن فیزیکی را ادعا نمی‌کند.

## فایل‌های ایجاد/تغییر

ریشه ایجادشده: `.gitignore`، `.gitattributes`، `.nvmrc`، `.env.example`، `package.json`، `package-lock.json` و `README.md`. Git محلی روی شاخه main ایجاد شد؛ هویت Git از تنظیم موجود دستگاه است و تغییر داده نشده.

فایل‌های apps/web:

- `package.json`, `tsconfig.json`, `next-env.d.ts`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `components.json`, `playwright.config.ts` و `AGENTS.md` تولیدشده توسط Next.
- `scripts/start-production.mjs`.
- `src/styles/tokens.css`, `src/styles/globals.css`.
- `src/lib/utils.ts`, `src/lib/site-navigation.ts`, `src/hooks/use-reduced-motion.ts`.
- `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/design-system/page.tsx`, `src/app/not-found.tsx`, `src/app/robots.ts`.
- `src/components/layout/brand.tsx`, `site-header.tsx`, `site-footer.tsx`, `container.tsx`, `section-heading.tsx`, `ui-providers.tsx`.
- `src/components/ui/button.tsx`, `input.tsx`, `textarea.tsx`, `checkbox.tsx`, `label.tsx`, `tabs.tsx`, `accordion.tsx`, `sheet.tsx`, `status-badge.tsx`, `motion-surface.tsx`.
- `src/features/design-system/interaction-specimens.tsx`, `tests/e2e/layout.spec.ts`.
- `public/fonts/vazirmatn-arabic-wght-normal.woff2`, `public/fonts/OFL.txt`.

مستندات تغییرکرده: `ui-design-system.md`, `implementation-plan.md`, `requirements-matrix.md`, `validation-report.md`. گزارش جدید: `step-2-report.md`. QA جدید: در هر پوشه chromium/firefox/webkit فایل‌های `layout-390.png`, `layout-768.png`, `layout-1440.png`, `design-system-390.png`, `design-system-1440.png`؛ همچنین `first-run-summary.json`, `second-run-summary.json`, `final-test-summary.json` و خلاصه capture نهایی. گزارش HTML/trace جاری Playwright در مسیر ignored محلی است و وارد Git نمی‌شود.

این اولین Commit مخزن خواهد بود و اسناد تحلیل قبلیِ موجود را هم به‌عنوان baseline حفظ می‌کند؛ فایل HTML مرجع Downloads تغییر نکرده و وارد مخزن نمی‌شود. node_modules/.next/env خصوصی/test-results با gitignore حذف شده‌اند.

## پذیرش و محدودیت باقی‌مانده

R087/R088/R089/R090 در حد پایه UI مرحله۲ اجرا و آزمون شده‌اند؛ وضعیت جزئی و وابستگی‌های تکمیل ردیف‌ها در ماتریس ثبت است. رنگ/لوگو رسمی هنوز تأیید نشده؛ صفحه واقعی امکانات یا content آماده‌ی API نداریم. RHF/Zod و API فرم در STEP8 اضافه می‌شوند. صفر violation axe به معنی گواهی کامل WCAG نیست؛ آزمون انسانی screen reader، همه صفحات نهایی، دستگاه فیزیکی و Lighthouse/CWV در مرحله کیفیت باقی‌اند.

Backend/FastAPI/PostgreSQL/migration/CMS/auth/CRM/Docker/CI/deployment ساخته یا تست نشده‌اند؛ این گزارش موفقیت آن‌ها را ادعا نمی‌کند. bootstrap وب لازم برای STEP2 انجام شده اما STEP1 کلی از جهت API/CI کامل نیست. هیچ Push/انتشار/ارسال پیام به اشخاص انجام نشده است.

گیت بعدی: STEP3 فقط پس از تأیید کاربر. ثبت Commit محلی پس از گزارش تغییرات و موفقیت checks انجام خواهد شد؛ hash نهایی در پیام تحویل گزارش می‌شود.
