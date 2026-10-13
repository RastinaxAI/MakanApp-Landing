import { PublicRequestSection } from "@/features/leads/public-request-section";
import { PublicPage } from "@/features/cms/public-page";
import { getPage, pageMetadata } from "@/lib/public-api";
export async function generateMetadata() { return pageMetadata(await getPage("contact"), "/contact"); }
export default async function Page() { return <PublicPage slug="contact" request={<PublicRequestSection kind="contact" />}/>; }
