import type { ReactNode } from "react";
import { visibleNodes } from "@/features/builder/types";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Container } from "@/components/layout/container";
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
import { FeaturedLearning } from "@/features/learning/public";
import { JsonLd } from "@/features/seo/structured-data";
import { getSeoStatus } from "@/lib/public-api";

export async function PublicPage({
  slug,
  category,
  request,
}: {
  slug: string;
  category?: string;
  request?: ReactNode;
}) {
  const content = await getPage(slug);
  if (content.kind === "home") {
    const [features, audiences, faqs] = await Promise.all([
      getFeatures(),
      getAudiences(),
      getFaqs(),
    ]);
    return (
      <>
        <CmsRenderer
          content={content}
          features={asFeatures(features.items)}
          audiences={asAudiences(audiences.items)}
          faqs={asFaqs(faqs.items)}
          learning={<FeaturedLearning />}
        />
      </>
    );
  }
  if (content.kind !== "page") notFound();
  const dynamicSections =
    content.payload.kind === "page" &&
    (content.payload.document ||
      content.payload.sections.some((section) =>
        [
          "faq",
          "trust",
          "audiences",
          "experience",
          "product-experience",
        ].includes(section.type),
      ));
  const dynamicData = dynamicSections
    ? await Promise.all([getFeatures(), getAudiences(), getFaqs()])
    : null;
  const hasCatalogue =
    content.payload.kind === "page" &&
    content.payload.document &&
    visibleNodes(content.payload.document.nodes).some(
      (node) =>
        node.type === (slug === "features" ? "FeatureIndex" : "AudienceIndex"),
    );
  const extra =
    slug === "features" && !hasCatalogue
      ? await getFeatures()
      : slug === "solutions" && !hasCatalogue
        ? await getAudiences()
        : null;
  return (
    <>
      <div id={slug === "privacy" ? "requests-policy" : undefined}>
        <CmsRenderer
          content={content}
          features={dynamicData ? asFeatures(dynamicData[0].items) : []}
          audiences={dynamicData ? asAudiences(dynamicData[1].items) : []}
          faqs={dynamicData ? asFaqs(dynamicData[2].items) : []}
        />
      </div>
      {extra && (
        <section className="section-space">
          <Container>
            <h2 className="sr-only">
              {slug === "features" ? "بخش‌های ماکان" : "راهکارها برای مخاطبان"}
            </h2>
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
      {slug === "faq" &&
        !(
          content.payload.kind === "page" &&
          content.payload.document &&
          visibleNodes(content.payload.document.nodes).some(
            (node) =>
              node.type === "FAQ" ||
              (node.type === "LegacySection" &&
                ["faq", "trust"].includes(
                  node.props.legacy_section?.type || "",
                )),
          )
        ) && <FaqPageContent category={category} />}
      {slug === "privacy" && (
        <Container>
          <section id="analytics-policy" className="my-10 max-w-3xl space-y-4">
            <h2 className="text-2xl font-semibold">
              اندازه‌گیری اختیاری استفاده و سرعت سایت
            </h2>
            <p className="leading-8">
              در صورت فعال‌سازی این قابلیت، تنها با اجازه جداگانه شما رویدادهای
              کلی و سرعت صفحات ثبت می‌شوند. نام، شماره تماس، ایمیل، متن فرم،
              نشانی کامل صفحه، IP و اطلاعات حساب در این رویدادها ذخیره نمی‌شود.
              رضایت فرم درخواست با اجازه اندازه‌گیری مستقل است.
            </p>
            <p className="leading-8">
              شناسه تصادفی نشست در همین تب نگهداری می‌شود، پس از ۳۰ دقیقه
              بی‌فعالیتی یا تغییر روز عوض می‌شود و در سرور به صورت HMAC روزانه
              ذخیره می‌شود. رویدادها حداکثر ۳۰ روز نگهداری می‌شوند. انتخاب اجازه
              نیز حداکثر ۳۰ روز در مرورگر باقی می‌ماند. از «تنظیم اندازه‌گیری
              اختیاری» می‌توانید اجازه را لغو کنید؛ DNT و Global Privacy Control
              رعایت می‌شوند. این انتخاب مستقل از رضایت ثبت درخواست است.
            </p>
          </section>
        </Container>
      )}
      {request &&
        !(
          content.payload.kind === "page" &&
          content.payload.document &&
          visibleNodes(content.payload.document.nodes).some(
            (node) =>
              node.type === (slug === "demo" ? "DemoForm" : "ContactForm"),
          )
        ) &&
        request}
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
      {!!faqs.items.length && (await getSeoStatus()).origin && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: asFaqs(faqs.items).map((f) => ({
              "@type": "Question",
              name: f.question,
              acceptedAnswer: {
                "@type": "Answer",
                text: f.answer_html || f.answer,
              },
            })),
          }}
        />
      )}
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
async function PublicMarketingDetail(
  kind: "features" | "audiences",
  slug: string,
) {
  const [content, features, audiences, faqs] = await Promise.all([
    publicGet<CmsContent>(`${kind}/${encodeURIComponent(slug)}`),
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
export const PublicFeature = ({ slug }: { slug: string }) =>
  PublicMarketingDetail("features", slug);
export const PublicAudience = ({ slug }: { slug: string }) =>
  PublicMarketingDetail("audiences", slug);
