# گزارش مرحله۹ — SEO و Performance

مرحله۹ طبق درخواست مستقیم کاربر اجرا شد. سیاست «آنالیتیکس داخلی با رضایت اختیاری؛ دامنه بعداً اعلام می‌شود» ثبت شد. دامنه اصلی و HTTPS staging هنوز اعلام نشده‌اند؛ flags انتشار و جمع‌آوری عمومی false هستند. Backend محصول اصلی ماکان تغییر نکرده است و STEP10 آغاز نشده است.

## تغییرات قابل بررسی

- metadata مستقل، canonical مسیر اصلی، OG/Twitter با ابعاد/alt واقعی، breadcrumb و Article/Organization/SoftwareApplication/FAQPage/VideoObject بر داده CMS؛ بدون امتیاز، قیمت، لوگوی نهایی یا تاریخ ویدیو حدسی. JSON-LD escape امن دارد؛ ویدیو بدون uploadDate معتبر schema ویدیو ندارد.
- sitemap index و گروه‌های pages/learning در قطعات۱۰۰۰تایی؛ فقط snapshot عمومی مؤثر و indexable. draft/future/archive/hidden/empty/legal draft/internal حذف می‌شوند. slug فارسی در Unicode و encoded هم‌ارز است. build به API روشن وابسته نیست. canonical queryهای source/series/filter را حذف می‌کند و صفحات فیلتر noindex هستند.
- هشت رویداد دقیق سند و KPI با cohort/مخرج/صفر=null؛ API strict، Origin/rate/dedupe، بدون اطلاعات فرم و URL/referrer/IP/UA خام. نشست تصادفی همین تب پس از۳۰دقیقه بی‌فعالیتی یا روز UTC عوض و در DB HMAC می‌شود. policy_version و DNT/GPC در مرورگر و BFF/API بررسی می‌شوند.
- رضایت اختیاری از ابتدا در SSR نمایش می‌یابد؛ کوکی فقط نسخه و allow/deny و عمر۳۰روز دارد، نه شناسه. رد/لغو اجازه خدمات و فرم را متوقف نمی‌کند. شمارش qualified view هم consent/flag/privacy را رعایت و timer را هنگام لغو متوقف می‌کند. min۲۰ثانیه، bot و daily dedupe حفظ شده‌اند.
- `/admin/analytics` برای owner/sales، مقدارهای واقعی و sample count و p75؛ RUM با web-vitals6.2.3 و update ترتیبی آخرین گزارش هر document/نشست/شاخص، بدون نسبت‌دادن آن به route بعدی SPA. metric دیررس/نوع یا نشست متفاوت جای گزارش نهایی را نمی‌گیرد.
- migration افزایشی0007 فقط جدول analytics_events و دسترسی محدود؛ API0.9.0. retention۳۰روز و CLI batch۵۰۰ با commit جدا، backlog exit2؛ UPDATE فقط دو ستون metric. شمارش آموزش hash کوتاه‌مدت۲روزه و aggregate مستقل دارد.
- فرم و بسته اعتبارسنجی فقط در دو route دمو و تماس بارگیری می‌شوند؛ Motion از root به مصرف‌کننده، local font با display=optional، next/image AVIF/WebP و preload hero؛ popup/font CLS اصلاح و heading گروه‌ها مرتب شد. favicon صریحاً placeholder است و در schema به‌عنوان لوگوی نهایی معرفی نمی‌شود.

## نتایج واقعی

| بررسی | نتیجه |
| --- | --- |
| Pytest/HTTPX و PostgreSQL17.11 | ۱۶۲ موفق؛ صفر failure/error/skip |
| Playwright سه موتور | 153 موفق؛ ۱۲ SEO/privacy و ۱۰۵ auth/CRM/آموزش/صفحات عمومی، ۶ تکرار layout کنتراست و ۳۰ تکرار صفحات عمومی پس از تفکیک bundle فرم؛ صفر skip/flaky |
| axe | 279 بررسی نهایی موفق با شواهد محفوظ؛ صفر violation؛ 267 attachment و 12 فایل مستقیم |
| Production Build / TypeScript / ESLint / Ruff | موفق، Node24 LTS و lockهای موجود |
| Docker API/migrate و persistence | موفق؛ nonroot10001:10001، read-only/cap-drop، محتوا/رسانه/درخواست/آمار/نشست پس از restart/recreate؛ purge runtime موفق |
| migration main توسعه | head0007؛ pages۲۶/revisions۲۹/audit۲۹ و سایر داده‌های پیشین ثابت؛ admin/lead/media/learning/analytics صفر، fixture وارد main نشده |
| audit runtime وب | صفر finding؛ ۹ high توسعه از advisory قبلی باقی و force downgrade انجام نشده |

## Lighthouse

