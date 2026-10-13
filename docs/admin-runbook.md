# راهنمای مدیریت و امنیت پنل ماکان — STEP 5

پنل `/admin` فقط حساب‌های مدیران همین وب‌سایت را می‌شناسد. ورود عمومی کاربران اپ ماکان، CMS و CRM به این مرحله تعلق ندارند. MFA با تصمیم مستقیم مالک پروژه برای هر مدیر اختیاری است. تاریخ بررسی: ۱۳ اکتبر ۲۰۲۶.

## راه‌اندازی و اولین مالک

Docker Desktop فعال باشد. از ریشه، در PowerShell:

```powershell
./scripts/setup-development.ps1
docker compose config --quiet
docker compose build api migrate
docker compose up -d --wait db
docker compose run --rm migrate
docker compose up -d --wait api
docker compose exec -it api python -m app.commands.admin bootstrap --email YOUR_REAL_EMAIL
npm ci
npm run dev
```

`YOUR_REAL_EMAIL` را با ایمیل واقعی مالک جایگزین کنید. فرمان، رمز جدید و تکرار آن را بدون نمایش می‌پرسد؛ رمز در argv یا گزارش قرار نمی‌گیرد. طول رمز ۱۵ تا ۱۲۸ نویسه است. bootstrap فقط وقتی جدول حساب‌ها خالی است مجاز است و عملیات audit می‌شود. هیچ حساب عملیاتی یا رمز پیش‌فرض در migration یا seed نیست. UI: `http://127.0.0.1:3000/admin/login`؛ API داخلی پیش‌فرض روی `127.0.0.1:8000` است. برای وب، `API_INTERNAL_URL` فقط server-side در `apps/web/.env.local` قابل تنظیم است.

اسکریپت setup مقادیر خصوصی موجود را حفظ می‌کند و فقط کلیدهای مفقود را اضافه می‌کند. دو کلید مستقل `AUTH_SECRET` و `AUTH_MFA_KEY` هر کدام ۳۲ بایت hex ضروری‌اند. `.env` و `.env.test` ignored و فاقد محل در Git هستند. نمونه عمومی `.env.example` حاوی secret واقعی نیست.

## نقش‌ها و عملیات روزمره

| نقش | دسترسی فعال مرحله ۵ | دسترسی مراحل آینده |
|---|---|---|
| مالک / owner | داشبورد، حساب‌ها، audit، امنیت خود، مشاهده و لغو نشست دیگر مدیران | همه CMS، CRM و تنظیمات |
| ویرایشگر / editor | داشبورد با شمارش صفحات واقعی، امنیت و نشست‌های خود | CMS و رسانه |
| فروش / sales | داشبورد پایه، امنیت و نشست‌های خود | درخواست‌ها و یادداشت‌ها |

نقش سمت API کنترل می‌شود؛ درخواست مستقیم فروش/ویرایشگر به accounts یا audit برابر 403 است. مالک برای ایجاد حساب یا تغییر نقش/وضعیت، رمز فعلی و در صورت فعال‌بودن MFA کد معتبر را وارد می‌کند. تغییر نقش یا غیرفعال‌سازی همه نشست‌های حساب هدف را لغو می‌کند. آخرین مالک فعال قابل حذف نقش یا غیرفعال‌سازی نیست؛ این قاعده در رقابت همزمان هم اجرا می‌شود. حذف حساب از پنل وجود ندارد تا سابقه audit و روابط حفظ شوند.

در صفحه امنیت، نشست‌های فعال خود و آخرین زمان فعالیت را ببینید و نشست دلخواه را ببندید. مالک همین کار را در صفحه حساب‌ها برای حساب انتخاب‌شده انجام می‌دهد؛ فهرست حداکثر ۱۰۰ نشست فعال اخیر را می‌آورد. تغییر رمز، فعال یا غیرفعال‌کردن MFA همه نشست‌های همان مدیر را می‌بندد و ورود دوباره لازم است. خروج server-side ثبت و cookie پاک می‌شود؛ مرورگر با بارگذاری کامل، cache مسیرهای خصوصی را کنار می‌گذارد.

## MFA و بازیابی

