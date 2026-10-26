"use client";
import { useState } from "react";
import { CmsReady } from "@/features/cms/ready";
import Link from "next/link";
import { FileClock, Search, LogIn, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AdminPageHeader, AdminPanel, AdminEmpty } from "./page-kit";
const labels: Record<string, string> = {
  "auth.login": "ورود موفق",
  "auth.otp_login": "ورود با کد پیامکی",
  "auth.login_failed": "ورود ناموفق",
  "auth.logout": "خروج",
  "auth.session_revoked": "لغو نشست",
  "auth.password_changed": "تغییر رمز",
  "admin.created": "ایجاد حساب",
  "admin.updated": "تغییر حساب",
  "admin.bootstrap": "ایجاد اولین مالک",
  "admin.operator_recovery": "بازیابی توسط اپراتور",
  "mfa.enabled": "فعال‌سازی MFA",
  "mfa.disabled": "غیرفعال‌سازی MFA",
  "mfa.enrollment_started": "شروع راه‌اندازی MFA",
  "mfa.recovery_regenerated": "تولید دوباره کدهای بازیابی",
};
export function AuditPanel({
  items,
  page,
  pages,
}: {
  items: { id: string; action: string; created_at: string }[];
  page: number;
  pages: number;
}) {
  const [query, setQuery] = useState("");
  const visible = items.filter(
    (item) =>
      (labels[item.action] || "رویداد مدیریت").includes(query) ||
      item.action.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <CmsReady>
      <div className="admin-page">
        <AdminPageHeader
          title="رویدادهای مدیریت"
          eyebrow="تاریخچهٔ تغییرات حساس"
          icon={FileClock}
          description="ورودها و عملیات مهم حساب‌ها را در یک تاریخچهٔ قابل پیگیری مرور کنید."
        />
        <div className="admin-help flex items-start gap-3">
          <ShieldCheck className="mt-1 size-4 shrink-0" aria-hidden="true" />
          <p>
            رمزها، کدهای ورود و متن اطلاعات خصوصی در این فهرست نمایش داده
            نمی‌شوند.
          </p>
        </div>
        <AdminPanel
          title="تازه‌ترین رویدادهای این صفحه"
          count={items.length}
          description={`صفحهٔ ${page.toLocaleString("fa-IR")}`}
        >
          <label className="relative mb-5 block">
            <span className="sr-only">جست‌وجوی رویدادهای این صفحه</span>
            <Search
              className="pointer-events-none absolute start-3 top-3.5 size-4 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              className="ps-10"
              placeholder="نوع رویداد را جست‌وجو کنید…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          {visible.length ? (
            <ul className="admin-record-list">
              {visible.map((item) => (
                <li key={item.id} className="admin-record">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="admin-page-symbol">
                      {["auth.login", "auth.otp_login"].includes(
                        item.action,
                      ) ? (
                        <LogIn className="size-4" aria-hidden="true" />
                      ) : (
                        <FileClock className="size-4" aria-hidden="true" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">
                        {labels[item.action] || "رویداد مدیریت"}
                      </p>
                      <p
                        dir="ltr"
                        className="mt-2 break-all text-[11px] text-muted-foreground"
                      >
                        {item.action}
                      </p>
                    </div>
                  </div>
                  <time
                    dateTime={item.created_at}
                    className="text-xs leading-7 text-muted-foreground"
                  >
                    {new Date(item.created_at).toLocaleString("fa-IR", {
                      timeZone: "Asia/Tehran",
                    })}
                  </time>
                </li>
              ))}
            </ul>
          ) : (
            <AdminEmpty
              title="رویدادی پیدا نشد"
              description={
                query
                  ? "عبارت دیگری را در رویدادهای این صفحه جست‌وجو کنید."
                  : "رویدادهای مدیریت پس از ثبت در اینجا نمایش داده می‌شوند."
              }
              icon={FileClock}
            />
          )}
        </AdminPanel>
        <nav
          aria-label="صفحه‌های رویداد"
          className="flex flex-wrap items-center justify-between gap-3"
        >
          <span className="text-xs text-muted-foreground">
            صفحه {page.toLocaleString("fa-IR")} از{" "}
            {Math.max(1, pages).toLocaleString("fa-IR")}
          </span>
          <div className="flex gap-3">
            {page > 1 && (
              <Button asChild variant="outline">
                <Link href={`/admin/audit?page=${page - 1}`}>صفحه قبل</Link>
              </Button>
            )}
            {page < pages && (
              <Button asChild variant="outline">
                <Link href={`/admin/audit?page=${page + 1}`}>صفحه بعد</Link>
              </Button>
            )}
          </div>
        </nav>
      </div>
    </CmsReady>
  );
}
