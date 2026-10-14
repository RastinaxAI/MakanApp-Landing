# ممیزی پروژهٔ موجود — MakanApp Landing V2 / STEP 0

تاریخ: ۱۴ اکتبر ۲۰۲۶. مبنا: کد موجود در Workspace، API در حال اجرا، دیتابیس محلی و تست‌های فعلی؛ نه صرفاً گزارش‌های مراحل قبلی.

**نتیجه:** بازنویسی لازم نیست. CMS نسخه‌دار و فرم‌های واقعی موجود، پایهٔ مناسبی برای ارتقا هستند. CMS فعلی صفحه‌ساز بصری نیست و CRM فعلی ابزار رسیدگی به درخواست‌هاست؛ مدل‌های مدرسه، فرصت فروش و جلسهٔ دمو هنوز وجود ندارند.

این مرحله فقط ممیزی است. کد، API، Migration، داده‌های اصلی و طراحی عمومی تغییر نکرده‌اند. گزارش‌ها تنها خروجی جدید هستند. تغییر قبلی `apps/web/next-env.d.ts` متعلق به وضعیت اولیهٔ Workspace است و حفظ شده است.

## مبنا و روش بررسی

- Commit مبنا: `6b64c35f636847a786cad62258323eb4149411d8`؛ هیچ Commit یا Push جدیدی در این ممیزی انجام نمی‌شود.
- Frontend: Next.js 16.4.0، React 19.3.0، TypeScript 5.9.3، Tailwind CSS 4.3.3؛ Tiptap 3.31.4 از قبل نصب است.
- Backend: FastAPI، SQLAlchemy، PostgreSQL، Alembic؛ آخرین Migration موجود و دیتابیس محلی: `0008_phone_otp`.
- بررسی مدل‌ها، Schemaها، Serviceها، Routerها، CMS Renderer/Editor، فرم‌ها، رابط CRM، مجوزها، تنظیمات استقرار و تست‌ها.
- دیتابیس اصلی با تراکنش `READ ONLY` بررسی شد؛ هیچ فرم یا ورود تغییردهنده‌ای روی آن اجرا نشد.
- مرورگر مستقل، فقط صفحهٔ عمومی موجود را در دسکتاپ ۱۴۴۰ و موبایل ۳۹۰ بررسی کرد. این تصاویر، نمونهٔ طراحی V2 نیستند.
- وضعیت Working در جدول‌ها به عملکرد **موجود و محدود** اشاره دارد؛ به معنی تکمیل نیازمندی V2 یا تأیید Production عمومی نیست. شواهد بازاجرای تست‌ها در انتهای گزارش تفکیک می‌شوند.

| عنوان وضعیت | معنی در این ممیزی |
|---|---|
| Existing & Working | قابلیت فعلی، در دامنهٔ مشخص، موجود است و شواهد تست/اجرا دارد |
| Existing but Incomplete | بخشی کار می‌کند، اما نیاز V2 را کامل پوشش نمی‌دهد |
| Existing but Defective | رفتار موجود با ورودی/تنظیم ارائه‌شده ناسازگار است؛ روش تشخیص ذکر می‌شود |
| Missing | در مدل، API یا رابط فعلی پیاده‌سازی مربوط پیدا نشده است |

## وضعیت زندهٔ محلی

| مورد | مشاهدهٔ فعلی |
|---|---|
| سرویس‌های اصلی Docker | db، api و web در حال اجرا و healthy |
| محتوای موجود | ۲۶ ردیف: ۱ home، ۱۰ page، ۴ feature، ۴ audience، ۷ faq؛ همگی دارای نسخهٔ منتشرشده |
| نسخه‌های محتوا | ۲۹ ردیف در `page_revisions` |
| رسانهٔ CMS / لید / مدیر | به ترتیب ۰ / ۰ / ۱ ردیف؛ لوگوی فایل عمومی جدا از MediaAsset است |
| انتشار زمان‌بندی‌شده / آرشیو | فعلاً ۰ / ۰ |
| روابط بررسی‌شدهٔ یتیم | page_revisions و revision_media_refs: صفر |
| تنظیمات SMS | هیچ ردیف تنظیم‌شده‌ای وجود ندارد؛ config عمومی: debug=true، legacy=false |
| API | نسخهٔ 0.10.0 و ۱۲۳ الگوی مسیر OpenAPI؛ این تعداد، شمار عملیات مستقل نیست |
| مسیرهای عمومی بررسی‌شده | `/`، `/features`، `/solutions`، `/demo`، `/contact`، `/learn` و `/admin/login`: پاسخ 200 |
| دسترسی مهمان به CRM | `/api/v1/admin/leads`: پاسخ 401 |
| SEO عمومی | origin=null و enabled=false؛ دامنهٔ نهایی هنوز اعلام نشده است |

