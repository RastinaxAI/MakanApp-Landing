import { notFound } from "next/navigation";
import Link from "next/link";
import { Container } from "@/components/layout/container";
import { RequestFormPreview } from "@/features/marketing/request-form-preview";
import { ContactChannels } from "@/components/marketing/contact-channels";
import { FeatureCard } from "@/features/marketing/feature-card";
import { AudienceCard } from "@/features/marketing/audience-card";
import { FaqList } from "@/features/marketing/faq-list";
import {
  getPage,
  getFeatures,
  getAudiences,
  getFaqs,
  getCategories,
  publicGet,
} from "@/lib/public-api";
import { CmsRenderer, asFeatures, asAudiences, asFaqs } from "./renderer";
import type { CmsContent } from "./types";

export async function PublicPage({
  slug,
  category,
}: {
  slug: string;
  category?: string;
}) {
  const content = await getPage(slug);
  if (content.kind === "home") {
    const [features, audiences, faqs] = await Promise.all([
      getFeatures(),
      getAudiences(),
      getFaqs(),
    ]);
    return (
      <CmsRenderer
        content={content}
        features={asFeatures(features.items)}
        audiences={asAudiences(audiences.items)}
        faqs={asFaqs(faqs.items)}
      />
    );
  }
  if (content.kind !== "page") notFound();
  const extra =
    slug === "features"
      ? await getFeatures()
      : slug === "solutions"
        ? await getAudiences()
        : null;
  return (
    <>
      <CmsRenderer content={content} />
      {extra && (
        <section className="section-space">
          <Container>
            <div className="grid gap-6 tablet:grid-cols-2">
              {slug === "features"
                ? asFeatures(extra.items).map((f) => (
                    <FeatureCard key={f.slug} feature={f} />
                  ))
                : asAudiences(extra.items).map((a) => (
                    <AudienceCard key={a.slug} audience={a} />
                  ))}
            </div>
          </Container>
        </section>
      )}
      {slug === "faq" && <FaqPageContent category={category} />}
      {["demo", "contact"].includes(slug) && (
        <section className="section-space">
          <Container className="grid items-start gap-8 desktop:grid-cols-[1.35fr_1fr]">
            <RequestFormPreview kind={slug as "demo" | "contact"} />
            <ContactChannels />
          </Container>
        </section>
      )}
      {["blog", "learn"].includes(slug) && (
        <Container>
          <section className="my-8 rounded-2xl border border-dashed border-input bg-card p-8">
            <h2 className="text-xl font-semibold">
              هنوز مطلبی منتشر نشده است.
            </h2>
            <p className="mt-4 leading-8 text-muted-foreground">
              محتوای تأییدشده پس از انتشار از مرکز مدیریت در این صفحه قرار
              می‌گیرد.
            </p>
          </section>
        </Container>
      )}
    </>
  );
}
async function FaqPageContent({ category }: { category?: string }) {
  const [faqs, categories] = await Promise.all([
    getFaqs(category),
    getCategories(),
  ]);
  return (
    <section className="section-space">
      <Container className="max-w-4xl">
        <nav aria-label="دسته‌های پرسش" className="mb-6 flex flex-wrap gap-3">
          <Link
            href="/faq"
            className="min-h-11 rounded-lg border border-border p-3 text-primary-hover"
          >
            همه پرسش‌ها
          </Link>
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/faq?category=${c.id}`}
              className="min-h-11 rounded-lg border border-border p-3 text-primary-hover"
            >
              {c.title}
            </Link>
          ))}
        </nav>
        <FaqList items={asFaqs(faqs.items)} />
      </Container>
    </section>
  );
}
export async function PublicFeature({ slug }: { slug: string }) {
  const content = await publicGet<CmsContent>(
    `features/${encodeURIComponent(slug)}`,
  );
  return <CmsRenderer content={content} />;
}
export async function PublicAudience({ slug }: { slug: string }) {
  const [content, features] = await Promise.all([
    publicGet<CmsContent>(`audiences/${encodeURIComponent(slug)}`),
    getFeatures(),
  ]);
  return (
    <CmsRenderer content={content} features={asFeatures(features.items)} />
  );
}
