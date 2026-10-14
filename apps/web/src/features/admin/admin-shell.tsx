"use client";
import Link from "next/link";
import Image from "next/image";
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
  Menu,
  ExternalLink,
  GraduationCap,
  MessageSquare,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
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
  const canvas = path.endsWith("/builder");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const items = [
    {
      href: "/admin",
      label: "داشبورد",
      icon: LayoutDashboard,
      group: "پیشخوان",
    },
    ...(profile.capabilities.includes("content")
      ? [
          {
            href: "/admin/builder",
            label: "قالب‌ها و طراحی سایت",
            icon: FileText,
            group: "محتوا",
          },
          {
            href: "/admin/content",
            label: "محتوای سایت",
            icon: FileText,
            group: "محتوا",
          },
          {
            href: "/admin/learn",
            label: "آموزش و وبلاگ",
            icon: GraduationCap,
            group: "محتوا",
          },
          {
            href: "/admin/learn/taxonomy",
            label: "دسته‌ها و برچسب‌ها",
            icon: Tags,
            group: "محتوا",
          },
          {
            href: "/admin/media",
            label: "رسانه‌ها",
            icon: ImageIcon,
            group: "محتوا",
          },
          {
            href: "/admin/faq-categories",
            label: "دسته‌های پرسش",
            icon: MessageSquare,
            group: "محتوا",
          },
        ]
      : []),
    ...(profile.capabilities.includes("leads")
      ? [
          {
            href: "/admin/crm",
            label: "فروش و پروندهٔ مدارس",
            icon: BarChart3,
            group: "ارتباط با مشتری",
          },
          {
            href: "/admin/leads",
            label: "درخواست‌ها و پیگیری",
            icon: Users,
            group: "ارتباط با مشتری",
          },
          {
            href: "/admin/analytics",
            label: "آمار استفاده و سرعت",
            icon: BarChart3,
            group: "ارتباط با مشتری",
          },
        ]
      : []),
    ...(profile.role === "owner"
      ? [
          {
            href: "/admin/accounts",
            label: "حساب‌های مدیران",
            icon: Users,
            group: "مدیریت",
          },
          {
            href: "/admin/settings",
            label: "تنظیمات سایت",
            icon: Settings,
            group: "مدیریت",
          },
          {
            href: "/admin/settings/sms",
            label: "پنل پیامکی",
            icon: MessageSquare,
            group: "مدیریت",
          },
          {
            href: "/admin/audit",
            label: "رویدادهای مدیریت",
            icon: FileClock,
            group: "مدیریت",
          },
        ]
      : []),
    {
      href: "/admin/security",
      label: "امنیت حساب",
      icon: ShieldCheck,
      group: "مدیریت",
    },
  ];
  const active = items
    .filter(
      (item) =>
        path === item.href ||
        (item.href !== "/admin" && path.startsWith(item.href + "/")),
    )
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
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
  function navigation(mobile = false) {
    return (
      <nav aria-label="بخش‌های مدیریت" className="space-y-5 px-3 pb-6 pt-5">
        {[...new Set(items.map((item) => item.group))].map((group) => (
          <div key={group}>
            <p className="mb-2 px-3 text-xs font-medium text-slate-400">
              {group}
            </p>
            <div className="space-y-1">
              {items
                .filter((item) => item.group === group)
                .map((item) => {
                  const link = (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch={false}
                      onClick={() => setOpen(false)}
                      aria-current={active === item.href ? "page" : undefined}
                      className={`flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${active === item.href ? "bg-primary text-white" : "text-slate-200 hover:bg-slate-700 hover:text-white"}`}
                    >
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-white/10">
                        <item.icon className="size-4" aria-hidden="true" />
                      </span>
                      <span>{item.label}</span>
                    </Link>
                  );
                  return mobile ? (
                    <SheetClose key={item.href} asChild>
                      {link}
                    </SheetClose>
                  ) : (
                    link
                  );
                })}
            </div>
          </div>
        ))}
      </nav>
    );
  }
  return (
    <div className="admin-workspace min-h-screen bg-slate-100 text-slate-800">
      <a className="skip-link" href="#admin-main" tabIndex={0}>
        رفتن به محتوای پنل
      </a>
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-3 bg-slate-900 px-4 text-white desktop:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={`text-white hover:bg-slate-700 hover:text-white ${canvas ? "" : "desktop:hidden"}`}
                aria-label="باز کردن منوی مدیریت"
              >
                <Menu aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-72 overflow-y-auto border-0 bg-slate-800 p-0 text-white [&_:focus-visible]:outline-white [&>button]:text-slate-200 [&>button]:hover:bg-slate-700 [&>button]:hover:text-white"
              dir="rtl"
            >
              <SheetHeader className="px-5 pt-6">
                <SheetTitle className="text-white">پیشخوان ماکان</SheetTitle>
                <SheetDescription className="text-slate-300">
                  بخش‌های مدیریت وب‌سایت
                </SheetDescription>
              </SheetHeader>
              {navigation(true)}
            </SheetContent>
          </Sheet>
          <Link
            href="/admin"
            prefetch={false}
            className="flex items-center gap-3 rounded-md"
          >
            <Image
              src="/brand/makan-logo.png"
              alt=""
              width={32}
              height={32}
              sizes="32px"
              className="rounded-[7px]"
            />
            <span className="text-sm font-semibold tablet:text-base">
              پیشخوان ماکان
            </span>
          </Link>
          <span className="hidden border-s border-slate-600 ps-4 text-xs text-slate-300 tablet:inline">
            {roleLabels[profile.role]}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/"
            prefetch={false}
            className="hidden min-h-11 items-center gap-2 rounded-md px-3 text-sm text-slate-200 hover:bg-slate-700 tablet:flex"
          >
            <ExternalLink className="size-4" aria-hidden="true" /> مشاهده
            وب‌سایت
          </Link>
          <Button
            variant="ghost"
            onClick={logout}
            disabled={busy}
            className="text-white hover:bg-slate-700 hover:text-white"
          >
            <LogOut className="size-4" aria-hidden="true" />
            <span className="hidden tablet:inline">
              {busy ? "در حال خروج…" : "خروج"}
            </span>
            <span className="sr-only tablet:hidden">خروج</span>
          </Button>
        </div>
      </header>
      <aside
        className={`fixed bottom-0 start-0 top-14 z-30 hidden w-60 overflow-y-auto bg-slate-800 ${canvas ? "" : "desktop:block"}`}
      >
        <div className="border-b border-slate-700 px-6 py-5">
          <p className="text-sm font-medium text-white">مدیریت وب‌سایت</p>
          <p className="mt-2 break-all text-xs text-slate-300" dir="ltr">
            {profile.phone || profile.email}
          </p>
        </div>
        {navigation()}
      </aside>
      <div className={canvas ? "" : "desktop:ps-60"}>
        <main
          id="admin-main"
          tabIndex={-1}
          className={`mx-auto min-w-0 ${canvas ? "max-w-none p-3" : "max-w-[1440px] p-4 tablet:p-6 desktop:p-8"}`}
        >
          {error && (
            <p
              role="alert"
              className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-destructive"
            >
              {error}
            </p>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
