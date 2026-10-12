import Link from "next/link";
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
        <div className="flex flex-col gap-6 rounded-3xl border border-border bg-secondary p-6 tablet:p-10 desktop:flex-row desktop:items-center desktop:justify-between">
          <div className="max-w-2xl">
            <p className="section-kicker mb-3">یک قدم نزدیک‌تر</p>
            <h2 className="text-2xl font-semibold tablet:text-3xl">{title}</h2>
            <p className="mt-4 text-muted-foreground">{description}</p>
          </div>
          <Button asChild size="lg" className="shrink-0">
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
