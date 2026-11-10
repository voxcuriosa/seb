import { useState } from 'react';
import { Eye, EyeOff, KeyRound, AlertTriangle, ShieldCheck, RefreshCw, Copy, Check } from 'lucide-react';

export const MIN_QUIT_PASSWORD_LENGTH = 12;

const RAW_CODE_WORDS = [
  'sol', 'fjord', 'stein', 'skog', 'vann', 'fjell', 'storm', 'kyst',
  'nord', 'elv', 'breen', 'hav', 'lyn', 'gard', 'tind', 'dal',
  'vind', 'furu', 'gran', 'lyng', 'myr', 'svaberg', 'bekk', 'foss',
  'odde', 'holme', 'sund', 'varde', 'vidde', 'hei', 'eng', 'berg',
  'strand', 'vik', 'nes', 'kolle', 'skar', 'knaus', 'stjerne', 'frost',
  'dugg', 'solgang', 'brim', 'sky', 'regn', 'hagl', 'bris', 'kuling',
  'orkan', 'flod', 'fjare', 'brenning', 'skavl', 'fonn', 'isbre', 'tundra',
  'klippe', 'skrent', 'stup', 'juvet', 'gjel', 'moen', 'lund', 'holt',
  'kratt', 'kilde', 'tjern', 'kanal', 'bukt', 'gapet', 'skagen', 'kapp',
  'terrasse', 'horisont', 'zenit', 'gryning', 'skumring', 'alm', 'ask', 'osp',
  'eik', 'lind', 'pil', 'selje', 'rogn', 'hassel', 'einer', 'barlind',
  'kristtorn', 'lerk', 'poppel', 'platan', 'seder', 'mose', 'lav', 'bregne',
  'siv', 'timian', 'mynte', 'salvie', 'malurt', 'nesle', 'tistel', 'soleie',
  'fiol', 'lilje', 'tulipan', 'iris', 'krokus', 'asters', 'georgine', 'rose',
  'knopp', 'stilk', 'blad', 'rot', 'stamme', 'bark', 'kongle', 'never',
  'elg', 'hjort', 'rein', 'gaupe', 'jerv', 'ulv', 'rev', 'grevling',
  'oter', 'bever', 'ekorn', 'hare', 'piggsvin', 'lemen', 'ilder', 'sel',
  'hval', 'delfin', 'nise', 'torsk', 'sei', 'hyse', 'lange', 'kveite',
  'flyndre', 'makrell', 'sild', 'brisling', 'laks', 'sik', 'abbor', 'gjedde',
  'krabbe', 'hummer', 'reke', 'musling', 'snegle', 'falk', 'hauk', 'hubro',
  'ugle', 'ravn', 'trost', 'spurv', 'meis', 'lerke', 'svale', 'stork',
  'hegre', 'trane', 'svane', 'and', 'skarv', 'terne', 'lunde', 'rype',
  'orrfugl', 'tiur', 'spett', 'gauk', 'stare', 'anker', 'seil', 'mast',
  'ror', 'baug', 'akter', 'dekk', 'lugar', 'lanterne', 'kompass', 'sekstant',
  'kikkert', 'kart', 'varder', 'stier', 'leir', 'telt', 'ryggsekk', 'sovepose',
  'primus', 'termos', 'lykt', 'fakkel', 'stue', 'loft', 'kjeller', 'bjelke',
  'sperre', 'gavlen', 'muren', 'porten', 'ambolt', 'hammer', 'meisel', 'vater',
  'passer', 'linjal', 'blyant', 'kritt', 'blekk', 'papir', 'permen', 'bokstav',
  'kapittel', 'strofe', 'rytme', 'klang', 'akkord', 'melodi', 'harpe', 'fiolin',
  'tromme', 'orgel', 'klaver', 'cymbal', 'basun', 'krystall', 'granitt', 'kvarts',
  'marmor', 'skifer', 'basalt', 'gneis', 'kobber', 'bronse', 'nikkel', 'satin',
  'morgen', 'kveld', 'midnatt', 'vinter', 'sommer', 'april', 'august', 'oktober',
  'november', 'desember', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'komet',
  'planet', 'galakse', 'ekko', 'glimt', 'gnist', 'flamme', 'aske', 'kull',
  'malm', 'smaragd', 'rubin', 'safir', 'topas', 'opal', 'agat', 'jaspis'
];

export const CODE_WORDS = [...new Set(RAW_CODE_WORDS.filter((w) => /^[a-z]+$/.test(w)))];

export function randomUniformInt(max) {
  if (!Number.isInteger(max) || max <= 0 || max > 0x100000000) {
    throw new RangeError('Ugyldig grense for randomUniformInt');
  }
  const limit = 0x100000000 - (0x100000000 % max);
  const buf = new Uint32Array(1);
  for (;;) {
    crypto.getRandomValues(buf);
    if (buf[0] < limit) {
      return buf[0] % max;
    }
  }
}

export function generateReadableCode() {
  const picked = [];
  while (picked.length < 4) {
    const word = CODE_WORDS[randomUniformInt(CODE_WORDS.length)];
    if (!picked.includes(word)) {
      picked.push(word);
    }
  }
  const digits = 100000 + randomUniformInt(900000);
  return `${picked[0]}-${picked[1]}-${picked[2]}-${picked[3]}-${digits}`;
}

