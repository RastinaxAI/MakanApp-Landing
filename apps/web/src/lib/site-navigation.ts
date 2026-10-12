export type NavigationItem = Readonly<{ label: string; href: string }>;

// STEP 2 links lead to real layout specimens. Product routes replace them in STEP 3.
export const previewNavigation: readonly NavigationItem[] = [
  { label: "ساختار صفحه", href: "/#layout" },
  { label: "نمایش نقش‌ها", href: "/#roles" },
  { label: "کامپوننت‌ها", href: "/design-system#components" },
  { label: "دسترس‌پذیری", href: "/design-system#accessibility" },
];
