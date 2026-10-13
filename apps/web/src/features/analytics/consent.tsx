"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { BusinessEvent, ErrorKind } from "./events";
import { pageTemplate } from "./events";
import { preferenceEvent } from "./use-preference";
import {
  preferenceCookie,
  preferenceValue,
  browserPreference,
} from "./preference";

type Config = {
  enabled: boolean;
  policy_version: string;
  retention_days: number;
};
const sessionKey = "makan.analytics.session";
function blocked() {
  return (
    navigator.doNotTrack === "1" ||
    (navigator as Navigator & { globalPrivacyControl?: boolean })
      .globalPrivacyControl === true
  );
}

export function AnalyticsConsent({
  config,
  initialChoice,
  initialBlocked,
}: {
  config: Config;
  initialChoice: boolean | null;
  initialBlocked: boolean;
}) {
  const pathname = usePathname();
  const documentPath = useRef(pageTemplate(pathname));
  const vitalsStarted = useRef(false);
  const metricEvents = useRef(
    new Map<string, { id: string; revision: number }>(),
  );
  const vitalReporter = useRef<
    ((name: "LCP" | "INP" | "CLS", value: number, id: string) => void) | null
  >(null);
  const [choice, setChoice] = useState<boolean | null>(initialChoice);
  const [open, setOpen] = useState(initialChoice === null);
  const [privacyBlocked, setPrivacyBlocked] = useState(initialBlocked);
  useEffect(() => {
    if (!config.enabled) return;
    const protectedByBrowser = initialBlocked || blocked();
    const selected = protectedByBrowser
      ? false
      : browserPreference(config.policy_version);
    // Storage is an external browser source; synchronizing it after hydration is intentional.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChoice(selected);
    setOpen(selected === null);
    setPrivacyBlocked(protectedByBrowser);
  }, [config.enabled, config.policy_version, initialBlocked, initialChoice]);
  useEffect(() => {
    const path = pageTemplate(pathname);
    if (!config.enabled || choice !== true || blocked() || !path) return;
    let active = true;
    const channel = () => {
      try {
        if (
          !document.referrer ||
          new URL(document.referrer).origin === location.origin
        )
          return "direct";
        return /(?:^|\.)(?:google\.[a-z.]+|bing\.com|duckduckgo\.com|search\.yahoo\.com|yandex\.[a-z]+)$/.test(
          new URL(document.referrer).hostname,
        )
          ? "organic"
          : "referral";
      } catch {
        return "direct";
      }
    };
    async function send(
      name: BusinessEvent | "session_start" | "page_view" | "web_vital",
      extra: {
        error_kind?: ErrorKind;
        metric_name?: "LCP" | "INP" | "CLS";
        metric_value?: number;
        report_id?: string;
      } = {},
    ) {
      if (
        !active ||
        privacyBlocked ||
        blocked() ||
        choice !== true ||
        browserPreference(config.policy_version) !== true
      )
        return;
      try {
        // A random tab nonce expires on UTC day change or thirty minutes of inactivity.
        const now = Date.now();
        const day = new Date(now).toISOString().slice(0, 10);
        let session = JSON.parse(sessionStorage.getItem(sessionKey) || "null");
        const fresh =
          !session || session.day !== day || now - session.touched > 1800000;
        if (fresh)
          session = { id: crypto.randomUUID(), day, channel: channel() };
        session.touched = now;
        sessionStorage.setItem(sessionKey, JSON.stringify(session));
        const post = (eventName: string, details = {}) =>
          fetch("/api/v1/analytics/events", {
            method: "POST",
            credentials: "omit",
            keepalive: true,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: crypto.randomUUID(),
              session_id: session.id,
              consent: true,
              policy_version: config.policy_version,
              name: eventName,
              path: eventName === "web_vital" ? documentPath.current : path,
              channel: session.channel,
              ...details,
            }),
            signal: AbortSignal.timeout(3000),
          }).catch(() => undefined);
        if (fresh) await post("session_start");
        if (active) {
          const { report_id, ...details } = extra;
          if (name === "web_vital" && report_id) {
            const key = `${session.id}:${report_id}`;
            const item = metricEvents.current.get(key) || {
              id: crypto.randomUUID(),
              revision: 0,
            };
            item.revision += 1;
            metricEvents.current.set(key, item);
            await post(name, {
              ...details,
              id: item.id,
              metric_revision: item.revision,
            });
          } else await post(name, details);
        }
      } catch {
        /* Tracking failures never block navigation or a form submission. */
      }
    }
    void send("page_view");
    const custom = (event: Event) => {
      const d = (
        event as CustomEvent<{ name: BusinessEvent; error_kind?: ErrorKind }>
      ).detail;
      const allowed: BusinessEvent[] = [
        "hero_demo_click",
        "navigation_cta_click",
        "feature_tab_view",
        "demo_form_start",
        "demo_form_submit_success",
        "demo_form_submit_error",
        "contact_click",
        "faq_expand",
      ];
      if (allowed.includes(d?.name))
        void send(d.name, { error_kind: d.error_kind });
    };
    const clicks = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const link = target?.closest("a");
      const href = link?.getAttribute("href") || "";
      if (/^\/demo(?:\?|$)/.test(href)) {
        if (link?.closest("[data-section=hero]")) void send("hero_demo_click");
        else if (link?.closest("header")) void send("navigation_cta_click");
      }
      if (/^(?:tel:|mailto:|\/contact(?:\?|$))/.test(href))
        void send("contact_click");
    };
    const started = new Set<string>();
    const focus = (event: FocusEvent) => {
      if (
        event.target instanceof Element &&
        event.target.closest("[data-request-kind=demo]") &&
        !started.has("demo")
      ) {
        started.add("demo");
        void send("demo_form_start");
      }
    };
    window.addEventListener("makan:analytics", custom);
    document.addEventListener("click", clicks);
    document.addEventListener("focusin", focus);
    vitalReporter.current = (name, value, id) => {
      void send("web_vital", {
        metric_name: name,
        metric_value: value,
        report_id: id,
      });
    };
    if (!vitalsStarted.current)
      void import("web-vitals").then(({ onLCP, onINP, onCLS }) => {
        const report = ({
          id,
          name,
          value,
        }: {
          id: string;
          name: "LCP" | "INP" | "CLS";
          value: number;
        }) => {
          if (Number.isFinite(value)) vitalReporter.current?.(name, value, id);
        };
        if (active) {
          vitalsStarted.current = true;
          onLCP(report);
          onINP(report);
          onCLS(report);
        }
      });
    return () => {
      active = false;
      vitalReporter.current = null;
      window.removeEventListener("makan:analytics", custom);
      document.removeEventListener("click", clicks);
      document.removeEventListener("focusin", focus);
    };
  }, [choice, config.enabled, config.policy_version, pathname, privacyBlocked]);
  if (!config.enabled) return null;
  function choose(allow: boolean) {
    const selected = allow && !blocked();
    try {
      document.cookie = `${preferenceCookie}=${preferenceValue(config.policy_version, selected)}; Path=/; Max-Age=${30 * 86400}; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
      if (!selected) sessionStorage.removeItem(sessionKey);
    } catch {
      /* Privacy default is off. */
    }
    setChoice(selected);
    setOpen(false);
    window.dispatchEvent(new Event(preferenceEvent));
  }
  return (
    <aside
      aria-label="انتخاب اندازه‌گیری اختیاری"
      className="fixed bottom-3 inset-x-3 z-50 ms-auto max-w-lg rounded-xl border border-border bg-card p-4 shadow-soft"
    >
      {open ? (
        <>
          <p className="text-sm leading-7">
            با اجازه شما، رویدادهای کلی استفاده و سرعت سایت برای{" "}
            {config.retention_days.toLocaleString("fa-IR")} روز ثبت می‌شوند؛
            بدون نام، تماس یا متن فرم. رد کردن تأثیری بر خدمات ندارد. می‌توانید
            اجازه را پس بگیرید.
          </p>
          <Link
            className="inline-flex min-h-11 items-center underline"
            href="/privacy#analytics-policy"
          >
            جزئیات اندازه‌گیری
          </Link>
          <div className="flex flex-wrap gap-3">
            <button
              className="min-h-11 rounded-lg border px-4"
              onClick={() => choose(true)}
              disabled={privacyBlocked}
            >
              اجازه می‌دهم
            </button>
            <button
              className="min-h-11 rounded-lg border px-4"
              onClick={() => choose(false)}
            >
              اجازه نمی‌دهم
            </button>
          </div>
        </>
      ) : (
        <button className="min-h-11 underline" onClick={() => setOpen(true)}>
          تنظیم اندازه‌گیری اختیاری
        </button>
      )}
    </aside>
  );
}
