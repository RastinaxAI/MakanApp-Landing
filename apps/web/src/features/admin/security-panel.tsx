"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminRequest, resetAdminNavigation } from "./client";

type SessionItem = {
  id: string;
  created_at: string;
  last_seen_at: string;
  expires_at: string;
  current: boolean;
};
export function SecurityPanel({
  enabled,
  initialSessions,
}: {
  enabled: boolean;
  initialSessions: SessionItem[];
}) {
  const [sessions, setSessions] = useState(initialSessions);
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [secret, setSecret] = useState("");
  const [confirmCode, setConfirmCode] = useState("");
  const [codes, setCodes] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function perform(action: () => Promise<void>) {
    setBusy(true);
    setMessage("");
    try {
      await action();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "درخواست انجام نشد.");
    } finally {
      setBusy(false);
    }
  }
  const reauth = () => ({
    current_password: password,
    mfa_code: mfaCode.trim() || null,
  });
  async function enroll() {
    await perform(async () => {
      const result = await adminRequest<{ secret: string }>(
        "auth/mfa/enroll",
        "POST",
        reauth(),
      );
      setSecret(result.secret);
      setPassword("");
    });
  }
  async function confirm() {
    await perform(async () => {
      const result = await adminRequest<{ recovery_codes: string[] }>(
        "auth/mfa/confirm",
        "POST",
        { code: confirmCode },
      );
      setCodes(result.recovery_codes);
      setSecret("");
      setConfirmCode("");
    });
  }
  async function changePassword() {
    await perform(async () => {
      await adminRequest("auth/password", "PATCH", {
        ...reauth(),
        new_password: newPassword,
      });
      resetAdminNavigation("/admin/login");
    });
  }
  async function disable() {
    await perform(async () => {
      await adminRequest("auth/mfa/disable", "POST", reauth());
      resetAdminNavigation("/admin/login");
    });
  }
  async function regenerate() {
    await perform(async () => {
      const result = await adminRequest<{ recovery_codes: string[] }>(
        "auth/mfa/recovery-codes",
        "POST",
        reauth(),
      );
      setCodes(result.recovery_codes);
      setPassword("");
      setMfaCode("");
    });
  }
  async function revoke(item: SessionItem) {
    await perform(async () => {
      await adminRequest(`auth/sessions/${item.id}`, "DELETE");
      if (item.current) resetAdminNavigation("/admin/login");
      else setSessions(sessions.filter((session) => session.id !== item.id));
    });
  }
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">امنیت حساب</h1>
      <p className="leading-8 text-muted-foreground">
        نشست‌ها و تنظیمات ورود خود را کنترل کنید. تغییر رمز یا فعال‌سازی و
        غیرفعال‌سازی MFA، همه نشست‌ها را می‌بندد.
      </p>
      {message && (
        <p
          role="alert"
          className="rounded-xl bg-destructive-soft p-4 leading-8 text-destructive"
        >
          {message}
        </p>
      )}
      {codes.length > 0 ? (
        <section className="space-y-4 rounded-2xl border border-border bg-card p-6">
          <h2 className="text-xl font-semibold">
            کدهای بازیابی؛ فقط همین بار نمایش داده می‌شوند
          </h2>
          <p className="leading-8 text-muted-foreground">
            این کدها را در محل امن نگه دارید. هر کد فقط یک بار قابل استفاده است.
            کدهای قبلی با تولید دوباره باطل می‌شوند.
          </p>
          <ul dir="ltr" className="grid gap-3 text-sm tablet:grid-cols-2">
            {codes.map((code) => (
              <li
                key={code}
                className="break-all rounded-lg border border-border p-3 font-mono"
              >
                {code}
              </li>
            ))}
          </ul>
          <Button onClick={() => resetAdminNavigation("/admin/login")}>
            کدها را ذخیره کردم؛ ورود دوباره
          </Button>
        </section>
      ) : (
        <>
          <section className="space-y-5 rounded-2xl border border-border bg-card p-6">
            <h2 className="text-xl font-semibold">تأیید تغییرات حساس</h2>
            <div className="grid gap-5 tablet:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="current-password">رمز فعلی</Label>
                <Input
                  id="current-password"
                  type="password"
                  autoComplete="current-password"
                  maxLength={128}
                  dir="ltr"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="security-code">کد MFA یا بازیابی</Label>
                <Input
                  id="security-code"
                  autoComplete="one-time-code"
                  maxLength={48}
                  dir="ltr"
                  value={mfaCode}
                  onChange={(event) => setMfaCode(event.target.value)}
                />
                <p className="text-sm leading-7 text-muted-foreground">
                  اگر MFA فعال است، کدی تازه وارد کنید؛ هر کد زمانی فقط یک بار
                  استفاده می‌شود.
                </p>
              </div>
            </div>
          </section>
          <section className="space-y-5 rounded-2xl border border-border bg-card p-6">
            <h2 className="text-xl font-semibold">ورود دومرحله‌ای</h2>
            <p className="leading-8 text-muted-foreground">
              وضعیت: {enabled ? "فعال" : "غیرفعال"}. از یک برنامه Authenticator
              استفاده کنید؛ این وب‌سایت کد را با پیامک یا ایمیل ارسال نمی‌کند.
            </p>
            {secret ? (
              <div className="space-y-4">
                <p className="leading-8">
                  کلید زیر را به‌صورت دستی در برنامه Authenticator با کد ۶ رقمی
                  و دوره ۳۰ ثانیه ثبت کنید. سپس کد برنامه را وارد کنید. این
                  مرحله تا ۵ دقیقه معتبر است.
                </p>
                <Label htmlFor="mfa-secret">کلید راه‌اندازی</Label>
                <Input
                  id="mfa-secret"
                  readOnly
                  value={secret}
                  dir="ltr"
                  autoComplete="off"
                />
                <Label htmlFor="confirm-code">کد تأیید برنامه</Label>
                <Input
                  id="confirm-code"
                  inputMode="numeric"
                  dir="ltr"
                  maxLength={6}
                  autoComplete="one-time-code"
                  value={confirmCode}
                  onChange={(event) => setConfirmCode(event.target.value)}
                />
                <Button
                  disabled={busy || confirmCode.length !== 6}
                  onClick={confirm}
                >
                  تأیید و فعال‌سازی MFA
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-3">
                {enabled ? (
                  <>
                    <Button
                      variant="outline"
                      disabled={busy || !password}
                      onClick={regenerate}
                    >
                      تولید دوباره کدهای بازیابی
                    </Button>
                    <Button
                      variant="outline"
                      disabled={busy || !password}
                      onClick={disable}
                    >
                      غیرفعال‌سازی MFA
                    </Button>
                  </>
                ) : (
                  <Button disabled={busy || !password} onClick={enroll}>
                    شروع فعال‌سازی MFA
                  </Button>
                )}
              </div>
            )}
          </section>
          <section className="space-y-4 rounded-2xl border border-border bg-card p-6">
            <h2 className="text-xl font-semibold">تغییر رمز</h2>
            <Label htmlFor="new-password">رمز جدید، حداقل ۱۵ نویسه</Label>
            <Input
              id="new-password"
              type="password"
              dir="ltr"
              autoComplete="new-password"
              maxLength={128}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
            <Button
              disabled={busy || !password || newPassword.length < 15}
              onClick={changePassword}
            >
              تغییر رمز و بستن نشست‌ها
            </Button>
          </section>
          <section className="space-y-4 rounded-2xl border border-border bg-card p-6">
            <h2 className="text-xl font-semibold">نشست‌های فعال</h2>
            <ul className="space-y-4">
              {sessions.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4"
                >
                  <div>
                    <p className="font-medium">
                      {item.current ? "نشست فعلی" : "نشست دیگر"}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      آخرین فعالیت:{" "}
                      {new Date(item.last_seen_at).toLocaleString("fa-IR", { timeZone: "Asia/Tehran" })}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() => revoke(item)}
                  >
                    {item.current ? "خروج از نشست فعلی" : "بستن نشست"}
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
