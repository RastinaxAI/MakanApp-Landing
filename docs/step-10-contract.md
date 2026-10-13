# قرارداد مرحله۱۰

API مستقل نسخه۰.۱۰.۰ است؛ migration head همچنان `0007_analytics` است. نیاز تازه‌ای به جدول یا تغییر schema وجود ندارد؛ worker از expires_at/retention/indexهای موجود استفاده می‌کند. schema و داده موجود بازسازی نمی‌شوند.

| سطح | قرارداد | پذیرش |
|---|---|---|
| وب | GET `/health/live`، GET `/health/ready` | no-store/noindex؛ ready با API قطع‌شده۵۰۳ |
| پراکسی | `/api/v1/*` مستقیم API، سایر مسیرها Next | IP peer + کلید edge؛ ورودی جعلی overwrite |
| هدر داخلی | `X-Makan-Proxy-Key` و `X-Makan-Client-IP` | مقایسه constant-time، literal IP؛ بدون کلید اعتماد نمی‌شود |
| عملیات | production.py init/build/deploy/backup/restore/status | فایل محیط خصوصی، namespace مجاز، lock، exit2 در شکست |
| retention | maintenance هر ساعت، retry شکست۳۰ثانیه | advisory lock، batch محدود، heartbeat زیر۲ساعت |
| بازیابی | archive احرازشده فقط namespace تازه | secret fingerprint، forward migration، ابطال نشست، purge |
| TLS | ACME در Production، internal CA فقط localhost تست | اعتماد واقعی HTTPX به CA؛ مرورگر تست داخلی ignoreHTTPS محدود |

هیچ endpoint عمومی بازیابی/backup یا bootstrap اضافه نشده است. CLI مدیر رمز را prompt می‌کند. OpenAPI و auth/CDN/Backend اصلی ماکان تغییر قرارداد نداده‌اند. `/health` وب از matcher CSP مستثنی است؛ صفحات دارای nonce و مسیرهای پنل noindex هستند. backup روزانه پیشنهادی و شرط تازگی۲۶ساعت status هنوز SLA/RPO/RTO قراردادی نیستند.
