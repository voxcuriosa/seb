/**
 * editorExtensions.js
 * Felles Tiptap-oppsett. StarterKit v3 inkluderer allerede understreking og angre/gjør om.
 */
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';

export function buildExtensions({ placeholder = '' } = {}) {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2] },
      code: false,
      codeBlock: false,
      blockquote: false,
      horizontalRule: false,
      strike: false,
      link: false
    }),
    Placeholder.configure({ placeholder })
  ];
}
