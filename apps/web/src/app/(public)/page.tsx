import { PublicPage } from "@/features/cms/public-page";
import { getPage, pageMetadata } from "@/lib/public-api";
export async function generateMetadata() { return pageMetadata(await getPage("home"), "/"); }
export default async function Page() { return <PublicPage slug="home"/>; }
