import React, { useState } from 'react';
import { ARSummary } from '../types/tax';
import { formatRupiah, formatPercent } from '../utils/taxCalculations';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  User,
  Info,
} from 'lucide-react';

interface MainTableProps {
  summaries: ARSummary[];
  grandTotal: ARSummary;
  onSelectAR: (namaAR: string, defaultYear?: number) => void;
  activeFlag: string;
}

type SortField = 'nama' | 'target' | 'realisasi2026' | 'realisasi2025' | 'selisih' | 'capaian' | 'pertumbuhan';
type SortOrder = 'asc' | 'desc';

export const MainTable: React.FC<MainTableProps> = ({
  summaries,
  grandTotal,
  onSelectAR,
  activeFlag,
}) => {
  const [sortField, setSortField] = useState<SortField>('realisasi2026');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder(field === 'nama' ? 'asc' : 'desc');
    }
  };

  const sortedSummaries = [...summaries].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];

    if (typeof aVal === 'string') {
      return sortOrder === 'asc'
        ? (aVal as string).localeCompare(bVal as string)
        : (bVal as string).localeCompare(aVal as string);
    }

    return sortOrder === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
  });

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 inline ml-1 opacity-40 group-hover:opacity-100" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-blue-600 inline ml-1" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-blue-600 inline ml-1" />
    );
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
      {/* Table Header Bar */}
      <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50/70">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Tabel Agregasi Kinerja Penerimaan Pajak per AR</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
              8 AR
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-blue-500" />
            <span>Klik pada <strong>Nama AR</strong> atau tombol rincian untuk membuka drill-down per Wajib Pajak</span>
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-600">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          <span>Tumbuh / Capaian Positif</span>
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-rose-500 ml-2"></span>
          <span>Minus / Kontraksi</span>
        </div>
      </div>

      {/* Responsive Table Scroll Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-700 border-collapse">
          {/* Header */}
          <thead className="bg-slate-100/90 text-xs text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200 select-none">
            <tr>
              <th scope="col" className="py-3 px-3.5 text-center w-12 text-slate-500">
                No
              </th>
              <th
                scope="col"
                className="py-3 px-4 cursor-pointer hover:bg-slate-200/70 transition-colors group"
                onClick={() => handleSort('nama')}
              >
                <div className="flex items-center gap-1">
                  <span>Nama AR</span>
                  {renderSortIcon('nama')}
                </div>
              </th>
              <th
                scope="col"
                className="py-3 px-4 text-right cursor-pointer hover:bg-slate-200/70 transition-colors group"
                onClick={() => handleSort('target')}
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Target ({activeFlag})</span>
                  {renderSortIcon('target')}
                </div>
              </th>
              <th
                scope="col"
                className="py-3 px-4 text-right cursor-pointer hover:bg-blue-100/60 transition-colors group bg-blue-50/50 text-blue-900 border-x border-blue-100"
                onClick={() => handleSort('realisasi2026')}
              >
                <div className="flex items-center justify-end gap-1">
                  <span>2026 (Berjalan)</span>
                  {renderSortIcon('realisasi2026')}
                </div>
              </th>
              <th
                scope="col"
                className="py-3 px-4 text-right cursor-pointer hover:bg-slate-200/70 transition-colors group"
                onClick={() => handleSort('realisasi2025')}
              >
                <div className="flex items-center justify-end gap-1">
                  <span>2025 (Tahun Lalu)</span>
                  {renderSortIcon('realisasi2025')}
                </div>
              </th>
              <th
                scope="col"
                className="py-3 px-4 text-right cursor-pointer hover:bg-slate-200/70 transition-colors group"
                onClick={() => handleSort('selisih')}
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Selisih</span>
                  {renderSortIcon('selisih')}
                </div>
              </th>
              <th
                scope="col"
                className="py-3 px-4 text-center cursor-pointer hover:bg-slate-200/70 transition-colors group"
                onClick={() => handleSort('capaian')}
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Capaian (%)</span>
                  {renderSortIcon('capaian')}
                </div>
              </th>
              <th
                scope="col"
                className="py-3 px-4 text-center cursor-pointer hover:bg-slate-200/70 transition-colors group"
                onClick={() => handleSort('pertumbuhan')}
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Tumbuh (%)</span>
                  {renderSortIcon('pertumbuhan')}
                </div>
              </th>
              <th scope="col" className="py-3 px-4 text-center w-28">
                Aksi Detail
              </th>
            </tr>
          </thead>

          {/* Body */}
          <tbody className="divide-y divide-slate-100">
            {sortedSummaries.map((ar, index) => {
              const isGrowthPositive = ar.pertumbuhan >= 0;
              const isCapaianHigh = ar.capaian >= 80;

              return (
                <tr
                  key={ar.nama}
                  className="hover:bg-blue-50/40 transition-colors group cursor-default"
                >
                  {/* 1. No */}
                  <td className="py-3.5 px-3.5 text-center text-xs font-mono text-slate-400 group-hover:text-slate-600">
                    {index + 1}
                  </td>

                  {/* 2. Nama AR (Clickable to open Drill-down WP) */}
                  <td className="py-3.5 px-4 font-medium text-slate-900">
                    <button
                      type="button"
                      onClick={() => onSelectAR(ar.nama)}
                      title={`Klik untuk membuka rincian Wajib Pajak ${ar.nama}`}
                      className="flex items-center gap-2.5 text-left group/ar cursor-pointer focus:outline-hidden"
                    >
                      <div className="w-8 h-8 rounded-full bg-blue-100 group-hover/ar:bg-blue-600 text-blue-700 group-hover/ar:text-white flex items-center justify-center font-bold text-xs shrink-0 transition-colors shadow-2xs">
                        {ar.nama
                          .split(' ')
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join('')}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 group-hover/ar:text-blue-600 group-hover/ar:underline flex items-center gap-1.5 transition-colors">
                          <span>{ar.nama}</span>
                          <ExternalLink className="w-3.5 h-3.5 text-blue-500 opacity-60 group-hover/ar:opacity-100 transition-opacity" />
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                          <span>Klik lihat {ar.wpCount2026} WP</span>
                        </div>
                      </div>
                    </button>
                  </td>

                  {/* 3. Target */}
                  <td className="py-3.5 px-4 text-right font-mono text-xs text-slate-700 whitespace-nowrap">
                    {formatRupiah(ar.target)}
                  </td>

                  {/* 4. 2026 (Tahun Berjalan) - Clean Formatted Currency (Not Clickable) */}
                  <td className="py-3.5 px-4 text-right font-mono text-xs whitespace-nowrap bg-blue-50/20 border-x border-blue-100/60 font-bold text-blue-950">
                    {formatRupiah(ar.realisasi2026)}
                  </td>

                  {/* 5. 2025 (Tahun Sebelumnya) - Clean Formatted Currency (Not Clickable) */}
                  <td className="py-3.5 px-4 text-right font-mono text-xs whitespace-nowrap text-slate-700">
                    {formatRupiah(ar.realisasi2025)}
                  </td>

                  {/* 6. Selisih */}
                  <td
                    className={`py-3.5 px-4 text-right font-mono text-xs font-semibold whitespace-nowrap ${
                      ar.selisih >= 0 ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {formatRupiah(ar.selisih)}
                  </td>

                  {/* 7. Capaian (%) */}
                  <td className="py-3.5 px-4 text-center whitespace-nowrap">
                    <span
                      className={`inline-block px-2.5 py-1 rounded-md text-xs font-bold ${
                        isCapaianHigh
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {ar.capaian.toFixed(2)}%
                    </span>
                  </td>

                  {/* 8. Tumbuh (%) */}
                  <td className="py-3.5 px-4 text-center whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold ${
                        isGrowthPositive
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-rose-50 text-rose-700'
                      }`}
                    >
                      {formatPercent(ar.pertumbuhan)}
                    </span>
                  </td>

                  {/* 9. Aksi Detail Button */}
                  <td className="py-3.5 px-4 text-center whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => onSelectAR(ar.nama, 2026)}
                      className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>Rincian WP</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* Footer - Grand Total Row */}
          <tfoot className="bg-slate-900 text-white font-bold border-t-2 border-slate-700">
            <tr>
              <td className="py-4 px-3.5 text-center text-xs text-slate-400">
                Σ
              </td>
              <td className="py-4 px-4 text-sm font-bold tracking-tight">
                <div className="flex items-center gap-2">
                  <span>{grandTotal.nama}</span>
                  <span className="text-[11px] font-normal px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    Total 8 AR
                  </span>
                </div>
              </td>
              <td className="py-4 px-4 text-right font-mono text-xs whitespace-nowrap text-slate-200">
                {formatRupiah(grandTotal.target)}
              </td>
              <td className="py-4 px-4 text-right font-mono text-xs whitespace-nowrap bg-blue-900/60 text-white border-x border-blue-800">
                {formatRupiah(grandTotal.realisasi2026)}
              </td>
              <td className="py-4 px-4 text-right font-mono text-xs whitespace-nowrap text-slate-300">
                {formatRupiah(grandTotal.realisasi2025)}
              </td>
              <td
                className={`py-4 px-4 text-right font-mono text-xs whitespace-nowrap ${
                  grandTotal.selisih >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {formatRupiah(grandTotal.selisih)}
              </td>
              <td className="py-4 px-4 text-center whitespace-nowrap">
                <span className="inline-block px-2.5 py-1 rounded bg-slate-800 text-amber-300 border border-slate-700 text-xs font-mono font-bold">
                  {grandTotal.capaian.toFixed(2)}%
                </span>
              </td>
              <td className="py-4 px-4 text-center whitespace-nowrap">
                <span
                  className={`inline-block px-2.5 py-1 rounded text-xs font-mono font-bold ${
                    grandTotal.pertumbuhan >= 0
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-rose-950 text-rose-300 border border-rose-800'
                  }`}
                >
                  {formatPercent(grandTotal.pertumbuhan)}
                </span>
              </td>
              <td className="py-4 px-4 text-center text-xs text-slate-400">
                -
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
