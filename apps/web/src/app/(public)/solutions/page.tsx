import type { Metadata } from "next";
import { PageHero } from "@/components/marketing/page-hero";
import { Container } from "@/components/layout/container";
import { AudienceCard } from "@/features/marketing/audience-card";
import { audiences } from "@/features/marketing/content";
import { CallToAction } from "@/components/marketing/call-to-action";
export const metadata: Metadata = {
  title: "ماکان برای نقش‌های مختلف",
  description:
    "راهکار ماکان برای مدیر مدرسه، معلم، والد و دانش‌آموز؛ مسئله‌ها و مسیرهای متناسب با هر نقش.",
};
export default function SolutionsPage() {
  return (
    <>
      <PageHero
        eyebrow="راهکارهای ماکان"
        title="نیازهای متفاوت، در یک فضای مشترک."
        description="از نقش خودتان شروع کنید؛ ببینید ماکان کدام بخش ارتباط و آموزش را برای شما منظم‌تر می‌کند."
      />
      <section className="section-space" aria-label="راهکارها بر اساس نقش">
        <Container>
          <div className="grid gap-6 tablet:grid-cols-2">
            {audiences.map((audience) => (
              <AudienceCard key={audience.slug} audience={audience} />
            ))}
          </div>
        </Container>
      </section>
      <CallToAction />
    </>
  );
}
