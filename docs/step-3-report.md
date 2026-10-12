# گزارش تحویل STEP 3 — صفحات عمومی و معرفی محصول

تاریخ: ۱۲ اکتبر ۲۰۲۶. مبنا: PRD فارسی نسخه ۱.۱، تأیید STEP2 و دستور مستقیم شروع STEP3. این تحویل شامل طراحی و پیاده‌سازی صفحات عمومی روی سیستم طراحی موجود است؛ STEP4 شروع نشده و Backend اصلی ماکان تغییر نکرده است.

## خروجی و وضعیت محصول

۱۹ مسیر عمومی ساخته شد: صفحه اصلی، فهرست امکانات، چهار صفحه امکانات، فهرست راهکارها، چهار صفحه مخاطبان، درباره، FAQ، دمو، تماس، حریم خصوصی، شرایط استفاده، وبلاگ و مرکز آموزش. فهرست دقیق مسیرها و منشأ متن در `content-review-step3.md` ثبت شده است. راهنمای زنده `/design-system` و پاسخ HTTP404 واقعی حفظ شدند.

صفحه اصلی به ترتیب سند شامل Hero، چالش مدرسه، قابلیت‌ها، چهار مخاطب، تجربه محصول با تب‌های RTL، چهار گام راه‌اندازی دستی، اعتماد/FAQ و CTA است. سکشن آموزش شرط وجود محتوای منتشرشده دارد؛ اکنون مطلب واقعی نداریم و کارت آموزشی فرضی نمایش داده نمی‌شود. هر مخاطب مسئله، مزایا، مسیر استفاده و CTA مرتبط خودش را دارد.

کاربر در همین مرحله صریحاً تأیید کرد که پیام‌رسان، مدرسه و گزارش‌ها «آماده معرفی عمومی هستند». برچسب و متن این سه حوزه بر همین مبنا تنظیم شد. AI در نقشه راه است؛ هیچ چت‌بات، پاسخ تولیدشده یا موعد انتشار ساختگی ندارد. این تأیید به معنی آماده‌بودن قابلیت‌های آینده پیام‌رسان، پرداخت، ثبت‌نام سازمان یا provisioning خودکار نیست.

copy اولیه تألیف‌شده از سند در فایل TypeScript مستقل و دارای نوع نگهداری می‌شود تا در STEP6 به CMS منتقل شود. این محتوا Mock API، مشتری فرضی یا داده عملیاتی ساختگی نیست. صفحات عمومی در build پیش‌رندر می‌شوند؛ هر مسیر یک H1، عنوان و توضیح مستقل دارد. Slug نامعتبر امکانات/راهکارها HTTP404 می‌دهد. مسیرهای داخلی همه صفحات در تست بررسی شدند.

## مرز این مرحله و وابستگی‌ها

- لوگو و اسکرین‌شات واقعی هنوز دریافت نشده‌اند؛ نشان متنی موقت و جایگاه تصویر دارای برچسب حفظ شده‌اند. هیچ موکاپ ساختگی به‌عنوان رابط واقعی محصول معرفی نشده است.
- دامنه اپلیکیشن، تلفن و ایمیل رسمی ارائه نشده‌اند. لینک ورود/تماس فقط از متغیر عمومی معتبر ایجاد می‌شود؛ مقدار غایب لینک فرضی ندارد. HTTPS بدون credential برای ورود و قالب محدود برای تلفن/ایمیل پذیرفته می‌شود.
- `/demo` و `/contact` layout کامل فیلدها و توضیح فرایند دارند اما ثبت غیرفعال است: کنترل‌ها disabled، بدون POST، ذخیره محلی یا پیام موفقیت ساختگی. این‌ها فرم عملیاتی نهایی محسوب نمی‌شوند؛ اتصال FastAPI/PostgreSQL، اعتبارسنجی، ضداسپم و CRM در STEP8 انجام می‌شود.
- `/blog` و `/learn` مسیرهای مستقل با حالت صادقانه بدون محتوای منتشرشده‌اند؛ مقاله، ویدیو، مجموعه و مدیریت انتشار در STEP7 ساخته می‌شوند.
- متن حقوقی صریحاً پیش‌نویس است. مسئول قانونی، retention، حذف و کانال رسمی باید پیش از فعال‌شدن فرم‌ها مشخص و متن مصوب شود.
- noindex و robots مسدود از مرحله بررسی حفظ شده‌اند. Canonical، OG، sitemap، Structured Data و آزمون Lighthouse/CWV در STEP9 باقی‌اند؛ امتیاز ۹۰ ادعا نمی‌شود.
- Docker، API، Auth، CMS، CI و استقرار در محدوده این مرحله نیستند و آزمون یا تکمیل آن‌ها ادعا نمی‌شود. انتشار Production انجام نشده است.