/**
 * Avslutningspassord / kodeord.
 * Hashes med SHA-256 før lagring; klarteksten sendes aldri til server.
 * Valgfritt ved ordinære prøver, men påkrevd ved Microsoft Forms.
 */
export default function QuitPasswordField({ value, onChange, required = false }) {
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);

  const trimmed = String(value || '').trim();
  const tooShort = trimmed.length > 0 && trimmed.length < MIN_QUIT_PASSWORD_LENGTH;
  const digitsOnly = trimmed.length >= MIN_QUIT_PASSWORD_LENGTH && /^\d+$/.test(trimmed);

  const handleGenerate = () => {
    const code = generateReadableCode();
    onChange(code);
    setShow(true);
  };

  const handleCopy = async () => {
    if (!trimmed) return;
    try {
      await navigator.clipboard.writeText(trimmed);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* utklippstavle utilgjengelig */
    }
  };

  return (
    <section
      className={`p-4 rounded-2xl border transition-colors ${
        required
          ? 'bg-amber-950/20 border-amber-500/50'
          : 'bg-slate-900 border-slate-800'
      } space-y-2.5`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center gap-2">
          <KeyRound size={15} className={required ? 'text-amber-400' : 'text-emerald-400'} aria-hidden="true" />
          <span>Avslutningspassord / kodeord</span>
          {required ? (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 font-black">
              Påkrevd for Forms
            </span>
          ) : (
            <span className="text-[11px] text-slate-400 font-normal lowercase">(valgfritt)</span>
          )}
        </h3>
      </div>

      <p className="text-xs text-slate-300 leading-relaxed">
        {required
          ? 'Siden Microsoft Forms ikke kan lukke SEB automatisk, må du sette en avslutningsfrase (minst 12 tegn, f.eks. «fjord-storm-tind-varde-482915»). Når eleven har levert og viser kvitteringsskjermen på pulten, oppgir eller taster du inn koden for å avslutte SEB.'
          : 'Lar deg avslutte SEB manuelt på en elevmaskin (f.eks. ved tekniske problemer). Uten kodeord kan SEB bare avsluttes ved fullført innlevering.'}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <input
            type={show ? 'text' : 'password'}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            autoComplete="new-password"
            placeholder="Minst 12 tegn (f.eks. fjord-storm-tind-varde-482915)"
            aria-label="Avslutningspassord"
            aria-required={required}
            className={`w-full bg-slate-950 border rounded-xl px-3.5 py-2.5 pr-16 text-sm text-white placeholder-slate-500 focus:outline-none font-mono ${
              required && !trimmed
                ? 'border-amber-500/70 focus:border-amber-400'
                : 'border-slate-700 focus:border-emerald-500'
            }`}
          />
          <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
            {trimmed && (
              <button
                type="button"
                onClick={handleCopy}
                aria-label="Kopier kodeord"
                title="Kopier kodeord"
                className="p-1 text-slate-400 hover:text-white"
              >
                {copied ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
              </button>
            )}
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              aria-label={show ? 'Skjul passord' : 'Vis passord'}
              className="p-1 text-slate-400 hover:text-white"
            >
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGenerate}
          className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-black text-emerald-300 hover:text-emerald-200 inline-flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw size={13} aria-hidden="true" />
          <span>Generer tilfeldig kode</span>
        </button>
      </div>

      {required && !trimmed && (
        <p className="text-xs text-amber-300 font-medium flex items-center gap-1.5">
          <AlertTriangle size={13} className="shrink-0" aria-hidden="true" />
          Sett et kodeord (eller trykk «Generer tilfeldig kode») for å fullføre oppsettet av Forms-prøven.
        </p>
      )}

      {tooShort && (
        <p className="text-xs text-amber-200 flex items-start gap-1.5">
          <AlertTriangle size={14} className="shrink-0 mt-0.5 text-amber-300" aria-hidden="true" />
          Kodeordet må være minst 12 tegn (f.eks. «fjord-storm-tind-varde-482915»), slik at SHA-256-hashen i .seb-filen ikke kan knekkes med ordbokssøk.
        </p>
      )}

      {digitsOnly && (
        <p className="text-xs text-amber-200 flex items-start gap-1.5">
          <AlertTriangle size={14} className="shrink-0 mt-0.5 text-amber-300" aria-hidden="true" />
          Rene tallkoder er ikke tillatt fordi de kan knekkes fra .seb-filen. Kombiner ord og tall (f.eks. «fjord-storm-tind-varde-482915»).
        </p>
      )}

      {trimmed.length >= MIN_QUIT_PASSWORD_LENGTH && !digitsOnly && (
        <p className="text-xs text-emerald-400 flex items-center gap-1.5">
          <ShieldCheck size={14} className="shrink-0" aria-hidden="true" />
          Sikkert kodeord ({trimmed.length} tegn). Hashes lokalt med SHA-256 og sendes aldri i klartekst. Husk å notere koden!
        </p>
      )}
    </section>
  );
}
