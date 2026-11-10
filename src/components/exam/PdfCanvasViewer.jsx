import { useEffect, useRef, useState } from 'react';
import { ZoomIn, ZoomOut, Loader2, AlertTriangle } from 'lucide-react';
import { fetchPromptPdf } from '../../firebase';
import { loadPdf } from '../../utils/pdf/pdfjsLoader';

const MAX_CANVAS_PX = 4096;

function PdfPageCanvas({ doc, pageNumber, totalPages, scale, cssWidth, cssHeight }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!doc || !canvas) return undefined;

    let cancelled = false;
    let renderTask = null;

    (async () => {
      try {
        const page = await doc.getPage(pageNumber);
        if (cancelled) return;
        const viewport = page.getViewport({ scale });
        const dpr = Math.min(2.5, window.devicePixelRatio || 1);
        const dimCap = MAX_CANVAS_PX / Math.max(1, viewport.width, viewport.height);
        const ratio = Math.max(0.5, Math.min(dpr, dimCap));

        canvas.width = Math.max(1, Math.floor(viewport.width * ratio));
        canvas.height = Math.max(1, Math.floor(viewport.height * ratio));
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx || cancelled) return;

        renderTask = page.render({
          canvas,
          canvasContext: ctx,
          viewport,
          transform: ratio !== 1 ? [ratio, 0, 0, ratio, 0, 0] : null
        });
        await renderTask.promise;
      } catch {
        /* Ignorer RenderingCancelledException ved rask rulling eller zoom */
      }
    })();

    return () => {
      cancelled = true;
      try {
        renderTask?.cancel();
      } catch {
        /* Allerede ferdig */
      }
      if (canvas) {
        canvas.width = 0;
        canvas.height = 0;
      }
    };
  }, [doc, pageNumber, scale]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: `${cssWidth}px`, height: `${cssHeight}px` }}
      aria-label={`Side ${pageNumber} av ${totalPages}`}
      className="block w-full h-full bg-white"
    />
  );
}

function PdfCanvasViewerBody({ pdfPath }) {
  const scrollRef = useRef(null);
  const slotRefs = useRef(new Map());
  const [pdfDoc, setPdfDoc] = useState(null);
  const [pagesMeta, setPagesMeta] = useState([]);
  const [visiblePages, setVisiblePages] = useState(() => new Set([1, 2]));
  const [status, setStatus] = useState('loading');
  const [scale, setScale] = useState(1.2);
  const supportsObserver = typeof IntersectionObserver !== 'undefined';

  useEffect(() => {
    let cancelled = false;
    let loadingTask = null;
    let loadedDoc = null;

    fetchPromptPdf(pdfPath)
      .then((bytes) => {
        if (cancelled) return null;
        loadingTask = loadPdf(bytes);
        return loadingTask.promise;
      })
      .then(async (doc) => {
        if (!doc || cancelled) return;
        loadedDoc = doc;
        const metas = [];
        for (let n = 1; n <= doc.numPages; n++) {
          const page = await doc.getPage(n);
          if (cancelled) return;
          const vp = page.getViewport({ scale: 1 });
          metas.push({ pageNumber: n, baseWidth: vp.width, baseHeight: vp.height });
        }
        if (cancelled) return;
        setPdfDoc(doc);
        setPagesMeta(metas);
        setVisiblePages(new Set([1, 2]));
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });

    return () => {
      cancelled = true;
      try {
        loadedDoc?.destroy();
      } catch {
        /* ignorer */
      }
      try {
        loadingTask?.destroy();
      } catch {
        /* ignorer */
      }
    };
  }, [pdfPath]);

  useEffect(() => {
    const root = scrollRef.current;
    if (status !== 'ready' || !pagesMeta.length || !root || !supportsObserver) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        setVisiblePages((prev) => {
          const next = new Set(prev);
          let changed = false;
          for (const entry of entries) {
            const num = Number(entry.target.getAttribute('data-page-number'));
            if (!Number.isFinite(num)) continue;
            if (entry.isIntersecting) {
              if (!next.has(num)) {
                next.add(num);
                changed = true;
              }
            } else if (next.has(num)) {
              next.delete(num);
              changed = true;
            }
          }
          return changed ? next : prev;
        });
      },
      { root, rootMargin: '600px 0px', threshold: 0 }
    );

    for (const el of slotRefs.current.values()) {
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [status, pagesMeta, supportsObserver]);

  if (status === 'error') {
    return (
      <div className="p-4 m-4 rounded-2xl bg-amber-950 border border-amber-600 text-amber-100 text-sm flex gap-2">
        <AlertTriangle size={16} className="shrink-0 mt-0.5" aria-hidden="true" /> Kunne ikke laste oppgave-PDF-en. Last siden inn på nytt (teksten din er lagret).
      </div>
    );
  }

  const pageCount = pagesMeta.length;

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between gap-2 px-3 py-1.5 border-b border-slate-800 bg-slate-900 text-xs text-slate-300">
        <span>{status === 'ready' ? `${pageCount} side${pageCount === 1 ? '' : 'r'}` : 'Laster PDF...'}</span>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setScale((s) => Math.max(0.6, +(s - 0.2).toFixed(1)))} aria-label="Zoom ut" className="p-1.5 rounded-lg hover:bg-slate-800">
            <ZoomOut size={15} />
          </button>
          <span className="w-10 text-center tabular-nums">{Math.round(scale * 100)}%</span>
          <button type="button" onClick={() => setScale((s) => Math.min(3, +(s + 0.2).toFixed(1)))} aria-label="Zoom inn" className="p-1.5 rounded-lg hover:bg-slate-800">
            <ZoomIn size={15} />
          </button>
        </div>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-auto p-4 bg-slate-800">
        {status === 'loading' && <Loader2 size={24} className="animate-spin text-emerald-400 mx-auto mt-10" aria-hidden="true" />}
        {status === 'ready' &&
          pagesMeta.map((p) => {
            const cssWidth = Math.max(1, Math.floor(p.baseWidth * scale));
            const cssHeight = Math.max(1, Math.floor(p.baseHeight * scale));
            const isVisible = !supportsObserver || visiblePages.has(p.pageNumber);
            return (
              <div
                key={p.pageNumber}
                data-page-number={p.pageNumber}
                ref={(el) => {
                  if (el) slotRefs.current.set(p.pageNumber, el);
                  else slotRefs.current.delete(p.pageNumber);
                }}
                style={{ width: `${cssWidth}px`, height: `${cssHeight}px` }}
                className="mx-auto mb-4 bg-white shadow-lg max-w-none relative"
              >
                {isVisible && pdfDoc ? (
                  <PdfPageCanvas
                    doc={pdfDoc}
                    pageNumber={p.pageNumber}
                    totalPages={pageCount}
                    scale={scale}
                    cssWidth={cssWidth}
                    cssHeight={cssHeight}
                  />
                ) : (
                  <div
                    aria-label={`Side ${p.pageNumber} av ${pageCount}`}
                    className="w-full h-full flex items-center justify-center text-xs text-slate-400 select-none"
                  >
                    Side {p.pageNumber}
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}

/**
 * Oppgave-PDF rendret med pdf.js til virtualiserte canvas-sider (IntersectionObserver).
 * Kun synlige sider og nabo-sider innenfor 600px holder et aktivt <canvas> i minnet,
 * slik at lange PDF-er ved høy zoom aldri kan gi OOM i Safe Exam Browser.
 */
export default function PdfCanvasViewer({ pdfPath }) {
  return <PdfCanvasViewerBody key={pdfPath} pdfPath={pdfPath} />;
}
