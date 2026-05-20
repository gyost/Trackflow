import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';

export default function RichTextEditor({ 
  value, 
  onChange, 
  placeholder = '在此输入内容...' 
}: { 
  value: string, 
  onChange: (val: string) => void,
  placeholder?: string
}) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm prose-black max-w-none opacity-80 text-sm leading-relaxed focus:outline-none min-h-[120px] max-h-[300px] overflow-y-auto border border-[#1A1A1A]/20 p-3 bg-white/50 custom-scrollbar'
      }
    }
  });

  useEffect(() => {
    if (editor && editor.getHTML() !== value && !editor.isFocused) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-1 border border-[#1A1A1A]/20 bg-[#EBE9E4] p-1">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`px-2 py-0.5 text-xs border ${editor.isActive('bold') ? 'bg-[#1A1A1A] text-white' : 'border-transparent hover:bg-black/5'}`}
        >
          加粗
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`px-2 py-0.5 text-xs border ${editor.isActive('italic') ? 'bg-[#1A1A1A] text-white' : 'border-transparent hover:bg-black/5'}`}
        >
          斜体
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`px-2 py-0.5 text-xs border ${editor.isActive('bulletList') ? 'bg-[#1A1A1A] text-white' : 'border-transparent hover:bg-black/5'}`}
        >
          无序列表
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`px-2 py-0.5 text-xs border ${editor.isActive('orderedList') ? 'bg-[#1A1A1A] text-white' : 'border-transparent hover:bg-black/5'}`}
        >
          有序列表
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
