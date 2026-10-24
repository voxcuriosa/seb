import { X, Code2 } from 'lucide-react';

/** Lærerhjelp. Hold oppdatert ved endringer i funksjonalitet (se AGENTS.md). */
export default function HelpPanel({ onClose }) {
  return (
    <aside className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-slate-700 text-sm text-slate-200 leading-relaxed space-y-4" aria-labelledby="help-title">
      <div className="flex items-center justify-between">
        <h2 id="help-title" className="text-base font-black text-white">Slik bruker du SEB-modulen</h2>
        <button type="button" onClick={onClose} aria-label="Lukk hjelp" className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800"><X size={16} /></button>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        <section>
          <h3 className="font-black text-emerald-300 mb-1">1. Opprett prøve</h3>
          <p>Lås opp med lærer-PIN. Skriv eller lim inn oppgaveteksten, importer en Word-fil, eller last opp en PDF. Velg hjelpemidler og nettsider, og eventuelt et avslutningspassord. Trykk «Lagre og generer».</p>
        </section>
        <section>
          <h3 className="font-black text-emerald-300 mb-1">2. Del i Teams</h3>
          <p>Kopier SEB-lenken inn i en Teams-oppgave. Elevene åpner lenken, laster ned prøvefilen og starter Safe Exam Browser. Teksten lagres fortløpende på elevens maskin og overlever omstart.</p>
        </section>
        <section>
          <h3 className="font-black text-emerald-300 mb-1">3. Kontroller PDF-ene</h3>
          <p>Elevene leverer PDF-en i Teams. Last ned «Student Work»-mappen og slipp den i fane 2. Hver PDF kontrolleres med SHA-256, sammenligning av synlig tekst og serversignatur.</p>
        </section>
      </div>

      <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-xs text-emerald-200 space-y-1">
        <p className="font-bold text-emerald-300">
          Elevarbeid forlater ALDRI nettleseren:
        </p>
        <p className="text-slate-300 leading-relaxed">
          Alt eleven skriver lagres utelukkende lokalt i nettleseren på elevens egen datamaskin. Ved innlevering pakkes teksten som en ferdig PDF direkte i nettleserminnet og lastes ned til maskinen. Ingen elevtekst sendes til noen server eller skytjeneste, og dataene forsvinner fra nettleserminnet når økten lukkes.
        </p>
      </div>

      <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-1">
        <div className="flex items-center gap-1.5 text-white font-bold">
          <Code2 size={14} className="text-emerald-400" />
          <span>100 % Open Source (MIT-lisens):</span>
        </div>
        <p className="leading-relaxed">
          Kildekoden er helt åpen og kan fritt brukes, modifiseres og integreres av alle skoler, kommuner og IT-avdelinger til akkurat det man vil. IT-avdelinger som ønsker full suverenitet kan laste ned og kjøre hele løsningen på egne lokale servere:
        </p>
        <a
          href="https://github.com/voxcuriosa/seb"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-emerald-400 hover:text-emerald-300 font-mono underline mt-0.5"
        >
          https://github.com/voxcuriosa/seb
        </a>
      </div>

      <ul className="text-xs text-slate-300 space-y-1 border-t border-slate-800 pt-3">
        <li><strong className="text-white">Lagring:</strong> Bare lærerens prøveoppsett (tittel, oppgavetekst, innstillinger) lagres i EU, og slettes automatisk etter 90 dager.</li>
        <li><strong className="text-white">Fane 2 (Kontroll):</strong> Har fysisk null nettverkskall – PDF-er fra Teams leses kun lokalt i din nettleser.</li>
        <li><strong className="text-white">Stavekontroll:</strong> Norsk bokmål og nynorsk følger med prøvefilen. Høyreklikk på ord med rød strek for å få forslag.</li>
        <li><strong className="text-white">Statusmerker:</strong> «Verifisert» betyr at alt stemmer. «Verifisert, ikke signert» betyr at eleven var offline ved innlevering. «Ugyldig» betyr at filen er endret etter eksport.</li>
      </ul>
    </aside>
  );
}
