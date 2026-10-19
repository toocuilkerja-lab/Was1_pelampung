import React from 'react';
import { ARSummary } from '../types/tax';
import { formatCompactRupiah, formatRupiah, formatPercent } from '../utils/taxCalculations';
import { Target, TrendingUp, TrendingDown, DollarSign, CalendarCheck, Users } from 'lucide-react';

interface MetricCardsProps {
  summary: ARSummary;
  selectedMonthsCount: number;
}

export const MetricCards: React.FC<MetricCardsProps> = ({ summary, selectedMonthsCount }) => {
  const isGrowthPositive = summary.pertumbuhan >= 0;
  const isCapaianOnTrack = summary.capaian >= 80;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Target Penerimaan */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs relative overflow-hidden flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Target Penerimaan
          </span>
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Target className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2">
          <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight" title={formatRupiah(summary.target)}>
            {formatCompactRupiah(summary.target)}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Total target 8 Account Representative
          </div>
        </div>
        <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Nominal penuh:</span>
          <span className="font-mono font-medium text-slate-700">{formatRupiah(summary.target)}</span>
        </div>
      </div>

      {/* 2. Realisasi 2026 & Capaian */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs relative overflow-hidden flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Realisasi 2026 (Berjalan)
          </span>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2">
          <div className="flex items-baseline justify-between gap-2">
            <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight" title={formatRupiah(summary.realisasi2026)}>
              {formatCompactRupiah(summary.realisasi2026)}
            </div>
            <div
              className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                isCapaianOnTrack
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {summary.capaian.toFixed(2)}%
            </div>
          </div>
          {/* Progress Bar */}
          <div className="w-full bg-slate-100 h-2 rounded-full mt-2.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                summary.capaian >= 100
                  ? 'bg-emerald-500'
                  : summary.capaian >= 80
                  ? 'bg-blue-600'
                  : 'bg-amber-500'
              }`}
              style={{ width: `${Math.min(summary.capaian, 100)}%` }}
            />
          </div>
        </div>
        <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Capaian Target:</span>
          <span className="font-semibold text-slate-800">{formatPercent(summary.capaian, false)}</span>
        </div>
      </div>

      {/* 3. Realisasi 2025 (Pembanding) */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs relative overflow-hidden flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Realisasi 2025 (Tahun Lalu)
          </span>
          <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
            <CalendarCheck className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2">
          <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight" title={formatRupiah(summary.realisasi2025)}>
            {formatCompactRupiah(summary.realisasi2025)}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Periode bulan yang sama ({selectedMonthsCount} bulan)
          </div>
        </div>
        <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Nominal 2025:</span>
          <span className="font-mono font-medium text-slate-700">{formatRupiah(summary.realisasi2025)}</span>
        </div>
      </div>

      {/* 4. Pertumbuhan YoY & Selisih */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs relative overflow-hidden flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Pertumbuhan (YoY)
          </span>
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              isGrowthPositive
                ? 'bg-emerald-50 text-emerald-600'
                : 'bg-rose-50 text-rose-600'
            }`}
          >
            {isGrowthPositive ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
          </div>
        </div>
        <div className="mt-2">
          <div className="flex items-baseline justify-between">
            <div
              className={`text-xl sm:text-2xl font-bold tracking-tight ${
                isGrowthPositive ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {formatPercent(summary.pertumbuhan)}
            </div>
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded ${
                summary.selisih >= 0
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-rose-50 text-rose-700'
              }`}
            >
              {summary.selisih >= 0 ? 'Surplus' : 'Defisit'}
            </span>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Selisih: <span className="font-mono font-semibold text-slate-700">{formatCompactRupiah(summary.selisih)}</span>
          </div>
        </div>
        <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Wajib Pajak Aktif:</span>
          <span className="font-medium text-slate-800 flex items-center gap-1">
            <Users className="w-3 h-3 text-slate-400" />
            {summary.wpCount2026} WP ({summary.transaksiCount2026} Setoran)
          </span>
        </div>
      </div>
    </div>
  );
};
