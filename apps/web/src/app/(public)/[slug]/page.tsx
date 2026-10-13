import { PublicPage } from "@/features/cms/public-page";
import { getPage, pageMetadata } from "@/lib/public-api";
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props) { const { slug } = await params; return pageMetadata(await getPage(slug), `/${slug}`); }
export default async function Page({ params }: Props) { return <PublicPage slug={(await params).slug}/>; }
