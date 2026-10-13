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
    return <h1>اجازه مشاهده آمار را ندارید.</h1>;
  const m = await cmsGet<Metrics>("analytics/metrics?days=30");
  const percent = (n: number | null) =>
    n === null
      ? "داده کافی نیست"
      : `${(100 * n).toLocaleString("fa-IR", { maximumFractionDigits: 1 })}٪`;
  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-semibold">اندازه‌گیری استفاده و سرعت</h1>
      <p className="leading-8">
        بازه ۳۰ روز UTC؛ فقط نشست‌های رضایت‌داده و دارای رویداد شروع. نشست با
        تغییر روز یا ۳۰ دقیقه بی‌فعالیتی عوض می‌شود. منبع بر اساس referrer عمومی
        و بدون ذخیره URL خام تشخیص داده می‌شود؛ احتمال خطای تشخیص وجود دارد.
      </p>
      <dl className="grid gap-4 tablet:grid-cols-2">
        {Object.entries({
          نشست‌ها: m.sessions.toLocaleString("fa-IR"),
          "نشست ارگانیک": m.organic_sessions.toLocaleString("fa-IR"),
          "تبدیل نشست به موفقیت فرم دمو": percent(m.demo_conversion_rate),
          "نرخ نتیجه موفق تلاش فرم": percent(m.form_success_rate),
          "نرخ نتیجه خطای تلاش فرم": percent(m.form_error_rate),
        }).map(([label, value]) => (
          <div key={label} className="rounded-xl border bg-card p-4">
            <dt>{label}</dt>
            <dd className="mt-3 text-xl">{value}</dd>
          </div>
        ))}
      </dl>
      <p>
        نرخ نتیجه فرم از success / (success + error) محاسبه می‌شود؛ تلاش بدون
        پاسخ ثبت‌شده در مخرج نیست. آمار واجد شرایط و قرارداد از CRM دریافت
        می‌شود.
      </p>
      <h2 className="text-2xl font-semibold">رویدادها</h2>
      {Object.keys(m.events).length ? (
        <ul className="space-y-3">
          {Object.entries(m.events).map(([name, count]) => (
            <li key={name}>
              <bdi>{name}</bdi>: {count.toLocaleString("fa-IR")}
            </li>
          ))}
        </ul>
      ) : (
        <p>هنوز رویدادی ثبت نشده است.</p>
      )}
      <h2 className="text-2xl font-semibold">Core Web Vitals میدانی</h2>
      <ul className="space-y-3">
        {Object.entries(m.vitals).map(([name, value]) => (
          <li key={name}>
            <bdi>{name}</bdi> — {value.count.toLocaleString("fa-IR")} نمونه؛
            p75:{" "}
            {value.p75 === null
              ? "داده‌ای نیست"
              : value.p75.toLocaleString("fa-IR", {
                  maximumFractionDigits: 3,
                })}{" "}
            {name !== "CLS" && "میلی‌ثانیه"}؛{" "}
            {value.enough_samples
              ? "حداقل ۱۰۰ نمونه دریافت شده"
              : "نمونه کافی برای نتیجه‌گیری نیست"}
          </li>
        ))}
      </ul>
      <p>
        این نمونه‌ها نماینده تمام بازدیدها نیستند. تغییر مسیرهای داخل یک
        document و محدودیت پشتیبانی مرورگرها باید در تحلیل لحاظ شود؛ Lighthouse
        اثبات INP میدانی نیست.
      </p>
    </section>
  );
}
