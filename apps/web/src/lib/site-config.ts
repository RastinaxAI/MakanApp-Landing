// Public, optional settings. Missing or unsafe values never create fake links.
function httpsUrl(value: string | undefined): string | undefined {
  if (!value?.trim()) return undefined;
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" && !url.username && !url.password
      ? url.href
      : undefined;
  } catch {
    return undefined;
  }
}

function publicPhone(value: string | undefined): string | undefined {
  return value && /^\+?[0-9][0-9 ()-]{5,24}$/.test(value) ? value : undefined;
}

function publicEmail(value: string | undefined): string | undefined {
  return value && /^[A-Za-z0-9._+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(value)
    ? value
    : undefined;
}

export const siteConfig = {
  appUrl: httpsUrl(process.env.NEXT_PUBLIC_APP_URL),
  phone: publicPhone(process.env.NEXT_PUBLIC_CONTACT_PHONE),
  email: publicEmail(process.env.NEXT_PUBLIC_CONTACT_EMAIL),
} as const;
