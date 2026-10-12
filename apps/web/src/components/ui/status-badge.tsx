import { Check, Clock3, CircleDashed } from "lucide-react";
import { cn } from "@/lib/utils";

const statuses = {
  available: { label: "آماده", icon: Check, classes: "bg-success-soft text-success" },
  partial: { label: "بخشی از امکانات آماده است", icon: CircleDashed, classes: "bg-secondary text-primary-hover" },
  roadmap: { label: "در نقشه راه", icon: Clock3, classes: "bg-warning-soft text-warning" },
} as const;

export function StatusBadge({ status, className }: { status: keyof typeof statuses; className?: string }) {
  const config = statuses[status];
  const Icon = config.icon;
  return <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium", config.classes, className)}><Icon size={14} aria-hidden="true" />{config.label}</span>;
}