صفر بودن لید یا رسانهٔ محلی، دلیل حذف یا عدم وجود این ماژول‌ها نیست. سناریوهای ذخیره‌سازی با دیتابیس آزمایشی مستقل بررسی می‌شوند. موجودی سایر محیط‌ها/Production از این محیط قابل استنتاج نیست.

## CMS و انتشار

| قابلیت | وضعیت | شواهد و فاصله تا V2 |
|---|---|---|
| ایجاد برگه، خانه، قابلیت، مخاطب و FAQ | Existing & Working | `features/cms/content-list.tsx` و `services/cms.py:289`؛ ایجاد پیش‌نویس واقعی |
| ویرایش متن، CTA، تصاویر و بخش‌ها | Existing & Working | `features/cms/editor.tsx`؛ فیلدهای کنترل‌شده و ثبت نسخه |
| متن غنی | Existing & Working | `rich-editor.tsx` با Tiptap؛ این WYSIWYG متن است، نه Canvas صفحه |
| افزودن/حذف/ترتیب بخش‌ها | Existing but Incomplete | حداکثر ۲۴ بخش مسطح؛ انتقال با دکمهٔ بالا/پایین، بدون Drag & Drop یا nesting |
| Draft و Published جدا | Existing & Working | `Page.working_revision_id` و `published_revision_id`؛ ویرایش پیش‌نویس، نسخهٔ عمومی را جایگزین نمی‌کند |
| Preview خصوصی | Existing & Working | مسیرهای admin preview، بررسی نقش و نسخه؛ Draft در API عمومی ظاهر نمی‌شود |
| Publish / Unpublish / Schedule / Archive | Existing & Working | `cms.transition`، کنترل هم‌زمانی و تراکنش؛ تست زمان‌بندی/رسانهٔ خصوصی موجود |
| تاریخچه و بازگردانی نسخهٔ عمومی | Existing & Working | `revisions-panel.tsx:27` نسخهٔ قدیمی را دوباره منتشر می‌کند و پیش‌نویس حفظ می‌شود |
| بازگردانی نسخه به Draft و ویرایش آن | Missing | عملیات مستقل clone/restore-to-draft وجود ندارد؛ با انتشار نسخهٔ قبلی متفاوت است |
| کنترل تعارض و Audit | Existing & Working | `If-Match`، row_version، قفل تراکنشی؛ 409/428 و rollback هنگام شکست audit |
| رسانه و مرجع تصاویر | Existing & Working | upload واقعی، WebP، alt، private/public و جلوگیری از حذف تصاویر استفاده‌شده |
| کتابخانهٔ رسانهٔ کامل صفحه‌ساز | Existing but Incomplete | پایهٔ تصاویر وجود دارد؛ جست‌وجوی پیشرفته/جایگذاری در Canvas و انواع رسانهٔ بیشتر لازم است |
| SEO و تنظیمات عمومی | Existing & Working | metadata، indexability، نام برند، لوگو، تماس و آدرس اپ از API موجود |
| تغییر چیدمان/فونت/رنگ توسط مدیر | Missing | این مقادیر در CSS/React ثابت هستند و در Payload ساختاری برایشان وجود ندارد |
| انتخاب FAQ در سکشن FAQ | Existing but Defective | فیلد `faq_slugs` قابل ثبت است، ولی Renderer آن را در نوع faq مصرف نمی‌کند؛ شرح پایین |
| سکشن‌های داده‌محور در برگهٔ دلخواه | Existing but Incomplete | مسیرهای خانه و صفحات خاص داده تزریق می‌کنند؛ برگهٔ عمومی قرارداد عمومی resolver ندارد |
| Header/Footer Builder | Missing | React shell و ناوبری ثابت موجودند؛ تنظیمات برند قابل ویرایش است، ساختار قابل طراحی نیست |
| نسخه‌بندی سند بصری | Existing but Incomplete | revision محتوا وجود دارد؛ نسخهٔ schema سکشن فعلی فقط ۱ است و tree سند بصری وجود ندارد |

