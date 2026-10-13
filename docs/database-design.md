# طراحی پایگاه داده PostgreSQL

وضعیت: طرح کامل مقصد؛ چهار جدول اصلی آن در STEP4 با migration واقعی ساخته شده‌اند. سایر جدول‌ها به مراحل مربوط تعلق دارند؛ جزئیات اجرای فعلی در انتهای سند است. مرجع: R025–078 و بخش‌های ۹ و ۱۲ الف سند.

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

## schema واقعی STEP4

Migration `0001_admin_core`: admins و audit_logs؛ `0002_page_revision_core`: pages و page_revisions. alembic_version جدول کنترل ابزار است. UUID، timestamps UTC، email lowercase/unique، role CHECK، slug unique، row_version مثبت، schedule pair، FKهای RESTRICT و مالکیت revision با FK مرکب در PostgreSQL اجرا و آزموده شدند. مدل‌ها با reflection/autogenerate مقایسه شدند؛ drift صفر است. created_at/updated_at توسط ORM/default DB تنظیم می‌شود؛ به‌روزرسانی مستقیم SQL، updated_at خودکار trigger ندارد.

اشاره‌گرها nullable هستند تا چرخه insert page/revision در یک تراکنش حل شود. حذف ساختاری مخرب/downgrade مسدود است. runtime فقط DML جداول مجاز، audit SELECT/INSERT و alembic_version SELECT دارد و DDL مجاز نیست. هیچ حساب عملیاتی یا محتوای نمونه در DB توسعه seed نشده است. session/challenge/rate-limit در STEP5 و sections/media/settings/features/FAQ در STEP6 migration مستقل خواهند داشت؛ schema این مرحله کامل CMS نیست. گزارش و شواهد در step-4-report است.

## schema واقعی مرحله ۵

Migration جدید `0003_auth_mfa` روی head قبلی `0002_pages` اعمال می‌شود؛ migrationهای قبلی بازنویسی نشده‌اند. مدل و خروجی migration همگام‌اند و `alembic check` معیار drift است.

| جدول | قیود و داده واقعی | index / چرخه عمر |
|---|---|---|
| admin_sessions | UUID PK، admin_id FK RESTRICT، token_digest یکتا، csrf_digest، timestamps و absolute/idle/seen/revoked | admin_id+revoked_at، expires_at؛ هیچ token خام ذخیره نمی‌شود |
| auth_challenges | UUID PK، digest token یکتا، digest CSRF، purpose=login، expires_at/used_at/timestamps | expires_at؛ پنج دقیقه، مصرف یک‌باره |
| rate_limit_buckets | PK مرکب scope+subject_hmac+window_start، count>=0، expires_at | expires_at؛ UPSERT اتمیک؛ IP/email خام ذخیره نیست |
| admin_mfa | admin_id PK/FK RESTRICT، secret رمزگذاری‌شده، enabled_at، pending_expires_at، last_used_step، timestamps | یک enrollment برای هر مدیر؛ pending پنج دقیقه و replay guard |
| admin_recovery_codes | PK مرکب admin_id+code_digest، FK RESTRICT، used_at | هشت کد HMACشده؛ مصرف زیر قفل، regeneration جایگزین همه قبلی‌ها |

Grant DML برای پنج جدول در خود migration صریح است؛ audit همچنان runtime SELECT/INSERT دارد و UPDATE/DELETE ندارد. حذف حساب از UI وجود ندارد. تغییر نقش/active و revoke با audit در یک تراکنش انجام می‌شود. آخرین مالک فعال تحت advisory lock حفاظت می‌شود؛ دو تغییر همزمان فقط یکی مجاز است. نقش migration از runtime و دیتابیس تست از توسعه مستقل است.

فرمان `app.commands.auth_cleanup` در هر transaction یک batch محدود از challenge و bucket منقضی پاک می‌کند؛ live record، حساب، نشست و audit را لمس نمی‌کند. retention نشست/audit تا policy تولید خودکار نشده است. secret MFA خارج DB کلید دارد؛ key backup و DB backup باید هماهنگ بازیابی شوند. هیچ حساب عملیاتی یا محتوا به DB توسعه seed نشده؛ fixtureهای تست فقط DB اختصاصی هستند. مدل‌های CMS و CRM با تأیید مراحل۶–۸ افزوده خواهند شد.

