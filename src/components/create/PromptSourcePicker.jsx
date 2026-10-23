import { useState } from 'react';
import { PenLine, FileText, FileType2, Loader2, X } from 'lucide-react';
import SimplePromptEditor from './SimplePromptEditor';
import { sanitizeHtml } from '../../utils/sanitize';
import { isPdfFile, formatBytes } from '../../utils/files';
import { MAX_PROMPT_PDF_BYTES } from '../../config';

const SOURCES = [
  { id: 'text', label: 'Skriv / lim inn', icon: PenLine },
  { id: 'docx', label: 'Word-fil (.docx)', icon: FileText },
  { id: 'pdf', label: 'PDF-fil', icon: FileType2 }
];

/** Steg 1: oppgavetekst. Word konverteres lokalt med mammoth, PDF lagres med prøven. */
export default function PromptSourcePicker({ sourceType, setSourceType, promptHtml, setPromptHtml, pdfFile, setPdfFile }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [docxName, setDocxName] = useState('');

  const handleDocx = async (file) => {
    if (!file) return;
    setError('');
    setBusy(true);
    try {
      const mammoth = await import('mammoth/mammoth.browser.js');
      const result = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
      setPromptHtml(sanitizeHtml(result.value));
      setDocxName(file.name);
    } catch {
      setError('Kunne ikke lese Word-filen. Er det en .docx-fil?');
    } finally {
      setBusy(false);
    }
  };

  const handlePdf = async (file) => {
    if (!file) return;
    setError('');
    if (file.size > MAX_PROMPT_PDF_BYTES) return setError(`PDF-en er ${formatBytes(file.size)}. Maks er 8 MB.`);
    if (!(await isPdfFile(file))) return setError('Filen er ikke en gyldig PDF.');
    setPdfFile(file);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Kilde for oppgavetekst">
        {SOURCES.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={sourceType === id}
            onClick={() => setSourceType(id)}
            className={`p-3 rounded-2xl border text-left flex items-center gap-2 text-xs font-black transition-colors ${
              sourceType === id ? 'bg-emerald-500/10 border-emerald-500/60 text-white' : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-600'
            }`}
          >
            <Icon size={16} className={sourceType === id ? 'text-emerald-400' : 'text-slate-400'} aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {sourceType === 'docx' && (
        <label className="flex items-center justify-between gap-3 p-4 rounded-2xl border-2 border-dashed border-slate-700 bg-slate-950 cursor-pointer hover:border-emerald-600">
          <span className="text-sm text-slate-300">
            {docxName ? <>Importert: <strong className="text-white">{docxName}</strong> (rediger under)</> : 'Velg en Word-fil. Den konverteres lokalt i nettleseren.'}
          </span>
          {busy ? <Loader2 size={18} className="animate-spin text-emerald-400" aria-hidden="true" /> : <span className="text-xs font-black text-emerald-300 uppercase">Velg fil</span>}
          <input type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="sr-only" onChange={(e) => handleDocx(e.target.files?.[0])} />
        </label>
      )}

      {sourceType === 'pdf' && (
        <div className="space-y-2">
          {pdfFile ? (
            <div className="flex items-center justify-between gap-3 p-4 rounded-2xl border border-emerald-600/60 bg-emerald-950/40">
              <span className="text-sm text-white flex items-center gap-2">
                <FileType2 size={16} className="text-emerald-400" aria-hidden="true" />
                {pdfFile.name} <span className="text-slate-400">({formatBytes(pdfFile.size)})</span>
              </span>
              <button type="button" onClick={() => setPdfFile(null)} className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800" aria-label="Fjern PDF">
                <X size={16} />
              </button>
            </div>
          ) : (
            <label className="flex items-center justify-between gap-3 p-4 rounded-2xl border-2 border-dashed border-slate-700 bg-slate-950 cursor-pointer hover:border-emerald-600">
              <span className="text-sm text-slate-300">Velg oppgave-PDF (maks 8 MB). Eleven ser den ved siden av skrivefeltet.</span>
              <span className="text-xs font-black text-emerald-300 uppercase">Velg fil</span>
              <input type="file" accept="application/pdf,.pdf" className="sr-only" onChange={(e) => handlePdf(e.target.files?.[0])} />
            </label>
          )}
          <p className="text-xs text-slate-400">Valgfritt: skriv en kort instruks under, som vises over PDF-en.</p>
        </div>
      )}

      {error && <p className="text-sm font-bold text-red-300" role="alert">{error}</p>}

      <SimplePromptEditor value={promptHtml} onChange={setPromptHtml} />
    </div>
  );
}
