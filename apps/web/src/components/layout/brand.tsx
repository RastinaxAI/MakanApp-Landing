import Link from "next/link";

export function Brand() {
  return (
    <Link
      href="/"
      aria-label="ماکان، صفحه اصلی"
      className="flex shrink-0 flex-col rounded-lg leading-tight"
    >
      <span className="text-[1.75rem] font-bold tracking-tight text-foreground">
        ماکان<span className="text-primary">.</span>
      </span>
      <span className="mt-1 text-xs text-muted-foreground">نشان متنی موقت</span>
    </Link>
  );
}
