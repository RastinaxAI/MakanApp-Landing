import { stages, type Dashboard } from "./types";
import { sources } from "@/features/leads/types";
export function CrmDashboard({ data }: { data: Dashboard }) {
  const metrics: [string, number, string?][] = [
    ["کل لیدها", data.total_leads],
    ["لید جدید", data.new_leads],
    ["واجد شرایط", data.qualified_leads],
    ["درخواست دمو", data.demo_requests],
    ["دمو برنامه‌ریزی‌شده", data.scheduled_demos],
    ["دمو برگزارشده", data.completed_demos],
    ["لید به جلسهٔ دمو", data.lead_to_demo_percent, "٪"],
    ["دموی برگزارشده به فرصت", data.demo_to_opportunity_percent, "٪"],
    ["پیگیری عقب‌افتاده", data.overdue_followups],
  ];
  return (
    <div className="grid gap-6">
      <div className="grid grid-cols-2 gap-3 desktop:grid-cols-3">
        {metrics.map(([label, value, suffix]) => (
          <section key={label} className="crm-metric">
            <h2 className="text-sm leading-7 text-muted-foreground">{label}</h2>
            <strong>
              {value.toLocaleString("fa-IR")}
              {suffix}
            </strong>
          </section>
        ))}
      </div>
      <p className="text-xs leading-7 text-muted-foreground">
        بازه بر اساس زمان ایجاد لید است. هر لید در نرخ تبدیل یک بار شمرده
        می‌شود؛ نرخ اول داشتن جلسهٔ برنامه‌ریزی‌شده یا برگزارشده و نرخ دوم داشتن
        فرصت برای لید دارای دموی برگزارشده را اندازه می‌گیرد.
      </p>
      <div className="grid gap-6 desktop:grid-cols-2">
        <section className="crm-surface">
          <h2 className="mb-5 font-semibold">منبع جذب</h2>
          {Object.keys(data.sources).length ? (
            <dl className="grid gap-4">
              {Object.entries(data.sources).map(([key, value]) => (
                <div
                  key={key}
                  className="flex justify-between border-b border-border pb-3"
                >
                  <dt>{sources[key] || key}</dt>
                  <dd>{value.toLocaleString("fa-IR")}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="crm-empty">هنوز لید ثبت نشده است.</p>
          )}
        </section>
        <section className="crm-surface">
          <h2 className="mb-5 font-semibold">توزیع فرصت‌ها</h2>
          <dl className="grid gap-3">
            {Object.entries(stages).map(([key, label]) => (
              <div key={key} className="flex justify-between">
                <dt>{label}</dt>
                <dd>{(data.stages[key] || 0).toLocaleString("fa-IR")}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
      <section>
        <h2 className="mb-4 font-semibold">عملکرد تیم فروش</h2>
        <div
          className="crm-table-scroll"
          role="region"
          aria-label="عملکرد کارشناسان"
          tabIndex={0}
        >
          <table className="crm-table">
            <thead>
              <tr>
                <th scope="col">کارشناس</th>
                <th scope="col">فعالیت انجام‌شده</th>
                <th scope="col">دموی برگزارشده</th>
                <th scope="col">فرصت موفق</th>
              </tr>
            </thead>
            <tbody>
              {data.performance.map((item) => (
                <tr key={item.id}>
                  <td dir="auto">{item.label}</td>
                  <td>{item.completed_activities.toLocaleString("fa-IR")}</td>
                  <td>{item.completed_demos.toLocaleString("fa-IR")}</td>
                  <td>{item.won_opportunities.toLocaleString("fa-IR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
