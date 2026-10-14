import { notFound } from "next/navigation";
import {
  CmsDenied,
  cmsGet,
  cmsAssets,
  requireContentAdmin,
} from "@/features/cms/admin-data";
import { getFeatures, getAudiences, getFaqs } from "@/lib/public-api";
import { asFeatures, asAudiences, asFaqs } from "@/features/cms/renderer";
import { BuilderLoader } from "@/features/builder/loader";
import type { AdminContent } from "@/features/cms/types";
import type { BuilderSettings } from "@/features/builder/types";
export default async function BuilderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await requireContentAdmin())) return <CmsDenied />;
  const { id } = await params;
  const [initial, assets, features, audiences, faqs, settings] =
    await Promise.all([
      cmsGet<AdminContent>(`content/${encodeURIComponent(id)}`),
      cmsAssets(),
      getFeatures(),
      getAudiences(),
      getFaqs(),
      cmsGet<BuilderSettings>("builder/settings"),
    ]);
  if (initial.payload.kind === "faq")
    notFound();
  return (
    <BuilderLoader
      initial={initial}
      assets={assets}
      dataContext={{
        features: asFeatures(features.items),
        audiences: asAudiences(audiences.items),
        faqs: asFaqs(faqs.items),
        articles: [],
        siteGlobals: settings.globals,
      }}
    />
  );
}
