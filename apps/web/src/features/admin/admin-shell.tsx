"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  ShieldCheck,
  Users,
  FileClock,
  LogOut,
  FileText,
  ImageIcon,
  Tags,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AdminProfile } from "@/lib/admin-api";
import { adminRequest, resetAdminNavigation } from "./client";

export const roleLabels = { owner: "مالک", editor: "ویرایشگر", sales: "فروش" };
export function AdminShell({
  profile,
  children,
}: {
  profile: AdminProfile;
  children: ReactNode;
}) {
  const path = usePathname();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const items = [
    { href: "/admin", label: "داشبورد", icon: LayoutDashboard },
    { href: "/admin/security", label: "امنیت حساب", icon: ShieldCheck },
    ...(profile.capabilities.includes("leads")
      ? [{ href: "/admin/leads", label: "درخواست‌ها و پیگیری", icon: Users }]
      : []),
    ...(profile.capabilities.includes("content")
      ? [
          { href: "/admin/content", label: "محتوای سایت", icon: FileText },
          { href: "/admin/learn", label: "آموزش و وبلاگ", icon: FileText },
          {
            href: "/admin/learn/taxonomy",
            label: "دسته‌ها و برچسب‌ها",
            icon: Tags,
          },
          { href: "/admin/media", label: "رسانه‌ها", icon: ImageIcon },
          { href: "/admin/faq-categories", label: "دسته‌های پرسش", icon: Tags },
        ]
      : []),
    ...(profile.role === "owner"
      ? [
          { href: "/admin/settings", label: "تنظیمات سایت", icon: Settings },
          { href: "/admin/accounts", label: "حساب‌های مدیران", icon: Users },
          { href: "/admin/audit", label: "رویدادهای مدیریت", icon: FileClock },
        ]
      : []),
  ];
  async function logout() {
    setBusy(true);
    setError("");
    try {
      await adminRequest("auth/logout", "POST");
      resetAdminNavigation("/admin/login");
    } catch (error) {
      setError(error instanceof Error ? error.message : "خروج انجام نشد.");
      setBusy(false);
    }
  }
  return (
    <div className="min-h-screen bg-background">
      <a className="skip-link" href="#admin-main" tabIndex={0}>
        رفتن به محتوای پنل
      </a>
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4">
          <Link href="/admin" className="text-xl font-semibold">
            ماکان{" "}
            <span className="text-sm font-normal text-muted-foreground">
              / مدیریت وب‌سایت
            </span>
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {roleLabels[profile.role]}
            </span>
            <Button variant="outline" onClick={logout} disabled={busy}>
              <LogOut size={18} aria-hidden="true" />{" "}
              {busy ? "در حال خروج…" : "خروج"}
            </Button>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-6 p-5 desktop:grid-cols-[15rem_minmax(0,1fr)] desktop:p-8">
        <aside className="min-w-0">
          <p className="mb-4 break-all text-sm text-muted-foreground" dir="ltr">
            {profile.email}
          </p>
          <nav
            aria-label="بخش‌های مدیریت"
            className="grid grid-cols-2 gap-2 desktop:grid-cols-1"
          >
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                aria-current={path === item.href ? "page" : undefined}
                className={`flex min-h-12 items-center gap-3 rounded-xl px-3 py-2 text-sm ${path === item.href ? "bg-primary text-primary-foreground" : "bg-card text-foreground hover:bg-secondary"}`}
              >
                <item.icon size={18} className="shrink-0" aria-hidden="true" />
                {item.label}
              </Link>
            ))}
          </nav>
          <Link
            href="/"
            className="mt-5 inline-flex min-h-11 items-center rounded-lg text-sm text-primary-hover"
          >
            مشاهده وب‌سایت
          </Link>
        </aside>
        <main id="admin-main" tabIndex={-1} className="min-w-0">
          {error && (
            <p role="alert" className="mb-4 text-destructive">
              {error}
            </p>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
