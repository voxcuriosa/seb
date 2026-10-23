import { useCallback, useEffect, useRef, useState } from 'react';
import { ZoomIn, ZoomOut, Loader2, AlertTriangle } from 'lucide-react';
import { fetchPromptPdf } from '../../firebase';
import { loadPdf } from '../../utils/pdf/pdfjsLoader';

/** Oppgave-PDF rendret med pdf.js til canvas (likt i SEB for Windows og macOS). */
export default function PdfCanvasViewer({ pdfPath }) {
  const containerRef = useRef(null);
  const docRef = useRef(null);
  const [status, setStatus] = useState('loading');
  const [scale, setScale] = useState(1.2);
  const [pageCount, setPageCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let task = null;
    fetchPromptPdf(pdfPath)
      .then((bytes) => {
        task = loadPdf(bytes);
        return task.promise;
      })
      .then((doc) => {
        if (cancelled) return;
        docRef.current = doc;
        setPageCount(doc.numPages);
        setStatus('ready');
      })
      .catch(() => !cancelled && setStatus('error'));
    return () => {
      cancelled = true;
      task?.destroy();
    };
  }, [pdfPath]);

  const render = useCallback(async () => {
    const doc = docRef.current;
    const host = containerRef.current;
    if (!doc || !host) return;
    host.replaceChildren();
    const ratio = window.devicePixelRatio || 1;
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.floor(viewport.width * ratio);
      canvas.height = Math.floor(viewport.height * ratio);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;
      canvas.className = 'mx-auto mb-4 bg-white shadow-lg max-w-none';
      canvas.setAttribute('aria-label', `Side ${n} av ${doc.numPages}`);
      host.appendChild(canvas);
      await page.render({ canvas, canvasContext: canvas.getContext('2d'), viewport, transform: ratio !== 1 ? [ratio, 0, 0, ratio, 0, 0] : null }).promise;
    }
  }, [scale]);

  useEffect(() => {
    if (status === 'ready') render();
  }, [status, render]);

  if (status === 'error') {
    return (
      <div className="p-4 m-4 rounded-2xl bg-amber-950 border border-amber-600 text-amber-100 text-sm flex gap-2">
        <AlertTriangle size={16} className="shrink-0 mt-0.5" aria-hidden="true" /> Kunne ikke laste oppgave-PDF-en. Last siden inn på nytt (teksten din er lagret).
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between gap-2 px-3 py-1.5 border-b border-slate-800 bg-slate-900 text-xs text-slate-300">
        <span>{status === 'ready' ? `${pageCount} side${pageCount === 1 ? '' : 'r'}` : 'Laster PDF...'}</span>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setScale((s) => Math.max(0.6, +(s - 0.2).toFixed(1)))} aria-label="Zoom ut" className="p-1.5 rounded-lg hover:bg-slate-800"><ZoomOut size={15} /></button>
          <span className="w-10 text-center tabular-nums">{Math.round(scale * 100)}%</span>
          <button type="button" onClick={() => setScale((s) => Math.min(3, +(s + 0.2).toFixed(1)))} aria-label="Zoom inn" className="p-1.5 rounded-lg hover:bg-slate-800"><ZoomIn size={15} /></button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4 bg-slate-800">
        {status === 'loading' && <Loader2 size={24} className="animate-spin text-emerald-400 mx-auto mt-10" aria-hidden="true" />}
        <div ref={containerRef} />
      </div>
    </div>
  );
}
