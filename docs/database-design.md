# طراحی پایگاه داده PostgreSQL

وضعیت: طرح پیشنهادی؛ migration یا جدول واقعی هنوز ایجاد نشده است. مرجع: R025–078 و بخش‌های ۹ و ۱۲ الف سند.

## قواعد سراسری

تمام entityها UUID به‌عنوان PK، `created_at/updated_at timestamptz` در UTC دارند؛ joinهای صرفاً رابطه‌ای PK مرکب دارند و نیازی به updated_at ندارند. تاریخ نمایش می‌تواند فارسی باشد؛ ذخیره زمان UTC است. slug پس از Unicode NFC و normalize قواعد مشخص فارسی، یکتا در namespace همان منبع است؛ canonical slug خوانای لاتین در شروع پیشنهاد می‌شود، فارسی نیز با encoding درست پشتیبانی خواهد شد. slug قبلاً منتشرشده قفل یا همراه redirect دائمی اصلاح می‌شود؛ تغییر ساده URL عمومی ممنوع است.

email مدیر lowercase و یکتا؛ phone به قالب بین‌المللی نرمال می‌شود، ارقام فارسی/عربی تبدیل می‌شوند. موبایل unique جهانی نیست؛ یک فرد می‌تواند درخواست مشروع جدید داشته باشد. همه enumهای قراردادی با CHECK و در Python enum متناظرند. تمام SQL پارامتری و query sort allowlist. soft delete عمومی نداریم؛ محتوا با unpublish/archive، حساب با deactivate، و PII با purge طبق سیاست واقعی مدیریت می‌شود.

`RESTRICT` پیش‌فرض FK برای جلوگیری از حذف ناخواسته اطلاعات؛ `CASCADE` فقط join/child کاملاً متعلق و پس از بررسی مجوز. media مورد استفاده با RESTRICT حذف می‌شود. حذف مدیر انجام نمی‌شود تا attribution audit حفظ شود. محدودیت‌های طول/size در schema و DB برای داده ثابت؛ محتوای بزرگ در validation محدود می‌شود.

## حساب، نشست و کنترل امنیت

| جدول | ستون‌های اصلی و روابط | قیود و Index |
|---|---|---|
| admins | id، email، password_hash، role، is_active، last_login_at، timestamps | unique(email)، role in owner/editor/sales؛ آخرین owner فعال قابل غیرفعال‌سازی نیست (transaction/service lock) |
| admin_sessions | id، admin_id FK، token_digest، csrf_digest، expires_at، idle_expires_at، last_seen_at، revoked_at | unique(token_digest)، index(admin_id,revoked_at)، index(expires_at)؛ plaintext token ذخیره نمی‌شود |
| auth_challenges | id، csrf_digest، expires_at، purpose | challenge کوتاه‌عمر پیش‌ورود؛ index(expires_at) و یک‌بارمصرف |
| admin_mfa | admin_id PK/FK، encrypted_totp_secret، enabled_at | فقط اگر MFA فعال شود؛ کلید رمزگشایی خارج DB |
| admin_recovery_codes | admin_id FK، code_digest، used_at | PK(admin_id,code_digest)؛ مصرف اتمیک؛ فقط MFA |
| rate_limit_buckets | scope، subject_hmac، window_start، count، expires_at | PK(scope,subject_hmac,window_start)، count>=0، index(expires_at)؛ افزایش اتمیک |
| audit_logs | id، actor_id nullable FK، action، entity_type، entity_id، field_changes_json، trace_id، created_at | index(actor_id,created_at)، index(entity_type,entity_id,created_at)؛ append-only برای role runtime؛ بدون secret/PII فرم |

مالکیت DB migration با role جدا از runtime؛ API role فقط DML لازم، نه CREATE/DROP. audit append-only در سطح grant و برنامه؛ این طرح ادعای tamper-proof در برابر DBA ندارد. شکست audit برای mutation حساس سبب rollback همان mutation است.

