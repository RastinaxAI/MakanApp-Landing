"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Plus, Search, RefreshCw, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { adminRequest } from "@/features/admin/client";
import { AdminPageHeader } from "@/features/admin/page-kit";
import { date, sources, statuses } from "@/features/leads/types";
import { CrmDashboard } from "./dashboard";
import { Pipeline } from "./pipeline";
import { RecordEditor } from "./record-editor";
import {
  queryString,
  leadQueryString,
  noticeKinds,
  activityKinds,
  activityStatuses,
  demoStatuses,
  stages,
  type Dashboard,
  type Assignee,
  type Filters,
  type PageResult,
  type Opportunity,
  type School,
  type LeadList,
  type Activity,
  type Demo,
  type Notification,
  type SavedView,
  type Automations,
  type Resource,
} from "./types";

const sections = {
  dashboard: "گزارش فروش",
  leads: "لیدها",
  schools: "مدارس",
  opportunities: "کانبان فروش",
  activities: "فعالیت‌ها",
  demos: "جلسه‌های دمو",
  notifications: "اعلان‌ها",
  automations: "اتوماسیون",
};
type Tab = keyof typeof sections;
type Data =
  | Dashboard
  | PageResult<LeadList | School | Opportunity | Activity | Demo | Notification>
  | Automations;
