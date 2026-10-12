import { PageHero } from "@/components/marketing/page-hero";
import { Container } from "@/components/layout/container";
import type { ContentBlock } from "@/features/marketing/content";
export function LegalDocument({
  title,
  description,
  sections,
}: {
  title: string;
  description: string;
  sections: readonly ContentBlock[];
}) {
  return (
    <>
      <PageHero eyebrow={title} title={title} description={description} />
      <section className="section-space" aria-label="متن برای بازبینی">
        <Container className="max-w-4xl">
          <aside className="mb-8 rounded-xl border border-border bg-warning-soft p-5 text-warning">
            <h2 className="font-semibold">
              پیش‌نویس برای بازبینی؛ هنوز مصوب نیست
            </h2>
            <p className="mt-2 text-sm leading-8">
              مشخصات مسئول سایت، راه تماس و جزئیات نهایی این متن باید پیش از
              فعال‌شدن فرم‌ها و انتشار عمومی تأیید شوند.
            </p>
          </aside>
          <div className="space-y-7">
            {sections.map((section) => (
              <section
                key={section.title}
                className="rounded-2xl border border-border bg-card p-6 tablet:p-8"
              >
                <h2 className="text-xl font-semibold">{section.title}</h2>
                <p className="mt-4 leading-9 text-muted-foreground">
                  {section.description}
                </p>
              </section>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
