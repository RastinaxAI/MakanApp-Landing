# ماتریس استفادهٔ مجدد و تحویل V2

مبنای وضعیت اولیه: `v2-step0-audit.md`. وضعیت فعلی از کد، PostgreSQL و تست‌های ثبت‌شده به دست آمده است؛ نیاز به فعال‌سازی سرویس بیرونی با قابلیت پیاده‌شده اشتباه گرفته نمی‌شود.

| قابلیت | وضعیت اولیه | وضعیت فعلی / استفادهٔ مجدد | شاهد |
|---|---|---|---|
| احراز هویت، OTP، MFA، مجوز و Audit | Existing & Working | همان حساب‌ها و سرویس؛ Authentication تازه ساخته نشد | ۲۳۹ تست API و ۴ تست OTP |
| Page/Revision و انتشار/زمان‌بندی | Existing & Working | همان مدل، API و تاریخچه | تست‌های CMS و Builder |
| رسانه، آموزش متنی، آپارات، مجموعه | Existing & Working | همان ماژول‌ها، ذخیره و URLها | تست‌های learning/CMS |
| فرم دمو/مشاوره، تکرار، رضایت و ضداسپم | Existing & Working | همان دریافت‌کننده؛ اتصال اتمیک به CRM | تست API/forms/CRM |
| طراحی اختصاصی فارسی و برند | Existing but Incomplete | روایت جدید، رنگ و لوگوی قبلی، نقش‌ها و CTAها | ۱۹ مسیر، سه مرورگر و تصاویر |
| Canvas و ویرایش روی صفحه | Missing | Puck روی همان CMS؛ Heading و Rich Text | سناریوی Builder |
| Drag & Drop، nesting و resize | Missing | کانتینر/شبکه و تغییر عرض با اشاره‌گر/صفحه‌کلید | سه مرورگر |
| کتابخانهٔ عناصر | Missing | ۲۷ نوع ثبت‌شده؛ فهرست‌های واقعی امکانات/مخاطبان/مقالات | widgets + axe |
| تنظیم چیدمان و Style | Existing but Incomplete | Flex/Grid، فاصله، اندازه، تایپوگرافی، رنگ، زمینه، Border، Shadow و حالت‌های تعامل | Schema و CSS مرورگر |
| ویرایش واکنش‌گرا | Missing | پایه/تبلت/موبایل با وراثت و پیش‌نمایش | advanced + Builder |
| Undo/Redo، Copy/Paste، Duplicate و Layers | Missing | ابزارهای واقعی editor و درخت سند | advanced/theme |
| قالب، بخش قابل استفادهٔ مجدد و رنگ/فونت جهانی | Missing | همان Page/Revision و SiteSetting | API و advanced |
| Header/Footer Builder | Missing | اتصال بخش منتشرشده با حفاظت Draft | سه مرورگر و API |
| Autosave، Draft/Preview/Publish/Rollback | Existing but Incomplete | ذخیرهٔ واقعی و تاریخچهٔ موجود؛ Restore به Draft | refresh/publish/restore |
| لید حرفه‌ای، ارزیابی، برچسب و تبدیل | Existing but Incomplete | همان Lead؛ Profile و فرصت فروش مرتبط | API و CRM browser |
| مدرسه و چند مخاطب | Missing | School/Contact واقعی؛ بدون حدس مدیر بودن فرد | API و Customer 360 |
| Pipeline/Kanban و تاریخچه | Missing | ۹ مرحله، Drag & Drop، مسئول/ارزش/تاریخ/دلیل باخت | سه مرورگر و API |
| تماس، جلسه، کار، یادداشت و پیگیری | Missing | Activity، مسئول، موعد و Timeline | API و CRM browser |
| برنامه‌ریزی و نتیجهٔ دمو | Missing | جلوگیری از تداخل، نتیجه و اقدام بعدی | API و CRM browser |
| Customer 360 | Missing | اطلاعات یکپارچه و درخواست‌های صفحه‌بندی‌شده | API و refresh |
| اعلان و یادآوری داخلی | Missing | اعلان پایدار، تخصیص و worker بدون تکرار | automations API/worker |
| داشبورد، فیلتر و نمای شخصی | Existing but Incomplete | گزارش PostgreSQL، cohort و saved views خصوصی | API و CRM browser |
| حفاظت داده و Migration | Existing but Incomplete | ۰۰۰۹ غیرمخرب، Backfill و بازیابی پشتیبان اصلی | local-upgrade.json |
| SEO و رضایت آنالیتیکس | Existing & Working | حفظ و تطبیق Renderer جدید | ۴ تست SEO؛ دامنهٔ اصلی هنوز تعیین نشده |
| مالی/پرداخت/قرارداد/اشتراک/تمدید | Missing | عمداً خارج از فاز؛ outcome/count قدیمی حفظ شد | برنامهٔ Integration در v2-demo-crm.md |

قالب‌ها و بخش‌ها snapshot مستقل‌اند؛ ویرایش قالب، نمونه‌های قبلاً درج‌شده را خودکار عوض نمی‌کند. حالت‌های کنترل‌شدهٔ Style ارائه شده‌اند، نه اجرای CSS/JavaScript دلخواه. این نسخه ادعای برابری با تمام جزئیات و افزونه‌های Elementor ندارد.

فعال‌سازی بیرونی باقی‌مانده: دامنه/سرور و HTTPS عمومی، مشخصات ملی‌پیامک برای ارسال واقعی OTP، Provider و الگو/رضایت برای پیام‌های CRM و تصاویر واقعی محصول. اعلان داخلی و اجرای Docker محلی فعال‌اند. Backend اصلی MakanApp تغییر نکرده است.
