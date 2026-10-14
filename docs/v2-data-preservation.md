# Schema موجود و برنامهٔ حفظ داده در V2

این سند طرح انتقال آینده است. در STEP 0 هیچ Migration، Backfill، restore یا تغییر دادهٔ اصلی اجرا نشده است. موجودی محلی، نمایندهٔ قطعی دادهٔ Production یا محیط‌های دیگر نیست.

به‌روزرسانی V2: ابزار `scripts/upgrade-development.py` انتقال محلی را پس از بازیابی و مقایسهٔ دقیق پشتیبان انجام می‌دهد. ابزار `backup-development.py` آرشیو دیتابیس، رسانه و محیط را رمزگذاری می‌کند و دیتابیس بازیابی را روی سرویس تست جداگانه بررسی می‌کند. عنوان/SEO/محتوای منتشرشده، شناسه و URL برگه، digest همهٔ revisionهای قبلی و جداول اصلی مشتری/مدیر پس از ارتقا مقایسه می‌شوند؛ تغییر یا حذف دادهٔ قبلی، اجرای موفق محسوب نمی‌شود. شواهد اجرای نهایی در `docs/qa/v2-step6` ثبت می‌شوند. این عملیات روی Production اجرا نمی‌شود.

## Schema فعلی تأییدشده

PostgreSQL 17.11؛ Alembic head: `0008_phone_otp`. بررسی مستقیم `pg_tables`، constraints و مدل‌های SQLAlchemy، ۳۱ جدول زیر را نشان داد:

| حوزه | جدول‌ها | نقش و روابط اصلی |
|---|---|---|
| نسخهٔ دیتابیس | alembic_version | head اعمال‌شده؛ ابزار readiness اختلاف schema را بررسی می‌کند |
| مدیران و audit | admins، audit_logs | UUID مدیر، phone/email یکتا، role؛ actor و entity تغییرات |
| ورود و امنیت | admin_sessions، auth_challenges، admin_mfa، admin_recovery_codes، rate_limit_buckets، admin_otps | نشست/چالش/MFA/کد بازیابی/OTP با اتصال به مدیر؛ limiter پایدار |
| SMS | sms_configuration | singleton، credentials رمزگذاری‌شده، body_id، enabled/debug/row_version |
| CMS | pages، page_revisions، page_sections، faq_categories | هویت صفحه و نسخهٔ محتوا، سکشن نسخهٔ ۱ و دستهٔ FAQ |
| رسانه و تنظیمات | media_assets، revision_media_refs، site_settings، setting_media_refs | فایل واقعی و metadata، مراجع revision/settings؛ private/public |
| آموزش | learning_categories، learning_tags، learning_revision_categories، learning_revision_tags، learning_revision_relations، learning_series_items، learning_views، learning_stats | taxonomy و روابط وابسته به revision، ترتیب مجموعه و آمار مشاهده |
| درخواست‌ها | leads، lead_receipts، lead_notes، lead_status_history | دریافت demo/contact، idempotency، یادداشت و تاریخچه؛ assignee به admins |
| اندازه‌گیری | analytics_events | رویدادهای محدود با رضایت، مستقل از اطلاعات هویتی لید |

### CMS فعلی

- `pages.id` کلید UUID؛ slug یکتا به صورت کلید داخلی مانند `page:demo`؛ page_type پس از ایجاد ثابت می‌ماند.
- working/published/scheduled revision FK مرکب به `(page_id,id)` دارند؛ نسخهٔ یک صفحه نمی‌تواند به صفحهٔ دیگر وصل شود.
- `pages.row_version >= 1`، schedule ID/time باید هر دو پر یا خالی باشند؛ index برای archived/schedule و یکتایی slug آموزش بین article/video.
- `page_revisions`: یکتایی `(page_id,revision_no)`، content_json/seo_json، creator، created/updated/published/reviewed، category؛ دادهٔ نسخهٔ قبلی در save حذف نمی‌شود.
- `page_sections`: FK به revision، sort_order یکتا در revision، schema_version دقیقاً ۱؛ projection سکشن legacy و نه درخت صفحه‌ساز.
- `revision_media_refs` و `setting_media_refs`: کلید مرکب و FKهای محدودکنندهٔ حذف؛ تغییر Renderer نباید این گراف مراجع را دور بزند.
- `media_assets`: storage_key یکتا، checksum، اندازه و ابعاد مثبت، alt، private/public؛ CMS جدید نباید فایل‌ها را جدا از DB جایگزین کند.

### Lead فعلی

