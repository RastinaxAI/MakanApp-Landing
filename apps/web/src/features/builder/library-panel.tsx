"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Tabs } from "radix-ui";
import {
  ArrowLeft,
  Check,
  FileStack,
  History,
  Layers3,
  LayoutTemplate,
  LoaderCircle,
  PanelBottom,
  PanelTop,
  Palette,
  Plus,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { AdminPageHeader } from "@/features/admin/page-kit";
import { adminRequest } from "@/features/admin/client";
import { CmsReady } from "@/features/cms/ready";
import type { AdminContent, CmsPage } from "@/features/cms/types";
import {
  defaultGlobals,
  emptyStyles,
  type BuilderSettings,
  type VisualDocument,
} from "./types";
import { LibraryBrandFields } from "./library-brand-fields";

export const purposeLabels = {
  page: "برگهٔ عمومی",
  template: "قالب برگه",
  section: "بخش قابل استفادهٔ مجدد",
  header: "سربرگ",
  footer: "پابرگ",
};
type Purpose = NonNullable<VisualDocument["purpose"]>;
const kinds = [
  {
    value: "template",
    label: "قالب برگه",
    description: "یک چیدمان کامل برای برگه‌های سایت",
    icon: LayoutTemplate,
  },
  {
    value: "section",
    label: "بخش آماده",
    description: "یک بخش برای استفاده در چند برگه",
    icon: Layers3,
  },
  {
    value: "header",
    label: "سربرگ",
    description: "طراحی بخش بالایی و منوی سایت",
    icon: PanelTop,
  },
  {
    value: "footer",
    label: "پابرگ",
    description: "طراحی بخش پایانی و لینک‌های سایت",
    icon: PanelBottom,
  },
] as const;
const fonts = { sans: "وزیرمتن", serif: "Serif", mono: "Monospace" };
const normalized = (value: string) =>
  value.replace(/ي/g, "ی").replace(/ك/g, "ک").trim().toLocaleLowerCase("fa");

export function BuilderLibrary({
  initial,
  settings,
  canManageSettings,
  parts,
  activePurpose = "",
}: {
  initial: CmsPage<AdminContent>;
  settings: BuilderSettings;
  canManageSettings: boolean;
  parts: AdminContent[];
  activePurpose?: string;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [purpose, setPurpose] = useState<Purpose>("template");
  const [current, setCurrent] = useState(settings);
  const [saved, setSaved] = useState(settings);
  const [tab, setTab] = useState("library");
  const [creating, setCreating] = useState(false);
  const createOpener = useRef<HTMLElement | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const dirty = JSON.stringify(current) !== JSON.stringify(saved);
  const rows = initial.items.filter(
    (row) =>
      normalized(row.title).includes(normalized(search)) &&
      (status === "all" ||
        (status === "published"
          ? !!row.published_revision_id
          : !row.published_revision_id)),
  );
  function start(kind: Purpose, opener: HTMLElement) {
    createOpener.current = opener;
    setPurpose(kind);
    setTitle("");
    setError("");
    setCreating(true);
  }
  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setNotice("");
    setError("");
    try {
      await action();
    } catch (error) {
      setError(error instanceof Error ? error.message : "عملیات انجام نشد.");
    } finally {
      setBusy(false);
    }
  }
  const feedback = (
    <>
      {notice && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-xl border border-green-200 bg-success-soft p-4 text-sm text-success"
        >
          <Check className="size-4 shrink-0" aria-hidden="true" />
          {notice}
        </p>
      )}
      {error && !creating && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-destructive"
        >
          {error}
        </p>
      )}
    </>
  );
  return (
    <div className="admin-page builder-library">
      <AdminPageHeader
        title="استودیوی طراحی سایت"
        eyebrow="فضای خلاقیت شما"
        description="طرح‌هایتان را بسازید، مرتب کنید و به سایت جان بدهید."
        actions={
          <Button
            onClick={(event) => start("template", event.currentTarget)}
            className="rounded-xl px-5"
          >
            <Plus aria-hidden="true" />
            ساخت طرح جدید
          </Button>
        }
      />
      {feedback}
      <Tabs.Root dir="rtl" value={tab} onValueChange={setTab}>
        <Tabs.List
          aria-label="بخش‌های استودیوی طراحی"
          className="mb-6 flex gap-5 border-b border-border"
        >
          <Tabs.Trigger className="library-tab" value="library">
            <LayoutTemplate className="size-4" aria-hidden="true" />
            کتابخانه طرح‌ها
          </Tabs.Trigger>
          {canManageSettings && (
            <Tabs.Trigger className="library-tab" value="settings">
              <SlidersHorizontal className="size-4" aria-hidden="true" />
              طراحی سراسری
            </Tabs.Trigger>
          )}
        </Tabs.List>
        <Tabs.Content value="library" className="outline-none">
          <section
            className="admin-help mb-6 flex flex-wrap items-center justify-between gap-3"
            aria-label="شروع طراحی"
          >
            <div>
              <h2 className="text-sm font-semibold">صفحه‌ساز دیداری ماکان</h2>
              <p className="mt-2 text-xs leading-7">
                عناصر را بکشید، محتوا را همان‌جا تغییر دهید و نتیجه را برای هر
                نمایشگر تنظیم کنید.
              </p>
            </div>
            <Link
              href="/admin/content"
              className="inline-flex min-h-11 items-center gap-2 rounded-lg text-xs font-semibold"
            >
              ویرایش برگه‌های سایت
              <ArrowLeft className="size-4" aria-hidden="true" />
            </Link>
          </section>
          <div className="grid min-w-0 items-start gap-6 min-[1200px]:grid-cols-[minmax(0,1fr)_260px]">
            <section className="min-w-0" aria-label="کتابخانه طرح‌ها">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <h2 className="text-base font-bold">طرح‌های شما</h2>
                  <span className="rounded-md bg-white px-2.5 py-1 text-xs text-muted-foreground">
                    {initial.pagination.total.toLocaleString("fa-IR")} مورد
                    {activePurpose
                      ? ` · ${purposeLabels[activePurpose as Purpose]}`
                      : ""}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  ذخیره‌شده در کتابخانه
                </p>
              </div>
              <nav aria-label="نوع طرح" className="mb-4 flex flex-wrap gap-1.5">
                <Link
                  aria-current={!activePurpose ? "page" : undefined}
                  href="/admin/builder"
                  className="library-filter"
                >
                  همه طرح‌ها
                </Link>
                {kinds.map((kind) => (
                  <Link
                    key={kind.value}
                    href={`/admin/builder?purpose=${kind.value}`}
                    aria-current={
                      activePurpose === kind.value ? "page" : undefined
                    }
                    className="library-filter"
                  >
                    {kind.label}
                  </Link>
                ))}
              </nav>
              <div className="mb-4 flex flex-wrap gap-3 rounded-xl border border-border bg-white p-3">
                <div className="relative min-w-0 flex-1 basis-40">
                  <Search
                    className="pointer-events-none absolute start-3 top-3.5 size-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    aria-label="جست‌وجوی طرح‌ها در این صفحه"
                    placeholder="جست‌وجوی نام طرح…"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="border-slate-200 ps-10 pe-10"
                  />
                  {search && (
                    <button
                      type="button"
                      aria-label="پاک کردن جست‌وجو"
                      onClick={() => setSearch("")}
                      className="absolute end-0 top-0 grid size-11 place-items-center rounded-lg text-muted-foreground"
                    >
                      <X className="size-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
                <select
                  aria-label="وضعیت طرح‌ها در این صفحه"
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  className="min-h-11 max-w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                >
                  <option value="all">همه وضعیت‌ها</option>
                  <option value="draft">پیش‌نویس</option>
                  <option value="published">دارای نسخهٔ منتشرشده</option>
                </select>
              </div>
              {initial.pagination.pages > 1 && (
                <p className="mb-3 text-xs leading-6 text-muted-foreground">
                  جست‌وجو و وضعیت روی{" "}
                  {initial.items.length.toLocaleString("fa-IR")} طرح این صفحه
                  اعمال می‌شوند؛ دسته‌بندی‌ها همهٔ کتابخانه را پوشش می‌دهند.
                </p>
              )}
              <p role="status" className="sr-only">
                {rows.length.toLocaleString("fa-IR")} طرح در این صفحه
              </p>
              {rows.length ? (
                <div className="grid gap-4 tablet:grid-cols-2">
                  {rows.map((row) => {
                    const kind =
                      row.payload.kind === "page"
                        ? row.payload.document?.purpose || "page"
                        : "page";
                    const Icon =
                      kinds.find((item) => item.value === kind)?.icon ||
                      FileStack;
                    const connected =
                      saved.header_page_id === row.id ||
                      saved.footer_page_id === row.id;
                    return (
                      <article
                        key={row.id}
                        className="library-design-card group flex min-w-0 flex-col rounded-xl border border-border bg-white p-5"
                        aria-label={row.title}
                      >
                        <div className="mb-5 flex items-center justify-between gap-2">
                          <span className="grid size-11 place-items-center rounded-xl border border-blue-100 bg-blue-50 text-primary">
                            <Icon className="size-5" aria-hidden="true" />
                          </span>
                          <span
                            className={`rounded-md px-2 py-1 text-[11px] ${row.published_revision_id ? "bg-success-soft text-success" : "bg-slate-100 text-slate-600"}`}
                          >
                            {row.published_revision_id
                              ? "نسخهٔ منتشرشده"
                              : "پیش‌نویس"}
                          </span>
                        </div>
                        <h3 className="break-words text-sm font-bold leading-7">
                          <Link
                            href={`/admin/content/${row.id}/builder`}
                            className="rounded hover:text-primary-hover"
                          >
                            {row.title}
                          </Link>
                        </h3>
                        <p className="mb-3 mt-1 text-xs leading-6 text-muted-foreground">
                          {purposeLabels[kind]} · نسخهٔ{" "}
                          {row.revision_no.toLocaleString("fa-IR")}
                        </p>
                        <p className="mb-5 text-xs leading-6 text-muted-foreground">
                          آخرین ویرایش:{" "}
                          <time dateTime={row.updated_at}>
                            {new Date(row.updated_at).toLocaleDateString(
                              "fa-IR",
                              {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                                timeZone: "Asia/Tehran",
                              },
                            )}
                          </time>
                          {connected && (
                            <span className="mt-2 flex items-center gap-1 text-success">
                              <Check className="size-3" aria-hidden="true" />
                              متصل به سایت
                            </span>
                          )}
                        </p>
                        <div className="mt-auto flex flex-wrap items-center justify-between gap-1 border-t border-border pt-3">
                          <Link
                            href={`/admin/content/${row.id}/builder`}
                            className="inline-flex min-h-11 items-center gap-1 rounded-lg text-xs font-semibold text-primary-hover"
                          >
                            ویرایش با صفحه‌ساز
                            <ArrowLeft
                              className="size-3.5"
                              aria-hidden="true"
                            />
                          </Link>
                          <Link
                            href={`/admin/content/${row.id}/revisions`}
                            aria-label={`نسخه‌های ${row.title}`}
                            className="grid size-11 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-primary-hover"
                          >
                            <History className="size-4" aria-hidden="true" />
                          </Link>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="grid justify-items-center rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center">
                  <span className="mb-5 grid size-16 place-items-center rounded-2xl bg-secondary text-primary">
                    <LayoutTemplate className="size-7" aria-hidden="true" />
                  </span>
                  <h3 className="text-base font-semibold">
                    {search || status !== "all"
                      ? "طرحی با این مشخصات پیدا نشد"
                      : "جای طرح بعدی شما اینجاست"}
                  </h3>
                  <p className="mb-5 mt-2 max-w-sm text-sm leading-7 text-muted-foreground">
                    {search || status !== "all"
                      ? "نام یا وضعیت دیگری را امتحان کنید."
                      : "یک قالب کامل بسازید یا بخش‌هایی طراحی کنید که در چند برگه استفاده شوند."}
                  </p>
                  {search || status !== "all" ? (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setSearch("");
                        setStatus("all");
                      }}
                    >
                      پاک کردن فیلترها
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      onClick={(event) =>
                        start(
                          (activePurpose || "template") as Purpose,
                          event.currentTarget,
                        )
                      }
                    >
                      <Plus aria-hidden="true" />
                      ساخت اولین طرح
                    </Button>
                  )}
                </div>
              )}
              {initial.pagination.pages > 1 && (
                <nav
                  className="mt-5 flex flex-wrap gap-2"
                  aria-label="صفحات کتابخانه"
                >
                  {Array.from(
                    { length: initial.pagination.pages },
                    (_, index) => (
                      <Link
                        key={index}
                        aria-current={
                          initial.pagination.page === index + 1
                            ? "page"
                            : undefined
                        }
                        className="library-filter grid size-11 place-items-center"
                        href={`/admin/builder?page=${index + 1}${activePurpose ? `&purpose=${activePurpose}` : ""}`}
                      >
                        {(index + 1).toLocaleString("fa-IR")}
                      </Link>
                    ),
                  )}
                </nav>
              )}
            </section>
            <aside aria-label="راهنمای طراحی" className="space-y-4">
              <section className="rounded-2xl border border-border bg-white p-5">
                <span className="mb-4 grid size-10 place-items-center rounded-xl bg-secondary text-primary">
                  <Palette className="size-5" aria-hidden="true" />
                </span>
                <h2 className="text-sm font-bold">یک هویت، در تمام سایت</h2>
                <p className="mb-4 mt-2 text-xs leading-7 text-muted-foreground">
                  رنگ‌ها و فونت مشترک، طرح‌هایتان را هماهنگ نگه می‌دارند.
                </p>
                <div
                  className="mb-4 flex flex-wrap gap-2"
                  aria-label="رنگ‌های ذخیره‌شده سایت"
                >
                  {Object.entries(saved.globals.colors).map(([name, color]) => (
                    <span
                      key={name}
                      title={`${name}: ${color}`}
                      className="size-7 rounded-full border border-slate-200"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <p className="mb-3 text-xs text-muted-foreground">
                  فونت فعلی:{" "}
                  <strong className="font-medium text-foreground">
                    {fonts[saved.globals.font]}
                  </strong>
                </p>
                {canManageSettings && (
                  <Button
                    variant="ghost"
                    className="w-full justify-between px-0 text-xs text-primary-hover"
                    onClick={() => setTab("settings")}
                  >
                    تنظیم هویت بصری
                    <ArrowLeft aria-hidden="true" />
                  </Button>
                )}
              </section>
              <section className="rounded-2xl border border-border bg-white p-5">
                <h2 className="mb-4 text-sm font-bold">از کجا شروع کنم؟</h2>
                <ol className="space-y-4">
                  {[
                    "نوع طرح را انتخاب کنید.",
                    "با کشیدن عناصر طراحی کنید.",
                    "ذخیره کنید و هرجا خواستید به کار ببرید.",
                  ].map((text, index) => (
                    <li
                      key={text}
                      className="flex gap-3 text-xs leading-6 text-muted-foreground"
                    >
                      <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-slate-100 font-semibold text-slate-600">
                        {(index + 1).toLocaleString("fa-IR")}
                      </span>
                      {text}
                    </li>
                  ))}
                </ol>
              </section>
            </aside>
          </div>
        </Tabs.Content>
        {canManageSettings && (
          <Tabs.Content value="settings" className="outline-none">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void run(async () => {
                  const { row_version, ...payload } = current;
                  const updated = await adminRequest<BuilderSettings>(
                    "builder/settings",
                    "PATCH",
                    payload,
                    row_version,
                  );
                  setCurrent(updated);
                  setSaved(updated);
                  setNotice("رنگ‌ها، فونت و اتصال سربرگ/پابرگ ذخیره شدند.");
                  router.refresh();
                });
              }}
            >
              <CmsReady disabled={busy} legend="تنظیمات طراحی سایت">
                <div className="grid items-start gap-6 min-[1200px]:grid-cols-[minmax(0,1fr)_260px]">
                  <div className="space-y-5">
                    <section className="rounded-2xl border border-border bg-white p-5 tablet:p-7">
                      <h2 className="text-lg font-bold">رنگ و تایپوگرافی</h2>
                      <p className="mb-6 mt-2 text-sm leading-7 text-muted-foreground">
                        هویت مشترک طرح‌هایی که از تنظیمات سراسری استفاده
                        می‌کنند.
                      </p>
                      <LibraryBrandFields
                        value={current.globals}
                        onChange={(globals) =>
                          setCurrent({ ...current, globals })
                        }
                      />
                    </section>
                    <section className="rounded-2xl border border-border bg-white p-5 tablet:p-7">
                      <h2 className="text-lg font-bold">قاب سایت شما</h2>
                      <p className="mb-6 mt-2 text-sm leading-7 text-muted-foreground">
                        یک سربرگ و پابرگ مشترک برای تمام صفحات عمومی انتخاب
                        کنید.
                      </p>
                      <div className="grid gap-5 tablet:grid-cols-2">
                        {(["header", "footer"] as const).map((role) => {
                          const Icon =
                            role === "header" ? PanelTop : PanelBottom;
                          return (
                            <div
                              key={role}
                              className="rounded-xl border border-border p-4"
                            >
                              <div className="mb-4 flex items-center justify-between">
                                <span className="flex items-center gap-2 text-sm font-semibold">
                                  <Icon
                                    className="size-5 text-primary"
                                    aria-hidden="true"
                                  />
                                  {purposeLabels[role]}
                                </span>
                                <button
                                  type="button"
                                  onClick={(event) =>
                                    start(role, event.currentTarget)
                                  }
                                  className="inline-flex min-h-11 items-center gap-1 rounded text-xs text-primary-hover"
                                >
                                  <Plus
                                    className="size-3.5"
                                    aria-hidden="true"
                                  />
                                  ساخت تازه
                                </button>
                              </div>
                              <label className="grid gap-2 text-xs text-muted-foreground">
                                طرح متصل به سایت
                                <select
                                  aria-label={`اتصال ${purposeLabels[role]}`}
                                  className="min-h-11 w-full min-w-0 rounded-lg border border-input bg-white px-2 text-sm text-foreground"
                                  value={current[`${role}_page_id`] || ""}
                                  onChange={(event) =>
                                    setCurrent({
                                      ...current,
                                      [`${role}_page_id`]:
                                        event.target.value || null,
                                    })
                                  }
                                >
                                  <option value="">طرح فعلی سایت</option>
                                  {parts
                                    .filter(
                                      (row) =>
                                        row.payload.kind === "page" &&
                                        row.payload.document?.purpose ===
                                          role &&
                                        row.published_revision_id,
                                    )
                                    .map((row) => (
                                      <option key={row.id} value={row.id}>
                                        {row.title}
                                      </option>
                                    ))}
                                </select>
                              </label>
                            </div>
                          );
                        })}
                      </div>
                      <p className="mt-5 rounded-xl bg-slate-50 p-4 text-xs leading-7 text-muted-foreground">
                        فقط طرح‌های منتشرشده قابل اتصال هستند. تغییر پیش‌نویس
                        روی سایت نمایش داده نمی‌شود؛ با انتخاب «طرح فعلی سایت»
                        به طراحی اصلی برمی‌گردید.
                      </p>
                    </section>
                  </div>
                  <aside className="rounded-2xl border border-blue-100 bg-white p-5">
                    <Palette
                      className="mb-4 size-6 text-primary"
                      aria-hidden="true"
                    />
                    <h2 className="text-sm font-bold">
                      هماهنگ، تا آخرین جزئیات
                    </h2>
                    <p className="mb-5 mt-2 text-xs leading-7 text-muted-foreground">
                      تنظیمات را بررسی کنید، سپس برای اعمال روی سایت ذخیره کنید.
                    </p>
                    <p className="mb-4 text-xs text-muted-foreground">
                      {dirty
                        ? "تغییرات ذخیره‌نشده دارید."
                        : "تنظیمات با نسخهٔ ذخیره‌شده هماهنگ است."}
                    </p>
                    <Button
                      type="submit"
                      className="w-full text-xs"
                      disabled={busy || !dirty}
                    >
                      {busy ? (
                        <LoaderCircle
                          className="animate-spin motion-reduce:animate-none"
                          aria-hidden="true"
                        />
                      ) : (
                        <Check aria-hidden="true" />
                      )}
                      ذخیره طراحی سراسری
                    </Button>
                  </aside>
                </div>
              </CmsReady>
            </form>
          </Tabs.Content>
        )}
      </Tabs.Root>
      <Sheet
        open={creating}
        onOpenChange={(value) => {
          if (!busy) setCreating(value);
        }}
      >
        <SheetContent
          dir="rtl"
          className="admin-drawer w-full sm:max-w-md"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            createOpener.current?.focus();
          }}
        >
          <SheetHeader className="border-b border-border p-6 pe-16">
            <SheetTitle>یک طرح تازه بسازید</SheetTitle>
            <SheetDescription className="leading-7">
              نوع و نام طرح را مشخص کنید؛ ادامهٔ کار روی بوم طراحی است.
            </SheetDescription>
          </SheetHeader>
          <form
            className="px-6 pb-6"
            onSubmit={(event) => {
              event.preventDefault();
              void run(async () => {
                const row = await adminRequest<AdminContent>(
                  "content",
                  "POST",
                  {
                    title,
                    slug: `builder-${purpose}-${crypto.randomUUID()}`,
                    payload: {
                      kind: "page",
                      headline: title,
                      summary: "",
                      sections: [],
                      document: {
                        schema_version: 2,
                        purpose,
                        globals: defaultGlobals,
                        nodes: [
                          {
                            id: `Container_${crypto.randomUUID()}`,
                            type: "Container",
                            version: 1,
                            props: {},
                            styles: {
                              ...emptyStyles(),
                              base: {
                                display: "flex",
                                direction: "column",
                                gap: 24,
                                padding: 24,
                              },
                            },
                            children: [],
                          },
                        ],
                      },
                    },
                    seo: { title: "", description: "", indexable: false },
                    visibility: true,
                    sort_order: 0,
                  },
                );
                router.push(`/admin/content/${row.id}/builder`);
              });
            }}
          >
            <CmsReady disabled={busy} legend="ایجاد قالب یا بخش">
              <div className="space-y-5">
                <label className="grid gap-2 text-sm font-medium">
                  کاربرد طرح
                  <select
                    aria-label="کاربرد قالب تازه"
                    value={purpose}
                    onChange={(event) =>
                      setPurpose(event.target.value as Purpose)
                    }
                    className="min-h-11 rounded-lg border border-input bg-white px-3"
                  >
                    {kinds.map((kind) => (
                      <option key={kind.value} value={kind.value}>
                        {kind.label}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="rounded-xl bg-secondary p-4 text-sm leading-7 text-primary-hover">
                  {kinds.find((kind) => kind.value === purpose)?.description}
                </p>
                <label className="grid gap-2 text-sm font-medium">
                  نام طرح
                  <Input
                    autoFocus
                    aria-label="نام قالب تازه"
                    required
                    maxLength={180}
                    placeholder="مثلاً: سربرگ اصلی سایت"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                  />
                </label>
                {error && (
                  <p
                    role="alert"
                    className="rounded-lg bg-red-50 p-3 text-sm text-destructive"
                  >
                    {error}
                  </p>
                )}
                <Button
                  type="submit"
                  disabled={busy || !title.trim()}
                  className="w-full rounded-xl text-xs"
                >
                  {busy ? (
                    <LoaderCircle
                      className="animate-spin motion-reduce:animate-none"
                      aria-hidden="true"
                    />
                  ) : (
                    <ArrowLeft aria-hidden="true" />
                  )}
                  ساخت و بازکردن صفحه‌ساز
                </Button>
                <p className="text-xs leading-7 text-muted-foreground">
                  طرح تازه به‌صورت پیش‌نویس ذخیره می‌شود و تا انتشار در سایت
                  نمایش داده نمی‌شود.
                </p>
              </div>
            </CmsReady>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
