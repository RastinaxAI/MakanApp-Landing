import { PublicPage } from "@/features/cms/public-page";
import { getPage, pageMetadata } from "@/lib/public-api";
export async function generateMetadata() { return pageMetadata(await getPage("faq"), "/faq"); }
export default async function Page({ searchParams }: { searchParams: Promise<{ category?: string }> }) { const { category } = await searchParams; return <PublicPage slug="faq" category={category}/>; }
