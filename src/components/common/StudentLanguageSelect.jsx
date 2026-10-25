import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import CountryFlag from './CountryFlag';
import { SEB_START_LANGUAGES } from '../../utils/seb/sebStartTranslations';

export default function StudentLanguageSelect({
  value = 'no',
  onChange,
  id = 'seb-student-lang',
  compact = false
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const activeLang = SEB_START_LANGUAGES.find((l) => l.code === value) || SEB_START_LANGUAGES[0];

  useEffect(() => {
    if (!open) return undefined;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const handleEsc = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [open]);

  const handleSelect = (code) => {
    onChange?.(code);
    setOpen(false);
  };

  const getButtonLabel = (item) => {
    if (item.code === 'no') return compact ? 'Bokmål' : 'Norsk (bokmål)';
    if (item.code === 'nn') return compact ? 'Nynorsk' : 'Norsk (nynorsk)';
    return compact ? item.nativeLabel : `${item.nativeLabel} (${item.label})`;
  };

  return (
    <div ref={containerRef} className="relative inline-block shrink-0 z-30">
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Valgt språk: ${activeLang.label}. Klikk for å endre språk.`}
        title="Velg språk / Choose language"
        onClick={() => setOpen((prev) => !prev)}
        className={`inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-850 border border-slate-700 hover:border-slate-600 rounded-xl text-xs font-bold text-slate-100 transition-colors cursor-pointer shadow-sm ${
          compact ? 'px-2 py-1.5' : 'px-3 py-2'
        }`}
      >
        <CountryFlag code={activeLang.code} width={18} height={12} />
        <span className="truncate max-w-[9rem] sm:max-w-[12rem]">{getButtonLabel(activeLang)}</span>
        <ChevronDown
          size={13}
          className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Språkvelger"
          className="absolute right-0 sm:right-auto sm:left-0 top-full mt-1.5 z-50 w-72 rounded-2xl border border-slate-700 bg-slate-900/98 shadow-2xl py-1.5 max-h-80 overflow-y-auto"
        >
          <div className="px-3 py-1 text-[11px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-800">
            Norske målformer
          </div>

          {SEB_START_LANGUAGES.filter((l) => l.code === 'no' || l.code === 'nn').map((item) => {
            const isSelected = item.code === value;
            return (
              <li key={item.code} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  onClick={() => handleSelect(item.code)}
                  className={`w-full px-3 py-2 text-left text-xs font-bold flex items-center justify-between gap-2.5 transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-500/15 text-emerald-300'
                      : 'text-slate-200 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <span className="inline-flex items-center gap-2.5 min-w-0">
                    <CountryFlag code={item.code} width={20} height={14} />
                    <span className="truncate">{item.label}</span>
                  </span>
                  {isSelected && <Check size={14} className="text-emerald-400 shrink-0" aria-hidden="true" />}
                </button>
              </li>
            );
          })}

          <div className="px-3 py-1 mt-1 text-[11px] font-black uppercase tracking-wider text-slate-400 border-t border-b border-slate-800">
            Andre språk ({SEB_START_LANGUAGES.length - 2})
          </div>

          {SEB_START_LANGUAGES.filter((l) => l.code !== 'no' && l.code !== 'nn').map((item) => {
            const isSelected = item.code === value;
            return (
              <li key={item.code} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  onClick={() => handleSelect(item.code)}
                  className={`w-full px-3 py-2 text-left text-xs font-bold flex items-center justify-between gap-2.5 transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-500/15 text-emerald-300'
                      : 'text-slate-200 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <span className="inline-flex items-center gap-2.5 min-w-0">
                    <CountryFlag code={item.code} width={20} height={14} />
                    <span className="truncate">
                      {item.nativeLabel}{' '}
                      <span className="text-[11px] text-slate-400 font-normal">({item.label})</span>
                    </span>
                  </span>
                  {isSelected && <Check size={14} className="text-emerald-400 shrink-0" aria-hidden="true" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
