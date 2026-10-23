/**
 * pdfjsLoader.js
 * Laster pdfjs-dist (legacy-bygg for eldre Chromium/WebKit i Safe Exam Browser).
 */
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import pdfWorkerUrl from 'pdfjs-dist/legacy/build/pdf.worker.mjs?url';

if (pdfjsLib?.GlobalWorkerOptions && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
}

const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined' && !import.meta.env?.VITEST;

/** Standardfonter (Helvetica o.l.) for korrekt rendering av PDF-er uten innebygde fonter. */
const STANDARD_FONT_DATA_URL = isBrowser ? `${import.meta.env.BASE_URL}pdfjs/standard_fonts/` : undefined;

export function loadPdf(data) {
  return pdfjsLib.getDocument({
    data,
    enableScripting: false,
    isEvalSupported: false,
    standardFontDataUrl: STANDARD_FONT_DATA_URL,
    useSystemFonts: false,
    verbosity: 0
  });
}

export async function extractVisibleText(data) {
  const task = loadPdf(data);
  try {
    const doc = await task.promise;
    const pages = [];
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      const content = await page.getTextContent();
      pages.push(content.items.map((it) => it.str).join(' '));
    }
    return pages.join('\n');
  } finally {
    await task.destroy();
  }
}

export { pdfjsLib };
