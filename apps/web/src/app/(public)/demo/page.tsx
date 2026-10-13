import { PublicRequestSection } from "@/features/leads/public-request-section";
import { PublicPage } from "@/features/cms/public-page";
import { getPage, pageMetadata } from "@/lib/public-api";
export async function generateMetadata() { return pageMetadata(await getPage("demo"), "/demo"); }
export default async function Page() { return <PublicPage slug="demo" request={<PublicRequestSection kind="demo" />}/>; }
