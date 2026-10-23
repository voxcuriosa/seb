import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import EditorToolbar from '../editor/EditorToolbar';
import { buildExtensions } from '../editor/editorExtensions';

/** Lærerens enkle editor for oppgavetekst. Returnerer HTML via onChange. */
export default function SimplePromptEditor({ value, onChange }) {
  const editor = useEditor({
    extensions: buildExtensions({ placeholder: 'Skriv eller lim inn oppgaveteksten her...' }),
    content: value || '',
    editorProps: { attributes: { class: 'prompt-html', spellcheck: 'true', lang: 'nb-NO' } },
    onUpdate: ({ editor: e }) => onChange(e.getHTML())
  });

  // Oppdater innholdet når det byttes utenfra (f.eks. etter Word-import).
  useEffect(() => {
    if (editor && value !== undefined && value !== editor.getHTML()) {
      editor.commands.setContent(value || '', { emitUpdate: false });
    }
  }, [editor, value]);

  return (
    <div className="prompt-editor rounded-2xl border border-slate-700 bg-slate-950 overflow-hidden focus-within:border-emerald-500">
      <EditorToolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
