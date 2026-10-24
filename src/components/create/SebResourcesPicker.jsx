import { useState } from 'react';
import { Check, Globe, Plus, X } from 'lucide-react';
import { PRESET_SEB_APPS, PRESET_SEB_WEBSITES, cleanDomainFromUrl, normalizeWebsiteUrl, isValidDomain } from '../../utils/seb/sebPresets';

function CheckTile({ selected, onClick, title, subtitle }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`p-3 rounded-2xl border text-left transition-colors flex items-start gap-2.5 ${
        selected ? 'bg-emerald-500/10 border-emerald-500/50 text-white' : 'bg-slate-950 border-slate-800 hover:border-slate-600 text-slate-300'
      }`}
    >
      <span className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 mt-0.5 border ${
        selected ? 'bg-emerald-500 border-emerald-400 text-slate-950' : 'border-slate-600 bg-slate-900 text-transparent'
      }`}>
        <Check size={12} strokeWidth={3} aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-black truncate">{title}</span>
        <span className="block text-[11px] text-slate-400 truncate">{subtitle}</span>
      </span>
    </button>
  );
}

/** Steg 2: hjelpemidler og nettsider (gjenbrukt fra voxkunnskap SebConfigModal). */
export default function SebResourcesPicker({
  allowedApps,
  setAllowedApps,
  websites,
  setWebsites,
  pendingCustom,
  setPendingCustom
}) {
  const [localCustom, setLocalCustom] = useState({ title: '', url: '' });
  const [customError, setCustomError] = useState('');

  const custom = pendingCustom ?? localCustom;
  const updateCustom = setPendingCustom ?? setLocalCustom;
  const customTitle = custom.title;
  const customUrl = custom.url;
  const setCustomTitle = (title) => updateCustom((prev) => ({ ...prev, title }));
  const setCustomUrl = (url) => updateCustom((prev) => ({ ...prev, url }));

  const toggleApp = (id) => setAllowedApps((prev) => ({ ...prev, [id]: !prev[id] }));
  const isPresetSelected = (p) => websites.some((w) => w.id === p.id || cleanDomainFromUrl(w.url) === p.domain);
  const togglePreset = (p) => {
    if (isPresetSelected(p)) {
      setWebsites((prev) => prev.filter((w) => w.id !== p.id && cleanDomainFromUrl(w.url) !== p.domain));
    } else {
      setWebsites((prev) => [...prev, { id: p.id, title: p.title, url: p.url, domain: p.domain }]);
    }
  };

  const addCustom = (e) => {
    e.preventDefault();
    setCustomError('');
    const url = normalizeWebsiteUrl(customUrl);
    const domain = cleanDomainFromUrl(url);
    if (!isValidDomain(domain)) return setCustomError('Oppgi en gyldig nettadresse (f.eks. regjeringen.no).');
    if (websites.some((w) => cleanDomainFromUrl(w.url) === domain)) {
      updateCustom({ title: '', url: '' });
      return setCustomError('Denne nettsiden er allerede lagt til.');
    }
    if (websites.length >= 20) return setCustomError('Maks 20 nettsider.');
    setWebsites((prev) => [...prev, { id: `custom_${Date.now()}`, title: customTitle.trim() || domain, url, domain }]);
    updateCustom({ title: '', url: '' });
  };

  const customSites = websites.filter((w) => !PRESET_SEB_WEBSITES.some((p) => p.id === w.id));

  return (
    <div className="space-y-6">
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex gap-3 text-xs leading-relaxed text-slate-300">
        <Globe size={18} className="shrink-0 text-emerald-400 mt-0.5" aria-hidden="true" />
        <p>Valgte hjelpemidler og nettsider får egne ikoner i oppgavelinjen i SEB og hurtigknapper i prøverommet. Resten av internett sperres av SEBs URL-filter.</p>
      </div>

      <section>
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 mb-1">Installerte hjelpemidler</h3>
        <p className="text-xs text-slate-400 mb-3">Programmene må være installert på elevens maskin (Mac eller Windows).</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {PRESET_SEB_APPS.map((app) => (
            <CheckTile key={app.id} selected={Boolean(allowedApps[app.id])} onClick={() => toggleApp(app.id)} title={app.title} subtitle={app.subtitle} />
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 mb-1">Nettbaserte ordbøker og skolekilder</h3>
        <p className="text-xs text-slate-400 mb-3">Åpnes i eget SEB-vindu uten adressefelt (Clarify støtter Feide-innlogging).</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {PRESET_SEB_WEBSITES.map((p) => (
            <CheckTile key={p.id} selected={isPresetSelected(p)} onClick={() => togglePreset(p)} title={p.title} subtitle={p.domain} />
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 mb-2">Legg til egne nettsider</h3>
        <form onSubmit={addCustom} className="grid grid-cols-1 sm:grid-cols-[1fr_2fr_auto] gap-2">
          <input value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} placeholder="Tittel (f.eks. Regjeringen)" aria-label="Tittel på nettside"
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500" />
          <input value={customUrl} onChange={(e) => setCustomUrl(e.target.value)} placeholder="Nettadresse (f.eks. regjeringen.no)" aria-label="Nettadresse"
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500" />
          <button
            type="submit"
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-1.5 transition-colors ${
              customUrl.trim()
                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                : 'bg-slate-800 hover:bg-slate-700 text-white'
            }`}
          >
            <Plus size={14} aria-hidden="true" /> Legg til
          </button>
        </form>
        {customError && <p className="text-sm font-bold text-red-300 mt-2" role="alert">{customError}</p>}
        {customSites.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {customSites.map((w) => (
              <li key={w.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm">
                <span className="text-white truncate">{w.title} <span className="text-slate-400">({w.domain})</span></span>
                <button type="button" onClick={() => setWebsites((prev) => prev.filter((x) => x.id !== w.id))} aria-label={`Fjern ${w.title}`}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"><X size={14} /></button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
