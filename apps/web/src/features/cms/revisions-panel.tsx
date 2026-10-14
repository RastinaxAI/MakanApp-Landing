"use client";
import { CmsReady } from "./ready";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { adminRequest } from "@/features/admin/client";
import type { AdminContent, CmsPage } from "./types";
export type Revision = {
  id: string;
  revision_no: number;
  title: string;
  created_at: string;
  published_at: string | null;
};
export function RevisionsPanel({
  content,
  initial,
}: {
  content: AdminContent;
  initial: CmsPage<Revision>;
}) {
  const [current, setCurrent] = useState(content);
  const [data, setData] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [confirm, setConfirm] = useState<string | null>(null);
  async function publish(id: string) {
    setBusy(true);
    setMessage("");
    try {
      setCurrent(
        await adminRequest<AdminContent>(
          `content/${content.id}/publish`,
          "POST",
          { revision_id: id },
          current.row_version,
        ),
      );
      setConfirm(null);
      setMessage("این نسخه با حفظ سابقه، عمومی شد.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "انتشار انجام نشد.");
    } finally {
      setBusy(false);
    }
  }
  async function load(page: number) {
    setBusy(true);
    setMessage("");
    try {
      setData(
        await adminRequest<CmsPage<Revision>>(
          `content/${content.id}/revisions?page=${page}&page_size=20`,
        ),
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "تاریخچه دریافت نشد.");
    } finally {
      setBusy(false);
    }
  }
  async function restore(id: string) {
    setBusy(true); setMessage("");
    try {
      const result = await adminRequest<AdminContent>(`content/${content.id}/revisions/${id}/restore`, "POST", undefined, current.row_version);
      setCurrent(result); setMessage("نسخهٔ قبلی به پیش‌نویس تازه بازیابی شد؛ نسخهٔ عمومی حفظ شد.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "بازیابی انجام نشد."); }
    finally { setBusy(false); }
  }
  return (
    <CmsReady disabled={busy}>
      <div className="space-y-6">
        <h1 className="text-3xl font-semibold">تاریخچه نسخه‌های محتوا</h1>
        <Link
          href={`/admin/content/${content.id}`}
          className="inline-flex min-h-11 items-center text-primary-hover"
        >
          بازگشت به ویرایش
        </Link>
        {message && (
          <p role="status" className="rounded-xl bg-secondary p-4">
            {message}
          </p>
        )}
        <ul className="space-y-4">
          {data.items.map((item) => (
            <li
              key={item.id}
              className="space-y-4 rounded-xl border border-border bg-card p-5"
            >
              <h2 className="text-xl font-semibold">
                نسخه {item.revision_no.toLocaleString("fa-IR")} · {item.title}
              </h2>
              <p>
                {new Date(item.created_at).toLocaleString("fa-IR")}{" "}
                {item.id === current.published_revision_id
                  ? "· نسخه عمومی فعلی"
                  : ""}
              </p>
              <div className="flex flex-wrap gap-3">
                <a
                  href={`/admin/preview/${content.id}?revision=${item.id}`}
                  className="inline-flex min-h-11 items-center rounded-lg border border-input px-4 text-primary-hover"
                >
                  پیش‌نمایش این نسخه
                </a>
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => setConfirm(item.id)}
                >
                  انتشار این نسخه
                </Button>
                <Button variant="outline" disabled={busy} onClick={() => void restore(item.id)}>بازیابی برای ویرایش</Button>
              </div>
              {confirm === item.id && (
                <div className="space-y-3 rounded-xl bg-warning-soft p-4">
                  <p className="text-warning">
                    نسخه عمومی و زمان‌بندی فعلی جایگزین می‌شود؛ پیش‌نویس شما حفظ
                    می‌شود.
                  </p>
                  <Button disabled={busy} onClick={() => publish(item.id)}>
                    تأیید انتشار نسخه
                  </Button>
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() => setConfirm(null)}
                  >
                    انصراف
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            disabled={busy || data.pagination.page <= 1}
            onClick={() => load(data.pagination.page - 1)}
          >
            صفحه قبل
          </Button>
          <Button
            variant="outline"
            disabled={busy || data.pagination.page >= data.pagination.pages}
            onClick={() => load(data.pagination.page + 1)}
          >
            صفحه بعد
          </Button>
        </div>
      </div>
    </CmsReady>
  );
}
