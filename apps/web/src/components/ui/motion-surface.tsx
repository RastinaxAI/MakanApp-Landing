"use client";

import { motion } from "motion/react";
import { UiProviders } from "@/components/layout/ui-providers";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useReducedMotionPreference } from "@/hooks/use-reduced-motion";

export function MotionSurface({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotionPreference();
  return (
    <UiProviders>
      <motion.div
        data-motion-enabled={reduce ? "false" : "true"}
        animate={reduce ? { y: 0 } : undefined}
        whileHover={reduce ? undefined : { y: -2 }}
        transition={{ duration: reduce ? 0 : 0.18 }}
        className={cn(
          "rounded-2xl border border-border bg-card p-6 shadow-soft",
          className,
        )}
      >
        {children}
      </motion.div>
    </UiProviders>
  );
}