Lighthouse13.5.0، Edge تازه در هر اجرا، build تولید محلی HTTP، mobile/simulated throttling ثبت‌شده در raw report، cold cache و سه دور هر مسیر؛ staging HTTPS نیست. مقاله/ویدیو fixture مستقل‌اند، محتوای رسمی محصول نیستند. فایل‌های همه دورها در [QA](qa/step9/lighthouse/summary.json) و پوشه‌های زمان‌دار حفظ شده‌اند.

| مسیر | median Performance | SEO | Accessibility | LCP آزمایشگاه (ثانیه) | CLS |
| --- | --- | --- | --- | --- | --- |
| `/` | 92 | 100 | 100 | 2.95 | 0 |
| `/features` | 95 | 100 | 100 | 2.78 | 0 |
| `/solutions/schools` | 96 | 100 | 100 | 2.77 | 0 |
| `/demo` | 92 | 100 | 100 | 2.92 | 0 |
| `/learn/articles/seo-article` | 93 | 100 | 100 | 2.93 | 0 |
| `/learn/videos/seo-video` | 94 | 100 | 100 | 2.95 | 0 |

هدف median Performance/SEO>=90 در شرایط محلی ثبت‌شده پاس شد؛ Performance تک‌اجراها از78 تا96 است و همه دورها بالای۹۰ نیستند. میانه معیار از پیش تعریف‌شده این آزمون است. JavaScript دریافتی خانه پس از تفکیک فرم از۲۴۰۹۴۴ به۱۹۳۱۱۲ بایت کاهش یافت (حدود۲۰٪)؛ فایل form-bundle-comparison.json دو گزارش خام را مقایسه می‌کند. LCP آزمایشگاهی بعضی مسیرها هنوز بالاتر از۲٫۵ثانیه است؛ INP/p75 میدانی و هدف CWV از این آزمون قابل اثبات نیستند. داده واقعی کافی هنوز وجود ندارد. نتایج قبل از اصلاح (home median۷۸، demo۸۹، video۸۱ و CLS فونت/popup) نیز باقی‌اند.

## خطاهای اصلاح و ثبت‌شده

وابستگی generateSitemaps به API در build با route handler زمان درخواست رفع شد. breadcrumb تکراری حذف شد. ثبت تب/FAQ از event delegation به تغییر واقعی state منتقل شد. تست، navigation event را با اتمام navigation اشتباه می‌گرفت؛ انتظار URL/heading واقعی افزوده شد. timeout اولیه کتابخانه در suite مشترک ثبت و DB تازه برای هر موتور استفاده شد. provisioning یک CREATE INDEX با مهلت API سه‌ثانیه شکست خورد؛ مهلت DDL fixture۳۰ثانیه شد، timeoutهای runtime API افزایش نیافتند. در WebKit گذار opacity دکمه پس از hydration کنتراست موقت۳٫۰۳ داشت؛ transition به رنگ/پس‌زمینه/border/shadow محدود شد. پس از build تازه، WebKit کامل و شش آزمون layout مرتبط Chromium/Firefox تکرار شدند. suiteهای کامل Chromium/Firefox پیش از این اصلاح CSS موفق بودند؛ آخرین بررسی‌های مرتبط همه موتورهای نهایی سبز هستند؛ در دور نهایی پیش از تفکیک فرم، میانه خانه۸۹ شد؛ نمودار bundle بارگیری Zod بلااستفاده را نشان داد. composition فرم فقط به دو route دمو/تماس منتقل شد و SEO/فرم/صفحات عمومی و Lighthouse دوباره اجرا شدند. شکست‌های قبلی حذف یا به موفقیت تبدیل نشده‌اند.

## پذیرش و محدودیت انتشار

R077–083 و R051/R063 در سطح کد و آزمون داخلی پوشش داده شدند؛ ماتریس وضعیت مرحله۹ به‌روز است. R084 ابزار واقعی دارد، اما بدون ترافیک کافی نتیجه میدانی ندارد. R085 محلی پاس است و HTTPS staging با assets/محتوای واقعی نیازمند اطلاعات کاربر و مرحله۱۰ است. بازبینی Search Console/schema validator روی دامنه قطعی، محتوای رسمی مقاله/ویدیو و لوگو/OG واقعی، پخش واقعی آپارات، بندهای حقوقی باقیمانده، proxy قابل اعتماد IP، jobهای retention و backup/restore و استقرار Production باقی‌اند. هیچ داده رسمی یا baseline ساختگی تولید نشده است.

فهرست دقیق تغییرات در [فایل‌های مرحله۹](step-9-changed-files.md)، قرارداد در [API](step-9-contract.md)، پیکربندی/تعریف KPI/اجرای تست در [راهنمای عملیاتی](seo-performance-runbook.md) و شواهد [summary](qa/step9/summary.json) است. تغییر از قبل موجود next-env.d.ts حفظ و از commit خارج می‌شود. Push و شروع STEP10 تا مجوز تازه کاربر انجام نمی‌شوند.
