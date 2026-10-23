/**
 * essayDocModel.js
 * Konverterer Tiptap/ProseMirror-JSON til en flat blokkmodell som brukes likt av
 * PDF-generatoren, verifiseringen (lag 2) og visningen i Fane 2.
 *
 * Blokk: { kind: 'paragraph'|'h1'|'h2'|'li', marker: ''|'-'|'1.', indent: 0..n,
 *          lines: [[{ text, bold, italic, underline }]] }
 * (lines = visuelle linjer innenfor blokken, delt ved hardBreak)
 */

function runsFromInline(nodes = []) {
  const lines = [[]];
  for (const node of nodes) {
    if (node.type === 'hardBreak') {
      lines.push([]);
      continue;
    }
    if (node.type !== 'text' || !node.text) continue;
    const marks = new Set((node.marks || []).map((m) => m.type));
    lines[lines.length - 1].push({
      text: node.text,
      bold: marks.has('bold'),
      italic: marks.has('italic'),
      underline: marks.has('underline')
    });
  }
  return lines;
}

function walk(nodes, out, indent, listCtx) {
  for (const node of nodes || []) {
    switch (node.type) {
      case 'paragraph':
        out.push({ kind: 'paragraph', marker: '', indent, lines: runsFromInline(node.content) });
        break;
      case 'heading': {
        const level = Number(node.attrs?.level) === 1 ? 'h1' : 'h2';
        out.push({ kind: level, marker: '', indent: 0, lines: runsFromInline(node.content) });
        break;
      }
      case 'bulletList':
        walk(node.content, out, indent, { type: 'bullet' });
        break;
      case 'orderedList': {
        const start = Number(node.attrs?.start) || 1;
        walk(node.content, out, indent, { type: 'ordered', next: start });
        break;
      }
      case 'listItem': {
        const marker = listCtx?.type === 'ordered' ? `${listCtx.next++}.` : '-';
        const [first, ...rest] = node.content || [];
        if (first?.type === 'paragraph') {
          out.push({ kind: 'li', marker, indent: indent + 1, lines: runsFromInline(first.content) });
          walk(rest, out, indent + 1, null);
        } else {
          out.push({ kind: 'li', marker, indent: indent + 1, lines: [[]] });
          walk(node.content, out, indent + 1, null);
        }
        break;
      }
      default:
        if (Array.isArray(node.content)) walk(node.content, out, indent, listCtx);
    }
  }
}

export function docToBlocks(doc) {
  const out = [];
  if (doc && Array.isArray(doc.content)) walk(doc.content, out, 0, null);
  return out;
}

export function lineText(runs = []) {
  return runs.map((r) => r.text).join('');
}

/** Kanonisk ren tekst: det som hashes og det som skal være synlig i PDF-en. */
export function blocksToPlainText(blocks = []) {
  const lines = [];
  for (const b of blocks) {
    b.lines.forEach((runs, idx) => {
      const prefix = idx === 0 && b.marker ? `${b.marker} ` : '';
      lines.push(`${prefix}${lineText(runs)}`);
    });
  }
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

export function docToPlainText(doc) {
  return blocksToPlainText(docToBlocks(doc));
}

/** Minimal Tiptap-JSON fra ren tekst (brukes ved gjenoppretting fra .txt eller fallback). */
export function plainTextToDoc(text = '') {
  const paragraphs = String(text || '').split(/\n/);
  return {
    type: 'doc',
    content: paragraphs.map((p) => ({
      type: 'paragraph',
      content: p ? [{ type: 'text', text: p }] : []
    }))
  };
}
