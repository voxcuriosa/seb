import { docToBlocks } from '../../utils/exam/essayDocModel';

function Runs({ runs }) {
  return runs.map((r, i) => {
    let node = r.text;
    if (r.underline) node = <u>{node}</u>;
    if (r.italic) node = <em>{node}</em>;
    if (r.bold) node = <strong>{node}</strong>;
    return <span key={i}>{node}</span>;
  });
}

function Lines({ lines }) {
  return lines.map((runs, i) => (
    <span key={i}>
      {i > 0 && <br />}
      <Runs runs={runs} />
    </span>
  ));
}

/**
 * Viser elevens besvarelse som React-elementer (ingen innerHTML, dermed ingen XSS).
 * Formatering vises bare når den samsvarer med den verifiserte teksten.
 */
export default function EssayView({ payload, formattingTrusted }) {
  if (!formattingTrusted) {
    return <div className="whitespace-pre-wrap leading-relaxed">{payload.essayText}</div>;
  }
  const blocks = docToBlocks(payload.essayDoc);
  return (
    <div className="space-y-2 leading-relaxed">
      {blocks.map((b, i) => {
        if (b.kind === 'h1') return <h2 key={i} className="text-xl font-black mt-3"><Lines lines={b.lines} /></h2>;
        if (b.kind === 'h2') return <h3 key={i} className="text-lg font-bold mt-2"><Lines lines={b.lines} /></h3>;
        if (b.kind === 'li') {
          return (
            <div key={i} className="flex gap-2" style={{ paddingLeft: `${(b.indent - 1) * 1.25}rem` }}>
              <span className="shrink-0 w-6 text-right">{b.marker === '-' ? '•' : b.marker}</span>
              <span><Lines lines={b.lines} /></span>
            </div>
          );
        }
        return <p key={i} className="min-h-[1em]"><Lines lines={b.lines} /></p>;
      })}
    </div>
  );
}
