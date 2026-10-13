import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  GraduationCap,
  Monitor,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Audience, AudienceSlug } from "@/features/marketing/content";

const icons: Record<AudienceSlug, LucideIcon> = {
  schools: Monitor,
  teachers: BookOpen,
  parents: Users,
  students: GraduationCap,
};
export function AudienceCard({ audience }: { audience: Audience }) {
  const Icon = Object.hasOwn(icons, audience.slug)
    ? icons[audience.slug as AudienceSlug]
    : Users;
  return (
    <article className="flex min-w-0 flex-col rounded-2xl border border-border bg-background p-6">
      <Icon
        size={28}
        className="mb-6 text-primary-hover"
        strokeWidth={1.6}
        aria-hidden="true"
      />
      <h3 className="text-lg font-semibold">{audience.title}</h3>
      <p className="mt-3 text-sm leading-8 text-muted-foreground">
        {audience.summary}
      </p>
      <Link
        href={`/solutions/${audience.slug}`}
        className="mt-auto inline-flex min-h-11 items-center gap-2 rounded-lg pt-5 text-sm font-medium text-primary-hover"
      >
        ماکان برای {audience.slug === "schools" ? "مدارس" : audience.title}
        <ArrowLeft size={17} aria-hidden="true" />
      </Link>
    </article>
  );
}
