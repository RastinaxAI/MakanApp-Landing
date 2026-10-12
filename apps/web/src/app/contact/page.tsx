import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/marketing/page-hero";
import { Container } from "@/components/layout/container";
import { ContactChannels } from "@/components/marketing/contact-channels";
import { RequestFormPreview } from "@/features/marketing/request-form-preview";
export const metadata: Metadata = {
  title: "تماس با ماکان",
  description:
    "راه‌های ارتباطی رسمی و مسیر ارسال پرسش عمومی یا هماهنگی مشاوره درباره ماکان.",
};
export default function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="تماس با ماکان"
        title="برای یک گفت‌وگوی روشن، از موضوع شروع کنیم."
        description="برای آشنایی با محصول، هماهنگی مدرسه یا پرسش عمومی، مسیر ارتباطی مرتبط را انتخاب کنید."
      />
      <section className="section-space" aria-label="راه‌های تماس">
        <Container className="grid items-start gap-8 desktop:grid-cols-[1fr_1.35fr]">
          <div className="space-y-6">
            <ContactChannels />
            <aside className="rounded-2xl border border-border bg-card p-6">
              <h2 className="text-xl font-semibold">
                درخواست مدرسه یا آموزشگاه
              </h2>
              <p className="mt-4 leading-8 text-muted-foreground">
                برای بررسی نیاز و آشنایی با مسیر راه‌اندازی، صفحه درخواست دمو
                اطلاعات مرتبط‌تری دارد.
              </p>
              <Link
                href="/demo"
                className="mt-4 inline-flex min-h-11 items-center rounded-lg font-medium text-primary-hover"
              >
                مشاهده مسیر درخواست دمو
              </Link>
            </aside>
          </div>
          <RequestFormPreview kind="contact" />
        </Container>
      </section>
    </>
  );
}