## محتوای سایت و انتشار

| جدول | ستون‌های اصلی و روابط | قیود و Index |
|---|---|---|
| pages | id، slug، page_type، working_revision_id، published_revision_id، scheduled_revision_id، scheduled_at، is_archived، row_version | unique(slug)، CHECK سازگاری scheduled_at/revision؛ index(scheduled_at) |
| page_revisions | id، page_id FK، revision_no، title، seo_json، indexable، published_at، reviewed_at، created_by FK، timestamps | unique(page_id,revision_no)، unique(page_id,id) برای FK مرکب اشاره‌گرهای نسخه |
| page_sections | id، revision_id FK، type، schema_version، sort_order، content_json | unique(revision_id,sort_order)، sort_order>=0؛ type allowlist و JSON Pydantic validated |
| features | id، slug، visibility، sort_order، working/published/scheduled pointers، scheduled_at، archived، row_version | unique(slug)، index(visibility,sort_order) |
| feature_revisions | id، feature_id FK، title، description، readiness، evidence_reference، verified_at، body_html، seo_json، timestamps | readiness in available/partial/roadmap؛ unique(feature_id,revision_no) و FK مرکب |
| audiences | id، slug، working/published/scheduled pointers، scheduled_at، archived، row_version | unique(slug)، slug برای مدارس/معلم/والد/دانش‌آموز کنترل‌شده |
| audience_revisions | id، audience_id FK، revision_no، title، body_html، pain_points_json، benefits_json، seo_json، timestamps | unique(audience_id,revision_no)، نسخه منتشرشده immutable |
| faq_categories | id، slug، title، sort_order | unique(slug)، sort_order>=0 |
| faqs | id، category_id FK، sort_order، working/published/scheduled pointers، scheduled_at، archived، row_version | index(category_id,sort_order) |
| faq_revisions | id، faq_id FK، revision_no، question، answer_html، reviewed_at، timestamps | unique(faq_id,revision_no)، HTML sanitized |
| site_settings | key PK، value_json، schema_version، is_public، updated_by FK، timestamps | key allowlist؛ حساس/credential در DB CMS نیست؛ public projection از allowlist ثابت |
| slug_redirects | namespace، old_slug، target_entity_id، created_at | PK(namespace,old_slug)؛ مقصد جاری، loop ممنوع؛ فقط URLهای منتشرشده |

برای همه جداول revision در بالا `revision_no` و `created_by` الزامی است حتی اگر برای اختصار تکرار نشده باشد. اشاره‌گر نسخه با FK مرکب `(entity_id,revision_id)` تضمین می‌کند revision متعلق به همان entity باشد؛ migration باید چرخه insert entity/revision را با pointers nullable و ترتیب تراکنش حل کند. page_sections رسانه‌های داخل JSON را در `revision_media_refs` ثبت می‌کند تا FK و محافظ حذف واقعی باشند؛ صرفاً URL آزاد در JSON کافی نیست.

Index مشترک برای revisionهای public شامل `(published_at DESC, id)` و برای entityها `(is_archived, scheduled_at, id)` است؛ query باید فقط effective revision را انتخاب کند. در blog/learn فیلتر category/kind/level با این دسترسی ترکیب می‌شود. Indexهای جست‌وجوی title/body نرمال‌شده پس از EXPLAIN تثبیت می‌شوند؛ index به‌تنهایی مجوز نمایش draft نمی‌دهد.

موارد available/partial باید قبل publish شاهد و بازبینی محصول داشته باشند؛ متن roadmap برچسب مشخص دارد. نام شاهد می‌تواند reference داخلی غیرعمومی باشد، نه الزام بارگذاری قرارداد حساس. انتشار marketing entity یک snapshot کامل است؛ ترتیب header/footer یا page sections در نسخه جدید همزمان عوض می‌شود. site_settings فنی غیرمحتوایی فوراً و با audit تغییر می‌کند؛ متن عمده برند/صفحه در revision باقی می‌ماند.

