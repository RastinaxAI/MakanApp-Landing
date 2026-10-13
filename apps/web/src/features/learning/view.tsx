"use client";
import { useEffect } from "react";
import { useAnalyticsPreference } from "@/features/analytics/use-preference";
import { browserPreference } from "@/features/analytics/preference";
export type ViewPolicy = { enabled: boolean; policy_version: string };
export function QualifiedView({
  id,
  policy,
}: {
  id: string;
  policy: ViewPolicy;
}) {
  const allowed = useAnalyticsPreference(policy.policy_version);
  useEffect(() => {
    if (!policy.enabled || !allowed) return;
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
      if (browserPreference(policy.policy_version) !== true) {
        abort.abort();
        clearInterval(interval);
        return;
      }
      if (visibleMilliseconds >= 20000 && ticket && !sent) {
        sent = true;
        void fetch(`/api/v1/learn/views/${id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ticket,
            consent: true,
            policy_version: policy.policy_version,
          }),
          cache: "no-store",
          signal: abort.signal,
        }).catch(() => {});
      }
    }, 1000);
    return () => {
      abort.abort();
      clearInterval(interval);
    };
  }, [id, allowed, policy.enabled, policy.policy_version]);
  return null;
}
