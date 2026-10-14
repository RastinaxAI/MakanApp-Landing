"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Phone, Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { date, statuses } from "@/features/leads/types";
import { RecordEditor } from "./record-editor";
import { Pipeline } from "./pipeline";
import {
  activityKinds,
  activityStatuses,
  demoStatuses,
  stages,
  type Customer,
  type Resource,
  type Assignee,
  type AnyRecord,
} from "./types";

const eventNames: Record<string, string> = {
  activity: "فعالیت",
  note: "یادداشت",
  lead_history: "تغییر درخواست",
  demo: "جلسهٔ دمو",
  stage: "تغییر مرحله",
};
function eventText(kind: string, details: Record<string, unknown>) {
  if (kind === "stage")
    return `${stages[details.from as keyof typeof stages] || "شروع"} ← ${stages[details.to as keyof typeof stages] || ""}`;
  if (kind === "note") return String(details.body || "");
  if (kind === "activity")
    return `${details.title || ""} — ${details.body || ""}`;
  if (kind === "demo")
    return `${demoStatuses[details.status as keyof typeof demoStatuses] || ""}؛ ${details.outcome || ""} ${details.next_action || ""}`;
  const labels: Record<string, string> = {
    status: "وضعیت",
    assigned_to: "کارشناس",
    crm: "پرونده",
  };
  return Object.entries(details)
    .map(([key, v]) => {
      const value = v as { to?: string };
      return `${labels[key] || key}: ${key === "status" ? statuses[value.to || ""] : key === "assigned_to" ? "تخصیص به‌روزرسانی شد" : key === "crm" ? "پیگیری پرونده ثبت شد" : value.to || ""}`;
    })
    .join("؛ ");
}
export function Customer360({
  data,
  assignees,
  page = 1,
}: {
  data: Customer;
  assignees: Assignee[];
  page?: number;
}) {
  const router = useRouter();
  const [editor, setEditor] = useState<{
    resource: Resource;
    initial?: Record<string, unknown>;
  } | null>(null);
  const [leadId, setLeadId] = useState(
    data.lead?.id || data.requests[0]?.id || "",
  );
  const lead =
    data.lead || data.requests.find((row) => row.id === leadId) || null;
  const editable = !!lead && !lead.purged_at;
  const add = (resource: Resource) => setEditor({ resource });
  const edit = (resource: Resource, record: AnyRecord) =>
    setEditor({ resource, initial: { ...record } });
  const context =
    editor?.resource === "contacts"
      ? { school_id: data.school?.id, lead_id: leadId }
      : editor?.resource === "schools"
        ? {}
        : editor?.resource === "opportunities"
          ? { lead_id: leadId, school_id: data.school?.id }
          : { lead_id: leadId };
  const pager = (totalPages: number) => {
    const root = data.lead
      ? `/admin/crm/leads/${data.lead.id}`
      : `/admin/crm/schools/${data.school?.id}`;
    return (
      <nav aria-label="صفحه‌های پرونده" className="mt-4 flex gap-3">
        {page > 1 && (
          <Link
            prefetch={false}
            href={`${root}?page=${page - 1}`}
            className="crm-chip min-h-11"
          >
            قبلی
          </Link>
        )}
        {page < totalPages && (
          <Link
            prefetch={false}
            href={`${root}?page=${page + 1}`}
            className="crm-chip min-h-11"
          >
            بعدی
          </Link>
        )}
      </nav>
    );
  };
  return (
    <div className="grid gap-6">
      <header className="crm-heading">
        <div>
          <Link
            prefetch={false}
            href="/admin/crm"
            className="text-sm text-primary"
          >
            فروش و پروندهٔ مدارس
          </Link>
          <h1 className="mt-3 text-3xl font-semibold leading-12">
            {data.school?.name || lead?.full_name || "پروندهٔ حذف‌شده"}
          </h1>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            نمای یکپارچهٔ اطلاعات، درخواست‌ها و پیگیری‌ها
          </p>
        </div>
        <Building2
          size={40}
          className="rounded-xl bg-secondary p-2 text-primary"
          aria-hidden="true"
        />
      </header>
      <div className="grid gap-5 desktop:grid-cols-[300px_1fr]">
        <aside className="grid content-start gap-5">
          <section className="crm-surface">
            <div className="crm-heading">
              <h2 className="font-semibold">مدرسه و مسئول</h2>
              {data.school && !data.school.purged_at && (
                <Button
                  variant="ghost"
                  aria-label="ویرایش مدرسه"
                  onClick={() => edit("schools", data.school!)}
                >
                  <Pencil aria-hidden="true" />
                </Button>
              )}
            </div>
            {data.school && (
              <dl className="grid gap-3 text-sm">
                <div>
                  <dt className="text-muted-foreground">شهر و استان</dt>
                  <dd className="mt-1">
                    {[data.school.city, data.school.province]
                      .filter(Boolean)
                      .join("، ") || "ثبت نشده"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">تعداد دانش‌آموز</dt>
                  <dd>
                    {data.school.students?.toLocaleString("fa-IR") ||
                      "ثبت نشده"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">علاقه‌مندی‌ها</dt>
                  <dd>
                    {data.school.interested_features
                      .map(
                        (key) =>
                          ({
                            messenger: "پیام‌رسان",
                            school: "مدرسه",
                            reports: "گزارش",
                            ai: "AI در نقشهٔ راه",
                            profile: "پروفایل",
                          })[key],
                      )
                      .filter(Boolean)
                      .join("، ") || "ثبت نشده"}
                  </dd>
                </div>
              </dl>
            )}
            {lead && (
              <div className="mt-4 border-t border-border pt-4">
                <p className="font-semibold">
                  {lead.full_name || "اطلاعات حذف‌شده"}
                </p>
                <p className="my-3 flex items-center gap-2 text-sm">
                  <Phone size={16} aria-hidden="true" />
                  <span dir="ltr">{lead.contact_value}</span>
                </p>
                <span className="crm-chip">{statuses[lead.status]}</span>
                <div className="mt-3 flex flex-wrap gap-2">
                  {data.profile.tags.map((tag) => (
                    <span key={tag} className="crm-chip">
                      {tag}
                    </span>
                  ))}
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-7">
                  {data.profile.qualification}
                </p>
                {editable && data.lead && (
                  <Button
                    variant="outline"
                    className="mt-4 w-full"
                    onClick={() =>
                      setEditor({
                        resource: "profile",
                        initial: {
                          full_name: lead.full_name,
                          contact_method: lead.contact_method,
                          contact_value: lead.contact_value,
                          school_id: data.profile.school_id,
                          tags: data.profile.tags,
                          qualification: data.profile.qualification,
                          version: lead.version,
                        },
                      })
                    }
                  >
                    ارزیابی و ویرایش لید
                  </Button>
                )}
                <Link
                  prefetch={false}
                  href={`/admin/leads/${lead.id}`}
                  className="mt-3 block min-h-11 py-3 text-sm text-primary"
                >
                  وضعیت، تخصیص و یادداشت درخواست
                </Link>
              </div>
            )}
            {lead?.purged_at && (
              <p className="mt-3 text-sm leading-7">
                اطلاعات شخصی طبق سیاست نگهداری حذف شده است.
              </p>
            )}
          </section>
          <section className="crm-surface">
            <h2 className="mb-4 font-semibold">درخواست‌های مرتبط</h2>
            {!data.lead && data.requests.length > 0 && (
              <>
                <label
                  htmlFor="customer-current-request"
                  className="mb-2 block text-sm"
                >
                  درخواست برای اقدام جدید
                </label>
                <select
                  id="customer-current-request"
                  className="crm-control mb-4"
                  value={leadId}
                  onChange={(e) => setLeadId(e.target.value)}
                >
                  {data.requests.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.full_name} — {date(r.created_at)}
                    </option>
                  ))}
                </select>
              </>
            )}
            {data.requests.map((row) => (
              <Link
                prefetch={false}
                key={row.id}
                href={`/admin/crm/leads/${row.id}`}
                className="mb-3 block rounded-lg border border-border p-3 text-sm leading-7"
              >
                {row.full_name}
                <br />
                <span className="text-muted-foreground">
                  {date(row.created_at)}
                </span>
              </Link>
            ))}
          </section>
        </aside>
        <div className="min-w-0">
          <Tabs defaultValue="timeline" dir="rtl">
            <TabsList
              className="mb-5 flex h-auto w-full flex-wrap justify-start gap-1"
              aria-label="بخش‌های پرونده"
            >
              {[
                ["timeline", "تاریخچه"],
                ["contacts", "افراد"],
                ["opportunities", "فرصت‌ها"],
                ["activities", "فعالیت‌ها"],
                ["demos", "دموها"],
              ].map(([key, label]) => (
                <TabsTrigger key={key} value={key!} className="min-h-11 px-4">
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
            <TabsContent value="timeline">
              <section className="crm-surface">
                <h2 className="mb-4 text-lg font-semibold">
                  تاریخچهٔ ارتباط با مدرسه
                </h2>
                <ol className="crm-timeline">
                  {data.timeline.items.map((item) => (
                    <li key={`${item.kind}-${item.id}`}>
                      <div className="mb-2 flex flex-wrap justify-between gap-2 text-sm">
                        <strong>{eventNames[item.kind] || "پیگیری"}</strong>
                        <time
                          dateTime={item.at}
                          className="text-xs text-muted-foreground"
                        >
                          {date(item.at)}
                        </time>
                      </div>
                      <p className="whitespace-pre-wrap text-sm leading-8">
                        {eventText(item.kind, item.details)}
                      </p>
                    </li>
                  ))}
                </ol>
                {!data.timeline.items.length && (
                  <p className="crm-empty">فعالیتی ثبت نشده است.</p>
                )}
                {pager(data.timeline.pagination.pages)}
              </section>
            </TabsContent>
            <TabsContent value="contacts">
              <section className="crm-surface">
                <div className="crm-heading">
                  <h2 className="font-semibold">افراد مرتبط با مدرسه</h2>
                  {data.school && !data.school.purged_at && (
                    <Button onClick={() => add("contacts")}>
                      <Plus aria-hidden="true" />
                      افزودن فرد
                    </Button>
                  )}
                </div>
                <div className="grid gap-3 tablet:grid-cols-2">
                  {data.contacts.items.map((row) => (
                    <article
                      key={row.id}
                      className="rounded-xl border border-border p-4"
                    >
                      <h3 className="font-semibold">
                        {row.full_name}
                        {row.is_manager && (
                          <span className="crm-chip ms-2">مدیر</span>
                        )}
                      </h3>
                      <p className="my-2 text-sm">{row.job_title}</p>
                      <p dir="ltr" className="text-start text-sm">
                        {row.contact_value}
                      </p>
                      <Button
                        variant="ghost"
                        className="mt-3"
                        onClick={() => edit("contacts", row)}
                      >
                        ویرایش فرد
                      </Button>
                    </article>
                  ))}
                </div>
                {!data.contacts.items.length && (
                  <p className="crm-empty">فردی ثبت نشده است.</p>
                )}
                {pager(data.contacts.pagination.pages)}
              </section>
            </TabsContent>
            <TabsContent value="opportunities">
              <div className="crm-heading">
                <h2 className="text-lg font-semibold">فرصت‌های مدرسه</h2>
                {editable && data.school && (
                  <Button onClick={() => add("opportunities")}>
                    <Plus aria-hidden="true" />
                    فرصت جدید
                  </Button>
                )}
              </div>
              <Pipeline
                items={data.opportunities.items}
                onEdit={(row) => edit("opportunities", row)}
                onSaved={() => router.refresh()}
              />
              {pager(data.opportunities.pagination.pages)}
            </TabsContent>
            <TabsContent value="activities">
              <section className="crm-surface">
                <div className="crm-heading">
                  <h2 className="font-semibold">تماس، جلسه و پیگیری</h2>
                  {editable && (
                    <Button onClick={() => add("activities")}>
                      <Plus aria-hidden="true" />
                      فعالیت جدید
                    </Button>
                  )}
                </div>
                {data.activities.items.map((row) => (
                  <article
                    key={row.id}
                    className="mb-4 rounded-xl border border-border p-4"
                  >
                    <div className="crm-heading">
                      <h3 className="font-semibold">{row.title}</h3>
                      <span className="crm-chip">
                        {activityKinds[row.kind]}؛{" "}
                        {activityStatuses[row.status]}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-7">
                      {row.body}
                    </p>
                    {row.due_at && (
                      <p className="my-3 text-sm">
                        زمان پیگیری: {date(row.due_at)}
                      </p>
                    )}
                    <Button
                      variant="outline"
                      onClick={() => edit("activities", row)}
                    >
                      ویرایش فعالیت
                    </Button>
                  </article>
                ))}
                {!data.activities.items.length && (
                  <p className="crm-empty">فعالیتی ثبت نشده است.</p>
                )}
                {pager(data.activities.pagination.pages)}
              </section>
            </TabsContent>
            <TabsContent value="demos">
              <section className="crm-surface">
                <div className="crm-heading">
                  <h2 className="font-semibold">جلسه‌های دمو</h2>
                  {editable && (
                    <Button onClick={() => add("demos")}>
                      <Plus aria-hidden="true" />
                      زمان‌بندی دمو
                    </Button>
                  )}
                </div>
                {data.demos.items.map((row) => (
                  <article
                    key={row.id}
                    className="mb-4 rounded-xl border border-border p-4"
                  >
                    <div className="crm-heading">
                      <h3 className="font-semibold">{date(row.starts_at)}</h3>
                      <span className="crm-chip">
                        {demoStatuses[row.status]}
                      </span>
                    </div>
                    <p className="text-sm leading-7">
                      نتیجه: {row.outcome || "ثبت نشده"}
                    </p>
                    <p className="mb-3 text-sm leading-7">
                      اقدام بعدی: {row.next_action || "ثبت نشده"}
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => edit("demos", row)}
                    >
                      ویرایش دمو
                    </Button>
                  </article>
                ))}
                {!data.demos.items.length && (
                  <p className="crm-empty">جلسه‌ای ثبت نشده است.</p>
                )}
                {pager(data.demos.pagination.pages)}
              </section>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      {editor && (
        <RecordEditor
          resource={editor.resource}
          initial={editor.initial}
          context={context}
          assignees={assignees}
          opportunities={data.opportunities.items}
          school={data.school}
          onSaved={() => router.refresh()}
          onClose={() => setEditor(null)}
        />
      )}
    </div>
  );
}
