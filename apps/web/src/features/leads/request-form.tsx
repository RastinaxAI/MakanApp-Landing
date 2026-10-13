"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { trackEvent, type ErrorKind } from "@/features/analytics/events";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CmsReady } from "@/features/cms/ready";
import {
  contactSchema,
  demoSchema,
  requestSchema,
  type FormFields,
} from "./form-schema";

type Token = {
  token: string;
  consent_version: string;
  consent_text: string;
  retention_days: number;
};
type Fields = FormFields;
const consentText =
  "با ذخیره اطلاعات این فرم و تماس درباره همین درخواست طبق سیاست حریم خصوصی موافقم.";
export function RequestForm({ kind }: { kind: "demo" | "contact" }) {
  const demo = kind === "demo";
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    setValue,
  } = useForm<Fields>({
    resolver: zodResolver(requestSchema(kind)),
    defaultValues: {
      full_name: "",
      phone: "",
      school_name: "",
      city: "",
      job_title: "",
      student_count_range: "",
      message: "",
      subject: "",
      contact_method: "phone",
      contact_value: "",
      consent: false,
      website: "",
    },
    shouldFocusError: true,
  });
  const [token, setToken] = useState<Token | null>(null);
  const [tokenBusy, setTokenBusy] = useState(false);
  const [error, setMessage] = useState("");
  const [reference, setReference] = useState("");
  useEffect(() => {
    if (reference)
      document
        .querySelector('meta[name="robots"]')
        ?.setAttribute("content", "noindex, nofollow");
  }, [reference]);
  const attempt = useRef<{ body: string; key: string } | null>(null);
  const loadedAt = useRef(0);
  async function loadToken() {
    setTokenBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/v1/forms/token?kind=${kind}`, {
        cache: "no-store",
        credentials: "omit",
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok)
        throw new Error(
          response.status === 429
            ? "برای آماده‌سازی فرم کمی بعد تلاش کنید."
            : "ارتباط با سامانه برقرار نشد؛ دوباره تلاش کنید.",
        );
      const result = (await response.json()) as Token;
      if (result.consent_text !== consentText)
        throw new Error("متن رضایت تغییر کرده است؛ صفحه را تازه‌سازی کنید.");
      loadedAt.current = Date.now();
      setToken(result);
    } catch (failure) {
      setMessage(
        failure instanceof Error && failure.name === "Error"
          ? failure.message
          : "ارتباط با سامانه برقرار نشد؛ دوباره تلاش کنید.",
      );
    } finally {
      setTokenBusy(false);
    }
  }
  useEffect(() => {
    let active = true;
    async function initialize() {
      try {
        const response = await fetch(`/api/v1/forms/token?kind=${kind}`, {
          cache: "no-store",
          credentials: "omit",
          signal: AbortSignal.timeout(8000),
        });
        if (!response.ok) throw new Error("فرم آماده نشد؛ دوباره تلاش کنید.");
        const result = (await response.json()) as Token;
        if (result.consent_text !== consentText)
          throw new Error("متن رضایت تغییر کرده است؛ صفحه را تازه‌سازی کنید.");
        if (active) {
          loadedAt.current = Date.now();
          setToken(result);
        }
      } catch (failure) {
        if (active)
          setMessage(
            failure instanceof Error && failure.name === "Error"
              ? failure.message
              : "ارتباط با سامانه برقرار نشد؛ دوباره تلاش کنید.",
          );
      }
    }
    void initialize();
    return () => {
      active = false;
    };
  }, [kind]);
  async function submit(data: Fields) {
    let errorKind: ErrorKind = "network";
    if (!token) return;
    setMessage("");
    // Minimal wait applies only to immediate autofill; no personal data is stored in browser storage.
    const delay = 1100 - (Date.now() - loadedAt.current);
    if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
    const allowedSources = ["home", "features", "solutions", "learn", "blog"];
    const requested =
      new URLSearchParams(window.location.search).get("source") ?? "";
    const source = allowedSources.includes(requested) ? requested : kind;
    const parsed = demo ? demoSchema.parse(data) : contactSchema.parse(data);
    const payload = {
      ...parsed,
      source,
      consent_version: token.consent_version,
    };
    const body = JSON.stringify(payload);
    if (!attempt.current || attempt.current.body !== body)
      attempt.current = { body, key: crypto.randomUUID() };
    try {
      const response = await fetch(
        demo ? "/api/v1/leads/demo" : "/api/v1/contact",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "omit",
          body: JSON.stringify({
            ...payload,
            form_token: token.token,
            idempotency_key: attempt.current.key,
          }),
          signal: AbortSignal.timeout(15000),
        },
      );
      const result = await response.json();
      if (!response.ok) {
        errorKind = response.status === 429 ? "rate_limit" : "server";
        for (const item of result.error?.details ?? []) {
          if (Object.hasOwn(data, item.field))
            setError(item.field as keyof Fields, {
              type: "server",
              message: item.message,
            });
        }
        if (
          [
            "FORM_TOKEN_EXPIRED",
            "FORM_TOKEN_INVALID",
            "CONSENT_CHANGED",
          ].includes(result.error?.code)
        )
          setToken(null);
        if (result.error?.code === "CONSENT_CHANGED")
          setValue("consent", false);
        throw new Error(
          response.status === 429
            ? `تلاش‌های زیادی انجام شده است؛ ${response.headers.get("Retry-After") ?? "چند"} ثانیه بعد دوباره تلاش کنید.`
            : (result.error?.message ?? "ثبت انجام نشد؛ دوباره تلاش کنید."),
        );
      }
      if (!/^MK-[A-Za-z0-9_-]{32}$/.test(result.reference_id ?? ""))
        throw new Error(
          "پاسخ معتبر سامانه دریافت نشد؛ با همین اطلاعات دوباره تلاش کنید.",
        );
      setReference(result.reference_id);
      if (demo) trackEvent("demo_form_submit_success");
    } catch (failure) {
      if (demo) trackEvent("demo_form_submit_error", errorKind);
      setMessage(
        failure instanceof Error && failure.name === "Error"
          ? failure.message
          : "پاسخ سامانه دریافت نشد؛ با همین اطلاعات دوباره تلاش کنید.",
      );
    }
  }
  function field(
    name: keyof Fields,
    label: string,
    options: { wide?: boolean; type?: string; optional?: boolean } = {},
  ) {
    return (
      <div className={`space-y-2 ${options.wide ? "tablet:col-span-2" : ""}`}>
        <Label htmlFor={`${kind}-${name}`}>
          {label}
          {options.optional ? " — اختیاری" : ""}
        </Label>
        <Input
          id={`${kind}-${name}`}
          {...register(name)}
          type={options.type ?? "text"}
          dir={
            options.type === "tel" || name === "contact_value"
              ? "ltr"
              : undefined
          }
          autoComplete={
            name === "full_name"
              ? "name"
              : options.type === "tel"
                ? "tel"
                : "off"
          }
          maxLength={
            name === "message"
              ? 3000
              : name === "contact_value"
                ? 254
                : name === "full_name"
                  ? 120
                  : name === "phone"
                    ? 40
                    : ["city", "job_title"].includes(name)
                      ? 100
                      : 180
          }
          aria-invalid={!!errors[name]}
          aria-describedby={errors[name] ? `${kind}-${name}-error` : undefined}
          className="min-h-12"
        />
        {errors[name] && (
          <p
            id={`${kind}-${name}-error`}
            role="alert"
            className="text-sm text-destructive"
          >
            {errors[name]?.message}
          </p>
        )}
      </div>
    );
  }
  return (
    <section
      className="min-w-0 rounded-3xl border border-border bg-card p-5 shadow-soft tablet:p-8"
      aria-labelledby={`${kind}-form-title`}
    >
      <h2 id={`${kind}-form-title`} className="text-2xl font-semibold">
        {demo ? "درخواست دمو و مشاوره" : "ارسال پیام"}
      </h2>
      {reference ? (
        <div
          role="status"
          className="mt-6 space-y-4 rounded-xl bg-secondary p-5"
        >
          <h3 className="text-xl font-semibold">درخواست شما ثبت شد.</h3>
          <p className="leading-8">
            اطلاعات در سامانه ماکان دریافت شده است. کد زیر را برای پیگیری نزد
            خود نگه دارید.
          </p>
          <p
            className="break-all font-mono text-sm"
            dir="ltr"
            data-testid="reference-id"
          >
            {reference}
          </p>
          <Link
            href="/features"
            className="inline-flex min-h-11 items-center text-primary-hover"
          >
            آشنایی با امکانات ماکان
          </Link>
        </div>
      ) : (
        <form
          data-request-kind={kind}
          noValidate
          onSubmit={(event) => {
            void handleSubmit(submit, () => {
              if (demo) trackEvent("demo_form_submit_error", "validation");
            })(event);
          }}
          className="mt-6"
        >
          <p className="mb-5 text-sm leading-8 text-muted-foreground">
            {demo
              ? "نام، شماره تماس و نام مدرسه برای بررسی درخواست لازم است."
              : "نام، روش تماس، موضوع و پیام برای رسیدگی لازم است."}{" "}
            زمان پاسخ قطعی اعلام نشده است.
          </p>
          {error && (
            <p
              role="alert"
              className="mb-5 rounded-lg border border-destructive p-4 text-sm leading-7 text-destructive"
            >
              {error}
            </p>
          )}
          {!token && (
            <Button
              type="button"
              variant="outline"
              onClick={loadToken}
              disabled={tokenBusy}
              className="mb-5"
            >
              {tokenBusy ? "در حال آماده‌سازی…" : "آماده‌سازی دوباره فرم"}
            </Button>
          )}
          <CmsReady
            disabled={isSubmitting || !token}
            legend={demo ? "اطلاعات درخواست دمو" : "اطلاعات تماس"}
          >
            <div className="grid gap-5 tablet:grid-cols-2">
              {field("full_name", "نام و نام خانوادگی")}
              {demo ? (
                field("phone", "شماره تماس", { type: "tel" })
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="contact-method">روش تماس</Label>
                    <select
                      id="contact-method"
                      {...register("contact_method")}
                      className="min-h-12 w-full rounded-lg border border-input bg-card px-3"
                    >
                      <option value="phone">تلفن</option>
                      <option value="email">ایمیل</option>
                    </select>
                  </div>
                  {field("contact_value", "شماره تماس یا ایمیل", {
                    wide: true,
                  })}
                </>
              )}
              {demo ? (
                <>
                  {field("school_name", "نام مدرسه یا مؤسسه", { wide: true })}
                  {field("city", "شهر", { optional: true })}
                  {field("job_title", "سمت", { optional: true })}
                  <div className="space-y-2 tablet:col-span-2">
                    <Label htmlFor="demo-students">
                      تعداد تقریبی دانش‌آموزان — اختیاری
                    </Label>
                    <select
                      id="demo-students"
                      {...register("student_count_range")}
                      className="min-h-12 w-full rounded-lg border border-input bg-card px-3"
                    >
                      {[
                        ["", "انتخاب نشده"],
                        ["under100", "کمتر از ۱۰۰"],
                        ["100-299", "۱۰۰ تا ۲۹۹"],
                        ["300-599", "۳۰۰ تا ۵۹۹"],
                        ["600-999", "۶۰۰ تا ۹۹۹"],
                        ["1000plus", "۱۰۰۰ و بیشتر"],
                      ].map(([value, label]) => (
                        <option value={value} key={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                field("subject", "موضوع", { wide: true })
              )}
              <div className="space-y-2 tablet:col-span-2">
                <Label htmlFor={`${kind}-message`}>
                  {demo ? "توضیحات — اختیاری" : "پیام"}
                </Label>
                <Textarea
                  id={`${kind}-message`}
                  {...register("message")}
                  maxLength={3000}
                  aria-invalid={!!errors.message}
                  aria-describedby={
                    errors.message ? `${kind}-message-error` : undefined
                  }
                  className="min-h-32"
                />
                {errors.message && (
                  <p
                    role="alert"
                    id={`${kind}-message-error`}
                    className="text-sm text-destructive"
                  >
                    {errors.message.message}
                  </p>
                )}
              </div>
              <div className="hidden" aria-hidden="true">
                <label htmlFor={`${kind}-website`}>وب‌سایت</label>
                <input
                  id={`${kind}-website`}
                  {...register("website")}
                  tabIndex={-1}
                  autoComplete="off"
                />
              </div>
              <div className="tablet:col-span-2">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id={`${kind}-consent`}
                    {...register("consent")}
                    className="mt-2 size-5 shrink-0 accent-primary"
                    aria-invalid={!!errors.consent}
                    aria-describedby={`${kind}-policy ${errors.consent ? `${kind}-consent-error` : ""}`}
                  />
                  <label
                    htmlFor={`${kind}-consent`}
                    className="text-sm leading-8"
                  >
                    {consentText}
                  </label>
                </div>
                {errors.consent && (
                  <p
                    id={`${kind}-consent-error`}
                    role="alert"
                    className="text-sm text-destructive"
                  >
                    {errors.consent.message}
                  </p>
                )}
              </div>
              <Button
                type="submit"
                className="min-h-12 tablet:col-span-2"
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? "در حال ثبت…"
                  : demo
                    ? "ثبت درخواست دمو"
                    : "ارسال پیام"}
              </Button>
            </div>
          </CmsReady>
          <p
            id={`${kind}-policy`}
            className="mt-5 text-sm leading-8 text-muted-foreground"
          >
            اطلاعات شخصی تا ۱۸۰ روز پس از آخرین پیگیری نگهداری و سپس حذف می‌شود.{" "}
            <Link
              href="/privacy#requests-policy"
              className="inline-flex min-h-11 items-center rounded-lg font-medium text-primary-hover"
            >
              سیاست نگهداری درخواست‌ها
            </Link>
          </p>
        </form>
      )}
    </section>
  );
}
