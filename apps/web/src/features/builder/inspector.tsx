"use client";
import {
  createContext,
  useContext,
  useState,
  useId,
  type ReactNode,
} from "react";
import { AutoField, usePuck } from "@puckeditor/core";
import { FilePenLine, Paintbrush, SlidersHorizontal } from "lucide-react";
import { widgetLabels, type WidgetType } from "./types";
import type { EditorConfig, EditorProps } from "./adapter";
import type { MediaAsset } from "@/features/cms/types";
import { StylePanel } from "./style-panel";
import { SourceNavigator } from "./source-navigator";
import { TextField } from "@/features/cms/fields";

export const InspectorSettings = createContext<{
  assets: MediaAsset[];
  disabled: boolean;
}>({ assets: [], disabled: false });
export function InspectorFields({ children }: { children: ReactNode }) {
  const settings = useContext(InspectorSettings);
  return <ElementInspector {...settings}>{children}</ElementInspector>;
}

export function ElementInspector({
  children,
  assets,
  disabled,
}: {
  children: ReactNode;
  assets: MediaAsset[];
  disabled: boolean;
}) {
  const puck = usePuck<EditorConfig>();
  const item = puck.selectedItem;
  if (!item)
    return (
      <section className="builder-inspector p-4" dir="rtl">
        <h2 className="mb-3 text-sm font-semibold">تنظیمات برگه</h2>
        <p className="mb-4 text-xs leading-6 text-muted-foreground">
          برای ویرایش، روی عنصر در بوم یا نام آن در لایه‌ها کلیک کنید.
        </p>
        {children}
      </section>
    );
  return (
    <ElementProperties
      key={item.props.id}
      assets={assets}
      disabled={disabled}
    />
  );
}
function ElementProperties({
  assets,
  disabled,
}: {
  assets: MediaAsset[];
  disabled: boolean;
}) {
  const puck = usePuck<EditorConfig>();
  const [tab, setTab] = useState("content");
  const panelId = useId();
  const item = puck.selectedItem!;
  const type = item.type as WidgetType;
  const fields = puck.config.components[type].fields || {};
  const width = Number(puck.appState.ui.viewports.current.width);
  const mode = width <= 479 ? "mobile" : width <= 1023 ? "tablet" : "base";
  const patch = (key: keyof EditorProps, value: unknown) => {
    const selector = puck.getSelectorForId(item.props.id);
    if (!disabled && selector)
      puck.dispatch({
        type: "replace",
        destinationIndex: selector.index,
        destinationZone: selector.zone,
        data: { ...item, props: { ...item.props, [key]: value } },
      });
  };
  return (
    <section className="builder-inspector" dir="rtl">
      <div className="border-b border-border bg-white px-4 py-4">
        <p className="mb-1 text-xs text-muted-foreground">
          ویرایش عنصر انتخاب‌شده
        </p>
        <h2 className="text-base font-bold">
          {type === "LegacySection"
            ? `بخش ${item.props.legacy_section?.title || "موجود"}`
            : widgetLabels[type]}
        </h2>
      </div>
      <div
        role="tablist"
        aria-label="تنظیمات عنصر"
        className="grid grid-cols-3 border-b border-border bg-white"
      >
        {(
          [
            ["content", "محتوا", FilePenLine],
            ["style", "استایل", Paintbrush],
            ["advanced", "پیشرفته", SlidersHorizontal],
          ] as const
        ).map(([key, label, Icon]) => (
          <button
            key={String(key)}
            id={`${panelId}-${key}`}
            type="button"
            role="tab"
            aria-selected={tab === key}
            aria-controls={`${panelId}-panel`}
            tabIndex={tab === key ? 0 : -1}
            onClick={() => setTab(String(key))}
            onKeyDown={(event) => {
              const keys = ["content", "style", "advanced"];
              if (
                ["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
              ) {
                event.preventDefault();
                const next =
                  event.key === "Home"
                    ? 0
                    : event.key === "End"
                      ? 2
                      : (keys.indexOf(tab) +
                          (event.key === "ArrowLeft" ? 1 : 2)) %
                        3;
                setTab(keys[next]!);
                event.currentTarget.parentElement
                  ?.querySelectorAll<HTMLButtonElement>("button")
                  [next]?.focus();
              }
            }}
            className="builder-inspector-tab flex min-h-16 flex-col items-center justify-center gap-2 border-b-2 border-transparent text-xs aria-selected:border-primary aria-selected:text-primary"
          >
            {typeof Icon !== "string" && <Icon size={18} aria-hidden="true" />}
            {String(label)}
          </button>
        ))}
      </div>
      <fieldset
        disabled={disabled}
        role="tabpanel"
        id={`${panelId}-panel`}
        aria-labelledby={`${panelId}-${tab}`}
        className="min-w-0 space-y-5 p-4"
      >
        {tab === "content" &&
          [
            "FeatureStory",
            "ProductShowcase",
            "FeatureIndex",
            "AudienceIndex",
            "FAQ",
            "ArticleList",
          ].includes(type) && (
            <SourceNavigator
              key={item.props.feature_slug || type}
              kind={
                type === "AudienceIndex"
                  ? "audience"
                  : type === "FAQ"
                    ? "faq"
                    : type === "ArticleList"
                      ? "learning"
                      : "feature"
              }
              slug={
                ["FeatureStory", "ProductShowcase"].includes(type)
                  ? item.props.feature_slug
                  : undefined
              }
            />
          )}
        {tab === "content" &&
          type === "LegacySection" &&
          ["features", "faq", "learning"].includes(
            item.props.legacy_section?.type || "",
          ) && (
            <SourceNavigator
              kind={
                item.props.legacy_section?.type === "faq"
                  ? "faq"
                  : item.props.legacy_section?.type === "learning"
                    ? "learning"
                    : "feature"
              }
            />
          )}
        {tab === "content" ? (
          Object.entries(fields)
            .filter(
              ([key, field]) =>
                key !== "node_styles" &&
                field?.type !== "slot" &&
                !(type === "LegacySection" && key === "title"),
            )
            .map(
              ([key, field]) =>
                field && (
                  <div key={key} className="builder-inspector-field">
                    {field.type === "text" || field.type === "textarea" ? (
                      <TextField
                        label={field.label || key}
                        value={String(
                          item.props[key as keyof EditorProps] ?? "",
                        )}
                        multiline={field.type === "textarea"}
                        dir={key === "href" ? "ltr" : "rtl"}
                        maxLength={
                          key === "href"
                            ? 500
                            : field.type === "textarea"
                              ? 4000
                              : 180
                        }
                        onChange={(value) =>
                          patch(key as keyof EditorProps, value)
                        }
                      />
                    ) : field.type === "select" ? (
                      <label className="grid gap-2 text-xs font-semibold">
                        {field.label || key}
                        <select
                          aria-label={field.label || key}
                          value={String(
                            item.props[key as keyof EditorProps] ?? "",
                          )}
                          className="min-h-11 w-full rounded-lg border border-input bg-white px-3"
                          onChange={(event) =>
                            patch(
                              key as keyof EditorProps,
                              field.options.find(
                                (option) =>
                                  String(option.value) === event.target.value,
                              )?.value,
                            )
                          }
                        >
                          <option value="" disabled>
                            انتخاب کنید
                          </option>
                          {field.options.map((option) => (
                            <option
                              key={String(option.value)}
                              value={String(option.value)}
                            >
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : field.type === "number" ? (
                      <label className="grid gap-2 text-xs font-semibold">
                        {field.label || key}
                        <input
                          aria-label={field.label || key}
                          className="min-h-11 w-full rounded-lg border border-input bg-white px-3"
                          type="number"
                          min={field.min}
                          max={field.max}
                          value={String(
                            item.props[key as keyof EditorProps] ?? "",
                          )}
                          onChange={(event) =>
                            patch(
                              key as keyof EditorProps,
                              event.target.value === ""
                                ? undefined
                                : Number(event.target.value),
                            )
                          }
                        />
                      </label>
                    ) : (
                      <AutoField
                        id={`${panelId}-${key}`}
                        field={field}
                        value={item.props[key as keyof EditorProps]}
                        onChange={(value: unknown) =>
                          patch(key as keyof EditorProps, value)
                        }
                      />
                    )}
                  </div>
                ),
            )
        ) : (
          <StylePanel
            key={`${tab}-${mode}`}
            initialMode={mode}
            section={tab === "style" ? "style" : "advanced"}
            value={item.props.node_styles}
            assets={assets}
            onChange={(value) => patch("node_styles", value)}
          />
        )}
        {tab === "content" && ["Container", "Grid"].includes(type) && (
          <p className="rounded-lg bg-primary-soft p-3 text-xs leading-6">
            عناصر را داخل این کانتینر بکشید. برای تغییر متن یا تصویر، خود عنصر
            داخل کانتینر را انتخاب کنید. فاصله و ستون‌ها در «پیشرفته» هستند.
          </p>
        )}
      </fieldset>
    </section>
  );
}
