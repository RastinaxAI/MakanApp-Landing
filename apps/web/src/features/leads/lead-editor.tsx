"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CmsReady } from "@/features/cms/ready";
import { adminRequest } from "@/features/admin/client";
import { statuses, outcomes, type LeadDetail, type Assignee } from "./types";

export function LeadEditor({
  initial,
  assignees,
}: {
  initial: LeadDetail;
  assignees: Assignee[];
}) {
  const [lead, setLead] = useState(initial);
  const [status, setStatus] = useState(initial.status);
  const [outcome, setOutcome] = useState(initial.outcome ?? "");
  const [assigned, setAssigned] = useState(initial.assigned_to ?? "");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  async function save(notes = false) {
    setBusy(true);
    setMessage("");
    setError("");
    try {
      if (notes) {
        await adminRequest(
          `leads/${lead.id}/notes`,
          "POST",
          { body: note },
          lead.version,
        );
        setNote("");
        setLead({ ...lead, version: lead.version + 1 });
      } else {
        const result = await adminRequest<LeadDetail>(
          `leads/${lead.id}`,
          "PATCH",
          {
            status,
            outcome: status === "closed" ? outcome || null : null,
            assigned_to: assigned || null,
          },
          lead.version,
        );
        setLead(result);
      }
      setMessage(notes ? "یادداشت ثبت شد." : "پیگیری ذخیره شد.");
      router.refresh();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "ذخیره انجام نشد.");
    } finally {
      setBusy(false);
    }
  }
  if (initial.purged_at)
    return (
      <p role="note" className="rounded-xl bg-secondary p-5 leading-8">
        اطلاعات شخصی این درخواست طبق سیاست نگهداری حذف شده است. پیگیری جدید برای
        این رکورد ثبت نمی‌شود.
      </p>
    );
  return (
    <section className="mt-6 rounded-2xl border border-border bg-card p-5 tablet:p-7">
      <h2 className="mb-5 text-xl font-semibold">مدیریت پیگیری</h2>
      {message && (
        <p role="status" className="mb-4 text-primary-hover">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="mb-4 text-destructive">
          {error}{" "}
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="min-h-11 underline"
          >
            تازه‌سازی صفحه
          </button>
        </p>
      )}
      <CmsReady disabled={busy}>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
          className="grid gap-5 tablet:grid-cols-2"
        >
          <div className="grid gap-2">
            <label htmlFor="lead-status">وضعیت</label>
            <select
              id="lead-status"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="min-h-12 min-w-0 w-full max-w-full rounded-lg border border-input bg-card px-3"
            >
              {Object.entries(statuses).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <label htmlFor="lead-assignee">مسئول پیگیری</label>
            <select
              id="lead-assignee"
              value={assigned}
              onChange={(event) => setAssigned(event.target.value)}
              className="min-h-12 min-w-0 w-full max-w-full rounded-lg border border-input bg-card px-3"
            >
              <option value="">بدون مسئول</option>
              {assignees.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.phone || item.email}
                </option>
              ))}
            </select>
          </div>
          {status === "closed" && (
            <div className="grid gap-2">
              <label htmlFor="lead-outcome">نتیجه نهایی</label>
              <select
                id="lead-outcome"
                required
                value={outcome}
                onChange={(event) => setOutcome(event.target.value)}
                className="min-h-12 min-w-0 w-full max-w-full rounded-lg border border-input bg-card px-3"
              >
                <option value="">انتخاب نتیجه</option>
                {Object.entries(outcomes)
                  .filter(
                    ([value]) => initial.kind === "demo" || value !== "won",
                  )
                  .map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
              </select>
            </div>
          )}
          <Button type="submit" className="min-h-12 tablet:col-span-2">
            {busy ? "در حال ذخیره…" : "ذخیره پیگیری"}
          </Button>
        </form>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void save(true);
          }}
          className="mt-7 space-y-4"
        >
          <label htmlFor="lead-note" className="block">
            یادداشت داخلی
          </label>
          <Textarea
            id="lead-note"
            required
            minLength={2}
            maxLength={3000}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="min-h-32"
          />
          <Button type="submit" variant="outline" className="min-h-12">
            ثبت یادداشت
          </Button>
        </form>
      </CmsReady>
    </section>
  );
}
