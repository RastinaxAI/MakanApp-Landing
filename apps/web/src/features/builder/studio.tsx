"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { Drawer, Puck, usePuck } from "@puckeditor/core";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Check,
  ChevronLeft,
  Copy,
  Eye,
  FolderOpen,
  Layers3,
  LayoutGrid,
  LoaderCircle,
  Monitor,
  MousePointer2,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  Redo2,
  Search,
  Settings2,
  SlidersHorizontal,
  Smartphone,
  Tablet,
  Trash2,
  Undo2,
} from "lucide-react";
import type { AdminContent } from "@/features/cms/types";
import type { EditorConfig, EditorData } from "./adapter";
import { AdvancedTools } from "./advanced-tools";
import { GlobalFields } from "./theme";
import { LibraryItem } from "./library-item";
import { CanvasHelpButton } from "@/features/help/admin-help";
import { widgetLabels, type DocumentGlobals, type WidgetType } from "./types";

const panels = [
  ["blocks", "عناصر", Plus],
  ["fields", "ویرایش عنصر", SlidersHorizontal],
  ["outline", "لایه‌ها", Layers3],
  ["page", "تنظیمات برگه", Settings2],
  ["library", "بخش‌های آماده", FolderOpen],
] as const;
const devices = [
  [1440, "دسکتاپ", Monitor],
  [768, "تبلت", Tablet],
  [390, "موبایل", Smartphone],
] as const;

