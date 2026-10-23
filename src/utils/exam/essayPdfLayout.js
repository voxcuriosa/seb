/**
 * essayPdfLayout.js
 * Enkel tekstlayout for pdf-lib: sideskift, ordbryting på tvers av fet/kursiv,
 * understreking, overskrifter og listeinnrykk. All tekst saneres til WinAnsi.
 */
import { rgb } from 'pdf-lib';
import { toWinAnsiSafe } from '../integrity/textNormalize';

export const A4 = [595.28, 841.89];
const MARGIN_X = 56;
const TOP_Y = 785;
const BOTTOM_Y = 70;
const INK = rgb(0.08, 0.1, 0.16);

export function createLayout(pdfDoc, fonts) {
  const state = { page: pdfDoc.addPage(A4), y: TOP_Y };
  const maxWidth = A4[0] - MARGIN_X * 2;

  const fontFor = (run) => {
    if (run.bold && run.italic) return fonts.boldItalic;
    if (run.bold) return fonts.bold;
    if (run.italic) return fonts.italic;
    return fonts.regular;
  };

  const newPage = () => {
    state.page = pdfDoc.addPage(A4);
    state.y = TOP_Y;
  };

  const ensureSpace = (needed) => {
    if (state.y - needed < BOTTOM_Y) newPage();
  };

  const gap = (pts) => {
    state.y -= pts;
  };

  /** Tegner en enkel linje (uten bryting av stil) med automatisk ordbryting. */
  const text = (str, { size = 10, bold = false, color = INK, spacing } = {}) => {
    runs([{ text: str, bold }], { size, color, spacing });
  };

  /**
   * Tegner en sekvens av stilte runs med ordbryting.
   * opts: size, color, spacing, indent (pt), marker (tekst foran første linje)
   */
  const runs = (runList, { size = 11, color = INK, spacing, indent = 0, marker = '' } = {}) => {
    const lineHeight = spacing || size * 1.45;
    const words = [];
    for (const run of runList) {
      const safe = toWinAnsiSafe(run.text);
      const parts = safe.split(/(\s+)/);
      for (const part of parts) {
        if (!part) continue;
        words.push({ ...run, text: part, isSpace: /^\s+$/.test(part) });
      }
    }

    const startX = MARGIN_X + indent;
    const markerWidth = marker ? fonts.regular.widthOfTextAtSize(`${marker} `, size) : 0;
    const textX = startX + markerWidth;
    const avail = maxWidth - indent - markerWidth;

    const lines = [[]];
    let lineWidth = 0;
    for (const w of words) {
      const font = fontFor(w);
      const width = font.widthOfTextAtSize(w.isSpace ? ' ' : w.text, size);
      if (w.isSpace) {
        if (lines[lines.length - 1].length === 0) continue;
        lines[lines.length - 1].push({ ...w, text: ' ', width, font });
        lineWidth += width;
        continue;
      }
      if (lineWidth + width > avail && lines[lines.length - 1].length > 0) {
        const cur = lines[lines.length - 1];
        while (cur.length && cur[cur.length - 1].isSpace) cur.pop();
        lines.push([]);
        lineWidth = 0;
      }
      lines[lines.length - 1].push({ ...w, width, font });
      lineWidth += width;
    }

    lines.forEach((line, idx) => {
      ensureSpace(lineHeight);
      state.y -= lineHeight;
      if (idx === 0 && marker) {
        state.page.drawText(toWinAnsiSafe(marker), { x: startX, y: state.y, size, font: fonts.regular, color });
      }
      let x = textX;
      for (const seg of line) {
        if (!seg.isSpace) {
          state.page.drawText(seg.text, { x, y: state.y, size, font: seg.font, color });
        }
        if (seg.underline) {
          state.page.drawLine({
            start: { x, y: state.y - 1.5 },
            end: { x: x + seg.width, y: state.y - 1.5 },
            thickness: 0.6,
            color
          });
        }
        x += seg.width;
      }
    });
  };

  return { state, text, runs, gap, ensureSpace, newPage, maxWidth, marginX: MARGIN_X };
}

/** Tegner sidefot på alle sider etter at sideantallet er kjent. */
export function drawFooters(pdfDoc, font, makeText) {
  const pages = pdfDoc.getPages();
  pages.forEach((page, idx) => {
    page.drawText(toWinAnsiSafe(makeText(idx + 1, pages.length)), {
      x: MARGIN_X,
      y: 34,
      size: 8,
      font,
      color: rgb(0.4, 0.45, 0.52)
    });
  });
}
