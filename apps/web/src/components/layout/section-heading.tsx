import type { ReactNode } from "react";

export function SectionHeading({ kicker, title, description, id }: { kicker: string; title: string; description?: ReactNode; id?: string }) {
  return <div className="mb-8 max-w-2xl"><p className="section-kicker mb-3">{kicker}</p><h2 id={id} className="section-heading">{title}</h2>{description && <p className="mt-4 text-base text-muted-foreground">{description}</p>}</div>;
}
