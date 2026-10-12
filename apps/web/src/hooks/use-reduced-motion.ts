"use client";

import { useSyncExternalStore } from "react";

const query = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  const media = window.matchMedia(query);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

// The server assumes reduced motion until the browser preference is available.
export function useReducedMotionPreference() {
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => true);
}
