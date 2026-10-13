import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { FeatureIcon } from "@/components/marketing/feature-icon";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Feature } from "@/features/marketing/content";

export function FeatureCard({ feature }: { feature: Feature }) {
  return (
    <article className="brand-card flex min-w-0 flex-col rounded-2xl border border-border bg-card p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <span className="flex size-12 items-center justify-center rounded-xl bg-secondary text-primary-hover">
          <FeatureIcon slug={feature.slug} />
        </span>
        <StatusBadge status={feature.readiness} />
      </div>
      <h3 className="text-xl font-semibold">{feature.title}</h3>
      <p className="mt-4 text-sm leading-8 text-muted-foreground">
        {feature.summary}
      </p>
      <Link
        href={`/features/${feature.slug}`}
        className="mt-auto inline-flex min-h-11 items-center gap-2 rounded-lg pt-5 text-sm font-medium text-primary-hover"
      >
        آشنایی با {feature.title}
        <ArrowLeft size={17} aria-hidden="true" />
      </Link>
    </article>
  );
}
