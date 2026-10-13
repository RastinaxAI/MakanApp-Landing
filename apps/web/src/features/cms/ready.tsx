"use client";
import { useSyncExternalStore, type ReactNode } from "react";

const subscribe = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

export function CmsReady({
  children,
  disabled = false,
}: {
  children: ReactNode;
  disabled?: boolean;
}) {
  const ready = useSyncExternalStore(subscribe, clientReady, serverReady);
  // SSR controls must not accept edits before React can receive their input events.
  return (
    <fieldset
      disabled={!ready || disabled}
      className="m-0 min-w-0 border-0 p-0"
    >
      <legend className="sr-only">فرم مدیریت وب‌سایت</legend>
      {children}
    </fieldset>
  );
}
