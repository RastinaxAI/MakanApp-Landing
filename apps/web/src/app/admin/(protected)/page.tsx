import Link from "next/link";
import { adminGet, requireAdmin } from "@/lib/admin-api";
export default async function DashboardPage() {
  await requireAdmin();
  const data = await adminGet<{
    metrics: Record<string, number>;
    modules: Record<string, string>;
  }>("dashboard");
  const labels: Record<string, string> = {
    active_admins: "مدیر فعال",
    pages: "محتوای ثبت‌شده",
  };
  return (
    <>
      <h1 className="text-3xl font-semibold">داشبورد مدیریت</h1>
      <p className="mt-3 leading-8 text-muted-foreground">
        حساب، نشست‌های ورود و دسترسی مدیران وب‌سایت را مدیریت کنید.
      </p>
      <div className="my-8 grid gap-4 tablet:grid-cols-2">
        {Object.entries(data?.metrics ?? {}).map(([key, value]) => (
          <section
            key={key}
            className="rounded-2xl border border-border bg-card p-6"
          >
            <h2 className="text-sm text-muted-foreground">
              {labels[key] ?? key}
            </h2>
            <p className="mt-3 text-3xl font-semibold">
              {value.toLocaleString("fa-IR")}
            </p>
          </section>
        ))}
      </div>
      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-xl font-semibold">امنیت حساب شما</h2>
        <p className="mt-3 leading-8 text-muted-foreground">
          ورود دومرحله‌ای را فعال کنید، نشست‌های اضافی را ببندید و رمز عبور خود
          را تغییر دهید.
        </p>
        <Link
          href="/admin/security"
          prefetch={false}
          className="mt-4 inline-flex min-h-11 items-center rounded-lg font-medium text-primary-hover"
        >
          مدیریت امنیت حساب
        </Link>
      </section>
      <section className="mt-6 rounded-2xl border border-border p-6">
        <h2 className="text-xl font-semibold">بخش‌های در دست توسعه</h2>
        <p className="mt-3 leading-8 text-muted-foreground">
          مرکز آموزش و درخواست‌های مشاوره در مراحل بعد فعال
          می‌شوند. این پنل اکنون آمار سرنخ فرضی نمایش
          نمی‌دهد.
        </p>
      </section>
    </>
  );
}
