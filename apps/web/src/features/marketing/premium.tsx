import Image from "next/image";
import { ArrowLeft, ArrowUpLeft, BookOpen, Check, GraduationCap, MessageCircle, ShieldCheck, Users } from "lucide-react";
import { SourceLink as Link } from "@/features/leads/source-link";
import { Container } from "@/components/layout/container";
import { MediaImage } from "@/features/cms/media-image";
import { RichText } from "@/features/cms/rich-text";
import type { CmsImageRef, CmsSection } from "@/features/cms/types";
import type { Feature } from "./content";

/** A capability map, deliberately labelled as an illustration rather than product evidence. */
export function CapabilityMap({ compact = false }: { compact?: boolean }) {
  return <figure className={`makan-capability-map ${compact ? "is-compact" : ""}`}>
    <div className="map-label"><span className="size-2 rounded-full bg-primary" /> یک فضای مشترک برای مدرسه</div>
    <div className="map-orbit" aria-hidden="true" />
    <div className="map-center"><Image src="/brand/makan-logo.png" alt="ماکان" width={88} height={88} sizes="88px" className="rounded-2xl" /><span>ماکان</span></div>
    <div className="map-node map-school"><GraduationCap aria-hidden="true" /><span>مدرسه</span><small>کلاس، تکلیف و آزمون</small></div>
    <div className="map-node map-messages"><MessageCircle aria-hidden="true" /><span>پیام‌رسان</span><small>گفت‌وگو و هماهنگی</small></div>
    <div className="map-node map-family"><Users aria-hidden="true" /><span>خانواده</span><small>همراه مسیر یادگیری</small></div>
    <figcaption>نقشهٔ تصویری قابلیت‌ها؛ این تصویر اسکرین‌شات محصول نیست.</figcaption>
  </figure>;
}

export function PremiumHero({ section, image, privatePreview = false }: { section: CmsSection; image?: CmsImageRef; privatePreview?: boolean }) {
  return <section className="makan-premium-hero" data-section="hero" aria-labelledby="hero-title">
    <Container className="premium-hero-layout">
      <div className="premium-hero-copy">
        <p className="premium-eyebrow"><span className="h-px w-8 bg-current" /> {section.kicker || "ماکان؛ همراه مدرسه"}</p>
        <h1 id="hero-title">{section.title}<span>{section.accent}</span></h1>
        <p className="premium-hero-summary">{section.description}</p>
        {section.body_html && <RichText html={section.body_html} privatePreview={privatePreview} />}
        <div className="premium-actions"><Link href={section.cta_href || "/demo"} className="premium-button premium-button-white">{section.cta_label || "درخواست دموی ماکان"}<ArrowLeft aria-hidden="true" /></Link><Link href="/features" className="premium-text-link">ماکان را بشناسید <ArrowUpLeft aria-hidden="true" /></Link></div>
        <ul className="premium-proof">{section.items.map((item, index) => <li key={index}><Check aria-hidden="true" size={16} />{item.title}</li>)}</ul>
      </div>
      <div className="premium-hero-visual">{image ? <MediaImage image={image} priority privatePreview={privatePreview} /> : <CapabilityMap />}</div>
    </Container>
    <Container className="premium-hero-bottom"><span>از ارتباط روزمره، تا مدیریت یادگیری.</span><span dir="ltr">MAKANAPP / EDUCATION CONNECTED</span></Container>
  </section>;
}

export function PremiumFeatureStory({ feature, order = 1, privatePreview = false }: { feature: Feature; order?: number; privatePreview?: boolean }) {
  const image = feature.media?.find((asset) => asset.id === feature.image_media_id);
  const Icon = feature.slug === "messenger" ? MessageCircle : BookOpen;
  return <section className={`premium-story ${order % 2 === 0 ? "premium-story-reverse" : ""}`} aria-labelledby={`story-${feature.slug}`}>
    <Container className="premium-story-layout">
      <div className="premium-story-copy"><p className="premium-story-number">{String(order).padStart(2, "0")} <span>/ {feature.title}</span></p><h2 id={`story-${feature.slug}`}>{feature.headline}</h2><p className="premium-story-summary">{feature.summary}</p>
        <ul className="premium-story-benefits">{feature.benefits.slice(0, 3).map((benefit, index) => <li key={index}><span><Check size={17} aria-hidden="true" /></span><div><h3>{benefit.title}</h3>{benefit.description && <p>{benefit.description}</p>}</div></li>)}</ul>
        <Link href={`/features/${feature.slug}`} className="premium-story-link">آشنایی با {feature.title}<ArrowLeft size={20} aria-hidden="true" /></Link>
      </div>
      <div className="premium-story-visual">{image ? <MediaImage image={image} privatePreview={privatePreview} /> : <figure className="premium-product-concept"><div className="concept-caption"><Icon aria-hidden="true" /><span>{feature.title}</span><span className="concept-tag">معرفی قابلیت</span></div><div className="concept-content"><span className="concept-word">{feature.slug === "messenger" ? "ارتباط،" : "یادگیری،"}<br /><strong>{feature.slug === "messenger" ? "در جای درست." : "با نظم بیشتر."}</strong></span><div className="concept-tracks">{feature.workflow.slice(0, 3).map((item, index) => <div key={index}><span>{(index + 1).toLocaleString("fa-IR")}</span><p>{item.title}</p></div>)}</div></div><figcaption>تصویرسازی معرفی قابلیت؛ برای دیدن رابط واقعی، درخواست دمو ثبت کنید.</figcaption></figure>}</div>
    </Container>
  </section>;
}

export function PremiumDemoInvitation({ title, description, label, href }: { title: string; description: string; label?: string; href?: string }) {
  return <section className="premium-invitation"><Container><div className="premium-invitation-inner"><div><p className="premium-eyebrow"><ShieldCheck size={18} aria-hidden="true" /> قدم بعدی، یک گفت‌وگوی روشن</p><h2>{title}</h2><p>{description}</p></div><Link href={href || "/demo"} className="premium-button premium-button-blue">{label || "درخواست دموی ماکان"}<ArrowLeft aria-hidden="true" /></Link></div></Container></section>;
}