## Canvas، Layout و ابزارهای حرفه‌ای

| نیاز V2 | وضعیت فعلی | بخش قابل استفاده / کار لازم |
|---|---|---|
| Live WYSIWYG صفحه، انتخاب المان، inline text روی صفحه | Missing | Tiptap برای Rich Text حفظ شود؛ Canvas جدا در همین CMS اضافه شود |
| Drag & Drop، insertion indicators، resize و nested containers | Missing | دکمه‌های ترتیب سکشن تنها پایهٔ داده را تغییر می‌دهند |
| flex/grid/container/columns قابل مدیریت | Missing | gridهای فعلی در Renderer ثابت‌اند |
| padding/margin/width/height/position/alignment | Missing | Schema کنترل‌شدهٔ Style و Layout لازم است |
| responsive visibility و breakpoint overrides | Missing | سایت responsive است؛ مدیر responsive editing ندارد |
| colors/type/background/gradient/border/shadow/radius | Missing | Tokens موجود در `styles/tokens.css` پایهٔ مناسب‌اند |
| hover/focus/transition قابل تنظیم | Missing | کنترل نوع‌دار و محدود لازم است؛ CSS یا JS دلخواه نباید پذیرفته شود |
| Desktop/Tablet/Mobile editing و preview دقیق | Missing | Preview فعلی فقط یک صفحه در اندازهٔ مرورگر است |
| undo/redo صفحه، copy/paste، duplicate | Missing | تاریخچهٔ داخلی متن غنی جای undo/redo سند را نمی‌گیرد |
| Navigator/Layers | Missing | لیست درختی انتخاب و مرتب‌سازی اضافه شود |
| Global Colors/Fonts قابل مدیریت | Existing but Incomplete | CSS tokens مشترک وجود دارد؛ UI و نسخه‌بندی globals وجود ندارد |
| reusable sections و page templates | Missing | موجودیت‌های محتوایی داخل همین چرخهٔ revision اضافه شوند |
| autosave پایدار | Missing | ذخیرهٔ فعلی دستی است؛ نباید هر کلید یک revision پایدار ایجاد کند |
| revision history و rollback | Existing but Incomplete | تاریخچهٔ عمومی موجود؛ restore-to-draft، نسخهٔ template و globals لازم است |
| Draft/Preview/Publish | Existing & Working | همان endpointها و authorization حفظ شوند |

## کتابخانهٔ ویجت‌ها

هیچ Widget Registry صفحه‌ساز نصب یا پیاده نشده است. ستون وضعیت، وجود قابلیت **قابل قرار دادن در صفحه‌ساز** را ارزیابی می‌کند؛ کامپوننت عمومی هم‌نام به‌تنهایی ویجت نیست.

| ویجت الزامی | وضعیت | قابلیت موجود برای تبدیل/استفاده |
|---|---|---|
| Heading | Existing but Incomplete | تیترهای Hero/Section؛ بدون افزودن مستقل یا تنظیم تایپوگرافی |
| Rich Text | Existing but Incomplete | Tiptap و sanitize موجود؛ تبدیل به node مستقل |
| Image | Existing but Incomplete | MediaPicker/MediaImage و API رسانه |
| Video / Aparat | Existing but Incomplete | مرکز آموزش، شناسهٔ معتبر و Embed امن؛ ویجت عمومی Canvas ندارد |
| Button | Existing but Incomplete | Button/Link/CTA مشترک؛ جایگذاری مستقل ندارد |
| Icon | Existing but Incomplete | Lucide و آیکون‌های ثابت؛ registry آیکون مجاز برای مدیر لازم است |
| Gallery | Existing but Incomplete | نوع gallery به ContentGrid می‌رسد؛ کنترل تخصصی گالری/layout ندارد |
| Carousel | Missing | Canvas widget و مدل محتوای آن موجود نیست |
| Tabs | Existing but Incomplete | ProductPreview تب ثابت دارد؛ Tabs دلخواه قابل ساخت نیست |
| Accordion | Existing but Incomplete | FAQ UI قابل استفاده؛ accordion مستقل صفحه‌ساز ندارد |
| FAQ | Existing but Defective | انتخاب سکشن faq نادیده گرفته می‌شود؛ lookup در برگهٔ دلخواه نیز ناقص است |
| Features | Existing but Incomplete | داده و FeatureCard موجود؛ resolver/widget عمومی لازم است |
| Statistics | Missing | آمار خصوصی CRM، آمار اثبات‌شدهٔ عمومی محصول محسوب نمی‌شود |
| Testimonials | Missing | محتوای تأییدشده و widget لازم است؛ نظر ساختگی وارد نمی‌شود |
| CTA | Existing but Incomplete | CallToAction و سکشن final-cta آمادهٔ reuse |
| Contact Form | Existing but Incomplete | RequestForm واقعی خارج از سکشن‌ها تزریق می‌شود؛ داخل Canvas قابل اضافه‌کردن نیست |
| Demo Request Form | Existing but Incomplete | همان API واقعی leads/demo؛ اتصال و رضایت باید حفظ شوند |
| Pricing Display | Missing | widget نمایشی و محتوای قیمت مصوب لازم؛ پرداخت/صورتحساب خارج از دامنه است |
| Product Showcase | Existing but Incomplete | ProductPreview موجود؛ تصاویر واقعی فعلاً جایگزین Placeholder نشده‌اند |
| Article List | Existing but Incomplete | FeaturedLearning/Library موجود؛ تنظیم فیلتر و تعداد از Canvas ندارد |

