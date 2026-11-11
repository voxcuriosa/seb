import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AlertTriangle, GripVertical, GripHorizontal, ShieldAlert } from 'lucide-react';
import { fetchSebExam } from '../firebase';
import { EXAM_QUIT_URL } from '../config';
import { markAsSebEnvironment, isVerifiedSebClient, detectGuestVirtualMachine } from '../utils/seb/sebEnvironment';
import {
  loadDraft,
  clearDraft,
  getActiveSessionToken,
  ensureActiveSessionToken
} from '../utils/exam/localStore';
import { downloadBackupTxt } from '../utils/exam/backupTxt';
import { docToPlainText } from '../utils/exam/essayDocModel';
import { countWords } from '../utils/integrity/textNormalize';
import { useExamIntegrityLog } from '../hooks/useExamIntegrityLog';
import { useExamAutosave } from '../hooks/useExamAutosave';
import { useFinishExam } from '../hooks/useFinishExam';
import ExamTopBar from '../components/exam/ExamTopBar';
import PromptPanel from '../components/exam/PromptPanel';
import EssayEditor from '../components/exam/EssayEditor';
import RestoreBanner from '../components/exam/RestoreBanner';
import FinishDialog from '../components/exam/FinishDialog';
import FormsExitDialog from '../components/exam/FormsExitDialog';
import FormsHubView from '../components/exam/FormsHubView';
import LoadingScreen from '../components/common/LoadingScreen';
import { useStudentUiLang } from '../hooks/useStudentUiLang';

const clampPct = (v) => Math.min(82, Math.max(18, Number(v) || 40));
const isHttpsUrl = (val = '') => /^https:\/\/\S+/i.test(String(val || '').trim());
const isFormsDomain = (val = '') => /forms\.(office\.com|microsoft\.com|cloud\.microsoft)/i.test(String(val || ''));
const hasHelperWebsites = (sites = []) =>
  Array.isArray(sites) &&
  sites.some((w) => w?.id !== 'web_forms_main' && !isFormsDomain(`${w?.domain || ''} ${w?.url || ''}`));

