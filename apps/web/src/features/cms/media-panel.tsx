"use client";
import { CmsReady } from "./ready";
import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminRequest } from "@/features/admin/client";
import type { CmsPage, MediaAsset } from "./types";
export function MediaPanel({ initial }: { initial: CmsPage<MediaAsset> }) {
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
      setMessage("تصویر سالم در فضای خصوصی ذخیره شد.");
    });
  }
  return (
    <CmsReady disabled={busy}>
      <div className="space-y-6">
        <h1 className="text-3xl font-semibold">رسانه‌های سایت</h1>
        <p className="leading-8 text-muted-foreground">
          تصویر ابتدا خصوصی است؛ انتشار نسخه استفاده‌کننده آن را عمومی می‌کند.
          JPEG، PNG، WebP یا AVIF تا ۵ مگابایت پذیرفته می‌شود.
        </p>
        {message && (
          <p role="status" className="rounded-xl bg-secondary p-4 leading-8">
            {message}
          </p>
        )}
        <section className="space-y-4 rounded-2xl border border-border bg-card p-6">
          <h2 className="text-xl font-semibold">بارگذاری تصویر</h2>
          <Label htmlFor="media-file">فایل تصویر</Label>
          <Input
            id="media-file"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          <Label htmlFor="media-alt">متن جایگزین تصویر</Label>
          <Input
            id="media-alt"
            value={alt}
            maxLength={500}
            onChange={(e) => setAlt(e.target.value)}
          />
          <Button disabled={busy || !file || !alt.trim()} onClick={upload}>
            بارگذاری تصویر
          </Button>
        </section>
        <div className="grid gap-5 tablet:grid-cols-2 desktop:grid-cols-3">
          {data.items.map((item) => (
            <article
              key={item.id}
              className="min-w-0 space-y-4 rounded-2xl border border-border bg-card p-5"
            >
              <Image
                src={`/api/v1/admin/media/${item.id}/file`}
                alt={item.alt_text}
                width={item.width}
                height={item.height}
                unoptimized
                className="h-40 w-full rounded-xl object-contain"
              />
              <h2 className="break-words text-lg font-semibold">
                {item.alt_text}
              </h2>
              <p dir="ltr" className="break-all text-sm text-muted-foreground">
                {item.original_filename}
              </p>
              <p className="text-sm">
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
        <div className="flex flex-wrap gap-4">
          <Button
            variant="outline"
            disabled={busy || data.pagination.page <= 1}
            onClick={() => run(() => refresh(data.pagination.page - 1))}
          >
            صفحه قبل
          </Button>
          <Button
            variant="outline"
            disabled={busy || data.pagination.page >= data.pagination.pages}
            onClick={() => run(() => refresh(data.pagination.page + 1))}
          >
            صفحه بعد
          </Button>
        </div>
      </div>
    </CmsReady>
  );
}