## وبلاگ مستقل

| جدول | ستون‌های اصلی | قیود و Index |
|---|---|---|
| blog_categories | id، slug، title، description، sort_order | unique(slug) |
| tags | id، slug، title | unique(slug)؛ مشترک blog/learn با join جدا |
| blog_posts | id، slug، category_id FK، working/published/scheduled pointers، scheduled_at، archived، row_version | unique(slug)، index(category_id)، index(scheduled_at) |
| blog_post_revisions | id، post_id FK، revision_no، title، excerpt، body_html، cover_media_id FK، estimated_minutes، reviewed_at، published_at، seo_json، created_by | unique(post_id,revision_no)، estimated_minutes>=1؛ unique(post_id,id) |
| blog_revision_tags | revision_id FK، tag_id FK | PK(revision_id,tag_id)، index(tag_id) |
| blog_revision_audiences | revision_id FK، audience_id FK | PK(revision_id,audience_id)، index(audience_id) |

category و slug به entity تعلق دارند و تغییرشان mutation عمومی audited است؛ سایر ویرایش‌ها نسخه draft می‌سازند. categoryها را در ابتدا ثابت نگه می‌داریم یا تغییر عمومی‌شان صریحاً در UI هشدار دارد. زمان مطالعه با الگوریتم فارسی روی متن واقعی برآورد و override بازبین قابل ثبت است. محتوای معتبر sanitizer خروجی ذخیره‌شده است؛ source editor JSON نیز محدود و versioned است، اگر editor آن را نیاز داشته باشد.

## مرکز آموزش

| جدول | ستون‌های اصلی | قیود و Index |
|---|---|---|
| learning_categories | id، slug، title، description، sort_order، is_visible | unique(slug)، index(is_visible,sort_order) |
| learning_contents | id، slug، kind، level، category_id FK، working/published/scheduled pointers، scheduled_at، archived، row_version | unique(slug)، kind in article/video، level in beginner/intermediate/advanced؛ index(kind,level,category_id) |
| learning_content_revisions | id، content_id FK، revision_no، title، summary، body_html، cover_media_id FK، estimated_minutes، published_at، reviewed_at، seo_json، created_by | unique(content_id,revision_no)، unique(content_id,id)، estimated_minutes>=1 یا null برای video |
| learning_videos | revision_id PK/FK، aparat_video_id، original_url، duration_seconds، transcript، upload_date | CHECK duration_seconds>0 اگر معلوم؛ ID معتبر و نوع parent=video توسط service و constraint trigger |
| learning_revision_tags | revision_id FK، tag_id FK | PK(revision_id,tag_id)، index(tag_id) |
| learning_revision_audiences | revision_id FK، audience_id FK | PK(revision_id,audience_id)، index(audience_id) |
| learning_content_relations | source_revision_id FK، target_content_id FK، position | PK(source_revision_id,target_content_id)، unique(source_revision_id,position)، self-reference ممنوع |
| learning_series | id، slug، working/published/scheduled pointers، scheduled_at، archived، row_version | unique(slug)، index(scheduled_at) |
| learning_series_revisions | id، series_id FK، revision_no، title، description_html، seo_json، published_at، created_by | unique(series_id,revision_no)، unique(series_id,id) |
| learning_series_items | series_revision_id FK، content_id FK، position | PK(series_revision_id,content_id)، unique(series_revision_id,position)، position>=0 |
| learning_daily_views | content_id FK، day، qualified_count | PK(content_id,day)، qualified_count>=0 |
| learning_view_dedup | content_id FK، visitor_hmac، day، expires_at | PK(content_id,visitor_hmac,day)، index(expires_at) |

