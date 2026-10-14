"use client";
import { useState } from "react";
import type { NodeStyles, StyleValues } from "./types";
import { emptyStyles } from "./types";
import { MediaPicker } from "@/features/cms/fields";
import type { MediaAsset } from "@/features/cms/types";

const numerical: [keyof StyleValues, string, number, number][] = [
  ["padding", "فاصله داخلی", 0, 160],
  ["padding_inline", "فاصله داخلی افقی", 0, 160],
  ["padding_block", "فاصله داخلی عمودی", 0, 160],
  ["margin", "فاصله بیرونی", -160, 160],
  ["margin_inline", "فاصله بیرونی افقی", -160, 160],
  ["margin_block", "فاصله بیرونی عمودی", -160, 160],
  ["gap", "فاصله فرزندان", 0, 128],
  ["columns", "تعداد ستون", 1, 12],
  ["min_height", "حداقل ارتفاع", 0, 1600],
  ["top", "فاصله از بالا", -2000, 2000],
  ["inset_start", "فاصله از شروع", -2000, 2000],
  ["radius", "گردی گوشه", 0, 96],
  ["border_width", "ضخامت حاشیه", 0, 12],
  ["font_size", "اندازه متن", 10, 120],
  ["line_height", "ارتفاع خط", 1, 3],
  ["letter_spacing", "فاصله حروف", -2, 10],
  ["transition_ms", "زمان انتقال", 0, 600],
  ["gradient_angle", "زاویه گرادینت", 0, 360],
];
const choices: [keyof StyleValues, string, string[]][] = [
  ["display", "نوع چیدمان", ["block", "flex", "grid"]],
  [
    "direction",
    "جهت چیدمان",
    ["row", "column", "row-reverse", "column-reverse"],
  ],
  ["align", "تراز عمودی", ["start", "center", "end", "stretch"]],
  [
    "justify",
    "تراز افقی",
    ["start", "center", "end", "space-between", "space-around"],
  ],
  ["text_align", "تراز متن", ["start", "center", "end", "justify"]],
  ["position", "موقعیت", ["static", "relative", "absolute", "sticky", "fixed"]],
  ["font_family", "خانواده فونت", ["sans", "serif", "mono"]],
  [
    "font_weight",
    "وزن فونت",
    ["300", "400", "500", "600", "700", "800", "900"],
  ],
  ["shadow", "سایه", ["none", "soft", "raised"]],
  ["border_style", "نوع حاشیه", ["solid", "dashed", "dotted", "none"]],
  ["background_size", "اندازه تصویر زمینه", ["cover", "contain", "auto"]],
];
const colors: [keyof StyleValues, string][] = [
  ["color", "رنگ متن"],
  ["background", "رنگ زمینه"],
  ["border_color", "رنگ حاشیه"],
  ["gradient_from", "شروع گرادینت"],
  ["gradient_to", "پایان گرادینت"],
];
export function StylePanel({
  value,
  onChange,
  assets = [],
}: {
  value?: NodeStyles;
  onChange: (styles: NodeStyles) => void;
  assets?: MediaAsset[];
}) {
  const [mode, setMode] = useState<keyof NodeStyles>("base");
  const styles = value || emptyStyles();
  const selected = styles[mode] || {};
  const set = (
    key: keyof StyleValues,
    next: string | number | boolean | undefined,
  ) => {
    const updated = { ...selected };
    if (next === undefined) delete updated[key];
    else Object.assign(updated, { [key]: next });
    onChange({ ...styles, [mode]: updated });
  };
  const inputClass =
    "min-h-10 min-w-0 w-full rounded-md border border-input bg-white px-2 text-xs";
  return (
    <div className="space-y-4" dir="rtl">
      <label className="grid gap-2 text-xs">
        حالت تنظیم Style
        <select
          aria-label="حالت تنظیم Style"
          className={inputClass}
          value={mode}
          onChange={(event) => setMode(event.target.value as keyof NodeStyles)}
        >
          {Object.entries({
            base: "دسکتاپ / پایه",
            tablet: "تبلت",
            mobile: "موبایل",
            hover: "Hover",
            focus: "Focus",
          }).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <p className="text-xs text-muted-foreground">
        مقدار خالی از حالت پایه ارث می‌برد. برای بازنشانی، مقدار را پاک کنید.
      </p>
      <details open>
        <summary className="cursor-pointer text-sm font-semibold">
          چیدمان و اندازه
        </summary>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {choices.map(([key, label, values]) => (
            <label key={key} className="grid gap-1 text-xs">
              {label}
              <select
                aria-label={`${label} ${mode}`}
                className={inputClass}
                value={String(selected[key] ?? "")}
                onChange={(event) =>
                  set(
                    key,
                    event.target.value
                      ? key === "font_weight"
                        ? Number(event.target.value)
                        : event.target.value
                      : undefined,
                  )
                }
              >
                <option value="">ارث‌بری</option>
                {values.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
          ))}
          {["width", "max_width", "height"].map((name) => (
            <label className="grid gap-1 text-xs" key={name}>
              {
                { width: "عرض", max_width: "حداکثر عرض", height: "ارتفاع" }[
                  name
                ]
              }
              <input
                aria-label={`${name} ${mode}`}
                className={inputClass}
                dir="ltr"
                placeholder="100% / 640px"
                value={String(selected[name as keyof StyleValues] ?? "")}
                onChange={(event) =>
                  set(
                    name as keyof StyleValues,
                    event.target.value || undefined,
                  )
                }
              />
            </label>
          ))}
        </div>
      </details>
      <details>
        <summary className="cursor-pointer text-sm font-semibold">
          فاصله، تایپوگرافی و سطح
        </summary>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {numerical.map(([key, label, min, max]) => (
            <label key={key} className="grid gap-1 text-xs">
              {label}
              <input
                aria-label={`${label} ${mode}`}
                className={inputClass}
                type="number"
                min={min}
                max={max}
                step={
                  key === "line_height" || key === "letter_spacing" ? 0.1 : 1
                }
                value={
                  selected[key] === undefined || selected[key] === null
                    ? ""
                    : Number(selected[key])
                }
                onChange={(event) =>
                  set(
                    key,
                    event.target.value === ""
                      ? undefined
                      : Number(event.target.value),
                  )
                }
              />
            </label>
          ))}
        </div>
      </details>
      <details>
        <summary className="cursor-pointer text-sm font-semibold">
          رنگ و نمایش
        </summary>
        <div className="mt-3 grid gap-3">
          <MediaPicker
            label={`تصویر زمینه ${mode}`}
            assets={assets}
            value={selected.background_media_id}
            onChange={(value) => set("background_media_id", value || undefined)}
          />
          {colors.map(([key, label]) => (
            <label key={key} className="grid gap-1 text-xs">
              {label}
              <input
                aria-label={`${label} ${mode}`}
                className={inputClass}
                dir="ltr"
                value={String(selected[key] ?? "")}
                placeholder="#1266df / global:primary"
                onChange={(event) => set(key, event.target.value || undefined)}
              />
            </label>
          ))}
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={selected.hidden === true}
              onChange={(event) => set("hidden", event.target.checked)}
            />
            پنهان در این حالت
          </label>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={selected.wrap === true}
              onChange={(event) => set("wrap", event.target.checked)}
            />
            شکستن ردیف Flex
          </label>
        </div>
      </details>
    </div>
  );
}
