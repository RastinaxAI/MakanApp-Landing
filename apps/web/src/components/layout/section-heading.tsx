import type { ReactNode } from "react";

export function SectionHeading({
  kicker,
  title,
  description,
  id,
}: {
  kicker?: string;
  title: string;
  description?: ReactNode;
  id?: string;
}) {
  if (!kicker && !title && !description) return null;
  return (
    <div className="mb-8 max-w-2xl">
      {kicker && <p className="section-kicker mb-3">{kicker}</p>}
      {title && (
        <h2 id={id} className="section-heading">
          {title}
        </h2>
      )}
      {description && (
        <p className="mt-4 text-base text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
