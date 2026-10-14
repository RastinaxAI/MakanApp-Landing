"use client";
import { useEffect, useRef, useState } from "react";
import { usePuck } from "@puckeditor/core";
import { Button } from "@/components/ui/button";
import { adminRequest } from "@/features/admin/client";
import type { AdminContent, CmsPage } from "@/features/cms/types";
import {
  fromEditorData,
  toEditorData,
  type EditorData,
  type EditorConfig,
} from "./adapter";
import {
  walkNodes,
  type DocumentGlobals,
  type VisualDocument,
  type VisualNode,
} from "./types";

export function cloneNodes(nodes: VisualNode[]): VisualNode[] {
  return nodes.map((node) => ({
    ...structuredClone(node),
    id: `${node.type}_${crypto.randomUUID()}`,
    children: cloneNodes(node.children),
  }));
}
export function AdvancedTools({
  globals,
  busy,
}: {
  globals: DocumentGlobals;
  busy: boolean;
}) {
  const puck = usePuck<EditorConfig>();
  const clipboard = useRef<string>("");
  const [library, setLibrary] = useState<AdminContent[]>([]);
  const [template, setTemplate] = useState("");
  const [name, setName] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const current = () =>
    fromEditorData(puck.appState.data as EditorData, globals);
  const selected = (document = current()) =>
    walkNodes(document.nodes).find(
      (node) => node.id === puck.selectedItem?.props.id,
    );
  const load = async () => {
    const result = await adminRequest<CmsPage<AdminContent>>(
      "builder/library?page_size=100",
    );
    setLibrary(result.items);
  };
  useEffect(() => {
    let active = true;
    adminRequest<CmsPage<AdminContent>>("builder/library?page_size=100")
      .then((result) => {
        if (active) setLibrary(result.items);
      })
      .catch(() => {
        if (active) setNotice("کتابخانه بارگذاری نشد؛ دوباره تلاش کنید.");
      });
    return () => {
      active = false;
    };
  }, []);
  const insert = (nodes: VisualNode[], replace = false, sibling = false) => {
    const doc = current();
    const additions = cloneNodes(nodes);
    const parent = selected(doc);
    if (
      !replace &&
      !sibling &&
      parent &&
      ["Container", "Grid"].includes(parent.type)
    )
      parent.children.push(...additions);
    else if (!replace && parent) {
      const siblings =
        walkNodes(doc.nodes).find((node) =>
          node.children.some((child) => child.id === parent.id),
        )?.children || doc.nodes;
      const index = siblings.findIndex((node) => node.id === parent.id);
      siblings.splice(index + 1, 0, ...additions);
    } else doc.nodes = replace ? additions : [...doc.nodes, ...additions];
    puck.dispatch({
      type: "setData",
      data: toEditorData(doc),
      recordHistory: true,
    });
  };
  async function action(run: () => Promise<void>) {
    if (pending || busy) return;
    setPending(true);
    setNotice("");
    try {
      await run();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "ابزار اجرا نشد.");
    } finally {
      setPending(false);
    }
  }
  const disabled = busy || pending;
  return (
    <details
      className="rounded-lg border border-border bg-white p-3 text-xs"
      dir="rtl"
    >
      <summary className="cursor-pointer font-semibold">
        قالب، بخش آماده و کپی / جای‌گذاری
      </summary>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled || !puck.selectedItem}
          onClick={() =>
            void action(async () => {
              const node = selected();
              if (!node) return;
              clipboard.current = JSON.stringify({
                schema_version: 2,
                globals,
                nodes: [node],
              });
              await navigator.clipboard
                ?.writeText(clipboard.current)
                .catch(() => undefined);
              setNotice("عنصر کپی شد؛ جای‌گذاری شناسه‌های تازه می‌سازد.");
            })
          }
        >
          کپی عنصر
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={() =>
            void action(async () => {
              const value =
                clipboard.current ||
                (await navigator.clipboard?.readText().catch(() => ""));
              if (!value || value.length > 230000)
                throw new Error("دادهٔ کپی‌شده معتبر نیست.");
              const doc = await adminRequest<VisualDocument>(
                "builder/validate",
                "POST",
                JSON.parse(value),
              );
              insert(doc.nodes);
              setNotice("عنصر با اعتبارسنجی امن جای‌گذاری شد.");
            })
          }
        >
          جای‌گذاری عنصر
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled || !puck.selectedItem}
          onClick={() => {
            const node = selected();
            if (node) insert([node], false, true);
          }}
        >
          تکثیر عنصر
        </Button>
        <label className="grid gap-1">
          نام بخش قابل استفادهٔ مجدد
          <input
            className="min-h-10 rounded-md border border-input px-2"
            aria-label="نام بخش قابل استفاده مجدد"
            value={name}
            maxLength={180}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <Button
          type="button"
          size="sm"
          disabled={disabled || !name.trim() || !puck.selectedItem}
          onClick={() =>
            void action(async () => {
              const node = selected();
              if (!node) return;
              await adminRequest("content", "POST", {
                title: name.trim(),
                slug: `section-${crypto.randomUUID()}`,
                payload: {
                  kind: "page",
                  headline: name.trim(),
                  summary: "",
                  sections: [],
                  document: { ...current(), purpose: "section", nodes: [node] },
                },
                seo: { title: "", description: "", indexable: false },
                visibility: true,
                sort_order: 0,
              });
              await load();
              setNotice("بخش در همان CMS و تاریخچهٔ نسخه‌ها ذخیره شد.");
            })
          }
        >
          ذخیره بخش
        </Button>
        <label className="grid gap-1">
          کتابخانه
          <select
            aria-label="انتخاب قالب یا بخش"
            className="min-h-10 max-w-56 rounded-md border border-input px-2"
            value={template}
            onChange={(event) => setTemplate(event.target.value)}
          >
            <option value="">انتخاب کنید</option>
            {library.map((row) => (
              <option key={row.id} value={row.id}>
                {row.title} · نسخه {row.revision_no}
              </option>
            ))}
          </select>
        </label>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled || !template}
          onClick={() => {
            const row = library.find((item) => item.id === template);
            if (row?.payload.kind === "page" && row.payload.document)
              insert(row.payload.document.nodes);
          }}
        >
          افزودن به انتخاب / برگه
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled || !template}
          onClick={() => {
            const row = library.find((item) => item.id === template);
            if (row?.payload.kind === "page" && row.payload.document)
              insert(row.payload.document.nodes, true);
          }}
        >
          جایگزینی چیدمان با قالب
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={disabled}
          onClick={() => void action(load)}
        >
          تازه‌سازی کتابخانه
        </Button>
      </div>
      <p className="mt-3 text-muted-foreground">
        قالب و بخش به‌صورت نسخهٔ مستقل کپی می‌شوند؛ ویرایش آن‌ها برگه‌های قبلی
        را عوض نمی‌کند. برای بازگشت از جایگزینی، واگرد را بزنید.
      </p>
      {notice && (
        <p role="status" className="mt-2">
          {notice}
        </p>
      )}
    </details>
  );
}
