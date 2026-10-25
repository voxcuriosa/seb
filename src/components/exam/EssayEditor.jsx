import { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent, useEditorState } from '@tiptap/react';
import { Languages, Check, EyeOff, Volume2 } from 'lucide-react';
import EditorToolbar from '../editor/EditorToolbar';
import { buildExtensions } from '../editor/editorExtensions';
import { spellcheckPluginKey } from '../editor/norwegianSpellcheck';
import { SPELLCHECK_LANGUAGES, loadBrowserSpellchecker } from '../../utils/seb/sebDictionaries';
import { countWords } from '../../utils/integrity/textNormalize';
import { LARGE_PASTE_THRESHOLD } from '../../config';
import { useStudentUiLang } from '../../hooks/useStudentUiLang';

function copyTextToSystemClipboard(text) {
  const clean = String(text || '').trim();
  if (!clean) return false;
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(clean).catch(() => {});
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = clean;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-9999px';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  } catch {
    // Ignorer hvis execCommand er blokkert
  }
  return true;
}

/**
 * Elevens skrivefelt (Tiptap). Innliming limer bare inn ren tekst, og store
 * innliminger registreres lokalt i loggen (pasteIncidents).
 */
export default function EssayEditor({ initialDoc, lang, onLangChange, onChange, onLargePaste, onReady, hasReadingApp = false }) {
  const editorRef = useRef(null);
  const checkerRef = useRef(null);
  const [spellMenu, setSpellMenu] = useState(null);
  const [copiedNotice, setCopiedNotice] = useState(false);
  const { t } = useStudentUiLang();

  const editor = useEditor({
    extensions: buildExtensions({ placeholder: 'Skriv besvarelsen din her...', enableSpellcheck: true }),
    content: initialDoc || '',
    editorProps: {
      attributes: {
        role: 'textbox',
        'aria-multiline': 'true',
        spellcheck: 'true',
        lang,
        'aria-label': 'Besvarelse',
        autocapitalize: 'sentences'
      },
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
    onUpdate: () => {
      setSpellMenu(null);
      onChange?.();
    }
  });

  useEffect(() => {
    editorRef.current = editor;
    if (editor) onReady?.(editor);
  }, [editor, onReady]);

  // Bytt lang-attributt dynamisk og aktiver innebygd norsk stavekontroll (nb-NO / nn-NO).
  useEffect(() => {
    if (!editor?.view?.dom) return;
    editor.view.dom.setAttribute('lang', lang);
    let cancelled = false;
    loadBrowserSpellchecker(lang).then((checker) => {
      if (cancelled || !editor || editor.isDestroyed) return;
      checkerRef.current = checker;
      editor.view.dispatch(editor.state.tr.setMeta(spellcheckPluginKey, { checker }));
    });
    return () => {
      cancelled = true;
    };
  }, [editor, lang]);

  useEffect(() => {
    if (!spellMenu) return;
    const close = () => setSpellMenu(null);
    window.addEventListener('click', close);
    window.addEventListener('keydown', close);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('keydown', close);
    };
  }, [spellMenu]);

  const handleContextMenu = (e) => {
    const target = e.target?.closest?.('.spell-error');
    if (!target || !checkerRef.current || !editor) return;
    const word = target.getAttribute('data-spell-word') || '';
    const from = Number(target.getAttribute('data-spell-from'));
    const to = Number(target.getAttribute('data-spell-to'));
    if (!word || !Number.isFinite(from) || !Number.isFinite(to)) return;
    e.preventDefault();
    const suggestions = checkerRef.current.suggestWords(word, 5);
    const x = Math.min(e.clientX, window.innerWidth - 220);
    const y = Math.min(e.clientY, window.innerHeight - 220);
    setSpellMenu({ word, from, to, suggestions, x, y });
  };

  const replaceMisspelled = (replacement) => {
    if (!editor || !spellMenu) return;
    editor.chain().focus().insertContentAt({ from: spellMenu.from, to: spellMenu.to }, replacement).run();
    setSpellMenu(null);
  };

  const ignoreMisspelled = () => {
    if (!editor || !spellMenu) return;
    editor.view.dispatch(editor.state.tr.setMeta(spellcheckPluginKey, { ignoreWord: spellMenu.word }));
    setSpellMenu(null);
  };

  const counts = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      const text = e?.getText({ blockSeparator: '\n' }) || '';
      return { words: countWords(text), chars: text.replace(/\n/g, '').length };
    }
  });

  const sendSelectionToReadingApp = () => {
    let selected = '';
    if (typeof window !== 'undefined' && window.getSelection) {
      selected = String(window.getSelection()?.toString() || '').trim();
    }
    if (!selected && editor) {
      const { from, to } = editor.state.selection;
      selected = editor.state.doc.textBetween(from, to, ' ').trim();
      if (!selected) selected = editor.getText({ blockSeparator: '\n' }).trim();
    }
    if (copyTextToSystemClipboard(selected)) {
      setCopiedNotice(true);
      setTimeout(() => setCopiedNotice(false), 2200);
    }
  };

  return (
    <div className="essay-editor h-full flex flex-col bg-white min-h-0 relative">
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
        {hasReadingApp && (
          <>
            <span className="w-px h-6 bg-slate-700 mx-1" aria-hidden="true" />
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={sendSelectionToReadingApp}
              title="Sender markert tekst (eller hele besvarelsen) til Lingdys for opplesing med naturlig stemme. Husk å slå på «Les når tekst markeres» under Innstillinger -> Tale i Lingdys."
              className={`h-8 px-2.5 rounded-lg flex items-center gap-1.5 text-xs font-bold transition-colors ${
                copiedNotice
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-slate-800 text-emerald-300 hover:bg-slate-700 hover:text-white border border-slate-700'
              }`}
            >
              <Volume2 size={14} aria-hidden="true" />
              <span>{copiedNotice ? t.sentToLingdys : t.readInLingdys}</span>
            </button>
          </>
        )}
        <span className="ml-auto pr-2 text-xs text-slate-300 tabular-nums" aria-live="polite" title="Løpende antall ord og tegn (uten linjeskift)">
          {counts?.words ?? 0} {t.wordsLabel}, {counts?.chars ?? 0} {t.charsLabel}
        </span>
      </EditorToolbar>
      <div
        className="flex-1 overflow-auto min-h-0"
        onClick={() => editor?.commands.focus()}
        onContextMenu={handleContextMenu}
      >
        <div className="w-full max-w-5xl">
          <EditorContent editor={editor} />
        </div>
      </div>

      {spellMenu && (
        <div
          role="menu"
          aria-label={`Retteforslag for ${spellMenu.word}`}
          style={{ left: `${spellMenu.x}px`, top: `${spellMenu.y}px` }}
          onClick={(e) => e.stopPropagation()}
          className="fixed z-50 w-52 rounded-xl bg-slate-900 border border-slate-700 shadow-xl py-1.5 text-xs text-slate-100"
        >
          <div className="px-3 py-1 text-[11px] text-slate-400 border-b border-slate-800 truncate">
            {t.spellcheckTitle} <strong className="text-red-300">{spellMenu.word}</strong>
          </div>
          {spellMenu.suggestions.length > 0 ? (
            spellMenu.suggestions.map((sug) => (
              <button
                key={sug}
                type="button"
                role="menuitem"
                onClick={() => replaceMisspelled(sug)}
                className="w-full px-3 py-1.5 text-left font-bold text-white hover:bg-emerald-500 hover:text-slate-950 flex items-center justify-between"
              >
                <span>{sug}</span>
                <Check size={13} aria-hidden="true" />
              </button>
            ))
          ) : (
            <div className="px-3 py-1.5 text-slate-400 italic">{t.noSuggestions}</div>
          )}
          <div className="border-t border-slate-800 mt-1 pt-1">
            <button
              type="button"
              role="menuitem"
              onClick={ignoreMisspelled}
              className="w-full px-3 py-1.5 text-left text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-1.5"
            >
              <EyeOff size={13} aria-hidden="true" />
              <span>{t.ignoreInExam}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