## نتایج واقعی بررسی

| بررسی | نتیجه |
|---|---|
| Production build، Node24 / Next standalone | موفق، exit 0؛ همه مسیرهای عمومی پیش‌رندر شدند |
| ESLint، max-warnings=0 | موفق، exit 0 |
| TypeScript strict، noEmit | موفق، exit 0 |
| Playwright روی server تولید | ۸۱ از ۸۱ موفق؛ ۲۷ برای هر موتور؛ بدون skip یا flaky |
| axe، WCAG2A/AA و 2.1AA/2.2AA | ۸۱ audit واقعی، صفر violation در حالت‌های بررسی‌شده |
| ۱۹ مسیر عمومی و تمام لینک‌های داخلی استخراج‌شده | HTTP200، محتوای فارسی SSR، یک H1 و metadata مستقل |
| مسیرهای نامعتبر و محتوای منتشرنشده | HTTP404 واقعی |
| عرض‌های 320/360/390/479/480/768/1024/1440 | Home و Design System بدون overflow؛ ستون‌ها مطابق مرزهای توکن |
| شش صفحه نماینده در 360/768/1440 | بدون overflow و axe موفق در سه موتور |
| منوی موبایل، keyboard، تب RTL، FAQ | focus trap، Escape، بازگشت focus و ناوبری موفق |
| reduced motion و بزرگ‌شدن متن ۲۰۰٪ | موفق در سه موتور |
| وضعیت محصول، AI و فرم غیرفعال | آماده‌بودن سه حوزه، عدم دموی AI و عدم ثبت جعلی بررسی شد |
| git diff --check و اعتبار ساختار مستندات | موفق؛ خروجی STEP2 دست‌نخورده |

اجرای نهایی ۲۲۴۶۷۱٫۷۱۴ میلی‌ثانیه طول کشید. خلاصه ماشین‌خوان در `docs/qa/step3/final-test-summary.json` شامل آمار، Build ID، SHA256 package-lock، نسخه مرورگر و وضعیت محصول است. تعداد audit و violation از محتوای attachmentهای واقعی axe محاسبه شده است. صفر violation ابزار به معنی گواهی کامل WCAG یا آزمون انسانی screen reader نیست.

اجرای اولیه ۶۹/۸۱ موفق و ۱۲ شکست داشت؛ تمام شکست‌ها از overflow ناشی از اندازه ذاتی placeholder تصویر در عرض کوچک/متن بزرگ بود. با تعیین `min-w-0`، عرض کنترل‌شده و ستون `minmax(0,1fr)` و wrap عنوان تب اصلاح شد؛ overflow با CSS پنهان نشد و assertionها کاهش نیافتند. پس از اصلاح، build/lint/typecheck و کل ۸۱ تست مجدداً موفق شدند. خلاصه تاریخی برای شفافیت حفظ شده است.

QA بصری شامل Home دسکتاپ و موبایل، امکانات مدرسه، راهکار مدارس و فرم دمو بوده است. ۳۳ تصویر production در سه پوشه مرورگر ذخیره شدند: Home در 390/768/1440، Design System در 390/1440، امکانات مدرسه/راهکار مدارس/دمو در 360/1440. تصاویر مرحله۲ بازنویسی نشده‌اند.

## محیط و فرمان‌های تکرارپذیر

