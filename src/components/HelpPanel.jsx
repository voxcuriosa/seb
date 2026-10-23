import { X } from 'lucide-react';

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
      <ul className="text-xs text-slate-300 space-y-1 border-t border-slate-800 pt-3">
        <li><strong className="text-white">Personvern:</strong> Elevens tekst, navn og PDF-er forlater aldri nettleseren. Ved levering sendes bare en kontrollsum (hash) til signering.</li>
        <li><strong className="text-white">Lagring:</strong> Bare prøveoppsettet (tittel, oppgavetekst, innstillinger) lagres i EU, og det slettes automatisk etter 90 dager.</li>
        <li><strong className="text-white">Stavekontroll:</strong> Norsk bokmål og nynorsk følger med prøvefilen. Høyreklikk på ord med rød strek for å få forslag. Andre språk krever at språket er installert på maskinen.</li>
        <li><strong className="text-white">Statusmerker:</strong> «Verifisert» betyr at alt stemmer. «Verifisert, ikke signert» betyr at eleven var uten nett ved levering. «Ugyldig» betyr at PDF-en er endret etter eksport.</li>
      </ul>
    </aside>
  );
}
