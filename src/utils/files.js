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

/**
 * Leser filer fra dra-og-slipp, inkludert hele mapper (Teams «Student Work»).
 * Kopiert fra voxkunnskap/src/components/admin/LocalExamPdfGraderModal.jsx.
 */
export async function getFilesFromDataTransfer(dataTransfer) {
  if (!dataTransfer) return [];
  const files = [];
  const items = Array.from(dataTransfer.items || []);

  async function traverseEntry(entry) {
    if (!entry) return;
    if (entry.isFile) {
      try {
        const file = await new Promise((resolve, reject) => entry.file(resolve, reject));
        if (file) {
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
      try {
        const dirReader = entry.createReader();
        const readBatch = () => new Promise((resolve, reject) => dirReader.readEntries(resolve, reject));
        let batch = await readBatch();
        while (batch && batch.length > 0) {
          for (const child of batch) {
            await traverseEntry(child);
          }
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
      await traverseEntry(entry);
    }
  }

  if (files.length === 0 && dataTransfer.files) {
    return Array.from(dataTransfer.files);
  }
  return files;
}
