import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect } from "react";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  List, ListOrdered, Heading2, Heading3, Quote, Code, Minus,
} from "lucide-react";

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  onBlur?: () => void;
}

function ToolbarBtn({
  onClick, active, title, children,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      style={{
        padding: "0.3rem 0.4rem",
        borderRadius: "0.375rem",
        border: "none",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: active ? "rgba(124,111,247,0.12)" : "transparent",
        color: active ? "#7c6ff7" : "inherit",
        transition: "background 0.12s, color 0.12s",
      }}
      className={active ? "" : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"}
    >
      {children}
    </button>
  );
}

function Divider() {
  return (
    <div style={{ width: "1px", height: "1.25rem", background: "rgba(0,0,0,0.1)", margin: "0 0.25rem" }}
      className="bg-gray-200 dark:bg-gray-700" />
  );
}

export function RichTextEditor({ value, onChange, placeholder = "Add notes…", onBlur }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Underline,
      Placeholder.configure({ placeholder }),
    ],
    content: value || "",
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    onBlur: () => onBlur?.(),
    editorProps: {
      attributes: {
        style: "min-height:7rem; outline:none; padding: 0.75rem; font-size: 0.9rem; line-height: 1.7;",
        class: "text-gray-800 dark:text-gray-100",
      },
    },
  });

  // Sync external value changes (e.g. when switching tasks)
  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== value) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div
      className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
      style={{ borderRadius: "0.625rem", border: "1px solid", overflow: "hidden" }}
    >
      {/* Toolbar */}
      <div
        className="bg-gray-50 dark:bg-gray-800/80 border-b border-gray-100 dark:border-gray-700"
        style={{ display: "flex", alignItems: "center", flexWrap: "wrap", padding: "0.375rem 0.5rem", gap: "0.125rem" }}
      >
        <ToolbarBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold">
          <Bold size={14} />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic">
          <Italic size={14} />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Underline">
          <UnderlineIcon size={14} />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Strikethrough">
          <Strikethrough size={14} />
        </ToolbarBtn>

        <Divider />

        <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="Heading 2">
          <Heading2 size={14} />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="Heading 3">
          <Heading3 size={14} />
        </ToolbarBtn>

        <Divider />

        <ToolbarBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Bullet list">
          <List size={14} />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Ordered list">
          <ListOrdered size={14} />
        </ToolbarBtn>

        <Divider />

        <ToolbarBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Blockquote">
          <Quote size={14} />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive("code")} title="Inline code">
          <Code size={14} />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} active={false} title="Horizontal rule">
          <Minus size={14} />
        </ToolbarBtn>
      </div>

      {/* Editor area */}
      <EditorContent editor={editor} />
    </div>
  );
}
