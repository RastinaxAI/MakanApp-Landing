"use client";
import { createContext, useContext, type ReactNode } from "react";
import { defaultGlobals, type DocumentGlobals } from "./types";
import { globalCSS } from "./styles";
export const BuilderTheme = createContext<DocumentGlobals>(defaultGlobals);
export function DocumentRoot({
  scope,
  children,
}: {
  scope: string;
  children: ReactNode;
}) {
  const globals = useContext(BuilderTheme);
  return (
    <div className="builder-document" data-builder-scope={scope}>
      <style>{globalCSS(globals, scope)}</style>
      {children}
    </div>
  );
}
export function GlobalFields({
  value,
  onChange,
  allowInheritance = true,
  compact = false,
}: {
  value: DocumentGlobals;
  onChange: (value: DocumentGlobals) => void;
  allowInheritance?: boolean;
  compact?: boolean;
}) {
  return (
    <div className={`grid gap-3 ${compact ? "" : "tablet:grid-cols-3"}`}>
      {allowInheritance && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={value.inherit_site !== false}
            onChange={(event) =>
              onChange({ ...value, inherit_site: event.target.checked })
            }
          />
          ارث‌بری از رنگ و فونت سراسری سایت
        </label>
      )}
      <label className="grid gap-2 text-sm">
        فونت سراسری
        <select
          aria-label="فونت سراسری"
          className="min-h-11 rounded-lg border border-input bg-white px-3"
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
      {Object.entries(value.colors).map(([name, color]) => (
        <label key={name} className="grid gap-2 text-sm">
          رنگ {name}
          <input
            aria-label={`رنگ سراسری ${name}`}
            className="min-h-11 rounded-lg border border-input bg-white px-3"
            type="color"
            value={color}
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
      <p className="col-span-full text-xs text-muted-foreground">
        در Style از global:primary و global:brand استفاده کنید. مقدار ثابت هر
        عنصر، رنگ سراسری را برای همان عنصر جایگزین می‌کند.
      </p>
    </div>
  );
}
