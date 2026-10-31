# استقرار لندینگ ماکان روی VPS با Nginx

## وضعیت واقعی این تحویل — ۲۰۲۶-۱۰-۳۱

آدرس هدف **https://makanapp.org** است. آنلاین‌شدن هنوز تأیید نشده است. سورس بررسی و build محلی با موفقیت اجرا شد. ورود مستقیم به VPS موفق نبوده و هیچ بسته‌ای روی آن نصب نشده است. روش اصلی این راهنما مطابق درخواست کاربر، **git clone روی خود VPS و اجرای اسکریپت همان‌جا** است؛ برای این روش، دسترسی SSH از محیط Codex یا کلید اتصال آن لازم نیست.

بررسی‌ها با کاربر غیرریشه، Node `24.21.0` و Ubuntu `26.04.1 LTS` در محیط **محلی** انجام شدند. این مشخصات متعلق به VPS فرض نشده‌اند. منابع اعلام‌شدهٔ VPS، ۸ گیگابایت RAM و ۴ CPU، و نسخهٔ دقیق Ubuntu آن در ابتدای اجرای سروری بررسی خواهند شد.

پنل پارس‌پک به صفحهٔ ورود کاربران رسید؛ نشست احرازشده در دسترس نبود. DNS، گواهی CDN و تنظیمات پنل تغییر نکرده‌اند. ابزار وب نیز نتوانست صفحهٔ عمومی دامنه را دریافت کند؛ این موضوع به‌تنهایی علت قطعی خرابی دامنه را ثابت نمی‌کند.

دو فایل قدیمی Downloads سابقهٔ بررسیِ بدون سورس بودند. اسکریپت حاضر از روی کد واقعی همین مخزن ساخته شده و به آن محدودیت قدیمی متکی نیست.

## ۱. تشخیص پروژه و روش انتشار

این مخزن یک workspace مبتنی بر npm دارد: `apps/web` با Next.js `16.4.3`. صفحهٔ اصلی `PublicPage` محتوای منتشرشده را با `getPage` از API می‌گیرد؛ `fetch`های عمومی `no-store` هستند. تنظیم Next خروجی export ندارد؛ حالت standalone فقط با متغیر مربوط فعال می‌شود. build واقعی نیز `/` و صفحات عمومی را به‌صورت Dynamic نشان داد.

API موجود در `apps/api` با FastAPI و Python `>=3.13,<3.14` اجرا می‌شود. PostgreSQL برای محتوای سایت، فرم‌ها و رسانه‌ها لازم است. worker موجود maintenance کارهای زمان‌بندی محتوا و نگهداری داده را انجام می‌دهد؛ ابزار یا دیتابیس تازه‌ای به محصول اضافه نشده است.

روش انتخابی: Nginx میزبان اصلی؛ Next با دستور production واقعی `next start --hostname 127.0.0.1 --port 3100`؛ API با `uvicorn app.main:create_app --factory --host 127.0.0.1 --port 8000`. هر دو و worker با systemd و کاربر غیرریشهٔ `makan` اجرا می‌شوند. PostgreSQL از بستهٔ رسمی همان Ubuntu نصب می‌شود و نسخهٔ واقعی آن گزارش می‌شود؛ نسخهٔ موجود Docker یعنی 17.11، نسخهٔ بستهٔ Ubuntu فرض نشده است. این مسیر Docker و Caddy را نصب یا اجرا نمی‌کند.

این انتشار SSR است؛ مسیر استاتیک `/var/www/makan/landing` برای آن استفاده نمی‌شود. سورس و `.git` از طریق root استاتیک Nginx منتشر نمی‌شوند. هیچ تغییر طراحی یا محتوای رابط ایجاد نشده؛ فقط آدرس canonical اولیهٔ سایت در DB روی دامنهٔ هدف قرار می‌گیرد.

## ۲. فایل‌ها و پیش‌نیازها

