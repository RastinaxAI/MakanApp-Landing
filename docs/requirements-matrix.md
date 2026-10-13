# ماتریس نیازمندی‌های لندینگ ماکان

تاریخ تحلیل: ۱۲ اکتبر ۲۰۲۶ — مبنا: سند HTML نسخه ۱.۱ و درخواست مستقیم کاربر.

این جدول مبنای استخراج اولیه است. Workspace در شروع خالی بود؛ وضعیت پایه نیازمندی‌های اجرایی «پیاده‌سازی‌نشده» بود. پیشرفت بعدی با ذکر محدوده در انتهای فایل ثبت می‌شود؛ سکوت درباره ردیف یعنی هنوز پذیرش نهایی آن پاس نشده است. ستون پذیرش، آزمون لازم برای تغییر وضعیت را تعیین می‌کند. «مشروط» یعنی وابسته به محتوا، مجوز، سرویس یا تصمیم واقعی؛ به معنی حذف از دامنه نیست. منبع «س» به شماره بخش سند و «ک» به شماره بخش پرامپت اشاره دارد. شماره STEP در ستون مرحله، زمان تحویل نهایی است؛ طراحی و زیرساخت ممکن است زودتر آغاز شوند.

## محصول، دامنه و صداقت محتوا

| شناسه | منبع | نیازمندی | دامنه / مرحله | معیار پذیرش |
|---|---|---|---|---|
| R001 | س۱،۸؛ ک۱،۵ | سایت، API، پنل و دیتابیس مستقل از اپ اصلی | MVP / ۴ | هیچ اتصال، migration، credential یا تغییر به Backend/SQL Server ماکان وجود ندارد |
| R002 | س۱،۳ | فروش به مدیر/مالک مدرسه؛ ارزش برای چهار نقش | MVP / ۳ | copy مدارس تبدیل‌محور و صفحات چهار مخاطب مسئله و راه‌حل متمایز دارند |
| R003 | س۲؛ ک۲ | وضعیت available/partial/roadmap برای امکانات | MVP / ۶ | CMS وضعیت و شاهد/تاریخ بازبینی دارد؛ وضعیت در کارت و جزئیات یکسان نمایش داده می‌شود |
| R004 | س۲ | Copilot، Knowledge، Commerce، Notification و عضویت‌های ناتمام آماده معرفی نشوند | MVP / ۳،۶ | بازبینی محصول؛ AI فقط با برچسب آینده و بدون عملکرد ساختگی |
| R005 | س۲،۱۷ | PRD Messenger v2 اثبات اجرا نیست؛ مخاطبین/Saved Messages/حریم خصوصی گسترده نیازمند شاهد | MVP / ۶ | موارد بی‌شاهد به عنوان آماده منتشر نمی‌شوند |
| R006 | س۲،۵ | مشتری، لوگوی مدرسه، آمار، نقل‌قول، گواهی و درصد رشد فقط با مدرک و مجوز | مشروط / ۶ | نبود مدرک موجب عدم انتشار بلوک اعتماد می‌شود |
| R007 | س۲،۷؛ ک۶ | تصاویر نسخه واقعی، حذف اطلاعات شخصی؛ نمای مفهومی برچسب‌دار | MVP / ۳ | بررسی دارایی و نسخه محصول؛ تصویر جعلی به عنوان محصول واقعی منتشر نشده است |
| R008 | س۳،۵ | راه‌اندازی دستی: درخواست، جلسه نیاز، هماهنگی تیم، آموزش | MVP / ۳ | مسیر چهارگامی دیده می‌شود؛ خرید/ساخت خودکار مدرسه ادعا نمی‌شود |
| R009 | س۱۴ | پرداخت، provisioning خودکار، چت‌بات، اتصال عملیاتی، چندزبانه کامل، اتوماسیون و CRM جامع | خارج MVP | فقط در نقشه توسعه؛ اتصال مستقیم عملیاتی همچنان ممنوع است |
| R010 | ک۸ | پیشرفت کاربر یا LMS کامل | خارج MVP | هیچ حساب یادگیرنده، نمره یا progress آموزشی در این سایت ساخته نشده است |

## صفحات و ترتیب صفحه اصلی

| شناسه | منبع | نیازمندی | دامنه / مرحله | معیار پذیرش |
|---|---|---|---|---|
| R011 | س۴،۵ | `/` با ترتیب Header، Hero، چالش، قابلیت‌ها، نقش‌ها، تجربه محصول، راه‌اندازی، آموزش، اعتماد/FAQ، CTA، Footer | MVP / ۳،۷ | بازبینی ترتیب و E2E لینک‌ها؛ آموزش فقط با محتوای منتشرشده |
| R012 | س۵،۱۲الف | منو: امکانات، راهکارها، درباره، وبلاگ، آموزش، تماس؛ دمو و ورود | MVP / ۳ | منوی دسکتاپ/موبایل با صفحه‌کلید؛ لینک ورود واقعی از تنظیمات |
| R013 | س۵ | Hero با تیتر/زیرتیتر سند، CTA دمو و امکانات، نمای دسکتاپ/موبایل | MVP / ۳ | copy مصوب و تصاویر معتبر؛ CTA به `/demo` و `/features` |
| R014 | س۵ | چالش پراکندگی ارتباط، گزارش و هماهنگی خانواده؛ راه‌حل یکپارچه | MVP / ۳ | پیام روشن و بدون وعده اثبات‌نشده |
| R015 | س۵ | پیام‌رسان، کلاس/جلسات/حضور، تکلیف/آزمون، داشبورد/گزارش و AI مشروط | MVP / ۳،۶ | کارت‌های متفاوت با readiness معتبر و مسیر جزئیات |
| R016 | س۵ | تب‌های Messenger/School/Reports/Copilot و تفکیک دسترسی والد/مدیر | MVP / ۳ | تب‌ها قابل‌دسترس؛ AI مفهوم آینده؛ دسترسی مجاز در متن روشن است |
| R017 | س۴ | `/features` و `/features/messenger`, `/school`, `/reports`, `/ai` | MVP / ۳،۶ | تمام URLها فعال؛ title/copy/status اختصاصی |
| R018 | س۴؛ ک۷ | `/solutions/schools`, `/teachers`, `/parents`, `/students` | MVP / ۳،۶ | چهار صفحه با مسئله، مزیت و CTA متناسب؛ تمرکز فروش روی مدارس |
| R019 | س۴ | `/demo`, `/contact`, `/about`, `/faq` | MVP / ۳،۸ | routeهای کامل؛ دمو/تماس در مرحله ۸ به ذخیره واقعی متصل می‌شوند |
| R020 | س۴،۱۲ | `/blog` و `/blog/[slug]` مستقل از آموزش محصول | MVP / ۷ | فهرست صفحه‌بندی و مقاله منتشرشده با metadata؛ draft برابر 404 |
| R021 | س۴،۱۱ | `/privacy` و `/terms` با متن مصوب | MVP / ۳،۱۰ | سیاست تماس، نگهداری، ثالث و حذف معلوم؛ متن حقوقی تأیید شده |
| R022 | س۴،۱۲ | sitemap، robots و 404 اختصاصی | MVP / ۹ | مسیر ناموجود 404 واقعی؛ sitemap فقط منتشرشده/indexable |
| R023 | س۴ | `/admin` با ورود، داشبورد و زیرمسیرهای مدیریت | MVP / ۵–۸ | تمام منابع پشت authorization؛ noindex و no-store |
| R024 | س۵ | Footer تماس، حقوقی، شبکه اجتماعی و CTA پایانی؛ CTA ثابت موبایل در صورت نیاز | MVP / ۳ | لینک معتبر و بدون پوشاندن focus/محتوا؛ داده تماس از CMS |

