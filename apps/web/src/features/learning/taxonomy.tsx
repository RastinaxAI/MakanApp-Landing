"use client";
import { useState } from "react";
import { CmsReady } from "@/features/cms/ready";
import { TextField } from "@/features/cms/fields";
import { Button } from "@/components/ui/button";
import { adminRequest } from "@/features/admin/client";
import type { Taxonomy } from "./types";
export function TaxonomyPanel({
  categories,
  tags,
}: {
  categories: Taxonomy[];
  tags: Taxonomy[];
}) {
  const [items, setItems] = useState({ categories, tags });
  const [type, setType] = useState<"categories" | "tags">("categories");
  const [current, setCurrent] = useState<Taxonomy | null>(null);
  const [domain, setDomain] = useState<"learn" | "blog">("learn");
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [order, setOrder] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  function clear() {
    setCurrent(null);
    setSlug("");
    setTitle("");
    setOrder(0);
  }
  async function save() {
    if (!title.trim() || !slug.trim()) {
      setMessage("عنوان و آدرس را وارد کنید.");
      return;
    }
    setBusy(true);
    try {
      const row = await adminRequest<Taxonomy>(
        `learn/${type}${current ? `/${current.id}` : ""}`,
        current ? "PATCH" : "POST",
        { domain, slug, title, sort_order: order },
      );
      setItems((all) => ({
        ...all,
        [type]: current
          ? all[type].map((i) => (i.id === row.id ? row : i))
          : [...all[type], row],
      }));
      setMessage("ذخیره شد.");
      clear();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "ذخیره انجام نشد.");
    } finally {
      setBusy(false);
    }
  }
  async function remove(id: string) {
    setBusy(true);
    try {
      await adminRequest(`learn/${type}/${id}`, "DELETE");
      setItems((all) => ({
        ...all,
        [type]: all[type].filter((i) => i.id !== id),
      }));
      setDeleteId(null);
      setMessage("حذف شد.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "حذف انجام نشد.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <CmsReady disabled={busy}>
      <div className="space-y-6">
        <h1 className="text-3xl font-semibold">
          دسته‌ها و برچسب‌های آموزش و وبلاگ
        </h1>
        {message && (
          <p role="status" className="rounded-xl bg-secondary p-4">
            {message}
          </p>
        )}
        <label className="block">
          نوع
          <select
            className="ms-3 min-h-11 rounded-lg border border-input px-3"
            value={type}
            onChange={(e) => {
              setType(e.target.value as typeof type);
              clear();
              setDeleteId(null);
            }}
          >
            <option value="categories">دسته‌بندی</option>
            <option value="tags">برچسب</option>
          </select>
        </label>
        <section className="grid gap-5 rounded-xl border border-border bg-card p-5 tablet:grid-cols-2">
          <label className="block">
            بخش
            <select
              className="ms-3 min-h-11 rounded-lg border border-input px-3"
              value={domain}
              disabled={!!current}
              onChange={(e) => setDomain(e.target.value as typeof domain)}
            >
              <option value="learn">مرکز آموزش</option>
              <option value="blog">وبلاگ</option>
            </select>
          </label>
          <TextField
            label="عنوان دسته یا برچسب"
            value={title}
            onChange={setTitle}
            maxLength={180}
          />
          <TextField
            label="آدرس دسته یا برچسب"
            dir="ltr"
            value={slug}
            onChange={setSlug}
            maxLength={160}
            disabled={!!current}
          />
          <label>
            ترتیب
            <input
              className="ms-3 min-h-11 rounded-lg border border-input px-3"
              type="number"
              min={0}
              max={10000}
              value={order}
              onChange={(e) => setOrder(Number(e.target.value))}
            />
          </label>
          <div className="flex gap-3">
            <Button type="button" onClick={save}>
              ذخیره دسته یا برچسب
            </Button>
            {current && (
              <Button type="button" variant="outline" onClick={clear}>
                انصراف از ویرایش
              </Button>
            )}
          </div>
        </section>
        <ul className="space-y-4">
          {items[type].map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center gap-4 rounded-xl border border-border p-4"
            >
              <h2 className="text-lg font-semibold">
                {item.title} · {item.domain === "learn" ? "آموزش" : "وبلاگ"}
              </h2>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCurrent(item);
                  setDomain(item.domain);
                  setSlug(item.slug);
                  setTitle(item.title);
                  setOrder(item.sort_order);
                }}
              >
                ویرایش {item.title}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteId(item.id)}
              >
                حذف {item.title}
              </Button>
              {deleteId === item.id && (
                <>
                  <p>حذف مورد استفاده‌شده در نسخه‌ها ممکن نیست.</p>
                  <Button type="button" onClick={() => remove(item.id)}>
                    تأیید حذف {item.title}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDeleteId(null)}
                  >
                    انصراف
                  </Button>
                </>
              )}
            </li>
          ))}
        </ul>
      </div>
    </CmsReady>
  );
}
