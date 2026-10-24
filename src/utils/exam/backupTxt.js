/**
 * backupTxt.js
 * «Last ned sikkerhetskopi (.txt)» hvis eleven må bytte maskin under prøven.
 * Filen lastes ned lokalt. Den sendes ikke noe sted.
 */
import { formatDateTime } from './formatTime';

export function downloadBackupTxt({ examTitle, text }) {
  const header = `Sikkerhetskopi - ${examTitle}\nLaget ${formatDateTime(new Date().toISOString())}\n` +
    'Dette er IKKE en innlevering. Lim teksten inn igjen hvis du må bytte maskin.\n\n';
  const fullText = header + (text || '');
  const slug = String(examTitle || 'prove').toLowerCase().replace(/[^a-z0-9æøå]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 35);
  const useDataUri = typeof navigator !== 'undefined' && /SEB|SafeExamBrowser/i.test(navigator.userAgent || '');
  const url = useDataUri
    ? `data:text/plain;charset=utf-8,${encodeURIComponent(fullText)}`
    : URL.createObjectURL(new Blob([fullText], { type: 'text/plain;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `sikkerhetskopi-${slug || 'prove'}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  if (!useDataUri) {
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
}
