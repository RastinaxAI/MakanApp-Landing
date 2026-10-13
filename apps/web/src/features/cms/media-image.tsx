import Image from "next/image";
import type { CmsImageRef } from "./types";
export function MediaImage({
  image,
  privatePreview = false,
  priority = false,
}: {
  image: CmsImageRef;
  privatePreview?: boolean;
  priority?: boolean;
}) {
  return (
    <Image
      src={`/api/v1/${privatePreview ? "admin/" : ""}media/${image.id}/file`}
      alt={image.alt_text}
      width={image.width}
      height={image.height}
      unoptimized={privatePreview}
      priority={priority}
      className="h-auto w-full rounded-2xl border border-border object-contain"
      sizes="(max-width: 768px) 90vw, 640px"
    />
  );
}