const emptyPage = {
  items: [],
  pagination: { page: 1, page_size: 20, total: 0, pages: 0 },
};
export function CrmWorkbench({
  initial,
  assignees,
  initialSettings,
  initialViews,
  owner,
}: {
  initial: Dashboard;
  assignees: Assignee[];
  initialSettings: Automations;
  initialViews: SavedView[];
  owner: boolean;
}) {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [data, setData] = useState<Data>(initial);
  const [draft, setDraft] = useState<Filters>({});
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>({});
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [views, setViews] = useState(initialViews);
  const [viewName, setViewName] = useState("");
  const [settings, setSettings] = useState(initialSettings);
  const [editor, setEditor] = useState<{
    resource: Resource;
    initial?: Record<string, unknown>;
  } | null>(null);
  const reload = useCallback(() => setRevision((v) => v + 1), []);
  useEffect(() => {
    let active = true;
    Promise.resolve()
      .then(() => {
        if (active) {
          setBusy(true);
          setError("");
        }
        return adminRequest<Data>(
          `${tab === "leads" ? "" : "crm/"}${tab}?${tab === "leads" ? leadQueryString(filters, page) : queryString(filters, page)}`,
        );
      })
      .then((result) => {
        if (active) {
          setData(result);
          if (tab === "automations") setSettings(result as Automations);
        }
      })
      .catch((e) => {
        if (active)
          setError(e instanceof Error ? e.message : "ارتباط برقرار نشد.");
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [tab, filters, page, revision]);
  const list = "items" in data ? data : emptyPage;
  async function saveView() {
    setError("");
    try {
      const view = await adminRequest<SavedView>("crm/views", "POST", {
        name: viewName,
        filters,
      });
      setViews([...views, view]);
      setViewName("");
      setMessage("نمای جست‌وجو ذخیره شد.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "ذخیره انجام نشد.");
    }
  }
  async function saveSettings() {
    setError("");
    try {
      const result = await adminRequest<Automations>(
        "crm/automations",
        "PUT",
        {
          auto_assign: settings.auto_assign,
          assignment_mode: settings.assignment_mode,
          fixed_assignee: settings.fixed_assignee,
          reminders_enabled: settings.reminders_enabled,
          inactive_days: settings.inactive_days,
        },
        settings.row_version,
      );
      setSettings(result);
      setMessage("تنظیمات اتوماسیون ذخیره شد.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "ذخیره انجام نشد.");
    }
  }
  const selectFilter = (
    key: keyof Filters,
    title: string,
    options: Record<string, string>,
  ) => (
    <div className="grid gap-2">
      <label className="text-xs" htmlFor={`crm-filter-${key}`}>
        {title}
      </label>
      <select
        id={`crm-filter-${key}`}
        value={String(draft[key] || "")}
        onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
        className="crm-control"
      >
        <option value="">همه</option>
        {Object.entries(options).map(([v, t]) => (
          <option key={v} value={v}>
            {t}
          </option>
        ))}
      </select>
    </div>
  );
  function table() {
    const headers =
      tab === "leads"
        ? ["مسئول / مدرسه", "راه تماس", "وضعیت", "منبع", "ثبت"]
        : tab === "schools"
          ? ["مدرسه", "شهر / استان", "دانش‌آموز", "ثبت", "اقدام"]
          : tab === "activities"
            ? ["فعالیت", "نوع / وضعیت", "زمان پیگیری", "مسئول", "اقدام"]
            : ["شروع دمو", "وضعیت", "نتیجه", "اقدام بعدی", "پرونده"];
    return (
      <div
        className="crm-table-scroll"
        role="region"
        aria-label={sections[tab]}
        tabIndex={0}
      >
        <table className="crm-table">
          <thead>
            <tr>
              {headers.map((t) => (
                <th key={t} scope="col">
                  {t}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.items.map((item) => {
              if (tab === "leads") {
                const row = item as LeadList;
                return (
                  <tr key={row.id}>
                    <td>
                      <Link
                        prefetch={false}
                        className="text-primary font-semibold"
                        href={`/admin/crm/leads/${row.id}`}
                      >
                        {row.full_name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {row.school_name}
                      </p>
                    </td>
                    <td dir="ltr" className="text-start">
                      {row.contact_value}
                    </td>
                    <td>
                      <span className="crm-chip">{statuses[row.status]}</span>
                    </td>
                    <td>{sources[row.source]}</td>
                    <td>{date(row.created_at)}</td>
                  </tr>
                );
              }
              if (tab === "schools") {
                const row = item as School;
                return (
                  <tr key={row.id}>
                    <td>
                      <Link
                        prefetch={false}
                        className="text-primary font-semibold"
                        href={`/admin/crm/schools/${row.id}`}
                      >
                        {row.name}
                      </Link>
                    </td>
                    <td>
                      {[row.city, row.province].filter(Boolean).join("، ") ||
                        "—"}
                    </td>
                    <td>{row.students?.toLocaleString("fa-IR") ?? "—"}</td>
                    <td>{date(row.created_at)}</td>
                    <td>
                      <Button
                        variant="ghost"
                        onClick={() =>
                          setEditor({
                            resource: "schools",
                            initial: { ...row },
                          })
                        }
                      >
                        ویرایش مدرسه
                      </Button>
                    </td>
                  </tr>
                );
              }
              if (tab === "activities") {
                const row = item as Activity;
                return (
                  <tr key={row.id}>
                    <td>
                      <Link
                        prefetch={false}
                        href={`/admin/crm/leads/${row.lead_id}`}
                        className="text-primary"
                      >
                        {row.title}
                      </Link>
                    </td>
                    <td>
                      {activityKinds[row.kind]} / {activityStatuses[row.status]}
                    </td>
                    <td>{row.due_at ? date(row.due_at) : "—"}</td>
                    <td>
                      {assignees.find((v) => v.id === row.assigned_to)?.phone ||
                        "بدون تخصیص"}
                    </td>
                    <td>
                      <Button
                        variant="ghost"
                        onClick={() =>
                          setEditor({
                            resource: "activities",
                            initial: { ...row },
                          })
                        }
                      >
                        ویرایش فعالیت
                      </Button>
                    </td>
                  </tr>
                );
              }
              const row = item as Demo;
              return (
                <tr key={row.id}>
                  <td>{date(row.starts_at)}</td>
                  <td>{demoStatuses[row.status]}</td>
                  <td className="max-w-56">{row.outcome || "—"}</td>
                  <td className="max-w-56">{row.next_action || "—"}</td>
                  <td>
                    <Link
                      prefetch={false}
                      href={`/admin/crm/leads/${row.lead_id}`}
                      className="text-primary"
                    >
                      پرونده
                    </Link>
                    <Button
                      variant="ghost"
                      onClick={() =>
                        setEditor({ resource: "demos", initial: { ...row } })
                      }
                    >
                      ویرایش دمو
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }
  return (
    <div className="admin-page">
      <AdminPageHeader
        title="فروش و درخواست دمو"
        eyebrow="ارتباط با مدارس"
        description="از اولین درخواست تا جلسهٔ دمو و نتیجهٔ فروش؛ یک پرونده برای تمام ارتباط‌ها."
        actions={
          <>
            <Button
              variant="outline"
              onClick={reload}
              disabled={busy}
              aria-label="تازه‌سازی CRM"
            >
              <RefreshCw aria-hidden="true" />
            </Button>
            <Button onClick={() => setEditor({ resource: "leads" })}>
              <Plus aria-hidden="true" />
              ثبت سریع لید
            </Button>
          </>
        }
      />
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-destructive bg-card p-4 text-destructive"
        >
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="text-sm text-primary-hover">
          {message}
        </p>
      )}
      <Tabs
        value={tab}
        onValueChange={(v) => {
          setTab(v as Tab);
          setPage(1);
          setData(
            v === "dashboard"
              ? initial
              : v === "automations"
                ? settings
                : emptyPage,
          );
        }}
        dir="rtl"
      >
        <TabsList
          className="mb-6 flex h-auto w-full flex-wrap justify-start gap-1"
          aria-label="بخش‌های فروش"
        >
          {Object.entries(sections).map(([key, label]) => (
            <TabsTrigger key={key} value={key} className="min-h-12 px-4">
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
        {!["notifications", "automations"].includes(tab) && (
          <section className="crm-surface mb-6">
            <button
              type="button"
              aria-expanded={filterOpen}
              aria-controls="crm-filters"
              onClick={() => setFilterOpen((v) => !v)}
              className="min-h-11 text-sm font-semibold"
            >
              جست‌وجو، فیلتر و نماهای ذخیره‌شده
            </button>
            <div id="crm-filters" hidden={!filterOpen}>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setPage(1);
                  setFilters({ ...draft });
                }}
                className="mt-5 grid gap-4 tablet:grid-cols-2 desktop:grid-cols-4"
              >
                <div className="grid gap-2">
                  <label htmlFor="crm-search" className="text-xs">
                    نام، مدرسه یا شماره
                  </label>
                  <input
                    id="crm-search"
                    className="crm-control"
                    maxLength={120}
                    value={draft.q || ""}
                    onChange={(e) => setDraft({ ...draft, q: e.target.value })}
                  />
                </div>
                {selectFilter(
                  "assigned_to",
                  "کارشناس",
                  Object.fromEntries(
                    assignees.map((a) => [
                      a.id,
                      a.phone || a.email || "کارشناس",
                    ]),
                  ),
                )}
                {selectFilter("source", "منبع جذب", sources)}
                {tab === "opportunities"
                  ? selectFilter("stage", "مرحلهٔ فروش", stages)
                  : selectFilter("lead_status", "وضعیت لید", statuses)}
                <div className="grid gap-2">
                  <label htmlFor="crm-filter-tag" className="text-xs">
                    برچسب لید
                  </label>
                  <input
                    id="crm-filter-tag"
                    className="crm-control"
                    maxLength={60}
                    value={draft.tag || ""}
                    onChange={(e) =>
                      setDraft({ ...draft, tag: e.target.value })
                    }
                  />
                </div>
                {["date_from", "date_to"].map((key) => (
                  <div key={key} className="grid gap-2">
                    <label htmlFor={`crm-${key}`} className="text-xs">
                      {key === "date_from"
                        ? "ثبت از تاریخ"
                        : "ثبت تا تاریخ (ابتدای روز)"}
                    </label>
                    <input
                      id={`crm-${key}`}
                      type="date"
                      className="crm-control"
                      value={
                        draft[key as keyof Filters]
                          ? String(draft[key as keyof Filters]).slice(0, 10)
                          : ""
                      }
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          [key]: e.target.value
                            ? new Date(
                                `${e.target.value}T00:00:00`,
                              ).toISOString()
                            : "",
                        })
                      }
                    />
                  </div>
                ))}
                {tab === "activities" && (
                  <label className="flex items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      className="size-5 accent-primary"
                      checked={!!draft.overdue}
                      onChange={(e) =>
                        setDraft({ ...draft, overdue: e.target.checked })
                      }
                    />
                    فقط عقب‌افتاده‌ها
                  </label>
                )}
                <div className="flex items-end gap-2">
                  <Button type="submit">
                    <Search aria-hidden="true" />
                    اعمال فیلتر
                  </Button>
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => {
                      setDraft({});
                      setFilters({});
                      setPage(1);
                    }}
                  >
                    پاک‌کردن
                  </Button>
                </div>
              </form>
              <div className="mt-5 flex flex-wrap items-end gap-3 border-t border-border pt-5">
                <div className="grid gap-2">
                  <label htmlFor="crm-view-name" className="text-xs">
                    نام نمای جدید
                  </label>
                  <input
                    id="crm-view-name"
                    className="crm-control"
                    value={viewName}
                    onChange={(e) => setViewName(e.target.value)}
                    maxLength={100}
                  />
                </div>
                <Button
                  variant="outline"
                  disabled={viewName.trim().length < 2}
                  onClick={() => void saveView()}
                >
                  ذخیرهٔ نمای فعلی
                </Button>
                {views.map((view) => (
                  <div key={view.id} className="flex items-center gap-1">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setDraft(view.filters);
                        setFilters(view.filters);
                        setPage(1);
                      }}
                    >
                      {view.name}
                    </Button>
                    <Button
                      variant="ghost"
                      aria-label={`حذف نمای ${view.name}`}
                      onClick={() => {
                        void adminRequest(
                          `crm/views/${view.id}`,
                          "DELETE",
                          undefined,
                          view.version,
                        )
                          .then(() =>
                            setViews(views.filter((v) => v.id !== view.id)),
                          )
                          .catch((e) => setError(e.message));
                      }}
                    >
                      ×
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
        {busy && (
          <p role="status" className="mb-4 text-sm text-muted-foreground">
            در حال دریافت اطلاعات…
          </p>
        )}
        <TabsContent value="dashboard">
          {"total_leads" in data && <CrmDashboard data={data} />}
        </TabsContent>
        {["leads", "schools", "activities", "demos"].map((key) => (
          <TabsContent key={key} value={key}>
            <div className="crm-heading">
              <h2 className="text-xl font-semibold">{sections[key as Tab]}</h2>
              {key === "schools" ? (
                <Button onClick={() => setEditor({ resource: "schools" })}>
                  مدرسهٔ جدید
                </Button>
              ) : key === "leads" ? (
                <Link
                  prefetch={false}
                  href="/admin/leads"
                  className="text-sm text-primary"
                >
                  نمای درخواست‌های قبلی
                </Link>
              ) : (
                <p className="text-xs text-muted-foreground">
                  اقدام جدید را از پروندهٔ لید ثبت کنید.
                </p>
              )}
            </div>
            {tab === key &&
              (list.items.length
                ? table()
                : !busy && (
                    <p className="crm-empty">
                      رکوردی برای این فیلتر وجود ندارد.
                    </p>
                  ))}
          </TabsContent>
        ))}
        <TabsContent value="opportunities">
          <h2 className="mb-4 text-xl font-semibold">مسیر فرصت‌های فروش</h2>
          <Pipeline
            items={list.items as Opportunity[]}
            onEdit={(row) =>
              setEditor({ resource: "opportunities", initial: { ...row } })
            }
            onSaved={reload}
          />
        </TabsContent>
        <TabsContent value="notifications">
          <h2 className="mb-5 text-xl font-semibold">اعلان‌های شما</h2>
          <div className="grid gap-3">
            {(tab === "notifications"
              ? (list.items as Notification[])
              : []
            ).map((row) => (
              <article
                key={row.id}
                className={`crm-surface flex flex-wrap items-center justify-between gap-4 ${row.read_at ? "opacity-80" : "border-primary"}`}
              >
                <div className="flex gap-3">
                  <Bell
                    className="mt-1 text-primary"
                    size={20}
                    aria-hidden="true"
                  />
                  <div>
                    <Link
                      prefetch={false}
                      href={row.href}
                      className="font-semibold"
                    >
                      {noticeKinds[row.kind] || "پیگیری پرونده"}
                    </Link>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {date(row.created_at)}
                    </p>
                  </div>
                </div>
                {!row.read_at && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      void adminRequest(
                        `crm/notifications/${row.id}/read`,
                        "POST",
                      )
                        .then(reload)
                        .catch((e) => setError(e.message));
                    }}
                  >
                    خوانده شد
                  </Button>
                )}
              </article>
            ))}
          </div>
          {!busy && !list.items.length && (
            <p className="crm-empty">اعلانی ثبت نشده است.</p>
          )}
        </TabsContent>
        <TabsContent value="automations">
          <section className="crm-surface">
            <h2 className="mb-4 text-xl font-semibold">تخصیص و یادآوری</h2>
            <p className="mb-6 text-sm leading-8 text-muted-foreground">
              اعلان‌ها در همین پنل ثبت می‌شوند. یادآوری‌های ۲۴ ساعت آینده،
              کارهای عقب‌افتاده و فرصت‌های بدون پیگیری در چرخهٔ ساعتی بررسی
              می‌شوند.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void saveSettings();
              }}
              className="grid gap-5 tablet:grid-cols-2"
            >
              <fieldset disabled={!owner} className="contents">
                <legend className="sr-only">تنظیمات اتوماسیون فروش</legend>
                <label className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    className="size-5 accent-primary"
                    checked={settings.auto_assign}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        auto_assign: e.target.checked,
                      })
                    }
                  />
                  تخصیص خودکار درخواست جدید
                </label>
                <label className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    className="size-5 accent-primary"
                    checked={settings.reminders_enabled}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        reminders_enabled: e.target.checked,
                      })
                    }
                  />
                  یادآوری‌ها فعال باشند
                </label>
                <div className="grid gap-2">
                  <label htmlFor="crm-assignment-mode" className="text-sm">
                    روش تخصیص
                  </label>
                  <select
                    id="crm-assignment-mode"
                    className="crm-control"
                    value={settings.assignment_mode}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        assignment_mode: e.target
                          .value as Automations["assignment_mode"],
                      })
                    }
                  >
                    <option value="least_open">
                      کمترین لید باز در تیم فروش
                    </option>
                    <option value="fixed">کارشناس مشخص</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <label htmlFor="crm-fixed-assignee" className="text-sm">
                    کارشناس مشخص
                  </label>
                  <select
                    id="crm-fixed-assignee"
                    className="crm-control"
                    value={settings.fixed_assignee || ""}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        fixed_assignee: e.target.value || null,
                      })
                    }
                  >
                    <option value="">انتخاب کنید</option>
                    {assignees.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.phone || a.email}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-2">
                  <label htmlFor="crm-inactive-days" className="text-sm">
                    یادآوری فرصت بعد از چند روز بی‌فعالیتی
                  </label>
                  <input
                    id="crm-inactive-days"
                    type="number"
                    min={1}
                    max={90}
                    className="crm-control"
                    value={settings.inactive_days}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        inactive_days: Number(e.target.value),
                      })
                    }
                  />
                </div>
                {owner && (
                  <Button type="submit" className="self-end">
                    ذخیرهٔ اتوماسیون
                  </Button>
                )}
              </fieldset>
            </form>
            {!owner && (
              <p className="mt-5 text-sm text-muted-foreground">
                تنظیمات توسط مالک پنل مدیریت می‌شوند.
              </p>
            )}
          </section>
        </TabsContent>
        {!["dashboard", "automations"].includes(tab) &&
          list.pagination.pages > 1 && (
            <nav
              aria-label="صفحه‌های CRM"
              className="mt-6 flex items-center gap-3"
            >
              <Button
                variant="outline"
                disabled={page <= 1 || busy}
                onClick={() => setPage((p) => p - 1)}
              >
                قبلی
              </Button>
              <span className="text-sm">
                صفحهٔ {page.toLocaleString("fa-IR")} از{" "}
                {list.pagination.pages.toLocaleString("fa-IR")}
              </span>
              <Button
                variant="outline"
                disabled={page >= list.pagination.pages || busy}
                onClick={() => setPage((p) => p + 1)}
              >
                بعدی
              </Button>
            </nav>
          )}
      </Tabs>
      {editor && (
        <RecordEditor
          resource={editor.resource}
          initial={editor.initial}
          context={
            editor.initial?.lead_id
              ? {
                  lead_id: editor.initial.lead_id,
                  ...(editor.initial.school_id
                    ? { school_id: editor.initial.school_id }
                    : {}),
                }
              : undefined
          }
          assignees={assignees}
          onSaved={() => {
            reload();
            setMessage("اطلاعات ذخیره شد.");
          }}
          onClose={() => setEditor(null)}
        />
      )}
    </div>
  );
}
