import { TRANSLATIONS_PART_1 } from './sebStartTranslationsPart1';
import { TRANSLATIONS_PART_2 } from './sebStartTranslationsPart2';
import { EXAM_TRANSLATIONS_PART_1 } from './sebExamTranslationsPart1';
import { EXAM_TRANSLATIONS_PART_2 } from './sebExamTranslationsPart2';

export const SEB_START_LANGUAGES = [
  { code: 'no', label: 'Norsk (bokmål)', nativeLabel: 'Norsk (bokmål)' },
  { code: 'nn', label: 'Norsk (nynorsk)', nativeLabel: 'Norsk (nynorsk)' },
  { code: 'en', label: 'Engelsk', nativeLabel: 'English' },
  { code: 'de', label: 'Tysk', nativeLabel: 'Deutsch' },
  { code: 'es', label: 'Spansk', nativeLabel: 'Español' },
  { code: 'fr', label: 'Fransk', nativeLabel: 'Français' },
  { code: 'ar', label: 'Arabisk', nativeLabel: 'العربية', rtl: true },
  { code: 'uk', label: 'Ukrainsk', nativeLabel: 'Українська' },
  { code: 'ru', label: 'Russisk', nativeLabel: 'Русский' },
  { code: 'th', label: 'Thai', nativeLabel: 'ไทย' },
  { code: 'tr', label: 'Tyrkisk', nativeLabel: 'Türkçe' },
  { code: 'pl', label: 'Polsk', nativeLabel: 'Polski' },
  { code: 'so', label: 'Somali', nativeLabel: 'Soomaali' },
  { code: 'fa', label: 'Persisk / Dari', nativeLabel: 'فارسی / دری', rtl: true },
  { code: 'vi', label: 'Vietnamesisk', nativeLabel: 'Tiếng Việt' },
  { code: 'ku', label: 'Kurdisk', nativeLabel: 'Kurdî (Kurmancî)' },
  { code: 'ti', label: 'Tigrinja', nativeLabel: 'ትግርኛ' },
  { code: 'lt', label: 'Litauisk', nativeLabel: 'Lietuvių' },
  { code: 'it', label: 'Italiensk', nativeLabel: 'Italiano' },
  { code: 'pt', label: 'Portugisisk', nativeLabel: 'Português' }
];

const START_ALL = { ...TRANSLATIONS_PART_1, ...TRANSLATIONS_PART_2 };
const EXAM_ALL = { ...EXAM_TRANSLATIONS_PART_1, ...EXAM_TRANSLATIONS_PART_2 };

const ALL_TRANSLATIONS = Object.fromEntries(
  SEB_START_LANGUAGES.map(({ code }) => [
    code,
    {
      ...START_ALL.no,
      ...EXAM_ALL.no,
      ...(START_ALL[code] || {}),
      ...(EXAM_ALL[code] || {})
    }
  ])
);

export function getSebStartTranslation(code) {
  return ALL_TRANSLATIONS[code] || ALL_TRANSLATIONS.no;
}
