import type { Metadata } from "next";
import { PageHero } from "@/components/marketing/page-hero";
import { Container } from "@/components/layout/container";
import { ContactChannels } from "@/components/marketing/contact-channels";
import { RequestFormPreview } from "@/features/marketing/request-form-preview";
export const metadata: Metadata = {
  title: "درخواست دمو و مشاوره",
  description:
    "مسیر بررسی نیاز مدرسه، آشنایی با امکانات ماکان و هماهنگی راه‌اندازی؛ درخواست دمو و مشاوره.",
};
export default function DemoPage() {
  return (
    <>
      <PageHero
        eyebrow="درخواست دمو"
        title="ماکان را با نیاز مدرسه خود بسنجید."
        description="از ساختار مدرسه و مسئله‌های روزمره شروع می‌کنیم؛ سپس مسیر محصول و هماهنگی راه‌اندازی را بررسی می‌کنیم."
      />
      <section className="section-space" aria-label="هماهنگی دمو">
        <Container className="grid items-start gap-8 desktop:grid-cols-[1.35fr_1fr]">
          <RequestFormPreview kind="demo" />
          <div className="space-y-6">
            <aside className="rounded-2xl border border-border bg-card p-6">
              <h2 className="text-xl font-semibold">برای جلسه بررسی نیاز</h2>
              <ul className="mt-5 space-y-3 text-sm leading-8 text-muted-foreground">
                <li>
                  ساختار مدرسه یا آموزشگاه و تعداد تقریبی کاربران را مرور کنید.
                </li>
                <li>چالش‌های ارتباط، کلاس و گزارش را مشخص کنید.</li>
                <li>بخش‌های آماده محصول با نیاز شما تطبیق داده می‌شوند.</li>
                <li>مسیر راه‌اندازی و آموزش اولیه با تیم هماهنگ می‌شود.</li>
              </ul>
            </aside>
            <ContactChannels />
            <p className="px-2 text-sm leading-8 text-muted-foreground">
              در این صفحه رایگان‌بودن دمو یا زمان پاسخ وعده داده نشده است؛ شرایط
              هماهنگی پس از تأیید عملیاتی اعلام می‌شود.
            </p>
          </div>
        </Container>
      </section>
    </>
  );
}
