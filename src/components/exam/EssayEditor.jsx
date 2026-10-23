import { useEffect, useRef } from 'react';
import { useEditor, EditorContent, useEditorState } from '@tiptap/react';
import { Languages } from 'lucide-react';
import EditorToolbar from '../editor/EditorToolbar';
import { buildExtensions } from '../editor/editorExtensions';
import { SPELLCHECK_LANGUAGES } from '../../utils/seb/sebDictionaries';
import { countWords } from '../../utils/integrity/textNormalize';
import { LARGE_PASTE_THRESHOLD } from '../../config';

/**
 * Elevens skrivefelt (Tiptap). Innliming limer bare inn ren tekst, og store
 * innliminger registreres lokalt i loggen (pasteIncidents).
 */
export default function EssayEditor({ initialDoc, lang, onLangChange, onChange, onLargePaste, onReady }) {
  const editorRef = useRef(null);
  const editor = useEditor({
    extensions: buildExtensions({ placeholder: 'Skriv besvarelsen din her...' }),
    content: initialDoc || '',
    editorProps: {
      attributes: { spellcheck: 'true', lang, 'aria-label': 'Besvarelse', autocorrect: 'off', autocapitalize: 'sentences' },
      handlePaste: (view, event) => {
        const text = event.clipboardData?.getData('text/plain') ?? '';
        event.preventDefault();
        if (!text) return true;
        if (text.length > LARGE_PASTE_THRESHOLD) onLargePaste?.(text.length);
        const paragraphs = text.replace(/\r\n?/g, '\n').split('\n');
        editorRef.current?.chain().focus().insertContent(
          paragraphs.map((p) => ({ type: 'paragraph', content: p ? [{ type: 'text', text: p }] : [] }))
        ).run();
        return true;
      },
      // Ingen slipp av eksterne filer eller HTML i skrivefeltet.
      handleDrop: (view, event, slice, moved) => !moved
    },
    onUpdate: () => onChange?.()
  });

  useEffect(() => {
    editorRef.current = editor;
    if (editor) onReady?.(editor);
  }, [editor, onReady]);

  // Bytt lang-attributt dynamisk (stavekontrollens språk).
  useEffect(() => {
    if (editor?.view?.dom) editor.view.dom.setAttribute('lang', lang);
  }, [editor, lang]);

  const counts = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      const text = e?.getText({ blockSeparator: '\n' }) || '';
      return { words: countWords(text), chars: text.replace(/\n/g, '').length };
    }
  });

  return (
    <div className="essay-editor h-full flex flex-col bg-white min-h-0">
      <EditorToolbar editor={editor}>
        <span className="w-px h-6 bg-slate-700 mx-1" aria-hidden="true" />
        <label className="flex items-center gap-1.5 text-xs text-slate-200 pl-1">
          <Languages size={15} className="text-emerald-400" aria-hidden="true" />
          <span className="sr-only">Språk for stavekontroll</span>
          <select
            value={lang}
            onChange={(e) => onLangChange(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-emerald-500"
            title="Språk for stavekontroll. Høyreklikk på et ord med rød strek for å få retteforslag."
          >
            {SPELLCHECK_LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
        </label>
        <span className="ml-auto pr-2 text-xs text-slate-300 tabular-nums" aria-live="polite" title="Løpende antall ord og tegn (uten linjeskift)">
          {counts?.words ?? 0} ord, {counts?.chars ?? 0} tegn
        </span>
      </EditorToolbar>
      <div className="flex-1 overflow-auto min-h-0" onClick={() => editor?.commands.focus()}>
        <div className="max-w-3xl mx-auto">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}
