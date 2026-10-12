export type NavigationItem = Readonly<{ label: string; href: string }>;

export const publicNavigation: readonly NavigationItem[] = [
  { label: "امکانات", href: "/features" },
  { label: "راهکارها", href: "/solutions" },
  { label: "درباره ما", href: "/about" },
  { label: "وبلاگ", href: "/blog" },
  { label: "آموزش ماکان", href: "/learn" },
  { label: "تماس", href: "/contact" },
];
