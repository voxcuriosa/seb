/**
 * sanitize.js
 * Klient-side sanering av HTML (DOMPurify). Serveren sanerer også (sanitize-html),
 * men all HTML saneres på nytt før visning (forsvar i dybden).
 */
import DOMPurify from 'dompurify';

const CONFIG = {
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'sub', 'sup', 'span',
    'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'blockquote', 'hr', 'code', 'pre',
    'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'a', 'img'
  ],
  ALLOWED_ATTR: ['href', 'title', 'src', 'alt', 'width', 'height', 'colspan', 'rowspan', 'start', 'target', 'rel', 'referrerpolicy'],
  ALLOWED_URI_REGEXP: /^(?:https:|mailto:|data:image\/(?:png|jpe?g|gif|webp);base64,)/i,
  FORBID_ATTR: ['style', 'class', 'id']
};

let hooked = false;
function ensureHooks() {
  if (hooked) return;
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A') {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer');
      node.setAttribute('referrerpolicy', 'no-referrer');
    }
    if (node.tagName === 'IMG') {
      node.setAttribute('referrerpolicy', 'no-referrer');
    }
  });
  hooked = true;
}

export function sanitizeHtml(html = '') {
  ensureHooks();
  return DOMPurify.sanitize(String(html || ''), CONFIG);
}

export function htmlToPlainText(html = '') {
  const div = document.createElement('div');
  div.innerHTML = sanitizeHtml(html);
  return (div.textContent || '').trim();
}
