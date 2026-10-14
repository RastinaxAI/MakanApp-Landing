"use client";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Puck,
  blocksPlugin,
  fieldsPlugin,
  outlinePlugin,
  usePuck,
  type Dictionary,
  type Viewports,
} from "@puckeditor/core";
import "@puckeditor/core/no-external.css";
import Link from "next/link";
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
  widgetLabels,
  type BuilderContext,
  type VisualDocument,
} from "./types";
import { AdvancedTools } from "./advanced-tools";
import {
  BuilderPreview,
  BuilderTheme,
  DocumentRoot,
  GlobalFields,
} from "./theme";
import type { DocumentGlobals } from "./types";
import { validateDocument } from "./validation";

// Stable identities prevent the editor from reinitializing viewport/history on each change.
const editorViewports: Viewports = [
  { width: 1440, height: "auto", label: "دسکتاپ" },
  { width: 768, height: "auto", label: "تبلت" },
  { width: 390, height: "auto", label: "موبایل" },
];
const editorIframe = { enabled: true, syncHostStyles: true };
const editorPlugins = [
  blocksPlugin({ label: "عناصر" }),
  outlinePlugin({ label: "لایه‌ها" }),
  fieldsPlugin({ desktopSideBar: "right" }),
];

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
const ToolsContext = createContext<{
  globals: DocumentGlobals;
  busy: boolean;
  publish: (data: EditorData) => void;
}>({ globals: defaultGlobals, busy: false, publish: () => undefined });
function HeaderTools() {
  const { globals, busy, publish } = useContext(ToolsContext);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <EditorQuickTools publish={publish} busy={busy} />
      <AdvancedTools globals={globals} busy={busy} />
    </div>
  );
}
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
      const font = getComputedStyle(
        window.document.documentElement,
      ).getPropertyValue("--font-vazirmatn");
      document.documentElement.style.setProperty("--font-vazirmatn", font);
    }
  }, [document]);
  return <>{children}</>;
}
function EditorQuickTools({
  publish,
  busy,
}: {
  publish: (data: EditorData) => void;
  busy: boolean;
}) {
  const puck = usePuck();
  const flatten = (nodes: VisualDocument["nodes"]): VisualDocument["nodes"] =>
    nodes.flatMap((node) => [node, ...flatten(node.children)]);
  const elements = flatten(
    fromEditorData(puck.appState.data as EditorData, defaultGlobals).nodes,
  );
  const selected = puck.selectedItem;
  const selector = selected
    ? puck.getSelectorForId(selected.props.id)
    : undefined;
  const parent = selected ? puck.getParentById(selected.props.id) : undefined;
  const count =
    parent && Array.isArray(parent.props.children)
      ? parent.props.children.length
      : puck.appState.data.content.length;
  const move = (delta: number) => {
    if (selector) {
      puck.dispatch({
        type: "reorder",
        sourceIndex: selector.index,
        destinationIndex: selector.index + delta,
        destinationZone: selector.zone,
      });
      puck.dispatch({
        type: "setUi",
        ui: { itemSelector: { ...selector, index: selector.index + delta } },
      });
    }
  };
  return (
    <div className="flex flex-wrap items-center gap-2" dir="rtl">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          puck.dispatch({ type: "setUi", ui: { itemSelector: null } })
        }
      >
        رنگ و فونت برگه
      </Button>
      <select
        aria-label="انتخاب عنصر صفحه"
        className="min-h-10 max-w-40 rounded-lg border border-input bg-white px-2 text-xs"
        value={selected?.props.id || ""}
        onChange={(event) => {
          const itemSelector = puck.getSelectorForId(event.target.value);
          if (itemSelector)
            puck.dispatch({ type: "setUi", ui: { itemSelector } });
        }}
      >
        <option value="">انتخاب عنصر</option>
        {elements.map((node) => (
          <option key={node.id} value={node.id}>
            {widgetLabels[node.type]}
            {node.props.title ? ` · ${node.props.title}` : ""}
          </option>
        ))}
      </select>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={busy || !selector || selector.index === 0}
        onClick={() => move(-1)}
      >
        انتقال بالا
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={busy || !selector || selector.index + 1 >= count}
        onClick={() => move(1)}
      >
        انتقال پایین
      </Button>
      <label className="sr-only" htmlFor="builder-viewport">
        نمای صفحه‌ساز
      </label>
      <select
        id="builder-viewport"
        aria-label="نمای صفحه‌ساز"
        className="min-h-10 rounded-lg border border-input bg-white px-2 text-xs"
        value={String(puck.appState.ui.viewports.current.width)}
        onChange={(event) =>
          puck.dispatch({
            type: "setUi",
            ui: {
              viewports: {
                ...puck.appState.ui.viewports,
                current: { width: Number(event.target.value), height: "auto" },
              },
            },
          })
        }
      >
        {[
          [1440, "دسکتاپ"],
          [768, "تبلت"],
          [390, "موبایل"],
        ].map(([width, label]) => (
          <option key={width} value={width}>
            {label}
          </option>
        ))}
      </select>
      <Button
        type="button"
        size="sm"
        disabled={busy}
        onClick={() => publish(puck.appState.data as EditorData)}
      >
        انتشار
      </Button>
    </div>
  );
}
export function PageBuilder({
  initial,
  assets,
  dataContext,
}: {
  initial: AdminContent;
  assets: MediaAsset[];
  dataContext: Omit<BuilderContext, "content">;
}) {
  const [current, setCurrent] = useState(initial);
  const [initialDocument] = useState(() =>
    initial.payload.kind !== "faq"
      ? documentFromContent(initial.payload, dataContext.features)
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
  return (
    <div className="builder-workspace" dir="rtl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">صفحه‌ساز ماکان</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {current.title} · نسخه {current.revision_no.toLocaleString("fa-IR")}{" "}
            · {dirty ? "تغییر ذخیره‌نشده" : "ذخیره‌شده"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/content"
            className="inline-flex min-h-11 items-center px-3 text-primary-hover"
          >
            برگه‌ها
          </Link>
          <Link
            href={`/admin/content/${current.id}?mode=metadata`}
            className="inline-flex min-h-11 items-center px-3 text-primary-hover"
          >
            اطلاعات فهرست معرفی
          </Link>
          <a
            href="/admin/media"
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center px-3 text-primary-hover"
          >
            رسانه‌ها
          </a>
          <a
            href={`/admin/content/${current.id}/revisions`}
            className="inline-flex min-h-11 items-center px-3 text-primary-hover"
          >
            نسخه‌های قبلی
          </a>
          <a
            href={`/admin/preview/${current.id}?revision=${current.revision_id}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center px-3 text-primary-hover"
          >
            پیش‌نمایش ذخیره‌شده
          </a>
          <Button
            disabled={busy || current.is_archived}
            onClick={() => void save()}
          >
            {busy ? "در حال ذخیره…" : "ذخیره صفحه‌ساز"}
          </Button>
        </div>
      </div>
      {message && (
        <p
          role="status"
          className="mb-4 rounded-lg bg-success-soft p-4 text-success"
        >
          {message}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="mb-4 rounded-lg bg-warning-soft p-4 text-destructive"
        >
          {error}
        </p>
      )}
      <details className="mb-4 rounded-xl border border-border bg-white p-4">
        <summary className="cursor-pointer text-sm font-semibold">
          مشخصات برگه و SEO
        </summary>
        <div className="mt-4 grid gap-4 tablet:grid-cols-2">
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
      </details>
      <details className="mb-4 rounded-xl border border-border bg-white p-4">
        <summary className="cursor-pointer text-sm font-semibold">
          زمان‌بندی و وضعیت انتشار
        </summary>
        <div className="mt-4 flex flex-wrap items-end gap-3">
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
      </details>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <label className="flex min-h-11 items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={autosave}
            onChange={(event) => setAutosave(event.target.checked)}
          />
          ذخیرهٔ خودکار پیش‌نویس · حداکثر یک نسخه در ۹۰ ثانیه
        </label>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        عنصر را از کتابخانه به صفحه یا کانتینر بکشید. عنوان و متن را روی صفحه و
        Styleها را در پنل تنظیمات ویرایش کنید. پیش‌نمایش، آخرین نسخهٔ ذخیره‌شده
        را نشان می‌دهد.
      </p>
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
          <ToolsContext.Provider
            value={{
              globals,
              busy: busy || current.is_archived,
              publish: (value) => void save(true, value),
            }}
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
              plugins={editorPlugins}
              headerTitle="ویرایش بصری"
              headerPath={`/${current.slug === "home" ? "" : current.slug}`}
              height="min(1100px,84vh)"
              viewports={editorViewports}
              iframe={editorIframe}
              overrides={{
                iframe: RtlFrame,
                headerActions: HeaderTools,
              }}
              permissions={{
                edit: !busy && !current.is_archived,
                drag: !busy && !current.is_archived,
                delete: !busy && !current.is_archived,
                duplicate: !busy && !current.is_archived,
                insert: !busy && !current.is_archived,
              }}
            />
          </ToolsContext.Provider>
        </BuilderPreview.Provider>
      </BuilderTheme.Provider>
    </div>
  );
}