| فایل | کاربرد |
| --- | --- |
| `deploy-landing.sh` | اجرای مستقیم روی VPS پس از git clone؛ حالت اتصال از راه دور نیز اختیاری است |
| `infrastructure/landing/ops.py` | اعتبارسنجی، بسته‌بندی بدون اسرار، تنظیم اولیه و بررسی HTTP/TLS |
| `infrastructure/landing/nginx/makanapp.org.http.conf` | میزبان HTTP اولیه با مسیر ACME |
| `infrastructure/landing/nginx/makanapp.org.tls.conf` | میزبان HTTPS و هدایت HTTP پس از صدور گواهی |
| `infrastructure/landing/nginx/locations.conf` | پراکسی API، SSR و کش assetهای دارای نام نسخه‌دار |
| `infrastructure/landing/systemd/*.service` | سه سرویس موجود وب، API و maintenance |
| `infrastructure/landing/renew-nginx.sh` | hook تمدید؛ `nginx -t` و سپس reload |

فایل‌های Nginx قالب‌اند؛ اسکریپت محل علامت `APPLICATION_LOCATIONS` را با تنظیمات مشترک جایگزین می‌کند. آن‌ها را جداگانه و بدون render در `sites-enabled` کپی نکنید. قالب TLS تنها پس از وجود و بررسی گواهی نصب می‌شود.

پیش‌نیاز روش Git روی VPS: Bash، Git و Python 3؛ بسته‌های دیگر را prepare نصب می‌کند. سرور باید به npm، PyPI، GitHub و nodejs.org دسترسی داشته باشد. ابتدا خودتان در ترمینال یا کنسول VPS وارد شوید؛ برای clone مخزن عمومی با HTTPS، کلید GitHub لازم نیست. اسکریپت هیچ رمز SSH یا کلید خصوصی دریافت نمی‌کند.

روی VPS Ubuntu 26 واقعی، systemd و دسترسی root یا sudo غیرتعاملی لازم است. اسکریپت پیش از نصب `/etc/os-release`، منابع، دیسک، پورت‌ها و سرویس‌ها را می‌خواند. در سیستم‌عامل دیگر یا سرویس همنام ناشناخته متوقف می‌شود. نصب بسته‌ها، تغییر SSH، reboot یا ارتقای کامل سیستم‌عامل در محیط محلی انجام نمی‌شود.

## ۳. ورودی‌ها

| ورودی | مقدار لازم |
| --- | --- |
| IPv4 سرور | IP عمومی واقعی VPS؛ هنگام اجرا وارد می‌شود |
| کاربر اجرا | در دستورهای زیر root؛ build و سرویس‌ها به makan واگذار می‌شوند |
| پورت SSH | پورت واقعی؛ هنگام اجرا وارد می‌شود و پیش‌فرض ندارد |
| ایمیل Let's Encrypt | ایمیل معتبر خودتان؛ هنگام اجرا وارد می‌شود |
| دامنه | فقط `makanapp.org` |

IP، ایمیل، رمز، فایل env و کلید خصوصی را در Git قرار ندهید. اسکریپت اطلاعات غیرمحرمانهٔ لازم را از آرگومان می‌گیرد و اسرار داخلی برنامه را فقط روی خود VPS تولید می‌کند.

## ۴. فرمان‌های دقیق اجرا و محل آن‌ها

این فرمان‌ها را **در ترمینال خود VPS با root** اجرا کنید. روی رایانهٔ شخصی اجرا نکنید. `--on-server` علاوه بر انتخاب صریح حالت سرور، تطابق IPv4 دستگاه با IP مقصد را پیش از نصب بررسی می‌کند. اگر VPS پشت NAT باشد و IP عمومی روی کارت شبکه نباشد، بررسی شبکهٔ جدا یا حالت SSH صریح لازم است.