در `/admin/security` رمز فعلی را وارد کنید و راه‌اندازی را آغاز کنید. کلید دستی را در برنامه سازگار TOTP با SHA1، شش رقم و دوره ۳۰ ثانیه ثبت کنید؛ QR خارجی یا سرویس ثالث برای secret فراخوانی نمی‌شود. راه‌اندازی پنج دقیقه فرصت دارد و تا واردکردن کد معتبر، MFA فعال نیست. ساعت دستگاه و سرور باید هماهنگ باشد. بازه پذیرش یک گام قبل/بعد است؛ تکرار گام مصرف‌شده رد می‌شود و ارقام فارسی/عربی پذیرفته می‌شوند. مبنا: [RFC 6238](https://www.rfc-editor.org/rfc/rfc6238).

پس از تأیید، هشت کد بازیابی ۱۲۸ بیتی فقط همان بار نمایش داده می‌شود. آن‌ها را در محل امن خارج دستگاه ورود نگه دارید. هر کد یک‌بارمصرف است؛ دیتابیس فقط HMAC کد را دارد. تولید مجدد، تمام کدهای قبلی را بی‌اعتبار می‌کند و رمز + عامل دوم معتبر لازم دارد. secret TOTP با AES-256-GCM، nonce تصادفی و شناسه حساب به‌عنوان AAD رمزگذاری می‌شود. secret، رمز و کدها در audit یا log نیستند.

اگر برنامه و همه کدهای بازیابی از دست رفته‌اند، اپراتور مجاز از کنسول مورد اعتماد فرمان زیر را اجرا می‌کند:

```powershell
docker compose exec -it api python -m app.commands.admin recover --email YOUR_REAL_EMAIL
```

فرمان رمز جدید را می‌پرسد، MFA را حذف و همه نشست‌ها را لغو می‌کند؛ رویداد `admin.operator_recovery` ثبت می‌شود. حساب باید فعال باشد. این مسیر self-service یا reset لینک ایمیل نیست؛ ایمیل/SMS بدون سرویس واقعی به محصول اضافه نشده است. دسترسی Docker/کنسول مسئولیت اپراتور زیرساخت است.

## policy نشست و محدودیت نرخ

نشست opaque تصادفی ۲۵۶ بیتی است؛ فقط HMAC token و CSRF در PostgreSQL نگه‌داری می‌شود. انقضای مطلق پیش‌فرض ۸ ساعت و idle برابر ۳۰ دقیقه است. cookie توسعه `makan_session` و تولید/staging `__Host-makan_session` است؛ HttpOnly، SameSite=Lax، Path=/، بدون Domain؛ Secure فقط در staging/production و با HTTPS. originها JSON دقیق `AUTH_ALLOWED_ORIGINS` هستند؛ origin با path، credential یا HTTP غیرمحلی رد می‌شود. برای ورود و تمام تغییرات، Origin و CSRF الزامی‌اند. مبنا: [OWASP Session](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)، [OWASP CSRF](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html).

پیش‌فرض‌ها: ۲۰ تلاش ورود/۱۵ دقیقه/IP، پنج تلاش/۱۵ دقیقه/ایمیل، ۳۰ درخواست CSRF/پنج دقیقه/IP؛ reauth پنج تلاش/۱۵ دقیقه/حساب؛ تأیید MFA پنج تلاش/پنج دقیقه/حساب. درخواست موفق نیز quota مصرف می‌کند. 429 دارای Retry-After است؛ پنجره ثابت UTC و UPSERT اتمیک بین workerهاست. تلاش ناموفق نیز quota را حفظ می‌کند. تغییر سقف‌ها نیازمند آزمون بار و ضداسپم است. pool اصلی پیش‌فرض پنج اتصال و pool limiter مستقل دو اتصال دارد تا rollback عملیات حساس شمارنده را پاک نکند.

در توسعه bridge وب، peer IP سمت API متعلق به فرآیند Next است؛ سقف IP بین کاربران آن bridge مشترک می‌شود. به X-Forwarded-For کاربر اعتماد نمی‌شود. proxy مستقیم same-origin و allowlist زیرساخت برای IP واقعی در STEP10 تکمیل و آزموده می‌شود؛ انتشار پشت proxy فعلی به‌عنوان Production تأیید نشده است.

پاک‌سازی محدود رکوردهای منقضی challenge/rate bucket:

```powershell
docker compose exec api python -m app.commands.auth_cleanup --batch-size 1000
```

هر اجرا حداکثر ۱۰۰۰ رکورد از هر نوع را حذف می‌کند؛ بازه مجاز ۱ تا ۱۰۰۰۰ است. حساب، audit، MFA، کد بازیابی یا نشست را حذف نمی‌کند. اجرای دوره‌ای این فرمان در runbook استقرار STEP10 تنظیم خواهد شد. برای نگهداری/حذف نشست‌ها و audit هنوز retention عملیاتی مصوب نداریم؛ حذف خودکار آن‌ها اضافه نشده است.

## نگهداری کلیدها و محدودیت تحویل

کلید MFA باید همراه backup دیتابیس، در مخزن secret مستقل و کنترل‌شده بازیابی‌پذیر باشد؛ بدون آن secretها قابل رمزگشایی نیستند. تغییر ساده `AUTH_SECRET` نشست، CSRF و کدهای بازیابی قبلی را بی‌اعتبار می‌کند. تغییر ساده `AUTH_MFA_KEY` MFA موجود را خراب می‌کند؛ rotation بدون بازرمزگذاری مصوب انجام نشود. راهنمای backup/restore و rotation کامل تولید در STEP10 است.

پنل force-dynamic/no-store/noindex است و CSP با nonce دارد. دسترسی HTTP توسعه فقط loopback است. HTTPS واقعی، HSTS، Caddy، CI، آزمون دستگاه واقعی و Lighthouse نهایی هنوز متعلق به مرحله ۱۰/۹ هستند. ریسک حل‌نشده dev dependency `braces` در [گزارش مرحله](step-5-report.md) ثبت شده و مجوز انتشار Production محسوب نمی‌شود.

## آزمون مجدد

```powershell
docker compose --env-file .env.test -f compose.test.yaml up -d --wait
./scripts/test-backend.ps1
npm run build
npm run lint
npm run typecheck
./scripts/test-web-admin.ps1
docker compose --env-file .env.test -f compose.test.yaml down
```

Node24 LTS و مرورگرهای Playwright لازم‌اند. اسکریپت مرورگر API واقعی روی 8100، Next خروجی تولید روی 3100 و دیتابیس اختصاصی موقت می‌سازد؛ حساب‌های fixture فقط در آن DB هستند. نام DB و DSN cleanup guard دارند و پس از پایان، فرآیند متعلق به همان تست و DB همان اجرا حذف می‌شود. هیچ API ساختگی جای اتصال واقعی نیست. اجرای پذیرش این میزبان یک worker دارد؛ assertionهای امنیت و تمام موتورهای مرورگر حفظ می‌شوند. اسکریپت این میزبان از Edge نصب‌شده برای موتور Chromium استفاده می‌کند؛ Firefox/WebKit نسخه مدیریت‌شده Playwright هستند. برای Chromium بسته‌شده پس از `npx playwright install chromium firefox webkit` از `./scripts/test-web-admin.ps1 -ChromiumChannel bundled` استفاده کنید. اسکریپت Node24 نصب‌شده را مستقیم اجرا می‌کند؛ fallback این میزبان از نسخه۲۴ cached npm استفاده می‌کند. XML و خلاصه شواهد در `docs/qa/step5` قرار دارند.

برای بررسی سریع خود ابزار اجرا و cleanup پس از تغییر اسکریپت، `./scripts/test-web-admin.ps1 -SmokeOnly` سه سناریوی guest/CSRF را اجرا می‌کند؛ این فرمان جای آزمون کامل مرحله را نمی‌گیرد.

## ماژول‌های فعال پس از مرحله۶

مالک و ویرایشگر در `/admin/content`، `/admin/media` و `/admin/faq-categories` کار می‌کنند؛ `/admin/settings` فقط مالک است. نقش فروش CMS را نمی‌بیند و API403 دارد. امنیت/جلسات/MFA همان سیاست مرحله۵ را حفظ می‌کند. هیچ role جدید یا حساب پیش‌فرضی ساخته نشده است. متن اولیه با CLI idempotent و بدون حساب fixture وارد می‌شود. [راهنمای CMS](cms-runbook.md) مرجع انتشار/تاریخچه، تصویر خصوصی و تنظیمات عمومی است.
