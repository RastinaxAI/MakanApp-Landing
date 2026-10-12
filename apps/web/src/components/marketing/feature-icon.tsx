import {
  BarChart3,
  BookOpen,
  MessageCircle,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { FeatureSlug } from "@/features/marketing/content";
const icons: Record<FeatureSlug, LucideIcon> = {
  messenger: MessageCircle,
  school: BookOpen,
  reports: BarChart3,
  ai: Sparkles,
};
export function FeatureIcon({
  slug,
  className,
  size = 26,
}: {
  slug: FeatureSlug;
  className?: string;
  size?: number;
}) {
  const Icon = icons[slug];
  return (
    <Icon
      size={size}
      strokeWidth={1.6}
      className={className}
      aria-hidden="true"
    />
  );
}
