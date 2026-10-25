import { Globe } from 'lucide-react';
import { SEB_START_LANGUAGES } from '../../utils/seb/sebStartTranslations';

export default function StudentLanguageSelect({ value = 'no', onChange, id = 'seb-student-lang', compact = false }) {
  return (
    <div
      className={`inline-flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl ${
        compact ? 'px-2 py-1' : 'px-2.5 py-1.5'
      } shrink-0`}
    >
      <Globe size={compact ? 13 : 14} className="text-emerald-400 shrink-0" aria-hidden="true" />
      <label htmlFor={id} className="sr-only">
        Språk / Language
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="bg-transparent text-xs font-bold text-slate-100 focus:outline-none cursor-pointer pr-1 max-w-[11rem]"
        title="Velg språk for hjelpetekst og knapper / Choose language"
      >
        {SEB_START_LANGUAGES.map((l) => (
          <option key={l.code} value={l.code} className="bg-slate-900 text-slate-100">
            {l.code === 'no' || l.code === 'nn' ? l.label : `${l.nativeLabel} (${l.label})`}
          </option>
        ))}
      </select>
    </div>
  );
}