- UUID و reference_id یکتا؛ kind فقط demo/contact؛ demo الزاماً phone دارد.
- status فقط new/contacted/qualified/closed؛ closed الزاماً outcome از won/lost/no_response/duplicate/resolved دارد. won برای contact مجاز نیست.
- نام و تماس تا زمان purge لازم‌اند؛ details، source، consent version/time، fingerprint، version و last_activity/purged timestamp ذخیره می‌شوند.
- `assigned_to` به Admin موجود با FK محدودکننده وصل است؛ اعتبار role/active در Service بررسی می‌شود.
- indexهای وضعیت/نوع+زمان، retention و fingerprint+زمان موجودند؛ constraints به دادهٔ V2 تسری داده یا version شوند، نه بی‌برنامه حذف شوند.
- LeadReceipt روی digest کلید، digest بدنه، lead_id و expiry نگهداری می‌شود؛ LeadNote و LeadHistory روی lead/time index دارند.
- یادداشت داخلی PII بالقوه دارد؛ در purge حذف می‌شود. تاریخچهٔ غیرشخصی حذف نمی‌شود و آخرین وضعیت برای شمارش حفظ می‌شود.

### اختلاف‌های مهم با مدل هدف

Organization، Contact، Opportunity، DemoSession، Activity زمان‌دار، StageEvent، SavedView و automation outbox فعلاً وجود ندارند. نام مدرسه/شهر/نقش فرد/تخمین تعداد دانش‌آموز داخل `Lead.details` است؛ این داده هنوز رابطهٔ واقعی چند شخص/چند درخواست یک مدرسه نیست.

هیچ جدول قرارداد/پرداخت/صورتحساب/اشتراک وجود ندارد؛ metric فعلی contracts از outcome دستی won محاسبه می‌شود. بازطراحی داده نباید این وضعیت را قرارداد مالی واقعی معرفی کند.

## Mapping پیشنهادی — شناسه‌ها و داده‌ها حفظ شوند

| موجود | مقصد/توسعهٔ آینده | قاعدهٔ حفظ |
|---|---|---|
| Page | همان Page | UUID، slug، نوع، URL و SEO بدون تغییر |
| Revision قدیمی | همان Revision + قالب legacy | محتوا overwrite نشود؛ تبدیل، revision تازه ایجاد کند |
| Published pointer | همان pointer تا تأیید | تبدیل پیش‌نویس هرگز انتشار خودکار نیست |
| PageSection | projection legacy | هیچ DROP یا تغییر constraint خودکار برای جا دادن tree V2 |
| MediaAsset و Refها | همان موجودیت + refs سند V2 | UUID/storage_key/checksum حفظ؛ جمع‌آوری references از همهٔ nodes و globals |
| SiteSetting | همان تنظیم + نسخهٔ styles | credentials وارد سند/تنظیم public نشوند؛ لوگو و تماس مصوب حفظ |
| Learning revision/taxonomy/series | همان مدل‌ها | Page Builder فقط resolver/ویجت اضافه کند |
| Lead | همان Lead + روابط nullable اولیه | UUID/reference/status/history/consent/idempotency حفظ |
| Lead.details.school_name/city/student_count_range | Organization candidate + provenance | details قدیمی باقی بماند؛ تخمین بازه‌ای به عدد دقیق ساختگی تبدیل نشود |
| Lead.full_name/contact_value/job_title | Contact candidate + OrganizationContact | نمایش منبع و confidence؛ تطبیق مبهم به بررسی انسانی برود |
| Lead.assigned_to | assignee موجود + assignee opportunity/activity | account یا auth دوم ایجاد نشود |
| LeadNote | timeline component یا activity reference | حذف/کپی دوبارهٔ یادداشت ممنوع؛ یک منبع authoritative و همان retention |
| LeadHistory | timeline قدیمی + eventهای جدید | actor/time/from/to و تاریخچهٔ قبلی حفظ شوند |
| Lead(kind=demo) | Demo Request موجود | DemoSession جدا، صفر تا چند جلسه؛ هر درخواست را «جلسهٔ انجام‌شده» فرض نکنیم |
| closed/won یا closed/lost | اطلاعات تاریخی qualification/conversion | جلسه، مبلغ، تاریخ قرارداد یا opportunity گذشته حدس زده نشود؛ policy backfill صریح لازم است |
| admins/sessions/MFA/SMS | همان مدل‌ها | بدون ایجاد مجدد مالک، حساب یا secret جدید برای قابلیت‌های جدید |

Organization/Contact/Opportunity به عنوان مدل‌های وابسته داخل **همان ماژول CRM و دیتابیس لندینگ** اضافه شوند؛ نگهداری leads در پایگاه دوم یا CRM موازی پیشنهاد نمی‌شود.

## روابط و constraints پیشنهادی

