"use client";
import { useEffect, useState, useId } from "react";
import { useForm, useWatch } from "react-hook-form";
import * as z from "@/lib/validation";
import { Dialog } from "radix-ui";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CmsReady } from "@/features/cms/ready";
import { adminRequest } from "@/features/admin/client";
import { normalizePhone } from "@/features/leads/form-schema";
import { sources } from "@/features/leads/types";
import {
  stages,
  activityKinds,
  activityStatuses,
  demoStatuses,
  type Resource,
  type Assignee,
  type School,
  type PageResult,
  type Opportunity,
} from "./types";

type Values = Record<string, string | boolean>;
type Field = {
  key: string;
  label: string;
  type?: string;
  required?: boolean;
  options?: Record<string, string>;
  max?: number;
};
const labels: Record<Resource, string> = {
  leads: "درخواست جدید",
  profile: "ارزیابی و اطلاعات لید",
  schools: "اطلاعات مدرسه",
  contacts: "فرد مرتبط",
  opportunities: "فرصت فروش",
  activities: "فعالیت و پیگیری",
  demos: "جلسهٔ دمو",
};
const text = (
  key: string,
  label: string,
  required = false,
  type = "text",
  max = 180,
): Field => ({ key, label, required, type, max });
const fieldDefinitions: Record<Resource, Field[]> = {
  leads: [
    text("full_name", "نام مسئول", true),
    text("phone", "شماره تماس", true, "tel", 40),
    text("school_name", "مدرسه یا آموزشگاه", true),
    text("city", "شهر"),
    text("province", "استان"),
    { key: "source", label: "منبع جذب", options: sources },
    { key: "assigned_to", label: "کارشناس" },
    {
      key: "consent",
      label: "رضایت ذخیرهٔ اطلاعات و تماس دربارهٔ همین درخواست دریافت شده است",
      type: "checkbox",
      required: true,
    },
  ],
  profile: [
    text("full_name", "نام مسئول", true),
    {
      key: "contact_method",
      label: "راه تماس",
      options: { phone: "تلفن", email: "ایمیل" },
    },
    text("contact_value", "شماره یا ایمیل", true, "text", 254),
    { key: "school_id", label: "اتصال به پروندهٔ مدرسه", type: "school" },
    text("tags", "برچسب‌ها (با ویرگول جدا کنید)", false, "text", 1200),
    text("qualification", "نتیجهٔ ارزیابی", false, "textarea", 3000),
  ],
  schools: [
    text("name", "نام مدرسه", true),
    text("city", "شهر"),
    text("province", "استان"),
    text("students", "تعداد تقریبی دانش‌آموزان", false, "number"),
    {
      key: "interested_features",
      label: "امکانات مورد علاقه",
      type: "features",
      options: {
        messenger: "پیام‌رسان",
        school: "مدرسه",
        reports: "گزارش‌ها",
        ai: "هوش مصنوعی در نقشهٔ راه",
        profile: "پروفایل",
      },
    },
  ],
  contacts: [
    text("full_name", "نام فرد", true),
    {
      key: "contact_method",
      label: "راه تماس",
      options: { phone: "تلفن", email: "ایمیل" },
    },
    text("contact_value", "شماره یا ایمیل", true, "text", 254),
    text("job_title", "سمت"),
    { key: "is_manager", label: "مدیر مدرسه", type: "checkbox" },
  ],
  opportunities: [
    text("title", "عنوان فرصت", true),
    { key: "stage", label: "مرحلهٔ فروش", options: stages },
    { key: "assigned_to", label: "کارشناس" },
    text("estimated_value", "ارزش تخمینی (تومان)", false, "number"),
    text("expected_close_date", "تاریخ پیش‌بینی نتیجه", false, "date"),
    text(
      "lost_reason",
      "دلیل عدم توافق (برای مرحلهٔ ناموفق الزامی)",
      false,
      "textarea",
      3000,
    ),
    text("notes", "یادداشت فرصت", false, "textarea", 3000),
  ],
  activities: [
    text("title", "عنوان فعالیت", true),
    { key: "kind", label: "نوع فعالیت", options: activityKinds },
    { key: "status", label: "وضعیت فعالیت", options: activityStatuses },
    { key: "assigned_to", label: "مسئول" },
    text("due_at", "زمان پیگیری (به وقت دستگاه)", false, "datetime-local"),
    { key: "opportunity_id", label: "فرصت مرتبط" },
    text("body", "شرح فعالیت", false, "textarea", 3000),
  ],
  demos: [
    { key: "assigned_to", label: "کارشناس دمو", required: true },
    text("starts_at", "شروع جلسه (به وقت دستگاه)", true, "datetime-local"),
    text("ends_at", "پایان جلسه (به وقت دستگاه)", true, "datetime-local"),
    { key: "status", label: "وضعیت جلسه", options: demoStatuses },
    { key: "opportunity_id", label: "فرصت مرتبط" },
    text(
      "outcome",
      "نتیجهٔ دمو (برای جلسهٔ برگزارشده الزامی)",
      false,
      "textarea",
      3000,
    ),
    text(
      "next_action",
      "اقدام بعدی (برای جلسهٔ برگزارشده الزامی)",
      false,
      "textarea",
      3000,
    ),
  ],
};
const split = (value: unknown) =>
  String(value || "")
    .split(/[,،]/)
    .map((v) => v.trim())
    .filter(Boolean);