```bash
apt-get update
apt-get install -y --no-install-recommends git python3 ca-certificates
git clone --branch codex/makan-nginx-deploy --single-branch \
  https://github.com/RastinaxAI/MakanApp-Landing.git /root/MakanApp-Landing
cd /root/MakanApp-Landing

bash -n ./deploy-landing.sh
read -r -p 'IPv4 عمومی واقعی VPS: ' MAKAN_SERVER_IP
read -r -p 'پورت واقعی SSH: ' MAKAN_SSH_PORT
read -r -p 'ایمیل معتبر گواهی: ' MAKAN_TLS_EMAIL
TARGET=(--on-server --host "$MAKAN_SERVER_IP" --user root --port "$MAKAN_SSH_PORT")

bash ./deploy-landing.sh all "${TARGET[@]}" --email "$MAKAN_TLS_EMAIL"
```

فرمان all آماده‌سازی، انتشار، HTTPS و verify را به‌ترتیب اجرا می‌کند. برای اجرای مرحله‌ای، به‌جای all:

```bash
bash ./deploy-landing.sh server-check "${TARGET[@]}"
bash ./deploy-landing.sh prepare "${TARGET[@]}"
bash ./deploy-landing.sh deploy "${TARGET[@]}"
```

سپس DNS را در حالت فقط DNS آماده کنید و بعد ادامه دهید:

```bash
bash ./deploy-landing.sh https "${TARGET[@]}" --email "$MAKAN_TLS_EMAIL"
bash ./deploy-landing.sh verify "${TARGET[@]}"
```

اگر all به‌علت تأخیر DNS در https متوقف شد، پس از اصلاح DNS فقط دو دستور آخر را اجرا کنید؛ آماده‌سازی و build از ابتدا لازم نیستند. پس از بستن ترمینال، متغیرهای ورودی و TARGET را دوباره تعریف کنید. اگر پوشهٔ clone از قبل وجود دارد، clone دوباره نکنید؛ ابتدا وضعیت همان checkout را بررسی و طبق بخش انتشار بعد به‌روز کنید.

حالت اختیاری اجرا از رایانهٔ دیگری هم موجود است: `--on-server` را حذف کنید و برای اتصال آماده از agent/کلید پیش‌فرض یا `--identity /absolute/key`، و در صورت نیاز `--known-hosts /absolute/file` یا `--control-path /absolute/socket` استفاده کنید. در این حالت کلید میزبان سخت‌گیرانه بررسی می‌شود و تغییر SSH، فایروال و نصب همچنان فقط در مقصد انجام می‌شود.

`prepare` فقط apt update و نصب بسته‌های لازم انجام می‌دهد. Node `24.21.0`، مطابق پین تصویر موجود پروژه، و uv `0.13.0` با checksum رسمی دانلود می‌شوند؛ Python `3.13.16` با uv نصب می‌شود. `npm ci --include=dev` و `uv sync --frozen --no-dev` lockfileهای فعلی را حفظ می‌کنند. وابستگی‌های build پیش از build حذف نمی‌شوند و هیچ runtime سیستم‌عامل جایگزین نمی‌شود.

اسکریپت فایروال را فعال یا تغییر نمی‌دهد. روی فایروال فعلی VPS/ارائه‌دهنده، پورت SSH واقعی را باز نگه دارید و `80/tcp` و `443/tcp` را مجاز کنید. پورت‌های داخلی 3100، 8000 و 5432 نباید دسترسی عمومی داشته باشند. قبل از افزودن فایروال جدید، پورت SSH را از اتصال و کنسول بررسی کنید.

## ۵. مسیرها، مالکیت و متغیرها

