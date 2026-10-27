"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "@/lib/validation";
import {
  ArrowLeft,
  Check,
  LoaderCircle,
  Smartphone,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AdminRequestError,
  adminRequest,
  resetAdminNavigation,
} from "./client";
import { CmsReady } from "@/features/cms/ready";

export function normalizeDigits(value: string) {
  return value.replace(/[۰-۹٠-٩]/g, (digit) =>
    String(
      "۰۱۲۳۴۵۶۷۸۹".includes(digit)
        ? "۰۱۲۳۴۵۶۷۸۹".indexOf(digit)
        : "٠١٢٣٤٥٦٧٨٩".indexOf(digit),
    ),
  );
}
export function normalizePhone(value: string) {
  return normalizeDigits(value)
    .replace(/[\s()-]/g, "")
    .replace(/^(?:\+98|0098)/, "0");
}
const schema = z.object({
  phone: z
    .string()
    .transform(normalizePhone)
    .pipe(z.string().regex(/^09[0-9]{9}$/, "شماره همراه معتبر وارد کنید.")),
  code: z.string().optional(),
});
type Values = z.input<typeof schema>;
export function LoginForm({ debug = false }: { debug?: boolean }) {
  const [sent, setSent] = useState(false);
  const [number, setNumber] = useState("");
  const [error, setError] = useState("");
  const [remaining, setRemaining] = useState(0);
  const [resending, setResending] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema) });
  useEffect(() => {
    if (!remaining) return;
    const timer = setTimeout(
      () => setRemaining((value) => Math.max(0, value - 1)),
      1000,
    );
    return () => clearTimeout(timer);
  }, [remaining]);
  useEffect(() => {
    if (sent && !isSubmitting && !resending) setFocus("code");
  }, [sent, setFocus, isSubmitting, resending]);
  async function send(phone: string) {
    const result = await adminRequest<{ retry_after: number }>(
      "auth/otp/request",
      "POST",
      { phone },
    );
    setNumber(phone);
    setSent(true);
    setValue("code", "");
    setRemaining(result.retry_after);
  }
  const submit = handleSubmit(async (values) => {
    setError("");
    try {
      if (!sent) {
        await send(normalizePhone(values.phone));
        return;
      }
      const code = normalizeDigits(values.code || "").trim();
      if (!/^[0-9]{6}$/.test(code)) {
        setError("کد شش‌رقمی را وارد کنید.");
        return;
      }
      await adminRequest("auth/otp/verify", "POST", {
        phone: number,
        code,
      });
      resetAdminNavigation("/admin");
    } catch (error) {
      if (error instanceof AdminRequestError && error.retryAfter)
        setRemaining(error.retryAfter);
      setError(error instanceof Error ? error.message : "ورود انجام نشد.");
    }
  });
  const busy = isSubmitting || resending;
  return (
    <CmsReady disabled={busy} legend="ورود مدیر وب‌سایت">
      <form
        onSubmit={submit}
        noValidate
        className="login-form"
        aria-busy={busy}
      >
        <ol className="login-steps" aria-label="مراحل ورود">
          <li aria-current={!sent ? "step" : undefined} data-complete={sent}>
            <span aria-hidden="true">{sent ? <Check size={14} /> : "۱"}</span>
            شماره همراه
          </li>
          <li aria-current={sent ? "step" : undefined}>
            <span aria-hidden="true">۲</span>تأیید کد ورود
          </li>
        </ol>
        <div className="login-field">
          <Label htmlFor="admin-phone">شماره همراه</Label>
          <div className="relative">
            <Input
              id="admin-phone"
              type="tel"
              dir="ltr"
              inputMode="tel"
              autoComplete="tel-national"
              placeholder="09xxxxxxxxx"
              maxLength={24}
              readOnly={sent}
              className="login-phone-input pr-12 pl-4 text-left"
              aria-invalid={!!errors.phone}
              aria-describedby={errors.phone ? "phone-error" : "phone-help"}
              {...register("phone")}
            />
            <Smartphone
              aria-hidden="true"
              className="pointer-events-none absolute right-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
            />
          </div>
          {errors.phone ? (
            <p id="phone-error" role="alert" className="login-field-error">
              {errors.phone.message}
            </p>
          ) : (
            <p id="phone-help" className="login-field-help">
              شماره‌ای که برای حساب مدیریت شما ثبت شده است.
            </p>
          )}
        </div>
        {sent && (
          <div className="login-verification">
            <p id="otp-help" className="login-field-help" role="status">
              اگر این شماره برای مدیر فعال ثبت شده باشد، کد ورود ارسال شده است.
            </p>
            <div className="login-field">
              <Label htmlFor="admin-otp">کد ورود</Label>
              <Input
                id="admin-otp"
                dir="ltr"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="— — — — — —"
                className="login-otp-input"
                aria-describedby="otp-help"
                {...register("code")}
              />
            </div>
          </div>
        )}
        {debug && (
          <div className="login-debug">
            <span className="login-debug-label">حالت توسعه فعال است</span>
            <p>
              پیامکی ارسال نمی‌شود. کد آزمایشی: <b dir="ltr">111111</b>
            </p>
          </div>
        )}
        {error && (
          <p id="admin-login-error" role="alert" className="login-error">
            {error}
          </p>
        )}
        <Button type="submit" className="login-submit" disabled={busy}>
          {isSubmitting
            ? "در حال بررسی…"
            : sent
              ? "ورود به پنل"
              : "دریافت کد ورود"}
          {busy ? (
            <LoaderCircle
              className="animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
          ) : (
            <ArrowLeft aria-hidden="true" />
          )}
        </Button>
        {sent && (
          <div className="login-secondary-actions">
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() => {
                setSent(false);
                setError("");
                setFocus("phone");
              }}
            >
              تغییر شماره
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={busy || remaining > 0}
              onClick={async () => {
                setError("");
                setResending(true);
                try {
                  await send(number);
                } catch (error) {
                  setError(
                    error instanceof Error ? error.message : "ارسال انجام نشد.",
                  );
                } finally {
                  setResending(false);
                }
              }}
            >
              {resending
                ? "در حال ارسال…"
                : remaining > 0
                  ? `ارسال دوباره (${remaining.toLocaleString("fa-IR")})`
                  : "ارسال دوباره کد"}
            </Button>
          </div>
        )}
        <p className="login-security-note">
          <ShieldCheck size={16} aria-hidden="true" />
          ورود فقط برای مدیران ثبت‌شدهٔ وب‌سایت
        </p>
      </form>
    </CmsReady>
  );
}
