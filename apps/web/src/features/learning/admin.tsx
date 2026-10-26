"use client";
import { useState } from "react";
import {
  BookOpen,
  FileText,
  Film,
  Layers3,
  Plus,
  Search,
  ArrowLeft,
  Tags,
} from "lucide-react";
import {
  AdminPageHeader,
  AdminPanel,
  AdminEmpty,
} from "@/features/admin/page-kit";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as z from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { CmsReady } from "@/features/cms/ready";
import { TextField, MediaPicker } from "@/features/cms/fields";
import { RichEditor } from "@/features/cms/rich-editor";
import { adminRequest } from "@/features/admin/client";
import type { CmsPage, CmsSeo, MediaAsset } from "@/features/cms/types";
import type { Revision } from "@/features/cms/revisions-panel";
import {
  audiences,
  levels,
  topics,
  resourceFor,
  initialPayload,
  type LearningAdmin,
  type LearningPayload,
  type Taxonomy,
} from "./types";

export const kindLabels = {
  article: "آموزش متنی",
  video: "ویدیوی آپارات",
  series: "مجموعه آموزشی",
  blog: "مقاله وبلاگ",
} as const;
const stateLabels = {
  draft: "پیش‌نویس",
  published: "منتشرشده",
  scheduled: "زمان‌بندی‌شده",
  archived: "بایگانی",
};
export function LearningList({
  kind,
  data,
  query = "",
  status = "",
}: {
  kind: LearningPayload["kind"];
  data: CmsPage<LearningAdmin>;
  query?: string;
  status?: string;
}) {
  const icons = {
    article: BookOpen,
    video: Film,
    series: Layers3,
    blog: FileText,
  };
  const Icon = icons[kind];
  const link = (page: number) => {
    const q = new URLSearchParams({ kind, page: String(page) });
    if (query) q.set("q", query);
    if (status) q.set("status", status);
    return `/admin/learn?${q}`;
  };
  return (
    <div className="admin-page">
      <AdminPageHeader
        title="آموزش و وبلاگ"
        eyebrow="مرکز محتوای آموزشی"
        icon={BookOpen}
        description="مقاله‌ها، ویدیوها و مجموعه‌ها را برای یادگیری بهتر مخاطبان آماده و منتشر کنید."
        actions={
          <Button asChild>
            <Link href={`/admin/learn/new?kind=${kind}`}>
              <Plus aria-hidden="true" />
              ایجاد {kindLabels[kind]}
            </Link>
          </Button>
        }
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="admin-tabs" aria-label="نوع محتوای مدیریت">
          {Object.entries(kindLabels).map(([key, value]) => {
            const TabIcon = icons[key as keyof typeof icons];
            return (
              <Link
                key={key}
                className="admin-tab"
                aria-current={kind === key ? "page" : undefined}
                href={`/admin/learn?kind=${key}`}
              >
                <TabIcon className="size-4" aria-hidden="true" />
                {value}
              </Link>
            );
          })}
        </nav>
        <Link
          href="/admin/learn/taxonomy"
          className="inline-flex min-h-11 items-center gap-2 rounded-lg text-xs text-primary-hover"
        >
          <Tags className="size-4" aria-hidden="true" />
          مدیریت دسته‌ها و برچسب‌ها
        </Link>
      </div>
      <AdminPanel
        title={`${kindLabels[kind]}‌ها`}
        count={data.pagination.total}
      >
        <form
          action="/admin/learn"
          className="mb-5 grid items-end gap-3 tablet:grid-cols-[minmax(0,1fr)_160px_auto]"
        >
          <input type="hidden" name="kind" value={kind} />
          <label className="grid min-w-0 gap-2 text-xs text-muted-foreground">
            جست‌وجوی عنوان
            <div className="relative">
              <Search
                className="pointer-events-none absolute start-3 top-3.5 size-4"
                aria-hidden="true"
              />
              <input
                name="q"
                defaultValue={query}
                maxLength={100}
                placeholder="عنوان آموزش را جست‌وجو کنید…"
                className="min-h-11 w-full rounded-lg border border-slate-200 bg-white ps-10 pe-3 text-sm text-foreground"
              />
            </div>
          </label>
          <label className="grid min-w-0 gap-2 text-xs text-muted-foreground">
            وضعیت
            <select
              name="status"
              aria-label="وضعیت"
              defaultValue={status}
              className="min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-foreground"
            >
              <option value="">فعال</option>
              {Object.entries(stateLabels).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <Button type="submit" variant="secondary">
            جست‌وجو
          </Button>
        </form>
        {data.items.length ? (
          <ul className="admin-record-list" aria-label="محتواهای آموزشی">
            {data.items.map((item) => (
              <li className="admin-record" key={item.id}>
                <div className="flex min-w-0 items-start gap-3">
                  <span className="admin-page-symbol">
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="break-words text-sm font-semibold leading-7">
                      {item.title}
                    </h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      نسخهٔ {item.revision_no.toLocaleString("fa-IR")} ·{" "}
                      <time dateTime={item.updated_at}>
                        {new Date(item.updated_at).toLocaleDateString("fa-IR", {
                          timeZone: "Asia/Tehran",
                        })}
                      </time>
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={`admin-pill ${item.publication_state === "published" ? "bg-success-soft text-success" : "bg-slate-100 text-slate-600"}`}
                  >
                    {stateLabels[item.publication_state]}
                  </span>
                  <Link
                    className="inline-flex min-h-11 items-center gap-2 rounded-lg text-xs font-semibold text-primary-hover"
                    href={`/admin/learn/${item.id}?kind=${item.kind}`}
                  >
                    ویرایش {item.title}
                    <ArrowLeft className="size-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <AdminEmpty
            title="هنوز محتوایی در این فهرست نیست"
            description="آموزش تازه‌ای بسازید یا فیلترهای جست‌وجو را تغییر دهید."
            icon={Icon}
          >
            <Button asChild variant="secondary">
              <Link href={`/admin/learn/new?kind=${kind}`}>
                ایجاد {kindLabels[kind]}
              </Link>
            </Button>
          </AdminEmpty>
        )}
      </AdminPanel>
      <nav
        aria-label="صفحه‌بندی مدیریت"
        className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground"
      >
        <span>
          صفحه {data.pagination.page.toLocaleString("fa-IR")} از{" "}
          {Math.max(1, data.pagination.pages).toLocaleString("fa-IR")}
        </span>
        <div className="flex gap-3">
          {[data.pagination.page - 1, data.pagination.page + 1]
            .filter((p) => p > 0 && p <= data.pagination.pages)
            .map((p) => (
              <Link
                key={p}
                href={link(p)}
                className="inline-flex min-h-11 items-center rounded-lg border border-border bg-white px-4 text-primary-hover"
              >
                صفحه {p.toLocaleString("fa-IR")}
              </Link>
            ))}
        </div>
      </nav>
    </div>
  );
}
function cleaned(payload: LearningPayload) {
  const next = { ...payload };
  delete next.toc;
  return next;
}
export function LearningEditor({
  initial,
  kind,
  assets,
  categories,
  tags,
  contents,
  created = false,
}: {
  initial?: LearningAdmin;
  kind: LearningPayload["kind"];
  assets: MediaAsset[];
  categories: Taxonomy[];
  tags: Taxonomy[];
  contents: LearningAdmin[];
  created?: boolean;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState(initial);
  const [payload, setPayload] = useState(
    initial ? cleaned(initial.payload) : initialPayload(kind),
  );
  const [slug, setSlug] = useState(initial?.slug || "");
  const [title, setTitle] = useState(initial?.title || "");
  const [seo, setSeo] = useState<CmsSeo>(
    initial?.seo || {
      title: "",
      description: "",
      indexable: false,
      og_media_id: null,
    },
  );
  const [visibility, setVisibility] = useState(initial?.visibility ?? true);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(
    created ? "نسخه جدید ذخیره شد؛ برای عمومی‌شدن، انتشار را انتخاب کنید." : "",
  );
  const [navigating, setNavigating] = useState(false);
  const [schedule, setSchedule] = useState("");
  const [history, setHistory] = useState<CmsPage<Revision> | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const resource = resourceFor(kind);
  const readonly = current?.is_archived || false;
  function change<K extends keyof LearningPayload>(
    key: K,
    value: LearningPayload[K],
  ) {
    setPayload((p) => ({ ...p, [key]: value }));
    setDirty(true);
  }
  const domain = kind === "blog" ? "blog" : "learn";
  async function run(operation: () => Promise<void>) {
    setBusy(true);
    setMessage("");
    try {
      await operation();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "عملیات انجام نشد.");
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    await run(async () => {
      const validation = z
        .object({
          slug: z
            .string()
            .min(1)
            .max(160)
            .regex(/^[\p{L}\p{N}_]+(?:-[\p{L}\p{N}_]+)*$/u),
          title: z.string().trim().min(1).max(180),
          headline: z.string().trim().min(1).max(180),
        })
        .safeParse({ slug, title, headline: payload.headline });
      if (!validation.success)
        throw new Error("عنوان، عنوان عمومی و آدرس معتبر را وارد کنید.");
      const body = {
        slug,
        title,
        payload: cleaned(payload),
        seo,
        visibility,
        sort_order: initial?.sort_order || 0,
      };
      const next = await adminRequest<LearningAdmin>(
        `${resource}${current ? `/${current.id}` : ""}`,
        current ? "PATCH" : "POST",
        body,
        current?.row_version,
      );
      setCurrent(next);
      setPayload(cleaned(next.payload));
      setDirty(false);
      setMessage("نسخه جدید ذخیره شد؛ برای عمومی‌شدن، انتشار را انتخاب کنید.");
      if (!current) {
        setNavigating(true);
        router.replace(`/admin/learn/${next.id}?kind=${kind}&created=1`);
      }
    });
  }
  async function transition(action: string, revision_id?: string) {
    if (!current) return;
    await run(async () => {
      let body: unknown = undefined;
      if (action === "publish")
        body = { revision_id: revision_id || current.revision_id };
      if (action === "schedule") {
        const time = new Date(schedule);
        if (!schedule || Number.isNaN(time.getTime()))
          throw new Error("زمان انتشار معتبر را انتخاب کنید.");
        body = {
          revision_id: current.revision_id,
          publish_at: time.toISOString(),
        };
      }
      const next = await adminRequest<LearningAdmin>(
        `${resource}/${current.id}${action === "archive" ? "" : `/${action}`}`,
        action === "archive" ? "DELETE" : "POST",
        body,
        current.row_version,
      );
      setCurrent(next);
      setConfirm(null);
      setMessage("وضعیت انتشار به‌روز شد.");
    });
  }
  function checks(
    label: string,
    values: string[],
    items: { id: string; title: string }[],
    key: "category_ids" | "tag_ids" | "related_ids" | "item_ids",
  ) {
    return (
      <fieldset className="space-y-2 rounded-xl border border-border p-4">
        <legend className="px-2">{label}</legend>
        {items.length ? (
          items.map((item) => (
            <label key={item.id} className="flex min-h-11 items-center gap-3">
              <input
                type="checkbox"
                checked={values.includes(item.id)}
                onChange={(e) =>
                  change(
                    key,
                    e.target.checked
                      ? [...values, item.id]
                      : values.filter((id) => id !== item.id),
                  )
                }
              />
              {item.title}
            </label>
          ))
        ) : (
          <p className="text-muted-foreground">موردی ثبت نشده است.</p>
        )}
      </fieldset>
    );
  }
  function select<K extends "level" | "topic">(
    key: K,
    label: string,
    items: Record<string, string>,
  ) {
    return (
      <label className="space-y-2">
        <span className="block">{label}</span>
        <select
          className="min-h-11 w-full rounded-lg border border-input bg-card px-3"
          value={payload[key]}
          onChange={(e) => change(key, e.target.value as LearningPayload[K])}
        >
          {Object.entries(items).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </label>
    );
  }
  return (
    <CmsReady disabled={busy || navigating}>
      <div className="admin-page">
        <AdminPageHeader
          title={`${initial ? "ویرایش" : "ایجاد"} ${kindLabels[kind]}`}
          eyebrow="مرکز محتوای آموزشی"
          description="محتوا، رسانه و مشخصات انتشار را آماده کنید؛ پیش‌نویس و نسخهٔ عمومی جداگانه نگه‌داری می‌شوند."
          back={{ href: `/admin/learn?kind=${kind}`, label: "بازگشت به فهرست" }}
        />
        {message && (
          <p role="status" className="rounded-xl bg-secondary p-4 leading-8">
            {message}
          </p>
        )}
        {current && (
          <p>
            وضعیت: {stateLabels[current.publication_state]} · نسخه{" "}
            {current.revision_no.toLocaleString("fa-IR")}
            {dirty ? " · تغییرات ذخیره‌نشده" : ""}
          </p>
        )}
        <fieldset
          disabled={readonly}
          className="admin-editor-surface space-y-6"
        >
          <legend className="sr-only">اطلاعات محتوا</legend>
          <div className="grid gap-5 tablet:grid-cols-2">
            <TextField
              label="عنوان مدیریتی"
              value={title}
              maxLength={180}
              onChange={(v) => {
                setTitle(v);
                setDirty(true);
              }}
            />
            <TextField
              label="آدرس (Slug)"
              dir="ltr"
              value={slug}
              maxLength={160}
              disabled={
                !!current?.published_revision_id ||
                !!current?.scheduled_revision_id
              }
              onChange={(v) => {
                setSlug(v);
                setDirty(true);
              }}
            />
          </div>
          <TextField
            label="عنوان عمومی"
            value={payload.headline}
            maxLength={180}
            onChange={(v) => change("headline", v)}
          />
          <TextField
            label="چکیده"
            value={payload.summary}
            multiline
            onChange={(v) => change("summary", v)}
          />
          <MediaPicker
            label="تصویر شاخص / پوستر"
            value={payload.cover_media_id}
            onChange={(v) => change("cover_media_id", v)}
            assets={assets}
          />
          <div className="grid gap-5 tablet:grid-cols-3">
            {select("level", "سطح آموزش", levels)}
            {select("topic", "موضوع", topics)}
            <label className="space-y-2">
              <span className="block">زمان مطالعه (دقیقه)</span>
              <input
                className="min-h-11 w-full rounded-lg border border-input bg-card px-3"
                type="number"
                min={1}
                max={600}
                value={payload.estimated_minutes}
                onChange={(e) =>
                  change("estimated_minutes", Number(e.target.value))
                }
              />
            </label>
          </div>
          <fieldset className="rounded-xl border border-border p-4">
            <legend className="px-2">نقش مخاطب</legend>
            <div className="flex flex-wrap gap-5">
              {Object.entries(audiences).map(([key, value]) => (
                <label
                  key={key}
                  className="inline-flex min-h-11 items-center gap-3"
                >
                  <input
                    type="checkbox"
                    checked={payload.audiences.includes(
                      key as keyof typeof audiences,
                    )}
                    onChange={(e) =>
                      change(
                        "audiences",
                        e.target.checked
                          ? [
                              ...payload.audiences,
                              key as keyof typeof audiences,
                            ]
                          : payload.audiences.filter((a) => a !== key),
                      )
                    }
                  />
                  {value}
                </label>
              ))}
            </div>
          </fieldset>
          {kind === "video" && (
            <fieldset className="space-y-5 rounded-xl border border-border bg-card p-5">
              <legend className="px-2">مشخصات تأییدشده آپارات</legend>
              <p className="leading-8 text-muted-foreground">
                این اطلاعات را از ویدیوی واقعی وارد کنید. سیستم اطلاعات ویدیو را
                حدس نمی‌زند و HTML پلیر نمی‌پذیرد.
              </p>
              <TextField
                label="شناسه یا لینک آپارات"
                value={payload.aparat_id || ""}
                dir="ltr"
                maxLength={200}
                onChange={(v) => change("aparat_id", v || null)}
              />
              <label className="block space-y-2">
                <span className="block">مدت ویدیو (ثانیه)</span>
                <input
                  type="number"
                  min={1}
                  max={86400}
                  className="min-h-11 w-full rounded-lg border border-input px-3"
                  value={payload.duration_seconds ?? ""}
                  onChange={(e) =>
                    change(
                      "duration_seconds",
                      e.target.value ? Number(e.target.value) : null,
                    )
                  }
                />
              </label>
              <label className="block space-y-2">
                <span className="block">زمان بارگذاری ویدیو (اختیاری)</span>
                <input
                  type="datetime-local"
                  className="min-h-11 w-full rounded-lg border border-input px-3"
                  onChange={(e) =>
                    change(
                      "video_uploaded_at",
                      e.target.value
                        ? new Date(e.target.value).toISOString()
                        : null,
                    )
                  }
                />
              </label>
              {payload.video_uploaded_at && (
                <p className="text-sm">
                  مقدار ذخیره‌شده:{" "}
                  {new Date(payload.video_uploaded_at).toLocaleString("fa-IR")}
                </p>
              )}
              <RichEditor
                label="متن ویدیو (اختیاری)"
                value={payload.transcript_html}
                onChange={(v) => change("transcript_html", v)}
                assets={assets}
                disabled={busy || readonly}
              />
            </fieldset>
          )}
          <section>
            <h2 className="mb-3 text-xl font-semibold">
              {kind === "video" ? "متن همراه" : "متن اصلی"}
            </h2>
            <RichEditor
              label="متن اصلی آموزش"
              value={payload.body_html}
              onChange={(v) => change("body_html", v)}
              assets={assets}
              disabled={busy || readonly}
            />
          </section>
          <div className="grid gap-5 tablet:grid-cols-2">
            {checks(
              "دسته‌بندی",
              payload.category_ids,
              categories.filter((c) => c.domain === domain),
              "category_ids",
            )}
            {checks(
              "برچسب‌ها",
              payload.tag_ids,
              tags.filter((c) => c.domain === domain),
              "tag_ids",
            )}
          </div>
          {checks(
            "مطالب مرتبط",
            payload.related_ids || [],
            contents.filter(
              (c) =>
                c.id !== current?.id &&
                (domain === "blog"
                  ? c.kind === "blog"
                  : ["article", "video"].includes(c.kind)),
            ),
            "related_ids",
          )}
          {kind === "series" && (
            <section className="space-y-4">
              {checks(
                "قسمت‌های مجموعه",
                payload.item_ids || [],
                contents.filter((c) => ["article", "video"].includes(c.kind)),
                "item_ids",
              )}
              <ol className="space-y-3">
                {payload.item_ids?.map((id, index) => (
                  <li
                    key={id}
                    className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3"
                  >
                    <span>
                      {index + 1} ·{" "}
                      {contents.find((c) => c.id === id)?.title || id}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={index === 0}
                      onClick={() => {
                        const ids = [...(payload.item_ids || [])];
                        [ids[index - 1], ids[index]] = [
                          ids[index]!,
                          ids[index - 1]!,
                        ];
                        change("item_ids", ids);
                      }}
                    >
                      بالاتر
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={index === (payload.item_ids?.length || 0) - 1}
                      onClick={() => {
                        const ids = [...(payload.item_ids || [])];
                        [ids[index + 1], ids[index]] = [
                          ids[index]!,
                          ids[index + 1]!,
                        ];
                        change("item_ids", ids);
                      }}
                    >
                      پایین‌تر
                    </Button>
                  </li>
                ))}
              </ol>
              <p className="text-sm text-muted-foreground">
                قسمت‌های پیش‌نویس در نمایش عمومی حذف می‌شوند.
              </p>
            </section>
          )}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">منابع</h2>
            {payload.sources.map((source, index) => (
              <div
                className="grid gap-3 rounded-xl border border-border p-4 tablet:grid-cols-2"
                key={index}
              >
                <TextField
                  label={`عنوان منبع ${index + 1}`}
                  value={source.title}
                  maxLength={180}
                  onChange={(v) =>
                    change(
                      "sources",
                      payload.sources.map((s, i) =>
                        i === index ? { ...s, title: v } : s,
                      ),
                    )
                  }
                />
                <TextField
                  label={`پیوند منبع ${index + 1}`}
                  value={source.href}
                  dir="ltr"
                  maxLength={500}
                  onChange={(v) =>
                    change(
                      "sources",
                      payload.sources.map((s, i) =>
                        i === index ? { ...s, href: v } : s,
                      ),
                    )
                  }
                />
                <Button
                  variant="outline"
                  type="button"
                  onClick={() =>
                    change(
                      "sources",
                      payload.sources.filter((_, i) => i !== index),
                    )
                  }
                >
                  حذف منبع {index + 1}
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              disabled={payload.sources.length >= 20}
              onClick={() =>
                change("sources", [
                  ...payload.sources,
                  { title: "", href: "/learn" },
                ])
              }
            >
              افزودن منبع
            </Button>
          </section>
          <div className="grid gap-5 tablet:grid-cols-2">
            <TextField
              label="متن دعوت به اقدام"
              value={payload.cta_label}
              maxLength={180}
              onChange={(v) => change("cta_label", v)}
            />
            <TextField
              label="پیوند دعوت به اقدام"
              value={payload.cta_href}
              dir="ltr"
              maxLength={500}
              onChange={(v) => change("cta_href", v)}
            />
          </div>
          <fieldset className="space-y-4 rounded-xl border border-border p-5">
            <legend className="px-2">SEO</legend>
            <TextField
              label="عنوان SEO"
              value={seo.title}
              maxLength={180}
              onChange={(v) => {
                setSeo((s) => ({ ...s, title: v }));
                setDirty(true);
              }}
            />
            <TextField
              label="توضیح SEO"
              multiline
              value={seo.description}
              maxLength={500}
              onChange={(v) => {
                setSeo((s) => ({ ...s, description: v }));
                setDirty(true);
              }}
            />
            <MediaPicker
              label="تصویر اشتراک‌گذاری"
              value={seo.og_media_id}
              assets={assets}
              onChange={(v) => {
                setSeo((s) => ({ ...s, og_media_id: v }));
                setDirty(true);
              }}
            />
            <label className="flex min-h-11 items-center gap-3">
              <input
                type="checkbox"
                checked={seo.indexable}
                onChange={(e) => {
                  setSeo((s) => ({ ...s, indexable: e.target.checked }));
                  setDirty(true);
                }}
              />
              قابل ایندکس پس از راه‌اندازی عمومی سایت
            </label>
          </fieldset>
          <div className="flex flex-wrap gap-6">
            <label className="flex min-h-11 items-center gap-3">
              <input
                type="checkbox"
                checked={visibility}
                onChange={(e) => {
                  setVisibility(e.target.checked);
                  setDirty(true);
                }}
              />
              نمایش عمومی پس از انتشار
            </label>
            {kind !== "blog" && kind !== "series" && (
              <label className="flex min-h-11 items-center gap-3">
                <input
                  type="checkbox"
                  checked={payload.featured}
                  onChange={(e) => change("featured", e.target.checked)}
                />
                منتخب صفحه اصلی (حداکثر سه محتوای جدیدتر)
              </label>
            )}
          </div>
          <Button type="button" onClick={save}>
            ذخیره نسخه
          </Button>
        </fieldset>
        {current && (
          <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
            <h2 className="text-xl font-semibold">انتشار و سابقه</h2>
            <Link
              className="inline-flex min-h-11 items-center text-primary-hover underline"
              href={`/admin/learn/preview/${current.id}?kind=${kind}`}
              target="_blank"
            >
              پیش‌نمایش خصوصی (پنجره جدید)
            </Link>
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                disabled={dirty || readonly}
                onClick={() => transition("publish")}
              >
                انتشار نسخه ذخیره‌شده
              </Button>
              <label className="space-y-2">
                <span className="block">زمان انتشار (زمان محلی)</span>
                <input
                  type="datetime-local"
                  className="min-h-11 rounded-lg border border-input px-3"
                  value={schedule}
                  onChange={(e) => setSchedule(e.target.value)}
                  disabled={readonly}
                />
              </label>
              <Button
                type="button"
                variant="outline"
                disabled={dirty || readonly || !schedule}
                onClick={() => transition("schedule")}
              >
                زمان‌بندی انتشار
              </Button>
              {current.scheduled_at && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={readonly}
                  onClick={() => transition("cancel-schedule")}
                >
                  لغو زمان‌بندی
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                disabled={readonly}
                onClick={() => setConfirm("unpublish")}
              >
                لغو انتشار
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={readonly}
                onClick={() => setConfirm("archive")}
              >
                بایگانی محتوا
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  run(async () =>
                    setHistory(
                      await adminRequest<CmsPage<Revision>>(
                        `${resource}/${current.id}/revisions?page_size=20`,
                      ),
                    ),
                  )
                }
              >
                نمایش تاریخچه
              </Button>
            </div>
            {(confirm === "unpublish" || confirm === "archive") && (
              <div className="rounded-xl border border-border p-4">
                <p className="mb-3">
                  این تغییر، نمایش عمومی محتوا را متوقف می‌کند. ادامه می‌دهید؟
                </p>
                <Button type="button" onClick={() => transition(confirm)}>
                  تأیید تغییر وضعیت
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setConfirm(null)}
                >
                  انصراف
                </Button>
              </div>
            )}
            {history && (
              <ul className="space-y-3">
                {history.items.map((r) => (
                  <li
                    key={r.id}
                    className="flex flex-wrap items-center gap-4 border-t border-border py-3"
                  >
                    <span>
                      نسخه {r.revision_no} · {r.title}
                    </span>
                    <Link
                      className="inline-flex min-h-11 items-center text-primary-hover"
                      href={`/admin/learn/preview/${current.id}?kind=${kind}&revision=${r.id}`}
                      target="_blank"
                    >
                      پیش‌نمایش نسخه {r.revision_no}
                    </Link>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={dirty || readonly}
                      onClick={() => setConfirm(`restore:${r.id}`)}
                    >
                      انتشار نسخه {r.revision_no}
                    </Button>
                    {confirm === `restore:${r.id}` && (
                      <Button
                        type="button"
                        onClick={() => transition("publish", r.id)}
                      >
                        تأیید انتشار نسخه {r.revision_no}
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {history && history.pagination.pages > 1 && (
              <div className="flex gap-3">
                {[history.pagination.page - 1, history.pagination.page + 1]
                  .filter((p) => p > 0 && p <= history.pagination.pages)
                  .map((p) => (
                    <Button
                      key={p}
                      variant="outline"
                      type="button"
                      onClick={() =>
                        run(async () =>
                          setHistory(
                            await adminRequest<CmsPage<Revision>>(
                              `${resource}/${current.id}/revisions?page=${p}`,
                            ),
                          ),
                        )
                      }
                    >
                      تاریخچه صفحه {p}
                    </Button>
                  ))}
              </div>
            )}
          </section>
        )}
      </div>
    </CmsReady>
  );
}
