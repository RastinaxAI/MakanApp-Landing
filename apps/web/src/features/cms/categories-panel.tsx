"use client";
import { CmsReady } from "./ready";
import { useState } from "react";
import { FolderTree, Pencil, Search } from "lucide-react";
import {
  AdminPageHeader,
  AdminPanel,
  AdminEmpty,
  AdminNotice,
} from "@/features/admin/page-kit";
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
  const [search, setSearch] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
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
      setConfirmDelete(false);
      setId(null);
      setTitle("");
      setSlug("");
      setOrder(0);
      setMessage("دسته‌بندی ذخیره شد.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "عملیات دسته انجام نشد.");
    } finally {
      setBusy(false);
    }
  }
  const visible = items.filter(
    (item) => item.title.includes(search) || item.slug.includes(search),
  );
  return (
    <CmsReady disabled={busy}>
      <div className="admin-page">
        <AdminPageHeader
          title="دسته‌های پرسش متداول"
          eyebrow="راهنمای مخاطبان"
          icon={FolderTree}
          description="سؤال‌های مرتبط را در دسته‌های روشن و مرتب قرار دهید."
        />
        {message && <AdminNotice>{message}</AdminNotice>}
        <div className="admin-editor-layout admin-editor-first">
          <AdminPanel
            title={id ? "ویرایش دسته" : "دسته جدید"}
            description="نام و ترتیب نمایش دسته را مشخص کنید."
          >
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                void action();
              }}
            >
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
              <Button
                className="w-full"
                type="submit"
                disabled={busy || !title.trim() || !slug.trim()}
              >
                ذخیره دسته
              </Button>
              {id && (
                <>
                  <Button
                    className="w-full text-destructive"
                    type="button"
                    variant="ghost"
                    onClick={() => setConfirmDelete(true)}
                  >
                    حذف دسته بدون استفاده
                  </Button>
                  <Button
                    className="w-full"
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setId(null);
                      setTitle("");
                      setSlug("");
                      setOrder(0);
                      setConfirmDelete(false);
                    }}
                  >
                    انصراف از ویرایش
                  </Button>
                </>
              )}
              {confirmDelete && (
                <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <p className="text-xs leading-7 text-amber-900">
                    حذف فقط برای دستهٔ بدون استفاده انجام می‌شود. این دسته حذف
                    شود؟
                  </p>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => void action(true)}
                  >
                    تأیید حذف دسته
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setConfirmDelete(false)}
                  >
                    انصراف
                  </Button>
                </div>
              )}
            </form>
          </AdminPanel>
          <AdminPanel title="فهرست دسته‌ها" count={items.length}>
            <label className="relative mb-5 block">
              <span className="sr-only">جست‌وجوی دسته‌های پرسش</span>
              <Search
                className="pointer-events-none absolute start-3 top-3.5 size-4 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                className="min-h-11 w-full rounded-lg border border-slate-200 bg-white ps-10 pe-3 text-sm"
                placeholder="نام دسته را جست‌وجو کنید…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            {visible.length ? (
              <ul className="admin-record-list">
                {visible.map((item) => (
                  <li key={item.id} className="admin-record">
                    <div className="min-w-0">
                      <h2 className="break-words text-sm font-semibold">
                        {item.title}
                      </h2>
                      <p className="mt-2 break-all text-xs text-muted-foreground">
                        <bdi>{item.slug}</bdi> · ترتیب{" "}
                        {item.sort_order.toLocaleString("fa-IR")}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setId(item.id);
                        setTitle(item.title);
                        setSlug(item.slug);
                        setOrder(item.sort_order);
                        setConfirmDelete(false);
                      }}
                    >
                      <Pencil aria-hidden="true" />
                      ویرایش {item.title}
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <AdminEmpty
                title="دسته‌ای پیدا نشد"
                description="یک دستهٔ تازه اضافه کنید یا جست‌وجو را تغییر دهید."
                icon={FolderTree}
              />
            )}
          </AdminPanel>
        </div>
      </div>
    </CmsReady>
  );
}
