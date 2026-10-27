"use client";

import { useLayoutEffect } from "react";

// Install before paint, so Escape works even before the dialog library's
// passive layer/focus effects have settled in WebKit. The image closes first.
export function useGuideEscape(
  open: boolean,
  setOpen: (open: boolean) => void,
  containsImage = false,
) {
  useLayoutEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.isComposing) return;
      if (
        containsImage &&
        document.querySelector('[data-guide-image-dialog][data-state="open"]')
      )
        return;
      event.preventDefault();
      event.stopImmediatePropagation();
      setOpen(false);
    };
    document.addEventListener("keydown", close, true);
    return () => document.removeEventListener("keydown", close, true);
  }, [open, setOpen, containsImage]);
}
