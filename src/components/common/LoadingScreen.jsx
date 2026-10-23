import { Loader2 } from 'lucide-react';

export default function LoadingScreen({ label = 'Laster...' }) {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-3 text-slate-300" role="status">
      <Loader2 size={28} className="animate-spin text-emerald-400" aria-hidden="true" />
      <p className="text-xs font-black uppercase tracking-wider">{label}</p>
    </div>
  );
}