## فرم‌ها و CRM محدود

| شناسه | منبع | نیازمندی | دامنه / مرحله | معیار پذیرش |
|---|---|---|---|---|
| R025 | س۶ | نام کامل، تماس و مدرسه الزامی؛ شهر، سمت، تعداد و پیام اختیاری | MVP / ۸ | اعتبارسنجی یکسان client/server و خطای فیلدی فارسی |
| R026 | س۶،۱۱ | رضایت به تماس و سیاست حریم خصوصی | MVP / ۸ | بدون رضایت ثبت نمی‌شود؛ زمان و نسخه متن رضایت ذخیره می‌شود |
| R027 | س۶ | تماس عمومی: نام، روش تماس، موضوع، پیام | MVP / ۸ | نوع phone/email و مقدار معتبر؛ پیام در PostgreSQL و پنل دیده می‌شود |
| R028 | س۶،۱۰،۱۵؛ ک۹ | ذخیره تراکنشی، موفقیت فقط پس از commit | MVP / ۸ | خرابی DB موفقیت نمی‌دهد؛ رکورد واقعی در پنل با وضعیت new |
| R029 | س۶،۱۵ | جلوگیری از duplicate و ارسال همزمان؛ retry امن | MVP / ۸ | یک idempotency key و body یکسان تحت concurrency فقط یک رکورد؛ تغییر body برابر 409 |
| R030 | س۶ | کد پیگیری غیرقابل‌حدس؛ عدم افشای رکورد دیگران | MVP / ۸ | reference تصادفی؛ lookup عمومی PII وجود ندارد |
| R031 | س۶ | loading، خطا، success، retry و خطای فیلدی قابل‌فهم | MVP / ۸ | E2E خطای شبکه/422/429 و حفظ ورودی؛ ارسال دوباره رکورد نمی‌سازد |
| R032 | س۶ | «رایگان»، وعده زمان پاسخ و ایمیل/SMS تنها با تعهد/provider واقعی | مشروط / ۸ | پیش‌فرض «درخواست دمو»؛ اعلان تنظیم‌نشده ادعا نمی‌شود |
| R033 | س۹،۱۰؛ ک۹ | lead وضعیت new/contacted/qualified/closed، منبع، زمان، مسئول | MVP / ۸ | PATCH مجاز، ثبت تاریخچه؛ closed outcome برای KPI قرارداد |
| R034 | س۹،۱۰؛ ک۹ | پنل جست‌وجو، فیلتر وضعیت/بازه تاریخ، pagination، یادداشت داخلی | MVP / ۸ | فیلتر واقعی DB؛ یادداشت برای مهمان/editor ممنوع؛ تاریخچه قابل حسابرسی |
| R035 | س۸ | شکست اعلان نباید موفقیت ذخیره lead را خراب کند | مشروط / ۸ | قطع provider پس از ذخیره رکورد را از بین نمی‌برد؛ retry پایدار در صورت فعال‌شدن |
| R036 | س۱۱ | rate limit IP/الگوی سوءاستفاده، honeypot، CAPTCHA در صورت نیاز | MVP / ۸ | 429 با Retry-After؛ چند worker سقف مشترک دارند؛ CAPTCHA فقط server-verified |

## CMS، وبلاگ، رسانه و مدیریت

| شناسه | منبع | نیازمندی | دامنه / مرحله | معیار پذیرش |
|---|---|---|---|---|
| R037 | س۹،۱۰،۱۵؛ ک۱۰ | CRUD صفحات و sectionهای مرتب و typed؛ ویرایش متن اصلی بدون کد | MVP / ۶ | publish تغییر تأییدشده را عمومی می‌کند؛ JSON نامعتبر رد می‌شود |
| R038 | س۹؛ ک۱۰ | مدیریت امکانات، audiences، visibility، readiness، ترتیب و FAQ دسته‌دار | MVP / ۶ | CRUD، reorder و انتشار مستقل؛ رفتار عمومی مطابق وضعیت |
| R039 | س۹،۱۲؛ ک۸ | وبلاگ: عنوان، slug، خلاصه، rich text، کاور/تصاویر، دسته/تگ/نقش، زمان مطالعه | MVP / ۷ | ایجاد/ویرایش بدون کد، slug unique، روابط و تصاویر معتبر |
| R040 | س۱۲،۱۲الف | draft/published/scheduled، بازبینی، پیش‌نمایش خصوصی و تاریخ انتشار/بازبینی | MVP / ۶،۷ | scheduled پیش از زمان غایب و پس از زمان حاضر؛ draft در API/sitemap نیست |
| R041 | ک۸؛ س۱۱ | sanitization HTML سمت سرور | MVP / ۶،۷ | script، onerror، javascript URL، iframe دلخواه و style خطرناک اجرا نمی‌شوند |
| R042 | س۹،۱۰؛ ک۱۰ | CRUD تنظیمات عمومی و SEO صفحات | MVP / ۶،۹ | فقط کلیدهای allowlist عمومی خوانده می‌شوند؛ secret در CMS ذخیره نمی‌شود |
| R043 | س۸،۹،۱۱ | رسانه: persistent storage، alt، MIME/size، نام امن و مجوز | MVP / ۶ | spoofed MIME، traversal، فایل بزرگ و SVG فعال رد؛ restart فایل را حفظ می‌کند |
| R044 | س۹،۱۱ | حساب مدیر مستقل، password hash مقاوم و session امن | MVP / ۵ | password plaintext وجود ندارد؛ cookie HttpOnly/Secure/SameSite؛ expiration/logout/revoke تست |
| R045 | س۱۰،۱۱؛ ک۱۰ | RBAC سمت سرور، audit تغییر حساس و مدیر غیرفعال | MVP / ۵،۶ | 401/403 برای roleها، غیرفعال‌سازی نشست را بی‌اثر می‌کند؛ audit تراکنشی |
| R046 | س۹ | MFA در صورت امکان | مشروط / ۵ | تصمیم MFA ثبت شود؛ در صورت فعال‌سازی TOTP و recovery آزمون شود؛ ادعای MFA بدون اجرا ممنوع |
| R047 | س۱۱ | CSRF، login throttling، CSP، عدم token در localStorage/console | MVP / ۵،۱۰ | origin/token نامعتبر 403؛ login enumeration ندارد؛ تست CSP/XSS |
| R048 | س۱۵؛ ک۱۰ | مدیریت leads، تماس، مقاله، FAQ، متن صفحات و media در پنل | MVP / ۶–۸ | تمام عملیات UI به API واقعی و authorization وصل است |