## ایرادهای قابل استناد و محدودیت‌ها

### D-01 — پرسش‌های منتخب در FAQ نمایش داده نمی‌شوند

`editor.tsx:383` فیلد پرسش‌های منتخب را برای trust و faq ارائه می‌کند. `schemas/cms.py:56` آن را می‌پذیرد. در `renderer.tsx:277–278` نوع faq فقط `<FaqList items={faqs}/>` را اجرا می‌کند و `section.faq_slugs` را نادیده می‌گیرد؛ trust آن را اعمال می‌کند.

تشخیص: ناسازگاری قطعی مسیر کد، بدون تغییر دیتابیس اصلی. این مورد در مرورگر با انتشار یک صفحهٔ جدید بازتولید نشده است. آزمون پذیرش اصلاح آینده: با انتخاب دو پرسش، فقط همان دو پرسش به ترتیب انتخاب در Preview و Public SSR نشان داده شوند؛ حالت انتخاب خالی تعریف شود.

### G-01 — سکشن داده‌محور در برگهٔ عمومی

`public-page.tsx:60` Renderer برگهٔ عمومی را بدون faqs/audiences/features اجرا می‌کند. بنابراین افزودن سکشن faq/audiences به یک برگهٔ دلخواه، قرارداد دریافت دادهٔ مشابه خانه ندارد. این محدودیت موجود است؛ در V2 باید resolver مشترک و قابل کنترل معرفی شود، نه درخواست دادهٔ خودسرانه توسط هر ویجت.

### G-02 — «قرارداد» فعلی، موجودیت قرارداد نیست

`services/leads.py:414` مقدار contracts را فقط از demoهایی با outcome=won می‌شمارد. جدول قرارداد/صورتحساب/پرداخت/اشتراک وجود ندارد. این شمارش دستی باید حفظ و روشن نام‌گذاری شود؛ به عنوان سیستم قرارداد یا اثبات پرداخت گزارش نشود. ایجاد این ماژول‌ها در V2 فعلی پیشنهاد نمی‌شود.

### G-03 — تست‌های CMS/CRM غالباً با login قدیمیِ مخصوص fixture اجرا می‌شوند

سناریوهای فعلی `cms.spec.ts` و `leads.spec.ts` با ایمیل/رمزِ محیط تست وارد می‌شوند. این مسیر با پرچم مخصوص تست فعال می‌شود؛ لاگین زنده OTP است و `otp-admin.spec.ts` جداگانه دارد. این موضوع نقص اثبات‌شدهٔ auth نیست، اما پوشش انتهابه‌انتهای OTP → CMS/CRM باید در STEP 6 تکمیل شود.

## CRM: قابلیت‌های واقعی و کمبودها