const localDate = (value: unknown) => {
  if (!value) return "";
  const date = new Date(String(value));
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};

function SchoolPicker({
  value,
  onChange,
  id,
  initial,
}: {
  value: string;
  onChange: (v: string) => void;
  id: string;
  initial?: School | null;
}) {
  const [query, setQuery] = useState("");
  const [data, setData] = useState<School[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void fetch(
        `/api/v1/admin/crm/schools?page_size=20&q=${encodeURIComponent(query)}`,
        { cache: "no-store", signal: controller.signal },
      )
        .then(async (r) => {
          if (!r.ok) throw new Error("جست‌وجوی مدارس انجام نشد.");
          return r.json() as Promise<PageResult<School>>;
        })
        .then((v) => {
          setData(v.items);
          setError("");
        })
        .catch((e) => {
          if (!controller.signal.aborted) setError(e.message);
        });
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);
  const options = initial
    ? [initial, ...data.filter((v) => v.id !== initial.id)]
    : data;
  return (
    <>
      <label htmlFor={`${id}-search`} className="text-xs text-muted-foreground">
        جست‌وجوی نام مدرسه
      </label>
      <input
        id={`${id}-search`}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="crm-control"
        maxLength={120}
      />
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="crm-control"
      >
        <option value="">بدون اتصال</option>
        {options.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name} — {s.city}
          </option>
        ))}
      </select>
      {error && <p role="alert">{error}</p>}
    </>
  );
}

