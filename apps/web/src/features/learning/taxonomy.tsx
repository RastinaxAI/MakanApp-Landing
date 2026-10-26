"use client";
import { useState } from "react";
import { Tags, FolderTree, Search, Pencil, Trash2 } from "lucide-react";
import {
  AdminPageHeader,
  AdminPanel,
  AdminEmpty,
  AdminNotice,
} from "@/features/admin/page-kit";
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
  const [search, setSearch] = useState("");
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
  const visible = items[type].filter(
    (item) => item.title.includes(search) || item.slug.includes(search),
  );
  return (
    <CmsReady disabled={busy}>
      <div className="admin-page">
        <AdminPageHeader
          title="دسته‌ها و برچسب‌های آموزش و وبلاگ"
          eyebrow="سازمان‌دهی محتوا"
          icon={Tags}
          description="به آموزش‌ها و مقاله‌ها ساختار بدهید تا مخاطب محتوای مرتبط را راحت‌تر پیدا کند."
        />
        {message && <AdminNotice>{message}</AdminNotice>}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <label className="grid gap-2 text-xs text-muted-foreground">
            نوع
            <select
              className="min-h-11 rounded-lg border border-border bg-white px-4 text-sm text-foreground"
              value={type}
              aria-label="نوع"
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
          <label className="relative min-w-0">
            <span className="sr-only">جست‌وجوی دسته یا برچسب</span>
            <Search
              className="pointer-events-none absolute start-3 top-3.5 size-4 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              className="min-h-11 max-w-full rounded-lg border border-border bg-white ps-10 pe-3 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جست‌وجو در عنوان و آدرس…"
            />
          </label>
        </div>
        <div className="admin-editor-layout admin-editor-first">
          <AdminPanel
            title={
              current
                ? "ویرایش مورد انتخاب‌شده"
                : type === "categories"
                  ? "افزودن دسته‌بندی"
                  : "افزودن برچسب"
            }
            description="عنوان خوانا و آدرس کوتاه انتخاب کنید."
          >
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                void save();
              }}
            >
              <label className="grid gap-2 text-sm">
                بخش
                <select
                  className="min-h-11 rounded-lg border border-input bg-white px-3"
                  value={domain}
                  aria-label="بخش"
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
              <label className="grid gap-2 text-sm">
                ترتیب
                <input
                  className="min-h-11 w-full rounded-lg border border-input bg-white px-3"
                  type="number"
                  min={0}
                  max={10000}
                  value={order}
                  onChange={(e) => setOrder(Number(e.target.value))}
                />
              </label>
              <Button className="w-full text-xs" type="submit">
                ذخیره دسته یا برچسب
              </Button>
              {current && (
                <Button
                  className="w-full"
                  type="button"
                  variant="ghost"
                  onClick={clear}
                >
                  انصراف از ویرایش
                </Button>
              )}
            </form>
          </AdminPanel>
          <AdminPanel
            title={
              type === "categories"
                ? "دسته‌بندی‌های ثبت‌شده"
                : "برچسب‌های ثبت‌شده"
            }
            count={visible.length}
          >
            {visible.length ? (
              <ul className="admin-record-list">
                {visible.map((item) => (
                  <li key={item.id} className="admin-record">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="admin-page-symbol">
                        {type === "categories" ? (
                          <FolderTree className="size-4" aria-hidden="true" />
                        ) : (
                          <Tags className="size-4" aria-hidden="true" />
                        )}
                      </span>
                      <div className="min-w-0">
                        <h2 className="break-words text-sm font-semibold">
                          {item.title}
                        </h2>
                        <p className="mt-2 break-all text-xs text-muted-foreground">
                          {item.domain === "learn" ? "آموزش" : "وبلاگ"} ·{" "}
                          <bdi>{item.slug}</bdi>
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        className="text-xs"
                        onClick={() => {
                          setCurrent(item);
                          setDomain(item.domain);
                          setSlug(item.slug);
                          setTitle(item.title);
                          setOrder(item.sort_order);
                        }}
                      >
                        <Pencil aria-hidden="true" />
                        ویرایش {item.title}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="text-xs text-destructive"
                        onClick={() => setDeleteId(item.id)}
                      >
                        <Trash2 aria-hidden="true" />
                        حذف {item.title}
                      </Button>
                    </div>
                    {deleteId === item.id && (
                      <div className="w-full space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                        <p className="text-xs leading-7 text-amber-900">
                          حذف مورد استفاده‌شده در نسخه‌ها ممکن نیست.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="destructive"
                            className="text-xs"
                            onClick={() => void remove(item.id)}
                          >
                            تأیید حذف {item.title}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setDeleteId(null)}
                          >
                            انصراف
                          </Button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <AdminEmpty
                title="موردی پیدا نشد"
                description="یک دسته یا برچسب تازه اضافه کنید یا عبارت جست‌وجو را تغییر دهید."
                icon={Tags}
              />
            )}
          </AdminPanel>
        </div>
      </div>
    </CmsReady>
  );
}
