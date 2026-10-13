export function RichText({
  html,
  privatePreview = false,
}: {
  html: string;
  privatePreview?: boolean;
}) {
  // Only server-sanitized CMS API output is passed here; the editor is a separate component.
  const rendered = privatePreview
    ? html.replace(
        /src="\/api\/v1\/media\/([0-9a-f-]{36})\/file"/gi,
        'src="/api/v1/admin/media/$1/file"',
      )
    : html;
  return (
    <div
      className="cms-rich-text"
      dangerouslySetInnerHTML={{ __html: rendered }}
    />
  );
}
