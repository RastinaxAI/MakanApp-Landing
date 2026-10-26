import Link from "next/link";
import {
  AdminPageHeader,
  AdminPanel,
  AdminEmpty,
} from "@/features/admin/page-kit";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/admin-api";
import { cmsGet } from "@/features/cms/admin-data";
type Metrics = {
  days: number;
  sessions: number;
  organic_sessions: number;
  events: Record<string, number>;
  demo_conversion_rate: number | null;
  form_success_rate: number | null;
  form_error_rate: number | null;
  vitals: Record<
    string,
    { count: number; p75: number | null; enough_samples: boolean }
  >;
};
export default async function Page() {
  const admin = await requireAdmin();
  if (!admin.capabilities.includes("leads"))
    return (
      <div className="admin-page">
        <AdminPageHeader
          title="اجازه مشاهده آمار را ندارید."
          eyebrow="دسترسی حساب"
          description="گزارش‌های بازدید و سرعت فقط برای نقش‌های مجاز نمایش داده می‌شوند."
        />
      </div>
    );
  const m = await cmsGet<Metrics>("analytics/metrics?days=30");
  const percent = (n: number | null) =>
    n === null
      ? "داده کافی نیست"
      : `${(100 * n).toLocaleString("fa-IR", { maximumFractionDigits: 1 })}٪`;
  return (
    <div className="admin-page">
      <AdminPageHeader
        title="اندازه‌گیری استفاده و سرعت"
        eyebrow="گزارش وب‌سایت"
        description="بازدیدهای دارای رضایت، نتیجهٔ فرم‌ها و تجربهٔ واقعی کاربران را در بازهٔ ۳۰ روزه بررسی کنید."
        actions={
          <Button asChild variant="outline">
            <Link href="/admin/crm">گزارش فروش</Link>
          </Button>
        }
      />
      <div className="admin-help">
        فقط نشست‌های دارای رضایت اختیاری در این گزارش قرار می‌گیرند. نبود داده
        به معنی اندازه‌گیری‌نشدن است؛ نرخ‌ها بدون نمونهٔ کافی محاسبه نمی‌شوند.
      </div>
      <section aria-label="خلاصهٔ بازدید و فرم‌ها">
        <h2 className="admin-section-title">عملکرد وب‌سایت</h2>
        <dl className="grid gap-4 tablet:grid-cols-2 min-[1200px]:grid-cols-3">
          {Object.entries({
            نشست‌ها: m.sessions.toLocaleString("fa-IR"),
            "نشست ارگانیک": m.organic_sessions.toLocaleString("fa-IR"),
            "تبدیل نشست به موفقیت فرم دمو": percent(m.demo_conversion_rate),
            "نرخ نتیجه موفق تلاش فرم": percent(m.form_success_rate),
            "نرخ نتیجه خطای تلاش فرم": percent(m.form_error_rate),
          }).map(([label, value]) => (
            <div className="admin-stat" key={label}>
              <dt>{label}</dt>
              <dd className="break-words">{value}</dd>
            </div>
          ))}
        </dl>
      </section>
      <AdminPanel
        title="رویدادها"
        description="تعامل‌های ثبت‌شدهٔ کاربران در بازهٔ انتخاب‌شده"
      >
        {Object.keys(m.events).length ? (
          <ul className="admin-record-list">
            {Object.entries(m.events).map(([name, count]) => (
              <li className="admin-record text-sm" key={name}>
                <bdi className="break-all">{name}</bdi>
                <span className="admin-pill bg-secondary text-primary-hover">
                  {count.toLocaleString("fa-IR")}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <AdminEmpty
            title="هنوز رویدادی ثبت نشده است."
            description="پس از دریافت رضایت و ثبت تعامل کاربران، داده‌های واقعی در این فهرست نمایش داده می‌شوند."
          />
        )}
      </AdminPanel>
      <AdminPanel
        title="Core Web Vitals میدانی"
        description="سرعت و پایداری صفحه بر اساس نمونه‌های کاربران"
      >
        <ul className="admin-record-list">
          {Object.entries(m.vitals).map(([name, value]) => (
            <li key={name} className="admin-record">
              <div>
                <h3 className="text-sm font-semibold">
                  <bdi>{name}</bdi>
                </h3>
                <p className="mt-2 text-xs text-muted-foreground">
                  {value.count.toLocaleString("fa-IR")} نمونه ·{" "}
                  {value.enough_samples
                    ? "حداقل ۱۰۰ نمونه دریافت شده"
                    : "نمونه کافی برای نتیجه‌گیری نیست"}
                </p>
              </div>
              <p className="text-sm">
                p75:{" "}
                {value.p75 === null
                  ? "داده‌ای نیست"
                  : value.p75.toLocaleString("fa-IR", {
                      maximumFractionDigits: 3,
                    })}{" "}
                {name !== "CLS" && "میلی‌ثانیه"}
              </p>
            </li>
          ))}
        </ul>
      </AdminPanel>
      <details className="admin-section-surface text-xs leading-8 text-muted-foreground">
        <summary className="min-h-11 cursor-pointer content-center font-semibold text-foreground">
          روش محاسبه و محدودیت داده‌ها
        </summary>
        <div className="mt-4 space-y-3">
          <p>
            بازه ۳۰ روز UTC؛ فقط نشست‌های رضایت‌داده و دارای رویداد شروع. نشست
            با تغییر روز یا ۳۰ دقیقه بی‌فعالیتی عوض می‌شود. منبع بر اساس
            referrer عمومی و بدون ذخیره URL خام تشخیص داده می‌شود؛ احتمال خطای
            تشخیص وجود دارد.
          </p>
          <p>
            نرخ نتیجه فرم از success / (success + error) محاسبه می‌شود؛ تلاش
            بدون پاسخ ثبت‌شده در مخرج نیست. آمار واجد شرایط و قرارداد از CRM
            دریافت می‌شود.
          </p>
          <p>
            این نمونه‌ها نماینده تمام بازدیدها نیستند. تغییر مسیرهای داخل یک
            document و محدودیت پشتیبانی مرورگرها باید در تحلیل لحاظ شود؛
            Lighthouse اثبات INP میدانی نیست.
          </p>
        </div>
      </details>
    </div>
  );
}
