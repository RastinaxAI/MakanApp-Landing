"use client";
import { useId } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { CmsBlock, MediaAsset } from "./types";

export function TextField({
  label,
  value,
  onChange,
  multiline = false,
  dir = "rtl",
  disabled = false,
  maxLength = 4000,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  dir?: "rtl" | "ltr";
  disabled?: boolean;
  maxLength?: number;
}) {
  const id = useId();
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {multiline ? (
        <Textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          maxLength={maxLength}
          dir={dir}
          className="min-h-24"
        />
      ) : (
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          maxLength={maxLength}
          dir={dir}
        />
      )}
    </div>
  );
}
export function MediaPicker({
  label,
  value,
  onChange,
  assets,
  disabled = false,
}: {
  label: string;
  value?: string | null;
  onChange: (value: string | null) => void;
  assets: MediaAsset[];
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        value={value || ""}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value || null)}
        className="min-h-11 w-full rounded-lg border border-input bg-card px-3"
      >
        <option value="">بدون تصویر</option>
        {assets.map((a) => (
          <option key={a.id} value={a.id}>
            {a.alt_text} · {a.original_filename}
          </option>
        ))}
      </select>
    </div>
  );
}
export function BlocksEditor({
  label,
  items,
  onChange,
  disabled = false,
  assets,
}: {
  label: string;
  items: CmsBlock[];
  onChange: (items: CmsBlock[]) => void;
  disabled?: boolean;
  assets: MediaAsset[];
}) {
  function patch(index: number, values: Partial<CmsBlock>) {
    onChange(
      items.map((item, i) => (i === index ? { ...item, ...values } : item)),
    );
  }
  function move(index: number, delta: number) {
    const next = [...items];
    [next[index], next[index + delta]] = [next[index + delta]!, next[index]!];
    onChange(next);
  }
  return (
    <section className="space-y-4">
      <h3 className="text-lg font-semibold">{label}</h3>
      {items.map((item, index) => (
        <fieldset
          key={index}
          disabled={disabled}
          className="space-y-4 rounded-xl border border-border bg-background p-4"
        >
          <legend className="px-2 text-sm">
            {label} · {(index + 1).toLocaleString("fa-IR")}
          </legend>
          <TextField
            label={`عنوان ${label} ${index + 1}`}
            value={item.title}
            onChange={(title) => patch(index, { title })}
            maxLength={180}
          />
          <TextField
            label={`توضیح ${label} ${index + 1}`}
            value={item.description}
            onChange={(description) => patch(index, { description })}
            multiline
          />
          <TextField
            label={`پیوند ${label} ${index + 1}`}
            value={item.href || ""}
            onChange={(href) => patch(index, { href: href || null })}
            dir="ltr"
            maxLength={500}
          />
          <MediaPicker
            label={`تصویر ${label} ${index + 1}`}
            value={item.media_id}
            onChange={(media_id) => patch(index, { media_id })}
            assets={assets}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={disabled || index === 0}
              onClick={() => move(index, -1)}
            >
              بالاتر
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={disabled || index === items.length - 1}
              onClick={() => move(index, 1)}
            >
              پایین‌تر
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              onClick={() => onChange(items.filter((_, i) => i !== index))}
            >
              حذف مورد
            </Button>
          </div>
        </fieldset>
      ))}
      <Button
        type="button"
        variant="outline"
        disabled={disabled || items.length >= 24}
        onClick={() => onChange([...items, { title: "", description: "" }])}
      >
        افزودن {label}
      </Button>
    </section>
  );
}
