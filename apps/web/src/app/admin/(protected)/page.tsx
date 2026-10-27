import Link from "next/link";
import {
  FileText,
  GraduationCap,
  Users,
  ImageIcon,
  Settings,
  ShieldCheck,
  ArrowLeft,
  BookOpen,
} from "lucide-react";
import { AdminPageHeader, AdminPanel } from "@/features/admin/page-kit";
import { Button } from "@/components/ui/button";
import { adminGet, requireAdmin } from "@/lib/admin-api";
export default async function DashboardPage() {
  const profile = await requireAdmin();
  const data = await adminGet<{
    metrics: Record<string, number>;
    modules: Record<string, string>;
  }>("dashboard");
  const labels: Record<string, string> = {
    active_admins: "مدیر فعال",
    pages: "محتوای ثبت‌شده",
    leads: "درخواست ثبت‌شده",
  };
  const actions = [
    {
      href: "/admin/help",
      label: "راهنمای تصویری پنل",
      description: "از کجا شروع کنم؟ تصویر و مراحل هر بخش",
      icon: BookOpen,
    },
    ...(profile.capabilities.includes("content")
      ? [
          {
            href: "/admin/content",
            label: "ویرایش محتوای سایت",
            description: "صفحه اصلی، امکانات و پرسش‌ها",
            icon: FileText,
          },
          {
            href: "/admin/learn",
            label: "آموزش و وبلاگ",
            description: "مقاله، ویدیو و مجموعه آموزشی",
            icon: GraduationCap,
          },
          {
            href: "/admin/media",
            label: "کتابخانه رسانه",
            description: "تصاویر و فایل‌های سایت",
            icon: ImageIcon,
          },
        ]
      : []),
    ...(profile.capabilities.includes("leads")
      ? [
          {
            href: "/admin/leads",
            label: "درخواست‌ها و پیگیری",
            description: "بررسی دمو و پیام‌های تماس",
            icon: Users,
          },
        ]
      : []),
    ...(profile.role === "owner"
      ? [
          {
            href: "/admin/settings/sms",
            label: "اتصال پنل پیامکی",
            description: "ملی‌پیامک و کد ورود مدیران",
            icon: Settings,
          },
        ]
      : []),
    {
      href: "/admin/security",
      label: "امنیت حساب",
      description: "ورود پیامکی و نشست‌های فعال",
      icon: ShieldCheck,
    },
  ];
  return (
    <div className="admin-page">
      <AdminPageHeader
        title="داشبورد مدیریت"
        eyebrow="مرکز مدیریت ماکان"
        description="به پیشخوان ماکان خوش آمدید؛ محتوا، درخواست‌ها و فعالیت‌های وب‌سایت را از اینجا مدیریت کنید."
        actions={
          <Button asChild variant="outline">
            <Link href="/">
              مشاهده وب‌سایت
              <ArrowLeft aria-hidden="true" />
            </Link>
          </Button>
        }
      />
      <div className="admin-help flex items-start gap-3">
        <ShieldCheck className="mt-1 size-4 shrink-0" aria-hidden="true" />
        <p>
          دسترسی شما متناسب با نقش حساب است. آمار این صفحه از اطلاعات ثبت‌شدهٔ
          وب‌سایت خوانده می‌شود.
        </p>
      </div>
      <section aria-label="وضعیت فعلی وب‌سایت">
        <h2 className="admin-section-title">وب‌سایت در یک نگاه</h2>
        <dl className="grid gap-4 tablet:grid-cols-2 desktop:grid-cols-3">
          {Object.entries(data?.metrics ?? {}).map(([key, value]) => (
            <div key={key} className="admin-stat">
              <dt>{labels[key] ?? key}</dt>
              <dd>{value.toLocaleString("fa-IR")}</dd>
            </div>
          ))}
        </dl>
      </section>
      <AdminPanel
        title="دسترسی سریع"
        description="بخش موردنیاز را انتخاب کنید و کارتان را ادامه دهید."
      >
        <div className="admin-dashboard-actions -m-5 grid gap-px bg-border tablet:grid-cols-2">
          {actions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              prefetch={false}
              className="flex min-h-28 items-center gap-4 bg-white p-5 hover:bg-slate-50"
            >
              <span className="admin-page-symbol">
                <action.icon className="size-5" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">
                  {action.label}
                </span>
                <span className="mt-2 block text-xs leading-6 text-muted-foreground">
                  {action.description}
                </span>
              </span>
              <ArrowLeft
                className="size-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
            </Link>
          ))}
        </div>
      </AdminPanel>
    </div>
  );
}
