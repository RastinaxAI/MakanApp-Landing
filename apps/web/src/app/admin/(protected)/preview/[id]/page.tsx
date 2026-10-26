import {
  CmsDenied,
  cmsGet,
  requireContentAdmin,
} from "@/features/cms/admin-data";
import {
  CmsRenderer,
  asFeatures,
  asAudiences,
  asFaqs,
} from "@/features/cms/renderer";
import { getFeatures, getAudiences, getFaqs } from "@/lib/public-api";
import type { AdminContent } from "@/features/cms/types";
export default async function PreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ revision?: string }>;
}) {
  if (!(await requireContentAdmin())) return <CmsDenied />;
  const { id } = await params;
  const { revision } = await searchParams;
  const [content, features, audiences, faqs] = await Promise.all([
    cmsGet<AdminContent>(
      `content/${encodeURIComponent(id)}/preview${revision ? `?revision_id=${encodeURIComponent(revision)}` : ""}`,
    ),
    getFeatures(),
    getAudiences(),
    getFaqs(),
  ]);
  return (
    <>
      <aside className="admin-preview-toolbar mb-6">
        <p>
          پیش‌نمایش خصوصی نسخه {content.revision_no.toLocaleString("fa-IR")}؛
          نمایش این مسیر فقط برای مدیران مجاز است.
        </p>
        <a
          href={`/admin/content/${content.id}`}
          className="inline-flex min-h-11 items-center text-primary-hover"
        >
          بازگشت به ویرایش
        </a>
      </aside>
      <CmsRenderer
        content={content}
        features={asFeatures(features.items)}
        audiences={asAudiences(audiences.items)}
        faqs={asFaqs(faqs.items)}
        privatePreview
      />
    </>
  );
}