export function RecordEditor({
  resource,
  initial = {},
  context = {},
  assignees,
  opportunities = [],
  school,
  onSaved,
  onClose,
}: {
  resource: Resource;
  initial?: Record<string, unknown>;
  context?: Record<string, unknown>;
  assignees: Assignee[];
  opportunities?: Opportunity[];
  school?: School | null;
  onSaved: () => void;
  onClose: () => void;
}) {
  const id = useId();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const fields = fieldDefinitions[resource];
  const defaults: Values = {
    source: "direct",
    stage: "new",
    status: resource === "demos" ? "scheduled" : "open",
    kind: "call",
    estimated_value: "0",
    contact_method: "phone",
    is_manager: false,
    consent: false,
  };
  for (const field of fields) {
    const value = initial[field.key];
    if (value !== undefined && value !== null)
      defaults[field.key] =
        field.type === "datetime-local"
          ? localDate(value)
          : Array.isArray(value)
            ? value.join("، ")
            : typeof value === "boolean"
              ? value
              : String(value);
  }
  const { register, handleSubmit, control, setValue } = useForm<Values>({
    defaultValues: defaults,
  });
  const observed = useWatch({ control });
  const save = handleSubmit(async (raw) => {
    setError("");
    setBusy(true);
    try {
      const data: Record<string, unknown> = { ...context };
      for (const key of ["lead_id", "school_id", "source_lead_id"])
        if (initial[key] !== undefined) data[key] = initial[key];
      for (const field of fields)
        data[field.key] =
          raw[field.key] ?? (field.type === "checkbox" ? false : "");
      for (const field of fields)
        if (
          field.required &&
          (data[field.key] === false ||
            String(data[field.key] || "").trim().length === 0)
        )
          throw new Error(`«${field.label}» را تکمیل کنید.`);
      const scalar = z.record(
        z.string(),
        z.union([z.string().max(3000), z.boolean()]),
      );
      scalar.parse(raw);
      for (const field of fields)
        if (
          field.required &&
          field.type !== "checkbox" &&
          field.type !== "datetime-local" &&
          !field.options
        )
          z.string().min(2).parse(data[field.key]);
      for (const field of fields)
        if (typeof data[field.key] === "string")
          data[field.key] = String(data[field.key]).trim();
      for (const key of [
        "assigned_to",
        "opportunity_id",
        "school_id",
        "expected_close_date",
      ])
        if (key in data && !data[key]) data[key] = null;
      for (const key of ["due_at", "starts_at", "ends_at"])
        if (key in data)
          data[key] = data[key]
            ? new Date(String(data[key])).toISOString()
            : null;
      if (
        resource === "leads" ||
        ((resource === "profile" || resource === "contacts") &&
          data.contact_method === "phone")
      )
        z.string()
          .regex(/^\+98[1-9][0-9]{9}$/)
          .parse(normalizePhone(String(data.phone || data.contact_value)));
      if (
        (resource === "profile" || resource === "contacts") &&
        data.contact_method === "email"
      )
        z.email().parse(String(data.contact_value));
      if (resource === "schools") {
        data.students = data.students ? Number(data.students) : null;
        data.interested_features = split(data.interested_features);
        if (data.students !== null)
          z.number().int().min(0).max(1000000).parse(data.students);
        z.array(z.enum(["messenger", "school", "reports", "ai", "profile"]))
          .max(5)
          .parse(data.interested_features);
      }
      if (resource === "profile") {
        delete data.lead_id;
        data.tags = split(data.tags);
        z.array(z.string().min(1).max(60)).max(20).parse(data.tags);
      }
      if (resource === "opportunities") {
        if (data.stage === "lost" && String(data.lost_reason).length < 2)
          throw new Error("دلیل عدم توافق را ثبت کنید.");
        z.coerce
          .number()
          .min(0)
          .lt(10 ** 15)
          .parse(data.estimated_value);
      }
      if (resource === "demos") {
        const seconds =
          (Date.parse(String(data.ends_at)) -
            Date.parse(String(data.starts_at))) /
          1000;
        if (seconds < 900 || seconds > 14400)
          throw new Error("مدت جلسه باید بین ۱۵ دقیقه و ۴ ساعت باشد.");
        if (
          data.status === "completed" &&
          (String(data.outcome).length < 2 ||
            String(data.next_action).length < 2)
        )
          throw new Error("نتیجهٔ دمو و اقدام بعدی را ثبت کنید.");
      }
      if (resource === "contacts") {
        data.school_id = context.school_id ?? initial.school_id;
        data.source_lead_id =
          "source_lead_id" in initial
            ? initial.source_lead_id
            : (context.lead_id ?? null);
        delete data.lead_id;
      }
      const endpoint =
        resource === "profile"
          ? `leads/${context.lead_id}/profile`
          : `${resource === "leads" ? "" : "crm/"}${resource}${initial.id ? `/${initial.id}` : ""}`;
      await adminRequest(
        endpoint,
        initial.id || resource === "profile" ? "PATCH" : "POST",
        data,
        Number(initial.version) || undefined,
      );
      onSaved();
      onClose();
    } catch (e) {
      setError(
        e instanceof z.ZodError
          ? "مقدار واردشده معتبر نیست؛ طول متن و اعداد را بررسی کنید."
          : e instanceof Error
            ? e.message
            : "ذخیره انجام نشد.",
      );
    } finally {
      setBusy(false);
    }
  });
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-dialog bg-foreground/30" />
        <Dialog.Content
          dir="rtl"
          className="admin-dialog fixed inset-x-3 top-[5vh] z-dialog mx-auto max-h-[90vh] max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-overlay tablet:p-7"
        >
          <div className="flex items-center justify-between gap-4">
            <Dialog.Title className="text-xl font-semibold">
              {labels[resource]}
            </Dialog.Title>
            <Dialog.Close asChild>
              <Button
                type="button"
                variant="ghost"
                disabled={busy}
                aria-label="بستن فرم"
              >
                <X aria-hidden="true" />
              </Button>
            </Dialog.Close>
          </div>
          <Dialog.Description className="mt-2 text-sm leading-7 text-muted-foreground">
            اطلاعات در پروندهٔ واقعی ذخیره می‌شود. فیلدهای ستاره‌دار الزامی
            هستند.
          </Dialog.Description>
          <form onSubmit={save} className="mt-5">
            <CmsReady disabled={busy} legend={labels[resource]}>
              <div className="grid gap-4 tablet:grid-cols-2">
                {fields.map((field) => {
                  const fieldId = `${id}-${field.key}`;
                  const options =
                    field.key === "assigned_to"
                      ? Object.fromEntries(
                          assignees.map((a) => [
                            a.id,
                            a.phone || a.email || "کارشناس",
                          ]),
                        )
                      : field.key === "opportunity_id"
                        ? Object.fromEntries([
                            ...opportunities.map((o) => [o.id, o.title]),
                            ...(initial.opportunity_id &&
                            !opportunities.some(
                              (o) => o.id === initial.opportunity_id,
                            )
                              ? [
                                  [
                                    String(initial.opportunity_id),
                                    "فرصت ثبت‌شده",
                                  ],
                                ]
                              : []),
                          ])
                        : field.options;
                  return (
                    <div
                      key={field.key}
                      className={`grid min-w-0 gap-2 ${field.type === "textarea" || field.type === "checkbox" ? "tablet:col-span-2" : ""}`}
                    >
                      <label
                        htmlFor={
                          field.type === "features" ? undefined : fieldId
                        }
                        className="text-sm"
                      >
                        {field.label}
                        {field.required ? " *" : ""}
                      </label>
                      {field.type === "features" ? (
                        <fieldset className="grid gap-3 rounded-lg border border-border p-3">
                          <legend className="sr-only">{field.label}</legend>
                          {Object.entries(field.options!).map(
                            ([value, label]) => (
                              <label
                                key={value}
                                className="flex items-center gap-3 text-sm"
                              >
                                <input
                                  type="checkbox"
                                  className="size-5 accent-primary"
                                  checked={split(observed[field.key]).includes(
                                    value,
                                  )}
                                  onChange={(e) => {
                                    const selected = split(observed[field.key]);
                                    setValue(
                                      field.key,
                                      (e.target.checked
                                        ? [...selected, value]
                                        : selected.filter((v) => v !== value)
                                      ).join(","),
                                    );
                                  }}
                                />
                                {label}
                              </label>
                            ),
                          )}
                        </fieldset>
                      ) : field.type === "school" ? (
                        <SchoolPicker
                          id={fieldId}
                          value={String(observed[field.key] || "")}
                          onChange={(v) => setValue(field.key, v)}
                          initial={school}
                        />
                      ) : options ? (
                        <select
                          id={fieldId}
                          {...register(field.key)}
                          className="crm-control"
                          required={field.required}
                        >
                          {!field.options && (
                            <option value="">انتخاب کنید</option>
                          )}
                          {Object.entries(options).map(([v, t]) => (
                            <option key={v} value={v}>
                              {String(t)}
                            </option>
                          ))}
                        </select>
                      ) : field.type === "textarea" ? (
                        <textarea
                          id={fieldId}
                          {...register(field.key)}
                          className="crm-control min-h-28"
                          maxLength={field.max}
                        />
                      ) : (
                        <input
                          id={fieldId}
                          {...register(field.key)}
                          type={field.type || "text"}
                          required={field.required}
                          maxLength={field.max}
                          min={field.type === "number" ? 0 : undefined}
                          step={
                            field.key === "estimated_value" ? "0.01" : undefined
                          }
                          className={
                            field.type === "checkbox"
                              ? "size-5 accent-primary"
                              : "crm-control"
                          }
                        />
                      )}
                    </div>
                  );
                })}
              </div>
              {error && (
                <p
                  role="alert"
                  className="my-4 text-sm leading-7 text-destructive"
                >
                  {error}
                </p>
              )}
              <div className="mt-6 flex gap-3">
                <Button type="submit" disabled={busy}>
                  {busy ? "در حال ذخیره…" : "ذخیرهٔ اطلاعات"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={busy}
                >
                  انصراف
                </Button>
              </div>
            </CmsReady>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
