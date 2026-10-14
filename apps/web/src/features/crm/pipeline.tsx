"use client";
import { useState, useRef, type PointerEvent } from "react";
import Link from "next/link";
import { GripVertical, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { adminRequest } from "@/features/admin/client";
import { stages, type Opportunity } from "./types";

const payload = (row: Opportunity, stage: keyof typeof stages) => ({
  lead_id: row.lead_id,
  school_id: row.school_id,
  title: row.title,
  stage,
  assigned_to: row.assigned_to,
  estimated_value: row.estimated_value,
  expected_close_date: row.expected_close_date,
  lost_reason: row.lost_reason,
  notes: row.notes,
});
export function Pipeline({
  items,
  onEdit,
  onSaved,
}: {
  items: Opportunity[];
  onEdit: (row: Opportunity) => void;
  onSaved: () => void;
}) {
  const [error, setError] = useState("");
  const [moving, setMoving] = useState<string | null>(null);
  const board = useRef<HTMLDivElement>(null);
  const pointer = useRef<{
    row: Opportunity;
    x: number;
    y: number;
    active: boolean;
    stage: keyof typeof stages | null;
  } | null>(null);
  const [dragging, setDragging] = useState<{
    id: string;
    x: number;
    y: number;
    stage: keyof typeof stages | null;
  } | null>(null);
  function drag(event: PointerEvent<HTMLButtonElement>) {
    const state = pointer.current;
    if (!state) return;
    if (
      !state.active &&
      Math.hypot(event.clientX - state.x, event.clientY - state.y) < 6
    )
      return;
    state.active = true;
    const bounds = board.current?.getBoundingClientRect();
    if (bounds && event.clientX < bounds.left + 50)
      board.current?.scrollBy({ left: -18 });
    if (bounds && event.clientX > bounds.right - 50)
      board.current?.scrollBy({ left: 18 });
    const target = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>("[data-stage]")?.dataset.stage;
    state.stage =
      target && target in stages ? (target as keyof typeof stages) : null;
    setDragging({
      id: state.row.id,
      x: event.clientX,
      y: event.clientY,
      stage: state.stage,
    });
  }
  function drop(event: PointerEvent<HTMLButtonElement>) {
    const state = pointer.current;
    pointer.current = null;
    setDragging(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    if (state?.active && state.stage) void move(state.row, state.stage);
  }
  async function move(row: Opportunity, stage: keyof typeof stages) {
    if (row.stage === stage) return;
    if (stage === "lost" && !row.lost_reason.trim()) {
      onEdit({ ...row, stage });
      return;
    }
    setMoving(row.id);
    setError("");
    try {
      await adminRequest(
        `crm/opportunities/${row.id}`,
        "PATCH",
        payload(row, stage),
        row.version,
      );
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "جابه‌جایی انجام نشد.");
    } finally {
      setMoving(null);
    }
  }
  return (
    <>
      <p className="mb-4 text-sm leading-7 text-muted-foreground">
        فرصت را به ستون موردنظر بکشید یا از انتخاب مرحله استفاده کنید. ارزش‌ها
        تخمینی و به تومان هستند.
      </p>
      {error && (
        <p role="alert" className="mb-4 text-destructive">
          {error}
        </p>
      )}
      <div
        ref={board}
        className="crm-board"
        role="region"
        aria-label="مراحل فروش"
        tabIndex={0}
      >
        {Object.entries(stages).map(([stage, title]) => {
          const rows = items.filter((row) => row.stage === stage);
          return (
            <section
              key={stage}
              className={`crm-lane ${dragging?.stage === stage ? "border-primary bg-secondary" : ""}`}
              aria-label={title}
              data-stage={stage}
            >
              <h2 className="mb-4 flex items-center justify-between text-sm font-semibold">
                {title}
                <span className="crm-chip">
                  {rows.length.toLocaleString("fa-IR")}
                </span>
              </h2>
              {rows.map((row) => (
                <article
                  key={row.id}
                  className={`crm-opportunity ${dragging?.id === row.id ? "opacity-60" : ""}`}
                  data-opportunity={row.id}
                >
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      prefetch={false}
                      href={`/admin/crm/leads/${row.lead_id}`}
                      className="min-h-11 font-semibold leading-7"
                    >
                      {row.title}
                    </Link>
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={!!moving}
                      aria-label={`جابه‌جایی ${row.title}`}
                      className="shrink-0 cursor-grab touch-none select-none"
                      onPointerDown={(event) => {
                        if (moving || event.button !== 0) return;
                        pointer.current = {
                          row,
                          x: event.clientX,
                          y: event.clientY,
                          active: false,
                          stage: null,
                        };
                        event.currentTarget.setPointerCapture(event.pointerId);
                      }}
                      onPointerMove={drag}
                      onPointerUp={drop}
                      onPointerCancel={() => {
                        pointer.current = null;
                        setDragging(null);
                      }}
                      onClick={() =>
                        document.getElementById(`move-${row.id}`)?.focus()
                      }
                    >
                      <GripVertical size={18} aria-hidden="true" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {Number(row.estimated_value).toLocaleString("fa-IR")} تومان
                  </p>
                  {row.expected_close_date && (
                    <p className="text-xs">
                      نتیجهٔ مورد انتظار:{" "}
                      {new Intl.DateTimeFormat("fa-IR").format(
                        new Date(row.expected_close_date + "T12:00:00"),
                      )}
                    </p>
                  )}
                  <label htmlFor={`move-${row.id}`} className="sr-only">
                    مرحلهٔ {row.title}
                  </label>
                  <select
                    id={`move-${row.id}`}
                    className="crm-control"
                    value={row.stage}
                    disabled={!!moving}
                    onChange={(e) =>
                      void move(row, e.target.value as keyof typeof stages)
                    }
                  >
                    {Object.entries(stages).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={!!moving}
                    onClick={() => onEdit(row)}
                  >
                    <Pencil aria-hidden="true" />
                    جزئیات فرصت
                  </Button>
                </article>
              ))}
              {!rows.length && (
                <p className="p-3 text-xs leading-7 text-muted-foreground">
                  فرصتی در این مرحله نیست.
                </p>
              )}
            </section>
          );
        })}
      </div>
      {dragging && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-dialog rounded-xl border border-primary bg-card px-5 py-3 shadow-overlay"
          style={{ left: dragging.x + 12, top: dragging.y + 12 }}
        >
          {dragging.stage ? stages[dragging.stage] : "جابه‌جایی فرصت"}
        </div>
      )}
    </>
  );
}
