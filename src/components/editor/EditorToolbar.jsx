import { useState } from 'react';
import { useEditorState } from '@tiptap/react';
import { Bold, Italic, Underline, Heading1, Heading2, List, ListOrdered, Undo2, Redo2, Volume2, VolumeX } from 'lucide-react';

function ToolButton({ onClick, active, disabled, label, children }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={`h-8 min-w-8 px-1.5 rounded-lg flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
        active ? 'bg-emerald-500 text-slate-950' : 'text-slate-200 hover:bg-slate-800 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

const Divider = () => <span className="w-px h-6 bg-slate-700 mx-1" aria-hidden="true" />;

/** Felles verktøylinje for Tiptap (lærerens oppgavetekst og elevens skrivefelt). */
export default function EditorToolbar({ editor, children }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e?.isActive('bold') ?? false,
      italic: e?.isActive('italic') ?? false,
      underline: e?.isActive('underline') ?? false,
      h1: e?.isActive('heading', { level: 1 }) ?? false,
      h2: e?.isActive('heading', { level: 2 }) ?? false,
      bullet: e?.isActive('bulletList') ?? false,
      ordered: e?.isActive('orderedList') ?? false,
      canUndo: e?.can().undo() ?? false,
      canRedo: e?.can().redo() ?? false
    })
  });
  const [speaking, setSpeaking] = useState(false);
  if (!editor || !s) return null;
  const run = (fn) => () => fn(editor.chain().focus()).run();

  const toggleSpeak = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const { from, to } = editor.state.selection;
    let text = editor.state.doc.textBetween(from, to, ' ');
    if (!text.trim()) text = editor.getText();
    if (!text.trim()) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = document.documentElement.lang || 'nb-NO';
    utter.onend = () => setSpeaking(false);
    utter.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utter);
  };

  return (
    <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 bg-slate-900 border-b border-slate-800" role="toolbar" aria-label="Formatering">
      <ToolButton label="Fet (Ctrl+B)" active={s.bold} onClick={run((c) => c.toggleBold())}><Bold size={16} /></ToolButton>
      <ToolButton label="Kursiv (Ctrl+I)" active={s.italic} onClick={run((c) => c.toggleItalic())}><Italic size={16} /></ToolButton>
      <ToolButton label="Understreket (Ctrl+U)" active={s.underline} onClick={run((c) => c.toggleUnderline())}><Underline size={16} /></ToolButton>
      <Divider />
      <ToolButton label="Overskrift 1" active={s.h1} onClick={run((c) => c.toggleHeading({ level: 1 }))}><Heading1 size={16} /></ToolButton>
      <ToolButton label="Overskrift 2" active={s.h2} onClick={run((c) => c.toggleHeading({ level: 2 }))}><Heading2 size={16} /></ToolButton>
      <Divider />
      <ToolButton label="Punktliste" active={s.bullet} onClick={run((c) => c.toggleBulletList())}><List size={16} /></ToolButton>
      <ToolButton label="Nummerert liste" active={s.ordered} onClick={run((c) => c.toggleOrderedList())}><ListOrdered size={16} /></ToolButton>
      <Divider />
      <ToolButton label="Angre (Ctrl+Z)" disabled={!s.canUndo} onClick={run((c) => c.undo())}><Undo2 size={16} /></ToolButton>
      <ToolButton label="Gjør om (Ctrl+Y)" disabled={!s.canRedo} onClick={run((c) => c.redo())}><Redo2 size={16} /></ToolButton>
      <Divider />
      <ToolButton
        label={speaking ? 'Stopp opplesing' : 'Les opp markert tekst (syntetisk tale)'}
        active={speaking}
        onClick={toggleSpeak}
      >
        {speaking ? <VolumeX size={16} /> : <Volume2 size={16} />}
      </ToolButton>
      {children}
    </div>
  );
}
