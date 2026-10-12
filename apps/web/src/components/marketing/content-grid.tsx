import type { ContentBlock } from "@/features/marketing/content";
export function ContentGrid({
  items,
  numbered = false,
}: {
  items: readonly ContentBlock[];
  numbered?: boolean;
}) {
  return (
    <div className="grid gap-6 tablet:grid-cols-2 desktop:grid-cols-3">
      {items.map((item, i) => (
        <article
          key={item.title}
          className="min-w-0 rounded-2xl border border-border bg-card p-6 tablet:p-7"
        >
          {numbered && (
            <span className="mb-5 inline-flex size-10 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-primary-hover">
              {new Intl.NumberFormat("fa").format(i + 1)}
            </span>
          )}
          <h3 className="text-lg font-semibold">{item.title}</h3>
          <p className="mt-3 text-sm leading-8 text-muted-foreground">
            {item.description}
          </p>
        </article>
      ))}
    </div>
  );
}