- Organization و Contact با UUID؛ join رابطهٔ OrganizationContact برای مدیر/سایر افراد و چند تماس. نام مدرسه یکتای جهانی نیست.
- Lead با organization_id/contact_id اختیاری و provenance؛ conversion با قفل و کلید idempotency، گراف روابط را اتمیک ایجاد/متصل کند.
- Opportunity با organization، originating lead/contact، assignee، مرحله، مبلغ تخمینی اختیاری+currency، close date و lost reason. تاریخ یا ارزش نامعلوم nullable بماند.
- StageEvent با opportunity، actor، from/to و زمان؛ append-only. terminal lost بدون reason پذیرفته نشود؛ stage و status لید مستقل بمانند.
- DemoSession با lead/organization/opportunity، schedule/timezone/assignee، status/outcome/next action. next action زمان‌دار به Activity واقعی وصل شود.
- Activity با نوع، روابط موجود، due/completed، assignee و visibility. شاخص‌های due/status/assignee برای overdue.
- Tag/LeadTag دامنهٔ CRM داشته باشند؛ learning_tags با لیدها بی‌برنامه مخلوط نشوند.
- SavedView با owner و filter schema محدود؛ filter آزاد SQL/DSL اجرایی پذیرفته نشود.
- OutboxJob با event/destination/idempotency/attempts/next_run/delivery state؛ notification token یا payload شامل PII وارد log عمومی نشود.
- تمام روابط با FK و index مناسب، version برای رکورد قابل ویرایش و زمان UTC. موارد soft delete فقط با نیاز مصوب؛ Archive/Purge فعلی جایگزین truncate نیست.

این‌ها طرح هستند؛ DDL/Alembic دقیق پس از تأیید مراحل مربوط و تثبیت قراردادها تهیه خواهد شد.

## قواعد Duplicate و ادغام

1. retry/idempotency فعلی حفظ شود؛ درخواست یکسان، lead دوم نسازد.
2. تماس canonical با حفظ raw display معتبر و مقایسهٔ امن؛ شمارهٔ مشترک مدرسه یا خانواده، هویت یکتای قطعی شخص نیست.
3. مدرسه با نام مشابه در دو شهر/شعبه، خودکار ادغام نشود. نام normalize‌شده + شهر/استان + شواهد تماس فقط candidate بسازد.
4. درخواست تازه با message/source متفاوت، حتی از یک تماس، می‌تواند درخواست مستقل معتبر باشد؛ anti-spam با entity dedupe متفاوت است.
5. ادغام مبهم با preview، رضایت اپراتور مجاز، transaction و audit؛ درخواست‌ها/جلسه‌ها/فرصت‌ها/یادداشت‌ها و assignee conflict واضح نگاشت شوند.
6. در انتقال اولیه هیچ Lead یا Page به دلیل «تکراری» حذف نشود؛ رابطهٔ merged_into یا mapping مستقل قابل ردیابی به جای حذف تاریخچه استفاده شود.
7. Backfill دوباره‌اجراپذیر باشد: شناسهٔ مصدر/نسخهٔ mapping و نتیجه ثبت شود؛ اجرای دوم contact/organization تکراری نسازد.

## رضایت و چرخهٔ عمر اطلاعات

سیاست تأییدشدهٔ قبلی: ۱۸۰ روز پس از آخرین پیگیری، حذف اطلاعات شخصی؛ رضایت فقط ذخیره و تماس دربارهٔ همان درخواست را پوشش می‌دهد. معرفی CRM حرفه‌ای، اجازهٔ نگهداری دائمی یا تبلیغات جدید ایجاد نمی‌کند.

- PII کپی‌شده/منتقل‌شده به Contact، مدرسه، جلسه، note و outbox باید تحت سیاست مشترک باشد.
- حفظ یک Contact مشترک به خاطر درخواست فعال دیگر نیازمند purpose/consent معتبر همان درخواست است؛ حذف از یک Lead نباید به حذف اشتباه درخواست مجاز دیگر منجر شود.
- رویداد اتوماتیک reminder یا خواندن رکورد نباید بی‌دلیل last_activity انسانی را تمدید کند.
- تاریخچهٔ غیرشخصی و aggregateها قابل حفظ‌اند؛ free text و metadata اعلان ممکن است PII داشته باشند و نیازمند پاک‌سازی‌اند.
- پشتیبان نیز چرخهٔ انقضا دارد؛ restore قبل از دسترسی عمومی purgeهای لازم را دوباره اجرا کند.
- تغییر سیاست نگهداری/مقاصد تماس پیش از STEP 5 نیازمند تصمیم صریح است؛ هیچ سیاست جدیدی در ممیزی اعمال نشد.

## Backup معتبر پیش از هر Migration آینده