## مرکز آموزش و آپارات

| شناسه | منبع | نیازمندی | دامنه / مرحله | معیار پذیرش |
|---|---|---|---|---|
| R049 | س۱۲الف | `/learn`, `/learn/articles/[slug]`, `/learn/videos/[slug]`, `/learn/series/[slug]`, `/learn/categories/[slug]` | MVP / ۷ | تمام مسیرها SSR؛ محتوای ناموجود/draft پاسخ 404 |
| R050 | س۱۲الف | جست‌وجو و فیلتر نقش، موضوع، نوع، سطح؛ جدیدترین | MVP / ۷ | ترکیب queryها نتیجه واقعی DB؛ pagination پایدار |
| R051 | س۱۲الف | پربازدیدترین و شمارش بازدید فقط واقعی و ضدبات | MVP / ۷،۹ | تعریف qualified view، dedupe و حذف bot؛ صفر بازدید به معنای «محبوب» معرفی نمی‌شود |
| R052 | س۱۲الف | مقاله: چکیده، زمان مطالعه، بازبینی، نقش، TOC، تصاویر و گام‌ها | MVP / ۷ | headings/anchor امن؛ TOC مطابق متن؛ alt و ابعاد تصویر |
| R053 | س۱۲الف | منابع مرتبط، قبلی/بعدی و CTA آموزشی | MVP / ۷ | لینک‌ها فقط محتواهای عمومی؛ ترتیب مجموعه تعیین‌کننده قبلی/بعدی |
| R054 | س۱۲الف؛ ک۸ | آپارات: شناسه/URL معتبر، ذخیره ID، embed رسمی ثابت | MVP / ۷ | allowlist دامنه/مسیر؛ arbitrary HTML/embed_url رد؛ ID نادرست 422 |
| R055 | س۱۲الف؛ ک۸ | عنوان، توضیح، کاور، مدت و metadata دستی یا منبع معتبر | MVP / ۷ | هیچ metadata حدس زده نمی‌شود؛ داده ناقص مانع VideoObject کامل است |
| R056 | س۱۲الف | متن همراه، transcript اگر تهیه شده، لینک اصلی و مرتبط‌ها | MVP / ۷ | transcript اختیاری واقعی؛ لینک آپارات از ID معتبر تولید می‌شود |
| R057 | س۱۲الف | iframe responsive، lazy/click، بدون autoplay اجباری | MVP / ۷ | پیش از کلیک درخواست پلیر صفر؛ نسبت صحیح ۳۶۰ و دسکتاپ |
| R058 | س۱۲الف | اطلاع ثالث، رضایت در صورت نیاز، قطعی/فیلتر و fallback | MVP / ۷ | اطلاع پیش از پلیر، retry/link دستی؛ خطای cross-origin به دروغ تشخیص داده نمی‌شود |
| R059 | س۱۲الف | عدم آپلود مجدد ویدیو بدون مجوز و نیاز | MVP / ۶،۷ | uploader عمومی ویدیو ندارد؛ آپارات منبع پخش است |
| R060 | س۱۲الف | CRUD دسته/تگ/مجموعه/قسمت/کاور، نقش، سطح و ترتیب | MVP / ۷ | مجموعه ترکیبی متن/ویدیو و reorder بدون duplicate position |
| R061 | س۱۲الف | draft مجموعه/عضو، SEO، preview و بازبینی | MVP / ۷ | مجموعه منتشرشده هیچ عضو draft را لو نمی‌دهد؛ preview admin noindex |
| R062 | س۵،۱۲الف | صفحه اصلی حداکثر ۳ منتخب واقعی؛ بدون iframe یا بلوک خالی | MVP / ۷ | صفر محتوای منتشرشده سکشن را حذف؛ ۱ تا ۳ کارت واقعی نمایش |
| R063 | س۱۲الف | SEO مقاله/ویدیو، breadcrumb و sitemap آموزش | MVP / ۹ | فقط منتشرشده؛ VideoObject با uploadDate/thumbnail/embed معتبر |

## API و دیتابیس

| شناسه | منبع | نیازمندی | دامنه / مرحله | معیار پذیرش |
|---|---|---|---|---|
| R064 | س۸–۱۰؛ ک۴ | Python/FastAPI/Pydantic2/SQLAlchemy2/PostgreSQL/Alembic | MVP / ۴ | dependency lock و integration روی PostgreSQL واقعی؛ upgrade head در DB تازه |
| R065 | س۹؛ ک۱۱ | PK/FK/constraint/index، slug unique، timestamps، روابط و عدم soft-delete بی‌دلیل | MVP / ۴،۶،۷ | migration/test constraint؛ unique/FK/check در DB نه فقط فرم |
| R066 | س۹ | جدول‌های admins/pages/sections/features/audiences/faqs/blog/media/leads/contact/notes/history/settings/audit | MVP / ۴–۸ | مطابق طراحی دیتابیس؛ تمام ماژول‌ها persistence دارند |
| R067 | س۱۲الف | contents/videos/categories/series/items/tags/relations آموزش | MVP / ۷ | FK، unique(position)، نوع محتوا و روابط انتشار آزمون |
| R068 | س۱۰؛ ک۱۲ | `/api/v1`، schema، REST، pagination/filter و bounds | MVP / ۴–۸ | OpenAPI، validation 422، page_size<=100 و sort allowlist |
| R069 | س۱۰ | API عمومی settings/pages/features/faqs/blog و مقاله | MVP / ۶،۷ | تنها public fields و public revisions؛ draft 404 |
| R070 | س۱۰ | POST lead/contact و auth/lead CRUD پنل | MVP / ۵،۸ | success/error/unauthorized با HTTPX و PostgreSQL |
| R071 | س۱۲الف | API learn contents/detail/categories/series و CRUD admin | MVP / ۷ | فیلتر type/audience/category/q/page/page_size و level/sort |
| R072 | س۱۰ | error.code/message/details/trace_id و structured logging | MVP / ۴ | خطای استاندارد 422/403/429/500؛ stack/PII به کاربر یا لاگ عمومی نمی‌رود |
| R073 | س۱۰ | OpenAPI dev، docs مدیریتی محدود prod؛ same-origin/CORS محدود | MVP / ۴،۱۰ | Origin بیگانه مجوز ندارد؛ docs production مهمان را رد می‌کند |
| R074 | س۱۰ | تراکنش فرم/انتشار، کنترل رقابت و پاسخ‌های کوچک | MVP / ۶،۸ | rollback همه تغییرات را برمی‌گرداند؛ stale edit 409 و audit سازگار |

