"use client";
import { useState } from "react";
import { CmsReady } from "@/features/cms/ready";
import { ShieldCheck, Monitor, Smartphone } from "lucide-react";
import { AdminPageHeader } from "./page-kit";
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
  initialSessions,
  legacy = false,
}: {
  legacy?: boolean;
  initialSessions: SessionItem[];
}) {
  const [sessions, setSessions] = useState(initialSessions);
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
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
  async function changePassword() {
    await perform(async () => {
      await adminRequest("auth/password", "PATCH", {
        current_password: password,
        new_password: newPassword,
      });
      resetAdminNavigation("/admin/login");
    });
  }
  async function revoke(item: SessionItem) {
    await perform(async () => {
      await adminRequest(`auth/sessions/${item.id}`, "DELETE");
      if (item.current) resetAdminNavigation("/admin/login");
      else
        setSessions((items) =>
          items.filter((session) => session.id !== item.id),
        );
    });
  }
  return (
    <CmsReady disabled={busy}>
      <div className="admin-page">
        <AdminPageHeader
          title="امنیت حساب"
          eyebrow="حفاظت از دسترسی شما"
          icon={ShieldCheck}
          description="نشست‌های فعال را بررسی کنید و دسترسی دستگاه‌های دیگر را ببندید."
        />
        <div className="grid gap-4 tablet:grid-cols-2">
          <div className="admin-surface flex items-center gap-4 p-5">
            <span className="admin-page-symbol">
              <Smartphone className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs text-muted-foreground">روش ورود</p>
              <p className="mt-2 text-sm font-semibold">
                {legacy ? "رمز عبور — محیط آزمون" : "شماره همراه و کد پیامکی"}
              </p>
            </div>
          </div>
          <div className="admin-surface flex items-center gap-4 p-5">
            <span className="admin-page-symbol">
              <Monitor className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs text-muted-foreground">نشست‌های فعال</p>
              <p className="mt-2 text-sm font-semibold">
                {sessions.length.toLocaleString("fa-IR")} نشست
              </p>
            </div>
          </div>
        </div>
        {message && (
          <p
            role="alert"
            className="rounded-xl bg-destructive-soft p-4 leading-8 text-destructive"
          >
            {message}
          </p>
        )}
        {legacy && (
          <section className="admin-security-section space-y-4 rounded-2xl border border-border bg-white">
            <h2 className="text-xl font-semibold">تغییر رمز</h2>
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
        )}
        <section className="admin-security-section space-y-4 rounded-2xl border border-border bg-white">
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
                    {new Date(item.last_seen_at).toLocaleString("fa-IR", {
                      timeZone: "Asia/Tehran",
                    })}
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
      </div>
    </CmsReady>
  );
}
