import { useRef, useState } from 'react';
import { FileUp, FolderOpen, Files } from 'lucide-react';
import { getFilesFromDataTransfer } from '../../utils/files';

/** Slippsone med «Velg PDF-filer» (multiple) og «Velg Teams-mappe» (webkitdirectory). */
export default function PdfDropZone({ onFiles, compact = false }) {
  const [over, setOver] = useState(false);
  const fileRef = useRef(null);
  const dirRef = useRef(null);

  const onDrop = async (e) => {
    e.preventDefault();
    setOver(false);
    onFiles(await getFilesFromDataTransfer(e.dataTransfer));
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      className={`rounded-3xl border-2 border-dashed text-center transition-colors ${compact ? 'p-4' : 'p-8 sm:p-10'} ${
        over ? 'border-emerald-400 bg-emerald-950/40' : 'border-slate-700 bg-slate-950'
      }`}
    >
      {!compact && (
        <>
          <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-950 border border-emerald-700/60 flex items-center justify-center text-emerald-400 mb-4">
            <FileUp size={32} aria-hidden="true" />
          </div>
          <h3 className="text-lg font-black text-white">Dra og slipp prøve-PDF-ene eller Teams-mappen hit</h3>
          <p className="text-sm text-slate-300 mt-1 mb-5">Du kan slippe mange PDF-er samtidig, eller hele «Student Work»-mappen.</p>
        </>
      )}
      <div className="flex flex-col sm:flex-row gap-2 justify-center">
        <button type="button" onClick={() => fileRef.current?.click()}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black uppercase tracking-wider">
          <Files size={15} aria-hidden="true" /> Velg PDF-filer
        </button>
        <button type="button" onClick={() => dirRef.current?.click()}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-black uppercase tracking-wider">
          <FolderOpen size={15} aria-hidden="true" /> Velg Teams-mappe
        </button>
      </div>
      <input ref={fileRef} type="file" accept="application/pdf,.pdf" multiple className="sr-only" onChange={(e) => { onFiles(e.target.files); e.target.value = ''; }} />
      <input ref={dirRef} type="file" webkitdirectory="true" directory="" multiple className="sr-only" onChange={(e) => { onFiles(e.target.files); e.target.value = ''; }} />
    </div>
  );
}