| قابلیت | وضعیت | شاهد و ارتقای لازم |
|---|---|---|
| ثبت درخواست سایت و ذخیرهٔ پایدار | Existing & Working | `services/leads.py:107`، تراکنش PostgreSQL و پاسخ پس از commit |
| رضایت، اعتبارسنجی، rate limit، honeypot، retry امن | Existing & Working | token، HMAC، advisory lock و LeadReceipt؛ API integration موجود |
| Duplicate Detection | Existing but Incomplete | تکرار محتوای یکسان در پنجرهٔ retry؛ تشخیص دو درخواست متفاوت از یک مدرسه/فرد وجود ندارد |
| Create/Edit لید دستی | Missing | POST مدیریتی ندارد؛ PATCH فقط status/outcome/assigned_to را می‌پذیرد |
| Search/Filter/Pagination | Existing & Working | نام/تماس/مدرسه/موضوع/کد و نوع/وضعیت/منبع/مسئول/تاریخ |
| Lead Assignment | Existing & Working | فقط owner/sales فعال، بررسی سمت سرور و history |
| Lead Source | Existing but Incomplete | allowlist هشت منبع داخلی؛ campaign/UTM/attribution مستقل ندارد |
| Status | Existing but Incomplete | new/contacted/qualified/closed؛ مراحل V2 sales pipeline نیست |
| Tags | Missing | مدل و API مرتبط برای لید وجود ندارد |
| Timeline | Existing but Incomplete | یادداشت‌ها و تاریخچهٔ status/assignment/outcome جدا هستند؛ activity timeline یکپارچه ندارد |
| Qualification | Existing but Incomplete | فقط status=qualified؛ معیارها/امتیاز/نیازها/بودجهٔ ارزیابی ساختاری ندارد |
| Lead Conversion | Missing | تبدیل رابطه‌دار به مدرسه/Contact/Opportunity وجود ندارد |
| School Profile و School Manager | Missing | school_name/city/job_title/student_count_range داخل details درخواست هستند |
| Multiple Contacts / Province / Interested Features | Missing | اطلاعات مدرسه/افراد مستقل و روابط قابل پیگیری وجود ندارد |
| School activity/opportunity/demo history | Missing | هیچ سازمان، فرصت یا جلسهٔ رابطه‌دار وجود ندارد |
| Sales Pipeline با ۹ مرحلهٔ خواسته‌شده | Missing | نه enum مستقل فرصت، نه Stage History؛ چهار وضعیت لید جایگزین آن نیست |
| Kanban و Drag & Drop | Missing | فهرست درخواست‌ها کارت‌های ساده است |
| Opportunity assignee/value/close date/lost reason/notes | Missing | assignee لید قابل reuse؛ موجودیت فرصت فروش لازم است |
| Notes | Existing & Working | یادداشت داخلی، مجوز، version و audit واقعی |
| Calls/Meetings/Demos/Tasks/Follow-ups | Missing | متن یادداشت، جلسه یا Task زمان‌دار محسوب نمی‌شود |
| Reminders/Overdue alerts | Missing | worker فعلی retention انجام می‌دهد؛ reminder فروش ندارد |
| Auto lead from demo form | Existing & Working | همان ردیف Lead(kind=demo) ایجاد می‌شود؛ Lead دوم ساخته نشود |
| Demo assignment | Existing but Incomplete | مسئول لید ثبت می‌شود؛ مسئول جلسه/تقویم مستقل ندارد |
| Demo scheduling/result/next action | Missing | درخواست دمو با رویداد جلسهٔ دمو متفاوت است |
| Demo → Opportunity | Missing | conversion رابطه‌دار وجود ندارد |
| Customer 360 | Missing | صفحهٔ جزئیات یک درخواست موجود است، نمای تجمیعی مدرسه نیست |
| New lead / stage notifications و auto assignment | Missing | رویداد تجاری، outbox و قواعد اتوماسیون وجود ندارد |
| SMS integration | Existing but Incomplete | Provider واقعی MeliPayamak برای OTP وجود دارد؛ در محیط فعلی تنظیم نشده و اعلان CRM ندارد |
| Dashboard: Total/Demo/Qualified/Source | Existing & Working | metrics روی دادهٔ واقعی با cohort و آخرین وضعیت |
| New/Scheduled/Completed demos و conversionهای CRM | Missing | دادهٔ جلسه/فرصت و تعریف مخرج برای گزارش لازم است |
| Salesperson performance / overdue follow-ups | Missing | فعالیت و فرصت فروش برای محاسبه وجود ندارد |
| Responsive table / quick registration / saved views | Missing | UI فعلی کارت + فیلتر و جزئیات است؛ جدول/Quick Action/View ذخیره‌شده ندارد |
| Persian date display | Existing & Working | `features/leads/types.ts`، Intl fa-IR و Asia/Tehran |
| Persian date input | Existing but Incomplete | فیلترها input تاریخ میلادی و UTC هستند؛ رفتار فعلی توضیح داده شده است |
| Role-based access | Existing but Incomplete | owner/editor/sales کار می‌کند؛ sales همهٔ لیدها را می‌بیند، محدودیت «فقط تخصیص‌یافته به من» ندارد |
| نگهداری و حذف اطلاعات شخصی | Existing & Working | ۱۸۰ روز پس از آخرین پیگیری؛ purge و worker maintenance؛ برای موجودیت‌های V2 باید گسترش یابد |
| مالی/پرداخت/پیش‌فاکتور/قرارداد/اشتراک/تمدید | Missing | از صفر در این فاز ساخته نمی‌شوند؛ فقط وضعیت دستی won موجود حفظ می‌شود |

