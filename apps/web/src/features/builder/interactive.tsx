"use client";
import { useState, createElement, type ReactNode } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { RichText } from "@/features/cms/rich-text";
import type { WidgetItem } from "./types";

export function EditableHeading({
  title,
  level,
  editing,
  onEdit,
}: {
  title: string;
  level: number;
  editing?: boolean;
  onEdit?: (value: string) => void;
}) {
  return createElement(
    `h${Math.max(1, Math.min(6, level))}`,
    {
      contentEditable: editing || undefined,
      suppressContentEditableWarning: true,
      role: editing ? "textbox" : undefined,
      "aria-label": editing ? "ویرایش عنوان در صفحه" : undefined,
      onBlur: editing
        ? (event: React.FocusEvent<HTMLElement>) =>
            onEdit?.((event.currentTarget.textContent || "").slice(0, 180))
        : undefined,
      className: "builder-heading",
      style: { fontSize: "inherit" },
    },
    title,
  );
}
export function WidgetTabs({ items }: { items: WidgetItem[] }) {
  const [selected, setSelected] = useState(0);
  return (
    <div>
      <div
        className="flex flex-wrap gap-2 border-b border-border pb-3"
        role="tablist"
        aria-label="بخش‌های محتوا"
      >
        {items.map((item, index) => (
          <button
            type="button"
            key={index}
            role="tab"
            aria-selected={selected === index}
            className={`min-h-11 rounded-lg px-4 ${selected === index ? "bg-primary text-white" : "bg-secondary text-foreground"}`}
            onClick={() => setSelected(index)}
          >
            {item.title}
          </button>
        ))}
      </div>
      {items[selected] && (
        <div role="tabpanel" className="py-5">
          {items[selected]?.body_html ? (
            <RichText html={items[selected]!.body_html!} />
          ) : (
            <p>{items[selected]?.text}</p>
          )}
        </div>
      )}
    </div>
  );
}
export function WidgetCarousel({ slides }: { slides: ReactNode[] }) {
  const [index, setIndex] = useState(0);
  if (!slides.length)
    return (
      <p className="p-4 text-muted-foreground">
        تصویر یا محتوای اسلایدر را اضافه کنید.
      </p>
    );
  return (
    <section aria-roledescription="اسلایدر">
      <div aria-live="polite">{slides[index]}</div>
      <div className="mt-4 flex items-center justify-center gap-4">
        <button
          type="button"
          aria-label="اسلاید قبلی"
          className="grid size-11 place-items-center rounded-lg border border-input"
          onClick={() => setIndex((index + slides.length - 1) % slides.length)}
        >
          <ArrowRight />
        </button>
        <span>
          {(index + 1).toLocaleString("fa-IR")} /{" "}
          {slides.length.toLocaleString("fa-IR")}
        </span>
        <button
          type="button"
          aria-label="اسلاید بعدی"
          className="grid size-11 place-items-center rounded-lg border border-input"
          onClick={() => setIndex((index + 1) % slides.length)}
        >
          <ArrowLeft />
        </button>
      </div>
    </section>
  );
}
