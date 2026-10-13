"use client";
import { CmsReady } from "./ready";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "./fields";
import { adminRequest } from "@/features/admin/client";
import type { CmsPage, FaqCategory } from "./types";
export function CategoriesPanel({ initial }: { initial: FaqCategory[] }) {
  const [items, setItems] = useState(initial);
  const [id, setId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [order, setOrder] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function action(remove = false) {
    setBusy(true);
    setMessage("");
    try {
      await adminRequest(
        `faq-categories${id ? `/${id}` : ""}`,
        remove ? "DELETE" : id ? "PATCH" : "POST",
        remove ? undefined : { title, slug, sort_order: order },
      );
      const categories: FaqCategory[] = [];
      for (let page = 1; ; page++) {
        const data = await adminRequest<CmsPage<FaqCategory>>(
          `faq-categories?page=${page}&page_size=100`,
        );
        categories.push(...data.items);
        if (page >= data.pagination.pages) break;
      }
      setItems(categories);
      setId(null);
      setTitle("");
      setSlug("");
      setMessage("دسته‌بندی ذخیره شد.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "عملیات دسته انجام نشد.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <CmsReady disabled={busy}>
      <div className="space-y-6">
        <h1 className="text-3xl font-semibold">دسته‌های پرسش متداول</h1>
        {message && (
          <p role="status" className="rounded-xl bg-secondary p-4">
            {message}
          </p>
        )}
        <section className="space-y-4 rounded-2xl border border-border bg-card p-6">
          <h2 className="text-xl font-semibold">
            {id ? "ویرایش دسته" : "دسته جدید"}
          </h2>
          <TextField
            label="نام دسته"
            value={title}
            onChange={setTitle}
            maxLength={180}
          />
          <TextField
            label="آدرس دسته"
            value={slug}
            onChange={setSlug}
            dir="ltr"
            maxLength={160}
          />
          <TextField
            label="ترتیب دسته"
            value={String(order)}
            onChange={(v) => setOrder(Number(v) || 0)}
            dir="ltr"
            maxLength={5}
          />
          <div className="flex flex-wrap gap-3">
            <Button
              disabled={busy || !title.trim() || !slug.trim()}
              onClick={() => action()}
            >
              ذخیره دسته
            </Button>
            {id && (
              <Button
                disabled={busy}
                variant="outline"
                onClick={() => action(true)}
              >
                حذف دسته بدون استفاده
              </Button>
            )}
          </div>
        </section>
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-5"
            >
              <span>{item.title}</span>
              <Button
                variant="outline"
                onClick={() => {
                  setId(item.id);
                  setTitle(item.title);
                  setSlug(item.slug);
                  setOrder(item.sort_order);
                }}
              >
                ویرایش {item.title}
              </Button>
            </li>
          ))}
        </ul>
      </div>
    </CmsReady>
  );
}
