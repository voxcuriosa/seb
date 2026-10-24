import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { fetchSebExam } from '../firebase';
import { markAsSebEnvironment } from '../utils/seb/sebEnvironment';
import { loadDraft } from '../utils/exam/localStore';
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
import LoadingScreen from '../components/common/LoadingScreen';

const LAYOUT_CLASSES = {
  split: 'grid-cols-1 md:grid-cols-2 grid-rows-[40%_60%] md:grid-rows-1',
  stacked: 'grid-cols-1 grid-rows-[38%_62%]',
  focus: 'grid-cols-1 grid-rows-1'
};

/** Selve prøverommet inne i Safe Exam Browser. Elevens tekst forlater aldri maskinen. */
export default function SebExamRoom() {
  const { examId } = useParams();
  const [exam, setExam] = useState(null);
  const [status, setStatus] = useState('loading');
  const [initialDraft, setInitialDraft] = useState(null);
  const [layout, setLayout] = useState('split');
  const [lang, setLang] = useState('nb-NO');
  const [restored, setRestored] = useState(null);
  const [finishOpen, setFinishOpen] = useState(false);
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

  const log = useExamIntegrityLog({
    initialActiveSeconds: 0,
    initialIncidents: [],
    enabled: status === 'ready'
  });
  const { reset: resetLog, addIncident } = log;

  // Gjenopprett aktiv tid og logg fra lokalt utkast, og noter gjenopprettingen.
  useEffect(() => {
    if (status !== 'ready') return;
    resetLog(Number(initialDraft?.activeSeconds) || 0, Array.isArray(initialDraft?.incidents) ? initialDraft.incidents : []);
    if (restored) addIncident('RESTORED', 'Prøven ble åpnet på nytt og teksten gjenopprettet');
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  const incidentsRef = useRef([]);
  useEffect(() => {
    incidentsRef.current = log.incidents;
  }, [log.incidents]);

  const getDraft = useCallback(() => {
    const ed = editorRef.current;
    if (!ed || status !== 'ready') return null;
    return {
      doc: ed.getJSON(),
      html: ed.getHTML(),
      text: ed.getText({ blockSeparator: '\n' }),
      startedAt: startedAtRef.current,
      activeSeconds: log.getActiveSeconds(),
      incidents: incidentsRef.current,
      lang,
      layout
    };
  }, [status, lang, layout, log]);

  const autosave = useExamAutosave(examId, getDraft);
  const { schedule } = autosave;
  useEffect(() => {
    if (status === 'ready') schedule();
  }, [lang, layout, log.incidents, status, schedule]);

  const finisher = useFinishExam({
    exam,
    getEssayDoc: () => editorRef.current?.getJSON(),
    getActiveSeconds: log.getActiveSeconds,
    getIncidents: () => incidentsRef.current,
    startedAt: startedAtRef.current,
    onFinished: async () => autosave.flush()
  });

  const onEditorReady = useCallback((ed) => {
    editorRef.current = ed;
  }, []);

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
      />
      {restored && <RestoreBanner savedAt={restored.savedAt} wordCount={restored.wordCount} onClose={() => setRestored(null)} />}

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
    </div>
  );
}
