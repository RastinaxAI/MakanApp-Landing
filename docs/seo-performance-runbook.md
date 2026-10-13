# راهنمای SEO و اندازه‌گیری عملکرد

## پیکربندی انتشار

1. دامنه قطعی HTTPS را در پنل مالک، تنظیمات عمومی `site_url` ثبت کنید؛ فقط origin و بدون مسیر، query یا fragment معتبر است. دامنه هنوز از کاربر دریافت نشده است.
2. نسخه‌های واقعی و بازبینی‌شده محتوا را با `seo.indexable=true` منتشر کنید. پیش‌نویس، بایگانی، مخفی و برنامه‌ریزی آینده قابل ایندکس نیستند. تغییر SEO نیز به انتشار نسخه نیاز دارد؛ ویرایش working نسخه عمومی را عوض نمی‌کند.
3. پس از بررسی staging و محتوا، `SEO_INDEXING_ENABLED=true` را در محیط انتشار قرار دهید. حالت بسته robots کل سایت را disallow و metadata را noindex می‌کند. admin، preview و 404 همواره noindex هستند. نتیجه فرم در حافظه مرورگر می‌ماند، URL مستقل و قابل ایندکس ندارد و meta نمای نتیجه noindex است.
4. `/sitemap.xml` یک index است؛ `/sitemaps/pages/sitemap/0.xml` صفحات عمومی و `/learn/sitemap/0.xml` آموزش/وبلاگ را پوشش می‌دهند. هر قطعه حداکثر ۱۰۰۰ URL، با lastmod نسخه عمومی دارد. هیچ پرسش مستقل، URL مدیریت، فیلتر جست‌وجو یا آموزش خالی در آن نیست. canonical جزئیات به مسیر اصلی بدون query `series/source` اشاره می‌کند. کتابخانه فیلترشده noindex/follow است؛ category و فهرست series فعلاً noindex و قابل دنبال‌کردن‌اند.

## داده‌های ساختاریافته

