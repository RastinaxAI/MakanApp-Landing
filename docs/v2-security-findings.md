# یافته‌های امنیتی V2

اسکن واقعی چهار image نهایی با Trivy 0.75.0 موفق شد؛ هیچ Critical ثبت نشد. یافتهٔ High سیستم‌عامل همچنان وجود دارد و ادعای صفر آسیب‌پذیری نمی‌شود. فایل‌های کامل، ID imageها و خلاصه در `docs/qa/v2-step6` هستند.

| Image | Critical | High؛ جفت package/CVE |
|---|---:|---:|
| `makan-landing-api:0.10.0` | 0 | 44 |
| `makan-landing-web:0.10.0` | 0 | 43 |
| `makan-landing-caddy:2.11.7` | 0 | 0 |
| `makan-landing-postgres:17.11` | 0 | 0 |

API و وب در مجموع به هشت CVE متمایز Debian trixie مربوط‌اند؛ چند بسته از یک source package باعث تکرار همان CVE شده‌اند. برای همهٔ یافته‌ها FixedVersion در اسکن trixie خالی است. وضعیت هر هشت مورد در ردیاب رسمی Debian در ۱۴ اکتبر ۲۰۲۶ بررسی شد: اصلاح در unstable/forky وجود دارد، اما بستهٔ پایدار trixie هنوز آسیب‌پذیر و با وضعیت no-dsa یا postponed/Minor issue ثبت شده است. این طبقه‌بندی تضمین بی‌خطر بودن برنامه نیست.

- [CVE-2025-69720](https://security-tracker.debian.org/tracker/CVE-2025-69720)
- [CVE-2026-16742](https://security-tracker.debian.org/tracker/CVE-2026-16742)
- [CVE-2026-54369](https://security-tracker.debian.org/tracker/CVE-2026-54369)
- [CVE-2026-76642](https://security-tracker.debian.org/tracker/CVE-2026-76642)
- [CVE-2026-78408](https://security-tracker.debian.org/tracker/CVE-2026-78408)
- [CVE-2026-78409](https://security-tracker.debian.org/tracker/CVE-2026-78409)
- [CVE-2026-78410](https://security-tracker.debian.org/tracker/CVE-2026-78410)
- [CVE-2026-9538](https://security-tracker.debian.org/tracker/CVE-2026-9538)

اجرای non-root، root filesystem فقط‌خواندنی، حذف تمام capabilityها، no-new-privileges و نبود پورت عمومی PostgreSQL در تست واقعی استقرار بررسی شدند. این کنترل‌ها جایگزین وصله نیستند. تغییر ABI با نصب بستهٔ unstable در image پایدار، نیازمند آزمون سازگاری مستقل است؛ مسیر معمول، دریافت وصلهٔ trixie، rebuild و تکرار اسکن/تست است. پیش از انتشار عمومی، اسکن تازه و بررسی ریسک همین یافته‌ها لازم است.

اسکن dependencyهای اجرایی npm و Python صفر یافته داشت. ابزارهای توسعهٔ npm، advisory مربوط به braces را دارند؛ در [گزارش کیفیت](v2-integration-quality.md) با مرجع اولیه ثبت شده است. CI فعلی برای imageها آستانهٔ صفر Critical را enforce می‌کند؛ Highها در گزارش کامل محلی باقی‌اند و موفقیت این آستانه به معنی صفر High نیست. هیچ ignore جدیدی برای این هشت CVE اضافه نشده است.
