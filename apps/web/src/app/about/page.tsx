import type { Metadata } from "next";
import { PageHero } from "@/components/marketing/page-hero";
import { Container } from "@/components/layout/container";
import { SectionHeading } from "@/components/layout/section-heading";
import { ContentGrid } from "@/components/marketing/content-grid";
import { CallToAction } from "@/components/marketing/call-to-action";
export const metadata: Metadata = {
  title: "درباره ماکان",
  description:
    "ماکان؛ پلتفرم ارتباط و مدیریت آموزش با چهار حوزه پیام‌رسان، مدرسه، هوش مصنوعی در نقشه راه و پروفایل و فضای کاری.",
};
export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="درباره ماکان"
        title="ارتباط و مدیریت آموزش، در یک فضای یکپارچه."
        description="ماکان برای کنار هم قرارگرفتن ارتباط مدرسه، جریان آموزش و اطلاعات مرتبط با هر نقش طراحی شده است."
      />
      <section className="section-space" aria-labelledby="approach-title">
        <Container>
          <div className="grid gap-8 desktop:grid-cols-2">
            <SectionHeading
              id="approach-title"
              kicker="نگاه ما به تجربه آموزش"
              title="هماهنگی از یک تجربه مشترک شروع می‌شود."
            />
            <div className="space-y-5 leading-9 text-muted-foreground">
              <p>
                مدرسه، معلم، خانواده و دانش‌آموز هرکدام بخشی از جریان آموزش را
                دنبال می‌کنند. وقتی پیام‌ها، کلاس‌ها و گزارش‌ها جدا از هم قرار
                دارند، رسیدن به دید مشترک دشوارتر می‌شود.
              </p>
              <p>
                ماکان این مسیرها را در تجربه‌ای منسجم کنار هم می‌گذارد؛ با
                نقش‌های مشخص و اطلاعاتی که متناسب با دسترسی هر فرد نمایش داده
                می‌شود.
              </p>
            </div>
          </div>
        </Container>
      </section>
      <section
        className="section-space border-y border-border bg-card"
        aria-labelledby="areas-title"
      >
        <Container>
          <SectionHeading
            id="areas-title"
            kicker="چهار حوزه محصول"
            title="هر بخش، با جایگاه و وضعیت خودش."
          />
          <ContentGrid
            items={[
              {
                title: "پیام‌رسان",
                description:
                  "گفت‌وگوی خصوصی، گروه و کانال؛ برای ارتباط و هماهنگی سازمانی.",
              },
              {
                title: "مدرسه",
                description:
                  "کلاس، جلسات، حضور، تکلیف و آزمون؛ برای جریان آموزشی روزمره.",
              },
              {
                title: "هوش مصنوعی — در نقشه راه",
                description:
                  "Copilot و تحلیل هوشمند به‌عنوان مسیر آینده مطرح‌اند و قابلیت فعال معرفی نمی‌شوند.",
              },
              {
                title: "پروفایل و فضای کاری",
                description:
                  "حساب، عضویت سازمانی و نقش‌ها در تجربه محصول جای مشخص دارند؛ راه‌اندازی خودکار مدرسه وعده داده نمی‌شود.",
              },
            ]}
          />
        </Container>
      </section>
      <CallToAction />
    </>
  );
}
