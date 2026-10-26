"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function AdminError({ reset }: { reset: () => void }) {
  return (
    <main
      id="admin-main"
      className="admin-auth items-center justify-center px-4 py-12"
    >
      <section className="admin-auth-card space-y-5">
        <p className="text-xs font-medium text-primary">مرکز مدیریت ماکان</p>
        <h1 className="text-2xl font-semibold">
          سامانه مدیریت موقتاً در دسترس نیست.
        </h1>
        <p className="leading-8 text-muted-foreground">
          اتصال سرویس را بررسی کنید و دوباره تلاش کنید.
        </p>
        <Button onClick={reset}>تلاش دوباره</Button>
        <Link
          href="/"
          className="ms-4 inline-flex min-h-11 items-center rounded-lg text-primary-hover"
        >
          بازگشت به وب‌سایت
        </Link>
      </section>
    </main>
  );
}