## وب‌سایت عمومی و اجزای مشترک

| قابلیت | وضعیت | نتیجه |
|---|---|---|
| صفحات و URLهای فعلی، SSR و محتوای DB | Existing & Working | مسیرهای عمومی و Renderer موجود حفظ شوند |
| رنگ برند، لوگوی مصوب و مربع با گوشهٔ گرد | Existing & Working | رنگ برند #156FEE، primary #1266DF؛ فایل لوگوی رسمی و favicon موجود |
| فونت فارسی، RTL، Tailwind و tokens | Existing & Working | Vazirmatn، tokens مشترک، Layout و responsive utilities |
| تجربهٔ اختصاصی و روایت محصول | Existing but Incomplete | تکرار ContentGrid/FeatureCard/AudienceCard و ترکیب مشابه سکشن‌ها؛ ارزیابی بصری |
| نمایش واقعی محصول | Existing but Incomplete | در صفحهٔ اصلی دو product-placeholder دیده شد؛ کتابخانهٔ تصویر CMS فعلاً خالی است |
| AI readiness و ادعای محصول | Existing & Working | available/partial/roadmap و شرط evidence_reference هنگام انتشار؛ AI با مرزبندی roadmap نمایش داده می‌شود |
| CTA و فرم واقعی | Existing & Working | مسیرهای دمو/تماس واقعی؛ Widget قابل جابه‌جایی هنوز ندارند |
| Mobile/Tablet/Desktop | Existing but Incomplete | در نمونهٔ مشاهده‌شده دسکتاپ/موبایل اسکرول افقی نبود؛ کیفیت ترکیب‌بندی و روایت هنوز نیازمند طراحی V2 است |
| reduced-motion، focus، primitives و تست axe | Existing & Working | پایه و شواهد تست قبلی موجود؛ تأیید کامل WCAG 2.2 AA برای V2 به ممیزی بعدی نیاز دارد |
| SEO/canonical/OG/sitemap/robots/structured data | Existing & Working | زیرساخت موجود؛ فعال‌سازی indexing مشروط به دامنه و تنظیم مصوب |
| Cache و سرعت در ترافیک Production | Existing but Incomplete | public API با no-store از DB خوانده می‌شود؛ راهبرد cache/invalidation پس از طراحی V2 سنجیده شود |
| Analytics با رضایت اختیاری | Existing & Working | ماژول داخلی، رضایت مستقل و privacy؛ مجوز قبلی حفظ می‌شود |
| مرکز آموزش، مقاله، taxonomy، series، Aparat | Existing & Working | همان revision core و media؛ دادهٔ فعلی منتشرشدهٔ آموزش در DB محلی وجود ندارد |

مرجع blubank.com در ابزار متنی با redirect loop باز نشد، ولی در مرورگر مستقل قابل مشاهده بود. ترکیب تصویر محصول، فضای خالی و سلسله‌مراتب تایپوگرافی صرفاً برای سنجش کیفیت بررسی شد؛ هیچ دارایی یا ساختاری کپی نشد. نمونهٔ تأیید طراحی (Hero + دو بخش) مربوط به STEP 1 است و در این ممیزی ساخته نشده است.

## امنیت، عملیات و مرز استقلال

