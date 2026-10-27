"use client";
import { useState } from "react";
import { CmsReady } from "@/features/cms/ready";
import { Users, UserPlus, ShieldCheck, Search } from "lucide-react";
import {
  AdminPageHeader,
  AdminPanel,
  AdminNotice,
  AdminEmpty,
} from "./page-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LegacyAccountsPanel } from "./legacy-accounts-panel";
import { OtpConfirmation } from "./otp-confirmation";
import { adminRequest, resetAdminNavigation } from "./client";
import { roleLabels } from "./admin-shell";
import { normalizePhone } from "./login-form";
type Account = {
  id: string;
  phone: string | null;
  email: string | null;
  role: "owner" | "editor" | "sales";
  is_active: boolean;
};
type Result = {
  items: Account[];
  pagination: { page: number; pages: number; total: number };
};
export function AccountsPanel({
  initial,
  currentId,
  legacy = false,
}: {
  initial: Result;
  currentId: string;
  legacy?: boolean;
}) {
  if (legacy)
    return (
      <LegacyAccountsPanel
        initial={
          initial as Parameters<typeof LegacyAccountsPanel>[0]["initial"]
        }
        currentId={currentId}
      />
    );
  return <PhoneAccounts initial={initial} currentId={currentId} />;
}
function PhoneAccounts({
  initial,
  currentId,
}: {
  initial: Result;
  currentId: string;
}) {
  const [search, setSearch] = useState("");
  const [data, setData] = useState(initial);
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<Account["role"]>("editor");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const credentials = () => ({
    confirmation_code: code,
  });
  async function refresh(page = data.pagination.page) {
    setData(await adminRequest<Result>(`accounts?page=${page}&page_size=20`));
  }
  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (!/^09[0-9]{9}$/.test(normalizePhone(phone))) {
      setMessage("شماره همراه معتبر وارد کنید.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      await adminRequest("accounts", "POST", {
        phone: normalizePhone(phone),
        role,
        ...credentials(),
      });
      setPhone("");
      setCode("");
      setSearch("");
      await refresh(Math.max(1, Math.ceil((data.pagination.total + 1) / 20)));
      setMessage("حساب مدیر ایجاد شد؛ مدیر با شماره همراه خود وارد می‌شود.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "ثبت انجام نشد.");
    } finally {
      setBusy(false);
    }
  }
  async function change(item: Account, patch: Partial<Account>) {
    setBusy(true);
    setMessage("");
    try {
      await adminRequest(`accounts/${item.id}`, "PATCH", {
        ...patch,
        ...credentials(),
      });
      setCode("");
      if (item.id === currentId) {
        resetAdminNavigation("/admin/login");
        return;
      }
      await refresh();
      setMessage("تغییر ثبت شد و نشست‌های آن حساب بسته شدند.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تغییر انجام نشد.");
    } finally {
      setBusy(false);
    }
  }
  async function turn(page: number) {
    setBusy(true);
    setMessage("");
    try {
      await refresh(page);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "فهرست بارگذاری نشد.",
      );
    } finally {
      setBusy(false);
    }
  }
  const visible = data.items.filter((item) =>
    (item.phone || item.email || "").includes(search),
  );
  return (
    <CmsReady disabled={busy}>
      <div className="admin-page">
        <AdminPageHeader
          title="حساب‌های مدیران"
          eyebrow="تیم مدیریت وب‌سایت"
          icon={Users}
          description="دسترسی همکاران را با شماره همراه و نقش مشخص مدیریت کنید."
          actions={
            <Button asChild>
              <a href="#account-create">
                <UserPlus aria-hidden="true" />
                افزودن مدیر
              </a>
            </Button>
          }
        />
        {message && <AdminNotice>{message}</AdminNotice>}
        <div className="admin-editor-layout">
          <div className="space-y-5">
            <AdminPanel title="مدیران ثبت‌شده" count={data.pagination.total}>
              <label className="relative mb-5 block">
                <span className="sr-only">جست‌وجوی مدیران این صفحه</span>
                <Search
                  className="pointer-events-none absolute start-3 top-3.5 size-4 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  className="ps-10"
                  placeholder="جست‌وجو با شماره همراه…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
              {data.pagination.pages > 1 && (
                <p className="mb-4 text-xs text-muted-foreground">
                  جست‌وجو در حساب‌های همین صفحه انجام می‌شود.
                </p>
              )}
              {visible.length ? (
                <ul className="admin-record-list" aria-label="فهرست حساب‌ها">
                  {visible.map((item) => (
                    <li
                      key={item.id}
                      className="admin-record"
                      aria-label={item.phone || item.email || "مدیر"}
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="admin-page-symbol">
                          <Users className="size-4" aria-hidden="true" />
                        </span>
                        <div className="min-w-0">
                          <p
                            dir="ltr"
                            className="break-all text-sm font-semibold"
                          >
                            {item.phone || "نیازمند اتصال شماره"}
                          </p>
                          <p className="mt-2 text-xs text-muted-foreground">
                            {roleLabels[item.role]}
                            {item.id === currentId ? " · حساب شما" : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <span
                          className={`admin-pill ${item.is_active ? "bg-success-soft text-success" : "bg-slate-100 text-slate-600"}`}
                        >
                          {item.is_active ? "فعال" : "غیرفعال"}
                        </span>
                        <select
                          aria-label={`نقش ${item.phone || item.email}`}
                          value={item.role}
                          disabled={busy || code.length !== 6}
                          onChange={(e) =>
                            void change(item, {
                              role: e.target.value as Account["role"],
                            })
                          }
                          className="min-h-11 rounded-lg border border-input bg-white px-3 text-xs"
                        >
                          {Object.entries(roleLabels).map(([key, label]) => (
                            <option key={key} value={key}>
                              {label}
                            </option>
                          ))}
                        </select>
                        <Button
                          variant="ghost"
                          className="text-xs"
                          disabled={busy || code.length !== 6}
                          onClick={() =>
                            void change(item, { is_active: !item.is_active })
                          }
                        >
                          {item.is_active ? "غیرفعال‌کردن" : "فعال‌کردن"}
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <AdminEmpty
                  title="حسابی پیدا نشد"
                  description="شمارهٔ دیگری را جست‌وجو کنید."
                  icon={Users}
                />
              )}
            </AdminPanel>
            <nav
              aria-label="صفحه‌های حساب‌ها"
              className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground"
            >
              <Button
                variant="outline"
                disabled={busy || data.pagination.page <= 1}
                onClick={() => void turn(data.pagination.page - 1)}
              >
                قبلی
              </Button>
              <span>صفحه {data.pagination.page.toLocaleString("fa-IR")}</span>
              <Button
                variant="outline"
                disabled={busy || data.pagination.page >= data.pagination.pages}
                onClick={() => void turn(data.pagination.page + 1)}
              >
                بعدی
              </Button>
            </nav>
            <div className="admin-help flex gap-3">
              <ShieldCheck
                className="mt-1 size-4 shrink-0"
                aria-hidden="true"
              />
              <p>
                آخرین مالک فعال حفظ می‌شود. تغییر نقش یا وضعیت، نشست‌های حساب
                مربوط را می‌بندد.
              </p>
            </div>
          </div>
          <div className="space-y-5">
            <AdminPanel
              title="افزودن مدیر"
              id="account-create"
              description="حساب تازه با شمارهٔ همراه وارد پنل می‌شود."
            >
              <form onSubmit={create} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-admin-phone">شماره همراه مدیر جدید</Label>
                  <Input
                    id="new-admin-phone"
                    dir="ltr"
                    type="tel"
                    inputMode="tel"
                    maxLength={24}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-admin-role">نقش</Label>
                  <select
                    id="new-admin-role"
                    value={role}
                    onChange={(e) => setRole(e.target.value as Account["role"])}
                    className="min-h-11 w-full rounded-lg border border-input bg-white px-3 text-sm"
                  >
                    {Object.entries(roleLabels).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <Button
                  className="w-full text-xs"
                  type="submit"
                  disabled={busy || code.length !== 6}
                >
                  <UserPlus aria-hidden="true" />
                  ایجاد حساب مدیر
                </Button>
              </form>
            </AdminPanel>
            <OtpConfirmation
              value={code}
              onChange={setCode}
              prefix="accounts"
            />
          </div>
        </div>
      </div>
    </CmsReady>
  );
}
