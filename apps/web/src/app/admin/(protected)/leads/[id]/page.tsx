import Link from "next/link";
import { requireAdmin } from "@/lib/admin-api";
import { cmsGet, CmsDenied } from "@/features/cms/admin-data";
import type { CmsPage } from "@/features/cms/types";
import { LeadEditor } from "@/features/leads/lead-editor";
import {
  date,
  statuses,
  outcomes,
  sources,
  type LeadDetail,
  type Assignee,
  type Note,
  type History,
} from "@/features/leads/types";

export default async function LeadPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!(await requireAdmin()).capabilities.includes("leads"))
    return <CmsDenied />;
  const { id } = await params;
  const query = await searchParams;
  const number = (value: unknown) =>
    typeof value === "string" && /^[1-9]\d{0,5}$/.test(value)
      ? Number(value)
      : 1;
  const notePage = number(query.notes_page),
    historyPage = number(query.history_page);
  const [lead, assignees, notes, history] = await Promise.all([
    cmsGet<LeadDetail>(`leads/${id}`),
    cmsGet<Assignee[]>("leads/assignees"),
    cmsGet<CmsPage<Note>>(`leads/${id}/notes?page=${notePage}`),
    cmsGet<CmsPage<History>>(`leads/${id}/history?page=${historyPage}`),
  ]);
  const labels: Record<string, string> = {
    school_name: "مدرسه یا مؤسسه",
    city: "شهر",
    job_title: "سمت",
    student_count_range: "تعداد تقریبی دانش‌آموزان",
    subject: "موضوع",
    message: "پیام",
  };
  const counts: Record<string, string> = {
    under100: "کمتر از ۱۰۰",
    "100-299": "۱۰۰ تا ۲۹۹",
    "300-599": "۳۰۰ تا ۵۹۹",
    "600-999": "۶۰۰ تا ۹۹۹",
    "1000plus": "۱۰۰۰ و بیشتر",
  };
  const actor = (id: string | null) =>
    id
      ? (assignees.find((item) => item.id === id)?.email ?? "مدیر پیشین")
      : "سامانه";
  const value = (key: string, input: string | null) =>
    input === null
      ? "بدون مقدار"
      : key === "status"
        ? statuses[input]
        : key === "outcome"
          ? outcomes[input]
          : key === "assigned_to"
            ? actor(input)
            : input;
  const pages = (data: CmsPage<unknown>, name: string, current: number) => (
    <nav
      aria-label={
        name === "notes_page" ? "صفحه‌های یادداشت" : "صفحه‌های تاریخچه"
      }
      className="mt-4 flex gap-5"
    >
      {current > 1 && (
        <Link
          href={`?notes_page=${name === "notes_page" ? current - 1 : notePage}&history_page=${name === "history_page" ? current - 1 : historyPage}`}
          prefetch={false}
          className="inline-flex min-h-11 items-center text-primary-hover"
        >
          قبل
        </Link>
      )}
      <span className="py-3">
        {current.toLocaleString("fa-IR")} /{" "}
        {Math.max(1, data.pagination.pages).toLocaleString("fa-IR")}
      </span>
      {current < data.pagination.pages && (
        <Link
          href={`?notes_page=${name === "notes_page" ? current + 1 : notePage}&history_page=${name === "history_page" ? current + 1 : historyPage}`}
          prefetch={false}
          className="inline-flex min-h-11 items-center text-primary-hover"
        >
          بعد
        </Link>
      )}
    </nav>
  );
  return (
    <>
      <Link
        href="/admin/leads"
        prefetch={false}
        className="mb-4 inline-flex min-h-11 items-center text-primary-hover"
      >
        بازگشت به درخواست‌ها
      </Link>
      <h1 className="text-3xl font-semibold [overflow-wrap:anywhere]">
        {lead.kind === "demo" ? "درخواست دمو" : "پیام تماس"}:{" "}
        {lead.full_name ?? "اطلاعات حذف‌شده"}
      </h1>
      <section className="mt-6 min-w-0 rounded-2xl border border-border bg-card p-5 tablet:p-7">
        <h2 className="text-xl font-semibold">اطلاعات درخواست</h2>
        <p dir="ltr" className="my-4 break-all font-mono text-sm">
          {lead.reference_id}
        </p>
        <dl className="grid gap-5 tablet:grid-cols-2">
          <div>
            <dt className="text-sm text-muted-foreground">روش تماس</dt>
            <dd dir="ltr" className="mt-2 break-all">
              {lead.contact_value ?? "حذف‌شده"}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">منبع و وضعیت</dt>
            <dd className="mt-2">
              {sources[lead.source]} · {statuses[lead.status]}
              {lead.outcome ? ` · ${outcomes[lead.outcome]}` : ""}
            </dd>
          </div>
          {Object.entries(lead.details)
            .filter(([, v]) => v)
            .map(([key, v]) => (
              <div
                key={key}
                className={key === "message" ? "tablet:col-span-2" : ""}
              >
                <dt className="text-sm text-muted-foreground">
                  {labels[key] ?? key}
                </dt>
                <dd className="mt-2 whitespace-pre-wrap break-words leading-8">
                  {key === "student_count_range" ? counts[v] : v}
                </dd>
              </div>
            ))}
          <div>
            <dt className="text-sm text-muted-foreground">زمان ثبت</dt>
            <dd className="mt-2">{date(lead.created_at)}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">آخرین پیگیری</dt>
            <dd className="mt-2">{date(lead.last_activity_at)}</dd>
          </div>
          <div className="tablet:col-span-2">
            <dt className="text-sm text-muted-foreground">رضایت ثبت‌شده</dt>
            <dd className="mt-2">
              {date(lead.consent_at)} ·{" "}
              <span dir="ltr">{lead.consent_version}</span>
            </dd>
          </div>
        </dl>
      </section>
      <LeadEditor key={lead.id} initial={lead} assignees={assignees} />
      <section className="mt-6 rounded-2xl border border-border bg-card p-5">
        <h2 className="text-xl font-semibold">یادداشت‌های داخلی</h2>
        {notes.items.length === 0 && (
          <p className="mt-4 text-muted-foreground">یادداشتی موجود نیست.</p>
        )}
        {notes.items.map((note) => (
          <article key={note.id} className="mt-5 border-t border-border pt-4">
            <h3 className="break-all text-sm text-muted-foreground">
              {actor(note.actor_id)} · {date(note.created_at)}
            </h3>
            <p className="mt-3 whitespace-pre-wrap break-words leading-8">
              {note.body}
            </p>
          </article>
        ))}
        {pages(notes, "notes_page", notePage)}
      </section>
      <section className="mt-6 rounded-2xl border border-border bg-card p-5">
        <h2 className="text-xl font-semibold">تاریخچه پیگیری</h2>
        {history.items.map((event) => (
          <article key={event.id} className="mt-5 border-t border-border pt-4">
            <h3 className="break-all text-sm text-muted-foreground">
              {actor(event.actor_id)} · {date(event.created_at)}
            </h3>
            {Object.entries(event.changes).map(([key, change]) => (
              <p key={key} className="mt-2 break-words leading-8">
                {key === "status"
                  ? "وضعیت"
                  : key === "outcome"
                    ? "نتیجه"
                    : "مسئول"}
                : {value(key, change.from)} ← {value(key, change.to)}
              </p>
            ))}
          </article>
        ))}
        {pages(history, "history_page", historyPage)}
      </section>
    </>
  );
}
