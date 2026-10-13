import Link from "next/link";
import Image from "next/image";
import type { CmsImageRef } from "@/features/cms/types";

export function Brand({ name = "ماکان", logo }: { name?: string; logo?: CmsImageRef }) {
  return (
    <Link
      href="/"
      aria-label={`${name}، صفحه اصلی`}
      className="inline-flex shrink-0 items-center gap-3 rounded-xl leading-tight"
    >
      {logo ? (
        <Image src={`/api/v1/media/${logo.id}/file`} alt={logo.alt_text} width={logo.width} height={logo.height} className="h-14 w-auto max-w-44 object-contain" />
      ) : (
        <>
          <Image src="/brand/makan-logo.png" alt="" width={52} height={52} sizes="52px" className="size-13 rounded-2xl shadow-soft" />
          <span className="flex flex-col gap-1">
            <span className="text-[1.6rem] font-bold tracking-tight text-foreground">{name}</span>
            <span className="text-xs font-medium text-muted-foreground" dir="ltr">MakanApp</span>
          </span>
        </>
      )}
    </Link>
  );
}
