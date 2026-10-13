# گزارش مرحله۶ — CMS ماکان

دامنه این تحویل: مدیریت محتوا و بخش‌های معرفی، مستقل از Backend اصلی ماکان. مجوز شروع از درخواست مستقیم کاربر است؛ STEP7 مجوز تازه می‌خواهد. گیت‌های این دامنه موفق‌اند؛ این تحویل تأیید انتشار Production نیست.

## تغییر و دلیل

صفحه اصلی، صفحات عمومی، امکانات، چهار مخاطب و FAQ اکنون از snapshot واقعی PostgreSQL خوانده می‌شوند. copy تألیف‌شده قبلی به manifest import منتقل شده و fallback hardcode عمومی حذف است. ۲۶ رکورد واقعی پیشین بدون حساب پیش‌فرض وارد شده‌اند؛ اجرای مجدد صفر رکورد ساخته و تغییر مدیر را حفظ می‌کند.

Page/PageRevision موجود، موتور مشترک انتشار است؛ قرارداد و endpoint مستقل هر نوع حفظ شده است. دلیل استفاده از موتور مشترک، حذف تکرار قفل/انتشار/audit و داشتن FK معتبر رسانه به snapshot است؛ جزئیات در step-6-decisions و database-design. Migration0004 شش جدول اضافه می‌کند و محتوا/سکشن/دسته/رسانه/تنظیمات persistence واقعی دارند.

پنل `/admin/content` با فرم مستقل نوع، فیلتر، صفحه‌بندی، سکشن/کارت مرتب، rich text، SEO، readiness/evidence، visibility و تاریخچه فعال است. پیش‌نویس، preview خصوصی، انتشار فوری، برنامه UTC، لغو برنامه، قطع انتشار، انتشار نسخه قبلی و بایگانی مستقل‌اند. If-Match/row_version مانع overwrite همکار است؛ انتشار زمان‌بندی‌شده به job یا ساعت مرورگر وابسته نیست. publication_state پنل از ساعت سرور مشتق می‌شود. بایگانی تاریخچه را حفظ و فرم را برای ویرایش می‌بندد؛ unarchive endpoint در این مرحله وجود ندارد.

`/admin/media` فایل واقعی private WebP روی Volume دارد؛ MIME واقعی، حجم۵MiB،۲۰MP، ضلع۱۰۰۰۰، EXIF و traversal کنترل می‌شوند. SVG/فایل اجرایی/ویدیو خام رد می‌شود؛ تصویر عمومی ابعاد واقعی/alt و Next Image دارد. private preview به optimizer عمومی وارد نمی‌شود. FK snapshot/settings، حذف فایل مصرف‌شده را رد می‌کند. تصویر عمومی دوباره محرمانه اعلام نمی‌شود.

`/admin/faq-categories` دسته/ترتیب و `/admin/settings` برند، تماس، URL HTTPS، لوگوی تأییدشده و SEO پیش‌فرض را مدیریت می‌کنند. تنظیمات فقط مالک، CMS مالک/ویرایشگر و فروش بدون CMS است. auth/CSRF/MFA اختیاری قبلی حفظ شده‌اند. audit در همان transaction است و شکست آن، داده محتوا را rollback می‌کند. secrets خارج CMS/کد و در env می‌مانند.

## معیارهای پذیرش

| معیار | شاهد |
|---|---|
| CRUD → preview خصوصی → publish → SSR بدون تغییر کد | Playwright واقعی برای home/page/feature/audience/FAQ و metadata |
| draft/ویرایش بعدی عمومی نشود، schedule روی snapshot ثابت باشد | HTTPX/PostgreSQL و مرز UTC؛ مرورگر preview/login/draft404 |
| مجوز، CSRF، stale، concurrent slug/edit و audit rollback | تست مثبت/منفی و role owner/editor/sales؛ 401/403/409/428/503 |
| HTML/پیوند/تصویر ناامن اجرا نشود | nh3 و API؛ script/event/style/iframe/SVG؛ preview بدون اجرای XSS |
| فایل خصوصی قبل انتشار؛ ابعاد/EXIF/MIME/size/path/حذف reference | HTTPX واقعی و PNG/JPEG، فایل decode‌شده؛ preview/public browser |
| DB و media بعد restart/recreate حفظ شوند | Docker image مستقل، DB/Volume fixture و checksum ثابت؛ cleanup |
| دسترس‌پذیری و responsive | Chromium/Firefox/WebKit، عرض۳۶۰/۷۶۸/۱۴۴۰، axe و screenshot واقعی |
| build و کیفیت کد | Next production، TypeScript strict، ESLint و Ruff؛ نتیجه نهایی پایین |

