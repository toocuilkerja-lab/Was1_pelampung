import React from 'react';
import { Loader2, ShieldCheck, Database, CheckCircle2 } from 'lucide-react';

interface LoadingProgressModalProps {
  isOpen: boolean;
  progress: number; // 0 to 100
  stageText?: string;
}

export const LoadingProgressModal: React.FC<LoadingProgressModalProps> = ({
  isOpen,
  progress,
  stageText,
}) => {
  if (!isOpen) return null;

  const roundedProgress = Math.min(100, Math.max(0, Math.round(progress)));
  const isFinished = roundedProgress >= 100;

  // Dynamic progress stage message if not explicitly provided
  const getStageMessage = () => {
    if (stageText) return stageText;
    if (roundedProgress < 25) {
      return 'Menginisialisasi koneksi data penerimaan...';
    } else if (roundedProgress < 50) {
      return 'Mengambil target penerimaan Seksi Pengawasan I (952_was1_target)...';
    } else if (roundedProgress < 85) {
      return 'Mengambil data transaksi realisasi setoran (952_was1_realisasi)...';
    } else if (roundedProgress < 100) {
      return 'Memproses kalkulasi agregasi 8 AR & Wajib Pajak...';
    } else {
      return 'Data berhasil dimuat! Menampilkan Dashboard...';
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Memuat Data"
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl shadow-2xl w-full max-w-md p-6 sm:p-7 relative overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Glow decoration */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Header Icon & Brand */}
        <div className="flex flex-col items-center text-center relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center mb-4 relative shadow-inner">
            {isFinished ? (
              <CheckCircle2 className="w-9 h-9 text-emerald-400 animate-in zoom-in duration-200" />
            ) : (
              <div className="relative flex items-center justify-center">
                <Loader2 className="w-9 h-9 text-blue-400 animate-spin" />
                <Database className="w-4 h-4 text-slate-300 absolute" />
              </div>
            )}
          </div>

          <h3 className="text-lg sm:text-xl font-bold tracking-tight text-white">
            {isFinished ? 'Data Siap Ditampilkan' : 'Memuat Data Penerimaan Pajak'}
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">
            Seksi Pengawasan I • Sinkronisasi Data Penerimaan Pajak
          </p>
        </div>

        {/* Progress Bar & Percentage */}
        <div className="mt-6 relative z-10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-300">
              Status Sinkronisasi
            </span>
            <span className="font-mono text-sm font-bold text-emerald-400">
              {roundedProgress}%
            </span>
          </div>

          {/* Track */}
          <div className="w-full bg-slate-800 rounded-full h-3.5 p-0.5 border border-slate-700/80 overflow-hidden shadow-inner">
            <div
              className="bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 h-full rounded-full transition-all duration-150 ease-out relative"
              style={{ width: `${roundedProgress}%` }}
            >
              {/* Animated subtle shimmer */}
              <div className="absolute inset-0 bg-white/20 rounded-full animate-pulse" />
            </div>
          </div>

          {/* Subtext description of current stage */}
          <div className="mt-3 text-center min-h-[36px] flex items-center justify-center">
            <p className="text-xs text-slate-300 font-medium transition-all">
              {getStageMessage()}
            </p>
          </div>
        </div>

        {/* Institutional Footer note */}
        <div className="mt-5 pt-4 border-t border-slate-800 text-center relative z-10">
          <div className="inline-flex items-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>Kementerian Keuangan RI • Direktorat Jenderal Pajak</span>
          </div>
        </div>
      </div>
    </div>
  );
};
