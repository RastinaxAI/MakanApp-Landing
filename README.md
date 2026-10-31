# استقرار لندینگ ماکان روی Ubuntu

این مخزن یک برنامهٔ Next.js با API و PostgreSQL است. فایل `index.html` با عنوان `MakanApp - Landing` فقط صفحهٔ آزمایشی نصب قبلی است. برای نمایش سایت واقعی، اسکریپت جدید برنامه را با Docker اجرا می‌کند و Nginx درخواست‌ها را به آن می‌فرستد.

## ۱. تنظیمات DNS

| نوع | نام | مقدار |
| --- | --- | --- |
| A | `@` | `89.46.217.168` |
| A | `www` | `89.46.217.168` |

پیش از اجرا، هر دو نام باید به IP بالا اشاره کنند و پورت‌های ۸۰ و ۴۴۳ از اینترنت در دسترس باشند. رکورد AAAA ناسازگار را اصلاح کنید. برای صدور گواهی، پراکسی DNS را موقتاً روی DNS only قرار دهید.

## ۲. محل فایل‌ها و اجرای اسکریپت

کل سورس فعلی پروژه در مسیر زیر می‌ماند:

```text
/var/www/makanapp/landing
```

باید فایل‌های `package.json`، `compose.production.yaml`، `.env.production.example` و پوشه‌های `apps` و `infrastructure` در این مسیر موجود باشند. این نسخه نیاز به کپی‌کردن `dist` یا `build` ندارد؛ خروجی Next.js داخل image ساخته می‌شود.

فایل **جدید و کامل** `setup.sh` را جایگزین نسخهٔ قبلی روی سرور کنید. برای واردکردن متن از ترمینال:

```bash
cat > /root/setup.sh
```

محتوای کامل اسکریپت جدید را بچسبانید، Enter بزنید و سپس با `Ctrl+D` ذخیره کنید. فایل یک‌بایتی قبلی کافی نیست. سپس:

```bash
chmod +x /root/setup.sh
sudo bash /root/setup.sh
```

اگر فایل جدید را در پوشهٔ پروژه بارگذاری کرده‌اید، همین دستورها را اجرا کنید:

```bash
cd /var/www/makanapp/landing
chmod +x setup.sh
sudo bash ./setup.sh
```

در ابتدای اجرا باید پیام `MakanApp: Next.js + Docker deployment v2` را ببینید. اگر این پیام ظاهر نشد و فقط خروجی apt، Nginx و Certbot دیده شد، فایل قدیمی اجرا شده است. تغییر فایل در کامپیوتر شما، نسخهٔ روی سرور را خودکار تغییر نمی‌دهد؛ فایل جدید را در مسیر دقیق `/var/www/makanapp/landing/setup.sh` جایگزین کنید. دستور رفتن به پوشه `cd` است، نه `git cd`.

اسکریپت بسته‌های لازم و Docker Compose را نصب می‌کند؛ برای نصب خودکار Compose، بستهٔ `docker-compose-v2` باید در مخازن Ubuntu موجود باشد. سپس imageهای وب، API و دیتابیس را می‌سازد، migrationها را اجرا می‌کند و محتوای اولیهٔ نوشته‌شدهٔ همین لندینگ را وارد می‌کند. واردکننده، محتوای موجود و ویرایش‌های قبلی را حفظ می‌کند.

پس از آماده‌شدن برنامه، تنظیمات Nginx با reverse proxy جایگزین می‌شود. Nginx و Certbot مسئول پورت‌های عمومی ۸۰ و ۴۴۳ هستند؛ Caddy این Compose اجرا نمی‌شود. وب روی `127.0.0.1:3000` و API روی `127.0.0.1:8000` منتشر می‌شوند. دیتابیس پورت عمومی ندارد. روش reverse proxy و اتصال پورت‌ها به loopback در [مستندات Nginx](https://nginx.org/en/docs/http/ngx_http_proxy_module.html) و [Docker](https://docs.docker.com/engine/network/port-publishing/) شرح داده شده است.

فایل‌های سورس، `.git` و فایل صفحهٔ آزمایشی از طریق تنظیمات جدید Nginx به‌عنوان فایل استاتیک سرو نمی‌شوند. اجرای مجدد اسکریپت نصب استاتیک قبلی، تنظیمات را به صفحهٔ آزمایشی برمی‌گرداند؛ از نسخهٔ جدید استفاده کنید.

## ۳. تنظیمات و داده‌های ماندگار

| مسیر | کاربرد |
| --- | --- |
| `/var/www/makanapp/landing` | سورس پروژه و فایل‌های ساخت |
| `/etc/makanapp/production.env` | رمزها و کلیدهای ماندگار با دسترسی ۶۰۰ |
| `/etc/makanapp/compose.nginx.json` | تنظیمات اجرایی Compose؛ حاوی رمزها و فقط قابل خواندن توسط ریشه |
| `/etc/nginx/sites-available/makanapp.conf` | اتصال دامنه به برنامه و تنظیمات HTTPS |
| `/etc/makanapp/nginx-backup-*` | نسخهٔ تنظیمات Nginx پیش از تغییر |

رمزها در اولین نصب تولید می‌شوند و در اجراهای بعدی تغییر نمی‌کنند. اگر قبلاً دیتابیس production ساخته‌اید، از همان فایل محیط قبلی استفاده کنید؛ نمونه:

```bash
sudo env ENV_FILE=/etc/makan-landing/production.env bash /root/setup.sh
```

بدون فایل محیط اصلی، برای دیتابیس موجود رمز تازه تولید نکنید. داده‌ها در volumeهای Docker می‌مانند؛ از دستور `docker compose down -v` استفاده نکنید.

## ۴. بررسی نتیجه و به‌روزرسانی

پس از پیام موفقیت، `https://makanapp.org` باید خود لندینگ را نمایش دهد. دامنهٔ `www.makanapp.org` به دامنهٔ اصلی هدایت می‌شود. اسکریپت پاسخ صفحهٔ اصلی را پیش از تغییر Nginx و پس از فعال‌شدن HTTPS بررسی می‌کند. دریافت گواهی با ایمیل `rastinaxoffice@gmail.com` انجام می‌شود.

وضعیت سرویس‌ها و لاگ‌ها:

```bash
sudo docker compose -f /etc/makanapp/compose.nginx.json ps
sudo docker compose -f /etc/makanapp/compose.nginx.json logs --tail 100 web api
```

برای انتشار نسخهٔ بعدی، سورس را در همان مسیر به‌روز کنید و اسکریپت جدید را دوباره اجرا کنید. از اجرای هم‌زمان نسخهٔ Caddy در `compose.production.yaml` روی پورت‌های ۸۰ و ۴۴۳ خودداری کنید.