## حریم خصوصی، آنالیتیکس و SEO

| شناسه | منبع | نیازمندی | دامنه / مرحله | معیار پذیرش |
|---|---|---|---|---|
| R075 | س۱۱ | عدم نگهداری اطلاعات آموزشی/پیام‌ها/توکن اپ اصلی | MVP / ۴–۱۰ | بررسی schema، env و network boundaries |
| R076 | س۹،۱۱ | کمینه‌سازی، نگهداری/حذف داده فرم و backup رمزگذاری‌شده | MVP / ۸،۱۰ | سیاست مصوب، purge قابل آزمون، restore در DB جدا؛ استثنای backup مستند |
| R077 | س۳ | KPI ارگانیک، تبدیل دمو، موفقیت/خطای فرم، lead واجد شرایط، قرارداد و منبع | MVP / ۸،۹ | تعریف مخرج/بازه، outcome دستی معتبر و خط پایه واقعی؛ بدون اهداف ساختگی |
| R078 | س۳ | هشت event نام‌برده در سند بدون داده حساس | MVP / ۹ | allowlist payload؛ phone/message/email/token/IP کامل جمع‌آوری نمی‌شود |
| R079 | س۱۲؛ ک۱۳ | SSR/Static متناسب، cache و freshness انتشار | MVP / ۳،۹ | HTML قابل ایندکس؛ draft/preview هرگز cache عمومی نمی‌شود؛ زمان انتشار صحیح |
| R080 | س۱۲ | title/description یکتا، canonical، OG، Twitter، H1 و URL خوانا | MVP / ۹ | بررسی تمام route templates و URL نهایی؛ origin از config |
| R081 | س۱۲ | Organization/SoftwareApplication/FAQPage و breadcrumb فقط واقع‌گرا | MVP / ۹ | schema validator و تطابق متن قابل‌مشاهده؛ تضمین rich result داده نمی‌شود |
| R082 | س۱۲ | sitemap خودکار فقط published/indexable؛ robots و noindex پنل/preview/success/کم‌محتوا | MVP / ۹ | تست snapshot URLها، scheduled/draft حذف، sitemap آموزش موجود |
| R083 | س۱۲ | تصاویر AVIF/WebP، next/image، فونت محلی، lazy load و CLS | MVP / ۹ | ابعاد رزرو، فونت مجاز، hero eager؛ تصاویر پایین صفحه lazy |
| R084 | س۱۲ | CWV واقعی: LCP<=2.5s، INP<=200ms، CLS<=0.1 | MVP / ۹،۱۰ | پس از ترافیک کافی p75 RUM گزارش؛ آزمایشگاه جایگزین اثبات میدانی نیست |
| R085 | ک۱۳ | Lighthouse Performance و SEO حداقل ۹۰ در شرایط ثبت‌شده | MVP / ۹،۱۰ | سه اجرا با نسخه/دستگاه/شبکه مشخص و گزارش واقعی؛ شکست ثبت و اصلاح |
| R086 | س۱۲ | محتوای اصیل فارسی وبلاگ و بازبینی انسانی | MVP / ۷،۱۰ | متن واقعی مصوب منتشر؛ تکرار blog/learn canonical حل شده |

## طراحی، زیرساخت و کیفیت

| شناسه | منبع | نیازمندی | دامنه / مرحله | معیار پذیرش |
|---|---|---|---|---|
| R087 | س۷؛ ک۶ | RTL/LTR، mobile-first در ۳۶۰–۴۷۹، ۴۸۰–۱۰۲۳، >=۱۰۲۴ | MVP / ۲،۱۰ | سه layout واقعی و تست ۳۶۰/۳۹۰/۷۶۸/۱۰۲۴/۱۴۴۰ بدون overflow |
| R088 | س۷؛ ک۶ | پالت، فونت، spacing، radius، shadow، breakpoint پیش از UI | MVP / ۲ | tokens مرکزی، رنگ/لوگو مصوب یا placeholder صریح؛ لوگوی اختراعی ندارد |
| R089 | ک۴ | Next App Router/React/TS strict/Tailwind/shadcn/Motion/RHF/Zod/Lucide | MVP / ۲–۸ | lock سازگار، strict typecheck، فرم واقعی و motion محدود |
| R090 | س۷ | WCAG2.2AA، contrast/focus/label/alt، keyboard/touch/reduced motion | MVP / ۲،۱۰ | axe و آزمون دستی focus/dialog/tab/error؛ 44px هدف طراحی، motion خاموش |
| R091 | س۸،۱۳؛ ک۱۴ | Dockerfile web/API چندمرحله‌ای و Compose چهار سرویس؛ dev/prod جدا | MVP / ۴،۱۰ | build و up در محیط تازه، healthcheck واقعی و restart policies |
| R092 | س۸،۱۳ | DB شبکه خصوصی، volumes DB/media/proxy، minimum privilege و env/secrets خارج Git | MVP / ۱۰ | DB/API/web پورت عمومی ندارند؛ app non-root؛ restart داده را حفظ |
| R093 | س۸؛ ک۱۴ | proxy `/api` و `/`، TLS/HSTS/redirect/compression/static cache | MVP / ۱۰ | HTTPS واقعی staging/prod، فقط static immutable cache؛ readiness صحیح |
| R094 | س۱۳ | migration job کنترل‌شده، backup قبل تغییر پرخطر، rollback image/plan | MVP / ۴،۱۰ | concurrent deploy migration نمی‌سازد؛ restore واقعی؛ downgrade مخرب خودکار ندارد |
| R095 | س۱۳؛ ک۴ | GitHub Actions lint/typecheck/test/build، scan dependency/image | MVP / ۱ تکمیلی،۱۰ | CI تمام checks مستقل را سبز و artifact گزارش ذخیره می‌کند |
| R096 | س۱۳ | staging، smoke و انتشار production کنترل‌شده | مشروط / ۱۰ | مقصد و secrets واقعی؛ deploy تنها با مجوز محیط و محتوا؛ Push بدون اجازه ممنوع |
| R097 | س۱۵؛ ک۱۵ | Pytest/HTTPX unit+integration: validation/auth/RBAC/draft/CMS/aparat/leads/security | MVP / ۴–۱۰ | تست مثبت، منفی، concurrency و مجوز روی PostgreSQL واقعی |
| R098 | س۱۵؛ ک۱۵ | Playwright مسیرها/فرم/admin/responsive و build production | MVP / ۲–۱۰ | Chrome/Firefox/WebKit و widths مصوب؛ E2E با API/DB واقعی |
| R099 | س۱۵؛ ک۱۵ | Compose smoke، فایل upload، backup/restore عملی | MVP / ۱۰ | runbook در میزبان تازه بازتولید؛ تعداد/محتوای رکورد و فایل پس از restore برابر |
| R100 | ک۱،۱۶ | گزارش فارسی هر STEP، files/checks/acceptance/limitations؛ تأیید پیش از STEP بعد | فرایندی / همه | مرحله بعد قبل از تأیید آغاز نمی‌شود؛ ادعای complete فقط با شواهد |
| R101 | ک۱،۱۵ | Commit پس از گزارش و تست موفق؛ Push فقط مجوز صریح | فرایندی / همه | هیچ Push بدون مجوز؛ این مرحله هیچ Commit ایجاد نکرده است |
| R102 | ک۱۶،۱۷ | خواندن کامل سند، بررسی workspace، شش سند و تحلیل تناقض/وابستگی | تحلیل / فعلی | فایل‌ها و بررسی سند در validation-report؛ بدون کدنویسی محصول |
| R103 | ک۴ | نسخه‌های stable سازگار و ثبت major/lock دقیق | MVP / ۱ تکمیلی،۴ | پیشنهاد در architecture؛ patch/digest پس از resolve و تست ثبت؛ latest شناور در prod ندارد |
| R104 | س۸،۱۴؛ ک۱ | بدون Mock API یا ذخیره موقت نهایی؛ Redis/Celery فعلاً لازم نیست | MVP / ۴–۱۰ | تمام مسیرها persistence واقعی؛ fixtures فقط تست و seed واقعی با تأیید |