نسخه وابستگی‌ها و lock نسبت به STEP2 تغییر نکرده‌اند: Node gate برابر 24.21.0، Next16.4.0، React19.3.0، TypeScript5.9.3، Tailwind4.3.3 و Playwright1.64.0. Node سیستم توسعه26.8.1 است ولی gateهای نهایی روی Node24 اجرا شدند.

پروژه chromium با Edge155.0.4283.45 نصب‌شده و channel=msedge اجرا شد؛ دانلود bundled Chromium پیش‌تر خطای403 منطقه‌ای داشت. Firefox157.0 و WebKit27.2 مدیریت‌شده Playwright اجرا شدند؛ تست Safari روی دستگاه Apple یا تلفن فیزیکی ادعا نمی‌شود.

از `apps/web` روی همین میزبان (cache Node24 موجود):

```powershell
npm exec --offline --package=node@24 -- node ../../node_modules/next/dist/bin/next build
npm exec --offline --package=node@24 -- node ../../node_modules/eslint/bin/eslint.js . --max-warnings 0
npm exec --offline --package=node@24 -- node ../../node_modules/typescript/bin/tsc --noEmit
$env:PLAYWRIGHT_CHROMIUM_CHANNEL='msedge'
npm exec --offline --package=node@24 -- node ../../node_modules/@playwright/test/cli.js test
```

روی میزبان تازه Node24 رسمی و فرمان‌های README استفاده شود. اجرای محلی از ریشه `npm ci` و `npm run dev` است. server تولید تست روی3100 مجزا راه‌اندازی و توسط Playwright متوقف می‌شود؛ preview توسعه متعلق به این کار پس از تحویل بسته می‌شود.

## فایل‌های ایجاد و تغییر

ایجاد در `apps/web/src/app`: `about/page.tsx`، `blog/page.tsx`، `contact/page.tsx`، `demo/page.tsx`، `faq/page.tsx`، `features/page.tsx`، `features/[slug]/page.tsx`، `learn/page.tsx`، `privacy/page.tsx`، `solutions/page.tsx`، `solutions/[slug]/page.tsx` و `terms/page.tsx`.

ایجاد در `apps/web/src/components/marketing`: `call-to-action.tsx`، `contact-channels.tsx`، `content-grid.tsx`، `empty-library.tsx`، `feature-icon.tsx`، `legal-document.tsx`، `page-hero.tsx` و `product-visual.tsx`.

ایجاد در `apps/web/src/features/marketing`: `audience-card.tsx`، `content.ts`، `faq-list.tsx`، `feature-card.tsx`، `product-preview.tsx` و `request-form-preview.tsx`. فایل جدید تنظیمات: `apps/web/src/lib/site-config.ts`.

تغییر: `apps/web/src/app/page.tsx`، `layout.tsx` و `not-found.tsx`؛ `src/components/layout/brand.tsx`، `site-header.tsx` و `site-footer.tsx`؛ `src/lib/site-navigation.ts`؛ `.env.example` و `README.md`.

تست‌ها: تغییر `apps/web/tests/e2e/layout.spec.ts` و ایجاد `public-pages.spec.ts`. مستندات: تغییر `requirements-matrix.md` و `implementation-plan.md`؛ ایجاد `content-review-step3.md` و این گزارش. QA: تصاویر نام‌برده و `first-run-summary.json` / `final-test-summary.json` در `docs/qa/step3`.

## پذیرش و ادامه

پذیرش طراحی STEP3 در حد مسیرهای عمومی، محتوای متمایز نقش‌ها، وضعیت صادقانه امکانات، ناوبری، RTL، metadata پایه و layout آزموده‌شده انجام شد. وضعیت جزئی R002–R027 و وابستگی تصویر، CMS، فرم، آموزش و متن حقوقی در ماتریس به‌روزرسانی شده است؛ تکمیل انتهابه‌انتهای این نیازمندی‌ها ادعا نمی‌شود.

گزارش تغییرات پیش از Commit ارائه می‌شود؛ Commit محلی فقط پس از موفقیت checks ثبت و hash در پیام تحویل اعلام می‌شود. هیچ Push یا استقرار انجام نشده است. شروع STEP4 مطابق دستور کاربر به تأیید بعدی وابسته است.
