import { SourceLink as Link } from "@/features/leads/source-link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/layout/container";
export function CallToAction({
  title = "ماکان را برای مدرسه خود بررسی کنید.",
  description = "از نیاز مدرسه شروع کنیم؛ سپس امکانات و مسیر راه‌اندازی را با هم مرور کنیم.",
  label = "درخواست دموی ماکان",
  href = "/demo",
}: {
  title?: string;
  description?: string;
  label?: string;
  href?: string;
}) {
  return (
    <section className="section-space" aria-label="ادامه مسیر آشنایی">
      <Container>
        <div className="brand-cta flex flex-col gap-6 rounded-3xl p-6 tablet:p-10 desktop:flex-row desktop:items-center desktop:justify-between">
          <div className="max-w-2xl">
            <p className="section-kicker mb-3 text-blue-100">یک قدم نزدیک‌تر</p>
            <h2 className="text-2xl font-semibold text-white tablet:text-3xl">{title}</h2>
            <p className="mt-4 text-white/90">{description}</p>
          </div>
          <Button asChild size="lg" className="shrink-0 bg-white text-primary-hover hover:bg-secondary">
            <Link href={href}>
              {label}
              <ArrowLeft aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </Container>
    </section>
  );
}
