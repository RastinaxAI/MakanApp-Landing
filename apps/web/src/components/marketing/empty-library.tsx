import Link from "next/link";
import { BookOpen } from "lucide-react";
import { PageHero } from "@/components/marketing/page-hero";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
export function EmptyLibrary({ kind }: { kind: "learn" | "blog" }) {
  const learn = kind === "learn";
  return (
    <>
      <PageHero
        eyebrow={learn ? "آموزش ماکان" : "وبلاگ ماکان"}
        title={
          learn
            ? "راهنماهای استفاده، از نگاه هر نقش."
            : "درباره ارتباط و مدیریت آموزش بخوانید."
        }
        description={
          learn
            ? "مرکز آموزش به راهنماهای متنی، ویدیوهای آپارات و مجموعه‌های گام‌به‌گام استفاده از ماکان اختصاص دارد."
            : "وبلاگ به موضوع‌های آموزشی و تجربه ارتباط مدرسه و خانواده می‌پردازد؛ راهنمای کار با محصول در مرکز آموزش قرار می‌گیرد."
        }
      />
      <section className="section-space" aria-label="وضعیت انتشار محتوا">
        <Container>
          <div className="mx-auto max-w-2xl rounded-3xl border border-border bg-card p-8 text-center tablet:p-12">
            <BookOpen
              size={36}
              className="mx-auto mb-6 text-primary-hover"
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <h2 className="text-2xl font-semibold">
              هنوز مطلبی منتشر نشده است.
            </h2>
            <p className="mt-4 leading-8 text-muted-foreground">
              {learn
                ? "آموزش‌های تأییدشده پس از آماده‌شدن مرکز آموزش در این صفحه منتشر می‌شوند."
                : "مقاله‌های تأییدشده پس از آماده‌شدن بخش محتوا در این صفحه منتشر می‌شوند."}
            </p>
            <Button asChild variant="outline" size="lg" className="mt-7">
              <Link href={learn ? "/features" : "/learn"}>
                {learn ? "آشنایی با امکانات" : "مرکز آموزش ماکان"}
              </Link>
            </Button>
          </div>
        </Container>
      </section>
    </>
  );
}
