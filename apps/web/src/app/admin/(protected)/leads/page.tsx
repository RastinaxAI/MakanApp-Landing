import Link from "next/link";
import { requireAdmin } from "@/lib/admin-api";
import { cmsGet, CmsDenied } from "@/features/cms/admin-data";
import type { CmsPage } from "@/features/cms/types";
import {
  date,
  statuses,
  outcomes,
  sources,
  type Lead,
  type Assignee,
  type Metrics,
} from "@/features/leads/types";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!(await requireAdmin()).capabilities.includes("leads"))
    return <CmsDenied />;
  const input = await searchParams;
  const query = new URLSearchParams();
  const allowed = [
    "q",
    "kind",
    "status",
    "source",
    "assigned_to",
    "date_from",
    "date_to",
    "page",
  ];
  for (const key of allowed)
    if (typeof input[key] === "string" && input[key]) {
      const value = input[key] as string;
      query.set(
        key,
        key.startsWith("date_") && /^\d{4}-\d{2}-\d{2}$/.test(value)
          ? value + "T00:00:00Z"
          : value,
      );
    }
  query.set("page_size", "20");
  const [data, assignees, metrics] = await Promise.all([
    cmsGet<CmsPage<Lead>>(`leads?${query}`),
    cmsGet<Assignee[]>("leads/assignees"),
    cmsGet<Metrics>(`leads/metrics?${query}`),
  ]);
  const pagination = (page: number) => {
    const copy = new URLSearchParams(query);
    copy.set("page", String(page));
    return `/admin/leads?${copy}`;
  };
  function select(name: string, title: string, items: Record<string, string>) {
    return (
      <div className="grid min-w-0 gap-2 text-sm">
        <label htmlFor={`filter-${name}`}>{title}</label>
        <select
          id={`filter-${name}`}
          name={name}
          defaultValue={typeof input[name] === "string" ? input[name] : ""}
          className="min-h-12 min-w-0 w-full max-w-full rounded-lg border border-input bg-card px-3"
        >
          <option value="">همه</option>
          {Object.entries(items).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
    );
  }
  return (
    <>
      <h1 className="text-3xl font-semibold">درخواست‌ها و پیگیری</h1>
      <p className="mt-3 leading-8 text-muted-foreground">
        درخواست‌های دمو و پیام‌های تماس؛ اطلاعات شخصی فقط برای مالک و فروش قابل
        دسترسی است.
      </p>
      <div className="my-6 grid gap-3 tablet:grid-cols-3">
        {[
          ["کل درخواست‌های بازه", metrics.total],
          ["دمو", metrics.demo],
          ["پیام تماس", metrics.contact],
          ["واجد شرایط فعلی", metrics.qualified],
          ["قرارداد ثبت‌شده", metrics.contracts],
        ].map(([label, value]) => (
          <section
            key={label}
            className="rounded-xl border border-border bg-card p-4"
          >
            <h2 className="text-sm text-muted-foreground">{label}</h2>
            <p className="mt-2 text-2xl font-semibold">
              {Number(value).toLocaleString("fa-IR")}
            </p>
          </section>
        ))}
      </div>
      <p className="mb-6 text-sm leading-7 text-muted-foreground">
        آمار بر زمان ایجاد درخواست در بازه انتخابی و آخرین وضعیت ثبت‌شده محاسبه
        می‌شود؛ شامل رکوردهای بی‌نام پس از حذف اطلاعات است. این اعداد نرخ تبدیل
        بازدید نیستند. پایان بازه شامل نمی‌شود و تاریخ‌ها میلادی، ساعت صفر UTC
        هستند.
      </p>
      <form
        method="get"
        className="grid grid-cols-1 gap-4 rounded-2xl border border-border bg-card p-5 tablet:grid-cols-2 desktop:grid-cols-3"
      >
        <label className="grid min-w-0 gap-2 text-sm">
          جست‌وجو
          <input
            name="q"
            defaultValue={typeof input.q === "string" ? input.q : ""}
            placeholder="نام، تماس، مدرسه، موضوع یا کد"
            maxLength={120}
            className="min-h-12 min-w-0 w-full max-w-full rounded-lg border border-input bg-card px-3"
          />
        </label>
        {select("kind", "نوع درخواست", { demo: "دمو", contact: "تماس" })}
        {select("status", "وضعیت", statuses)}
        {select("source", "منبع", sources)}
        {select(
          "assigned_to",
          "مسئول پیگیری",
          Object.fromEntries(assignees.map((a) => [a.id, a.email])),
        )}
        {[
          ["date_from", "تاریخ ایجاد از"],
          ["date_to", "تاریخ ایجاد تا — غیرشامل"],
        ].map(([name, title]) => (
          <label key={name} className="grid min-w-0 gap-2 text-sm">
            {title}
            <input
              name={name}
              type="date"
              dir="ltr"
              defaultValue={
                typeof input[name!] === "string"
                  ? (input[name!] as string).slice(0, 10)
                  : ""
              }
              className="min-h-12 min-w-0 w-full max-w-full rounded-lg border border-input bg-card px-3"
            />
          </label>
        ))}
        <button className="min-h-12 rounded-lg bg-primary px-5 text-primary-foreground">
          اعمال فیلتر
        </button>
        <Link
          href="/admin/leads"
          prefetch={false}
          className="inline-flex min-h-12 items-center text-primary-hover"
        >
          پاک‌کردن فیلترها
        </Link>
      </form>
      <div className="mt-6 grid gap-4">
        {data.items.length === 0 && (
          <p className="rounded-xl border border-dashed border-input p-6">
            درخواستی با این فیلترها ثبت نشده است.
          </p>
        )}
        {data.items.map((lead) => (
          <article
            key={lead.id}
            className="min-w-0 rounded-2xl border border-border bg-card p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="min-w-0 max-w-full text-xl font-semibold [overflow-wrap:anywhere]">
                <Link
                  prefetch={false}
                  href={`/admin/leads/${lead.id}`}
                  className="block min-h-11 max-w-full py-2 text-primary-hover [overflow-wrap:anywhere]"
                >
                  {lead.full_name ?? "اطلاعات شخصی حذف‌شده"}
                </Link>
              </h2>
              <span className="rounded-lg bg-secondary px-3 py-2 text-sm">
                {statuses[lead.status]}
              </span>
            </div>
            <p className="mt-2 text-sm">
              {lead.kind === "demo" ? "دمو" : "تماس"} · {sources[lead.source]}
              {lead.outcome ? ` · ${outcomes[lead.outcome]}` : ""}
            </p>
            <p dir="ltr" className="mt-3 break-all text-sm">
              {lead.contact_value}
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              {date(lead.created_at)}
            </p>
            <p dir="ltr" className="mt-2 break-all font-mono text-xs">
              {lead.reference_id}
            </p>
          </article>
        ))}
      </div>
      <nav
        aria-label="صفحه‌های درخواست‌ها"
        className="mt-6 flex flex-wrap items-center gap-5"
      >
        {data.pagination.page > 1 && (
          <Link
            href={pagination(data.pagination.page - 1)}
            prefetch={false}
            className="inline-flex min-h-11 items-center text-primary-hover"
          >
            صفحه قبل
          </Link>
        )}
        <span>
          صفحه {data.pagination.page.toLocaleString("fa-IR")} از{" "}
          {Math.max(1, data.pagination.pages).toLocaleString("fa-IR")}
        </span>
        {data.pagination.page < data.pagination.pages && (
          <Link
            href={pagination(data.pagination.page + 1)}
            prefetch={false}
            className="inline-flex min-h-11 items-center text-primary-hover"
          >
            صفحه بعد
          </Link>
        )}
      </nav>
    </>
  );
}
