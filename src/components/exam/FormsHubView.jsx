import { ExternalLink, FileSpreadsheet, Globe, LogOut } from 'lucide-react';

/**
 * FormsHubView.jsx
 * Viser Microsoft Forms-startknapp og alle tillatte nettbaserte hjelpemidler (f.eks. Clarify, SNL, NDLA)
 * i hovedvinduet i SEB, slik at eleven alltid har full oversikt over lenkene og kan åpne dem i egne SEB-vinduer.
 */
export default function FormsHubView({ title, formsUrl, websites = [], onExit }) {
  const nonFormsSites = websites.filter(
    (w) => w?.url && w?.id !== 'web_forms_main' && !/forms\.(office\.com|microsoft\.com|cloud\.microsoft)/i.test(w.url)
  );

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-slate-950 p-6 sm:p-10 flex items-center justify-center">
      <div className="w-full max-w-2xl space-y-6">
        <section className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-5 shadow-xl">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <FileSpreadsheet size={24} aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
                Microsoft Forms-prøve
              </span>
              <h2 className="text-xl font-black text-white">{title}</h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                Klikk på den grønne knappen under for å åpne Microsoft Forms-prøven i et eget SEB-vindu. Dette vinduet blir liggende åpent i bakgrunnen med alle tillatte nettsider og ordbøker, slik at du når som helst kan bytte mellom vinduene.
              </p>
            </div>
          </div>

          <a
            href={formsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-4 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm uppercase tracking-wider inline-flex items-center justify-center gap-2 transition-colors shadow-lg"
          >
            <FileSpreadsheet size={18} aria-hidden="true" />
            <span>Åpne Microsoft Forms-prøven</span>
            <ExternalLink size={16} aria-hidden="true" />
          </a>
        </section>

        {nonFormsSites.length > 0 && (
          <section className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
            <div className="flex items-center gap-2.5">
              <Globe size={18} className="text-emerald-400 shrink-0" aria-hidden="true" />
              <h3 className="text-sm font-black uppercase tracking-wider text-white">
                Tillatte nettsider og ordbøker på denne prøven
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              Klikk på en ressurs for å åpne den i et eget vindu ved siden av Forms-prøven:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {nonFormsSites.map((site) => (
                <a
                  key={site.id || site.url}
                  href={site.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  referrerPolicy="no-referrer"
                  className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-emerald-500/60 hover:bg-slate-900/80 flex items-center justify-between gap-3 transition-colors group"
                >
                  <div className="min-w-0">
                    <span className="block text-sm font-bold text-white group-hover:text-emerald-300 truncate">
                      {site.title || site.domain}
                    </span>
                    <span className="block text-xs text-slate-400 truncate font-mono">
                      {site.domain || site.url}
                    </span>
                  </div>
                  <ExternalLink size={16} className="text-slate-400 group-hover:text-emerald-400 shrink-0" aria-hidden="true" />
                </a>
              ))}
            </div>
          </section>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onExit}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-white text-xs font-black uppercase tracking-wider transition-colors"
          >
            <LogOut size={15} aria-hidden="true" />
            <span>Jeg har sendt inn Forms – Avslutt SEB</span>
          </button>
        </div>
      </div>
    </div>
  );
}
