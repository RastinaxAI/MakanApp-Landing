import { Library, type Search } from "@/features/learning/public";
import { getPage, pageMetadata } from "@/lib/public-api";
export async function generateMetadata() {
  return pageMetadata(await getPage("learn"), "/learn");
}
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  return <Library search={await searchParams} />;
}