## وضعیت تحویل تحلیل اولیه

استخراج و طراحی این ۱۰۴ ردیف انجام شده است؛ پذیرش نرم‌افزاری هیچ‌یک هنوز پاس نشده. R102 فقط از جهت تحلیل/تولید سند قابل بررسی است. برای تکمیل STEP 1 مهندسی، bootstrap و lock/CI پس از تأیید این تحلیل لازم است. معیارهای مشروط و خارج MVP در برنامه حذف نشده و با وابستگی توضیح داده شده‌اند.

این بند وضعیت تحویل تحلیل نخست است؛ گزارش اجرای STEP2 در ادامه وضعیت جاری را مشخص می‌کند.

## ردیابی همه بخش‌های سند

| بخش سند | پوشش |
|---|---|
| ۱ | R001–002، R011، R023، R091–102 |
| ۲ | R003–007، R075 |
| ۳ | R002، R008، R077–078 |
| ۴ | R011–024، R049، R082 |
| ۵ | R008، R011–016، R024، R062 |
| ۶ | R025–032 |
| ۷ | R007، R087–090 |
| ۸ | R001، R035، R043، R064، R075، R079، R089، R091–094، R104 |
| ۹ | R003، R026، R033–034، R037–046، R065–067، R076 |
| ۱۰ | R028، R036–045، R068–074 |
| ۱۱ | R026، R036، R041، R043–047، R075–076، R092–093 |
| ۱۲ | R020، R039–040، R079–086 |
| ۱۲ الف | R049–063، R067، R071 |
| ۱۳ | R001، R064–065، R091–096 |
| ۱۴ | R008–010، R100، implementation-plan |
| ۱۵ | R028–029، R037، R045–047، R079–099 |
| ۱۶ | analysis-report: تصمیم‌های باز و وابستگی‌ها |
| ۱۷ | analysis-report: منابع ارائه‌نشده و حدود راستی‌آزمایی |

## پیشرفت STEP 2 — محدوده UI پایه

| نیازمندی | وضعیت اجرا | پذیرش باقیمانده |
|---|---|---|
| R087 | RTL/LTR، shell و layout سه‌گانه در دو صفحه specimen ساخته شده | همین رفتار باید در صفحات واقعی مرحله‌های بعد نیز تأیید شود |
| R088 | tokens مرکزی، فونت محلی مجاز، breakpoint، radius/shadow و نشان موقت ساخته شده | تأیید پالت/لوگو رسمی هنوز دریافت نشده است |
| R089 | Next/React/TS strict/Tailwind/shadcn/Motion/Lucide و lock پیاده شده | RHF/Zod و اتصال فرم واقعی در STEP8؛ کل ردیف هنوز کامل نیست |
| R090 | focus، skip، drawer/tab/accordion، label و reduced motion پیاده شده | پذیرش کامل WCAG نیازمند صفحات نهایی و screen reader/manual review است |
| R103 | نسخه‌های وب دقیق در package/lock؛ Node24 برای gate نهایی | Python/API/images/CI در مراحل مربوط تثبیت می‌شوند |
| R022 | 404 واقعی برای preview ساخته شده | metadata/sitemap/robots تولید واقعی در STEP9؛ preview فعلاً noindex است |

شواهد نتیجه Build و تست‌های همین محدوده در `step-2-report.md` و `docs/qa/step2` قرار می‌گیرد. هیچ ردیف CMS/auth/lead/learn به خاطر وجود نمونه UI «کامل» نشده است. شناسه‌های R001–R104 ثابت‌اند؛ وضعیت پایه و پیشرفت مرحله‌ای از هم جدا گزارش شده‌اند.

## پیشرفت STEP 3 — صفحات عمومی

| نیازمندی | وضعیت اجرا | پذیرش یا وابستگی باقیمانده |
|---|---|---|
| R002، R013–018 | Home و صفحات features/solutions با مسئله/مزیت/مسیر و CTA متفاوت ساخته شده‌اند | انتقال copy به CMS در STEP6؛ تصاویر محصول واقعی هنوز ارائه نشده‌اند |
| R003–005 | سه حوزه آماده با تأیید مستقیم کاربر؛ AI آینده و موارد نامطمئن وعده نشده‌اند | مدیریت readiness و شاهد در CMS مرحله۶ |
| R006–007 | آمار/مشتری/گواهی ساختگی نداریم؛ تصویر placeholder روشن است | دریافت عکس/لوگو/مجوز واقعی برای پذیرش تصاویر نهایی |
| R008، R011 | ترتیب Home و راه‌اندازی چهارگامی دستی پیاده شده است | آموزش Home مشروط به محتوای published در STEP7 و فعلاً غایب |
| R012، R024 | ناوبری و Footer عمومی با مسیرهای واقعی، حقوقی و تماس ساخته شده‌اند | APP_URL، شماره، ایمیل و شبکه اجتماعی رسمی هنوز ارائه نشده‌اند |
| R019، R025–027 | صفحات دمو/تماس و تمام فیلدهای طرح سند ساخته، ثبت عمداً غیرفعال است | validation/persistence/consent مصوب و acceptance واقعی در STEP8 |
| R020، R049، R062 | مسیر blog/learn مستقل و خالی از محتوای فرضی؛ Home فاقد سکشن آموزش خالی | ماژول واقعی، detailها و انتشار در STEP7 |
| R021 | دو صفحه حقوقی با برچسب صریح پیش‌نویس ساخته شده‌اند | تصویب متن/مسئول/retention قبل انتشار؛ هنوز پذیرش حقوقی نهایی نیست |
| R022، R079–080 | 404، رندر اولیه HTML و title/description اختصاصی صفحات برقرارند | canonical/OG/sitemap/schema/SEO تولید در STEP9؛ noindex بررسی هنوز فعال است |
| R087، R090، R098 | layout و آزمون‌های عمومی روی سه موتور مرورگر توسعه یافته‌اند | نتیجه دقیق در step-3-report؛ screen reader و دستگاه فیزیکی/تمام دامنه نهایی باقی‌اند |