## تغییر واقعی مرحله۶ — migration 0004_cms

شش جدول faq_categories، page_sections، media_assets، revision_media_refs، site_settings و setting_media_refs افزوده شدند. PageRevision اکنون content_json JSONB، category_id FK و created_by nullable برای import سیستمی دارد. ویرایش HTTP بدون actor مجاز نیست. جدول Page و اشاره‌گرهای working/published/scheduled، زمان UTC و row_version موجود استفاده می‌شوند. schema با Alembic ارتقا می‌یابد؛ مسیر downgrade این migration به علت حذف داده/تاریخچه عمداً مسدود است و recovery از backup لازم است.

| جدول | کلید/رابطه/قید |
|---|---|
| faq_categories | UUID PK؛ slug یکتا، sort_order>=0 و timestamp؛ category_id هر revision با RESTRICT |
| page_sections | UUID PK؛ revision_id FK RESTRICT؛ position یکتا در revision، type و schema_version=1، JSON typed snapshot |
| media_assets | UUID PK؛ storage_key یکتا؛ checksum، WebP MIME، size/dimensions>0، alt، visibility private/public CHECK، created_by FK و timestamp |
| revision_media_refs | PK مرکب revision_id/media_id؛ هر دو FK RESTRICT؛ ارجاع همه snapshotهای معرفی و تصاویر HTML/SEO |
| site_settings | key PK allowlist general/seo در service؛ JSON typed، schema_version، row_version، updated_by و زمان |
| setting_media_refs | PK مرکب setting_key/media_id؛ FK RESTRICT؛ حفاظت لوگو و OG |

رکورد Page از slug داخلی kind:slug استفاده می‌کند؛ uniqueness در دیتابیس حفظ و رزرو هم‌زمان با advisory lock و conflict409 بررسی می‌شود. PageSection همزمان با snapshot ساخته می‌شود؛ public هرگز working pointer را مصرف نمی‌کند. رابطه رسانه پلی‌مورفیک آزاد یا FK جعلی ندارد. داده JSON پیش از ذخیره Pydantic validate و HTML sanitize می‌شود. امکانات، مخاطبان و FAQ چهار موتور revision جدا نمی‌خواهند؛ جدول‌های جدا از طرح اولیه در این بخش با دلیل فنی مستند جایگزین شده‌اند، API و رفتار مستقل آن‌ها حفظ شده است.

Runtime روی جداول CMS فقط DML لازم دارد؛ audit همان SELECT/INSERT است و UPDATE/DELETE/DDL مجاز نیست. Migration role جدا از runtime است. ارتقا روی fresh/prior، constraints، grant و drift در PostgreSQL واقعی آزموده می‌شوند. هیچ drop/create موقت schema در Production یا داده اصلی انجام نشده است؛ database fixtureهای تست پس از آزمون حذف می‌شوند.

## الحاق مرحله۷: migration0005_learning

جدول فیزیکی learning_contents یا learning_series جدا ایجاد نشد: Page نوع entity و PageRevision snapshot typed، metadata آپارات/متن/SEO/کاور/نقش/سطح/موضوع را نگه می‌دارند. این انتخاب انتشار و امنیت زمان‌بندی مرحله۶ را یکپارچه نگه می‌دارد. مقاله/ویدیو در namespace learn یک slug مشترک یکتا با index جزئی uq_learning_slug دارند؛ وبلاگ و سری مستقل‌اند.

| جدول جدید | کلید/رابطه/قید |
|---|---|
| learning_categories, learning_tags | UUID؛ unique(domain,slug)، domain learn/blog، sort_order>=0، timestamps |
| learning_revision_categories | PK(revision_id,category_id)، FK حقیقی revision و category |
| learning_revision_tags | PK(revision_id,tag_id)، FK حقیقی revision و tag |
| learning_revision_relations | PK(revision_id,content_id)، FK حقیقی revision و Page |
| learning_series_items | PK(revision_id,content_id)، unique(revision_id,position)، position>=0 |
| learning_views | PK(content_id,viewer_digest,day)، FK Page، expires_at index؛ بدون IP/UA خام |
| learning_stats | PK/FK content_id، qualified_views>=0؛ upsert اتمیک |

