import { useMemo } from 'react';
import PdfCanvasViewer from './PdfCanvasViewer';
import { sanitizeHtml, htmlToPlainText } from '../../utils/sanitize';

/** Venstre/øvre panel: oppgavetekst (sanert HTML) og/eller oppgave-PDF. */
export default function PromptPanel({ exam }) {
  const html = useMemo(() => sanitizeHtml(exam.promptHtml || ''), [exam.promptHtml]);
  const hasText = Boolean(htmlToPlainText(exam.promptHtml || ''));

  return (
    <div className="h-full flex flex-col bg-slate-950 min-h-0">
      {hasText && (
        <div className={`${exam.pdfPath ? 'max-h-[35%] border-b border-slate-800' : 'flex-1'} overflow-auto px-6 py-5`}>
          {/* Sanert to ganger: sanitize-html på serveren og DOMPurify her. */}
          <div className="prompt-html" lang="nb-NO" dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      )}
      {exam.pdfPath && (
        <div className="flex-1 min-h-0">
          <PdfCanvasViewer pdfPath={exam.pdfPath} />
        </div>
      )}
    </div>
  );
}