افزودن صفحات UI به معنی موفقیت API/CMS/فرم ذخیره‌شده نیست. این تحویل، مرحله۳ توسعه است و قبل از رفع وابستگی‌های تصویر/حقوقی/فرم/SEO برای انتشار عمومی پذیرفته نمی‌شود.

## پیشرفت STEP4 — Backend Foundation

| نیازمندی | وضعیت اجرا/شاهد | پذیرش باقی‌مانده |
|---|---|---|
| R001، R075 | API/DB مستقل؛ بدون اتصال Backend اصلی یا schema داده آموزشی | بررسی همین مرز در ماژول‌های آینده ادامه دارد |
| R064، R103 | Python3.13.16 و lock دقیق؛ PostgreSQL17.11 واقعی؛ دو migration و تست fresh/prior موفق | تثبیت زیرساخت نهایی/CI در STEP10 |
| R065، R066 | admins/audit/pages/revisions با PK/FK/CHECK/index/UTC؛ drift صفر | سایر جدول‌های schema در STEP5–8؛ CMS هنوز وجود ندارد |
| R068 | `/api/v1`، Error/Health schema، OpenAPI و PaginationQuery bounded | list/filter/REST ماژول‌ها در مراحل بعد |
| R072 | خطای عمومی و request log JSON با trace و redaction؛ 422/404/405/500/503 تست شده | 403/429 پس از auth/limiter و تست ماژول‌ها |
| R073 | docs فقط development/test؛ staging/prod404؛ CORS باز نداریم | same-origin proxy و مجوز endpointهای مدیریتی در STEP5/10 |
| R074 | repository بدون commit، transaction commit/rollback روی DB واقعی آزموده شد | انتشار/فرم، concurrency و stale edit در STEP6/8 |
| R091، R092، R094 | API Docker multi-stage/non-root، DB خصوصی و persistent، migration job جدا و advisory lock؛ Compose smoke موفق | وب/proxy/prod/HTTPS، backup/restore، deploy concurrency و image scan در STEP10 |
| R097، R099 | ۱۹ Pytest/HTTPX؛ DB قطع503/live200، بازیابی و حفظ schema پس از recreate | Auth/CMS/learn/CRM، upload و backup/restore در مراحل مربوط |
| R104 | DB توسعه واقعی و پایدار؛ fixtureها فقط DB تست مستقل؛ هیچ Mock API نهایی نداریم | persistence ماژول‌های بعد باید جدا پذیرفته شود |

گزارش STEP4 و فایل‌های QA شواهد این محدوده‌اند؛ جداول اولیه به معنی تکمیل فرم، ورود یا CMS نیستند. STEP5 فقط پس از تأیید بعدی کاربر.

## وضعیت اجرای STEP5 و شواهد پذیرش

تصمیم مستقیم کاربر: MFA اختیاری برای هر مدیر. موارد زیر با API/DB واقعی و آزمون اجرا شده‌اند؛ جزئیات نهایی و محدودیت‌ها در `step-5-report.md` و `qa/step5` هستند.

| نیازمندی | وضعیت فعلی | شاهد / دامنه باقی |
|---|---|---|
| R023 | پنل پایه و login/dashboard/security/accounts/audit پیاده شده | RBAC/API/E2E؛ CMS/CRM مسیرهای فعال ندارند و مراحل۶–۸ باقی است |
| R044 | Argon2id، opaque session/HMAC، cookie، expiry، rotation/logout/revoke | Pytest و مرورگر واقعی؛ Secure حالت HTTPS HTTPX؛ TLS واقعی مرحله۱۰ |
| R045 | owner/editor/sales سمت server، active، آخرین owner همزمان، audit تراکنشی | unauthorized403، deactivate401، audit-failure rollback503؛ audit CMS بعداً |
| R046 | MFA اختیاری TOTP/AES-GCM/replay/recovery/CLI recovery واقعی | RFC vectors، lifecycle API و E2E؛ هیچ secret plaintext در DB/log |
| R047 | Origin/CSRF پیش‌ورود و mutation، limiter اتمیک، CSP nonce، بدون storage token | 403/429، race limiter، body413، parser-XSS مرورگر؛ proxy تولید مرحله۱۰ |
| R064–067 | پنج جدول امنیتی با migration، grant runtime و index | PostgreSQL واقعی، fresh/prior upgrade، alembic check؛ ماژول‌های بعد مستقل |
| R068 | قرارداد typed auth/admin، pagination bounded، OpenAPI | schemas request/response و snapshot واقعی؛ filter ماژول‌ها بعداً |
| R072 | خطاهای auth/CSRF/rate/حجم به همان envelope اضافه شد | 401/403/409/413/422/429/503، trace/Retry-After، redaction |
| R079، R087–090 | پنل dynamic/no-store/noindex، responsive RTL، keyboard و axe | گزارش QA مرحله۵؛ WCAG دستی کامل/دستگاه واقعی و SEO/Lighthouse تولید باقی |
| R091–099 | image API و migration مرحله۵ با Docker توسعه آزموده | Compose تولید وب/proxy/HTTPS/CI/backup و scans نهایی مرحله۱۰ |

هیچ requirement مربوط به CMS، آموزش یا فرم Lead با این مرحله complete اعلام نشده است. ریسک باز `braces` ابزارهای توسعه در گزارش و dependency-audit ثبت شده؛ تأیید امنیت Production صادر نشده است. گزارش‌های تاریخی مراحل۲–۴ تغییر نمی‌کنند.

## پیشرفت مرحله۶ — CMS مستقل معرفی

این بخش وضعیت دامنه مرحله۶ است؛ اعداد/نتایج نهایی در step-6-report مرجع هستند و پیشرفت تاریخی مراحل قبل حذف نمی‌شود.

