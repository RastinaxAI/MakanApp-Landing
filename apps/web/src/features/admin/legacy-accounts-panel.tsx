"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "@/lib/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminRequest, resetAdminNavigation } from "./client";
import { roleLabels } from "./admin-shell";

type Account = {
  id: string;
  email: string;
  role: "owner" | "editor" | "sales";
  is_active: boolean;
};
type Result = {
  items: Account[];
  pagination: { page: number; pages: number; total: number };
};
type SessionItem = { id: string; last_seen_at: string; current: boolean };
const schema = z.object({
  email: z.email("ایمیل معتبر وارد کنید.").max(254),
  password: z.string().min(15, "رمز باید حداقل ۱۵ نویسه باشد.").max(128),
  role: z.enum(["owner", "editor", "sales"]),
});
export function LegacyAccountsPanel({ initial, currentId }: { initial: Result; currentId: string }) {
  const [data, setData] = useState(initial);
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Account | null>(null);
  const [selectedSessions, setSelectedSessions] = useState<SessionItem[]>([]);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { role: "editor" },
  });
  const reauth = () => ({
    current_password: password,
    mfa_code: code.trim() || null,
  });
  async function refresh(page = data.pagination.page) {
    setData(await adminRequest<Result>(`accounts?page=${page}&page_size=20`));
  }
  const create = handleSubmit(async (values) => {
    setMessage("");
    try {
      await adminRequest("accounts", "POST", { ...values, ...reauth() });
      reset();
      setPassword("");
      setCode("");
      await refresh();
      setMessage("حساب مدیر ذخیره شد.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "ثبت انجام نشد.");
    }
  });
  async function change(item: Account, patch: Partial<Account>) {
    setBusy(true);
    setMessage("");
    try {
      await adminRequest(`accounts/${item.id}`, "PATCH", {
        ...patch,
        ...reauth(),
      });
      if (item.id === currentId) {
        resetAdminNavigation("/admin/login");
        return;
      }
      await refresh();
      setMessage("تغییر ذخیره و نشست‌های این حساب بسته شد.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تغییر انجام نشد.");
    } finally {
      setBusy(false);
    }
  }
  async function go(page: number) {
    setBusy(true);
    setMessage("");
    try {
      await refresh(page);
    } catch {
      setMessage("فهرست بارگذاری نشد.");
    } finally {
      setBusy(false);
    }
  }
  async function showSessions(item: Account) {
    setBusy(true);
    setMessage("");
    try {
      const rows = await adminRequest<SessionItem[]>(
        `auth/sessions?admin_id=${item.id}`,
      );
      setSelected(item);
      setSelectedSessions(rows);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "نشست‌ها بارگذاری نشدند.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function closeSession(item: SessionItem) {
    setBusy(true);
    setMessage("");
    try {
      await adminRequest(`auth/sessions/${item.id}`, "DELETE");
      if (item.current) resetAdminNavigation("/admin/login");
      else
        setSelectedSessions(
          selectedSessions.filter((row) => row.id !== item.id),
        );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "نشست بسته نشد.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">حساب‌های مدیران</h1>
      <p className="leading-8 text-muted-foreground">
        حساب‌های مدیریت همین وب‌سایت را ایجاد کنید و نقش یا وضعیت آن‌ها را تغییر
        دهید. آخرین مالک فعال قابل غیرفعال‌سازی نیست.
      </p>
      {message && (
        <p
          role="status"
          className="rounded-xl bg-secondary p-4 leading-8 text-foreground"
        >
          {message}
        </p>
      )}
      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-4 text-xl font-semibold">تأیید هویت مالک</h2>
        <div className="grid gap-5 tablet:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="owner-password">رمز فعلی شما</Label>
            <Input
              id="owner-password"
              type="password"
              autoComplete="current-password"
              dir="ltr"
              maxLength={128}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="owner-code">کد MFA یا بازیابی، اگر فعال است</Label>
            <Input
              id="owner-code"
              dir="ltr"
              autoComplete="one-time-code"
              maxLength={48}
              value={code}
              onChange={(event) => setCode(event.target.value)}
            />
          </div>
        </div>
      </section>
      <form
        noValidate
        onSubmit={create}
        className="space-y-4 rounded-2xl border border-border bg-card p-6"
      >
        <h2 className="text-xl font-semibold">مدیر جدید</h2>
        <div className="grid gap-5 tablet:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="new-admin-email">ایمیل مدیر جدید</Label>
            <Input
              id="new-admin-email"
              type="email"
              dir="ltr"
              autoComplete="off"
              maxLength={254}
              {...register("email")}
              aria-invalid={!!errors.email}
            />
            {errors.email && (
              <p role="alert" className="text-sm text-destructive">
                {errors.email.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-admin-password">
              رمز اولیه، حداقل ۱۵ نویسه
            </Label>
            <Input
              id="new-admin-password"
              type="password"
              dir="ltr"
              autoComplete="new-password"
              maxLength={128}
              {...register("password")}
              aria-invalid={!!errors.password}
            />
            {errors.password && (
              <p role="alert" className="text-sm text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-admin-role">نقش</Label>
            <select
              id="new-admin-role"
              className="min-h-11 w-full rounded-lg border border-input bg-card px-3"
              {...register("role")}
            >
              {Object.entries(roleLabels).map(([role, label]) => (
                <option key={role} value={role}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <Button type="submit" disabled={isSubmitting || !password}>
          {isSubmitting ? "در حال ثبت…" : "ایجاد حساب مدیر"}
        </Button>
      </form>
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">
          مدیران ثبت‌شده ({data.pagination.total.toLocaleString("fa-IR")})
        </h2>
        <ul className="space-y-4">
          {data.items.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5"
            >
              <div className="min-w-0">
                <p dir="ltr" className="break-all font-medium">
                  {item.email}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {roleLabels[item.role]} ·{" "}
                  {item.is_active ? "فعال" : "غیرفعال"}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <select
                  aria-label={`نقش ${item.email}`}
                  className="min-h-11 rounded-lg border border-input bg-card px-3"
                  value={item.role}
                  disabled={busy || !password}
                  onChange={(event) =>
                    change(item, {
                      role: event.target.value as Account["role"],
                    })
                  }
                >
                  {Object.entries(roleLabels).map(([role, label]) => (
                    <option key={role} value={role}>
                      {label}
                    </option>
                  ))}
                </select>
                <Button
                  variant="outline"
                  disabled={busy || !password}
                  onClick={() => change(item, { is_active: !item.is_active })}
                >
                  {item.is_active ? "غیرفعال کردن" : "فعال کردن"}
                </Button>
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => showSessions(item)}
                >
                  نشست‌ها
                </Button>
              </div>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center gap-4">
          <Button
            variant="outline"
            disabled={busy || data.pagination.page <= 1}
            onClick={() => go(data.pagination.page - 1)}
          >
            صفحه قبل
          </Button>
          <span className="text-sm">
            صفحه {data.pagination.page.toLocaleString("fa-IR")}
          </span>
          <Button
            variant="outline"
            disabled={busy || data.pagination.page >= data.pagination.pages}
            onClick={() => go(data.pagination.page + 1)}
          >
            صفحه بعد
          </Button>
        </div>
      </section>
      {selected && (
        <section className="space-y-4 rounded-2xl border border-border bg-card p-6">
          <h2 className="break-all text-xl font-semibold">
            نشست‌های {selected.email}
          </h2>
          {selectedSessions.length === 0 ? (
            <p className="leading-8 text-muted-foreground">
              نشست فعالی وجود ندارد.
            </p>
          ) : (
            <ul className="space-y-3">
              {selectedSessions.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4"
                >
                  <span className="text-sm">
                    آخرین فعالیت:{" "}
                    {new Date(item.last_seen_at).toLocaleString("fa-IR", { timeZone: "Asia/Tehran" })}
                  </span>
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() => closeSession(item)}
                  >
                    بستن نشست مدیر
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
