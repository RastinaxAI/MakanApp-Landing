# راهنمای استقرار لندینگ ماکان

این راهنما فقط لندینگ و CMS مستقل آن را پوشش می‌دهد. سرور اپلیکیشن اصلی ماکان، SQL Server و حساب‌های کاربران محصول در این عملیات دخالت ندارند. تا اعلام دامنه و سرور، استقرار عمومی انجام نشده است.

## پیش‌نیاز و تنظیم اولیه

Linux، Docker Engine و Compose v2، DNS صحیح، دسترسی ورودی ۸۰/۴۴۳، فضای پایدار و Python3.13 برای ابزار عملیات لازم‌اند. برای build و مرورگرهای هم‌زمان حداقل۱۶GiB RAM پیشنهاد می‌شود؛ روی میزبان۸GiB آزمون‌ها را پشت سر هم اجرا کنید. نسخه‌های image پایه با digest ثبت شده‌اند؛ build شامل دریافت وصله‌های امنیتی Debian است، بنابراین برای تکرار دقیق انتشار باید image ساخته‌شده را با digest در registry خصوصی نگه داشت. Node24 برای build/CI است.

کد را در `/opt/makan-landing` و فایل محیط را خارج از Git در `/etc/makan-landing/production.env` قرار دهید. روی Linux دسترسی دایرکتوری ۷۰۰ و فایل ۶۰۰، و روی Windows ACL محدود به مالک لازم است. Docker socket معادل دسترسی مدیریتی میزبان است؛ حساب `makan-operator` باید اختصاصی و محدود به اپراتور مورد اعتماد باشد.

```bash
uv sync --locked --project apps/api
apps/api/.venv/bin/python scripts/production.py --env-file /etc/makan-landing/production.env init --domain DOMAIN_APPROVED_BY_OWNER
apps/api/.venv/bin/python scripts/production.py --env-file /etc/makan-landing/production.env build
```

`init` هفت کلید مستقل تصادفی می‌سازد و فایل موجود را بازنویسی نمی‌کند. مقدار domain نمونه بالا باید با دامنه واقعی جایگزین شود. secrets هرگز در argv، Git، خروجی عمومی CI یا تصویر نهایی قرار نمی‌گیرند. فهرست محیط‌ها در `.env.production.example` است. تغییر رمز role در env به‌تنهایی رمز role موجود PostgreSQL را تغییر نمی‌دهد؛ rotation باید با اتصال مدیریتی کنترل‌شده و سپس recreate سرویس انجام شود.

## انتشار کنترل‌شده

پیش از انتشار، متن حقوقی/تماس/دارایی‌های واقعی، دامنه، گواهی عمومی و سیاست backup باید تصویب شوند؛ سپس `PUBLIC_POLICY_APPROVED=true` شود. این پرچم جایگزین بررسی انسانی نیست. `SEO_INDEXING_ENABLED` و `ANALYTICS_ENABLED` پیش‌فرض خاموش‌اند؛ آنالیتیکس فقط با رضایت اختیاری و بدون PII طبق مرحله۹ قابل فعال‌سازی است.

```bash
apps/api/.venv/bin/python scripts/production.py --env-file /etc/makan-landing/production.env deploy --import-approved-marketing
docker compose -f compose.production.yaml --env-file /etc/makan-landing/production.env exec -T api python -m app.commands.admin --help
apps/api/.venv/bin/python scripts/production.py --env-file /etc/makan-landing/production.env status
```

دستور ساخت مدیر `python -m app.commands.admin bootstrap` شماره همراه را در prompt می‌گیرد. قبل از اولین ورود تولید، `python -m app.commands.sms configure` را در کانتینر API با ورودی خصوصی نام کاربری، رمز وب‌سرویس و Body ID اجرا کنید. تولید کد ثابت را رد می‌کند؛ حساب ثابت seed نمی‌شود. حساب قدیمی با `bind-phone --email` متصل می‌شود. import فقط محتوای اولیه قابل معرفی را وارد می‌کند؛ محتوای تست و آموزش ساختگی وارد Production نمی‌شود. Migration یک job مستقل با role مالک و advisory lock است. API فقط مجوز runtime دارد. هنگام تغییر ناسازگار schema پنجره نگهداری تعیین کنید؛ migrations به‌صورت خودکار downgrade نمی‌شوند.

