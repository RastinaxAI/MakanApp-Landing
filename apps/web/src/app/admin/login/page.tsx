import Link from "next/link";
import { redirect } from "next/navigation";
import { adminGet, type AdminProfile } from "@/lib/admin-api";
import { LoginForm } from "@/features/admin/login-form";
import { LegacyLoginForm } from "@/features/admin/legacy-login-form";
import { publicGet } from "@/lib/public-api";
import Image from "next/image";
import {
  ArrowUpLeft,
  FileText,
  GraduationCap,
  MessagesSquare,
  ShieldCheck,
} from "lucide-react";
export default async function LoginPage() {
  const current = await adminGet<AdminProfile>("auth/me");
  if (current) redirect("/admin");
  const config = await publicGet<{ debug: boolean; legacy: boolean }>(
    "admin/auth/config",
  );
  return (
    <div className="admin-auth admin-login">
      <header className="admin-auth-topbar">
        <Link href="/" prefetch={false} className="login-brand">
          <Image
            src="/brand/makan-logo.png"
            alt=""
            width={40}
            height={40}
            sizes="40px"
            className="rounded-xl"
          />
          <span>
            <strong>ماکان</strong>
            <span className="login-brand-caption">پیشخوان مدیریت وب‌سایت</span>
          </span>
        </Link>
        <Link href="/" prefetch={false} className="login-back-link">
          بازگشت به وب‌سایت
          <ArrowUpLeft size={18} aria-hidden="true" />
        </Link>
      </header>
      <main id="admin-main" className="login-main">
        <div className="login-layout">
          <aside className="login-brand-panel" aria-label="معرفی پیشخوان ماکان">
            <div className="login-panel-brand">
              <Image
                src="/brand/makan-logo.png"
                alt=""
                width={64}
                height={64}
                sizes="64px"
                className="rounded-2xl"
              />
              <span>
                ماکان
                <span lang="en" dir="ltr">
                  MAKANAPP
                </span>
              </span>
            </div>
            <div className="login-panel-copy">
              <p>فضای کار مدیران ماکان</p>
              <h2>
                همه‌چیز برای
                <br />
                یک مدیریت منظم.
              </h2>
              <p>
                محتوای سایت، آموزش‌ها و ارتباط با مدارس را از یک پیشخوان مدیریت
                کنید.
              </p>
            </div>
            <ul className="login-panel-features">
              <li>
                <FileText aria-hidden="true" />
                <span>
                  محتوا و برگه‌ها<small>ویرایش و انتشار محتوای وب‌سایت</small>
                </span>
              </li>
              <li>
                <GraduationCap aria-hidden="true" />
                <span>
                  مرکز آموزش<small>مدیریت مقاله‌ها و ویدیوهای آموزشی</small>
                </span>
              </li>
              <li>
                <MessagesSquare aria-hidden="true" />
                <span>
                  درخواست‌های دمو
                  <small>پیگیری ارتباط با مدارس و متقاضیان</small>
                </span>
              </li>
            </ul>
            <div className="login-panel-decoration" aria-hidden="true" />
          </aside>
          <section className="login-form-panel" aria-labelledby="login-title">
            <div className="login-form-heading">
              <span className="login-heading-icon" aria-hidden="true">
                <ShieldCheck size={24} />
              </span>
              <p className="login-eyebrow">خوش آمدید</p>
              <h1 id="login-title">ورود به پیشخوان ماکان</h1>
              <p className="login-description">
                {config.legacy
                  ? "با حساب مدیریت وب‌سایت وارد شوید."
                  : "با شماره همراه ثبت‌شده و کد یک‌بارمصرف وارد حساب مدیریت خود شوید."}
              </p>
            </div>
            {config.legacy ? (
              <LegacyLoginForm />
            ) : (
              <LoginForm debug={config.debug} />
            )}
          </section>
        </div>
      </main>
      <footer className="login-footer">
        <ShieldCheck size={16} aria-hidden="true" />
        این پیشخوان ویژهٔ مدیران وب‌سایت ماکان است.
      </footer>
    </div>
  );
}
