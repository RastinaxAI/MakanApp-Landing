"use client";
import { useState, useContext } from "react";
import Image from "next/image";
import { Dialog } from "radix-ui";
import { ImagePlus, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminRequest } from "@/features/admin/client";
import type { MediaAsset } from "./types";
import { MediaUpdates } from "./media-context";

export function MediaChooser({
  label,
  selected,
  assets,
  onChoose,
  disabled,
}: {
  label: string;
  selected?: string | null;
  assets: MediaAsset[];
  onChoose: (asset: MediaAsset) => void;
  disabled?: boolean;
}) {
  const updateMedia = useContext(MediaUpdates);
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState(assets);
  const [total, setTotal] = useState(assets.length);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [alt, setAlt] = useState("");
  const [file, setFile] = useState<File | null>(null);
  async function load(number: number) {
    setBusy(true);
    setError("");
    try {
      const result = await adminRequest<{ items: MediaAsset[]; total: number }>(
        `media?page=${number}&page_size=24`,
      );
      setRows(result.items);
      setTotal(result.total);
      setPage(number);
      setSearch("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "بارگذاری کتابخانه انجام نشد.");
    } finally {
      setBusy(false);
    }
  }
  function choose(asset: MediaAsset) {
    updateMedia(asset);
    onChoose(asset);
    setOpen(false);
  }
  async function upload() {
    if (!file || !alt.trim()) {
      setError("تصویر و متن جایگزین را وارد کنید.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("حداکثر حجم تصویر ۵ مگابایت است.");
      return;
    }
    setBusy(true);
    setError("");
    try {
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
      choose(await response.json());
      setAlt("");
      setFile(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "بارگذاری انجام نشد.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) void load(1);
      }}
    >
      <Dialog.Trigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className="h-auto min-h-11 min-w-0 w-full whitespace-normal px-2 text-xs"
        >
          <ImagePlus size={17} className="shrink-0" />
          انتخاب یا بارگذاری تصویر
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/50" />
        <Dialog.Content
          dir="rtl"
          className="fixed inset-x-3 top-1/2 z-50 mx-auto flex max-h-[90dvh] max-w-4xl -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-2xl"
        >
          <div className="flex items-start justify-between border-b border-border p-5">
            <div>
              <Dialog.Title className="text-lg font-bold">
                کتابخانه رسانه · {label}
              </Dialog.Title>
              <Dialog.Description className="mt-2 text-sm text-muted-foreground">
                تصویر را انتخاب کنید یا فایل جدید بارگذاری کنید. تصاویر خصوصی
                فقط در پنل و پیش‌نمایش مدیر نمایش داده می‌شوند.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button
                type="button"
                variant="outline"
                aria-label="بستن کتابخانه رسانه"
              >
                <X size={18} />
              </Button>
            </Dialog.Close>
          </div>
          <div className="grid gap-6 overflow-y-auto p-5 tablet:grid-cols-[1fr_240px]">
            <section className="min-w-0 space-y-4" aria-label="تصاویر کتابخانه">
              <Input
                aria-label="جست‌وجو در تصاویر این صفحه"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="جست‌وجو در این صفحه…"
              />
              {busy && (
                <p role="status" className="text-sm">
                  در حال بارگذاری…
                </p>
              )}
              <div className="grid grid-cols-2 gap-3 tablet:grid-cols-3">
                {rows
                  .filter((asset) =>
                    `${asset.alt_text} ${asset.original_filename}`
                      .toLocaleLowerCase()
                      .includes(search.toLocaleLowerCase()),
                  )
                  .map((asset) => (
                    <button
                      type="button"
                      key={asset.id}
                      disabled={busy}
                      onClick={() => choose(asset)}
                      aria-label={`انتخاب تصویر ${asset.alt_text}`}
                      aria-pressed={asset.id === selected}
                      className="overflow-hidden rounded-xl border-2 border-border bg-background text-start aria-pressed:border-primary"
                    >
                      <Image
                        src={`/api/v1/admin/media/${asset.id}/file`}
                        alt=""
                        width={160}
                        height={110}
                        unoptimized
                        className="aspect-[4/3] w-full object-contain"
                      />
                      <span className="block truncate border-t border-border px-2 py-3 text-xs">
                        {asset.alt_text || asset.original_filename}
                      </span>
                    </button>
                  ))}
              </div>
              {!busy && !rows.length && (
                <p className="text-sm text-muted-foreground">
                  هنوز تصویری در کتابخانه نیست؛ اولین تصویر را بارگذاری کنید.
                </p>
              )}
              <div className="flex items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy || page === 1}
                  onClick={() => void load(page - 1)}
                >
                  قبلی
                </Button>
                <span className="text-xs">
                  صفحه {page.toLocaleString("fa-IR")} از{" "}
                  {Math.max(1, Math.ceil(total / 24)).toLocaleString("fa-IR")}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy || page * 24 >= total}
                  onClick={() => void load(page + 1)}
                >
                  بعدی
                </Button>
              </div>
            </section>
            <section
              className="space-y-4 rounded-xl bg-background p-4"
              aria-label="بارگذاری تصویر جدید"
            >
              <h3 className="flex items-center gap-2 font-semibold">
                <Upload size={17} />
                تصویر جدید
              </h3>
              <label className="grid gap-2 text-sm">
                فایل تصویر
                <input
                  aria-label="فایل تصویر در کتابخانه"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(event) => setFile(event.target.files?.[0] || null)}
                  className="w-full text-xs"
                />
              </label>
              <label className="grid gap-2 text-sm">
                متن جایگزین
                <Input
                  aria-label="متن جایگزین در کتابخانه"
                  value={alt}
                  maxLength={180}
                  onChange={(event) => setAlt(event.target.value)}
                />
              </label>
              <p className="text-xs leading-6 text-muted-foreground">
                PNG، JPEG یا WebP · حداکثر ۵ مگابایت. متن جایگزین، محتوای تصویر
                را توصیف کند.
              </p>
              <Button
                type="button"
                className="w-full"
                disabled={busy}
                onClick={() => void upload()}
              >
                بارگذاری و انتخاب
              </Button>
            </section>
          </div>
          {error && (
            <p
              role="alert"
              className="border-t border-border p-4 text-sm text-destructive"
            >
              {error}
            </p>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