metadata رسانه از RevisionMediaRef موجود استفاده می‌کند. referenced taxonomy/media حذف نمی‌شوند؛ بایگانی سابقه انتشار را حفظ می‌کند. migrator جدول و index را ایجاد می‌کند و runtime فقط CRUD این جدول‌ها را دارد؛ اختیار DDL و UPDATE/DELETE audit ندارد. مدل و migration با compare_metadata روی PostgreSQL واقعی بررسی می‌شوند. جزئیات در [تصمیم‌ها](step-7-decisions.md).
# افزوده مرحله ۸ — migration `0006_leads`

| جدول | کلید/رابطه | داده و محدودیت |
| --- | --- | --- |
| leads | UUID PK؛ reference_id یکتا؛ assigned_to→admins RESTRICT | demo/contact، روش phone/email، نام/تماس، جزئیات JSONB اعتبارسنجی‌شده، consent version/time، source، status/outcome، version، fingerprint HMAC، last_activity/purged |
| lead_receipts | HMAC کلید PK؛ lead_id→leads RESTRICT | body HMAC و expires_at؛ رسید ۲۴ ساعته، بدون body خام |
| lead_notes | UUID PK؛ lead/actor FK | متن خصوصی ساده، زمان؛ در purge حذف می‌شود |
| lead_status_history | UUID PK؛ lead/actor FK | تغییرات نوع‌دار status/outcome/assignee و زمان؛ فاقد نام/شماره/پیام |

Indexهای status/created، kind/created، fingerprint/created، retention جزئی `purged_at IS NULL`، receipt expiry و lead/time تاریخچه/یادداشت. constraint وضعیت/نوع/تماس، demo فقط phone، closed نتیجه غیرNULL معتبر، won فقط demo، version>=1 و PII الزامی مگر پس از purge. نوشتن فرم و رسید/تاریخچه/audit در یک تراکنش؛ advisory lock برای race. پاک‌سازی اطلاعات شخصی UPDATE+حذف notes/receipts، بدون حذف آمار یا migration مخرب. مدل/مهاجرت با PostgreSQL واقعی و compare_metadata بررسی می‌شود. تنظیم سرویس اصلی ماکان مستقل باقی است.
## الحاق مرحله۹ — SEO و Performance

migration افزایشی `0007_analytics` فقط جدول analytics_events و مجوزهای محدود آن را می‌افزاید. هیچ جدول موجودی بازسازی یا داده‌ای seed نمی‌شود. PK=UUID رویداد؛ day، HMAC نشست، نام رویداد، route template، channel، error_kind و metric_name/value/revision و created_at. Constraint نام/channel/digest/metric pair/مقدار و Index day/name و day/session_digest، با grant UPDATE فقط روی دو ستون عددی metric. UPDATE/DELETE تاریخچه CRM و audit همچنان ممنوع است.

ماندگاری، report ordering، de-duplication و purge با نقش runtime روی PostgreSQL واقعی آزمون می‌شوند. آمار به admin/lead یا حساب محصول join نمی‌شود؛ شناسه و متن شخصی ذخیره ندارد. تفاصيل و سیاست batch/backup در [قرارداد](step-9-contract.md) و [راهنمای عملیاتی](seo-performance-runbook.md).
# الحاق مرحله۱۰

جدول تازه یا migration مخرب ایجاد نشده؛ head برابر `0007_analytics` باقی می‌ماند. worker از index/ستون‌های انقضای موجود auth/learning/leads/analytics با batch محدود استفاده می‌کند. lockهای migration/maintenance/operator مستقل‌اند. بازیابی dump فقط در namespace خالی، سپس migration رو به جلو و ابطال session/challenge/PII منقضی قبل از exposure انجام می‌شود. [راهنمای backup/restore](backup-restore-runbook.md).
