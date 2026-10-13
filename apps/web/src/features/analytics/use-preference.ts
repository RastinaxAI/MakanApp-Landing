"use client";
import { useSyncExternalStore } from "react";
import { browserPreference } from "./preference";
export const preferenceEvent = "makan:privacy-choice";
function subscribe(callback: () => void) {
  window.addEventListener(preferenceEvent, callback);
  window.addEventListener("focus", callback);
  return () => {
    window.removeEventListener(preferenceEvent, callback);
    window.removeEventListener("focus", callback);
  };
}
export function useAnalyticsPreference(version: string) {
  return useSyncExternalStore(
    subscribe,
    () =>
      browserPreference(version) === true &&
      navigator.doNotTrack !== "1" &&
      !(navigator as Navigator & { globalPrivacyControl?: boolean })
        .globalPrivacyControl,
    () => false,
  );
}