export default function SebExamRoom() {
  const { examId } = useParams();
  const [exam, setExam] = useState(null);
  const [status, setStatus] = useState('loading');
  const [initialDraft, setInitialDraft] = useState(null);
  const [pendingDraft, setPendingDraft] = useState(null);
  const [layout, setLayout] = useState('split');
  const [splitPct, setSplitPct] = useState(40);
  const [draggingSplit, setDraggingSplit] = useState(false);
  const [lang, setLang] = useState('nb-NO');
  const [restored, setRestored] = useState(null);
  const [finishOpen, setFinishOpen] = useState(false);
  const [formsExitOpen, setFormsExitOpen] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [startedAt, setStartedAt] = useState(null);
  const { t } = useStudentUiLang();
  const editorRef = useRef(null);
  const startedAtRef = useRef(null);
  const pendingDraftRef = useRef(null);
  const splitContainerRef = useRef(null);
  const detectedVm = detectGuestVirtualMachine();

  useEffect(() => {
    if (!isVerifiedSebClient()) return undefined;
    if (detectedVm) return undefined;
    markAsSebEnvironment();
    let cancelled = false;
    Promise.all([fetchSebExam(examId).catch(() => null), loadDraft(examId).catch(() => null)]).then(([data, draft]) => {
      if (cancelled) return;
      if (!data) return setStatus('missing');

      const rawSites = Array.isArray(data.sebConfig?.allowedWebsites) ? data.sebConfig.allowedWebsites : [];
      const isForms = data.sourceType === 'forms' || Boolean(data.formsUrl);
      if (isForms && !hasHelperWebsites(rawSites) && isHttpsUrl(data.formsUrl)) {
        window.location.replace(data.formsUrl.trim());
        return;
      }

      const nowIso = new Date().toISOString();
      const draftWords = draft?.doc ? countWords(docToPlainText(draft.doc)) : 0;
      const activeToken = getActiveSessionToken(examId);
      const isSameSession = Boolean(activeToken && draft?.sessionToken && activeToken === draft.sessionToken);

      setExam(data);
      if (!isForms && draftWords > 0 && isSameSession) {
        const initialStart = draft.startedAt || nowIso;
        startedAtRef.current = initialStart;
        setStartedAt(initialStart);
        setInitialDraft(draft);
        pendingDraftRef.current = null;
        setPendingDraft(null);
        if (draft.lang) setLang(draft.lang);
        if (draft.layout) setLayout(draft.layout);
        if (draft.splitPct) setSplitPct(clampPct(draft.splitPct));
        setRestored({ savedAt: draft.savedAt, wordCount: draftWords });
        setWordCount(draftWords);
      } else {
        startedAtRef.current = nowIso;
        setStartedAt(nowIso);
        setInitialDraft(null);
        if (!isForms && draftWords > 0) {
          const pending = { ...draft, wordCount: draftWords };
          pendingDraftRef.current = pending;
          setPendingDraft(pending);
        } else {
          pendingDraftRef.current = null;
          setPendingDraft(null);
        }
      }
      setStatus('ready');
    });
    return () => {
      cancelled = true;
    };
  }, [examId, detectedVm]);

  const isFormsExam = exam?.sourceType === 'forms' || Boolean(exam?.formsUrl);
  const formsUrl = isHttpsUrl(exam?.formsUrl) ? exam.formsUrl.trim() : 'https://forms.office.com';
  const allowedApps = exam?.sebConfig?.allowedApps || exam?.allowedApps;
  const safeWebsites = useMemo(() => {
    const raw = exam?.sebConfig?.allowedWebsites || exam?.allowedWebsites || [];
    return Array.isArray(raw) ? raw.filter((w) => isHttpsUrl(w?.url)) : [];
  }, [exam]);
  const hasAids = Boolean(
    allowedApps?.voxlex ||
    allowedApps?.lingdys ||
    allowedApps?.ordnett ||
    safeWebsites.length > 0
  );

  const log = useExamIntegrityLog({
    initialActiveSeconds: 0,
    initialIncidents: [],
    enabled: status === 'ready' && !isFormsExam,
    hasAids
  });
  const { reset: resetLog, addIncident } = log;

  useEffect(() => {
    if (status !== 'ready' || isFormsExam || !initialDraft) return;
    resetLog(Number(initialDraft?.activeSeconds) || 0, Array.isArray(initialDraft?.incidents) ? initialDraft.incidents : []);
  }, [status, initialDraft, resetLog, isFormsExam]);

  const incidentsRef = useRef(log.incidents);
  useEffect(() => {
    incidentsRef.current = log.incidents;
  }, [log.incidents]);

  const getDraft = useCallback(() => {
    if (status !== 'ready' || pendingDraftRef.current) return null;
    const sessionToken = getActiveSessionToken(examId);
    if (!sessionToken) return null;
    return {
      doc: editorRef.current?.getJSON() || null,
      activeSeconds: log.getActiveSeconds(),
      incidents: incidentsRef.current,
      startedAt: startedAtRef.current,
      sessionToken,
      lang,
      layout,
      splitPct
    };
  }, [status, examId, lang, layout, splitPct, log]);

  const autosave = useExamAutosave(examId, getDraft);
  const { schedule } = autosave;
  useEffect(() => {
    if (status === 'ready' && !isFormsExam && !pendingDraft && getActiveSessionToken(examId)) schedule();
  }, [examId, lang, layout, splitPct, log.incidents, status, schedule, isFormsExam, pendingDraft]);

  useEffect(() => {
    if (!draggingSplit) return undefined;
    const onMove = (e) => {
      const rect = splitContainerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const pct = layout === 'stacked'
        ? ((e.clientY - rect.top) / Math.max(1, rect.height)) * 100
        : ((e.clientX - rect.left) / Math.max(1, rect.width)) * 100;
      setSplitPct(clampPct(pct));
    };
    const onUp = () => setDraggingSplit(false);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [draggingSplit, layout]);

  const finisher = useFinishExam({
    exam,
    getEssayDoc: () => editorRef.current?.getJSON(),
    getActiveSeconds: log.getActiveSeconds,
    getIncidents: () => incidentsRef.current,
    getStartedAt: () => startedAtRef.current,
    onFinished: async () => autosave.stop(),
    onBeforeExit: () => autosave.stop()
  });

  const onEditorReady = useCallback((ed) => {
    editorRef.current = ed;
    setWordCount(countWords(ed?.getText({ blockSeparator: '\n' }) || ''));
  }, []);

  const handleEditorChange = useCallback(() => {
    setWordCount(countWords(editorRef.current?.getText({ blockSeparator: '\n' }) || ''));
    if (!pendingDraftRef.current) {
      ensureActiveSessionToken(examId);
      schedule();
    }
  }, [examId, schedule]);

  const handleRestorePendingDraft = useCallback(() => {
    const d = pendingDraftRef.current;
    if (!d) return;
    ensureActiveSessionToken(examId);
    pendingDraftRef.current = null;
    setPendingDraft(null);
    if (d.startedAt) {
      startedAtRef.current = d.startedAt;
      setStartedAt(d.startedAt);
    }
    if (d.lang) setLang(d.lang);
    if (d.layout) setLayout(d.layout);
    if (d.splitPct) setSplitPct(clampPct(d.splitPct));
    resetLog(Number(d.activeSeconds) || 0, Array.isArray(d.incidents) ? d.incidents : []);
    setInitialDraft(d);
    if (editorRef.current && d.doc) {
      editorRef.current.commands.setContent(d.doc);
    }
    setWordCount(d.wordCount);
    setRestored({ savedAt: d.savedAt, wordCount: d.wordCount });
    schedule();
  }, [examId, resetLog, schedule]);

  const handleDiscardPendingDraft = useCallback(async () => {
    pendingDraftRef.current = null;
    setPendingDraft(null);
    await clearDraft(examId);
    const currentText = editorRef.current?.getText({ blockSeparator: '\n' }) || '';
    if (countWords(currentText) > 0) {
      ensureActiveSessionToken(examId);
      schedule();
    }
  }, [examId, schedule]);

  const handleFormsExitConfirm = async () => {
    autosave.stop();
    await clearDraft(examId);
    window.location.href = EXAM_QUIT_URL;
  };

  if (!isVerifiedSebClient()) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div dir={t.rtl ? 'rtl' : 'ltr'} className="max-w-md p-6 rounded-3xl bg-slate-900 border border-slate-700 text-slate-100 space-y-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="shrink-0 text-emerald-400 mt-0.5" size={24} aria-hidden="true" />
            <div className="space-y-1.5">
              <h1 className="text-base font-black text-white">Prøven må åpnes i Safe Exam Browser</h1>
              <p className="text-sm text-slate-300 leading-relaxed">
                Dette prøverommet kan ikke åpnes direkte i en vanlig nettleser. Gå til startsiden for å starte prøven i Safe Exam Browser.
              </p>
            </div>
          </div>
          <Link
            to={`/start/${encodeURIComponent(examId || '')}`}
            className="w-full px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-widest inline-flex items-center justify-center"
          >
            Gå til startsiden for prøven
          </Link>
        </div>
      </main>
    );
  }

  if (detectedVm) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div dir={t.rtl ? 'rtl' : 'ltr'} className="max-w-md p-6 rounded-3xl bg-slate-900 border border-amber-500/60 text-slate-100 space-y-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="shrink-0 text-amber-400 mt-0.5" size={24} aria-hidden="true" />
            <div className="space-y-1.5">
              <h1 className="text-base font-black text-white">Virtuell maskin er ikke tillatt</h1>
              <p className="text-sm text-slate-300 leading-relaxed">
                Prøven kan ikke gjennomføres inne i en virtuell maskin ({detectedVm}). Lukk den virtuelle maskinen og åpne prøven direkte på skole-PC-en.
              </p>
            </div>
          </div>
          <a
            href={EXAM_QUIT_URL}
            className="w-full px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-widest inline-flex items-center justify-center"
          >
            Lukk Safe Exam Browser
          </a>
        </div>
      </main>
    );
  }

  if (status === 'loading') return <LoadingScreen label={t.loadingExam} />;
  if (status === 'missing') {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div dir={t.rtl ? 'rtl' : 'ltr'} className="max-w-md p-6 rounded-3xl bg-amber-950 border border-amber-600 text-amber-50 flex gap-3">
          <AlertTriangle className="shrink-0 text-amber-300" aria-hidden="true" />
          <p>{t.examNotFoundRoom}</p>
        </div>
      </main>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-950 overflow-hidden">
      <ExamTopBar
        title={exam.title}
        startedAt={startedAt}
        layout={layout}
        setLayout={setLayout}
        websites={safeWebsites}
        savedAt={autosave.savedAt}
        saveError={autosave.saveError}
        onBackup={() => downloadBackupTxt({ examTitle: exam.title, text: docToPlainText(editorRef.current?.getJSON()) })}
        onFinish={() => setFinishOpen(true)}
        finishing={finisher.phase === 'signing' || finisher.phase === 'rendering'}
        isForms={isFormsExam}
        onFormsExit={() => setFormsExitOpen(true)}
      />
      {pendingDraft && !isFormsExam && (
        <RestoreBanner
          pending
          savedAt={pendingDraft.savedAt}
          wordCount={pendingDraft.wordCount}
          onRestore={handleRestorePendingDraft}
          onDiscard={handleDiscardPendingDraft}
        />
      )}
      {!pendingDraft && restored && !isFormsExam && (
        <RestoreBanner savedAt={restored.savedAt} wordCount={restored.wordCount} onClose={() => setRestored(null)} />
      )}

      {isFormsExam ? (
        <FormsHubView
          title={exam.title}
          formsUrl={formsUrl}
          websites={safeWebsites}
          onExit={() => setFormsExitOpen(true)}
        />
      ) : (
        <div
          ref={splitContainerRef}
          className={`flex-1 min-h-0 flex ${
            layout === 'stacked' ? 'flex-col' : 'flex-col md:flex-row'
          } ${draggingSplit ? 'select-none' : ''}`}
        >
          {layout !== 'focus' && (
            <>
              <section
                aria-label="Oppgave"
                style={layout === 'split' ? { flexBasis: `${splitPct}%` } : { height: `${splitPct}%` }}
                className="min-h-0 min-w-0 shrink-0 grow-0 overflow-hidden"
              >
                <PromptPanel exam={exam} />
              </section>
              <div
                role="separator"
                tabIndex={0}
                aria-label="Juster størrelse mellom oppgave og skrivefelt (dobbeltklikk for å midtstille)"
                aria-orientation={layout === 'split' ? 'vertical' : 'horizontal'}
                aria-valuenow={Math.round(splitPct)}
                aria-valuemin={18}
                aria-valuemax={82}
                title="Dra for å endre bredde (dobbeltklikk for 40/60)"
                onPointerDown={(e) => {
                  e.preventDefault();
                  setDraggingSplit(true);
                }}
                onDoubleClick={() => setSplitPct(40)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                    e.preventDefault();
                    setSplitPct((p) => clampPct(p - 4));
                  } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                    e.preventDefault();
                    setSplitPct((p) => clampPct(p + 4));
                  }
                }}
                className={`group shrink-0 flex items-center justify-center transition-colors ${
                  layout === 'split'
                    ? 'w-2.5 cursor-col-resize border-x border-slate-800/80'
                    : 'h-2.5 cursor-row-resize border-y border-slate-800/80'
                } ${
                  draggingSplit ? 'bg-emerald-500/30 border-emerald-500/60' : 'bg-slate-900 hover:bg-emerald-500/20'
                }`}
              >
                {layout === 'split' ? (
                  <GripVertical size={13} className={draggingSplit ? 'text-emerald-300' : 'text-slate-500 group-hover:text-emerald-300'} aria-hidden="true" />
                ) : (
                  <GripHorizontal size={13} className={draggingSplit ? 'text-emerald-300' : 'text-slate-500 group-hover:text-emerald-300'} aria-hidden="true" />
                )}
              </div>
            </>
          )}
          <section aria-label="Besvarelse" className="flex-1 min-h-0 min-w-0 overflow-hidden">
            <EssayEditor
              initialDoc={initialDraft?.doc}
              lang={lang}
              onLangChange={setLang}
              onChange={handleEditorChange}
              onLargePaste={(len) => addIncident('PASTE', `${len} tegn limt inn`)}
              onReady={onEditorReady}
            />
          </section>
        </div>
      )}

      <FinishDialog
        open={finishOpen}
        phase={finisher.phase}
        result={finisher.result}
        wordCount={wordCount}
        onConfirm={finisher.finish}
        onCancel={() => setFinishOpen(false)}
        onDownloadAgain={finisher.downloadAgain}
        onExitSeb={finisher.exitSeb}
      />

      <FormsExitDialog
        open={formsExitOpen}
        quitPasswordHash={exam?.sebConfig?.quitPasswordHash || ''}
        onConfirm={handleFormsExitConfirm}
        onCancel={() => setFormsExitOpen(false)}
      />
    </div>
  );
}
