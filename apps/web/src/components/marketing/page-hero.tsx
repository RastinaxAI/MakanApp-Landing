import { SourceLink as Link } from "@/features/leads/source-link";
import { ArrowLeft, ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
export function PageHero({
  eyebrow,
  title,
  description,
  parent,
  children,
  ctaLabel,
  ctaHref,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  parent?: { label: string; href: string };
  children?: ReactNode;
  ctaLabel?: string;
  ctaHref?: string;
}) {
  return (
    <section className="public-page-hero brand-hero border-b border-border py-10 tablet:py-16 desktop:py-20">
      <Container>
        <nav
          aria-label="مسیر صفحه"
          className="mb-8 flex flex-wrap items-center gap-2 text-sm text-muted-foreground"
        >
          <Link href="/" className="rounded-lg py-2 hover:text-primary-hover">
            خانه
          </Link>
          <ChevronLeft size={14} aria-hidden="true" />
          {parent && (
            <>
              <Link
                href={parent.href}
                className="rounded-lg py-2 hover:text-primary-hover"
              >
                {parent.label}
              </Link>
              <ChevronLeft size={14} aria-hidden="true" />
            </>
          )}
          <span aria-current="page">{title}</span>
        </nav>
        <div className="public-page-hero-copy max-w-3xl">
          <p className="section-kicker mb-4">{eyebrow}</p>
          <h1
            className={`hero-heading${title.length > 22 ? " public-title-multiline" : ""}`}
          >
            {title}
          </h1>
          <p
            className={`mt-6 text-lg text-muted-foreground${description.length > 80 ? " public-summary-multiline" : ""}`}
          >
            {description}
          </p>
          {children && <div className="mt-5">{children}</div>}
          {ctaLabel && ctaHref && (
            <Button asChild size="lg" className="mt-8">
              <Link href={ctaHref}>
                {ctaLabel}
                <ArrowLeft aria-hidden="true" />
              </Link>
            </Button>
          )}
        </div>
      </Container>
    </section>
  );
}
