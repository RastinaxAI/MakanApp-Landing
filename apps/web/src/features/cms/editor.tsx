"use client";
import { CmsReady } from "./ready";
import { useState } from "react";
import Link from "next/link";
import { z } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminRequest } from "@/features/admin/client";
import { TextField, BlocksEditor, MediaPicker } from "./fields";
import { RichEditor } from "./rich-editor";
import type {
  AdminContent,
  CmsPayload,
  CmsSection,
  FaqCategory,
  MediaAsset,
} from "./types";

const basic = z.object({
  title: z.string().trim().min(1, "عنوان را وارد کنید.").max(180),
  slug: z
    .string()
    .min(1)
    .max(160)
    .regex(
      /^[\p{L}\p{N}_]+(?:-[\p{L}\p{N}_]+)*$/u,
      "آدرس باید از حروف، عدد و خط تیره تشکیل شود.",
    ),
});
const sectionLabels: Record<string, string> = {
  hero: "معرفی اصلی",
  challenge: "مسئله و راه‌حل",
  features: "قابلیت‌ها",
  audiences: "مخاطبان",
  experience: "تجربه محصول",
  onboarding: "راه‌اندازی",
  trust: "اعتماد و پرسش‌ها",
  faq: "پرسش‌ها",
  "final-cta": "دعوت پایانی",
  "rich-text": "متن غنی",
  cards: "کارت‌ها",
  gallery: "تصاویر",
  benefits: "مزیت‌ها",
};
export function ContentEditor({
  initial,
  assets,
  categories,
}: {
  initial: AdminContent;
  assets: MediaAsset[];
  categories: FaqCategory[];
}) {
  const [current, setCurrent] = useState(initial);
  const [title, setTitle] = useState(initial.title);
  const [slug, setSlug] = useState(initial.slug);
  const [payload, setPayload] = useState<CmsPayload>(initial.payload);
  const [seo, setSeo] = useState(initial.seo);
  const [visible, setVisible] = useState(initial.visibility);
  const [order, setOrder] = useState(initial.sort_order);
  const [category, setCategory] = useState(initial.category_id);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState("");
  const [schedule, setSchedule] = useState("");
  const [sectionType, setSectionType] = useState("rich-text");
  function change(values: Partial<CmsPayload>) {
    setPayload((previous) => ({ ...previous, ...values }) as CmsPayload);
    setDirty(true);
  }
  function section(index: number, patch: Partial<CmsSection>) {
    if (payload.kind !== "home" && payload.kind !== "page") return;
    setPayload((previous) => {
      if (previous.kind !== "home" && previous.kind !== "page") return previous;
      return {
        ...previous,
        sections: previous.sections.map((s, i) =>
          i === index ? { ...s, ...patch } : s,
        ),
      };
    });
    setDirty(true);
  }

  async function run(action: () => Promise<AdminContent>) {
    setBusy(true);
    setMessage("");
    try {
      const updated = await action();
      setCurrent(updated);
      setMessage("تغییر با موفقیت در سامانه ذخیره شد.");
      return updated;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "ذخیره انجام نشد.");
      return null;
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    const valid = basic.safeParse({ title, slug });
    if (!valid.success) {
      setMessage(valid.error.issues[0]?.message || "ورودی معتبر نیست.");
      return;
    }
    let storedPayload = payload;
    if (payload.kind === "audience")
      storedPayload = {
        ...payload,
        pains: payload.pains.map((v) => v.trim()).filter(Boolean),
        related: payload.related.map((v) => v.trim()).filter(Boolean),
      };
    if (payload.kind === "home" || payload.kind === "page") {
      storedPayload = {
        ...payload,
        sections: payload.sections.map((s) => ({
          ...s,
          faq_slugs: (s.faq_slugs || []).map((v) => v.trim()).filter(Boolean),
        })),
      };
      if (payload.kind === "home") {
        const hero = payload.sections.find((s) => s.type === "hero");
        if (hero)
          storedPayload = {
            ...storedPayload,
            headline: [hero.title, hero.accent].filter(Boolean).join(" "),
            summary: hero.description,
            eyebrow: hero.kicker,
          };
      }
    }
    const result = await run(() =>
      adminRequest<AdminContent>(
        `content/${current.id}`,
        "PATCH",
        {
          title: valid.data.title,
          slug: valid.data.slug,
          payload: storedPayload,
          seo,
          visibility: visible,
          sort_order: order,
          category_id: category,
        },
        current.row_version,
      ),
    );
    if (result) {
      setPayload(result.payload);
      setDirty(false);
      setMessage("پیش‌نویس ذخیره شد؛ نسخه عمومی تغییر نکرد.");
    }
  }
  async function publish(
    action: "publish" | "unpublish" | "cancel-schedule" | "schedule",
  ) {
    if (dirty) {
      setMessage("ابتدا پیش‌نویس را ذخیره کنید.");
      return;
    }
    if (
      action === "schedule" &&
      (!Number.isFinite(new Date(schedule).getTime()) ||
        new Date(schedule).getTime() <= Date.now())
    ) {
      setMessage("زمان انتشار باید در آینده و معتبر باشد.");
      return;
    }
    const data =
      action === "publish"
        ? { revision_id: current.revision_id }
        : action === "schedule"
          ? {
              revision_id: current.revision_id,
              publish_at: new Date(schedule).toISOString(),
            }
          : undefined;
    await run(() =>
      adminRequest<AdminContent>(
        `content/${current.id}/${action}`,
        "POST",
        data,
        current.row_version,
      ),
    );
  }
  return (
    <CmsReady disabled={busy}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">ویرایش محتوا</h1>
            <p className="mt-3 text-muted-foreground">
              نسخه {current.revision_no.toLocaleString("fa-IR")} ·{" "}
              {
                {
                  archived: "بایگانی",
                  published: "دارای نسخه عمومی",
                  scheduled: "دارای برنامه انتشار",
                  draft: "پیش‌نویس",
                }[current.publication_state]
              }
            </p>
          </div>
          <Link
            href="/admin/content"
            className="min-h-11 rounded-lg p-3 text-primary-hover"
          >
            فهرست محتوا
          </Link>
        </div>
        {message && (
          <p role="status" className="rounded-xl bg-secondary p-4 leading-8">
            {message}
          </p>
        )}
        <div className="flex flex-wrap gap-3 rounded-2xl border border-border bg-card p-5">
          <Button
            type="button"
            disabled={busy || current.is_archived}
            onClick={save}
          >
            ذخیره پیش‌نویس
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={busy || current.is_archived || dirty}
            onClick={() => publish("publish")}
          >
            انتشار نسخه ذخیره‌شده
          </Button>
          <a
            href={`/admin/preview/${current.id}?revision=${current.revision_id}`}
            className="inline-flex min-h-11 items-center rounded-lg border border-input px-4 text-primary-hover"
          >
            پیش‌نمایش خصوصی
          </a>
          <Link
            href={`/admin/content/${current.id}/revisions`}
            className="inline-flex min-h-11 items-center rounded-lg border border-input px-4 text-primary-hover"
          >
            تاریخچه نسخه‌ها
          </Link>
          <Button
            type="button"
            variant="outline"
            disabled={
              busy ||
              current.is_archived ||
              (!current.published_revision_id && !current.scheduled_revision_id)
            }
            onClick={() => publish("unpublish")}
          >
            توقف انتشار
          </Button>
        </div>
        <fieldset
          disabled={busy || current.is_archived}
          className="space-y-5 rounded-2xl border border-border bg-card p-6"
        >
          <legend className="px-3 font-semibold">مشخصات محتوا</legend>
          <div className="grid gap-5 tablet:grid-cols-2">
            <TextField
              label="عنوان محتوا"
              value={title}
              onChange={(v) => {
                setTitle(v);
                setDirty(true);
              }}
              maxLength={180}
            />
            <TextField
              label="آدرس ثابت"
              value={slug}
              onChange={(v) => {
                setSlug(v);
                setDirty(true);
              }}
              dir="ltr"
              disabled={!!current.published_at}
              maxLength={160}
            />
            <div className="space-y-2">
              <Label htmlFor="content-order">ترتیب نمایش</Label>
              <Input
                id="content-order"
                type="number"
                min={0}
                max={10000}
                value={order}
                onChange={(e) => {
                  setOrder(Number(e.target.value));
                  setDirty(true);
                }}
              />
            </div>
            <label className="flex min-h-11 items-center gap-3">
              <input
                type="checkbox"
                checked={visible}
                onChange={(e) => {
                  setVisible(e.target.checked);
                  setDirty(true);
                }}
              />
              نمایش در صفحات عمومی پس از انتشار
            </label>
          </div>
        </fieldset>
        <fieldset
          disabled={busy || current.is_archived}
          className="space-y-5 rounded-2xl border border-border bg-card p-6"
        >
          <legend className="px-3 font-semibold">متن و بخش‌ها</legend>
          {payload.kind !== "faq" && payload.kind !== "home" && (
            <>
              <TextField
                label="تیتر اصلی"
                value={payload.headline}
                onChange={(headline) => change({ headline })}
                maxLength={180}
              />
              <TextField
                label="متن کوتاه معرفی"
                value={payload.summary}
                onChange={(summary) => change({ summary })}
                multiline
              />
              <TextField
                label="عنوان بالای تیتر"
                value={payload.eyebrow || ""}
                onChange={(eyebrow) => change({ eyebrow })}
                maxLength={180}
              />
            </>
          )}
          {(payload.kind === "home" || payload.kind === "page") && (
            <>
              <label className="flex min-h-11 items-center gap-3">
                <input
                  type="checkbox"
                  checked={payload.legal_draft || false}
                  onChange={(e) => change({ legal_draft: e.target.checked })}
                />
                این متن حقوقی هنوز پیش‌نویس است
              </label>
              {payload.sections.map((s, i) => (
                <section
                  key={i}
                  className="space-y-4 rounded-xl border border-border bg-background p-5"
                >
                  <h2 className="text-xl font-semibold">
                    بخش {i + 1}: {sectionLabels[s.type] || s.type}
                  </h2>
                  <TextField
                    label={`عنوان بخش ${i + 1}`}
                    value={s.title}
                    onChange={(title) => section(i, { title })}
                    maxLength={180}
                  />
                  {s.type === "hero" && (
                    <TextField
                      label="ادامه رنگی تیتر اصلی"
                      value={s.accent || ""}
                      onChange={(accent) => section(i, { accent })}
                      maxLength={180}
                    />
                  )}
                  <TextField
                    label={`عنوان کوتاه بخش ${i + 1}`}
                    value={s.kicker || ""}
                    onChange={(kicker) => section(i, { kicker })}
                    maxLength={180}
                  />
                  <TextField
                    label={`توضیح بخش ${i + 1}`}
                    value={s.description}
                    onChange={(description) => section(i, { description })}
                    multiline
                  />
                  {["trust", "faq"].includes(s.type) && (
                    <TextField
                      label={`پرسش‌های منتخب بخش ${i + 1}؛ آدرس‌ها با ویرگول`}
                      value={(s.faq_slugs || []).join(",")}
                      onChange={(v) =>
                        section(i, {
                          faq_slugs: v.split(","),
                        })
                      }
                      dir="ltr"
                    />
                  )}
                  <RichEditor
                    label={`متن بخش ${i + 1}`}
                    value={s.body_html || ""}
                    onChange={(body_html) => section(i, { body_html })}
                    disabled={busy || current.is_archived}
                  />
                  <BlocksEditor
                    label={`موارد بخش ${i + 1}`}
                    items={s.items}
                    onChange={(items) => section(i, { items })}
                    assets={assets}
                    disabled={busy || current.is_archived}
                  />
                  <MediaPicker
                    label={`تصویر بخش ${i + 1}`}
                    value={s.media_id}
                    onChange={(media_id) => section(i, { media_id })}
                    assets={assets}
                  />
                  <div className="grid gap-4 tablet:grid-cols-2">
                    <TextField
                      label={`متن دکمه بخش ${i + 1}`}
                      value={s.cta_label || ""}
                      onChange={(cta_label) => section(i, { cta_label })}
                      maxLength={180}
                    />
                    <TextField
                      label={`پیوند دکمه بخش ${i + 1}`}
                      value={s.cta_href || "/demo"}
                      onChange={(cta_href) => section(i, { cta_href })}
                      dir="ltr"
                      maxLength={500}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[-1, 1].map((delta) => (
                      <Button
                        key={delta}
                        type="button"
                        variant="outline"
                        disabled={
                          busy ||
                          current.is_archived ||
                          i + delta < 0 ||
                          i + delta >= payload.sections.length
                        }
                        onClick={() => {
                          const next = [...payload.sections];
                          [next[i], next[i + delta]] = [
                            next[i + delta]!,
                            next[i]!,
                          ];
                          change({ sections: next });
                        }}
                      >
                        {delta === -1
                          ? "انتقال بخش به بالا"
                          : "انتقال بخش به پایین"}
                      </Button>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      disabled={
                        busy || current.is_archived || s.type === "hero"
                      }
                      onClick={() =>
                        change({
                          sections: payload.sections.filter((_, j) => j !== i),
                        })
                      }
                    >
                      حذف بخش
                    </Button>
                  </div>
                </section>
              ))}
              <div className="flex flex-wrap gap-3">
                <select
                  aria-label="نوع بخش جدید"
                  value={sectionType}
                  onChange={(e) => setSectionType(e.target.value)}
                  className="min-h-11 rounded-lg border border-input bg-card px-3"
                >
                  {Object.entries(sectionLabels)
                    .filter(([key]) => key !== "hero")
                    .map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                </select>
                <Button
                  type="button"
                  variant="outline"
                  disabled={
                    busy || current.is_archived || payload.sections.length >= 24
                  }
                  onClick={() =>
                    change({
                      sections: [
                        ...payload.sections,
                        {
                          type: sectionType,
                          title: "بخش جدید",
                          description: "",
                          items: [],
                          cta_href: "/demo",
                        },
                      ],
                    })
                  }
                >
                  افزودن بخش
                </Button>
              </div>
            </>
          )}
          {payload.kind === "feature" && (
            <>
              <TextField
                label="نام امکان"
                value={payload.title}
                onChange={(title) => change({ title })}
                maxLength={180}
              />
              <label className="block space-y-2">
                وضعیت آمادگی
                <select
                  aria-label="وضعیت آمادگی"
                  className="min-h-11 w-full rounded-lg border border-input bg-card px-3"
                  value={payload.readiness}
                  onChange={(e) =>
                    change({
                      readiness: e.target.value as typeof payload.readiness,
                    })
                  }
                >
                  <option value="available">آماده</option>
                  <option value="partial">بخشی آماده</option>
                  <option value="roadmap">در نقشه راه</option>
                </select>
              </label>
              <TextField
                label="مرجع تأیید آمادگی محصول"
                value={payload.evidence_reference || ""}
                onChange={(evidence_reference) =>
                  change({ evidence_reference })
                }
                maxLength={500}
              />
              <TextField
                label="آدرس مخاطب مرتبط"
                value={payload.audience}
                onChange={(audience) => change({ audience })}
                dir="ltr"
                maxLength={160}
              />
              <BlocksEditor
                label="مزیت‌ها"
                items={payload.benefits}
                onChange={(benefits) => change({ benefits })}
                assets={assets}
                disabled={busy || current.is_archived}
              />
              <BlocksEditor
                label="گام‌های استفاده"
                items={payload.workflow}
                onChange={(workflow) => change({ workflow })}
                assets={assets}
                disabled={busy || current.is_archived}
              />
              <MediaPicker
                label="تصویر محصول"
                value={payload.image_media_id}
                onChange={(image_media_id) => change({ image_media_id })}
                assets={assets}
              />
              <TextField
                label="حدود قابلیت و دسترسی"
                value={payload.boundary}
                onChange={(boundary) => change({ boundary })}
                multiline
              />
              <RichEditor
                label="توضیح تکمیلی امکان"
                value={payload.body_html || ""}
                onChange={(body_html) => change({ body_html })}
                disabled={busy || current.is_archived}
              />
            </>
          )}
          {payload.kind === "audience" && (
            <>
              <TextField
                label="نام مخاطب"
                value={payload.title}
                onChange={(title) => change({ title })}
                maxLength={180}
              />
              <TextField
                label="مسئله‌های مخاطب؛ هر سطر یک مورد"
                value={payload.pains.join("\n")}
                onChange={(v) => change({ pains: v.split("\n") })}
                multiline
              />
              <BlocksEditor
                label="مزیت‌ها"
                items={payload.benefits}
                onChange={(benefits) => change({ benefits })}
                assets={assets}
                disabled={busy || current.is_archived}
              />
              <BlocksEditor
                label="مسیر کاربر"
                items={payload.journey}
                onChange={(journey) => change({ journey })}
                assets={assets}
                disabled={busy || current.is_archived}
              />
              <TextField
                label="امکانات مرتبط؛ آدرس‌ها با ویرگول"
                value={payload.related.join(",")}
                onChange={(v) =>
                  change({
                    related: v.split(","),
                  })
                }
                dir="ltr"
              />
              <TextField
                label="متن دعوت به اقدام"
                value={payload.cta}
                onChange={(cta) => change({ cta })}
                maxLength={180}
              />
              <TextField
                label="پیوند دعوت به اقدام"
                value={payload.cta_href}
                onChange={(cta_href) => change({ cta_href })}
                dir="ltr"
                maxLength={500}
              />
              <TextField
                label="حدود دسترسی مخاطب"
                value={payload.boundary}
                onChange={(boundary) => change({ boundary })}
                multiline
              />
              <RichEditor
                label="توضیح تکمیلی مخاطب"
                value={payload.body_html || ""}
                onChange={(body_html) => change({ body_html })}
                disabled={busy || current.is_archived}
              />
            </>
          )}
          {payload.kind === "faq" && (
            <>
              <TextField
                label="پرسش"
                value={payload.question}
                onChange={(question) => change({ question })}
                maxLength={180}
              />
              <TextField
                label="پاسخ متنی"
                value={payload.answer}
                onChange={(answer) => change({ answer })}
                multiline
              />
              <RichEditor
                label="پاسخ دارای قالب‌بندی"
                value={payload.answer_html || ""}
                onChange={(answer_html) => change({ answer_html })}
                disabled={busy || current.is_archived}
              />
              <label className="block space-y-2">
                دسته پرسش
                <select
                  aria-label="دسته پرسش"
                  value={category || ""}
                  className="min-h-11 w-full rounded-lg border border-input bg-card px-3"
                  onChange={(e) => {
                    setCategory(e.target.value || null);
                    setDirty(true);
                  }}
                >
                  <option value="">بدون دسته</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
        </fieldset>
        <fieldset
          disabled={busy || current.is_archived}
          className="space-y-5 rounded-2xl border border-border bg-card p-6"
        >
          <legend className="px-3 font-semibold">تنظیمات SEO همین نسخه</legend>
          <TextField
            label="عنوان SEO"
            value={seo.title}
            onChange={(title) => {
              setSeo({ ...seo, title });
              setDirty(true);
            }}
            maxLength={180}
          />
          <TextField
            label="توضیح SEO"
            value={seo.description}
            onChange={(description) => {
              setSeo({ ...seo, description });
              setDirty(true);
            }}
            multiline
            maxLength={500}
          />
          <MediaPicker
            label="تصویر اشتراک‌گذاری"
            value={seo.og_media_id}
            onChange={(og_media_id) => {
              setSeo({ ...seo, og_media_id });
              setDirty(true);
            }}
            assets={assets}
          />
          <label className="flex min-h-11 items-center gap-3">
            <input
              type="checkbox"
              checked={seo.indexable}
              onChange={(e) => {
                setSeo({ ...seo, indexable: e.target.checked });
                setDirty(true);
              }}
            />
            واجد شرایط ایندکس پس از تأیید انتشار نهایی سایت
          </label>
        </fieldset>
        <section className="space-y-4 rounded-2xl border border-border bg-card p-6">
          <h2 className="text-xl font-semibold">زمان‌بندی انتشار</h2>
          <p className="text-sm leading-8 text-muted-foreground">
            زمان انتخابی دستگاه شما با منطقه زمانی ثبت و در سامانه به UTC ذخیره
            می‌شود.
          </p>
          {current.scheduled_at && (
            <p>
              زمان ثبت‌شده:{" "}
              {new Date(current.scheduled_at).toLocaleString("fa-IR", {
                timeZone: "Asia/Tehran",
              })}
            </p>
          )}
          <Label htmlFor="publish-date">تاریخ و ساعت انتشار</Label>
          <Input
            id="publish-date"
            type="datetime-local"
            dir="ltr"
            value={schedule}
            onChange={(e) => setSchedule(e.target.value)}
          />
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              disabled={busy || current.is_archived || dirty || !schedule}
              onClick={() => publish("schedule")}
            >
              ثبت زمان‌بندی
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={
                busy || current.is_archived || !current.scheduled_revision_id
              }
              onClick={() => publish("cancel-schedule")}
            >
              لغو زمان‌بندی
            </Button>
          </div>
        </section>
      </div>
    </CmsReady>
  );
}
