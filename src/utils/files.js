/**
 * files.js
 * Små filhjelpere for lærerens opplasting (alt skjer lokalt i nettleseren).
 */
import { arrayBufferToBase64 } from './seb/sebDictionaries';

export async function fileToBase64(file) {
  return arrayBufferToBase64(await file.arrayBuffer());
}

export async function isPdfFile(file) {
  const head = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  return String.fromCharCode(...head) === '%PDF-';
}

export function formatBytes(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export const MAX_DROP_DEPTH = 12;
export const MAX_DROP_FILES = 500;

/**
 * Leser filer fra dra-og-slipp, inkludert hele mapper (Teams «Student Work»).
 * Begrenset til maks rekursjonsdybde (12) og maks filantall (500).
 * Kopiert fra voxkunnskap/src/components/admin/LocalExamPdfGraderModal.jsx.
 */
export async function getFilesFromDataTransfer(dataTransfer) {
  if (!dataTransfer) return [];
  const files = [];
  const items = Array.from(dataTransfer.items || []);

  async function traverseEntry(entry, depth = 0) {
    if (!entry || files.length >= MAX_DROP_FILES || depth > MAX_DROP_DEPTH) return;
    if (entry.isFile) {
      try {
        const file = await new Promise((resolve, reject) => entry.file(resolve, reject));
        if (file && files.length < MAX_DROP_FILES) {
          if (entry.fullPath) {
            Object.defineProperty(file, 'webkitRelativePath', {
              value: entry.fullPath.replace(/^\//, ''),
              writable: false
            });
          }
          files.push(file);
        }
      } catch (err) {
        console.warn('[PDF-kontroll] Kunne ikke lese fil:', err);
      }
    } else if (entry.isDirectory) {
      if (depth >= MAX_DROP_DEPTH) {
        console.warn('[PDF-kontroll] Maksimum mappedybde nådd.');
        return;
      }
      try {
        const dirReader = entry.createReader();
        const readBatch = () => new Promise((resolve, reject) => dirReader.readEntries(resolve, reject));
        let batch = await readBatch();
        while (batch && batch.length > 0 && files.length < MAX_DROP_FILES) {
          for (const child of batch) {
            if (files.length >= MAX_DROP_FILES) break;
            await traverseEntry(child, depth + 1);
          }
          if (files.length >= MAX_DROP_FILES) break;
          batch = await readBatch();
        }
      } catch (err) {
        console.warn('[PDF-kontroll] Kunne ikke lese mappe:', err);
      }
    }
  }

  if (items.length > 0 && items[0].webkitGetAsEntry) {
    const entries = items.map((item) => item.webkitGetAsEntry?.()).filter(Boolean);
    for (const entry of entries) {
      if (files.length >= MAX_DROP_FILES) break;
      await traverseEntry(entry, 0);
    }
  }

  if (files.length === 0 && dataTransfer.files) {
    return Array.from(dataTransfer.files).slice(0, MAX_DROP_FILES);
  }
  return files;
}
