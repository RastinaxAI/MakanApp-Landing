import Link from "next/link";
import { redirect } from "next/navigation";
import { adminGet, type AdminProfile } from "@/lib/admin-api";
import { LoginForm } from "@/features/admin/login-form";
import { LegacyLoginForm } from "@/features/admin/legacy-login-form";
import { publicGet } from "@/lib/public-api";
import Image from "next/image";
export default async function LoginPage() {
  const current = await adminGet<AdminProfile>("auth/me");
  if (current) redirect("/admin");
  const config = await publicGet<{ debug: boolean; legacy: boolean }>("admin/auth/config");
  return (
    <main
      id="admin-main"
      className="grid min-h-screen place-items-center bg-slate-50 px-5 py-12"
    >
      <section
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-soft tablet:p-9"
        aria-labelledby="login-title"
      >
        <Image src="/brand/makan-logo.png" alt="ماکان" width={56} height={56} sizes="56px" className="mb-7 rounded-[12px]" />
        <h1 id="login-title" className="text-3xl font-semibold">
          ورود مدیر
        </h1>
        <p className="mb-8 mt-4 text-sm leading-7 text-muted-foreground">
          شماره همراه ثبت‌شدهٔ خود را وارد کنید؛ با کد شش‌رقمی وارد پیشخوان می‌شوید.
        </p>
        {config.legacy ? <LegacyLoginForm /> : <LoginForm debug={config.debug} />}
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
