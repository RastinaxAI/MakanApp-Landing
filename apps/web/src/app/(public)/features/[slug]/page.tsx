import { PublicFeature } from "@/features/cms/public-page";
import { publicGet, pageMetadata } from "@/lib/public-api";
import type { CmsContent } from "@/features/cms/types";
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props) { const { slug } = await params; const c = await publicGet<CmsContent>(`features/${encodeURIComponent(slug)}`); return pageMetadata(c, `/features/${c.slug}`); }
export default async function Page({ params }: Props) { return <PublicFeature slug={(await params).slug}/>; }