- Organization و SoftwareApplication بدون لوگو، امتیاز، قیمت یا پلتفرم حدسی؛ لوگو فقط با تأیید و رسانه واقعی.
- FAQPage فقط شامل همان پرسش/پاسخ‌های نمایش‌داده‌شده است؛ BreadcrumbList مطابق مسیر صفحه. مقاله دارای Article و تاریخ‌های انتشار/ویرایش واقعی است.
- VideoObject فقط با cover، Aparat ID، مدت و `video_uploaded_at` دستی معتبر ساخته می‌شود. تاریخ انتشار مقاله جای تاریخ آپلود ویدیو قرار نمی‌گیرد. HTML دلخواه embed پذیرفته نمی‌شود؛ پلیر قبل از انتخاب کاربر به آپارات وصل نمی‌شود.
- JSON-LD با escape کردن `<` در script درج می‌شود. تست‌های محلی ساختار، تطابق متن، URL، تاریخ و عدم بارگیری پلیر را بررسی می‌کنند؛ بررسی نهایی دامنه واقعی در ابزار موتور جست‌وجو و Search Console پس از انتشار باقی است. داده ساختاریافته به معنای تضمین rich result نیست.
- منابع فنی: [راهنمای رسمی VideoObject](https://developers.google.com/search/docs/appearance/structured-data/video)، [راهنمای JSON-LD Next.js](https://nextjs.org/docs/app/guides/json-ld).

## cache و رسانه

HTML و API عمومی `no-store` هستند؛ React cache فقط fetch تکراری در همان رندر را حذف می‌کند. این انتخاب انتشار به‌موقع، لغو انتشار فوری و تغییر تنظیمات ایندکس را حفظ می‌کند. sitemap نیز در زمان درخواست ساخته می‌شود؛ build نیازمند API یا دیتابیس روشن نیست. cache مرورگر برای فایل‌های نسخه‌دار Next و resizeهای رسانه عمومی مستقل است؛ فایل رسانه UUID ثابت و immutable دارد. preview خصوصی بهینه‌ساز عمومی تصویر را دور می‌زند.

فونت Vazirmatn محلی با display=optional است؛ اگر در شبکه کند به اولین paint نرسد، fallback خوانا تا بازدید بعدی حفظ می‌شود و تعویض دیررس رخ نمی‌دهد؛ فونت شخص ثالث دریافت نمی‌شود. تصاویر CMS با ابعاد واقعی، alt و responsive sizes و خروجی AVIF/WebP ارائه می‌شوند؛ hero از preload نسخه جدید Next استفاده می‌کند، تصاویر پایین صفحه lazy هستند. Motion فقط در کامپوننت استفاده‌کننده بارگیری می‌شود و reduced motion حفظ شده است. metadata streaming فعلاً طبق تصمیم مرحله۷ برای 404 واقعی در همه موتورهای مرورگر بسته می‌ماند؛ هزینه TTFB در Lighthouse اندازه‌گیری می‌شود.

## آنالیتیکس با رضایت اختیاری

کاربر در مرحله۹ آنالیتیکس داخلی با رضایت اختیاری را تأیید کرد. فعال‌سازی عمومی با `ANALYTICS_ENABLED=true` در پیکربندی انتشار انجام می‌شود؛ فعلاً false است. رد اجازه، داده خراب/منقضی مرورگر، DNT یا GPC مانع ثبت می‌شود. لغو اجازه ارسال را متوقف و شناسه تب را پاک می‌کند. اطلاعات فرم به این API فرستاده نمی‌شود.

رویدادهای تجاری دقیق سند: `hero_demo_click`, `navigation_cta_click`, `feature_tab_view`, `demo_form_start`, `demo_form_submit_success`, `demo_form_submit_error`, `contact_click`, `faq_expand`. `session_start`, `page_view`, `web_vital` داده‌های فنی مخرج و عملکرد هستند. تب/FAQ روی تغییر واقعی state و فرم روی اعتبارسنجی/پاسخ واقعی ثبت می‌شوند؛ این اندازه‌گیری مستقل از نتیجه تراکنش CRM است و اختلال ارسال آنالیتیکس فرم را متوقف نمی‌کند.

ذخیره سرور: UUID رویداد، HMAC شناسه تصادفی نشست با روز UTC، نوع رویداد، route template ثابت، channel محدود، دسته خطای محدود و metric عددی. nonce خام، IP/UA خام، URL/query/referrer کامل، شماره، ایمیل، نام سازمان، متن، cookie و token ذخیره نمی‌شوند. Origin دقیق، محدودیت مشترک PostgreSQL، UUIDv4 و de-duplication اعمال می‌شوند. UA ربات‌ها به صورت heuristic بررسی می‌شود؛ جعلی‌بودن UA یا referrer و شبکه مشترک می‌تواند آمار را تحت تأثیر قرار دهد. سقف شبکه BFF تا proxy قابل اعتماد مرحله۱۰ مشترک است.

شناسه نشست مخصوص همین تب، با ۳۰ دقیقه بی‌فعالیتی یا تغییر روز عوض می‌شود؛ انتخاب رضایت در کوکی Host-only با Path=/، SameSite=Lax و Secure در HTTPS برای ۳۰ روز معتبر است؛ فقط نسخه سیاست و allow/deny دارد، نه شناسه بازدیدکننده. SSR همین preference را می‌خواند تا popup دیررس ایجاد نشود. این تعریف با یک unique user دائمی برابر نیست. رویدادهای روزهای خارج از پنجره ۳۰ روز در آمار وارد نمی‌شوند. job پاک‌سازی باید روزانه و پایش‌شده اجرا شود:

```powershell
docker compose exec -T api python -m app.commands.analytics_cleanup
```

حذف در batchهای ۵۰۰تایی و commit جدا انجام می‌شود؛ حداکثر ۱۰۰۰ batch در هر اجرا. کد خروج۲ نشان‌دهنده باقی‌ماندن احتمالی backlog و نیاز به اجرای مجدد/هشدار است. bucketهای auth یا فرم حذف نمی‌شوند. زمان job، نگهداری backup و پاک‌سازی دوباره پس از restore در مرحله۱۰ تنظیم می‌شوند؛ این مرحله job خارجی ایجاد نمی‌کند.

## تعریف KPI

بازه پنل ۳۰ روز تقویمی UTC و API از ۱ تا ۳۰ روز است. فقط نشست دارای session_start در cohort قرار می‌گیرد. منبع organic بر اساس hostname موتور جست‌وجو و بدون نگهداری referrer تشخیص داده می‌شود؛ ادعای attribution قطعی ندارد.

| شاخص | تعریف |
| --- | --- |
| نشست ارگانیک | تعداد distinct HMAC نشست cohort دارای session_start با channel=organic |
| تبدیل بازدید به نتیجه موفق دمو | distinct نشست دارای demo_form_submit_success / نشست‌های cohort |
| موفقیت نتیجه تلاش فرم | success / (success + error)، فقط نتایج ارسال‌شده با رضایت؛ تلاش بدون نتیجه در مخرج نیست |
| خطای نتیجه تلاش فرم | error / (success + error)، validation/server/network/rate_limit بدون پیام خام |
| qualified و قرارداد | آمار cohort مستقل CRM؛ won فقط برای دمو؛ منبع allowlist مرحله۸ |
| CWV | p75 آخرین نمونه هر document/نشست/شاخص در cohort؛ INP/LCP میلی‌ثانیه و CLS بدون واحد |

مخرج صفر null است. sample<100 با هشدار کمبود نمونه نمایش داده می‌شود؛ ۱۰۰ نمونه تضمین آماری یا نمایندگی همه کاربران نیست. مرورگرهای فاقد پشتیبانی یا بازدیدکنندگان بدون رضایت در نمونه نیستند. web-vitals6.2.3 پس از رضایت import می‌شود؛ metric id خام ارسال نمی‌شود. گزارش‌های بعدی با UUID ثابت و شماره ترتیبی ثبت می‌شوند؛ گزارش دیررس یا نشست/نوع متفاوت رکورد قبلی را عوض نمی‌کند. مسیر اولیه document حفظ می‌شود و ابزار به تغییر مسیر SPA به‌عنوان بارگیری document تازه نگاه نمی‌کند. [مستندات رسمی web-vitals](https://github.com/GoogleChrome/web-vitals).

## اجرای پذیرش

```powershell
docker compose -f compose.test.yaml --env-file .env.test up -d --wait
pwsh -NoProfile -File scripts/test-backend.ps1 -Phase step9
pwsh -NoProfile -File scripts/test-web-admin.ps1 -SeoOnly
pwsh -NoProfile -File scripts/test-web-admin.ps1 -Step9Acceptance -BrowserProject chromium
pwsh -NoProfile -File scripts/test-web-admin.ps1 -Step9Acceptance -BrowserProject firefox
pwsh -NoProfile -File scripts/test-web-admin.ps1 -Step9Acceptance -BrowserProject webkit
pwsh -NoProfile -File scripts/test-web-admin.ps1 -LighthouseOnly
apps/api/.venv/Scripts/python.exe scripts/test-leads-docker.py --phase step9
```

پیش‌نیاز مرورگر: build تولید Node24، Edge/Firefox/WebKit نصب‌شده، image API ساخته‌شده و credential تست مستقل. Selenium/Mock API یا دیتابیس اصلی برای fixture استفاده نمی‌شود. scriptها فقط پردازش‌ها و DB/volume متعلق به همان آزمون را پاک می‌کنند. هم‌زمان build سنگین Docker، Lighthouse و suite مرورگر اجرا نکنید.

Lighthouse13.5.0 با مرورگر تازه برای هر اجرا، mobile و simulated throttling ثبت‌شده در raw report، cold cache و سه اجرای هر شش مسیر است. هر دور پوشه زمان‌دار مستقلی دارد؛ شکست‌های قبلی حذف نمی‌شوند. نتایج محلی HTTP با محتوای آزمون مقاله/ویدیو، پذیرش HTTPS staging یا اثبات CWV میدانی نیستند. نتایج واقعی نهایی در گزارش مرحله۹ ثبت می‌شوند؛ target median Performance/SEO>=90 است.

## رضایت و شمارش آموزش

Qualified view مرحله۷ هم تابع همین flag و انتخاب اختیاری است؛ خواندن مقاله/پخش ویدیو به اجازه اندازه‌گیری نیاز ندارد. ارسال POST view علاوه بر ticket به consent=true و policy_version نیاز دارد. درخواست بدون رضایت یا با DNT/GPC شمارش نمی‌شود. شمارش محبوبیت از بازدید واجد شرایط رضایت‌داده، شبکه/dedupe و حداقل۲۰ثانیه قابل‌مشاهده به دست می‌آید؛ نمایش صفر به معنی ادعای محبوبیت نیست. لغو اجازه timer و درخواست را متوقف می‌کند. hashهای کوتاه‌مدت۲روزه ماژول بازدید و aggregate آن طبق learning_cleanup پاک/حفظ می‌شوند؛ job آن نیز در مرحله۱۰ راه‌اندازی می‌شود.

در آماده‌سازی fixture، DDL مهلت۳۰ثانیه دارد تا pause سیستم میزبان index خالی را شکست ندهد؛ این تنظیم تنها مالک دیتابیس تست است و timeoutهای runtime API را تغییر نمی‌دهد. Suiteهای مرورگر را در میزبان ۸GiB RAM با یک موتور و DB تازه در هر اجرا اجرا کنید؛ افزایش timeout برای پوشاندن خطای عملکرد انجام نشده است.

دکمه‌ها پس از hydration تغییر opacity انیمیشنی ندارند؛ transition فقط رنگ، پس‌زمینه، border و shadow را پوشش می‌دهد. خطای گذرای کنتراست۳٫۰۳ در WebKit ثبت شد. تست layout اکنون دسته واقعی مستقل خود را می‌سازد تا کنترل ویرایش/حذف در اجرای متمرکز هم حضور داشته باشد. بررسی مجدد: `scripts/test-web-admin.ps1 -LearningLayoutOnly -BrowserProject chromium` و همان فرمان برای firefox؛ WebKit با `-Step9Acceptance -BrowserProject webkit` اجرا می‌شود.

میانه خانه در دور بازبینی بعدی۸۹ بود. Lighthouse بارگیری Zod بلااستفاده در خانه را ثبت کرد؛ واردکردن فرم از PublicPage عمومی حذف و composition آن فقط در route دمو و تماس انجام شد. HTML و عملکرد فرم حفظ می‌شوند، سایر صفحات بسته اعتبارسنجی فرم را دریافت نمی‌کنند. build و صفحات عمومی سه مرورگر، SEO/رضایت و Lighthouse پس از این اصلاح تکرار می‌شوند؛ تمام raw reportها باقی‌اند.
