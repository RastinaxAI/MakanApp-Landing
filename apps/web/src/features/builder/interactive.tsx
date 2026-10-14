"use client";
import { useState, createElement, type ReactNode } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { RichText } from "@/features/cms/rich-text";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { WidgetItem } from "./types";
import { MediaImage } from "@/features/cms/media-image";
import type { CmsImageRef } from "@/features/cms/types";
import { SourceLink } from "@/features/leads/source-link";

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
export function WidgetTabs({
  items,
  media = [],
  privatePreview,
  activeIndex,
  onItemSelect,
}: {
  items: WidgetItem[];
  media?: CmsImageRef[];
  privatePreview?: boolean;
  activeIndex?: number;
  onItemSelect?: (index: number) => void;
}) {
  const [index, setIndex] = useState(0);
  if (!items.length)
    return onItemSelect ? (
      <p className="p-4 text-muted-foreground">
        از قسمت محتوا، یک تب اضافه کنید.
      </p>
    ) : null;
  return (
    <Tabs
      value={String(Math.min(activeIndex ?? index, items.length - 1))}
      onValueChange={(value) => {
        setIndex(Number(value));
        onItemSelect?.(Number(value));
      }}
      dir="rtl"
    >
      <TabsList className="h-auto flex-wrap" aria-label="بخش‌های محتوا">
        {items.map((item, index) => (
          <TabsTrigger key={index} value={String(index)} className="min-h-11">
            {item.title}
          </TabsTrigger>
        ))}
      </TabsList>
      {items.map((item, index) => (
        <TabsContent key={index} value={String(index)} className="py-5">
          <div
            className={
              item.media_id
                ? "grid items-center gap-6 tablet:grid-cols-2"
                : "space-y-4"
            }
          >
            <div className="space-y-4">
              {item.eyebrow && (
                <p className="text-sm text-primary">{item.eyebrow}</p>
              )}
              {item.heading && (
                <h3 className="text-2xl font-bold">{item.heading}</h3>
              )}
              {item.body_html ? (
                <RichText
                  html={item.body_html}
                  privatePreview={privatePreview}
                />
              ) : (
                <p>{item.text}</p>
              )}
              {item.href && (
                <SourceLink
                  className="inline-flex min-h-11 items-center text-primary"
                  href={item.href}
                >
                  بیشتر بدانید
                </SourceLink>
              )}
            </div>
            {media
              .filter((asset) => asset.id === item.media_id)
              .map((image) => (
                <MediaImage
                  key={image.id}
                  image={image}
                  privatePreview={privatePreview}
                />
              ))}
          </div>
        </TabsContent>
      ))}
    </Tabs>
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
