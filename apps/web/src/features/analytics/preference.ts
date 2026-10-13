// A preference only: no visitor identifier is persisted in this cookie.
export const preferenceCookie = "makan_analytics_choice";
export function preferenceValue(version: string, allowed: boolean) {
  return encodeURIComponent(`${version}:${allowed ? "allow" : "deny"}`);
}
export function preferenceChoice(
  value: string | undefined,
  version: string,
): boolean | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(value || "");
  } catch {
    return null;
  }
  if (decoded === `${version}:allow`) return true;
  if (decoded === `${version}:deny`) return false;
  return null;
}
export function browserPreference(version: string) {
  const value = document.cookie
    .split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith(`${preferenceCookie}=`))
    ?.slice(preferenceCookie.length + 1);
  return preferenceChoice(value, version);
}
