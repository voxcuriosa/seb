/**
 * useSubmissions.js
 * Holder innlastede besvarelser KUN i minnet (forsvinner når fanen lukkes).
 * Elevnavn fra Teams-mapper forlater aldri lærerens nettleser.
 */
import { useCallback, useState } from 'react';

const ORDER = { invalid: 0, 'verified-unsigned': 1, verified: 2, 'not-curiosa': 3 };

function itemRank(item) {
  if (item.verdict === 'invalid') return 0;
  if (item.isDuplicate || item.examIdMismatch) return 0.5;
  return ORDER[item.verdict] ?? 9;
}

function sameSubmissionIdentity(a, b) {
  if (!a || !b) return false;
  if (a.sha256 && b.sha256 && a.sha256 === b.sha256) return true;
  if (a.signature && b.signature && a.signature === b.signature) return true;
  if (a.receiptCode && b.receiptCode && a.receiptCode === b.receiptCode) return true;
  return false;
}

/**
 * Analyserer hele bunken for duplikater (lik sha256, signatur eller kvitteringskode)
 * og sammenblanding av ulike examId på tvers av opplastede filer.
 */
export function analyzeSubmissionBatch(rawItems = []) {
  const examCounts = new Map();
  for (const item of rawItems) {
    const examId = item?.payload?.examId;
    if (examId) {
      examCounts.set(examId, (examCounts.get(examId) || 0) + 1);
    }
  }

  const hasMultipleExams = examCounts.size > 1;
  let majorityExamId = null;
  if (hasMultipleExams) {
    let maxCount = 0;
    let leaders = [];
    for (const [examId, count] of examCounts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        leaders = [examId];
      } else if (count === maxCount) {
        leaders.push(examId);
      }
    }
    majorityExamId = leaders.length === 1 ? leaders[0] : null;
  }

  const annotated = rawItems.map((item) => {
    const p = item?.payload;
    if (!p) {
      return {
        ...item,
        isDuplicate: false,
        duplicateOf: null,
        examIdMismatch: false,
        expectedExamId: majorityExamId
      };
    }

    const dupMatches = rawItems.filter(
      (other) => other.id !== item.id && sameSubmissionIdentity(p, other.payload)
    );
    const isDuplicate = dupMatches.length > 0;
    const duplicateOf = isDuplicate
      ? dupMatches.map((m) => m.folderName || m.fileName).join(', ')
      : null;

    const examId = p.examId || '';
    const examIdMismatch = Boolean(
      hasMultipleExams && examId && (!majorityExamId || examId !== majorityExamId)
    );

    return {
      ...item,
      isDuplicate,
      duplicateOf,
      examIdMismatch,
      expectedExamId: majorityExamId
    };
  });

  return annotated.sort((a, b) =>
    itemRank(a) - itemRank(b)
    || String(a.folderName || a.fileName).localeCompare(String(b.folderName || b.fileName), 'nb')
  );
}

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
      return analyzeSubmissionBatch([...map.values()]);
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
