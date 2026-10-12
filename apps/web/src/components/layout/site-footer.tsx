import Link from "next/link";
import { ArrowUpLeft } from "lucide-react";
import { Brand } from "@/components/layout/brand";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="site-container grid gap-8 py-10 tablet:grid-cols-2 desktop:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Brand />
          <p className="mt-4 max-w-sm text-sm text-muted-foreground">ارتباط و مدیریت آموزش، در یک فضای یکپارچه.</p>
          <p className="mt-2 text-sm text-muted-foreground">این نسخه برای بررسی طراحی آماده شده است.</p>
        </div>
        <nav aria-label="لینک‌های طراحی" className="flex flex-col items-start gap-2">
          <h2 className="mb-1 text-base font-semibold">بررسی طراحی</h2>
          <Link className="quiet-link inline-flex min-h-11 items-center gap-2 text-sm" href="/design-system">راهنمای کامپوننت‌ها <ArrowUpLeft size={16} aria-hidden="true" /></Link>
          <Link className="quiet-link inline-flex min-h-11 items-center text-sm" href="/design-system#accessibility">اصول دسترس‌پذیری</Link>
        </nav>
        <div className="rounded-xl bg-background p-5">
          <p className="text-sm font-medium">هویت بصری در انتظار تأیید</p>
          <p className="mt-2 text-sm text-muted-foreground">رنگ‌ها پیشنهادی‌اند. لوگو، تصاویر و راه‌های ارتباطی رسمی پس از دریافت اضافه می‌شوند.</p>
        </div>
      </div>
      <div className="border-t border-border"><div className="site-container flex flex-wrap justify-between gap-2 py-4 text-xs text-muted-foreground"><span>ماکان · پیش‌نمایش مرحله طراحی</span><span dir="ltr">MakanApp / UI Foundation</span></div></div>
    </footer>
  );
}