رابطه دسته به مطلب ۱:N، مطلب به tag/audience M:N، مجموعه به مطلب M:N مرتب است. مجموعه می‌تواند مقاله و ویدیو داشته باشد. یک category برای هر مطلب در MVP کافی و در فیلتر روشن است؛ اگر چندموضوعی لازم شد join جدا با migration اضافه می‌شود. قبلی/بعدی از ترتیب مجموعه و فقط اعضای منتشرشده است؛ related از جدول روابط، نه حدس محتوا.

`learning_videos` افزونه revision محتوای video است؛ یک ویدیو در یک revision یک ID دارد. تغییر نوع article/video پس از انتشار مجاز نیست؛ URL ثابت باقی می‌ماند. به‌جای اعتماد به embed_url ذخیره‌شده پیشنهادی PRD، URL embed تنها از ID و قالب رسمی allowlisted در کد ساخته می‌شود؛ هیچ HTML یا URL اجرایی دلخواه ذخیره/اجرا نمی‌شود. این تفاوت مدل برای کاهش XSS و تغییر یکجای قالب آپارات است. upload_date فقط منبع معتبر/مدیر؛ نبود آن مانع VideoObject کامل است.

qualified view پیشنهادی: صفحه public، حداقل ۱۰ ثانیه visible، یک content در روز برای شناسه کوتاه‌عمر ناشناس، حذف botهای شناخته‌شده و rate-limit؛ counter فقط تقریبی و با عنوان دقیق نمایش داده می‌شود. HMAC با salt قابل چرخش؛ IP خام در آمار ذخیره نمی‌شود. ناشناس‌سازی جای policy حقوقی را نمی‌گیرد. منبع محبوبیت همین شمارنده واقعی است، نه seed.

## رسانه

| جدول | ستون‌های اصلی | قیود و Index |
|---|---|---|
| media_assets | id، storage_key، original_filename، mime_type، size_bytes، width، height، checksum_sha256، alt_text، visibility، created_by، timestamps | unique(storage_key)، size_bytes>0، width/height>0 برای تصویر، visibility private/public |
| revision_media_refs | entity_type، revision_id، media_id FK، usage | PK(entity_type,revision_id,media_id,usage)؛ مالک revision توسط service/trigger؛ media deletion RESTRICT |

اگر FK پلی‌مورفیک در `revision_media_refs` نگهداری پیچیده شود، هنگام migration برای هر نوع revision جدول FK جدا ساخته می‌شود؛ تضمین DB بر صرف abstraction مقدم است. این تصمیم قبل STEP6 تثبیت شود. upload ابتدا private است؛ publish فقط فایل‌های مجاز reference شده را عمومی می‌کند. فایل مشترک public از قبل محرمانه فرض نمی‌شود. حذف draft private از volume بعد transaction و با retry امن؛ orphan cleanup و backup هماهنگ مستند است.

## فرم‌ها و پیگیری

| جدول | ستون‌های اصلی | قیود و Index |
|---|---|---|
| demo_requests | id، reference_id، full_name، phone_normalized، school_name، school_name_normalized، city، job_title، student_count_range، message، consent_at، consent_policy_version، status، closed_outcome، source_json، assigned_to FK، row_version، timestamps | unique(reference_id)، index(status,created_at DESC,id)، index(phone_normalized,created_at)، status in new/contacted/qualified/closed؛ closed_outcome won/lost/null |
| contact_messages | id، reference_id، name، contact_type، contact_value_normalized، subject، message، consent_at، consent_policy_version، status، assigned_to FK، source_json، row_version، timestamps | unique(reference_id)، type in phone/email، index(status,created_at DESC,id) |
| lead_notes | id، demo_request_id FK nullable، contact_message_id FK nullable، author_id FK، body، timestamps | CHECK دقیقاً یکی از دو parent، index(parent,created_at)؛ متن داخلی private |
| lead_status_history | id، demo_request_id/contact_message_id FK، old_status، new_status، outcome، actor_id FK، created_at | CHECK یکی از parent؛ append-only؛ index(parent,created_at) |
| submission_keys | scope، key_digest، payload_digest، form_token_digest، target_id، reference_id، expires_at، created_at | PK(scope,key_digest)، unique(scope,form_token_digest)، index(expires_at) |
| duplicate_guards | scope، fingerprint_hmac، last_target_id، last_submitted_at، expires_at | PK(scope,fingerprint_hmac)؛ row lock برای رقابت چند key؛ index(expires_at) |

