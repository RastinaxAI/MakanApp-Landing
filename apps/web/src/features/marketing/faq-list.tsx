"use client";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { faqs } from "@/features/marketing/content";
export function FaqList({ compact = false }: { compact?: boolean }) {
  const items = compact
    ? faqs.filter((item) =>
        ["core", "ai", "onboarding", "access"].includes(item.id),
      )
    : faqs;
  return (
    <Accordion
      type="single"
      collapsible
      className="rounded-2xl border border-border bg-card px-5 tablet:px-8"
    >
      {items.map((item) => (
        <AccordionItem key={item.id} value={item.id}>
          <AccordionTrigger className="min-h-16 gap-5 text-start text-base">
            {item.question}
          </AccordionTrigger>
          <AccordionContent className="pb-6 leading-8 text-muted-foreground">
            {item.answer}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