1. محیط هدف، Compose project، نام DB و volumeهای media دقیقاً مشخص شوند؛ محیط محلی را با Production اشتباه نگیریم.
2. از workflow موجود `scripts/production.py` و [راهنمای backup/restore](backup-restore-runbook.md) reuse شود؛ قبل از تغییر داده، backup تازه از DB + رسانه تهیه شود.
3. migration head، checksum/manifest رسانه، زمان، نسخهٔ اپ، تعداد موجودیت‌ها و کلید رمزگذاری معتبر در metadata خصوصی ثبت شوند؛ secret/PII داخل docs یا Git نرود.
4. decrypt/manifest و `pg_restore` روی **DB/volume تازه و مستقل** بررسی شوند؛ شمار موجودیت‌ها، refs، revision pointers، فایل‌ها و نمونهٔ فرم/Preview/CRM نیز بررسی شوند. داشتن فایل backup به‌تنهایی اعتبار آن را ثابت نمی‌کند.
5. در copy آزمایشی، حساب‌ها/نشست‌ها/مقصدهای پیام بیرونی غیرفعال شوند؛ هیچ SMS/email واقعی از fixture ارسال نشود.
6. پس از تأیید restore drill، backup به عنوان قابل استفادهٔ انتقال ثبت شود. در STEP 0 backup تازهٔ Production تهیه/تأیید نشده، چون محیط هدف معرفی نشده و Migration اجرا نمی‌شود.

## انتقال غیرمخرب

الگوی پیشنهادی: **expand → backfill → validate → enable**. ستون/جدول تازه ابتدا nullable و بدون حذف قبلی؛ کد قدیمی/جدید در بازهٔ انتقال با دادهٔ قدیمی سازگار باشد. constraint قوی‌تر پس از backfill معتبر فعال شود؛ عملیات سنگین و lockها با حجم واقعی سنجیده شوند.

برای CMS، schema v1 و v2 هم‌زمان خوانده شوند. تبدیل با revision تازه، گزارش diff و dry-run؛ انتشار هر صفحه مستقل. جدولهای Page/Revision/Media و URLs دست‌نخورده بمانند.

برای CRM، Lead/receipt/note/history و source فعلی حفظ شوند. درخواست legacy ابتدا بدون روابط تازه نیز قابل نمایش باشد. backfill candidate مدرسه/Contact صرفاً روی دادهٔ موجود، با ambiguity queue؛ Opportunity/جلسهٔ تاریخی جعلی ساخته نشود.

## Verification و تست انتقال آینده

Dataset آزمایشی باید دارای صفحات draft/published/scheduled، چند revision، تصویر private/public و refs، FAQ انتخابی، آموزش/series، demo/contact، notes/history، تکرارهای واقعی‌نما، assignee غیرفعال و رکورد نزدیک/بعد از مرز purge باشد.

آزمون‌ها: upgrade از head فعلی و fresh install، اجرای دوم backfill، UUID/URL/consent/pointer/checksum/relations، عدم نشر draft/رسانهٔ private، فرم retry، concurrency، RBAC، چند جلسه/چند تماس، source/گزارش، purge و restore. برای retention مشترک و ادغام مبهم assertion مستقل لازم است.

تست موجود migration seeded از `0001_admin_core` تا head، مدیر را حفظ می‌کند و تست model/schema parity موجود است. این تست به تنهایی انتقال غنی CMS/CRM V2 را ثابت نمی‌کند؛ آزمون dataset بالا باید اضافه شود.

## Rollback Plan

- قبل از شروع: image/app نسخهٔ قبلی، backup آزمایش‌شده، head و mapping گزارش انتقال در دسترس باشد.
- تا قبل از فعال‌سازی: backfill متوقف و feature flag غیرفعال؛ migration افزایشی باقی بماند، جدول تازه drop نشود.
- CMS: به revision legacy تأییدشدهٔ هر صفحه برگردد؛ revision V2 حفظ شود. اجرای renderer قدیمی روی published v2 بدون adapter، rollback معتبر نیست.
- CRM: روی view/route سازگار قبلی بازگردیم؛ دادهٔ تازهٔ activity/opportunity حذف نشود و امکان reconciliation باقی بماند.
- اگر restore ضروری شد، روی target تازه انجام شود؛ Delta دادهٔ دریافت‌شده پس از backup بررسی شود تا درخواست‌های جدید از دست نروند. restore روی DB زندهٔ دارای داده، بدون تأیید انجام نشود.
- Alembic downgrade یا حذف ستون/جدول داده‌دار در Production خودکار اجرا نشود. تغییر مخرب نیازمند تأیید صریح کاربر است.
- پس از rollback: readiness، مسیرهای منتشرشده، login، فرم واقعی، private draft، CRM و counts/relations/retention دوباره بررسی شوند.

## وضعیت STEP 0

Schema و نگاشت پیشنهادی مستند شدند. دادهٔ اصلی تغییر نکرد. Migration جدید: **هیچ**. Backfill جدید: **هیچ**. صحت انتقال V2: **هنوز آزموده نشده** و فقط پس از تأیید مرحلهٔ مربوط قابل گزارش خواهد بود.
