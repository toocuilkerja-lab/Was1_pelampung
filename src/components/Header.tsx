import React from 'react';
import { RefreshCw, ShieldCheck, Database, Activity, GitBranch } from 'lucide-react';

interface HeaderProps {
  isLoading: boolean;
  onRefresh: () => void;
  onOpenSupabaseConfig?: () => void;
  onOpenDiagnostics?: () => void;
  onOpenDeploymentGuide?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isLoading,
  onRefresh,
  onOpenSupabaseConfig,
  onOpenDiagnostics,
  onOpenDeploymentGuide,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Brand & Title */}
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-400 font-bold shadow-inner">
              <ShieldCheck className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  Dashboard Penerimaan Pajak
                </h1>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800">
                  Seksi Pengawasan I
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                <span>Monitoring Realisasi 8 Account Representative (AR)</span>
                <span>•</span>
                <span>Tahun Pajak 2025 - 2026</span>
              </p>
            </div>
          </div>
          {/* Action Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {onOpenSupabaseConfig && (
              <button
                type="button"
                onClick={onOpenSupabaseConfig}
                title="Konfigurasi Database Supabase"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
              >
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                <span>Supabase</span>
              </button>
            )}
            {onOpenDiagnostics && (
              <button
                type="button"
                onClick={onOpenDiagnostics}
                title="Diagnostik Data"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
              >
                <Activity className="w-3.5 h-3.5 text-blue-400" />
                <span>Diagnostik</span>
              </button>
            )}
            {onOpenDeploymentGuide && (
              <button
                type="button"
                onClick={onOpenDeploymentGuide}
                title="Panduan Deploy ke Vercel"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
              >
                <GitBranch className="w-3.5 h-3.5 text-amber-400" />
                <span>Deploy</span>
              </button>
            )}
            {/* Refresh Button */}
            <button
              onClick={onRefresh}
              disabled={isLoading}
              title="Perbarui Data"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Data</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
