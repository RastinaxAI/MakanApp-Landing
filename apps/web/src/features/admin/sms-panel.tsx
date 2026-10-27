"use client";
import { useState } from "react";
import { CmsReady } from "@/features/cms/ready";
import { MessageSquare, ShieldCheck, Cable, FlaskConical } from "lucide-react";
import { AdminPageHeader, AdminPanel, AdminNotice } from "./page-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminRequest } from "./client";
import { OtpConfirmation } from "./otp-confirmation";
export type SmsSettings = {
  enabled: boolean;
  debug_mode: boolean;
  debug_allowed: boolean;
  credentials_configured: boolean;
  body_id: number | null;
  row_version: number;
};
export function SmsPanel({ initial }: { initial: SmsSettings }) {
  const [data, setData] = useState(initial);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [bodyId, setBodyId] = useState(String(initial.body_id || ""));
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const result = await adminRequest<SmsSettings>(
        "settings/sms",
        "PATCH",
        {
          enabled: data.enabled,
          debug_mode: data.debug_mode,
          username: username || null,
          password: password || null,
          body_id: bodyId ? Number(bodyId) : null,
          confirmation_code: confirmation,
        },
        data.row_version,
      );
      setData(result);
      setUsername("");
      setPassword("");
      setConfirmation("");
      setMessage("تنظیمات پنل پیامکی ذخیره شد.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "ذخیره انجام نشد.");
    } finally {
      setBusy(false);
    }
  }
  async function check() {
    setBusy(true);
    setMessage("");
    try {
      const result = await adminRequest<{ message: string }>(
        "settings/sms/check",
        "POST",
      );
      setMessage(result.message);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "ارتباط برقرار نشد.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <CmsReady disabled={busy}>
      <div className="admin-page">
        <AdminPageHeader
          title="پنل پیامکی"
          eyebrow="اتصال سرویس ارسال"
          icon={MessageSquare}
          description="ملی‌پیامک را برای ارسال کد ورود مدیران متصل و تنظیمات ارسال را مدیریت کنید."
        />
        {message && <AdminNotice>{message}</AdminNotice>}
        <form onSubmit={save} autoComplete="off">
          <div className="admin-editor-layout">
            <AdminPanel
              title="اتصال ملی‌پیامک"
              description="اطلاعات وب‌سرویس و الگوی خدماتی تأییدشده را وارد کنید."
            >
              <div className="admin-form-grid">
                <div className="space-y-2">
                  <Label htmlFor="sms-user">نام کاربری ملی‌پیامک</Label>
                  <Input
                    id="sms-user"
                    dir="ltr"
                    autoComplete="off"
                    maxLength={128}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={
                      data.credentials_configured ? "قبلاً ذخیره شده" : ""
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sms-password">رمز وب‌سرویس ملی‌پیامک</Label>
                  <Input
                    id="sms-password"
                    type="password"
                    dir="ltr"
                    autoComplete="new-password"
                    maxLength={256}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={
                      data.credentials_configured
                        ? "برای حفظ رمز، خالی بگذارید"
                        : ""
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sms-template">
                    شناسه الگوی خدماتی (Body ID)
                  </Label>
                  <Input
                    id="sms-template"
                    dir="ltr"
                    type="number"
                    min={1}
                    value={bodyId}
                    onChange={(e) => setBodyId(e.target.value)}
                  />
                  <p className="text-xs leading-7 text-muted-foreground">
                    الگوی تأییدشده با یک پارامتر کد ورود شش‌رقمی.
                  </p>
                </div>
              </div>
              <div className="mt-6 space-y-4 border-t border-border pt-5">
                <label className="flex min-h-11 items-start gap-3 text-sm leading-7">
                  <input
                    type="checkbox"
                    checked={data.enabled}
                    onChange={(e) =>
                      setData({ ...data, enabled: e.target.checked })
                    }
                    className="mt-1 size-5 shrink-0 accent-primary"
                  />
                  اتصال پنل پیامکی فعال باشد
                </label>
                {data.debug_allowed && (
                  <label className="flex min-h-11 items-start gap-3 text-sm leading-7">
                    <input
                      type="checkbox"
                      checked={data.debug_mode}
                      onChange={(e) =>
                        setData({ ...data, debug_mode: e.target.checked })
                      }
                      className="mt-1 size-5 shrink-0 accent-primary"
                    />
                    حالت توسعه با کد ثابت 111111 و بدون ارسال پیامک
                  </label>
                )}
                <p className="text-xs leading-7 text-muted-foreground">
                  اطلاعات ورود رمزگذاری می‌شوند و دوباره نمایش داده نمی‌شوند.
                  خالی‌گذاشتن رمز، مقدار ذخیره‌شده را حفظ می‌کند.
                </p>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Button
                  type="submit"
                  disabled={busy || confirmation.length !== 6}
                >
                  {busy ? "در حال بررسی…" : "ذخیره تنظیمات پیامک"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy || !data.credentials_configured}
                  onClick={check}
                >
                  <Cable aria-hidden="true" />
                  بررسی اتصال
                </Button>
              </div>
              <p className="mt-3 text-xs leading-7 text-muted-foreground">
                بررسی اتصال پیامکی ارسال نمی‌کند.
              </p>
            </AdminPanel>
            <div className="space-y-5">
              <AdminPanel title="وضعیت پیکربندی">
                <dl className="space-y-4 text-xs">
                  <div className="flex items-center justify-between gap-3">
                    <dt>حالت ارسال</dt>
                    <dd className="admin-pill bg-secondary text-primary-hover">
                      {data.debug_mode
                        ? "حالت توسعه"
                        : data.enabled
                          ? "ارسال واقعی"
                          : "غیرفعال"}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt>اطلاعات سرویس</dt>
                    <dd>
                      {data.credentials_configured ? "ثبت شده" : "تکمیل نشده"}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt>شناسه الگو</dt>
                    <dd>
                      {data.body_id?.toLocaleString("fa-IR") || "ثبت نشده"}
                    </dd>
                  </div>
                </dl>
                <div className="admin-help mt-5 flex gap-2">
                  <ShieldCheck
                    className="mt-1 size-4 shrink-0"
                    aria-hidden="true"
                  />
                  <p>
                    در محیط انتشار، کد ثابت غیرفعال است و خطای ارسال پیامک آن را
                    فعال نمی‌کند.
                  </p>
                </div>
              </AdminPanel>
              <OtpConfirmation
                value={confirmation}
                onChange={setConfirmation}
                prefix="sms"
              />
              {data.debug_mode && (
                <p className="flex items-start gap-2 px-1 text-xs leading-7 text-muted-foreground">
                  <FlaskConical
                    className="mt-1 size-4 shrink-0"
                    aria-hidden="true"
                  />
                  حالت توسعه برای اجرای محلی است؛ وضعیت ثبت‌شده به معنی تأیید
                  اتصال سرویس نیست.
                </p>
              )}
            </div>
          </div>
        </form>
      </div>
    </CmsReady>
  );
}
