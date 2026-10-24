/**
 * norwegianSpellcheck.js
 * Tiptap/ProseMirror-utvidelse som tegner rød bølgestrek under feilstavede ord
 * basert på de innebygde norske ordbøkene (nb-NO og nn-NO).
 * Sikrer 100 % pålitelig stavekontroll i Safe Exam Browser på både Mac (WKWebView) og Windows.
 */
import { Extension } from '@tiptap/react';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export const spellcheckPluginKey = new PluginKey('norwegianSpellcheck');

const WORD_RE = /[A-Za-zÆØÅæøåÉéÈèÊêÓóÒòÔôÄäÖöÜü]+(?:-[A-Za-zÆØÅæøåÉéÈèÊêÓóÒòÔôÄäÖöÜü]+)*/g;

function computeDecorations(doc, state) {
  if (!state?.checker) return DecorationSet.empty;
  const { checker, ignored } = state;
  const decorations = [];

  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;
    const text = node.text;
    WORD_RE.lastIndex = 0;
    let match;
    while ((match = WORD_RE.exec(text)) !== null) {
      const word = match[0];
      if (word.length < 2) continue;
      if (ignored?.has(word.toLowerCase())) continue;
      if (!checker.isValidWord(word)) {
        const from = pos + match.index;
        const to = from + word.length;
        decorations.push(
          Decoration.inline(from, to, {
            class: 'spell-error',
            'data-spell-word': word,
            'data-spell-from': String(from),
            'data-spell-to': String(to)
          })
        );
      }
    }
  });

  return DecorationSet.create(doc, decorations);
}

export const NorwegianSpellcheck = Extension.create({
  name: 'norwegianSpellcheck',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: spellcheckPluginKey,
        state: {
          init() {
            return {
              checker: null,
              ignored: new Set(),
              decorations: DecorationSet.empty
            };
          },
          apply(tr, prev, oldState, newState) {
            const meta = tr.getMeta(spellcheckPluginKey);
            if (meta) {
              const nextChecker = meta.checker !== undefined ? meta.checker : prev.checker;
              const nextIgnored = new Set(prev.ignored);
              if (meta.ignoreWord) nextIgnored.add(String(meta.ignoreWord).toLowerCase());
              const next = { checker: nextChecker, ignored: nextIgnored, decorations: DecorationSet.empty };
              next.decorations = computeDecorations(newState.doc, next);
              return next;
            }
            if (tr.docChanged && prev.checker) {
              return {
                ...prev,
                decorations: computeDecorations(newState.doc, prev)
              };
            }
            return prev;
          }
        },
        props: {
          decorations(state) {
            return this.getState(state)?.decorations || DecorationSet.empty;
          }
        }
      })
    ];
  }
});