| مسیر روی VPS | محتوا و دسترسی |
| --- | --- |
| `/opt/makan/releases/<id>` | سورس و build هر نسخه؛ build با `makan`، دسترسی 750 |
| `/opt/makan/current` | لینک نسخهٔ فعال؛ تعویض اتمی |
| `/opt/makan/previous` | نسخهٔ سالم قبلی برای rollback |
| `/opt/makan/runtime` | Node و uv مستقل؛ Python مدیریت‌شده زیر همین مسیر |
| `/opt/makan/cache` | کش npm و uv، متعلق به makan |
| `/etc/makan/api.env` | env زمان اجرای API؛ root:makan با 640 |
| `/etc/makan/migrate.env` | env مهاجرت، root با 600 |
| `/etc/makan/secrets.json` | رمزهای مستقل تصادفی DB و کلیدها؛ root با 600 |
| `/etc/makan/nginx-proxy.conf` | کلید داخلی پراکسی موردنیاز همین API؛ root با 600 |
| `/etc/makan/web.env` | `NODE_ENV`، `API_INTERNAL_URL` و تنظیم telemetry |
| `/var/lib/makan/media` | فایل‌های رسانه‌ای، قابل نوشتن فقط برای سرویس برنامه |
| `/var/lib/makan/operations` | وضعیت worker نگهداری موجود |
| `/var/lib/letsencrypt` | webroot عمومی فقط برای چالش ACME |
| `/var/backups/makan` | snapshot DB/media و پشتیبان تنظیمات؛ root با 700 |

متغیر build محرمانه لازم نیست. `API_INTERNAL_URL=http://127.0.0.1:9` هنگام build استفاده می‌شود، مطابق الگوی Dockerfile موجود؛ این پروژه محتوای صفحات عمومی را در زمان درخواست می‌خواند. در runtime مقدار آن `http://127.0.0.1:8000` است. `NEXT_STANDALONE=false` مسیر production معمول Next را حفظ می‌کند.

API به `DATABASE_URL`، `AUTH_SECRET`، `AUTH_MFA_KEY`، `PROXY_SHARED_SECRET` و `AUTH_ALLOWED_ORIGINS` وابسته است. اسکریپت مقدارهای مستقل و تصادفی را روی VPS تولید و اجرای مجدد آن‌ها را حفظ می‌کند. `APP_ENV=production`، OTP آزمایشی و ورود قدیمی غیرفعال، origin مجاز فقط HTTPS دامنهٔ اصلی و `MEDIA_ROOT` خارج از سورس است. هیچ secret در متغیر `NEXT_PUBLIC_*` قرار نمی‌گیرد.

`SEO_INDEXING_ENABLED=false` و `ANALYTICS_ENABLED=false` مطابق تنظیم تولید فعلی حفظ می‌شوند؛ روشن‌کردن آن‌ها تصمیم محتوایی مستقلی است. اکانت مدیر، پیامک و زیردامنهٔ مدیریت ساخته نمی‌شود؛ مسیرهای موجود برنامه حذف یا بازطراحی نشده‌اند.

## ۶. مراحل پنل پارس‌پک

این بخش راهنمای اقدام مالک حساب است؛ اجرای تغییرات پنل مشاهده نشده است.

### اتصال و DNS

در **CDN ← سرویس‌های CDN من ← مدیریت CDN دامنه ← DNS**، فقط رکورد اصلی را ایجاد یا اصلاح کنید. Nameserverها را دقیقاً از صفحهٔ اتصال همین دامنه در حساب خود بردارید. قبل از تغییر NS، رکوردهای موجود به‌ویژه MX و TXT را حفظ و DNSSEC/DS را هماهنگ کنید. Nameserver فرضی در این راهنما وجود ندارد.

| فیلد | مقدار |
| --- | --- |
| دامنه | `makanapp.org` |
| نوع DNS | `A` |
| نام هاست | `@` یا خالی، مطابق فرم |
| آدرس IP | IP واقعی واردشده در `MAKAN_SERVER_IP` |
| وضعیت پروکسی در آغاز | `فقط DNS` |

رکورد تکراری نسازید. AAAA موجود را هم بررسی کنید؛ تا بررسی مقصد IPv6 آن را خودکار حذف یا تغییر ندهید. اگر CAA محدودکننده وجود دارد باید صدور Let's Encrypt را مجاز کند. هیچ رکوردی برای زیردامنه‌ها اضافه نکنید.

