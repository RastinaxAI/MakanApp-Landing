"use client";
import {
  usePuck,
  registerOverlayPortal,
  type ComponentConfig,
  type Config,
  type Fields,
  type SlotComponent,
} from "@puckeditor/core";
import type { MediaAsset, CmsSection } from "@/features/cms/types";
import { MediaPicker, TextField, BlocksEditor } from "@/features/cms/fields";
import { RichEditor } from "@/features/cms/rich-editor";
import { Widget } from "./widget";
import { StylePanel } from "./style-panel";
import {
  widgetLabels,
  emptyStyles,
  type BuilderContext,
  type NodeStyles,
  type VisualNode,
  type WidgetProps,
  type WidgetType,
} from "./types";
import type { EditorMap, EditorProps, EditorRootProps } from "./adapter";
import { useEffect, useRef } from "react";
import { ItemsEditor } from "./items-editor";
import { useElementFocus } from "./element-focus";

function LegacyFields({
  value,
  onChange,
  assets,
  context,
}: {
  value?: CmsSection | null;
  onChange: (value: CmsSection) => void;
  assets: MediaAsset[];
  context: BuilderContext;
}) {
  const puck = usePuck();
  const item = puck.selectedItem;
  if (!value) return null;
  return (
    <div className="space-y-3">
      {value.type === "audiences" && (
        <>
          <p className="rounded-lg bg-primary-soft p-3 text-xs leading-6">
            تب‌های مخاطبان همین بخش را اینجا ویرایش کنید. تغییرات این بخش مستقل
            از برگه‌های معرفی مخاطبان ذخیره می‌شوند.
          </p>
          <ItemsEditor
            type="Tabs"
            assets={assets}
            value={
              item?.props.items?.length
                ? item.props.items
                : context.audiences.map((audience) => ({
                    title: audience.title,
                    heading: audience.headline,
                    eyebrow: audience.eyebrow,
                    text: audience.summary,
                    href: `/solutions/${audience.slug}`,
                    media_id: null,
                  }))
            }
            onChange={(items) => {
              if (!item) return;
              const selector = puck.getSelectorForId(item.props.id);
              if (selector)
                puck.dispatch({
                  type: "replace",
                  destinationIndex: selector.index,
                  destinationZone: selector.zone,
                  data: { ...item, props: { ...item.props, items } },
                });
            }}
          />
        </>
      )}
      <details open={value.type !== "audiences"}>
        <summary className="cursor-pointer text-sm font-semibold">
          عنوان و محتوای کلی بخش
        </summary>
        <div className="mt-4 space-y-3">
          <TextField
            label="عنوان بخش موجود"
            value={value.title}
            onChange={(title) => onChange({ ...value, title })}
          />
          <TextField
            label="عنوان کوتاه بخش"
            value={value.kicker || ""}
            maxLength={180}
            onChange={(kicker) => onChange({ ...value, kicker })}
          />
          {value.type === "hero" && (
            <TextField
              label="ادامه عنوان اصلی"
              value={value.accent || ""}
              maxLength={180}
              onChange={(accent) => onChange({ ...value, accent })}
            />
          )}
          <TextField
            label="توضیح بخش موجود"
            value={value.description}
            multiline
            onChange={(description) => onChange({ ...value, description })}
          />
          <RichEditor
            label="متن بخش موجود"
            value={value.body_html || ""}
            onChange={(body_html) => onChange({ ...value, body_html })}
            assets={assets}
          />
          {value.type !== "audiences" && (
            <BlocksEditor
              label="موارد بخش موجود"
              items={value.items}
              onChange={(items) => onChange({ ...value, items })}
              assets={assets}
            />
          )}
          <MediaPicker
            label="تصویر بخش موجود"
            value={value.media_id}
            onChange={(media_id) => onChange({ ...value, media_id })}
            assets={assets}
          />
          <TextField
            label="متن دعوت"
            value={value.cta_label || ""}
            onChange={(cta_label) => onChange({ ...value, cta_label })}
          />
          <TextField
            label="پیوند دعوت"
            value={value.cta_href || "/demo"}
            onChange={(cta_href) => onChange({ ...value, cta_href })}
          />
        </div>
      </details>
    </div>
  );
}
function EditableWidget({
  type,
  fields,
  context,
  slot,
}: {
  type: WidgetType;
  fields: WidgetProps & { id: string; node_styles?: NodeStyles };
  context: BuilderContext;
  slot?: SlotComponent;
}) {
  const puck = usePuck();
  const { focus, reveal } = useElementFocus();
  const wrapper = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const cleanup = Array.from(
      wrapper.current?.querySelectorAll<HTMLElement>('[role="tablist"]') || [],
    ).map((list) => registerOverlayPortal(list, { disableDrag: true }));
    return () => cleanup.forEach((remove) => remove?.());
  }, [type, fields.id, fields.items?.length, fields.legacy_section?.type]);
  const viewport = Number(puck.appState.ui.viewports.current.width);
  const styleMode =
    viewport <= 479 ? "mobile" : viewport <= 1023 ? "tablet" : "base";
  const replaceProps = (partial: Partial<EditorProps>) => {
    const selector = puck.getSelectorForId(fields.id);
    const item = puck.getItemById(fields.id);
    if (selector && item)
      puck.dispatch({
        type: "replace",
        destinationIndex: selector.index,
        destinationZone: selector.zone,
        data: { ...item, props: { ...item.props, ...partial } },
      });
  };
  const selected = puck.selectedItem?.props.id === fields.id;
  const node: VisualNode = {
    id: fields.id,
    type,
    version: 1,
    props: fields,
    styles: fields.node_styles || emptyStyles(),
    children: [],
  };
  return (
    <div
      ref={wrapper}
      className={`relative ${type === "Tabs" ? "pt-12" : ""}`}
      onClick={(event) => {
        if ((event.target as HTMLElement).closest("[data-puck-overlay-portal]"))
          event.stopPropagation();
      }}
      onClickCapture={(event) => {
        const target = (event.target as HTMLElement).closest("[data-node-id]");
        if (target?.getAttribute("data-node-id") === fields.id) {
          const selector = puck.getSelectorForId(fields.id);
          if (selector)
            puck.dispatch({
              type: "setUi",
              ui: {
                itemSelector: selector,
                plugin: { current: "fields" },
                leftSideBarVisible: true,
                mobilePanelExpanded: true,
              },
            });
        }
        if ((event.target as HTMLElement).closest("a")) event.preventDefault();
      }}
    >
      <Widget
        node={node}
        context={{ ...context, editing: true }}
        onInlineEdit={(value) =>
          replaceProps(
            type === "Heading" ? { title: value } : { body_html: value },
          )
        }
        onItemSelect={(index) => reveal(fields.id, index)}
        activeItemIndex={focus.node === fields.id ? focus.index : undefined}
      >
        {slot && slot({ className: "builder-layout", minEmptyHeight: 100 })}
      </Widget>
      {selected && (
        <button
          type="button"
          aria-label="تغییر عرض عنصر"
          title="برای تغییر عرض بکشید؛ کلیدهای جهت نیز قابل استفاده‌اند"
          className="builder-resize"
          onKeyDown={(event) => {
            if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
            event.preventDefault();
            const old =
              wrapper.current?.querySelector<HTMLElement>("[data-node-id]")
                ?.offsetWidth || 320;
            replaceProps({
              node_styles: {
                ...(fields.node_styles || emptyStyles()),
                [styleMode]: {
                  ...fields.node_styles?.[styleMode],
                  width: `${Math.max(80, Math.min(1600, old + (event.key === "ArrowLeft" ? 10 : -10)))}px`,
                },
              },
            });
          }}
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            const element =
              event.currentTarget.parentElement?.querySelector<HTMLElement>(
                "[data-node-id]",
              );
            if (!element) return;
            const start = event.clientX;
            const width = element.offsetWidth;
            const scale = width / element.getBoundingClientRect().width;
            event.currentTarget.setPointerCapture(event.pointerId);
            const target = event.currentTarget;
            const move = (pointer: PointerEvent) =>
              replaceProps({
                node_styles: {
                  ...(fields.node_styles || emptyStyles()),
                  [styleMode]: {
                    ...fields.node_styles?.[styleMode],
                    width: `${Math.round(Math.max(80, Math.min(1600, width + (start - pointer.clientX) * scale)))}px`,
                  },
                },
              });
            const done = () => {
              target.removeEventListener("pointermove", move);
              target.removeEventListener("pointerup", done);
              target.removeEventListener("pointercancel", done);
            };
            target.addEventListener("pointermove", move);
            target.addEventListener("pointerup", done);
            target.addEventListener("pointercancel", done);
          }}
        >
          ↔
        </button>
      )}
    </div>
  );
}

