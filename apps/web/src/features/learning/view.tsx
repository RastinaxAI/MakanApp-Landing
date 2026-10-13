"use client";
import { useEffect } from "react";
export function QualifiedView({ id }: { id: string }) {
  useEffect(() => {
    let visibleMilliseconds = 0,
      last = Date.now(),
      ticket: string | undefined,
      sent = false;
    const abort = new AbortController();
    fetch(`/api/v1/learn/views/${id}/ticket`, {
      cache: "no-store",
      signal: abort.signal,
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        ticket = data?.ticket;
      })
      .catch(() => {});
    const interval = setInterval(() => {
      const now = Date.now();
      if (document.visibilityState === "visible")
        visibleMilliseconds += Math.min(now - last, 1500);
      last = now;
      if (visibleMilliseconds >= 20000 && ticket && !sent) {
        sent = true;
        void fetch(`/api/v1/learn/views/${id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ticket }),
          cache: "no-store",
          signal: abort.signal,
        }).catch(() => {});
      }
    }, 1000);
    return () => {
      abort.abort();
      clearInterval(interval);
    };
  }, [id]);
  return null;
}