## اصلاح‌های پیدا‌شده

Tiptap در تغییر editable رویداد update منتشر می‌کرد؛ hydration و busy transition، draft را بی‌دلیل dirty و دکمه انتشار را بسته می‌کرد. `setEditable(editable,false)` آن را اصلاح کرد و مسیر انتشار دوباره آزموده شد. آزمون تصویر نیز پیش از decode، naturalWidth را می‌خواند؛ همان assertion دقیق۴۸پیکسل با scroll و انتظار decode نگه داشته شد و پاسخ فایل خصوصی۲۰۰ بررسی شد.

شکل UUID رسانه HTML سخت‌گیرانه شد تا آدرس ظاهراً۳۶کاراکتری نامعتبر، خطای داخلی ایجاد نکند؛ src نامعتبر در sanitizer حذف و ذخیره بدون500 آزموده می‌شود. lookup آیکون برای slug دلخواه فقط own property را می‌خواند تا نام‌هایی مانند constructor/\_\_proto\_\_ به prototype شیء نرسند. سکشن بدون عنوان، heading خالی نمی‌سازد.

در اجرای تکمیلی WebKit، پاسخ FAQ با مقدار اولیه در PATCH ذخیره شده بود؛ Trace نشان داد input پیش از hydration و اتصال event handler ویرایش شده است. فرم‌های CMS اکنون با snapshot سرور/کلاینت useSyncExternalStore تا آماده‌شدن disabled هستند و به‌روزرسانی payload به‌شکل functional انجام می‌شود. تست، ورودی سریع را حفظ و پاسخ ذخیره‌شده را قبل publish بررسی می‌کند؛ SSR disabled نیز assert می‌شود. روش با [راهنمای hydration در Playwright](https://playwright.dev/docs/navigations#hydration) و [مرجع React](https://react.dev/reference/react/useSyncExternalStore#adding-support-for-server-rendering) تطبیق داده شد. Timeout برای پنهان‌کردن این ایراد افزایش نیافت.

فیلد multiline/CSV اکنون newline/ویرگول هنگام تایپ را حفظ و فقط هنگام ذخیره normalize می‌کند. تیتر خانه از Hero مدیریت می‌شود تا فیلد بی‌اثر نداشته باشیم. دسته‌ها صفحه‌بندی مدیریتی واقعی دارند؛ media picker همه صفحه‌های فایل را مصرف می‌کند. انتشار snapshot با visibility=false، فایل خصوصی referenced را عمومی نمی‌کند؛ فایل تنها در نسخه visible منتشرشده یا با تصمیم صریح رسانه آزاد می‌شود. این حالت و تغییر بعدی به visible با HTTPX بررسی می‌شوند.

برچسب public/private رسانه نیز eligibility زمان‌بندی رسیده را در نظر می‌گیرد تا تصویر قابل دریافت عمومی، اشتباهاً «خصوصی» معرفی نشود. این حالت قبل از اولین GET فایل در مرز ساعت سرور آزموده می‌شود.

وضعیت پس از schedule بر ساعت سرور و فرم archive بر readonly مبتنی است.

یک اجرای میانی Backend هنگام هم‌زمانی build سنگین Docker/Next، ورود fixture503 گرفت و آزمون بعدی401 شد. شرط ورود موفق به helper تست افزوده و suite بدون build هم‌زمان دوباره اجرا شد؛ timeout تولید افزایش داده نشد. آمار اجراهای ناموفق/متوقف در QA حفظ شده و به‌عنوان موفق حساب نمی‌شوند.

## محدودیت باقی‌مانده

آموزش/مقاله/آپارات/مجموعه/تگ مرحله۷، فرم ذخیره‌شده/CRM مرحله۸، SEO/Structured Data/sitemap/Lighthouse مرحله۹ و Docker وب/proxy/HTTPS/CI/backup-restore عملی مرحله۱۰ هستند. همه صفحات هنوز noindex، متن حقوقی هنوز نیازمند تأیید، تصاویر/لوگوی رسمی و تماس/دامنه نهایی هنوز وابسته به مالک‌اند. هیچ لوگو، مشتری، آمار یا تصویر محصول واقعی اختراع نشده؛ AI roadmap باقی است.

Audit runtime npm صفر finding است؛ ۹ هشدار high ابزارهای توسعه از همان advisory braces قبلی بدون اصلاح سازگار باقی‌اند. force downgrade اعمال نشده و گیت امنیت انتشار Production باز است. محدودیت SameSite metadata در Windows WebKit طبق گزارش مرحله۵ پابرجاست؛ header واقعی Lax در هر سه موتور بررسی می‌شود. axe خودکار، تأیید کامل WCAG یا امتیاز Lighthouse محسوب نمی‌شود.

## فایل‌ها و اجرا

[راهنمای CMS](cms-runbook.md)، [قرارداد API](api-contract.md)، [طراحی دیتابیس](database-design.md) و [تصمیم‌های مرحله۶](step-6-decisions.md) مرجع‌اند. فهرست دقیق فایل‌های جدید/تغییرکرده در step-6-changed-files.md ثبت می‌شود. QA مراحل۲–۵ حفظ شده است؛ شواهد این مرحله در qa/step6 قرار دارند. دیتابیس توسعه و Volume اصلی رسانه حذف نمی‌شوند؛ fixtureها حذف می‌شوند. Commit فقط بعد گیت‌های سبز و گزارش قبل commit؛ Push مجاز نیست.

## نتیجه نهایی

| بررسی | نتیجه واقعی |
|---|---|
| Pytest/HTTPX | ۶۷ موفق، صفر خطا/skip؛ PostgreSQL واقعی؛ ۱۶ آزمون CMS به‌علاوه ۵۱ آزمون پیشین |
| مرورگر کامل | ۱۳۵ موفق در Chromium/Firefox/WebKit؛ ۱۲٫۷دقیقه؛ ۱۷۱ اجرای axe، صفر violation |
| بررسی نهایی CMS پس از اصلاح‌ها | ۲۷ موفق، صفر skip/flaky؛ ۴۵ اجرای axe، صفر violation؛ ورودی سریع، SSR disabled، archive و slugهای ویژه نیز بررسی شدند |
| تصاویر QA | ۱۰۸ PNG واقعی؛ CMS جدید پس از اصلاح‌ها دوباره ثبت شده است |
| Build/کیفیت | Next16.4 production، TypeScript strict، ESLint صفر warning، Ruff check/format موفق |
| Docker | image API/migrate موفق، UID10001، root read-only، caps dropped، DB/فایل/نشست پس از restart و recreate برقرار؛ checksum قبل/بعد یکسان |
| Alembic | head0004، fresh/prior upgrade، grant/constraint و drift صفر |
| وابستگی | runtime وب صفر finding؛ dev همان۹ high از advisory braces |

این تعدادها با هم جمعِ «تست یکتا» نیستند: ۲۷ CMS بخشی از۱۳۵ سناریوی پایه است که پس از اصلاح‌های نهایی دوباره اجرا شد. ۱۷۱+۴۵ تعداد اجرای audit با هم‌پوشانی‌اند. جدول‌های raw summary در QA مرجعند؛ آمار اجراهای متوقف/ناموفق جدا حفظ شده‌اند. Node24.21.0، Edge155.0.4283.45 به‌جای bundled Chromium، Firefox157، WebKit27.2 و Playwright1.64 استفاده شدند. API واقعی توسعه دارای۲۶ محتوا/۲۶ revision و صفر مدیر/رسانه fixture است.

[فهرست دقیق تغییرها](step-6-changed-files.md)، [خلاصه QA](qa/step6/summary.json)، [مرورگر کامل](qa/step6/full-browser-summary.json) و [بررسی نهایی CMS](qa/step6/latest-cms-browser-summary.json) قابل بازبینی‌اند. STEP7 شروع نشده و به تأیید کاربر وابسته است؛ Push انجام نمی‌شود.
