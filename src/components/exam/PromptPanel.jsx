import { useMemo } from 'react';
import PdfCanvasViewer from './PdfCanvasViewer';
import { sanitizeHtml, htmlToPlainText } from '../../utils/sanitize';

/**
 * Legger kun ren tekst (text/plain) på utklippstavlen ved kopiering av oppgaveteksten,
 * slik at Lingdys på macOS slipper å kjøre /usr/bin/textutil (~750 ms) på public.html.
 */
function handlePlainCopy(e) {
  const text = window.getSelection?.()?.toString() || '';
  if (!text || !e.clipboardData) return;
  e.preventDefault();
  e.clipboardData.clearData();
  e.clipboardData.setData('text/plain', text);
}

/** Venstre/øvre panel: oppgavetekst (sanert HTML) og/eller oppgave-PDF. */
export default function PromptPanel({ exam }) {
  const html = useMemo(() => sanitizeHtml(exam.promptHtml || ''), [exam.promptHtml]);
  const hasText = Boolean(htmlToPlainText(exam.promptHtml || ''));
  const validPdfPath =
    typeof exam?.pdfPath === 'string' &&
    typeof exam?.id === 'string' &&
    exam.id.length > 0 &&
    exam.pdfPath.startsWith(`sebExams/${exam.id}/`)
      ? exam.pdfPath
      : null;

  return (
    <div className="h-full flex flex-col bg-slate-950 min-h-0">
      {hasText && (
        <div
          onCopy={handlePlainCopy}
          className={`${validPdfPath ? 'max-h-[35%] border-b border-slate-800' : 'flex-1'} overflow-auto px-6 py-5`}
        >
          {/* Sanert to ganger: sanitize-html på serveren og DOMPurify her. */}
          <div className="prompt-html" lang="nb-NO" dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      )}
      {validPdfPath && (
        <div className="flex-1 min-h-0">
          <PdfCanvasViewer pdfPath={validPdfPath} />
        </div>
      )}
    </div>
  );
}
