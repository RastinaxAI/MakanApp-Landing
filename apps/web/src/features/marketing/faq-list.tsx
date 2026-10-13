"use client";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { RichText } from "@/features/cms/rich-text";
export type FaqItem = { id: string; question: string; answer: string; answer_html?: string };
export function FaqList({ items }: { items: readonly FaqItem[] }) {
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
            {item.answer_html ? <RichText html={item.answer_html} /> : item.answer}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