- Auth موجود شامل OTP، نشست قابل لغو، CSRF، محدودیت تلاش، MFA اختیاری، owner/editor/sales و Audit است؛ Auth دوم لازم نیست.
- Production debug OTP و legacy login را غیرفعال می‌کند؛ کد ثابت توسعه نباید به ورود عمومی راه پیدا کند.
- sanitize با nh3، URLهای محدود، ممنوعیت iframe/script/SVG دلخواه، upload با بررسی محتوا و مراجع رسانه موجود است؛ V2 نباید با پذیرش HTML/CSS/JS آزاد این حفاظت را دور بزند.
- نقش دیتابیس migration از runtime جداست؛ API اجازهٔ تغییر schema یا تاریخچهٔ audit ندارد. FK/constraint/index و UUIDهای موجود حفظ شوند.
- Docker multi-stage، private DB، health، volumes، nonroot، Caddy/TLS، backup رمزگذاری‌شده و restore دارای guard وجود دارند. Deployment عمومی انجام نشده است.
- هیچ Route، DB connection یا تغییر قرارداد Backend اصلی ماکان برای این ارتقا لازم نیست. تصاویر تأییدشدهٔ محصول ورودی محتوایی‌اند؛ ساختن backend اصلی/Mock demo محصول در دامنه نیست.
- مشکلات امنیتی جدیدِ اثبات‌شده در این ممیزی گزارش نشده است؛ این گزاره به معنی انجام penetration test یا نبود همهٔ آسیب‌پذیری‌ها نیست.

## شواهد کنترل کیفیت این مرحله

نتیجهٔ نهایی بررسی‌های تازه در [گزارش بررسی‌ها](v2-step0-verification.md) ثبت می‌شود. شواهد خام اجرای تازه در `.preview/v2-audit/` نگهداری می‌شوند و وارد Git نمی‌شوند.

گزارش‌های قبلی `docs/qa/admin-refresh/quality.json` شامل ۲۰۹ تست Backend، Build، ۱۲ تست مرورگر OTP، ۲۴ تست HTTPS و ۷ gate عملیاتی‌اند؛ این‌ها **شواهد تاریخی** هستند و نتیجهٔ بازاجرای کامل UI V2 نیستند. ارسال واقعی SMS هنوز آزموده نشده است.

## وابستگی‌های تصمیم‌گیری

1. تأیید STEP 0 پیش از شروع Art Direction. تأیید نمونهٔ STEP 1 پیش از بازطراحی عمومی.
2. تصاویر/ویدیوی واقعی و تأییدشدهٔ ماکان برای Product Showcase؛ در دسترس نبودنشان با تصویر عملکرد ساختگی جبران نمی‌شود.
3. POC و تست React/Next/RTL/keyboard/nesting/responsive پیش از انتخاب قطعی موتور صفحه‌ساز.
4. تعریف دسترسی تیم فروش (مشاهدهٔ همه یا فقط مسئول خود)، قواعد تخصیص و معیارهای qualification پیش از STEP 5.
5. قواعد تطبیق مدرسه/فرد و ادغام دستی؛ نام مدرسه یا شمارهٔ مشترک به‌تنهایی کلید قطعی نیست.
6. حفظ رضایت و نگهداری ۱۸۰روزه در Contacts/Schools/Activities؛ انتقال PII به جدول تازه نباید purge را دور بزند.
7. اتصال واقعی SMS، قالب‌های مجاز CRM و کانال اعلان؛ OTP Provider آمادهٔ استفاده است ولی اتصال و قالب CRM موجود نیست.
8. دامنه، HTTPS staging و محیط Production برای SEO/performance/استقرار عمومی. اهداف عملکردی تازه باید با شرایط آزمون گزارش شوند.

## خروجی و توقف

- گزارش ممیزی: همین فایل.
- Reuse Matrix و برنامهٔ فنی: [v2-technical-plan.md](v2-technical-plan.md).
- Schema، mapping و طرح حفظ داده: [v2-data-preservation.md](v2-data-preservation.md).
- کنترل کیفیت و محدودیت آزمون: [v2-step0-verification.md](v2-step0-verification.md).

هیچ قابلیت V2 در STEP 0 «پیاده‌شده» اعلام نمی‌شود. پس از این گزارش، کار در مرز ممیزی متوقف می‌شود؛ STEP 1 نیازمند تأیید کاربر است.