export function editorConfig(
  context: BuilderContext,
  assets: MediaAsset[],
): Config<EditorMap, EditorRootProps> {
  const text = (label: string) => ({ type: "text" as const, label });
  const components = Object.fromEntries(
    (Object.keys(widgetLabels) as WidgetType[]).map((type) => {
      const fields: Fields<EditorProps> = {
        title: text(
          ["Heading", "Hero", "CTA", "FeatureIndex", "AudienceIndex"].includes(
            type,
          )
            ? "عنوان"
            : "نام در لایه‌ها",
        ),
        node_styles: {
          type: "custom",
          label: "چیدمان و Style",
          render: ({ value, onChange }) => (
            <StylePanel value={value} onChange={onChange} assets={assets} />
          ),
        },
      };
      if (["Container", "Grid"].includes(type))
        fields.children = { type: "slot", label: "فرزندان" };
      if (["CTA", "Hero"].includes(type))
        fields.text = { type: "textarea", label: "توضیح" };
      if (type === "RichText")
        fields.body_html = {
          type: "custom",
          label: "متن غنی",
          render: ({ value, onChange }) => (
            <RichEditor
              label="متن غنی"
              value={value || ""}
              onChange={onChange}
              assets={assets}
            />
          ),
        };
      if (type === "Heading")
        fields.level = {
          type: "select",
          label: "سطح عنوان",
          options: [1, 2, 3, 4, 5, 6].map((value) => ({
            value,
            label: `H${value}`,
          })),
        };
      if (["Hero", "CTA", "Button", "Pricing"].includes(type)) {
        fields.label = text("متن دکمه");
        fields.href = text("پیوند دکمه");
      }
      if (type === "Hero") {
        fields.accent = text("ادامه عنوان");
        fields.kicker = text("عنوان کوتاه");
      }
      if (["Image", "Video", "Hero"].includes(type))
        fields.media_id = {
          type: "custom",
          label: "رسانه",
          render: ({ value, onChange }) => (
            <MediaPicker
              label="تصویر"
              value={value}
              onChange={onChange}
              assets={assets}
            />
          ),
        };
      if (type === "Video") fields.aparat_id = text("شناسه یا پیوند آپارات");
      if (type === "Icon")
        fields.icon = {
          type: "select",
          label: "آیکون",
          options: [
            "school",
            "message",
            "users",
            "book",
            "check",
            "shield",
            "arrow",
            "star",
          ].map((value) => ({ value, label: value })),
        };
      if (
        [
          "Gallery",
          "Carousel",
          "Tabs",
          "Accordion",
          "Features",
          "Statistics",
          "Testimonials",
          "Pricing",
          "Hero",
        ].includes(type)
      )
        fields.items = {
          type: "custom",
          label: type === "Tabs" ? "تب‌ها و محتوای هر تب" : "محتوای موارد",
          render: ({ value, onChange }) => (
            <ItemsEditor
              type={type}
              value={value}
              onChange={onChange}
              assets={assets}
            />
          ),
        };
      if (type === "FAQ")
        fields.faq_slugs = {
          type: "custom",
          label: "پرسش‌های منتخب",
          render: ({ value, onChange }) => (
            <TextField
              label="آدرس پرسش‌ها با ویرگول"
              value={(value || []).join(",")}
              onChange={(value) =>
                onChange(
                  value
                    .split(",")
                    .map((slug) => slug.trim())
                    .filter(Boolean),
                )
              }
            />
          ),
        };
      if (["ProductShowcase", "FeatureStory"].includes(type))
        fields.feature_slug = {
          type: "select",
          label: "قابلیت",
          options: context.features.map((feature) => ({
            label: feature.title,
            value: feature.slug,
          })),
        };
      if (type === "ArticleList") {
        fields.limit = {
          type: "number",
          label: "تعداد مقاله",
          min: 1,
          max: 12,
        };
        fields.category = text("آدرس دستهٔ مقاله");
      }
      if (type === "LegacySection")
        fields.legacy_section = {
          type: "custom",
          label: "محتوای موجود",
          render: ({ value, onChange }) => (
            <LegacyFields
              value={value}
              onChange={onChange}
              assets={assets}
              context={context}
            />
          ),
        };
      const config: ComponentConfig<EditorProps> = {
        label: widgetLabels[type],
        fields,
        defaultProps: {
          title: ["Container", "Grid"].includes(type) ? "" : widgetLabels[type],
          ...(type === "Heading" ? { level: 2 } : {}),
          ...(["Tabs", "Accordion", "Carousel"].includes(type)
            ? {
                items: [
                  {
                    title: type === "Tabs" ? "تب اول" : "مورد اول",
                    text: "محتوای این مورد را از تنظیمات ویرایش کنید.",
                    media_id: null,
                  },
                  {
                    title: type === "Tabs" ? "تب دوم" : "مورد دوم",
                    text: "",
                    media_id: null,
                  },
                ],
              }
            : {}),
          ...(["Container", "Grid"].includes(type)
            ? {
                children: [],
                node_styles: {
                  ...emptyStyles(),
                  base: {
                    display: type === "Grid" ? "grid" : "flex",
                    direction: "column",
                    columns: 2,
                    gap: 24,
                    padding: 24,
                  },
                  mobile: { columns: 1 },
                },
              }
            : { node_styles: emptyStyles() }),
        },
        render: ({ children, puck, ...props }) => (
          <EditableWidget
            type={type}
            fields={props}
            context={{ ...context, editing: puck.isEditing }}
            slot={typeof children === "function" ? children : undefined}
          />
        ),
      };
      return [type, config];
    }),
  ) as Config<EditorMap>["components"];
  return {
    components,
    categories: {
      layout: { title: "چیدمان", components: ["Container", "Grid"] },
      basic: {
        title: "عناصر پایه",
        components: [
          "Heading",
          "RichText",
          "Image",
          "Video",
          "Button",
          "Icon",
          "Gallery",
          "Carousel",
          "Tabs",
          "Accordion",
        ],
      },
      marketing: {
        title: "بازاریابی",
        components: [
          "Hero",
          "FeatureStory",
          "FeatureIndex",
          "AudienceIndex",
          "FAQ",
          "Features",
          "Statistics",
          "Testimonials",
          "CTA",
          "DemoForm",
          "ContactForm",
          "Pricing",
          "ProductShowcase",
          "ArticleList",
        ],
      },
      legacy: {
        title: "بخش‌های موجود",
        visible: false,
        components: ["LegacySection"],
      },
    },
  };
}
