import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertTriangle, ExternalLink, FileSpreadsheet } from 'lucide-react';
import { fetchSebExam } from '../firebase';
import { markAsSebEnvironment } from '../utils/seb/sebEnvironment';
import { loadDraft, clearDraft } from '../utils/exam/localStore';
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
import LoadingScreen from '../components/common/LoadingScreen';

const LAYOUT_CLASSES = {
  split: 'grid-cols-1 md:grid-cols-2 grid-rows-[40%_60%] md:grid-rows-1',
  stacked: 'grid-cols-1 grid-rows-[38%_62%]',
  focus: 'grid-cols-1 grid-rows-1'
};

export default function SebExamRoom() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [status, setStatus] = useState('loading');
  const [initialDraft, setInitialDraft] = useState(null);
  const [layout, setLayout] = useState('split');
  const [lang, setLang] = useState('nb-NO');
  const [restored, setRestored] = useState(null);
  const [finishOpen, setFinishOpen] = useState(false);
  const [formsExitOpen, setFormsExitOpen] = useState(false);
  const editorRef = useRef(null);
  const startedAtRef = useRef(null);

  useEffect(() => {
    markAsSebEnvironment();
    let cancelled = false;
    Promise.all([fetchSebExam(examId).catch(() => null), loadDraft(examId).catch(() => null)]).then(([data, draft]) => {
      if (cancelled) return;
      if (!data) return setStatus('missing');
      startedAtRef.current = draft?.startedAt || new Date().toISOString();
      setExam(data);
      setInitialDraft(draft);
      if (draft?.lang) setLang(draft.lang);
      if (draft?.layout) setLayout(draft.layout);
      if (draft?.doc && countWords(docToPlainText(draft.doc)) > 0) {
        setRestored({ savedAt: draft.savedAt, wordCount: countWords(docToPlainText(draft.doc)) });
      }
      setStatus('ready');
    });
    return () => {
      cancelled = true;
    };
  }, [examId]);

  const isFormsExam = exam?.sourceType === 'forms' || Boolean(exam?.formsUrl);
  const formsUrl = exam?.formsUrl || 'https://forms.office.com';

  const log = useExamIntegrityLog({
    initialActiveSeconds: 0,
    initialIncidents: [],
    enabled: status === 'ready' && !isFormsExam
  });
  const { reset: resetLog, addIncident } = log;

  useEffect(() => {
    if (status !== 'ready' || isFormsExam) return;
    resetLog(Number(initialDraft?.activeSeconds) || 0, Array.isArray(initialDraft?.incidents) ? initialDraft.incidents : []);
  }, [status, initialDraft, resetLog, isFormsExam]);

  const incidentsRef = useRef(log.incidents);
  incidentsRef.current = log.incidents;

  const getDraft = useCallback(() => {
    if (status !== 'ready') return null;
    return {
      doc: editorRef.current?.getJSON() || null,
      activeSeconds: log.getActiveSeconds(),
      incidents: incidentsRef.current,
      startedAt: startedAtRef.current,
      lang,
      layout
    };
  }, [status, lang, layout, log]);

  const autosave = useExamAutosave(examId, getDraft);
  const { schedule } = autosave;
  useEffect(() => {
    if (status === 'ready' && !isFormsExam) schedule();
  }, [lang, layout, log.incidents, status, schedule, isFormsExam]);

  const finisher = useFinishExam({
    exam,
    getEssayDoc: () => editorRef.current?.getJSON(),
    getActiveSeconds: log.getActiveSeconds,
    getIncidents: () => incidentsRef.current,
    startedAt: startedAtRef.current,
    onFinished: async () => autosave.flush(),
    onBeforeExit: () => autosave.stop()
  });

  const onEditorReady = useCallback((ed) => {
    editorRef.current = ed;
  }, []);

  const handleFormsExitConfirm = async () => {
    autosave.stop();
    await clearDraft(examId);
    navigate('/quit', { replace: true });
  };

  if (status === 'loading') return <LoadingScreen label="Laster prøven..." />;
  if (status === 'missing') {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="max-w-md p-6 rounded-3xl bg-amber-950 border border-amber-600 text-amber-50 flex gap-3">
          <AlertTriangle className="shrink-0 text-amber-300" aria-hidden="true" />
          <p>Prøven ble ikke funnet. Den kan være slettet (prøver slettes etter 90 dager), eller lenken er feil. Si fra til læreren.</p>
        </div>
      </main>
    );
  }

  const wordCount = countWords(editorRef.current?.getText({ blockSeparator: '\n' }) || '');

  return (
    <div className="h-screen flex flex-col bg-slate-950 overflow-hidden">
      <ExamTopBar
        title={exam.title}
        layout={layout}
        setLayout={setLayout}
        websites={exam.sebConfig?.allowedWebsites || []}
        savedAt={autosave.savedAt}
        saveError={autosave.saveError}
        onBackup={() => downloadBackupTxt({ examTitle: exam.title, text: docToPlainText(editorRef.current?.getJSON()) })}
        onFinish={() => setFinishOpen(true)}
        finishing={finisher.phase === 'signing' || finisher.phase === 'rendering'}
        isForms={isFormsExam}
        onFormsExit={() => setFormsExitOpen(true)}
      />
      {restored && !isFormsExam && (
        <RestoreBanner savedAt={restored.savedAt} wordCount={restored.wordCount} onClose={() => setRestored(null)} />
      )}

      {isFormsExam ? (
        <div className="flex-1 min-h-0 relative bg-slate-900 flex flex-col">
          <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
            <span>Microsoft Forms-prøve. I Safe Exam Browser åpnes Forms direkte i fullskjerm for feilfri Feide- og Microsoft-innlogging.</span>
            <a
              href={formsUrl}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
            >
              <span>Åpne Forms direkte</span>
              <ExternalLink size={12} aria-hidden="true" />
            </a>
          </div>
          <iframe
            src={formsUrl}
            title={exam.title}
            className="w-full flex-1 border-0 bg-white"
            allow="clipboard-read; clipboard-write; fullscreen"
          />
        </div>
      ) : (
        <div className={`flex-1 min-h-0 grid ${LAYOUT_CLASSES[layout]}`}>
          {layout !== 'focus' && (
            <section aria-label="Oppgave" className={`min-h-0 overflow-hidden ${layout === 'split' ? 'md:border-r' : 'border-b'} border-slate-800`}>
              <PromptPanel exam={exam} />
            </section>
          )}
          <section aria-label="Besvarelse" className="min-h-0 overflow-hidden">
            <EssayEditor
              initialDoc={initialDraft?.doc}
              lang={lang}
              onLangChange={setLang}
              onChange={schedule}
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
        onConfirm={handleFormsExitConfirm}
        onCancel={() => setFormsExitOpen(false)}
      />
    </div>
  );
}
