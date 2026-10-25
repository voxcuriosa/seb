import { useState } from 'react';
import { Loader2, Save, LockOpen } from 'lucide-react';
import TeacherPinGate from './TeacherPinGate';
import PromptSourcePicker from './PromptSourcePicker';
import SebResourcesPicker from './SebResourcesPicker';
import QuitPasswordField from './QuitPasswordField';
import ExamResultCard from './ExamResultCard';
import MyExamsList from './MyExamsList';
import QuickStepsGuide from './QuickStepsGuide';
import { useCreateSebExam } from '../../hooks/useCreateSebExam';
import { useMyExams } from '../../hooks/useMyExams';
import { DEFAULT_SEB_APPS, cleanDomainFromUrl, normalizeWebsiteUrl, isValidDomain } from '../../utils/seb/sebPresets';
import { htmlToPlainText } from '../../utils/sanitize';
import { examStartUrl } from '../../config';

async function copyToClipboard(text) {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fallback
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-9999px';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return Boolean(ok);
  } catch {
    return false;
  }
}

function Step({ n, title, children }) {
  return (
    <section className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
      <h2 className="text-base font-black text-white flex items-center gap-3">
        <span className="w-7 h-7 rounded-full bg-emerald-500 text-slate-950 text-sm flex items-center justify-center">{n}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

const EMPTY = { title: '', sourceType: 'text', promptHtml: '', pdfFile: null, formsUrl: '', quitPassword: '' };

/** Fane 1: Opprett SEB-prøve (basert på voxkunnskap SebConfigModal). */
export default function CreateExamTab() {
  const { isUnlocked, unlock, lock, createExam, busy, error, setError } = useCreateSebExam();
  const { exams, addExam, removeExam } = useMyExams();
  const [form, setForm] = useState(EMPTY);
  const [allowedApps, setAllowedApps] = useState(DEFAULT_SEB_APPS);
  const [websites, setWebsites] = useState([]);
  const [pendingCustom, setPendingCustom] = useState({ title: '', url: '' });
  const [result, setResult] = useState(null);

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: typeof value === 'function' ? value(f[key]) : value }));

  if (!isUnlocked) return <TeacherPinGate onUnlock={unlock} busy={busy} error={error} />;

  const validationError = () => {
    if (!form.title.trim()) return 'Gi prøven en tittel.';
    if (form.sourceType === 'pdf' && !form.pdfFile) return 'Velg en oppgave-PDF.';
    if (form.sourceType === 'forms') {
      const trimmed = form.formsUrl.trim();
      const isValidForms = /^https:\/\/(forms\.office\.com|forms\.microsoft\.com|forms\.cloud\.microsoft)\//i.test(trimmed);
      if (!isValidForms) {
        return 'Lim inn en gyldig Microsoft Forms-lenke (f.eks. https://forms.office.com/... eller https://forms.cloud.microsoft/...).';
      }
      if (!form.quitPassword || form.quitPassword.trim().length < 6) {
        return 'Avslutningspassord / kodeord (minst 6 tegn, f.eks. «sol-482») er påkrevd for Microsoft Forms-prøver, slik at du kan låse opp og avslutte SEB etter innlevering.';
      }
    }
    if (form.quitPassword && form.quitPassword.trim().length > 0 && form.quitPassword.trim().length < 6) {
      return 'Avslutningspassordet må være minst 6 tegn (eller la feltet stå tomt).';
    }
    if (form.sourceType !== 'pdf' && form.sourceType !== 'forms' && !htmlToPlainText(form.promptHtml)) {
      return 'Oppgaveteksten er tom.';
    }
    return '';
  };

  const submit = async () => {
    const msg = validationError();
    if (msg) return setError(msg);

    // Hvis læreren har skrevet inn en nettadresse under «Legg til egne nettsider»
    // uten å trykke på «+ Legg til» først, tar vi den automatisk med så den aldri går tapt.
    let finalWebsites = [...websites];
    if (pendingCustom.url.trim()) {
      const url = normalizeWebsiteUrl(pendingCustom.url);
      const domain = cleanDomainFromUrl(url);
      if (!isValidDomain(domain)) {
        return setError('Nettadressen i feltet «Legg til egne nettsider» er ikke gyldig (f.eks. regjeringen.no). Rettet opp eller tøm feltet.');
      }
      if (!finalWebsites.some((w) => cleanDomainFromUrl(w.url) === domain) && finalWebsites.length < 20) {
        finalWebsites.push({
          id: `custom_${Date.now()}`,
          title: pendingCustom.title.trim() || domain,
          url,
          domain
        });
      }
      setWebsites(finalWebsites);
      setPendingCustom({ title: '', url: '' });
    }

    const res = await createExam({ ...form, allowedApps, allowedWebsites: finalWebsites });
    if (!res) return;
    const url = examStartUrl(res.examId);
    let autoCopied = false;
    try {
      autoCopied = await copyToClipboard(url);
    } catch {
      // Ignorer
    }
    const isForms = form.sourceType === 'forms';
    const trimmedFormsUrl = isForms ? form.formsUrl.trim() : '';
    const sebWebsites = isForms
      ? [
          {
            id: 'web_forms_main',
            title: 'Microsoft Forms',
            url: trimmedFormsUrl,
            domain: cleanDomainFromUrl(trimmedFormsUrl) || 'forms.office.com'
          },
          ...finalWebsites.filter((w) => !/forms\.(office\.com|microsoft\.com|cloud\.microsoft)/i.test(w?.url || w?.domain || ''))
        ]
      : finalWebsites;
    const entry = {
      examId: res.examId,
      title: form.title.trim(),
      createdAt: new Date().toISOString(),
      expiresAt: res.expiresAt,
      sourceType: form.sourceType,
      formsUrl: isForms ? trimmedFormsUrl : null,
      autoCopied,
      sebFileArgs: {
        examId: res.examId,
        title: form.title.trim(),
        allowedWebsites: sebWebsites,
        allowedApps,
        quitPasswordHash: res.quitPasswordHash,
        startURL: isForms && finalWebsites.length === 0 ? trimmedFormsUrl : undefined
      }
    };
    addExam(entry);
    setResult(entry);
    window.scrollTo({ top: 0 });
  };

  const reset = () => {
    setForm(EMPTY);
    setAllowedApps(DEFAULT_SEB_APPS);
    setWebsites([]);
    setPendingCustom({ title: '', url: '' });
    setResult(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button type="button" onClick={lock} className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white">
          <LockOpen size={13} aria-hidden="true" /> Lås fanen
        </button>
      </div>

      {result ? (
        <ExamResultCard exam={result} onNew={reset} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
          <div className="space-y-6">
            <Step n={1} title="Prøvens oppgavetekst">
              <label className="block space-y-1.5">
                <span className="text-xs font-black uppercase tracking-wider text-slate-300">Prøvetittel</span>
                <input value={form.title} onChange={(e) => set('title')(e.target.value)} maxLength={120} placeholder="F.eks. Prøve i historie VG3"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500" />
              </label>
              <PromptSourcePicker
                sourceType={form.sourceType} setSourceType={set('sourceType')}
                promptHtml={form.promptHtml} setPromptHtml={set('promptHtml')}
                pdfFile={form.pdfFile} setPdfFile={set('pdfFile')}
                formsUrl={form.formsUrl} setFormsUrl={set('formsUrl')}
              />
              <p className="text-xs text-slate-400">
                {form.sourceType === 'forms'
                  ? 'SEB åpner Forms direkte mot skolens Microsoft 365 / Feide. Ingen KI brukes, og ingen elevdata lagres i VoxCuriosa.'
                  : 'Alt behandles lokalt i nettleseren. Ingen KI brukes.'}
              </p>
            </Step>

            <Step n={2} title="Hjelpemidler, nettsider og passord">
              <SebResourcesPicker
                allowedApps={allowedApps}
                setAllowedApps={setAllowedApps}
                websites={websites}
                setWebsites={setWebsites}
                pendingCustom={pendingCustom}
                setPendingCustom={setPendingCustom}
              />
              <QuitPasswordField value={form.quitPassword} onChange={set('quitPassword')} required={form.sourceType === 'forms'} />
            </Step>

            <Step n={3} title="Generer og del i Teams">
              {error && <p className="text-sm font-bold text-red-300" role="alert">{error}</p>}
              <button type="button" onClick={submit} disabled={busy}
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-slate-950 font-black text-xs uppercase tracking-widest inline-flex items-center justify-center gap-2">
                {busy ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Save size={16} aria-hidden="true" />}
                <span>Lagre og generer SEB-prøve</span>
              </button>
              <p className="text-xs text-slate-400">Prøveoppsettet lagres i EU (europe-west1) og slettes automatisk etter 90 dager. Ingen elevdata lagres.</p>
            </Step>
          </div>

          <aside className="lg:sticky lg:top-6 space-y-4">
            <QuickStepsGuide />
          </aside>
        </div>
      )}

      <MyExamsList exams={exams} onRemove={removeExam} />
    </div>
  );
}
