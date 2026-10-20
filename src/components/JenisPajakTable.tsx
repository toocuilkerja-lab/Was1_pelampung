import React, { useState } from 'react';
import { JenisPajakSummary } from '../types/tax';
import { formatRupiah, formatPercent } from '../utils/taxCalculations';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  Layers,
  Info,
  Building2,
} from 'lucide-react';

interface JenisPajakTableProps {
  summaries: JenisPajakSummary[];
  grandTotal: JenisPajakSummary;
  onSelectMAP: (kdmap: string) => void;
  activeFlag: string;
}

type SortField =
  | 'kdmap'
  | 'namaJenisPajak'
  | 'realisasi2026'
  | 'realisasi2025'
  | 'selisih'
  | 'pertumbuhan'
  | 'kontribusi'
  | 'wpCount2026';
type SortOrder = 'asc' | 'desc';

export const JenisPajakTable: React.FC<JenisPajakTableProps> = ({
  summaries,
  grandTotal,
  onSelectMAP,
  activeFlag,
}) => {
  const [sortField, setSortField] = useState<SortField>('realisasi2026');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder(field === 'kdmap' || field === 'namaJenisPajak' ? 'asc' : 'desc');
    }
  };

  const sortedSummaries = [...summaries].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];

    if (typeof aVal === 'string') {
      return sortOrder === 'asc'
        ? aVal.localeCompare(bVal as string)
        : (bVal as string).localeCompare(aVal);
    }

    return sortOrder === 'asc'
      ? (aVal as number) - (bVal as number)
      : (bVal as number) - (aVal as number);
  });

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return (
        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 inline ml-1 opacity-40 group-hover:opacity-100" />
      );
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
            <span>Tabel Agregasi Kinerja Penerimaan Pajak per Jenis Pajak (MAP)</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
              {summaries.length} Jenis Pajak
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-blue-500" />
            <span>
              Klik tombol <strong>Detail WP</strong> untuk melihat rincian seluruh Wajib Pajak pada jenis pajak tersebut
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-600">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          <span>Tumbuh Positif</span>
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
                className="py-3 px-3 cursor-pointer hover:bg-slate-200/70 transition-colors group"
                onClick={() => handleSort('kdmap')}
                title="Urutkan berdasarkan Kode MAP"
              >
                <div className="flex items-center gap-1">
                  <span>Kode MAP</span>
                  {renderSortIcon('kdmap')}
                </div>
              </th>
              <th
                scope="col"
                className="py-3 px-4 cursor-pointer hover:bg-slate-200/70 transition-colors group"
                onClick={() => handleSort('namaJenisPajak')}
                title="Urutkan berdasarkan Nama Jenis Pajak"
              >
                <div className="flex items-center gap-1">
                  <span>Jenis Pajak</span>
                  {renderSortIcon('namaJenisPajak')}
                </div>
              </th>
              <th
                scope="col"
                className="py-3 px-4 text-right cursor-pointer hover:bg-blue-100/60 transition-colors group bg-blue-50/50 text-blue-900 border-x border-blue-100"
                onClick={() => handleSort('realisasi2026')}
                title="Urutkan Realisasi 2026"
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
                title="Urutkan Realisasi 2025"
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
                title="Urutkan Selisih Nominal"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Selisih</span>
                  {renderSortIcon('selisih')}
                </div>
              </th>
              <th
                scope="col"
                className="py-3 px-4 text-center cursor-pointer hover:bg-slate-200/70 transition-colors group"
                onClick={() => handleSort('pertumbuhan')}
                title="Urutkan Pertumbuhan YoY"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Tumbuh (%)</span>
                  {renderSortIcon('pertumbuhan')}
                </div>
              </th>
              <th
                scope="col"
                className="py-3 px-4 text-right cursor-pointer hover:bg-slate-200/70 transition-colors group"
                onClick={() => handleSort('kontribusi')}
                title="Urutkan Kontribusi terhadap total realisasi 2026"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Kontribusi</span>
                  {renderSortIcon('kontribusi')}
                </div>
              </th>
              <th
                scope="col"
                className="py-3 px-4 text-center cursor-pointer hover:bg-slate-200/70 transition-colors group"
                onClick={() => handleSort('wpCount2026')}
                title="Urutkan Jumlah WP"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Wajib Pajak</span>
                  {renderSortIcon('wpCount2026')}
                </div>
              </th>
              <th scope="col" className="py-3 px-4 text-center w-28">
                Aksi
              </th>
            </tr>
          </thead>

          {/* Body */}
          <tbody className="divide-y divide-slate-100 font-sans">
            {sortedSummaries.map((item, index) => {
              const isPositiveGrowth = item.pertumbuhan >= 0;
              const isZeroGrowth = item.realisasi2025 === 0 && item.realisasi2026 === 0;

              return (
                <tr
                  key={item.kdmap}
                  className="hover:bg-slate-50/80 transition-colors group"
                >
                  {/* No */}
                  <td className="py-3.5 px-3.5 text-center text-xs font-mono text-slate-400">
                    {index + 1}
                  </td>

                  {/* Kode MAP */}
                  <td className="py-3.5 px-3 whitespace-nowrap font-mono text-xs font-bold text-slate-900">
                    <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {item.kdmap}
                    </span>
                  </td>

                  {/* Nama Jenis Pajak */}
                  <td className="py-3.5 px-4 font-medium text-slate-900">
                    <button
                      type="button"
                      onClick={() => onSelectMAP(item.kdmap)}
                      className="text-left font-semibold text-slate-900 hover:text-blue-600 hover:underline cursor-pointer transition-colors flex items-center gap-1.5"
                    >
                      <span>{item.namaJenisPajak}</span>
                    </button>
                  </td>

                  {/* 2026 */}
                  <td className="py-3.5 px-4 text-right font-mono text-xs font-bold text-blue-900 bg-blue-50/30 border-x border-blue-50 whitespace-nowrap">
                    {formatRupiah(item.realisasi2026)}
                  </td>

                  {/* 2025 */}
                  <td className="py-3.5 px-4 text-right font-mono text-xs text-slate-600 whitespace-nowrap">
                    {formatRupiah(item.realisasi2025)}
                  </td>

                  {/* Selisih */}
                  <td
                    className={`py-3.5 px-4 text-right font-mono text-xs whitespace-nowrap font-medium ${
                      item.selisih >= 0 ? 'text-emerald-700' : 'text-rose-600'
                    }`}
                  >
                    {formatRupiah(item.selisih)}
                  </td>

                  {/* Tumbuh */}
                  <td className="py-3.5 px-4 text-center whitespace-nowrap">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold ${
                        isZeroGrowth
                          ? 'bg-slate-100 text-slate-500'
                          : isPositiveGrowth
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {isZeroGrowth ? '0,00%' : formatPercent(item.pertumbuhan)}
                    </span>
                  </td>

                  {/* Kontribusi */}
                  <td className="py-3.5 px-4 text-right font-mono text-xs font-semibold text-slate-700 whitespace-nowrap">
                    {item.kontribusi.toFixed(2)}%
                  </td>

                  {/* WP Count */}
                  <td className="py-3.5 px-4 text-center text-xs text-slate-600 whitespace-nowrap">
                    <span className="font-semibold text-slate-900">{item.wpCount2026}</span> WP
                    <span className="text-slate-400 text-[11px] block">
                      ({item.transaksiCount2026} setoran)
                    </span>
                  </td>

                  {/* Action */}
                  <td className="py-3.5 px-4 text-center whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => onSelectMAP(item.kdmap)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer shadow-2xs hover:shadow-xs active:scale-95"
                      title={`Lihat rincian WP untuk MAP ${item.kdmap}`}
                    >
                      <span>Detail WP</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* Grand Total Footer */}
          <tfoot className="bg-slate-900 text-white font-semibold text-xs border-t-2 border-slate-700">
            <tr>
              <td className="py-4 px-3.5 text-center text-slate-400">Σ</td>
              <td className="py-4 px-3 font-mono font-bold text-amber-400">TOTAL</td>
              <td className="py-4 px-4 font-bold tracking-tight text-white uppercase">
                {grandTotal.namaJenisPajak} ({summaries.length} MAP)
              </td>
              <td className="py-4 px-4 text-right font-mono font-bold text-white whitespace-nowrap bg-blue-900/60 border-x border-blue-800">
                {formatRupiah(grandTotal.realisasi2026)}
              </td>
              <td className="py-4 px-4 text-right font-mono text-slate-300 whitespace-nowrap">
                {formatRupiah(grandTotal.realisasi2025)}
              </td>
              <td
                className={`py-4 px-4 text-right font-mono whitespace-nowrap font-bold ${
                  grandTotal.selisih >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {formatRupiah(grandTotal.selisih)}
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
              <td className="py-4 px-4 text-right font-mono font-bold text-white whitespace-nowrap">
                100,00%
              </td>
              <td className="py-4 px-4 text-center text-xs text-slate-300 whitespace-nowrap">
                <span className="font-bold text-white">{grandTotal.wpCount2026}</span> WP Total
                <span className="text-slate-400 text-[10px] block">
                  ({grandTotal.transaksiCount2026} setoran)
                </span>
              </td>
              <td className="py-4 px-4 text-center text-slate-400 text-[11px]">-</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
