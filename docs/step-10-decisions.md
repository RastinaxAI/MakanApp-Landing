# تصمیم‌ها و پذیرش مرحله۱۰

اجرای این مرحله با درخواست مستقیم کاربر در ۱۳ اکتبر ۲۰۲۶ مجاز است. سیاست آنالیتیکس opt-in، نگهداری درخواست‌ها ۱۸۰ روز و MFA اختیاری مدیران حفظ می‌شوند. دامنه، سرور/staging، مقصد backup و RPO/RTO هنوز اعلام نشده‌اند. آماده‌سازی زیرساخت و آزمون مستقل محلی ادامه می‌یابد؛ انتشار عمومی یا اجرای GitHub Actions تا فراهم‌شدن مقصد و مجوز Push قابل ادعا نیست.

## ساختار استقرار

- Compose تولید مستقل از Compose توسعه است. Caddy تنها سرویس دارای پورت میزبان؛ وب، API و PostgreSQL روی شبکه‌های خصوصی‌اند. `/api/v1/*` مستقیماً به FastAPI می‌رود؛ `/` به Next.js. BFF موجود برای توسعه و مسیر داخلی بهینه‌سازی تصویر حفظ می‌شود.
- Caddy نشانی واقعی peer را در header اختصاصی و با کلید مستقل پراکسی به API می‌فرستد. headerهای IP دلخواه مرورگر قابل اعتماد نیستند. API فقط header احراز‌شده را استفاده می‌کند؛ درخواست داخلی بدون آن از peer خود استفاده می‌کند. کلید در هیچ bundle یا log قرار نمی‌گیرد.
- وب و API non-root، فایل‌سیستم read-only جز cache/media/job-state و tmpfs؛ restart، healthcheck، limits و گردش log محدود دارند. نسخه و digest تصاویر ثبت می‌شود؛ build به API/DB یا secret تولید وابسته نیست.
- HTTPS عمومی با ACME و HSTS از Caddy؛ آزمون مستقل HTTPS با CA داخلی Caddy و دامنه localhost انجام می‌شود. گواهی داخلی شاهد صدور گواهی عمومی نیست. CSP nonce برای صفحات عمومی و پنل، آپارات فقط در صفحات دارای پلیر.

## عملیات و بازیابی

Migration فقط job کنترل‌شده با نقش مالک و advisory lock موجود است. startup هیچ جدول نمی‌سازد. bootstrap مالک با CLI امن و ورود تعاملی؛ هیچ حساب یا رمز نمایشی در تولید ساخته نمی‌شود.

Backup شامل dump PostgreSQL، رسانه و manifest با checksum و fingerprint کلیدهای لازم است؛ داده شخصی و dump خام در archive رمزگذاری‌شده AES-256-GCM قرار می‌گیرند. کلید رمزگذاری مستقل و بیرون archive نگهداری می‌شود. برای snapshot سازگار DB/media، نویسنده‌ها طی پنجره کوتاه backup متوقف و در finally به وضعیت قبلی برمی‌گردند. این انتخاب MVP به downtime کوتاه نیاز دارد؛ RPO/RTO واقعی باید تصویب و با حجم واقعی اندازه‌گیری شود.

Restore ابتدا اصالت و checksum archive را بررسی می‌کند؛ فقط project و volumes تازه و جدا مجازند. مسیر tar/symlink غیرمجاز رد می‌شود، مقصد موجود بازنویسی نمی‌شود. کلیدهای auth/MFA باید با fingerprint نسخه backup سازگار باشند. migration forward و لغو نشست‌های بازیابی‌شده و اجرای retention پیش از شروع سرویس عمومی انجام می‌شوند. downgrade مخرب خودکار وجود ندارد.

Worker نگهداری از همان image API، cleanup محدود و دوره‌ای auth/learning/leads/analytics را با lock و heartbeat واقعی انجام می‌دهد. status عملیاتی سلامت سرویس‌ها و کهنگی heartbeat/backup را گزارش و exit code مناسب تولید می‌کند. مقصد اعلان خارجی بدون ارائه provider اضافه نمی‌شود.

## گیت‌ها

R091–099: build چهار سرویس، fresh up، TLS/redirect/HSTS/CSP/cookie، IP ضدجعل، auth/RBAC/CSRF، فرم واقعی و media، عدم publish DB/API/web، persistence restart/recreate، backup رمزگذاری و restore مستقل با مقایسه داده/فایل، retention و migration concurrency. Pytest/HTTPX، Playwright سه موتور و اندازه‌ها، lint/typecheck/build، scan dependency/image و Lighthouse اجرا و شواهد در `docs/qa/step10` حفظ می‌شوند. CI دارای ابزارهای pin و artifacts است؛ اجرای واقعی GitHub بدون Push تأیید نشده گزارش نمی‌شود.

داده و حساب آزمون فقط در محیط مستقل acceptance ساخته می‌شوند. دیتابیس توسعه موجود، تغییر قبلی next-env.d.ts و Backend اصلی ماکان حفظ می‌شوند. گزارش پیش از commit الزامی است و Push مجاز نیست.
