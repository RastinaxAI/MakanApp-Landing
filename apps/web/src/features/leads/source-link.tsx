"use client";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";

export function SourceLink(props: ComponentProps<typeof NextLink>) {
  const path = usePathname();
  const source =
    path === "/"
      ? "home"
      : ["features", "solutions", "learn", "blog"].find(
          (name) => path === `/${name}` || path.startsWith(`/${name}/`),
        );
  const href =
    source && (props.href === "/demo" || props.href === "/contact")
      ? `${props.href}?source=${source}`
      : props.href;
  return <NextLink prefetch={false} {...props} href={href} />;
}
