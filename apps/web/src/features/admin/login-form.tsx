"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "@/lib/validation";
import { ArrowLeft, Smartphone, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AdminRequestError, adminRequest, resetAdminNavigation } from "./client";
import { CmsReady } from "@/features/cms/ready";

export function normalizeDigits(value: string) {
  return value.replace(/[۰-۹٠-٩]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".includes(digit) ? "۰۱۲۳۴۵۶۷۸۹".indexOf(digit) : "٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
}
export function normalizePhone(value: string) {
  return normalizeDigits(value).replace(/[\s()-]/g, "").replace(/^(?:\+98|0098)/, "0");
}
const schema = z.object({ phone: z.string().transform(normalizePhone).pipe(z.string().regex(/^09[0-9]{9}$/, "شماره همراه معتبر وارد کنید.")), code: z.string().optional(), mfa_code: z.string().max(48).optional() });
type Values = z.input<typeof schema>;
export function LoginForm({ debug = false }: { debug?: boolean }) {
  const [sent, setSent] = useState(false);
  const [number, setNumber] = useState("");
  const [error, setError] = useState("");
  const [needsMfa, setNeedsMfa] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const { register, handleSubmit, setValue, setFocus, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema) });
  useEffect(() => {
    if (!remaining) return;
    const timer = setTimeout(() => setRemaining((value) => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [remaining]);
  useEffect(() => { if (sent) setFocus("code"); }, [sent, setFocus]);
  async function send(phone: string) {
    const result = await adminRequest<{ retry_after: number }>("auth/otp/request", "POST", { phone });
    setNumber(phone); setSent(true); setNeedsMfa(false); setValue("code", ""); setRemaining(result.retry_after);
  }
  const submit = handleSubmit(async (values) => {
    setError("");
    try {
      if (!sent) { await send(normalizePhone(values.phone)); return; }
      const code = normalizeDigits(values.code || "").trim();
      if (!/^[0-9]{6}$/.test(code)) { setError("کد شش‌رقمی را وارد کنید."); return; }
      await adminRequest("auth/otp/verify", "POST", { phone: number, code, mfa_code: values.mfa_code?.trim() || null });
      resetAdminNavigation("/admin");
    } catch (error) {
      if (error instanceof AdminRequestError && error.code === "MFA_REQUIRED") setNeedsMfa(true);
      if (error instanceof AdminRequestError && error.retryAfter) setRemaining(error.retryAfter);
      setError(error instanceof Error ? error.message : "ورود انجام نشد.");
    }
  });
  return <CmsReady disabled={isSubmitting} legend="ورود مدیر وب‌سایت"><form onSubmit={submit} noValidate className="space-y-6">
    {debug && <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-7 text-amber-900"><strong>حالت توسعه فعال است</strong><p>پیامکی ارسال نمی‌شود. کد آزمایشی: <b dir="ltr" className="font-mono tracking-widest">111111</b></p></div>}
    <div className="space-y-2">
      <Label htmlFor="admin-phone">شماره همراه</Label>
      <div className="relative"><Input id="admin-phone" type="tel" dir="ltr" inputMode="tel" autoComplete="tel-national" placeholder="09xxxxxxxxx" maxLength={24} readOnly={sent} className="h-12 pe-11 text-left" aria-invalid={!!errors.phone} aria-describedby={errors.phone ? "phone-error" : undefined} {...register("phone")} /><Smartphone aria-hidden="true" className="pointer-events-none absolute end-3 top-3 size-5 text-muted-foreground" /></div>
      {errors.phone && <p id="phone-error" role="alert" className="text-sm text-destructive">{errors.phone.message}</p>}
    </div>
    {sent && <>
      <p className="text-sm leading-7 text-muted-foreground">اگر این شماره برای مدیر فعال ثبت شده باشد، کد ورود ارسال شده است.</p>
      <div className="space-y-2"><Label htmlFor="admin-otp">کد ورود</Label><Input id="admin-otp" dir="ltr" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="— — — — — —" className="h-14 text-center text-2xl tracking-[.45em]" {...register("code")} /></div>
      {needsMfa && <div className="space-y-2"><Label htmlFor="admin-second-factor">کد برنامه تأییدکننده یا بازیابی</Label><Input id="admin-second-factor" dir="ltr" autoComplete="one-time-code" maxLength={48} {...register("mfa_code")} /></div>}
    </>}
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm leading-7 text-destructive">{error}</p>}
    <Button type="submit" className="h-12 w-full" disabled={isSubmitting}>{isSubmitting ? "در حال بررسی…" : sent ? "ورود به پنل" : "دریافت کد ورود"}<ArrowLeft aria-hidden="true" /></Button>
    {sent && <div className="flex items-center justify-between gap-3 text-sm"><Button type="button" variant="ghost" disabled={isSubmitting} onClick={() => { setSent(false); setError(""); }}>تغییر شماره</Button><Button type="button" variant="ghost" disabled={isSubmitting || remaining > 0} onClick={async () => { setError(""); try { await send(number); } catch(error) { setError(error instanceof Error ? error.message : "ارسال انجام نشد."); } }}>{remaining > 0 ? `ارسال دوباره (${remaining.toLocaleString("fa-IR")})` : "ارسال دوباره کد"}</Button></div>}
    <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="size-4" aria-hidden="true" /> ورود فقط برای مدیران ثبت‌شدهٔ وب‌سایت</p>
  </form></CmsReady>;
}
