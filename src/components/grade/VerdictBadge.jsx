import { ShieldCheck, ShieldAlert, ShieldQuestion, FileQuestion } from 'lucide-react';

const VARIANTS = {
  verified: { icon: ShieldCheck, label: 'Verifisert', cls: 'bg-emerald-950 text-emerald-200 border-emerald-500/70', title: 'Hash, synlig tekst og serversignatur stemmer.' },
  'verified-unsigned': { icon: ShieldQuestion, label: 'Verifisert, ikke signert', cls: 'bg-amber-950 text-amber-100 border-amber-500/70', title: 'Hash og synlig tekst stemmer, men PDF-en mangler serversignatur (eleven var trolig uten nett ved levering).' },
  invalid: { icon: ShieldAlert, label: 'Ugyldig / endret etter eksport', cls: 'bg-red-950 text-red-100 border-red-500/80', title: 'PDF-en er endret etter at den ble laget i SEB.' },
  'not-curiosa': { icon: FileQuestion, label: 'Ikke en SEB-PDF', cls: 'bg-slate-800 text-slate-200 border-slate-600', title: 'Fant ingen kvittering i filen.' }
};

export default function VerdictBadge({ verdict, compact = false }) {
  const v = VARIANTS[verdict] || VARIANTS['not-curiosa'];
  const Icon = v.icon;
  return (
    <span title={v.title} className={`inline-flex items-center gap-1.5 border rounded-full font-black ${compact ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs'} ${v.cls}`}>
      <Icon size={compact ? 12 : 14} aria-hidden="true" />
      {v.label}
    </span>
  );
}
