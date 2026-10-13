"use client";
import { useEffect, useState } from "react";
import { useEditor, EditorContent, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import ImageExtension from "@tiptap/extension-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RichEditor({
  value,
  onChange,
  label,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  disabled?: boolean;
}) {
  const [link, setLink] = useState("");
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: { openOnClick: false } }),
      ImageExtension.configure({ allowBase64: false }),
    ],
    content: value,
    immediatelyRender: false,
    editable: !disabled,
    editorProps: {
      attributes: {
        class:
          "cms-rich-text min-h-48 p-4 focus-visible:outline-2 focus-visible:outline-primary",
        "aria-label": label,
        role: "textbox",
        "aria-multiline": "true",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });
  const active = useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor?.isActive("bold") || false,
      italic: editor?.isActive("italic") || false,
      bullet: editor?.isActive("bulletList") || false,
      ordered: editor?.isActive("orderedList") || false,
    }),
  });
  useEffect(() => {
    // Changing interaction state must not mark the stored revision as an edited draft.
    editor?.setEditable(!disabled, false);
  }, [editor, disabled]);
  useEffect(() => {
    if (editor && editor.getHTML() !== value && !editor.isFocused)
      editor.commands.setContent(value, { emitUpdate: false });
  }, [editor, value]);
  if (!editor)
    return (
      <div
        className="min-h-48 rounded-xl border border-border p-4"
        role="status"
      >
        ویرایشگر در حال آماده‌شدن…
      </div>
    );
  return (
    <div className="rounded-xl border border-border bg-card">
      <div
        role="toolbar"
        aria-label={`ابزارهای ${label}`}
        className="flex flex-wrap gap-2 border-b border-border p-3"
      >
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          aria-pressed={active?.bold}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          پررنگ
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          aria-pressed={active?.italic}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          تأکید
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          onClick={() => editor.chain().focus().setParagraph().run()}
        >
          پاراگراف
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
        >
          عنوان ۲
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
        >
          عنوان ۳
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          aria-pressed={active?.bullet}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          فهرست
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          aria-pressed={active?.ordered}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          شماره‌دار
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          نقل‌قول
        </Button>
      </div>
      <EditorContent editor={editor} />
      <div className="flex flex-wrap items-end gap-3 border-t border-border p-3">
        <div className="min-w-0 flex-1">
          <Label>
            نشانی پیوند
            <Input
              aria-label={`پیوند ${label}`}
              dir="ltr"
              value={link}
              maxLength={500}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://… یا /features"
            />
          </Label>
        </div>
        <Button
          type="button"
          disabled={disabled || !link}
          variant="outline"
          onClick={() => {
            editor.chain().focus().setLink({ href: link }).run();
            setLink("");
          }}
        >
          درج پیوند
        </Button>
        <Button
          type="button"
          disabled={disabled}
          variant="outline"
          onClick={() => editor.chain().focus().unsetLink().run()}
        >
          حذف پیوند
        </Button>
      </div>
    </div>
  );
}
