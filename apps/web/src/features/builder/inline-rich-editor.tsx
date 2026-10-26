"use client";
import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type { RichEditor } from "@/features/cms/rich-editor";
const Editor = dynamic(
  () =>
    import("@/features/cms/rich-editor").then((module) => module.RichEditor),
  {
    ssr: false,
    loading: () => <p role="status">در حال آماده‌کردن ویرایشگر متن…</p>,
  },
);
export function InlineRichEditor(props: ComponentProps<typeof RichEditor>) {
  return <Editor {...props} inline />;
}
