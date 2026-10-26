import {
  CmsDenied,
  cmsGet,
  cmsAll,
  requireContentAdmin,
} from "@/features/cms/admin-data";
import { LearningArticle } from "@/features/learning/public";
import { adminKind } from "@/features/learning/server";
import { resourceFor, type LearningAdmin } from "@/features/learning/types";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ kind?: string; revision?: string }>;
}) {
  if (!(await requireContentAdmin())) return <CmsDenied />;
  const query = await searchParams;
  const kind = adminKind(query.kind);
  const content = await cmsGet<LearningAdmin>(
    `${resourceFor(kind)}/${(await params).id}/preview${query.revision ? `?revision_id=${encodeURIComponent(query.revision)}` : ""}`,
  );
  const candidates = await cmsAll<LearningAdmin>(
    kind === "blog" ? "blog/articles" : "learn/contents",
  );
  const related = (content.payload.related_ids || []).flatMap((id) => {
    const item = candidates.find((c) => c.id === id);
    return item ? [item] : [];
  });
  const items = (content.payload.item_ids || []).flatMap((id) => {
    const item = candidates.find((c) => c.id === id);
    return item ? [item] : [];
  });
  return (
    <>
      <p className="admin-preview-toolbar mb-5">
        پیش‌نمایش خصوصی؛ اطلاعات این نسخه هنوز لزوماً عمومی نیست.
      </p>
      <div className="public-site">
        <LearningArticle
          privatePreview
          content={{
            ...content,
            related,
            items,
            series: [],
            previous: null,
            next: null,
          }}
        />
      </div>
    </>
  );
}
