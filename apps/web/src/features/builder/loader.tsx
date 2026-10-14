"use client";
import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type { PageBuilder } from "./editor";
const Editor = dynamic(
  () => import("./editor").then((module) => module.PageBuilder),
  {
    ssr: false,
    loading: () => (
      <p role="status" className="p-8">
        صفحه‌ساز در حال بارگذاری است…
      </p>
    ),
  },
);
export function BuilderLoader(props: ComponentProps<typeof PageBuilder>) {
  return <Editor key={props.initial.id} {...props} />;
}
