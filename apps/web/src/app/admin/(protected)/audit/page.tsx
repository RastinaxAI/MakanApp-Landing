import { adminGet, requireAdmin } from "@/lib/admin-api";
export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const profile = await requireAdmin();
  if (profile.role !== "owner")
    return (
      <h1 className="text-2xl font-semibold">برای این بخش دسترسی ندارید.</h1>
    );
  const raw = (await searchParams).page;
  const page =
    raw && /^\d+$/.test(raw) ? Math.min(100000, Math.max(1, Number(raw))) : 1;
  const data = await adminGet<{
    items: { id: string; action: string; created_at: string }[];
    pagination: { page: number; pages: number };
  }>(`audit-logs?page=${page}&page_size=20`);
  const labels: Record<string, string> = {
    "auth.login": "ورود موفق",
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
  return (
    <>
      <h1 className="text-3xl font-semibold">رویدادهای مدیریت</h1>
      <p className="my-4 leading-8 text-muted-foreground">
        عملیات حساس حساب‌ها و ورود در این فهرست ثبت می‌شوند. رمزها، کدها و متن
        اطلاعات خصوصی در این فهرست نمایش داده نمی‌شوند.
      </p>
      <ul className="space-y-3">
        {data?.items.map((item) => (
          <li
            key={item.id}
            className="flex flex-wrap justify-between gap-3 rounded-xl border border-border bg-card p-4"
          >
            <span>{labels[item.action] ?? "رویداد مدیریت"}</span>
            <time
              dateTime={item.created_at}
              className="text-sm text-muted-foreground"
            >
              {new Date(item.created_at).toLocaleString("fa-IR")}
            </time>
          </li>
        ))}
      </ul>
      <nav aria-label="صفحه‌های رویداد" className="mt-5 flex flex-wrap gap-5">
        {page > 1 && (
          <a
            href={`/admin/audit?page=${page - 1}`}
            className="min-h-11 rounded-lg p-3 text-primary-hover"
          >
            صفحه قبل
          </a>
        )}
        {page < (data?.pagination.pages ?? 0) && (
          <a
            href={`/admin/audit?page=${page + 1}`}
            className="min-h-11 rounded-lg p-3 text-primary-hover"
          >
            صفحه بعد
          </a>
        )}
      </nav>
    </>
  );
}
