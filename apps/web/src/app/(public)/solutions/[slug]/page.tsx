import { PublicAudience } from "@/features/cms/public-page";
import { publicGet, pageMetadata } from "@/lib/public-api";
import type { CmsContent } from "@/features/cms/types";
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props) { const { slug } = await params; const c = await publicGet<CmsContent>(`audiences/${encodeURIComponent(slug)}`); return pageMetadata(c, `/solutions/${c.slug}`); }
export default async function Page({ params }: Props) { return <PublicAudience slug={(await params).slug}/>; }
