import type { Metadata } from "next";
import { getFeatures, getPage } from "@/lib/public-api";
import { asFeatures } from "@/features/cms/renderer";
import { PremiumFeatureStory, PremiumHero } from "@/features/marketing/premium";

export const metadata: Metadata = { title: "جهت طراحی ماکان V2", robots: { index: false, follow: false } };
export default async function DesignPreview() {
  const [home, contents] = await Promise.all([getPage("home"), getFeatures()]);
  if (home.payload.kind !== "home") return null;
  const hero = home.payload.sections.find((section) => section.type === "hero");
  const features = asFeatures(contents.items);
  return <>{hero && <PremiumHero section={hero} image={home.media.find((image) => image.id === hero.media_id)} />}{["messenger", "school"].map((slug, index) => {
    const feature = features.find((item) => item.slug === slug);
    return feature ? <PremiumFeatureStory key={slug} feature={feature} order={index + 1} /> : null;
  })}</>;
}