submission_keys صرفاً نتیجه حداقلی reference را حفظ می‌کند، نه کپی payload حساس. key/form token روی یک فرم حقیقی ساخته و در retry حفظ می‌شوند. same key با body متفاوت 409؛ same key/body نتیجه قبلی؛ fingerprint پیشنهادی شماره+مدرسه+scope برای دمو و contact+subject+message digest برای تماس در بازه ۱۰min، قابل تنظیم. جلوگیری از duplicate به معنی نگهداری ابدی موبایل unique نیست. پاک‌سازی PII باید target/reference/dedupe/notes/history را هماهنگ حذف/ناشناس کند؛ audit فقط کد عملیات purge را دارد.

source_json شامل channel/referrer_host و UTMهای allowlisted با طول محدود؛ URL query کامل که ممکن است PII داشته باشد ذخیره نمی‌شود. reference حداقل ۱۲۸ بیت entropy با unique DB. endpoint عمومی پیگیری داده شخصی ارائه نمی‌شود.

## آمار عملیاتی

| جدول | ستون‌های اصلی | قیود و Index |
|---|---|---|
| analytics_events | id، event_name، anonymous_visit_digest، source_channel، properties_json، occurred_at، expires_at | allowlist هشت event؛ index(event_name,occurred_at)، retention کوتاه مصوب؛ payload PII رد |
| analytics_daily | day، event_name، source_channel، count | PK(day,event_name,source_channel)، count>=0 |

organic sessions تا انتخاب روش consent/analytics و taxonomy attribution صرفاً KPI تعریف‌شده است؛ داده ناموجود به‌صورت صفر واقعی یا «داده کافی نیست» مشخص می‌شود. قرارداد موفق با outcome دستی sales ثبت، نه اتصال اپ اصلی. هدف درصدی پس از baseline تعیین می‌شود.

## انتشار، رقابت و migration

حالت نمایشی از pointers مشتق می‌شود: draft بدون نسخه عمومی؛ published با published_revision_id؛ scheduled با schedule آینده که می‌تواند در کنار نسخه جاری باشد. در موعد، scheduled revision برای public انتخاب می‌شود و نسخه قبلی باقی می‌ماند تا job اختیاری pointer را promote کند. cancel schedule/unpublish در تراکنش pointers را اصلاح می‌کند. همه خواندن‌های public دقیقاً همین تابع visibility را استفاده می‌کنند. نگهداری revisionهای قدیمی محدود و retention مستقل از PII است.

ویرایش پنل با row_version/If-Match؛ mismatch برابر 409، جلوگیری از overwrite همزمان. publish/reorder/status تغییر، history و audit در یک تراکنش. CHECKهای cross-table مانند «video دارای افزونه» یا «آخرین owner فعال» با service lock و trigger/deferred constraint مناسب در migration پیاده می‌شوند؛ test concurrency الزامی است.

ترتیب migration: auth/security → pages/features/audiences/FAQ/settings/media → blog → learn → lead/contact/history/idempotency → analytics. هر مرحله upgrade روی DB تازه و DB دارای داده قبلی؛ مدل و migration drift check. `create_all`/drop-recreate در production ممنوع. تست constraints باید با PostgreSQL همان major انجام شود. Backup قبل migration پرخطر و restore در database جدا؛ downgrade تخریب‌گر خودکار مجاز نیست. SQL index دقیق جست‌وجوی فارسی پس از EXPLAIN داده واقعی تعیین می‌شود؛ برای MVP normalized ILIKE محدود، در صورت نیاز pg_trgm با migration صریح.
