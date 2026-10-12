import type { Metadata } from "next";
import { PageHero } from "@/components/marketing/page-hero";
import { Container } from "@/components/layout/container";
import { FaqList } from "@/features/marketing/faq-list";
import { CallToAction } from "@/components/marketing/call-to-action";
export const metadata: Metadata = {
  title: "پرسش‌های متداول",
  description:
    "پاسخ به پرسش‌های رایج درباره بخش‌های آماده ماکان، وضعیت AI، نقش‌ها، دسترسی و راه‌اندازی مدرسه.",
};
export default function FaqPage() {
  return (
    <>
      <PageHero
        eyebrow="پرسش‌های متداول"
        title="پیش از شروع، پاسخ‌های روشن."
        description="درباره وضعیت امکانات، دسترسی‌ها و مسیر راه‌اندازی ماکان بیشتر بدانید."
      />
      <section className="section-space" aria-label="پرسش و پاسخ">
        <Container className="max-w-4xl">
          <FaqList />
        </Container>
      </section>
      <CallToAction
        title="پرسش دیگری درباره نیاز مدرسه دارید؟"
        description="از صفحه تماس، مسیر پرسش عمومی یا درخواست دمو را انتخاب کنید."
        label="تماس با ماکان"
        href="/contact"
      />
    </>
  );
}
