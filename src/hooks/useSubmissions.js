/**
 * useSubmissions.js
 * Holder innlastede besvarelser KUN i minnet (forsvinner når fanen lukkes).
 * Elevnavn fra Teams-mapper forlater aldri lærerens nettleser.
 */
import { useCallback, useState } from 'react';

const ORDER = { invalid: 0, 'verified-unsigned': 1, verified: 2, 'not-curiosa': 3 };

export function useSubmissions() {
  const [items, setItems] = useState([]);
  const [progress, setProgress] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  const addFiles = useCallback(async (files) => {
    const list = Array.from(files || []);
    if (!list.length) return;
    setProgress({ done: 0, total: list.length });
    const { parseExamPdfFiles } = await import('../utils/integrity/examPdfParser');
    const results = await parseExamPdfFiles(list, (done, total) => setProgress({ done, total }));
    setItems((prev) => {
      const map = new Map(prev.map((p) => [p.id, p]));
      results.forEach((r) => map.set(r.id, r));
      return [...map.values()].sort((a, b) =>
        (ORDER[a.verdict] ?? 9) - (ORDER[b.verdict] ?? 9) ||
        String(a.folderName || a.fileName).localeCompare(String(b.folderName || b.fileName), 'nb')
      );
    });
    setSelectedId((cur) => cur || results.find((r) => r.verdict !== 'not-curiosa')?.id || null);
    setProgress(null);
  }, []);

  const clear = useCallback(() => {
    setItems([]);
    setSelectedId(null);
  }, []);

  const selected = items.find((i) => i.id === selectedId) || null;
  return { items, addFiles, clear, progress, selected, setSelectedId };
}
