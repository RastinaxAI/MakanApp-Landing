"use client";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Puck, type Dictionary, type Viewports } from "@puckeditor/core";
import "@puckeditor/core/no-external.css";
import { adminRequest } from "@/features/admin/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TextField } from "@/features/cms/fields";
import { MediaPicker } from "@/features/cms/fields";
import type { AdminContent, MediaAsset } from "@/features/cms/types";
import { editorConfig } from "./config";
import {
  fromEditorData,
  toEditorData,
  canonicalJSON,
  type EditorData,
} from "./adapter";
import {
  defaultGlobals,
  documentFromContent,
  type BuilderContext,
  type VisualDocument,
} from "./types";
import {
  BuilderPreview,
  BuilderTheme,
  DocumentRoot,
  GlobalFields,
} from "./theme";
import { InspectorFields, InspectorSettings } from "./inspector";
import { LibraryItem } from "./library-item";
import { ElementFocusProvider } from "./element-focus";
import { MediaUpdates } from "@/features/cms/media-context";
import { BuilderStudio } from "./studio";
import { validateDocument } from "./validation";

// Stable identities prevent the editor from reinitializing viewport/history on each change.
const editorViewports: Viewports = [
  { width: 1440, height: "auto", label: "دسکتاپ" },
  { width: 768, height: "auto", label: "تبلت" },
  { width: 390, height: "auto", label: "موبایل" },
];
const editorIframe = { enabled: true, syncHostStyles: true };
const editorUi = {
  plugin: { current: "blocks" },
  viewports: {
    current: { width: 1440, height: "auto" as const },
    controlsVisible: false,
    options: editorViewports,
  },
};
const dictionary: Dictionary = {
  "header-publish": "انتشار",
  "header-undo": "واگرد",
  "header-redo": "انجام دوباره",
  "header-toggle-leftsidebar": "نمایش کتابخانه",
  "header-toggle-rightsidebar": "نمایش تنظیمات",
  "header-toggle-menubar": "نمایش ابزارها",
  "action-selectparent": "انتخاب والد",
  "action-duplicate": "تکثیر",
  "action-delete": "حذف",
  "label-page": "برگه",
  "label-component": "عنصر",
  "outline-empty": "هنوز عنصری اضافه نشده",
  "outline-item-collapse": "جمع کردن",
  "outline-item-expand": "باز کردن",
  "outline-header-title": "لایه‌ها",
  "outline-header-collapseall": "جمع کردن همه",
  "outline-item-duplicate": "تکثیر",
  "outline-item-delete": "حذف",
  "drawer-category-other": "سایر",
  "drawer-category-collapse": "جمع کردن {title}",
  "drawer-category-expand": "باز کردن {title}",
  "field-readonly": "فقط خواندنی",
  "field-arrayitem-summary": "مورد {index}",
  "field-arrayitem-duplicate": "تکثیر مورد",
  "field-arrayitem-delete": "حذف مورد",
  "viewport-zoom-in": "بزرگ‌نمایی",
  "viewport-zoom-out": "کوچک‌نمایی",
  "viewport-zoom-auto": "بزرگ‌نمایی خودکار {zoom}%",
};
function RtlFrame({
  document,
  children,
}: {
  document?: Document;
  children: ReactNode;
}) {
  useEffect(() => {
    if (document) {
      document.documentElement.setAttribute("dir", "rtl");
      document.documentElement.setAttribute("lang", "fa");
      // Match the public renderer inside the canvas; keep editor controls outside.
      document.body.classList.add("public-site");
      const font = getComputedStyle(
        window.document.documentElement,
      ).getPropertyValue("--font-vazirmatn");
      document.documentElement.style.setProperty("--font-vazirmatn", font);
      return () => document.body.classList.remove("public-site");
    }
  }, [document]);
  return <>{children}</>;
}
export function PageBuilder({
  initial,
  assets: initialAssets,
  dataContext,
}: {
  initial: AdminContent;
  assets: MediaAsset[];
  dataContext: Omit<BuilderContext, "content">;
}) {
  const [assets, setAssets] = useState(initialAssets);
  const [current, setCurrent] = useState(initial);
  const [initialDocument] = useState(() =>
    initial.payload.kind !== "faq"
      ? documentFromContent(initial.payload, dataContext.features, initial.slug)
      : { schema_version: 2 as const, globals: defaultGlobals, nodes: [] },
  );
  const [data, setData] = useState<EditorData>(() =>
    toEditorData(initialDocument),
  );
  const globals = data.root.props?.document_globals || initialDocument.globals;
  const [autosave, setAutosave] = useState(true);
  const autosaveRef = useRef<() => void>(() => undefined);
  const checkpoint = useRef(0);
  const latest = useRef(data);
  const [dirty, setDirty] = useState(
    !(initial.payload.kind !== "faq" && initial.payload.document),
  );
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [publishAt, setPublishAt] = useState("");
  const [metadata, setMetadata] = useState({
    title: initial.title,
    headline:
      "headline" in initial.payload ? initial.payload.headline : initial.title,
    summary: "summary" in initial.payload ? initial.payload.summary : "",
    seo_title: initial.seo.title,
    seo_description: initial.seo.description,
    indexable: initial.seo.indexable,
    og_media_id: initial.seo.og_media_id,
  });
  const context = useMemo<BuilderContext>(
    () => ({
      ...dataContext,
      content: { ...initial, media: assets },
      assets,
      privatePreview: true,
    }),
    [dataContext, initial, assets],
  );
  const config = useMemo(() => {
    const value = editorConfig(context, assets);
    const scope = `editor_${initial.id}`;
    value.root = {
      fields: {
        document_globals: {
          type: "custom",
          label: "رنگ و فونت برگه",
          render: ({ value, onChange }) => (
            <GlobalFields
              value={value || defaultGlobals}
              onChange={onChange}
              compact
            />
          ),
        },
      },
      render: ({ children }) => (
        <DocumentRoot scope={scope}>{children}</DocumentRoot>
      ),
    };
    return value;
  }, [context, assets, initial.id]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty) event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  async function save(publish = false, snapshot = latest.current) {
    if (lock.current || current.is_archived) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (!metadata.title.trim() || !metadata.headline.trim())
        throw new Error("عنوان برگه و تیتر اصلی را کامل کنید.");
      if (current.payload.kind === "faq")
        throw new Error("این نوع محتوا با صفحه‌ساز سازگار نیست.");
      const document: VisualDocument = fromEditorData(snapshot, globals);
      document.purpose = initialDocument.purpose || "page";
      validateDocument(document);
      let saved =
        publish && !dirty
          ? current
          : await adminRequest<AdminContent>(
              `content/${current.id}`,
              "PATCH",
              {
                title: metadata.title,
                slug: current.slug,
                payload: {
                  ...current.payload,
                  headline: metadata.headline,
                  summary: metadata.summary,
                  document,
                },
                seo: {
                  ...current.seo,
                  title: metadata.seo_title,
                  description: metadata.seo_description,
                  indexable: metadata.indexable,
                  og_media_id: metadata.og_media_id,
                },
                visibility: current.visibility,
                sort_order: current.sort_order,
                category_id: current.category_id,
              },
              current.row_version,
            );
      setCurrent(saved);
      if (publish)
        saved = await adminRequest<AdminContent>(
          `content/${current.id}/publish`,
          "POST",
          { revision_id: saved.revision_id },
          saved.row_version,
        );
      setCurrent(saved);
      setDirty(false);
      checkpoint.current = Date.now();
      setMessage(
        publish
          ? "نسخهٔ صفحه‌ساز ذخیره و منتشر شد."
          : "پیش‌نویس صفحه‌ساز در دیتابیس ذخیره شد.",
      );
      return saved;
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "ذخیره انجام نشد.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  useEffect(() => {
    autosaveRef.current = () => {
      if (
        autosave &&
        dirty &&
        !busy &&
        Date.now() - checkpoint.current >= 90000
      ) {
        checkpoint.current = Date.now();
        void save();
      }
    };
  });
  useEffect(() => {
    checkpoint.current = Date.now();
    const timer = window.setInterval(() => autosaveRef.current(), 5000);
    return () => window.clearInterval(timer);
  }, []);
  async function lifecycle(
    action: "schedule" | "cancel-schedule" | "unpublish",
  ) {
    if (lock.current || current.is_archived) return;
    let row = current;
    if (dirty) {
      const saved = await save();
      if (!saved) return;
      row = saved;
    }
    lock.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const body =
        action === "schedule"
          ? {
              revision_id: row.revision_id,
              publish_at: new Date(publishAt).toISOString(),
            }
          : undefined;
      setCurrent(
        await adminRequest<AdminContent>(
          `content/${row.id}/${action}`,
          "POST",
          body,
          row.row_version,
        ),
      );
      setMessage(
        action === "schedule"
          ? "انتشار نسخهٔ ذخیره‌شده زمان‌بندی شد."
          : action === "unpublish"
            ? "انتشار لغو شد؛ پیش‌نویس و نسخه‌ها باقی ماندند."
            : "زمان‌بندی انتشار لغو شد.",
      );
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "تغییر انتشار انجام نشد.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const pageSettings = (
    <div className="grid gap-4">
      <TextField
        label="عنوان برگه"
        value={metadata.title}
        onChange={(title) => {
          setMetadata({ ...metadata, title });
          setDirty(true);
        }}
      />
      <TextField
        label="تیتر اصلی برگه"
        value={metadata.headline}
        onChange={(headline) => {
          setMetadata({ ...metadata, headline });
          setDirty(true);
        }}
      />
      <TextField
        label="خلاصه برگه"
        value={metadata.summary}
        multiline
        onChange={(summary) => {
          setMetadata({ ...metadata, summary });
          setDirty(true);
        }}
      />
      <TextField
        label="عنوان SEO"
        value={metadata.seo_title}
        onChange={(seo_title) => {
          setMetadata({ ...metadata, seo_title });
          setDirty(true);
        }}
      />
      <TextField
        label="توضیح SEO"
        value={metadata.seo_description}
        multiline
        onChange={(seo_description) => {
          setMetadata({ ...metadata, seo_description });
          setDirty(true);
        }}
      />
      <MediaPicker
        label="تصویر اشتراک‌گذاری SEO"
        assets={assets}
        value={metadata.og_media_id}
        onChange={(og_media_id) => {
          setMetadata({ ...metadata, og_media_id });
          setDirty(true);
        }}
      />
      <label className="flex items-center gap-3 text-sm">
        <Input
          type="checkbox"
          className="size-5"
          checked={metadata.indexable}
          onChange={(event) => {
            setMetadata({ ...metadata, indexable: event.target.checked });
            setDirty(true);
          }}
        />
        اجازهٔ ایندکس پس از فعال‌سازی دامنه
      </label>
    </div>
  );
  const publicationSettings = (
    <div className="space-y-4">
      <div className="grid gap-3">
        <label className="grid gap-2 text-sm">
          زمان انتشار · ساعت مرورگر
          <input
            aria-label="زمان انتشار برگه"
            type="datetime-local"
            className="min-h-11 rounded-lg border border-input bg-white px-3"
            value={publishAt}
            onChange={(event) => setPublishAt(event.target.value)}
          />
        </label>
        <Button
          type="button"
          variant="outline"
          disabled={busy || !publishAt || current.is_archived}
          onClick={() => void lifecycle("schedule")}
        >
          ذخیره و زمان‌بندی انتشار
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={busy || !current.scheduled_revision_id}
          onClick={() => void lifecycle("cancel-schedule")}
        >
          لغو زمان‌بندی
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={busy || !current.published_revision_id}
          onClick={() => void lifecycle("unpublish")}
        >
          لغو انتشار عمومی
        </Button>
      </div>
      {current.scheduled_at && (
        <p className="mt-3 text-sm">
          زمان تنظیم‌شده:{" "}
          {new Date(current.scheduled_at).toLocaleString("fa-IR")}
        </p>
      )}
      <label className="flex min-h-11 items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={autosave}
          onChange={(event) => setAutosave(event.target.checked)}
        />
        ذخیرهٔ خودکار پیش‌نویس · حداکثر یک نسخه در ۹۰ ثانیه
      </label>
    </div>
  );
  return (
    <div className="builder-workspace" dir="rtl">
      <MediaUpdates.Provider
        value={(asset) =>
          setAssets((items) => [
            ...items.filter((item) => item.id !== asset.id),
            asset,
          ])
        }
      >
        <ElementFocusProvider>
          <BuilderTheme.Provider
            value={
              globals.inherit_site !== false && dataContext.siteGlobals
                ? {
                    ...globals,
                    colors: {
                      ...globals.colors,
                      ...dataContext.siteGlobals.colors,
                    },
                    font: dataContext.siteGlobals.font,
                  }
                : globals
            }
          >
            <BuilderPreview.Provider
              value={{
                content: {
                  ...initial,
                  title: metadata.title,
                  payload:
                    current.payload.kind === "faq"
                      ? current.payload
                      : {
                          ...current.payload,
                          headline: metadata.headline,
                          summary: metadata.summary,
                        },
                },
                purpose: initialDocument.purpose || "page",
              }}
            >
              <InspectorSettings.Provider
                value={{ assets, disabled: busy || current.is_archived }}
              >
                <Puck
                  config={config}
                  data={data}
                  onChange={(value) => {
                    if (
                      canonicalJSON(
                        fromEditorData(value, initialDocument.globals),
                      ) ===
                      canonicalJSON(
                        fromEditorData(latest.current, initialDocument.globals),
                      )
                    )
                      return;
                    latest.current = value;
                    setData(value);
                    setDirty(true);
                  }}
                  onPublish={(value) => void save(true, value)}
                  dictionary={dictionary}
                  headerTitle="ویرایش بصری"
                  headerPath={`/${current.slug === "home" ? "" : current.slug}`}
                  height="100dvh"
                  viewports={editorViewports}
                  ui={editorUi}
                  iframe={editorIframe}
                  overrides={{
                    fields: InspectorFields,
                    drawerItem: LibraryItem,
                    iframe: RtlFrame,
                  }}
                  permissions={{
                    edit: !busy && !current.is_archived,
                    drag: !busy && !current.is_archived,
                    delete: !busy && !current.is_archived,
                    duplicate: !busy && !current.is_archived,
                    insert: !busy && !current.is_archived,
                  }}
                >
                  <BuilderStudio
                    current={current}
                    globals={globals}
                    busy={busy || current.is_archived}
                    dirty={dirty}
                    message={message}
                    error={error}
                    onSave={() => void save()}
                    onPublish={(value) => void save(true, value)}
                    pageSettings={pageSettings}
                    publicationSettings={publicationSettings}
                  />
                </Puck>
              </InspectorSettings.Provider>
            </BuilderPreview.Provider>
          </BuilderTheme.Provider>
        </ElementFocusProvider>
      </MediaUpdates.Provider>
    </div>
  );
}
