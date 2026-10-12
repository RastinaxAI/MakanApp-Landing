import Link from "next/link";
import { redirect } from "next/navigation";
import { adminGet, type AdminProfile } from "@/lib/admin-api";
import { LoginForm } from "@/features/admin/login-form";
export default async function LoginPage() {
  const current = await adminGet<AdminProfile>("auth/me");
  if (current) redirect("/admin");
  return (
    <main
      id="admin-main"
      className="grid min-h-screen place-items-center px-5 py-12"
    >
      <section
        className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-soft tablet:p-8"
        aria-labelledby="login-title"
      >
        <p className="mb-3 text-sm font-medium text-primary-hover">
          ماکان / مدیریت وب‌سایت
        </p>
        <h1 id="login-title" className="text-3xl font-semibold">
          ورود مدیر
        </h1>
        <p className="mb-8 mt-4 text-sm leading-7 text-muted-foreground">
          با حساب مدیریت همین وب‌سایت وارد شوید. حساب کاربران اپلیکیشن ماکان در
          این پنل کاربرد ندارد.
        </p>
        <LoginForm />
        <Link
          href="/"
          className="mt-6 inline-flex min-h-11 items-center rounded-lg text-sm text-primary-hover"
        >
          بازگشت به وب‌سایت
        </Link>
      </section>
    </main>
  );
}
