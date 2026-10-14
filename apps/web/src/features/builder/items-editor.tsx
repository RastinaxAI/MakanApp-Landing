"use client";
import { useState } from "react";
import { usePuck } from "@puckeditor/core";
import {
  Plus,
  Copy,
  Trash2,
  ArrowUp,
  ArrowDown,
  ImagePlus,
  Type,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextField, MediaPicker } from "@/features/cms/fields";
import { RichEditor } from "@/features/cms/rich-editor";
import type { MediaAsset } from "@/features/cms/types";
import type { WidgetItem, WidgetType } from "./types";
import { useElementFocus } from "./element-focus";

export function ItemsEditor({
  value = [],
  onChange,
  assets,
  type,
}: {
  value?: WidgetItem[];
  onChange: (items: WidgetItem[]) => void;
  assets: MediaAsset[];
  type: WidgetType;
}) {
  const [panel, setPanel] = useState(
    ["Gallery", "Carousel"].includes(type) ? "image" : "text",
  );
  const hasMedia = [
    "Tabs",
    "Gallery",
    "Carousel",
    "Features",
    "Testimonials",
    "Pricing",
  ].includes(type);
  const puck = usePuck();
  const { focus, reveal } = useElementFocus();
  const node = puck.selectedItem?.props.id || "";
  const index = Math.min(
    focus.node === node ? focus.index : 0,
    Math.max(0, value.length - 1),
  );
  const item = value[index];
  const isTab = type === "Tabs";
  const patch = (update: Partial<WidgetItem>) =>
    onChange(
      value.map((item, i) => (i === index ? { ...item, ...update } : item)),
    );
  const move = (delta: number) => {
    const next = [...value];
    [next[index], next[index + delta]] = [next[index + delta]!, next[index]!];
    onChange(next);
    reveal(node, index + delta);
  };
  return (
    <div className="builder-items-editor space-y-4">
      <p className="rounded-lg bg-primary-soft p-3 text-xs leading-6">
        {isTab
          ? "هر تب را انتخاب کنید؛ عنوان، متن و تصویر همان تب را در پایین تغییر دهید. انتخاب تب روی بوم نیز همین تنظیمات را باز می‌کند."
          : "هر مورد را انتخاب کنید و محتوای آن را ویرایش کنید. ترتیب موارد و تصویر هر مورد مستقل است."}
      </p>
      <div
        className="space-y-2"
        aria-label={isTab ? "فهرست تب‌ها" : "فهرست موارد"}
      >
        {value.map((entry, i) => (
          <button
            key={i}
            type="button"
            aria-pressed={i === index}
            onClick={() => reveal(node, i)}
            className="builder-item-row flex min-h-11 w-full items-center justify-between rounded-lg border border-border px-3 py-2 text-start text-sm aria-pressed:border-primary aria-pressed:bg-primary-soft"
          >
            <span>{entry.title || `${isTab ? "تب" : "مورد"} ${i + 1}`}</span>
            <span className="text-xs text-muted-foreground">
              {entry.media_id ? "دارای تصویر" : "ویرایش"}
            </span>
          </button>
        ))}
      </div>
      {item && (
        <fieldset className="space-y-4 rounded-xl border border-border bg-white p-3">
          <legend className="px-2 text-sm font-semibold">
            ویرایش {isTab ? "تب" : "مورد"} {index + 1}
          </legend>
          {hasMedia && (
            <div
              className="grid grid-cols-2 gap-2"
              aria-label="نوع محتوای مورد"
            >
              <Button
                type="button"
                variant="outline"
                className="h-auto min-h-16 min-w-0 flex-col gap-1 px-1 text-xs aria-pressed:border-primary aria-pressed:bg-primary-soft"
                aria-pressed={panel === "text"}
                onClick={() => setPanel("text")}
              >
                <Type size={16} aria-hidden="true" />
                متن و پیوند
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-auto min-h-16 min-w-0 flex-col gap-1 px-1 text-xs aria-pressed:border-primary aria-pressed:bg-primary-soft"
                aria-pressed={panel === "image"}
                onClick={() => setPanel("image")}
              >
                <ImagePlus size={16} />
                {isTab ? "تصویر داخل تب" : "تصویر مورد"}
              </Button>
            </div>
          )}
          <TextField
            label={isTab ? "عنوان تب" : "عنوان مورد"}
            value={item.title || ""}
            maxLength={180}
            onChange={(title) => patch({ title })}
          />
          {panel === "text" && (
            <>
              {isTab && (
                <>
                  <TextField
                    label="تیتر داخل تب"
                    value={item.heading || ""}
                    maxLength={180}
                    onChange={(heading) => patch({ heading })}
                  />
                  <TextField
                    label="عنوان کوتاه داخل تب"
                    value={item.eyebrow || ""}
                    maxLength={180}
                    onChange={(eyebrow) => patch({ eyebrow })}
                  />
                </>
              )}
              <TextField
                label={isTab ? "متن تب" : "توضیح مورد"}
                value={item.text || ""}
                multiline
                onChange={(text) => patch({ text, body_html: "" })}
              />
              {["Tabs", "Accordion"].includes(type) && (
                <details className="rounded-lg border border-border p-3">
                  <summary className="cursor-pointer text-sm">
                    متن غنی و تصاویر داخل متن
                  </summary>
                  <div className="mt-3">
                    <RichEditor
                      label={isTab ? "محتوای غنی تب" : "محتوای غنی مورد"}
                      value={item.body_html || ""}
                      assets={assets}
                      onChange={(body_html) => patch({ body_html })}
                    />
                  </div>
                </details>
              )}
            </>
          )}
          {hasMedia && panel === "image" && (
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <ImagePlus size={17} aria-hidden="true" />
                {isTab ? "تصویر داخل این تب" : "تصویر این مورد"}
              </p>
              <MediaPicker
                label={isTab ? "تصویر تب" : "تصویر مورد"}
                assets={assets}
                value={item.media_id}
                onChange={(media_id) => patch({ media_id })}
              />
            </div>
          )}
          {panel === "text" &&
            !["Statistics", "Testimonials", "Accordion"].includes(type) && (
              <TextField
                label="پیوند مورد"
                value={item.href || ""}
                dir="ltr"
                maxLength={500}
                onChange={(href) => patch({ href: href || null })}
              />
            )}
          {["Statistics", "Pricing"].includes(type) && (
            <TextField
              label="مقدار یا قیمت"
              value={item.value || ""}
              maxLength={80}
              onChange={(value) => patch({ value })}
            />
          )}
          {type === "Testimonials" && (
            <TextField
              label="نام و سمت تأییدشده"
              value={item.attribution || ""}
              maxLength={180}
              onChange={(attribution) => patch({ attribution })}
            />
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              aria-label="مورد بالاتر"
              disabled={index === 0}
              onClick={() => move(-1)}
            >
              <ArrowUp size={16} />
            </Button>
            <Button
              type="button"
              variant="outline"
              aria-label="مورد پایین‌تر"
              disabled={index === value.length - 1}
              onClick={() => move(1)}
            >
              <ArrowDown size={16} />
            </Button>
            <Button
              type="button"
              variant="outline"
              aria-label="تکثیر مورد"
              disabled={value.length >= 24}
              onClick={() => {
                onChange([
                  ...value.slice(0, index + 1),
                  { ...item },
                  ...value.slice(index + 1),
                ]);
                reveal(node, index + 1);
              }}
            >
              <Copy size={16} />
            </Button>
            <Button
              type="button"
              variant="outline"
              aria-label="حذف مورد"
              onClick={() => {
                onChange(value.filter((_, i) => i !== index));
                reveal(node, Math.max(0, index - 1));
              }}
            >
              <Trash2 size={16} />
            </Button>
          </div>
        </fieldset>
      )}
      <Button
        className="w-full"
        type="button"
        variant="outline"
        disabled={value.length >= 24}
        onClick={() => {
          onChange([
            ...value,
            {
              title: `${isTab ? "تب" : "مورد"} تازه`,
              text: "",
              media_id: null,
            },
          ]);
          reveal(node, value.length);
        }}
      >
        <Plus size={17} />
        {isTab ? "افزودن تب" : "افزودن مورد"}
      </Button>
    </div>
  );
}
