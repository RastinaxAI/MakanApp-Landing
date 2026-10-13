# قرارداد تکمیلی مرحله۹ — API0.9.0

Backend مستقل لندینگ تغییر می‌کند؛ قرارداد محصول اصلی ماکان دست‌نخورده است. API نسخه `/api/v1` حفظ شده است و خطاها همان envelope استاندارد و trace_id را دارند. OpenAPI از schemaهای واقعی تولید می‌شود.

| روش | مسیر | قرارداد |
| --- | --- | --- |
| GET | `/seo/status` | origin معتبر یا null؛ enabled از flag محیط + origin؛ shard_size=1000؛ counts گروه pages/learning فقط در حالت فعال |
| GET | `/seo/page?path=...` | path حداکثر۵۰۰؛ خروجی indexable برای مسیر canonical نسخه مؤثر؛ مسیر ناشناخته/داخلی false |
| GET | `/seo/sitemap?group=pages\|learning&shard=0` | shard>=0؛ حداکثر۱۰۰۰ `{path,updated_at}` مرتب بر UUID؛ بدون HTML، draft یا اطلاعات خصوصی |
| GET | `/analytics/config` | enabled، policy_version، retention_days؛ بدون secret یا شناسه کاربر |
| POST | `/analytics/events` | Origin معتبر، سقف مشترک، consent واقعی true، policy_version معتبر، id/session_id UUIDv4؛ تنها allowlist زیر |
| GET | `/admin/analytics/metrics?days=30` | owner/sales با نشست امن؛ مهمان401/editor403؛ days بین۱و۳۰؛ آمار بدون PII |

ورودی رویداد: name یکی از هشت رویداد سند یا session_start/page_view/web_vital؛ path یک route template مشخص بدون slug/query؛ channel یکی از direct/organic/referral؛ error_kind فقط برای demo_form_submit_error و یکی از validation/server/network/rate_limit. هر فیلد اضافی، رضایت نامعتبر، نوع/مسیر نامعتبر یا شاخص ناقص422 است. حالت disabled404، Origin نامعتبر403، body بزرگ413، سقف429 با Retry-After؛ bot/DNT/GPC پاسخ200 `{accepted:false}` بدون رکورد. پاسخ موفق `{accepted:true}` پس از commit است. تکرار UUID رویداد تجاری یک رکورد باقی می‌گذارد.

برای web_vital فقط metric_name=LCP/INP/CLS، metric_value عدد finite/nonnegative (CLS score، دیگران میلی‌ثانیه) و metric_revision عدد صحیح غیرمنفی پذیرفته می‌شود. تکرار UUID برای همان session digest، path و نام شاخص، فقط با revision بزرگ‌تر مقدار را به‌روزرسانی می‌کند؛ گزارش قدیمی، نشست یا نوع متفاوت جای داده اصلی را نمی‌گیرد. nonce خام و metric id کتابخانه به DB نمی‌روند. برای رویداد غیر فنی فیلد metric ممنوع است.

خروجی metrics: days، scope=`consented_daily_sessions_utc`، sessions/organic_sessions، events، demo_conversion_rate/form_success_rate/form_error_rate nullable، vitals با count/p75/enough_samples. تعریف مخرج و محدودیت نمایندگی در [راهنمای عملیاتی](seo-performance-runbook.md) است. آمار تبدیل به قرارداد و پیگیری CRM مسیرهای مرحله۸ را استفاده می‌کند.

## دیتابیس و مجوز

migration افزایشی `0007_analytics` جدول `analytics_events` را می‌افزاید. UUID رویداد PK است؛ session_digest رشته۶۴ HMAC، day تاریخ UTC، name/path/channel رشته محدود، error_kind nullable، metric_name/value/revision nullable و created_at سمت سرور. Constraintها: نام رویداد و channel allowlist، طول digest، metric pair، مقدار/شماره گزارش غیرمنفی. Indexها روی day/name و day/session_digest برای cohort و حذف قدیمی‌اند. رابطه به admin/lead یا شناسه حساب محصول وجود ندارد.

نقش runtime: SELECT/INSERT/DELETE روی جدول و UPDATE فقط روی metric_value/metric_revision؛ تغییر نام، نشست، نوع یا رویداد تجاری مجاز نیست. جدول audit مرحله۵ immutable می‌ماند. migration موجود تغییر نمی‌کند؛ جداول قبلی حذف یا بازسازی نمی‌شوند. نگهداری منطقی۳۰ روز و purge محدود با CLI واقعی، SQL و transactionهای batch اجرا می‌شود. انتشار زمان‌بندی‌شده SEO از CASE همان CMS استفاده می‌کند؛ worker یا mock زمان‌بندی جدید ساخته نشده است.

## تکمیل قرارداد qualified view

POST `/learn/views/{uuid}` علاوه بر ticket، consent واقعی true و policy_version=`analytics-2026-10-13-v1` می‌خواهد. حالت disabled یا DNT/GPC پاسخ403 بدون شمارش دارد؛ رضایت غایب403، boolean نامعتبر/نسخه ناشناخته422. کنترل Origin، bot، elapsed۲۰تا۶۰۰ثانیه، امضا، rate و dedupe حفظ می‌شود. GET ticket در حالت disabled/DNT/GPC صادر نمی‌شود. این تغییر فقط API مستقل لندینگ است؛ رابط عمومی جدید همین قرارداد را استفاده می‌کند.