| شناسه | اجرای مرحله۶ | معیار/وابستگی باقی‌مانده |
|---|---|---|
| R003–005 | readiness، evidence خصوصی و reviewed_at؛ سه حوزه آماده طبق تأیید کاربر، AI roadmap؛ publication بدون شاهد رد می‌شود | صحت هر ادعای جدید به بازبینی انسانی محصول وابسته است |
| R006–007 | هیچ مشتری/آمار/دارایی واقعی ناموجود ساخته نشده؛ uploader و metadata امن برای دارایی دارای مجوز | تصویر/لوگو/رضایت مشتری هنوز از مالک دریافت نشده؛ placeholder مشخص باقی است |
| R012، R024 | برند، tagline، URL رسمی و تماس از تنظیمات واقعی؛ منو/CTA همان ساختار PRD | تماس و دامنه رسمی باید مالک ثبت کند؛ شبکه اجتماعی بی‌منبع نمایش داده نمی‌شود |
| R037–038 | CRUD page/section/feature/audience/FAQ دسته‌دار، ترتیب/visibility، editor واقعی، snapshot و If-Match | API/مرورگر واقعی، پیش‌نویس و انتشار مستقل؛ archive تاریخچه را حفظ می‌کند |
| R040 | draft/private preview/publish/schedule/unpublish و history در معرفی | بخش مقاله/آموزش مرحله۷؛ sitemap مرحله۹ |
| R041 | nh3 سرور، حذف HTML فعال/URL اجرایی/تصویر خارجی و FK برای تصویر داخلی | استفاده همین policy در متن مقاله مرحله۷ |
| R042 | settings owner-only allowlist، SEO صفحه و OG/canonical از snapshot/دامنه معتبر | همه صفحات همچنان noindex؛ Structured Data/sitemap/SEO نهایی مرحله۹ |
| R043، R059، R074 | WebP واقعی، حجم/pixel/MIME/EXIF/path، private→public، volume و حفاظت reference؛ بدون ویدیو خام | quota/deployment/cache/backup کامل مرحله۱۰؛ فایل آپارات upload نمی‌شود |
| R045، R048 | RBAC، CSRF، audit تراکنشی CMS و پنل بدون JSON دستی | مقاله/مرکز آموزش و درخواست‌ها به مراحل۷/۸ تعلق دارند |
| R065–066 | شش جدول با PK/FK/CHECK/index، namespaces و revision engine موجود | دلیل فنی به‌جای جدول revision تکراری در step-6-decisions؛ سایر موجودیت‌ها آینده |
| R068–069 | REST نسخه‌دار typed، aliasهای مستقل، filter/pagination، public snapshot مؤثر و fieldهای عمومی | endpoint آموزش/lead هنوز وجود ندارد |
| R070، R076، R097–100 | content/media/settings واقعی؛ metrics شمارش رکورد، آزمون PostgreSQL/مرورگر/Docker و تصاویر QA | KPI فروش/مقاله، Lighthouse، Compose وب/proxy/HTTPS/CI مرحله‌های بعد |

Blog/learn فقط صفحه معرفی خالیِ صادقانه دارند؛ فرم دمو/تماس هنوز طبق تحویل مرحله۳ غیرفعال‌اند و در مرحله۸ به ثبت واقعی وصل می‌شوند. CMS این مرحله از داده ساختگی نهایی، Mock API یا localStorage برای persistence استفاده نمی‌کند. fixtureها فقط در دیتابیس/Volume آزمایش مستقل هستند و پاک می‌شوند. گیت Production و خطر dev dependency باز مانده‌اند؛ STEP7 فقط پس از تأیید کاربر.
## وضعیت مرحله۷ — ۱۳ اکتبر۲۰۲۶

این بخش وضعیت فعلی را به جدول پایه اضافه می‌کند؛ شماره‌های نیازمندی و شواهد مراحل قبلی تغییر نکرده‌اند.

| شناسه | وضعیت پیاده‌سازی و معیار بررسی |
|---|---|
| R020/R062 | منتخب خانه۰–۳ کارت واقعی از snapshot عمومی؛ بدون iframe/سکشن خالی؛ آزمون API و سه مرورگر |
| R039–041 | CRUD وبلاگ/مقاله، taxonomy، تصویر، rich text، SEO، draft/publish/schedule، preview/history و HTML امن؛ PostgreSQL/HTTPX/UI |
| R049–050 | تمام مسیرهای آموزش SSR؛ فیلتر ترکیبی و pagination، 404 واقعی ناموجود/draft/نوع اشتباه؛ Metadata قبل از header |
| R051 | qualified view واقعی با ticket۲۰ثانیه، Origin، bot heuristic، rate مشترک و dedupe روزانه؛ محدودیت شمارش شبکه مشترک مستند |
| R052–053 | TOC/anchor، ابعاد/alt، نقش/زمان/بازبینی، منابع و related/prev-next عمومی بر اساس مجموعه |
| R054–058 | اعتبارسنجی/ID ذخیره‌شده/Embed ثابت، مشخصات دستی، پوستر/مدت لازم، click-only، responsive و fallback داخلی؛ پخش زنده هنوز تأیید نشده |
| R059–061 | uploader ویدیو ندارد؛ مجموعه mixed، ترتیب نسخه‌ای، FK/uniqueposition، پیش‌نمایش مجاز و عدم نشت اعضای draft |
| R065/R067/R069/R071 | هشت جدول جدید، namespace slug مشترک article/video، API عمومی/مدیریتی واقعی و schemaها؛ migration/diff مدل/مجوز واقعی |
| R063 | Metadata پایه/canonical/OG وجود دارد؛ sitemap/Structured Data/VideoObject کامل و Lighthouse مرحله۹، تکمیل آن ادعا نمی‌شود |

نتیجه نهایی و عدد تست‌ها در [گزارش مرحله۷](step-7-report.md) و docs/qa/step7 ثبت می‌شود. پذیرش پخش واقعی ویدیوی رسمی آپارات، انتشار عمومی و Production باز است. STEP8 آغاز نشده است.
# وضعیت افزوده مرحله۸ — فرم و CRM

| شناسه | وضعیت مرحله۸ | پذیرش/وابستگی باقی‌مانده |
| --- | --- | --- |
| R025–027 | فرم‌های RHF/Zod و Pydantic، رضایت مصوب نسخه‌دار، دمو و تماس واقعی | فیلدهای سند، phone/email، خطای فارسی و مشاهده در پنل با PostgreSQL |
| R028–030 | تراکنش، رسید HMAC، advisory lock، duplicate guard و مرجع تصادفی | آزمون commit failure، هم‌زمانی same/different key، 409 body و retry ثابت؛ lookup عمومی PII وجود ندارد |
| R031–032 | loading، خطای422/429/شبکه، حفظ ورودی، success واقعی | مرورگر واقعی؛ وعده زمان/رایگان/اعلان بدون provider وجود ندارد |
| R033–034/R048/R070 | CRM فقط owner/sales؛ status/outcome/assignee/notes/history، جست‌وجو/فیلتر/صفحه‌بندی | محرومیت editor/guest، CSRF/If-Match، مسئول فعال، قرارداد فقط outcome won دمو |
| R035 | شرط provider فعال نشده؛ ذخیره مستقل | صف durable و retry اعلان فقط هنگام ارائه provider واقعی لازم است |
| R036 | limiter مشترک PostgreSQL، contact pattern، honeypot و body limit | 429 واقعی بین appهای مستقل؛ تفکیک IP پشت BFF با trusted proxy در مرحله۱۰ |
| R076 | سیاست ۱۸۰ روز مصوب، purge PII/notes/receipts/کلید ضداسپم، حفظ آمار بی‌نام | runtime CLI واقعی و مرز زمان آزمون؛ job روزانه/backup/restore/حذف زودهنگام پیش از Production در مرحله۱۰ |
| R077 | آمار درخواست/qualified فعلی/قرارداد/source با cohort زمان ایجاد | conversion/رویداد فرم/ارگانیک در مرحله۹؛ source ورودی allowlist و لینک داخلی است |
| R089/R090/R097–100/R104 | فرم واقعی strict TS، رابط responsive و tests PostgreSQL/مرورگر/Docker | آمار دقیق و شواهد QA در گزارش مرحله۸؛ WCAG کامل/Production/Lighthouse همچنان پذیرش جدا دارند |

