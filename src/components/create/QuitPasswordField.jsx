import { useState } from 'react';
import { Eye, EyeOff, KeyRound, AlertTriangle, ShieldCheck, RefreshCw, Copy, Check } from 'lucide-react';

export const MIN_QUIT_PASSWORD_LENGTH = 8;

const RAW_CODE_WORDS = [
  'sol', 'sky', 'vind', 'regn', 'hagl', 'lyn', 'storm', 'bris', 'frost', 'dugg',
  'fjord', 'fjell', 'skog', 'vann', 'elv', 'hav', 'bekk', 'foss', 'dal', 'hei',
  'eng', 'berg', 'vik', 'nes', 'sund', 'odde', 'holme', 'varde', 'vidde', 'tind',
  'myr', 'kyst', 'bukt', 'tjern', 'lund', 'kilde', 'stup', 'skar', 'kolle', 'isbre',
  'topp', 'kant', 'sti', 'vei', 'bro', 'kai', 'havn', 'gard', 'tun', 'park',
  'furu', 'gran', 'eik', 'osp', 'ask', 'alm', 'lind', 'pil', 'rogn', 'selje',
  'lerk', 'lyng', 'mose', 'gress', 'blad', 'rot', 'bark', 'gren', 'kvist', 'knopp',
  'stilk', 'rose', 'fiol', 'lilje', 'korn', 'havre', 'bygg', 'hvete', 'busk', 'hekk',
  'plen', 'sopp', 'eple', 'banan', 'melon', 'potet', 'salat', 'agurk', 'tomat', 'erter',
  'elg', 'hjort', 'rein', 'ulv', 'rev', 'gaupe', 'jerv', 'oter', 'bever', 'ekorn',
  'hare', 'hund', 'katt', 'hest', 'sau', 'lam', 'geit', 'kalv', 'fugl', 'ugle',
  'ravn', 'falk', 'hauk', 'trost', 'spurv', 'meis', 'svale', 'stork', 'svane', 'and',
  'terne', 'rype', 'tiur', 'spett', 'lerke', 'hegre', 'trane', 'fisk', 'laks', 'torsk',
  'sei', 'sild', 'reke', 'sel', 'hval', 'frosk', 'humle', 'nise', 'hyse', 'lunde',
  'hus', 'tak', 'vegg', 'gulv', 'rom', 'stue', 'loft', 'gang', 'trapp', 'port',
  'mur', 'bord', 'stol', 'benk', 'sofa', 'seng', 'pute', 'dyne', 'teppe', 'lampe',
  'lykt', 'lys', 'ovn', 'peis', 'skap', 'hylle', 'skuff', 'speil', 'kopp', 'glass',
  'fat', 'skje', 'kniv', 'gryte', 'panne', 'mugge', 'boks', 'kurv', 'sekk', 'veske',
  'sko', 'jakke', 'lue', 'vott', 'bok', 'ark', 'side', 'perm', 'penn', 'kritt',
  'blekk', 'papir', 'kart', 'tavle', 'pult', 'skole', 'seil', 'mast', 'anker', 'ror',
  'baug', 'dekk', 'jolle', 'kano', 'ferge', 'telt', 'leir', 'tur', 'ski', 'stav',
  'slede', 'hytte', 'gnist', 'glimt', 'ekko', 'klang', 'rytme', 'tone', 'sang', 'harpe',
  'dag', 'kveld', 'natt', 'uke', 'mars', 'april', 'mai', 'juni', 'juli', 'nord',
  'vest', 'hvit', 'gul', 'brun', 'rosa', 'klar', 'trygg', 'rask', 'sterk', 'varm',
  'kald', 'frisk', 'mild', 'jern', 'gull', 'tau', 'knute', 'ring', 'hjul', 'vogn',
  'tog', 'buss', 'fly', 'ball', 'spill', 'kamp', 'seier', 'krone', 'flagg', 'kake'
];

export const CODE_WORDS = [...new Set(RAW_CODE_WORDS.filter((w) => /^[a-z]{3,5}$/.test(w)))];

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
  while (picked.length < 3) {
    const word = CODE_WORDS[randomUniformInt(CODE_WORDS.length)];
    if (!picked.includes(word)) {
      picked.push(word);
    }
  }
  const digits = 10 + randomUniformInt(90);
  return `${picked[0]}-${picked[1]}-${picked[2]}-${digits}`;
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
  const missingLetters = trimmed.length >= MIN_QUIT_PASSWORD_LENGTH && !/[A-Za-zÆØÅæøå]/.test(trimmed);

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
          ? 'Siden Microsoft Forms ikke kan lukke SEB automatisk, må du sette et avslutningspassord (minst 8 tegn med bokstaver, f.eks. «sol-elg-fjord-42»). Når eleven har levert og viser kvitteringsskjermen på pulten, oppgir eller taster du inn koden for å avslutte SEB.'
          : 'Lar deg avslutte SEB manuelt på en elevmaskin (f.eks. ved tekniske problemer). Uten kodeord kan SEB bare avsluttes ved fullført innlevering.'}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <input
            type={show ? 'text' : 'password'}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            autoComplete="new-password"
            placeholder="Minst 8 tegn med bokstaver (f.eks. sol-elg-fjord-42)"
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
          Kodeordet må være minst 8 tegn med bokstaver (f.eks. «sol-elg-fjord-42»), slik at korte ord og PIN-koder ikke kan gjettes fra .seb-filen.
        </p>
      )}

      {missingLetters && (
        <p className="text-xs text-amber-200 flex items-start gap-1.5">
          <AlertTriangle size={14} className="shrink-0 mt-0.5 text-amber-300" aria-hidden="true" />
          Kodeord uten bokstaver er ikke tillatt fordi rene tallkoder kan knekkes fra .seb-filen. Kombiner ord og tall (minst 8 tegn med bokstaver, f.eks. «sol-elg-fjord-42»).
        </p>
      )}

      {trimmed.length >= MIN_QUIT_PASSWORD_LENGTH && !missingLetters && (
        <p className="text-xs text-emerald-400 flex items-center gap-1.5">
          <ShieldCheck size={14} className="shrink-0" aria-hidden="true" />
          Sikkert kodeord ({trimmed.length} tegn). Hashes lokalt med SHA-256 og sendes aldri i klartekst. Husk å notere koden!
        </p>
      )}
    </section>
  );
}
