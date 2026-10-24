/**
 * formatTime.js
 * Norsk formatering av tidspunkt og varighet.
 * Tidspunkter formateres alltid i Europe/Oslo slik at PDF-en kan rendres identisk på nytt
 * i lærerens nettleser (lag 2-verifisering), uavhengig av maskinens tidssone.
 */
const pad = (n) => String(n).padStart(2, '0');

const osloParts = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Oslo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23'
});

function partsOf(date) {
  const map = {};
  for (const p of osloParts.formatToParts(date)) map[p.type] = p.value;
  return map;
}

export function formatDateTime(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'ukjent tidspunkt';
  const p = partsOf(d);
  return `${p.day}.${p.month}.${p.year} kl. ${p.hour}:${p.minute}:${p.second}`;
}

export function formatClock(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function formatDuration(totalSeconds = 0) {
  const s = Math.max(0, Math.round(Number(totalSeconds) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h} t ${m} min`;
  if (m > 0) return `${m} min`;
  return `${s} s`;
}

export function formatStopwatch(totalSeconds = 0) {
  const s = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}
