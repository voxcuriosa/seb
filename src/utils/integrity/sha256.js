/**
 * sha256.js
 * Felles SHA-256-hjelper (WebCrypto). Brukes til payload-hash og avslutningspassord.
 */
export async function sha256Hex(input) {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function generateReceiptCode() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const arr = new Uint8Array(4);
  crypto.getRandomValues(arr);
  return Array.from(arr, (byte) => chars[byte % chars.length]).join('');
}
