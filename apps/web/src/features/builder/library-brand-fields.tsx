"use client";
import type { DocumentGlobals } from "./types";

const colorLabels: Record<string, string> = {
  brand: "رنگ برند",
  primary: "رنگ اصلی",
  text: "رنگ متن",
  surface: "پس‌زمینه",
};

export function LibraryBrandFields({
  value,
  onChange,
}: {
  value: DocumentGlobals;
  onChange: (value: DocumentGlobals) => void;
}) {
  return (
    <div className="space-y-5">
      <label className="grid gap-2 text-sm font-medium">
        فونت سراسری
        <select
          aria-label="فونت سراسری"
          className="min-h-11 w-full min-w-0 rounded-lg border border-input bg-white px-3 font-normal"
          value={value.font}
          onChange={(event) =>
            onChange({
              ...value,
              font: event.target.value as DocumentGlobals["font"],
              inherit_site: false,
            })
          }
        >
          <option value="sans">وزیرمتن · فارسی</option>
          <option value="serif">Serif سیستم</option>
          <option value="mono">Monospace سیستم</option>
        </select>
      </label>
      <div className="grid grid-cols-2 gap-3">
        {Object.entries(value.colors).map(([name, color]) => (
          <label
            key={name}
            className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-slate-50/50 p-3"
          >
            <span className="min-w-0">
              <span className="block break-words text-xs font-medium">
                {colorLabels[name] || name}
              </span>
              <code
                dir="ltr"
                className="mt-1.5 block text-[11px] text-muted-foreground"
              >
                {color.toUpperCase()}
              </code>
            </span>
            <input
              aria-label={`رنگ سراسری ${name}`}
              type="color"
              value={color}
              className="size-11 shrink-0 cursor-pointer rounded-lg border border-slate-200 bg-white p-1"
              onChange={(event) =>
                onChange({
                  ...value,
                  inherit_site: false,
                  colors: { ...value.colors, [name]: event.target.value },
                })
              }
            />
          </label>
        ))}
      </div>
      <p className="text-xs leading-7 text-muted-foreground">
        این رنگ‌ها در طرح‌های متصل به هویت سراسری استفاده می‌شوند. رنگ اختصاصی
        هر عنصر را می‌توانید در صفحه‌ساز تغییر دهید.
      </p>
    </div>
  );
}
