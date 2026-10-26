"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive,
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  FilePlus2,
  FileText,
  Layers3,
  LoaderCircle,
  Plus,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { adminRequest } from "@/features/admin/client";
import { CmsReady } from "./ready";
import {
  ContentRow,
  contentKinds as kinds,
  contentStatuses,
} from "./content-row";
import type { AdminContent, CmsPage, CmsPayload } from "./types";

type Filters = { kind: string; status: string; search: string };
const blankFilters: Filters = { kind: "", status: "", search: "" };
const creationHelp = {
  page: "برای معرفی یک موضوع، خدمت یا کمپین، یک برگهٔ مستقل بسازید.",
  home: "محتوا و چیدمان صفحهٔ اصلی سایت را مدیریت کنید.",
  feature: "یکی از امکانات محصول را با وضعیت آمادگی دقیق معرفی کنید.",
  audience: "ارزش ماکان را برای یکی از گروه‌های مخاطب توضیح دهید.",
  faq: "یک سؤال و پاسخ برای بخش پرسش‌های متداول اضافه کنید.",
};
export function ContentList({ initial }: { initial: CmsPage<AdminContent> }) {
  const router = useRouter();
  const [data, setData] = useState(initial);
  const [filters, setFilters] = useState<Filters>(blankFilters);
  const [applied, setApplied] = useState<Filters>(blankFilters);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [creating, setCreating] = useState(false);
  const opener = useRef<HTMLElement | null>(null);
  const [createKind, setCreateKind] = useState<keyof typeof kinds>("page");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [archiveId, setArchiveId] = useState<string | null>(null);
  const filtered = !!(applied.kind || applied.status || applied.search);
  const first = data.items.length
    ? (data.pagination.page - 1) * data.pagination.page_size + 1
    : 0;
  const last = data.items.length ? first + data.items.length - 1 : 0;
  function openCreate(button: HTMLElement) {
    opener.current = button;
    setTitle("");
    setSlug("");
    setCreateKind("page");
    setMessage("");
    setCreating(true);
  }
  async function load(page = 1, next = filters) {
    setBusy(true);
    setMessage("");
    try {
      const query = new URLSearchParams({
        page: String(page),
        page_size: "20",
        q: next.search,
      });
      if (next.kind) query.set("kind", next.kind);
      if (next.status) query.set("status", next.status);
      setData(await adminRequest<CmsPage<AdminContent>>(`content?${query}`));
      setApplied({ ...next });
      setArchiveId(null);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "فهرست بارگذاری نشد.");
    } finally {
      setBusy(false);
    }
  }
  function reset() {
    setFilters(blankFilters);
    setNotice("");
    void load(1, blankFilters);
  }
  async function create() {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      let payload: CmsPayload;
      if (createKind === "faq")
        payload = {
          kind: "faq",
          question: title,
          answer: "پاسخ را در ویرایشگر کامل کنید.",
        };
      else if (createKind === "feature")
        payload = {
          kind: "feature",
          title,
          eyebrow: "",
          headline: title,
          summary: "",
          readiness: "roadmap",
          benefits: [],
          workflow: [],
          boundary: "",
          audience: "schools",
        };
      else if (createKind === "audience")
        payload = {
          kind: "audience",
          title,
          eyebrow: "",
          headline: title,
          summary: "",
          pains: [],
          benefits: [],
          journey: [],
          related: [],
          cta: "آشنایی با امکانات",
          cta_href: "/features",
          boundary: "",
        };
      else
        payload = {
          kind: createKind,
          headline: title,
          summary: "",
          sections:
            createKind === "home"
              ? [{ type: "hero", title, description: "", items: [] }]
              : [],
        };
      const result = await adminRequest<AdminContent>("content", "POST", {
        title,
        slug: slug.trim(),
        payload,
      });
      router.push(`/admin/content/${result.id}`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "محتوا ایجاد نشد.");
    } finally {
      setBusy(false);
    }
  }

  async function archive(item: AdminContent) {
    if (busy) return;
    setBusy(true);
    setMessage("");
    setNotice("");
    try {
      await adminRequest(
        `content/${item.id}`,
        "DELETE",
        undefined,
        item.row_version,
      );
      setArchiveId(null);
      await load(
        data.items.length === 1 && data.pagination.page > 1
          ? data.pagination.page - 1
          : data.pagination.page,
        applied,
      );
      setNotice("محتوا بایگانی شد؛ تاریخچهٔ نسخه‌ها محفوظ است.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "بایگانی انجام نشد.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <CmsReady disabled={busy} legend="مدیریت محتوای سایت">
      <div className="content-manager space-y-6">
        <nav
          aria-label="مسیر مدیریت محتوا"
          className="flex items-center gap-2 text-xs text-muted-foreground"
        >
          <Link
            href="/admin"
            className="min-h-11 content-center rounded hover:text-primary"
          >
            پیشخوان
          </Link>
          <ChevronLeft className="size-3" aria-hidden="true" />
          <span>محتوای سایت</span>
        </nav>
        <header className="flex flex-wrap items-center justify-between gap-5">
          <div>
            <p className="mb-2 text-xs font-medium text-primary">
              مرکز محتوای ماکان
            </p>
            <h1 className="text-2xl font-bold tracking-tight tablet:text-3xl">
              مدیریت محتوای سایت
            </h1>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              از اولین پیش‌نویس تا انتشار؛ همهٔ برگه‌ها و محتوای سایت در یک
              نگاه.
            </p>
          </div>
          <Button
            className="rounded-xl px-5"
            onClick={(event) => openCreate(event.currentTarget)}
          >
            <Plus aria-hidden="true" />
            افزودن محتوا
          </Button>
        </header>
        {message && !creating && (
          <p
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-7 text-destructive"
          >
            {message}
          </p>
        )}
        {notice && (
          <p
            role="status"
            className="flex items-center gap-2 rounded-xl border border-green-200 bg-success-soft p-4 text-sm leading-7 text-success"
          >
            <Check className="size-4 shrink-0" aria-hidden="true" />
            {notice}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50/60 px-5 py-3">
          <p className="hidden items-start gap-3 text-xs leading-7 text-primary-hover tablet:flex">
            <Layers3 className="mt-1.5 size-4 shrink-0" aria-hidden="true" />
            متن و چیدمان برگه‌ها در صفحه‌ساز قابل ویرایش‌اند؛ قالب‌ها و هویت
            بصری را در استودیوی طراحی مدیریت کنید.
          </p>
          <Link
            href="/admin/builder"
            className="inline-flex min-h-11 w-full items-center justify-between gap-2 rounded-lg text-xs font-semibold text-primary-hover tablet:w-auto tablet:justify-start"
          >
            استودیوی طراحی
            <ArrowLeft className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
        <section className="min-w-0" aria-labelledby="content-list-title">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h2 id="content-list-title" className="text-base font-bold">
                فهرست محتوا
              </h2>
              <span className="rounded-lg border border-border bg-white px-2.5 py-1 text-xs text-muted-foreground">
                {data.pagination.total.toLocaleString("fa-IR")} مورد
                {filtered ? " مطابق فیلتر" : ""}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              برگه‌ها، امکانات، مخاطبان و پرسش‌ها
            </p>
          </div>
          <div
            role="group"
            aria-label="نمایش بر اساس وضعیت"
            className="mb-4 flex flex-wrap gap-1.5"
          >
            {[["", "همه محتواها"], ...Object.entries(contentStatuses)].map(
              ([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={applied.status === value}
                  className="content-status-tab"
                  onClick={() => {
                    const next = { ...filters, status: value! };
                    setFilters(next);
                    setNotice("");
                    void load(1, next);
                  }}
                >
                  {label}
                </button>
              ),
            )}
          </div>
          <div className="overflow-hidden rounded-2xl border border-border bg-white">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                setNotice("");
                void load();
              }}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 border-b border-border p-4 tablet:grid-cols-[minmax(0,1fr)_160px_auto]"
            >
              <div className="col-span-2 min-w-0 space-y-2 tablet:col-span-1">
                <Label
                  htmlFor="cms-q"
                  className="text-xs text-muted-foreground"
                >
                  جست‌وجوی عنوان
                </Label>
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute start-3 top-3.5 size-4 text-slate-400"
                    aria-hidden="true"
                  />
                  <Input
                    id="cms-q"
                    placeholder="عنوان محتوا را جست‌وجو کنید…"
                    value={filters.search}
                    maxLength={100}
                    onChange={(event) =>
                      setFilters({ ...filters, search: event.target.value })
                    }
                    className="border-slate-200 ps-10"
                  />
                </div>
              </div>
              <div className="min-w-0 space-y-2">
                <Label
                  htmlFor="cms-kind"
                  className="text-xs text-muted-foreground"
                >
                  نوع محتوا
                </Label>
                <select
                  id="cms-kind"
                  className="min-h-11 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm"
                  value={filters.kind}
                  onChange={(event) =>
                    setFilters({ ...filters, kind: event.target.value })
                  }
                >
                  <option value="">همه انواع</option>
                  {Object.entries(kinds).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                variant="secondary"
                type="submit"
                disabled={busy}
                className="text-xs"
              >
                {busy ? (
                  <LoaderCircle
                    className="animate-spin motion-reduce:animate-none"
                    aria-hidden="true"
                  />
                ) : (
                  <SlidersHorizontal aria-hidden="true" />
                )}
                اعمال فیلتر
              </Button>
            </form>
            {filtered && (
              <div className="flex flex-wrap items-center gap-2 border-b border-border bg-slate-50/70 px-4 py-3 text-xs text-muted-foreground">
                <span>فیلترهای فعال:</span>
                {applied.search && (
                  <span className="max-w-full break-words rounded-md border border-border bg-white px-2 py-1">
                    «{applied.search}»
                  </span>
                )}
                {applied.kind && (
                  <span className="rounded-md border border-border bg-white px-2 py-1">
                    {kinds[applied.kind as keyof typeof kinds]}
                  </span>
                )}
                {applied.status && (
                  <span className="rounded-md border border-border bg-white px-2 py-1">
                    {
                      contentStatuses[
                        applied.status as keyof typeof contentStatuses
                      ]
                    }
                  </span>
                )}
                <button
                  onClick={reset}
                  className="ms-auto inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-primary-hover"
                >
                  <X className="size-3.5" aria-hidden="true" />
                  پاک کردن فیلترها
                </button>
              </div>
            )}
            <div className="relative" aria-busy={busy}>
              <div
                aria-hidden="true"
                className="content-row-grid content-list-head border-b border-border bg-slate-50/70 text-[11px] font-medium text-muted-foreground"
              >
                <span>عنوان و نوع محتوا</span>
                <span>وضعیت</span>
                <span>آخرین ویرایش</span>
                <span>عملیات</span>
              </div>
              {data.items.length ? (
                <ul
                  aria-label="محتواهای سایت"
                  className={busy ? "opacity-60" : ""}
                >
                  {data.items.map((item) => (
                    <ContentRow
                      key={item.id}
                      item={item}
                      busy={busy}
                      confirming={archiveId === item.id}
                      onArchive={() => {
                        setArchiveId(item.id);
                        setNotice("");
                        setMessage("");
                      }}
                      onCancel={() => setArchiveId(null)}
                      onConfirm={() => void archive(item)}
                    />
                  ))}
                </ul>
              ) : (
                <div className="grid justify-items-center px-5 py-14 text-center">
                  <span className="mb-4 grid size-14 place-items-center rounded-2xl bg-secondary text-primary">
                    {filtered ? (
                      <Search className="size-6" aria-hidden="true" />
                    ) : (
                      <FileText className="size-6" aria-hidden="true" />
                    )}
                  </span>
                  <h3 className="text-base font-semibold">
                    {filtered
                      ? "محتوایی با این مشخصات پیدا نشد"
                      : "اولین محتوای سایت را بسازید"}
                  </h3>
                  <p className="mb-5 mt-2 max-w-sm text-sm leading-7 text-muted-foreground">
                    {filtered
                      ? "عنوان، نوع یا وضعیت دیگری را امتحان کنید."
                      : "یک برگه، معرفی محصول یا پرسش متداول اضافه کنید و آن را برای انتشار آماده کنید."}
                  </p>
                  {filtered ? (
                    <Button variant="secondary" onClick={reset}>
                      نمایش همه محتواها
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      onClick={(event) => openCreate(event.currentTarget)}
                    >
                      <Plus aria-hidden="true" />
                      افزودن محتوا
                    </Button>
                  )}
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
              <p
                role="status"
                className="text-xs leading-7 text-muted-foreground"
              >
                نمایش {first.toLocaleString("fa-IR")} تا{" "}
                {last.toLocaleString("fa-IR")} از{" "}
                {data.pagination.total.toLocaleString("fa-IR")} محتوا
              </p>
              <nav
                aria-label="صفحه‌بندی محتوا"
                className="flex items-center gap-2"
              >
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="صفحه قبل"
                  disabled={busy || data.pagination.page <= 1}
                  onClick={() => void load(data.pagination.page - 1, applied)}
                >
                  <ChevronRight aria-hidden="true" />
                </Button>
                <span className="grid min-h-9 min-w-9 place-items-center rounded-lg border border-blue-100 bg-secondary px-2 text-xs font-semibold text-primary-hover">
                  {data.pagination.page.toLocaleString("fa-IR")}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="صفحه بعد"
                  disabled={
                    busy || data.pagination.page >= data.pagination.pages
                  }
                  onClick={() => void load(data.pagination.page + 1, applied)}
                >
                  <ChevronLeft aria-hidden="true" />
                </Button>
              </nav>
            </div>
          </div>
          <p className="mt-4 flex items-start gap-2 text-xs leading-7 text-muted-foreground">
            <Archive className="mt-1.5 size-3.5 shrink-0" aria-hidden="true" />
            بایگانی محتوا، سابقهٔ نسخه‌ها را نگه می‌دارد و نمایش عمومی آن را
            متوقف می‌کند.
          </p>
        </section>
        <Sheet
          open={creating}
          onOpenChange={(open) => {
            if (!busy) setCreating(open);
          }}
        >
          <SheetContent
            dir="rtl"
            className="w-full sm:max-w-md"
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              opener.current?.focus();
            }}
          >
            <SheetHeader className="border-b border-border p-6 pe-16">
              <span className="mb-2 grid size-11 place-items-center rounded-xl bg-secondary text-primary">
                <FilePlus2 className="size-5" aria-hidden="true" />
              </span>
              <SheetTitle>محتوای تازه بسازید</SheetTitle>
              <SheetDescription className="leading-7">
                ابتدا نوع، عنوان و آدرس را مشخص کنید؛ سپس وارد ویرایشگر می‌شوید.
              </SheetDescription>
            </SheetHeader>
            <form
              className="px-6 pb-6"
              onSubmit={(event) => {
                event.preventDefault();
                void create();
              }}
            >
              <CmsReady disabled={busy} legend="محتوای جدید">
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="new-content-kind">نوع محتوای جدید</Label>
                    <select
                      id="new-content-kind"
                      className="min-h-11 w-full min-w-0 rounded-lg border border-input bg-white px-3 text-sm"
                      value={createKind}
                      onChange={(event) =>
                        setCreateKind(event.target.value as keyof typeof kinds)
                      }
                    >
                      {Object.entries(kinds).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="rounded-xl bg-secondary p-4 text-xs leading-7 text-primary-hover">
                    {creationHelp[createKind]}
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="new-content-title">عنوان محتوای جدید</Label>
                    <Input
                      autoFocus
                      id="new-content-title"
                      required
                      value={title}
                      maxLength={180}
                      placeholder="مثلاً: راهکار ماکان برای مدرسه شما"
                      onChange={(event) => setTitle(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-content-slug">آدرس محتوای جدید</Label>
                    <Input
                      id="new-content-slug"
                      required
                      value={slug}
                      maxLength={160}
                      dir="ltr"
                      placeholder="school-guide"
                      onChange={(event) => setSlug(event.target.value)}
                    />
                    <p className="text-xs leading-7 text-muted-foreground">
                      یک نام کوتاه و خوانا وارد کنید؛ مانند school-guide. آدرس
                      کامل سایت را وارد نکنید.
                    </p>
                  </div>
                  {message && (
                    <p
                      role="alert"
                      className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-7 text-destructive"
                    >
                      {message}
                    </p>
                  )}
                  <Button
                    className="w-full rounded-xl"
                    type="submit"
                    disabled={busy || !title.trim() || !slug.trim()}
                  >
                    {busy ? (
                      <LoaderCircle
                        className="animate-spin motion-reduce:animate-none"
                        aria-hidden="true"
                      />
                    ) : (
                      <Plus aria-hidden="true" />
                    )}
                    ایجاد پیش‌نویس
                  </Button>
                  <p className="text-xs leading-7 text-muted-foreground">
                    پیش‌نویس در سایت عمومی دیده نمی‌شود. پس از تکمیل، می‌توانید
                    آن را پیش‌نمایش و منتشر کنید.
                  </p>
                </div>
              </CmsReady>
            </form>
          </SheetContent>
        </Sheet>
      </div>
    </CmsReady>
  );
}