Caddy مسیر `/api/v1/*` را مستقیم به FastAPI و سایر مسیرها را به Next می‌برد؛ IP فقط همراه کلید مستقل edge پذیرفته می‌شود. DB/API/web هیچ port عمومی ندارند. شبکه DB و application داخلی‌اند؛ فقط API به شبکه خروجی sms_egress برای تماس HTTPS ملی‌پیامک متصل است. API/web/worker/Caddy کاربر۱۰۰۰۱، rootfs فقط‌خواندنی، cap_drop ALL، no-new-privileges و محدودیت منابع دارند. PostgreSQL تولید از آغاز با postgres:postgres اجرا می‌شود؛ volume جدید مالکیت PGDATA تصویر رسمی را به ارث می‌برد. volume موجود باید متعلق به همین UID باشد؛ ابزار root-to-user غیرضروری gosu از تصویر حذف شده است.

برای پذیرش عمومی، از خارج سرور TLS بدون `-k`، redirect HTTP، صفحات عمومی، فرم واقعی، ورود/خروج/CSRF، readiness، فایل رسانه و noindex پنل را بررسی کنید. اعتبارسنجی localhost با CA داخلی، اعتبارسنجی ACME/DNS عمومی محسوب نمی‌شود. Caddyfile.local فقط برای namespaceهای acceptance/restore و bind لوپ‌بک مجاز است.

## ارتقا و بازگشت

قبل از ارتقا backup تأییدشده بگیرید؛ digest چهار image، migration head و commit انتشار قبلی را ثبت کنید. image جدید را بسازید، scans و تمام gates را اجرا کنید، سپس نسخه‌های env را تغییر داده و deploy کنید. تغییر image قبلی فقط وقتی مجاز است که schema فعلی با آن سازگار باشد. اگر migration ناسازگار است، backup را در **namespace تازه** بازیابی و اعتبارسنجی کنید و سپس با عملیات برنامه‌ریزی‌شده DNS/ترافیک را منتقل کنید. دستور حذف volume یا بازسازی جدول روی namespace اصلی وجود ندارد. توقف نویسنده‌ها در backup و عملیات ارتقا موجب وقفه کوتاه سرویس می‌شود.

## پایش

`/health/live` فقط زنده‌بودن وب و `/health/ready` وابستگی واقعی API/schema را بررسی می‌کند؛ هنگام قطع API مقدار۵۰۳ می‌دهد. Worker نگهداری هر ساعت نشست/challenge، رخداد آنالیتیکس، view و PII منقضی درخواست‌ها را با قفل و batch پاک می‌کند. heartbeat قدیمی یا failed ناسالم است. Compose وضعیت را نشان می‌دهد؛ healthcheck به‌تنهایی restart سرویس ناسالم را تضمین نمی‌کند.

نمونه‌های systemd در `infrastructure/systemd` نصب خودکار نمی‌شوند. مسیرها، مالکیت و timezone را تطبیق دهید، timerهای backup/health را فعال کنید و خروجی شکست را به سامانه پایش واقعی سازمان متصل کنید. provider اعلان هنوز ارائه نشده است؛ ارسال ایمیل/پیام موفقیت ادعا نمی‌شود. restart و log rotation در Compose تنظیم شده‌اند. عدم دسترسی Docker یا کهنگی backup باید هشدار عملیاتی ایجاد کند.

## توسعه و CI

برای توسعه فعلی `compose.yaml` و `compose.test.yaml` جدا هستند. پروفایل `website` وب Docker را روی `127.0.0.1:3100` می‌آورد؛ پورت۳۰۰۰ کاربر را اشغال نمی‌کند. قبل از E2E آن پروفایل را متوقف کنید. CI در `.github/workflows/ci.yml` شامل build/type/lint، PostgreSQL واقعی، API، سه مرورگر و image/TLS/restore است. نسخه actionها با commit pin شده‌اند. اجرای GitHub بدون Push/Dispatch انجام نشده است؛ استقرار خودکار روی سرور یا ذخیره کلید SSH اضافه نشده چون مقصدی اعلام نشده است.

در شبکه دارای محدودیت Go proxy، مرحله Caddy را با گزینه --build-arg GO_PROXY=https://goproxy.cn اجرا کنید؛ Go checksum database فعال می‌ماند. تصویر تولید DB به‌جای ابزار gosu از آغاز با کاربر postgres اجرا می‌شود.