منابع رسمی: [اتصال دامنه](https://docs.parspack.com/cdn/connect-domain-to-cdn/)، [DNS](https://docs.parspack.com/cdn/change-domain-dns/).

### پس از سلامت origin و گواهی آن

ابتدا فرمان `https` و سپس `verify` در حالت فقط DNS موفق شوند. در **SSL ← تنظیمات گواهی SSL ← گواهی رایگان ← نصب گواهی** گواهی CDN دامنهٔ اصلی را فعال و وضعیت `Verified` را بررسی کنید. این گواهی سمت CDN از گواهی origin مستقل است. [مستند SSL](https://docs.parspack.com/cdn/security/)

در **تنظیمات دیگر ← شبکه**، ارتباط **CDN با سرور** را روی `HTTPS` قرار دهید؛ گزینهٔ بازنویسی HTTP به HTTPS مربوط به مسیر مرورگر تا CDN است. مقصد origin برابر IP واقعی VPS روی پورت `443` و Host/SNI موردنیاز `makanapp.org` است. پس از آماده‌شدن هر دو مسیر TLS، وضعیت پروکسی رکورد اصلی را روشن کنید. [مستند شبکه](https://docs.parspack.com/cdn/other-settings/)

مستند بررسی‌شده روش و نام فیلد اعتبارسنجی زنجیره، انقضا و تطابق نام گواهی origin را روشن نمی‌کند. در پنل واقعی یا از پشتیبانی تأیید کنید که HTTPS به origin با SNI همین دامنه و اعتبارسنجی گواهی برقرار است. تا تأیید این موضوع، موفقیت HTTPS مرورگر به‌تنهایی اثبات امنیت اتصال CDN به origin نیست؛ گزینه‌ای با نام متعلق به سرویس‌های دیگر حدس زده نمی‌شود.

پارس‌پک ممکن است بعد از روشن‌شدن پراکسی IP دیگری در پاسخ DNS برگرداند؛ این اختلاف به‌تنهایی خطا نیست. origin مستقل با IP مستقیم و Host/SNI صحیح آزمایش می‌شود؛ مسیر عمومی با DNS معمول آزمایش می‌شود.

### کش و مسیر تمدید

ابتدا **تنظیمات Caching ← غیرفعال** یا **حالت SOS ← حالت توسعه‌دهنده** را انتخاب کنید. پس از تأیید، فقط assetهای عمومی را متناسب با هدر origin کش کنید. مسیر `/_next/static/` دارای نام/مسیر نسخه‌دار است و کش طولانی می‌گیرد؛ HTML، RSC، صفحات مدیریت و API در این تنظیمات `no-store` دارند. تنظیم «همیشه» برای کل سایت مناسب این برنامه نیست. [مستند کش](https://docs.parspack.com/cdn/caching-settings/)

مسیر `/.well-known/acme-challenge/*` باید بدون کش، ورود، کپچا و چالش ربات به origin برسد. از قابلیت واقعی قواعد مسیر در پنل استفاده کنید؛ نام دقیق گزینهٔ استثنا بدون مشاهدهٔ حساب تأیید نشده است. موفقیت تمدید آزمایشی پس از فعال‌سازی CDN لازم است. IP واقعی کاربران نیز تنها پس از تأیید هدر و بازه‌های رسمی CDN قابل اعتمادسازی است؛ اکنون هدر ورودی کاربر قابل جعل تلقی می‌شود و API فقط IP اتصال Nginx را می‌پذیرد.

```bash
# روی همان VPS و داخل checkout، پس از فعال‌کردن CDN
bash ./deploy-landing.sh verify "${TARGET[@]}"
bash ./deploy-landing.sh renew-test "${TARGET[@]}"
```

## ۷. HTTPS، تمدید و عیب‌یابی HTTP-01

Certbot از apt همان Ubuntu نصب می‌شود. نصب موجود غیر apt خودکار مخلوط یا جایگزین نمی‌شود. روش صدور `certonly --webroot`، webroot برابر `/var/lib/letsencrypt`، ایمیل واقعی و فقط دامنهٔ اصلی است. `--keep-until-expiring` گواهی معتبر را حفظ می‌کند. قبل از نصب TLS، وجود فایل، نام و اعتبار آن بررسی می‌شود. اسکریپت پیش از reload همیشه `nginx -t` اجرا می‌کند.

`certbot.timer` فعال می‌شود و hook تمدید فقط پس از موفقیت آزمون Nginx reload می‌کند. `https` یک بار و `renew-test` پس از CDN، `certbot renew --cert-name makanapp.org --dry-run --run-deploy-hooks` را اجرا می‌کنند؛ شکست آن موفقیت گزارش نمی‌شود. [راهنمای رسمی Certbot](https://eff-certbot.readthedocs.io/en/stable/using.html)

اگر HTTP-01 شکست خورد، ابتدا A/AAAA/CAA، بازبودن بیرونی پورت 80، فایروال ارائه‌دهنده و پاسخ واقعی مسیر ACME بررسی شوند. درخواست عمومی probe در اسکریپت کمک تشخیصی است و موفقیت آن جای موفقیت مرجع صدور گواهی را نمی‌گیرد. شکست DNS یا دسترسی باعث build دوباره نمی‌شود؛ پس از رفع، فقط `https` اجرا کنید.

API رسمی DNS یا افزونهٔ Certbot مخصوص پارس‌پک در منابع بررسی‌شده تأیید نشده است. اگر HTTP-01 واقعاً ناممکن باشد، راه قابل تمدید پیشنهادی واگذاری فقط zone چالش `_acme-challenge.makanapp.org` با NS به یک DNS تحت کنترل دارای RFC 2136 و استفاده از افزونهٔ رسمی `certbot-dns-rfc2136` است. این کار به DNS واقعی مقصد، مجوز مالک، کلید TSIG محدود به TXT چالش و فایل credentials با 600 نیاز دارد؛ یک اقدام اولیهٔ دستی برای delegation لازم است. این مسیر اکنون ایجاد یا جایگزین HTTP-01 نشده است؛ روش manual بدون hook خودکار، تمدید خودکار محسوب نمی‌شود. [مستند افزونه](https://certbot-dns-rfc2136.readthedocs.io/en/stable/)

## ۸. انتشار نسخهٔ بعد و بازگشت

روی همان VPS، داخل checkout و با همان TARGET:

```bash
git status --short
git pull --ff-only origin codex/makan-nginx-deploy
bash ./deploy-landing.sh deploy "${TARGET[@]}"
bash ./deploy-landing.sh verify "${TARGET[@]}"
```

هر نسخه در مسیر تازه ساخته می‌شود؛ شکست نصب/build به نسخهٔ فعال دست نمی‌زند. پیش از فعال‌سازی، DB با `pg_dump -Fc` و رسانه‌ها snapshot می‌شوند. انتشار نخست migrationها و واردکردن محتوای تألیف‌شدهٔ موجود مخزن را اجرا می‌کند؛ انتشارهای بعد محتوای ویرایش‌شده را بازنویسی نمی‌کنند. تعویض نسخه و restart وقفهٔ کوتاه دارد؛ این استقرار ادعای بدون قطعی بودن ندارد. HTTPS موجود در انتشار بعدی حفظ می‌شود.

برای rollback نرم‌افزار:

```bash
bash ./deploy-landing.sh rollback "${TARGET[@]}"
bash ./deploy-landing.sh verify "${TARGET[@]}"
```

نسخه‌های current و previous جابه‌جا و سلامت بررسی می‌شود. اگر نسخهٔ قبلی سالم نباشد، اشاره‌گر به نسخهٔ اولیه برمی‌گردد. دادهٔ کاربران و TLS بازنویسی نمی‌شوند. schema واقعی DB باید با نسخهٔ قبلی سازگار باشد. اگر head مهاجرت در نسخهٔ جدید عوض شده باشد، انتشار عادی **پیش از migration متوقف می‌شود**؛ برای ارتقای schema، برنامهٔ migration و بازیابی داده جدا لازم است. این محدودیت مانع rollback ناامن دیتابیس می‌شود.

پشتیبان تنظیماتی که ابزار خودش تغییر می‌دهد در `/var/backups/makan/config-<id>` است. پس از بازیابی دستی فایل تنظیم، `systemctl daemon-reload` برای unit و `nginx -t` پیش از reload لازم است. snapshot داده در `data-<release-id>/database.dump` و `media.tar.gz` نگهداری می‌شود؛ بازیابی داده عملیات جداگانه در توقف سرویس‌ها است و اسکریپت آن را خودکار روی دادهٔ جدید اجرا نمی‌کند. حذف خودکار نسخه‌ها یا snapshotها وجود ندارد؛ فضای دیسک را پایش و نسخه‌های لازم را به محل پشتیبان خود منتقل کنید.

## ۹. لاگ‌ها و فرمان‌های بررسی روی خود VPS

این فرمان‌ها **پس از ورود به VPS** اجرا می‌شوند. اگر با root هستید، پیشوند sudo را حذف کنید:

```bash
cat /etc/os-release
sudo nginx -t
sudo systemctl status nginx makan-api makan-web makan-maintenance --no-pager
sudo journalctl -u makan-web -u makan-api -u makan-maintenance -n 100 --no-pager
sudo tail -n 80 /var/log/nginx/makan-error.log
sudo ss -lntp
sudo systemctl list-timers certbot.timer
sudo certbot certificates
sudo certbot renew --cert-name makanapp.org --dry-run --run-deploy-hooks
curl -fsS -H 'Host: makanapp.org' http://127.0.0.1:3100/health/ready
curl -I --resolve makanapp.org:443:127.0.0.1 https://makanapp.org/
```

لاگ build هر نسخه در `/opt/makan/releases/<id>/build.log` با دسترسی محدود است. لاگ Certbot در `/var/log/letsencrypt/letsencrypt.log` و access log دامنه در `/var/log/nginx/makan-access.log` است. پیش از اشتراک‌گذاری لاگ‌ها آن‌ها را از نظر دادهٔ شخصی بازبینی کنید؛ فایل‌های env، کلید خصوصی و خروجی `nginx -T` را در چت کپی نکنید، چون پیکربندی شامل کلید داخلی پراکسی است.

## ۱۰. بررسی‌های انجام‌شده و باقی‌مانده

انجام‌شده در محیط محلی: بررسی README، lockfileها، تنظیم Next، کد SSR/API، نصب وابستگی‌ها با npm ci بدون تغییر lockfile، build production موفق همراه TypeScript، `bash -n`، ShellCheck و آزمون‌های ایمنی بسته‌بندی/ورودی/جلوگیری از اجرای محلی سرور. فایل‌های سرویس و Nginx واقعی ساخته شدند.

فرمان verify برای origin و دامنهٔ عمومی، نام و محتوای ماکان، JS/CSS و تصاویر brand ارجاع‌شده در HTML، مسیرهای اصلی، readiness، 404 صفحه و asset و هدایت HTTP را بررسی می‌کند. اعتبار TLS مستقیم origin با Host/SNI دامنه و بررسی استاندارد زنجیره انجام می‌شود. اجرای مرورگر و آزمون فرم ارسال‌کنندهٔ داده جزو این بررسی خودکار نیست.

باقی‌مانده: اجرای دستور Git و اسکریپت روی خود VPS توسط دارندهٔ دسترسی، خواندن مشخصات واقعی VPS، prepare/deploy/https، تنظیم واقعی DNS/CDN در حساب پارس‌پک و بررسی بیرونی و تمدید پس از CDN. موفقیت build یا آزمون قالب تنظیمات معادل آنلاین‌شدن نیست.
