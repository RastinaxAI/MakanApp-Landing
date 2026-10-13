"use client";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { RichText } from "@/features/cms/rich-text";
import { trackEvent } from "@/features/analytics/events";
export type FaqItem = {
  id: string;
  question: string;
  answer: string;
  answer_html?: string;
};
export function FaqList({ items }: { items: readonly FaqItem[] }) {
  return (
    <Accordion
      onValueChange={(value) => {
        if (value) trackEvent("faq_expand");
      }}
      type="single"
      data-faq-list
      collapsible
      className="rounded-2xl border border-border bg-card px-5 tablet:px-8"
    >
      {items.map((item) => (
        <AccordionItem key={item.id} value={item.id}>
          <AccordionTrigger className="min-h-16 gap-5 text-start text-base">
            {item.question}
          </AccordionTrigger>
          <AccordionContent className="pb-6 leading-8 text-muted-foreground">
            {item.answer_html ? (
              <RichText html={item.answer_html} />
            ) : (
              item.answer
            )}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
