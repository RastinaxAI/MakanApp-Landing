# پشتیبان‌گیری و بازیابی

آرشیو شامل dump سفارشی PostgreSQL، فایل‌های رسانه WEBP و manifest اندازه/SHA256 است؛ config/secrets خام در آرشیو نیستند. آرشیو AES-256-GCM با nonce تصادفی و header احرازشده رمز می‌شود. نام namespace مالک در فایل قرار می‌گیرد. بازبینی احراز رمز، hash و ساختار آرشیو قبل از موفقیت backup انجام می‌شود.

```bash
apps/api/.venv/bin/python scripts/production.py --env-file /etc/makan-landing/production.env backup --output /var/backups/makan-landing
apps/api/.venv/bin/python scripts/production.py --env-file /etc/makan-landing/production.env status --backup-directory /var/backups/makan-landing
```

نویسنده‌های API/web/maintenance برای snapshot سازگار متوقف و حتی در شکست دوباره راه‌اندازی می‌شوند. فضای موقت تا پایان عملیات plaintext دارد؛ دیسک میزبان باید رمزگذاری‌شده و مسیر فقط برای اپراتور قابل خواندن باشد. فایل رمز‌شده را به مقصد مستقل خارج از سرور منتقل و بازیابی دوره‌ای آزمایش کنید. کلید backup را جدا و آفلاین حفظ کنید؛ گم‌شدن آن بازیابی را ناممکن می‌کند. کلیدهای AUTH/MFA منبع برای داده بازیابی‌شده لازم‌اند؛ backup تنها fingerprint آن‌ها را نگه می‌دارد. رمز DB و کلید edge مقصد می‌توانند مستقل باشند.

پیشنهاد نگهداری عملیاتی هفت روز است و هنوز تصویب مالک را ندارد. تنها پس از backup جدید تأییدشده فایل‌های قدیمی با prefix **همان namespace** پاک می‌شوند؛ فایل آخر و فایل‌های دیگر پروژه‌ها دست‌نخورده‌اند. این پیشنهاد با مدت نگهداری ۱۸۰روز PII درخواست‌ها متفاوت است. restore قبل از بازگشایی سرویس PII اکنون منقضی را purge و تمام نشست/challengeهای بازیابی‌شده را لغو می‌کند.

## بازیابی امن در مقصد تازه

env مقصد را با نام `makan-landing-restore-...` یا namespace Production تازه بسازید، AUTH/MFA/backup keys منبع را امن منتقل و رمزهای مستقل DB/edge تعیین کنید. دامنه/port مقصد نباید با سرویس موجود تعارض داشته باشد.

```bash
apps/api/.venv/bin/python scripts/production.py --env-file /etc/makan-landing/restore.env restore --input /var/backups/makan-landing/ARCHIVE.makanbackup
apps/api/.venv/bin/python scripts/production.py --env-file /etc/makan-landing/restore.env status
```

هر container یا volume موجود در namespace مقصد موجب رد عملیات پیش از mutation می‌شود. کلید اشتباه، ciphertext تغییرکرده، traversal، symlink، duplicate و آرشیو بزرگ رد می‌شوند. `pg_restore --clean` فقط پس از گارد namespace خالی اجرا می‌شود؛ روی Production موجود اجرا نمی‌شود. Migration افزایشی و prepare_restore پیش از بالا آمدن وب اجرا می‌شوند. تطبیق تعداد رکورد، یادداشت CRM، رسانه/hash و ابطال cookie قدیمی لازم است؛ سپس مدیر با رمز واقعی دوباره وارد می‌شود.

حداکثر حجم استخراج پیش‌فرض۱۰۰GiB است و با `--max-bytes` محدود می‌شود. restore شکست‌خورده را برای بررسی نگه دارید؛ حذف آن فقط پس از بررسی namespace و تأیید عدم نیاز به داده انجام شود. فایل lock شامل PID/زمان است؛ در crash ابتدا نبود اپراتور فعال را احراز کرده، سپس فقط lock همان namespace را بردارید. RPO/RTO تعهد نشده‌اند؛ یک backup روزانه سقف اسمی نزدیک۲۴ساعت دارد و باید با حجم واقعی، انتقال offsite و مانور سرور نهایی اندازه‌گیری شود. داده کوچک تست معیار ظرفیت Production نیست.
