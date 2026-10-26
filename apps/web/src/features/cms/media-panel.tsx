"use client";
import { CmsReady } from "./ready";
import { useRef, useState } from "react";
import { ImageIcon, Upload, Search, ShieldCheck, X } from "lucide-react";
import {
  AdminPageHeader,
  AdminPanel,
  AdminEmpty,
  AdminNotice,
} from "@/features/admin/page-kit";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminRequest } from "@/features/admin/client";
import type { CmsPage, MediaAsset } from "./types";
export function MediaPanel({ initial }: { initial: CmsPage<MediaAsset> }) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [visibility, setVisibility] = useState("");
  const uploadOpener = useRef<HTMLElement | null>(null);
  const [data, setData] = useState(initial);
  const [file, setFile] = useState<File | null>(null);
  const [alt, setAlt] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [confirm, setConfirm] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [editAlt, setEditAlt] = useState("");
  const [makePublic, setMakePublic] = useState(false);
  async function refresh(page = data.pagination.page) {
    setData(
      await adminRequest<CmsPage<MediaAsset>>(
        `media?page=${page}&page_size=20`,
      ),
    );
  }
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setMessage("");
    try {
      await action();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "عملیات رسانه انجام نشد.");
    } finally {
      setBusy(false);
    }
  }
  async function upload() {
    await run(async () => {
      if (!file || !alt.trim())
        throw new Error("تصویر و متن جایگزین را وارد کنید.");
      if (file.size > 5 * 1024 * 1024)
        throw new Error("حداکثر حجم تصویر ۵ مگابایت است.");
      const token = await adminRequest<{ csrf_token: string }>("auth/csrf");
      const body = new FormData();
      body.set("file", file);
      body.set("alt_text", alt);
      const response = await fetch("/api/v1/admin/media", {
        method: "POST",
        credentials: "same-origin",
        headers: { "X-CSRF-Token": token.csrf_token },
        body,
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || "بارگذاری انجام نشد.");
      }
      await refresh(1);
      setAlt("");
      setFile(null);
      setUploadOpen(false);
      setMessage("تصویر سالم در فضای خصوصی ذخیره شد.");
    });
  }
  const visible = data.items.filter(
    (item) =>
      (item.alt_text.includes(search) ||
        item.original_filename.toLowerCase().includes(search.toLowerCase())) &&
      (!visibility || item.visibility === visibility),
  );
  return (
    <CmsReady disabled={busy}>
      <div className="admin-page">
        <AdminPageHeader
          title="رسانه‌های سایت"
          eyebrow="کتابخانهٔ تصاویر"
          icon={ImageIcon}
          description="تصاویر برند و محتوا را در یک کتابخانه نگه دارید و مشخصاتشان را مدیریت کنید."
          actions={
            <Button
              onClick={(event) => {
                uploadOpener.current = event.currentTarget;
                setUploadOpen(true);
              }}
            >
              <Upload aria-hidden="true" />
              افزودن تصویر
            </Button>
          }
        />
        {message && <AdminNotice>{message}</AdminNotice>}
        <div className="admin-help flex items-start gap-3">
          <ShieldCheck className="mt-1 size-5 shrink-0" aria-hidden="true" />
          <span>
            تصویر تازه ابتدا خصوصی است. انتشار محتوای استفاده‌کننده، تصویر را
            عمومی می‌کند. فایل استفاده‌شده در نسخه‌ها قابل حذف نیست.
          </span>
        </div>
        <AdminPanel
          title="تصاویر کتابخانه"
          count={data.pagination.total}
        >
          <div className="mb-5 flex flex-wrap gap-3">
            <label className="relative min-w-0 flex-1 basis-40">
              <span className="sr-only">جست‌وجوی تصاویر این صفحه</span>
              <Search
                className="pointer-events-none absolute start-3 top-3.5 size-4 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                className="ps-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="نام فایل یا متن جایگزین…"
              />
            </label>
            <select
              aria-label="وضعیت دسترسی تصویر"
              className="min-h-11 max-w-full rounded-lg border border-input bg-white px-3 text-sm"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value)}
            >
              <option value="">همه تصاویر</option>
              <option value="private">خصوصی</option>
              <option value="public">عمومی</option>
            </select>
          </div>
          {data.pagination.pages > 1 && (
            <p className="mb-4 text-xs text-muted-foreground">
              جست‌وجو و وضعیت روی تصاویر همین صفحه اعمال می‌شوند.
            </p>
          )}
          <div className="grid gap-5 tablet:grid-cols-2 desktop:grid-cols-3">
            {visible.map((item) => (
              <article
                key={item.id}
                className="min-w-0 space-y-4 rounded-xl border border-border bg-white p-4"
              >
                <Image
                  src={`/api/v1/admin/media/${item.id}/file`}
                  alt={item.alt_text}
                  width={item.width}
                  height={item.height}
                  unoptimized
                  className="h-40 w-full rounded-lg border border-slate-100 bg-slate-50 object-contain"
                />
                <h2 className="break-words text-sm font-semibold leading-7">
                  {item.alt_text}
                </h2>
                <p
                  dir="ltr"
                  className="break-all text-sm text-muted-foreground"
                >
                  {item.original_filename}
                </p>
                <p className="text-xs text-muted-foreground">
                  {item.visibility === "public" ? "عمومی" : "خصوصی"} ·{" "}
                  {item.width}×{item.height} ·{" "}
                  {Math.ceil(item.size_bytes / 1024).toLocaleString("fa-IR")} KB
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() => {
                      setSelected(item.id);
                      setEditAlt(item.alt_text);
                      setMakePublic(false);
                    }}
                  >
                    ویرایش مشخصات
                  </Button>
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() => setConfirm(item.id)}
                  >
                    حذف رسانه
                  </Button>
                </div>
                {selected === item.id && (
                  <div className="space-y-3">
                    <Label htmlFor={`alt-${item.id}`}>متن جایگزین جدید</Label>
                    <Input
                      id={`alt-${item.id}`}
                      value={editAlt}
                      maxLength={500}
                      onChange={(e) => setEditAlt(e.target.value)}
                    />
                    {item.visibility === "private" && (
                      <label className="flex min-h-11 items-center gap-3">
                        <input
                          type="checkbox"
                          checked={makePublic}
                          onChange={(e) => setMakePublic(e.target.checked)}
                        />
                        عمومی‌کردن دائمی این تصویر
                      </label>
                    )}
                    <Button
                      disabled={busy || !editAlt.trim()}
                      onClick={() =>
                        run(async () => {
                          await adminRequest(`media/${item.id}`, "PATCH", {
                            alt_text: editAlt,
                            make_public: makePublic,
                          });
                          setSelected(null);
                          await refresh();
                          setMessage("مشخصات رسانه ذخیره شد.");
                        })
                      }
                    >
                      ذخیره مشخصات
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={busy}
                      onClick={() => setSelected(null)}
                    >
                      انصراف از ویرایش
                    </Button>
                  </div>
                )}
                {confirm === item.id && (
                  <div className="space-y-3 rounded-xl bg-warning-soft p-4">
                    <p className="leading-8 text-warning">
                      رسانه بدون استفاده از دیسک حذف می‌شود. فایل استفاده‌شده در
                      نسخه‌ها قابل حذف نیست.
                    </p>
                    <Button
                      disabled={busy}
                      onClick={() =>
                        run(async () => {
                          await adminRequest(`media/${item.id}`, "DELETE");
                          setConfirm(null);
                          await refresh();
                          setMessage("رسانه بدون استفاده حذف شد.");
                        })
                      }
                    >
                      تأیید حذف رسانه
                    </Button>
                    <Button variant="outline" onClick={() => setConfirm(null)}>
                      انصراف
                    </Button>
                  </div>
                )}
              </article>
            ))}
          </div>

          {!visible.length && (
            <AdminEmpty
              title={
                search || visibility
                  ? "تصویری مطابق فیلتر نیست"
                  : "کتابخانه منتظر اولین تصویر شماست"
              }
              description="تصاویر JPEG، PNG، WebP و AVIF تا ۵ مگابایت پذیرفته می‌شوند."
              icon={ImageIcon}
            >
              {search || visibility ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSearch("");
                    setVisibility("");
                  }}
                >
                  <X aria-hidden="true" />
                  پاک کردن فیلترها
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  onClick={(event) => {
                    uploadOpener.current = event.currentTarget;
                    setUploadOpen(true);
                  }}
                >
                  بارگذاری اولین تصویر
                </Button>
              )}
            </AdminEmpty>
          )}
        </AdminPanel>
        <nav
          className="flex flex-wrap items-center justify-between gap-3"
          aria-label="صفحه‌های رسانه"
        >
          <Button
            variant="outline"
            disabled={busy || data.pagination.page <= 1}
            onClick={() => void run(() => refresh(data.pagination.page - 1))}
          >
            صفحه قبل
          </Button>
          <span className="text-xs text-muted-foreground">
            صفحه {data.pagination.page.toLocaleString("fa-IR")} از{" "}
            {Math.max(1, data.pagination.pages).toLocaleString("fa-IR")}
          </span>
          <Button
            variant="outline"
            disabled={busy || data.pagination.page >= data.pagination.pages}
            onClick={() => void run(() => refresh(data.pagination.page + 1))}
          >
            صفحه بعد
          </Button>
        </nav>
        <Sheet
          open={uploadOpen}
          onOpenChange={(open) => {
            if (!busy) setUploadOpen(open);
          }}
        >
          <SheetContent
            dir="rtl"
            className="admin-drawer w-full sm:max-w-md"
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              uploadOpener.current?.focus();
            }}
          >
            <SheetHeader className="border-b border-border p-6 pe-16">
              <SheetTitle>بارگذاری تصویر</SheetTitle>
              <SheetDescription className="leading-7">
                یک تصویر انتخاب کنید و برای دسترس‌پذیری، متن جایگزین بنویسید.
              </SheetDescription>
            </SheetHeader>
            <form
              className="px-6 pb-6"
              onSubmit={(event) => {
                event.preventDefault();
                void upload();
              }}
            >
              <CmsReady disabled={busy}>
                <div className="space-y-5">
                  <div
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      if (!busy) setFile(event.dataTransfer.files[0] || null);
                    }}
                    className="grid gap-4 rounded-xl border border-dashed border-blue-200 bg-blue-50/50 p-5"
                  >
                    <Upload
                      className="size-8 text-primary"
                      aria-hidden="true"
                    />
                    <Label htmlFor="media-file">فایل تصویر</Label>
                    <Input
                      id="media-file"
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/avif"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                    />
                    <p className="text-xs leading-7 text-muted-foreground">
                      تصویر را اینجا بکشید یا از انتخاب فایل استفاده کنید.
                      حداکثر ۵ مگابایت.
                    </p>
                    {file && (
                      <p className="break-all text-xs text-primary-hover">
                        <bdi>{file.name}</bdi> ·{" "}
                        {Math.ceil(file.size / 1024).toLocaleString("fa-IR")} KB
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="media-alt">متن جایگزین تصویر</Label>
                    <Input
                      id="media-alt"
                      value={alt}
                      maxLength={500}
                      onChange={(e) => setAlt(e.target.value)}
                    />
                  </div>
                  <Button
                    className="w-full"
                    type="submit"
                    disabled={busy || !file || !alt.trim()}
                  >
                    بارگذاری تصویر
                  </Button>
                  {message && (
                    <p
                      role="alert"
                      className="rounded-lg bg-red-50 p-3 text-sm text-destructive"
                    >
                      {message}
                    </p>
                  )}
                </div>
              </CmsReady>
            </form>
          </SheetContent>
        </Sheet>
      </div>
    </CmsReady>
  );
}