function CanvasViewport({ width }: { width: number }) {
  const surface = useRef<HTMLDivElement>(null);
  const [bounds, setBounds] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const element = surface.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry)
        setBounds({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const scale = bounds.width
    ? Math.min(1, Math.max(0.1, (bounds.width - 32) / width))
    : 1;
  return (
    <div
      className="studio-canvas-surface"
      ref={surface}
      data-zoom={Math.round(scale * 100)}
    >
      <div
        className="studio-canvas-page"
        style={{
          width,
          height: Math.max(150, (bounds.height - 32) / scale),
          transform: `translateX(-50%) scale(${scale})`,
        }}
      >
        <Puck.Preview id="studio-canvas" />
      </div>
    </div>
  );
}

function WidgetLibrary() {
  const [query, setQuery] = useState("");
  const puck = usePuck<EditorConfig>();
  const normalized = query
    .trim()
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .toLowerCase();
  let matches = 0;
  return (
    <div className="studio-library">
      <label className="studio-search">
        <Search size={17} aria-hidden="true" />
        <input
          aria-label="جست‌وجوی عناصر"
          placeholder="چه چیزی به صفحه اضافه کنیم؟"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <p className="studio-panel-hint">
        عنصر را بکشید و در جای دلخواه صفحه رها کنید.
      </p>
      {Object.entries(puck.config.categories || {}).map(([key, category]) => {
        if (category.visible === false) return null;
        const names = (category.components || []).filter((name) =>
          `${widgetLabels[name as WidgetType]} ${name}`
            .toLowerCase()
            .includes(normalized),
        );
        matches += names.length;
        if (!names.length) return null;
        return (
          <section
            key={key}
            className="studio-widget-group"
            aria-label={category.title}
          >
            <h3>{category.title}</h3>
            <Drawer droppableId={`studio-library-${key}`}>
              <div className="studio-widget-grid">
                {names.map((name, index) => (
                  <Drawer.Item
                    key={name}
                    name={name}
                    index={index}
                    label={widgetLabels[name as WidgetType]}
                  >
                    {() => (
                      <LibraryItem name={name}>
                        {widgetLabels[name as WidgetType]}
                      </LibraryItem>
                    )}
                  </Drawer.Item>
                ))}
              </div>
            </Drawer>
          </section>
        );
      })}
      {matches === 0 && (
        <p role="status" className="studio-panel-hint">
          عنصری پیدا نشد. نام دیگری را جست‌وجو کنید.
        </p>
      )}
    </div>
  );
}

function ElementCommands({ disabled }: { disabled: boolean }) {
  const puck = usePuck<EditorConfig>();
  const selected = puck.selectedItem;
  const selector = selected
    ? puck.getSelectorForId(selected.props.id)
    : undefined;
  const parent = selected ? puck.getParentById(selected.props.id) : undefined;
  const siblings = parent?.props.children;
  const count = Array.isArray(siblings)
    ? siblings.length
    : puck.appState.data.content.length;
  const move = (delta: number) => {
    if (!selector || disabled) return;
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
  };
  return (
    <div className="studio-selection-actions" aria-label="عملیات عنصر">
      <span>
        {selected
          ? widgetLabels[selected.type as WidgetType]
          : "عنصر انتخاب نشده"}
      </span>
      <button
        type="button"
        aria-label="انتقال بالا"
        title="انتقال بالا"
        disabled={disabled || !selector || selector.index === 0}
        onClick={() => move(-1)}
      >
        <ArrowUp size={16} />
      </button>
      <button
        type="button"
        aria-label="انتقال پایین"
        title="انتقال پایین"
        disabled={disabled || !selector || selector.index + 1 >= count}
        onClick={() => move(1)}
      >
        <ArrowDown size={16} />
      </button>
      <button
        type="button"
        aria-label="تکثیر عنصر انتخاب‌شده"
        title="تکثیر عنصر"
        disabled={disabled || !selector}
        onClick={() =>
          selector &&
          puck.dispatch({
            type: "duplicate",
            sourceIndex: selector.index,
            sourceZone: selector.zone,
          })
        }
      >
        <Copy size={16} />
      </button>
      <button
        type="button"
        aria-label="حذف عنصر انتخاب‌شده"
        title="حذف عنصر"
        disabled={disabled || !selector}
        onClick={() =>
          selector &&
          puck.dispatch({
            type: "remove",
            index: selector.index,
            zone: selector.zone,
          })
        }
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}

export function BuilderStudio({
  current,
  globals,
  busy,
  dirty,
  message,
  error,
  onSave,
  onPublish,
  pageSettings,
  publicationSettings,
}: {
  current: AdminContent;
  globals: DocumentGlobals;
  busy: boolean;
  dirty: boolean;
  message: string;
  error: string;
  onSave: () => void;
  onPublish: (data: EditorData) => void;
  pageSettings: ReactNode;
  publicationSettings: ReactNode;
}) {
  const puck = usePuck<EditorConfig>();
  const dispatch = puck.dispatch;
  const panel = puck.appState.ui.plugin.current || "blocks";
  const [collapsed, setCollapsed] = useState(false);
  const selectedId = puck.selectedItem?.props.id;
  const save = useRef(onSave);
  const saveAllowed = useRef(!busy);
  const width = Number(puck.appState.ui.viewports.current.width);
  useEffect(() => {
    save.current = onSave;
    saveAllowed.current = !busy;
  });
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        const target = event.target as HTMLElement | null;
        if (target && typeof target.blur === "function")
          flushSync(() => target.blur());
        if (saveAllowed.current) save.current();
      }
    };
    const frame = document.querySelector<HTMLIFrameElement>(
      "#studio-canvas iframe",
    );
    let frameDocument: Document | null = null;
    const bindFrame = () => {
      frameDocument?.removeEventListener("keydown", handler);
      frameDocument = frame?.contentDocument || null;
      frameDocument?.addEventListener("keydown", handler);
    };
    document.addEventListener("keydown", handler);
    frame?.addEventListener("load", bindFrame);
    bindFrame();
    return () => {
      document.removeEventListener("keydown", handler);
      frame?.removeEventListener("load", bindFrame);
      frameDocument?.removeEventListener("keydown", handler);
    };
  }, []);
  useEffect(() => {
    if (selectedId) {
      dispatch({ type: "setUi", ui: { plugin: { current: "fields" } } });
    }
  }, [selectedId, dispatch]);
  const open = (name: string) => {
    puck.dispatch({ type: "setUi", ui: { plugin: { current: name } } });
    setCollapsed(false);
  };
  const selected = puck.selectedItem;
  const ancestors = [];
  let ancestor = selected ? puck.getParentById(selected.props.id) : undefined;
  while (ancestor && ancestors.length < 12) {
    ancestors.unshift(ancestor);
    ancestor = puck.getParentById(ancestor.props.id);
  }
  const panelLabel = panels.find(([key]) => key === panel)?.[1] || "عناصر";
  const updateGlobals = (value: DocumentGlobals) => {
    if (busy) return;
    const snapshot = puck.appState.data as EditorData;
    const data: EditorData = {
      ...snapshot,
      root: {
        ...snapshot.root,
        props: { ...snapshot.root.props, document_globals: value },
      },
    };
    puck.dispatch({ type: "setData", data, recordHistory: true });
  };
  return (
    <div className="builder-studio" data-collapsed={collapsed} dir="rtl">
      <header className="studio-topbar">
        <div className="studio-title-group">
          <Link
            href="/admin/content"
            className="studio-icon-button"
            aria-label="بازگشت به برگه‌ها"
            title="برگه‌ها"
          >
            <ArrowRight size={19} />
          </Link>
          <Image
            src="/brand/makan-logo.png"
            width={30}
            height={30}
            alt="ماکان"
            className="studio-logo"
          />
          <div className="studio-title">
            <h1>صفحه‌ساز ماکان</h1>
            <button
              type="button"
              onClick={() => open("page")}
              title="تنظیمات برگه"
            >
              {current.title}
              <ChevronLeft size={12} />
            </button>
          </div>
        </div>
        <div
          className="studio-devices"
          role="group"
          aria-label="اندازه پیش‌نمایش"
        >
          {devices.map(([size, name, Icon]) => (
            <button
              type="button"
              key={size}
              title={name}
              aria-label={`نمای ${name}`}
              aria-pressed={width === size}
              onClick={() =>
                puck.dispatch({
                  type: "setUi",
                  ui: {
                    viewports: {
                      ...puck.appState.ui.viewports,
                      current: { width: size, height: "auto" },
                    },
                  },
                })
              }
            >
              <Icon size={18} />
              <span>{name}</span>
            </button>
          ))}
        </div>
        <div className="studio-main-actions">
          <span className="studio-save-state" aria-live="polite">
            {busy ? (
              <LoaderCircle className="animate-spin" size={14} />
            ) : dirty ? (
              <span className="studio-unsaved-dot" />
            ) : (
              <Check size={14} />
            )}
            {busy ? "در حال ذخیره" : dirty ? "ذخیره‌نشده" : "ذخیره‌شده"}
          </span>
          <button
            type="button"
            className="studio-icon-button studio-history"
            aria-label="واگرد"
            title="واگرد"
            disabled={busy || !puck.history.hasPast}
            onClick={() => puck.history.back()}
          >
            <Undo2 size={18} />
          </button>
          <button
            type="button"
            className="studio-icon-button studio-history"
            aria-label="انجام دوباره"
            title="انجام دوباره"
            disabled={busy || !puck.history.hasFuture}
            onClick={() => puck.history.forward()}
          >
            <Redo2 size={18} />
          </button>
          <a
            className="studio-icon-button"
            href={`/admin/preview/${current.id}?revision=${current.revision_id}`}
            target="_blank"
            rel="noreferrer"
            aria-label="پیش‌نمایش ذخیره‌شده"
            title="پیش‌نمایش آخرین نسخه ذخیره‌شده"
          >
            <Eye size={19} />
          </a>
          <button
            type="button"
            className="studio-save-button"
            disabled={busy}
            onClick={onSave}
          >
            ذخیره صفحه‌ساز
          </button>
          <button
            type="button"
            className="studio-publish-button"
            disabled={busy}
            onClick={() => onPublish(puck.appState.data as EditorData)}
          >
            انتشار
          </button>
        </div>
      </header>
      {(message || error) && (
        <div
          role={error ? "alert" : "status"}
          className={`studio-notice ${error ? "studio-notice-error" : ""}`}
        >
          {error || message}
        </div>
      )}
      <div className="studio-workarea">
        <nav className="studio-rail" aria-label="ابزارهای صفحه‌ساز">
          <CanvasHelpButton />
          {panels.map(([name, label, Icon]) => (
            <button
              type="button"
              key={name}
              aria-label={label}
              title={label}
              aria-pressed={!collapsed && panel === name}
              aria-controls="studio-sidebar"
              onClick={() => open(name)}
            >
              <Icon size={20} />
              <span>{label}</span>
            </button>
          ))}
          <button
            type="button"
            className="studio-collapse"
            aria-label={collapsed ? "نمایش پنل کناری" : "پنهان‌کردن پنل کناری"}
            title={collapsed ? "نمایش پنل کناری" : "پنهان‌کردن پنل کناری"}
            aria-expanded={!collapsed}
            aria-controls="studio-sidebar"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? (
              <PanelRightOpen size={20} />
            ) : (
              <PanelRightClose size={20} />
            )}
          </button>
        </nav>
        <aside
          id="studio-sidebar"
          className="studio-sidebar"
          aria-label="پنل کناری صفحه‌ساز"
          hidden={collapsed}
        >
          <div className="studio-panel-heading">
            <h2>{panelLabel}</h2>
            <span>
              {panel === "blocks"
                ? "بکشید و رها کنید"
                : panel === "fields"
                  ? "ویرایش زنده"
                  : "ماکان استودیو"}
            </span>
          </div>
          <div className="studio-panel-scroll">
            <div hidden={panel !== "blocks"}>
              <WidgetLibrary />
            </div>
            <div hidden={panel !== "fields"}>
              {selected ? (
                <>
                  <ElementCommands disabled={busy} />
                  <Puck.Fields />
                </>
              ) : (
                <div className="studio-empty-selection">
                  <MousePointer2 size={30} />
                  <h3>روی یک عنصر کلیک کنید</h3>
                  <p>تنظیمات همان متن، تصویر یا فرم اینجا باز می‌شود.</p>
                  <button type="button" onClick={() => open("blocks")}>
                    افزودن عنصر <Plus size={16} />
                  </button>
                </div>
              )}
            </div>
            <div hidden={panel !== "outline"} className="studio-layers">
              <p className="studio-panel-hint">
                لایه‌ها را برای تغییر ترتیب بکشید؛ برای ویرایش، انتخاب کنید.
              </p>
              <Puck.Outline />
              <ElementCommands disabled={busy} />
            </div>
            <div hidden={panel !== "page"} className="studio-page-settings">
              <fieldset disabled={busy}>
                <legend>مشخصات برگه و SEO</legend>
                {pageSettings}
              </fieldset>
              <details>
                <summary>رنگ و فونت برگه</summary>
                <GlobalFields
                  compact
                  value={globals}
                  onChange={updateGlobals}
                />
              </details>
              <details>
                <summary>زمان‌بندی و وضعیت انتشار</summary>
                {publicationSettings}
              </details>
              <Link
                href={`/admin/content/${current.id}/revisions`}
                className="studio-sidebar-link"
              >
                نسخه‌های قبلی و بازیابی <ChevronLeft size={16} />
              </Link>
              <Link
                href={`/admin/content/${current.id}?mode=metadata`}
                className="studio-sidebar-link"
              >
                اطلاعات فهرست معرفی <ChevronLeft size={16} />
              </Link>
            </div>
            <div
              hidden={panel !== "library"}
              className="studio-template-library"
            >
              <p className="studio-panel-hint">
                از بخش‌های ذخیره‌شده استفاده کنید یا انتخاب فعلی را برای استفاده
                بعدی نگه دارید.
              </p>
              <AdvancedTools globals={globals} busy={busy} />
            </div>
          </div>
        </aside>
        <section className="studio-canvas" aria-label="بوم طراحی صفحه">
          <div className="studio-canvas-bar">
            <div
              className="studio-breadcrumbs"
              aria-label="مسیر عنصر انتخاب‌شده"
            >
              <button type="button" onClick={() => open("blocks")}>
                <LayoutGrid size={14} /> برگه
              </button>
              {ancestors.map((item) => (
                <button
                  type="button"
                  key={item.props.id}
                  onClick={() => {
                    const itemSelector = puck.getSelectorForId(item.props.id);
                    if (itemSelector)
                      puck.dispatch({ type: "setUi", ui: { itemSelector } });
                    open("fields");
                  }}
                >
                  <ChevronLeft size={12} />
                  {widgetLabels[item.type as WidgetType]}
                </button>
              ))}
              {selected && (
                <span>
                  <ChevronLeft size={12} />
                  {widgetLabels[selected.type as WidgetType]}
                </span>
              )}
            </div>
            <span className="studio-canvas-size">
              {width.toLocaleString("fa-IR")} px
            </span>
          </div>
          <CanvasViewport width={width} />
          <footer className="studio-canvas-footer">
            <span>
              <MousePointer2 size={13} />{" "}
              {selected
                ? "عنصر انتخاب‌شده را بکشید یا از پنل کناری ویرایش کنید."
                : "از کتابخانه یک عنصر بکشید؛ برای ویرایش روی آن کلیک کنید."}
            </span>
            <div className="studio-compact-history">
              <button
                type="button"
                aria-label="واگرد"
                title="واگرد"
                disabled={busy || !puck.history.hasPast}
                onClick={() => puck.history.back()}
              >
                <Undo2 size={16} />
              </button>
              <button
                type="button"
                aria-label="انجام دوباره"
                title="انجام دوباره"
                disabled={busy || !puck.history.hasFuture}
                onClick={() => puck.history.forward()}
              >
                <Redo2 size={16} />
              </button>
            </div>
            <span className="studio-shortcut">Ctrl / ⌘ + S</span>
          </footer>
        </section>
      </div>
    </div>
  );
}
