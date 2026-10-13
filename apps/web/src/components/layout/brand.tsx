import Link from "next/link";
import Image from "next/image";
import type { CmsImageRef } from "@/features/cms/types";

export function Brand({ name = "ماکان", logo }: { name?: string; logo?: CmsImageRef }) {
  return (
    <Link
      href="/"
      aria-label={`${name}، صفحه اصلی`}
      className="flex shrink-0 flex-col rounded-lg leading-tight"
    >
      {logo ? <Image src={`/api/v1/media/${logo.id}/file`} alt={logo.alt_text} width={logo.width} height={logo.height} className="h-14 w-auto max-w-44 object-contain"/> : <><span className="text-[1.75rem] font-bold tracking-tight text-foreground">{name}<span className="text-primary">.</span></span><span className="mt-1 text-xs text-muted-foreground">نشان متنی موقت</span></>}
    </Link>
  );
}