این جدول وضعیت جدید است و ردیف‌های تاریخی مرحله۳ درباره «فرم غیرفعال» صرفاً سابقه‌اند. نتیجه نهایی تست‌ها از QA مرحله۸ خوانده شود؛ اجراهای متوقف یا skip موفق شمرده نشده‌اند.
## الحاق مرحله۹ — SEO و Performance

| شناسه | وضعیت مرحله۹ | معیار و محدودیت |
| --- | --- | --- |
| R051 | qualified view با رضایت اختیاری نسخه‌دار و flag، DNT/GPC و لغو timer؛ bot/dedupe واقعی | از داده ساختگی برای «محبوب» استفاده نمی‌شود؛ محدودیت شبکه مشترک مستند |
| R063 | metadata/canonical/OG/Twitter و breadcrumb/Article/VideoObject و sitemap آموزش | VideoObject فقط با داده کامل و تاریخ گذشته معتبر؛ محتوای واقعی رسمی و دامنه برای پذیرش انتشار لازم است |
| R077 | KPI با cohort و مخرج واقعی، CRM مستقل و صفر=null | فقط نشست رضایت‌داده؛ baseline میدانی هنوز وجود ندارد و هدف ساختگی تنظیم نشده |
| R078 | هشت event دقیق، allowlist و رضایت اختیاری و بدون PII | PostgreSQL، Origin/rate/dedupe، DNT/GPC و لغو اجازه؛ فعال‌سازی عمومی در پیکربندی انتشار |
| R079 | SSR و no-store، cache فقط در رندر، snapshot مؤثر انتشار و sitemap زمان درخواست | build بدون API روشن؛ draft/preview cache عمومی ندارند؛ تأخیر staging هنوز باید سنجیده شود |
| R080 | metadata یکتا و canonical مسیر اصلی و slug فارسی | alias نادرست404؛ دامنه نهایی هنوز ارائه نشده و ایندکس بسته است |
| R081 | schema مبتنی بر محتوا و escape script | تست محلی تطابق/ساختار؛ validator موتور جست‌وجو روی دامنه واقعی پس از انتشار لازم است |
| R082 | sitemap خودکار قطعات۱۰۰۰تایی از snapshot عمومی مؤثر | future/draft/archive/hidden/legal draft/empty حذف؛ admin/preview/404/result/filter noindex |
| R083 | local font، next/image AVIF/WebP، preload و ابعاد ثابت | Motion از root حذف؛ ارزیابی نهایی با assets رسمی پس از دریافت لازم است |
| R084 | جمع‌آوری RUM پس از رضایت و p75 با ordering و sample count | نتیجه میدانی واقعی هنوز قابل ادعا نیست؛ نمونه آزمایشگاه جای آن را نمی‌گیرد |
| R085 | ابزار Lighthouse13.5.0 و سه دور برای هر شش مسیر | نتایج نهایی در گزارش QA؛ آزمون محلی HTTP/fixture با HTTPS staging تفکیک می‌شود |
| R086 | مسیر blog/learn مستقل و canonical و انتشار انسانی | متن رسمی آموزش/وبلاگ هنوز از کاربر دریافت نشده؛ داده fixture فقط در DB تست |
# وضعیت مرحله۱۰ — زیرساخت و پذیرش

| شناسه | پیاده‌سازی | معیار پذیرش/شرط |
|---|---|---|
| R091 | Dockerfileهای multi-stage API/web/Caddy، Compose توسعه/تولید مستقل | build واقعی، up/health و آزمون snapshot/restore |
| R092 | شبکه خصوصی، non-root برنامه، readonly/cap_drop، volume و secrets جدا | inspect واقعی؛ DB/API/web port عمومی ندارند |
| R093 | TLS/HSTS/CSP nonce، proxy IP احرازشده | HTTPS localhost آزمون واقعی؛ ACME دامنه عمومی وابسته به مقصد |
| R094 | migration مالک جدا، lock، backup AES-GCM، restore تازه، rollback راهنما | داده/یادداشت/hash رسانه و ابطال نشست بازیابی‌شده |
| R095 | CI pin شده lint/type/build/API/browser/dependency/image | actionlint محلی؛ اجرای GitHub پس از Push مجاز و runner |
| R096 | راهنمای staging و انتشار | دامنه و سرور اعلام نشده؛ استقرار عمومی باز است |
| R097 | Pytest/HTTPX با PostgreSQL واقعی | نتیجه junit و تست عملیات مستقل |
| R098 | مرورگر سه موتور/عرض‌ها، CSP/HTTPS، Lighthouse | گزارش واقعی اجرای نهایی، بدون ادعای داده میدانی |
| R099 | مانور backup/restore مستقل | archive احرازشده، منع overwrite namespace، مقایسه داده و فایل |
| R036/R076 | IP ضدجعل و cleanup دوره‌ای retention مصوب | quota واقعی و PII منقضی؛ backup retention پیشنهادی۷روز جداست |

این الحاق وضعیت تاریخی مراحل پیشین را جایگزین نمی‌کند. تصمیم‌های اجرایی و پذیرش وابسته در [گزارش مرحله۱۰](step-10-report.md) جمع‌بندی می‌شوند. MVP محلی با داده فرضی منتشر نمی‌شود؛ fixture فقط محیط آزمون مستقل است.

## الحاق بازطراحی پنل و ورود پیامکی

درخواست مستقیم مالک در۱۴اکتبر۲۰۲۶: ورود شماره همراه و OTP، کد توسعه111111، تنظیمات ملی‌پیامک فقط مالک، چیدمان پیشخوان مشابه وردپرس با Tailwind و نشان مربع با گوشه گرد. این تصمیم روش ورود ایمیل/رمز مراحل قبلی را در محیط واقعی جایگزین می‌کند؛ MFA اختیاری، مجوز سمت سرور، audit، داده CMS و CRM حفظ می‌شوند. پذیرش: رد شماره ناشناس، انقضا/محدودیت/عدم مصرف دوباره OTP، منع دیباگ تولید، رمزگذاری credential، تغییر حساس با OTP همان نشست، تست فرم واقعی در سه موتور/عرض و migration افزایشی. ارسال واقعی پیامک به credential و الگوی مصوب ارائه‌نشده وابسته است. نتیجه و شواهد نهایی در [گزارش بازطراحی پنل](admin-refresh-report.md) هستند.
