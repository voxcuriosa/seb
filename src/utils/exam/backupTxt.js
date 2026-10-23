/**
 * backupTxt.js
 * «Last ned sikkerhetskopi (.txt)» hvis eleven må bytte maskin under prøven.
 * Filen lastes ned lokalt. Den sendes ikke noe sted.
 */
import { formatDateTime } from './formatTime';

export function downloadBackupTxt({ examTitle, text }) {
  const header = `Sikkerhetskopi - ${examTitle}\nLaget ${formatDateTime(new Date().toISOString())}\n` +
    'Dette er IKKE en innlevering. Lim teksten inn igjen hvis du må bytte maskin.\n\n';
  const blob = new Blob([header + (text || '')], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const slug = String(examTitle || 'prove').toLowerCase().replace(/[^a-z0-9æøå]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 35);
  a.href = url;
  a.download = `sikkerhetskopi-${slug || 'prove'}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
