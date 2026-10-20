import React, { useState, useEffect, useMemo } from 'react';
import { RealisasiRow, FlagFilter, MAP_DESCRIPTIONS } from '../types/tax';
import { matchesFlagFilter, formatRupiah, formatPercent } from '../utils/taxCalculations';
import {
  X,
  Search,
  Filter,
  Building2,
  Receipt,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  User,
} from 'lucide-react';
import { SlipDetailPopup } from './SlipDetailPopup';

interface JenisPajakDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  kdmap: string;
  allRealisasiRows: RealisasiRow[];
  globalFlag: FlagFilter;
  globalMonths: number[];
}

interface WPJenisPajakRow {
  namawp: string;
  namaAR: string;
  realisasi2026: number;
  realisasi2025: number;
  selisih: number;
  pertumbuhan: number;
  txCount2026: number;
  txCount2025: number;
  allTransactions: RealisasiRow[];
}

type SortField = 'namawp' | 'namaAR' | 'realisasi2026' | 'realisasi2025' | 'selisih' | 'pertumbuhan';
type SortOrder = 'asc' | 'desc';

export const JenisPajakDetailModal: React.FC<JenisPajakDetailModalProps> = ({
  isOpen,
  onClose,
  kdmap,
  allRealisasiRows,
  globalFlag,
  globalMonths,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAR, setSelectedAR] = useState<string>('Semua');
  const [sortField, setSortField] = useState<SortField>('realisasi2026');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Slip Detail Popup state
  const [slipPopup, setSlipPopup] = useState<{
    isOpen: boolean;
    wpName: string;
    kdmap: string;
    year: number;
    monthNum?: number;
    transactions: RealisasiRow[];
  }>({
    isOpen: false,
    wpName: '',
    kdmap: '',
    year: 2026,
    monthNum: undefined,
    transactions: [],
  });

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (slipPopup.isOpen) {
          setSlipPopup((prev) => ({ ...prev, isOpen: false }));
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, slipPopup.isOpen]);

  const mapDescription = MAP_DESCRIPTIONS[kdmap] || 'Pajak';

  // 1. Filter rows belonging to this MAP and matching global filters
  const mapRows = useMemo(() => {
    return allRealisasiRows.filter((r) => {
      if (String(r.kdmap) !== kdmap) return false;
      if (!matchesFlagFilter(r.flag, globalFlag)) return false;
      if (globalMonths.length > 0 && !globalMonths.includes(r.bulanbayar)) return false;
      return true;
    });
  }, [allRealisasiRows, kdmap, globalFlag, globalMonths]);

  // Distinct ARs present in this MAP
  const distinctARs = useMemo(() => {
    const set = new Set<string>();
    mapRows.forEach((r) => r.nama && set.add(r.nama));
    return Array.from(set).sort();
  }, [mapRows]);

  // 2. Aggregate per Wajib Pajak
  const wpSummaries: WPJenisPajakRow[] = useMemo(() => {
    const map = new Map<string, {
      namawp: string;
      namaAR: string;
      realisasi2026: number;
      realisasi2025: number;
      txCount2026: number;
      txCount2025: number;
      allTransactions: RealisasiRow[];
    }>();

    mapRows.forEach((row) => {
      if (!map.has(row.namawp)) {
        map.set(row.namawp, {
          namawp: row.namawp,
          namaAR: row.nama || '-',
          realisasi2026: 0,
          realisasi2025: 0,
          txCount2026: 0,
          txCount2025: 0,
          allTransactions: [],
        });
      }

      const item = map.get(row.namawp)!;
      item.allTransactions.push(row);
      const nom = Number(row.nominal) || 0;

      if (row.tahunbayar === 2026) {
        item.realisasi2026 += nom;
        item.txCount2026 += 1;
      } else if (row.tahunbayar === 2025) {
        item.realisasi2025 += nom;
        item.txCount2025 += 1;
      }
    });

    const list: WPJenisPajakRow[] = Array.from(map.values()).map((item) => {
      const selisih = item.realisasi2026 - item.realisasi2025;
      const pertumbuhan =
        item.realisasi2025 > 0
          ? (selisih / item.realisasi2025) * 100
          : item.realisasi2026 > 0
          ? 100
          : 0;

      return {
        ...item,
        selisih,
        pertumbuhan,
      };
    });

    // Filter by AR if selected
    let filtered = list;
    if (selectedAR !== 'Semua') {
      filtered = filtered.filter((w) => w.namaAR.trim().toLowerCase() === selectedAR.trim().toLowerCase());
    }

    // Filter by search query
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (w) => w.namawp.toLowerCase().includes(q) || w.namaAR.toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [mapRows, selectedAR, searchQuery]);

  // 3. Sort
  const sortedWPSummaries = useMemo(() => {
    return [...wpSummaries].sort((a, b) => {
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
  }, [wpSummaries, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder(field === 'namawp' || field === 'namaAR' ? 'asc' : 'desc');
    }
  };

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

  // Grand totals
  const grandTotal = useMemo(() => {
    const total2026 = wpSummaries.reduce((acc, wp) => acc + wp.realisasi2026, 0);
    const total2025 = wpSummaries.reduce((acc, wp) => acc + wp.realisasi2025, 0);
    const selisih = total2026 - total2025;
    const pertumbuhan =
      total2025 > 0
        ? (selisih / total2025) * 100
        : total2026 > 0
        ? 100
        : 0;

    return {
      total2026,
      total2025,
      selisih,
      pertumbuhan,
      wpCount: wpSummaries.length,
      totalTx: wpSummaries.reduce((acc, wp) => acc + wp.txCount2026 + wp.txCount2025, 0),
    };
  }, [wpSummaries]);

  // Open slip popup
  const openSlipPopup = (wpName: string, year: number, transactions: RealisasiRow[]) => {
    const txForPopup = transactions.filter((t) => {
      if (t.tahunbayar !== year) return false;
      if (!matchesFlagFilter(t.flag, globalFlag)) return false;
      if (globalMonths.length > 0 && !globalMonths.includes(t.bulanbayar)) return false;
      return true;
    });

    setSlipPopup({
      isOpen: true,
      wpName,
      kdmap,
      year,
      monthNum: undefined,
      transactions: txForPopup,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[94vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Bar */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-400 font-bold">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs uppercase tracking-wider text-blue-400 font-semibold">
                  Rincian Wajib Pajak per Jenis Pajak
                </span>
                <span className="text-slate-500">•</span>
                <span className="text-xs text-slate-300">Seksi Pengawasan I</span>
              </div>
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                <span className="font-mono bg-blue-950 px-2.5 py-0.5 rounded border border-blue-800 text-amber-400">
                  {kdmap}
                </span>
                <span>{mapDescription}</span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Tutup Modal (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter and Quick Metrics Bar */}
        <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-200 shrink-0 flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Filter AR and Search */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <Filter className="w-3.5 h-3.5 text-blue-600" />
                <span>Filter AR:</span>
                <select
                  value={selectedAR}
                  onChange={(e) => setSelectedAR(e.target.value)}
                  className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500 cursor-pointer shadow-2xs"
                >
                  <option value="Semua">Semua AR ({distinctARs.length} AR)</option>
                  {distinctARs.map((ar) => (
                    <option key={ar} value={ar}>
                      {ar}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari Wajib Pajak..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1 bg-white border border-slate-200 rounded-lg text-xs placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500 w-48 sm:w-60 shadow-2xs"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            <div className="text-xs text-slate-500">
              Filter Aktif: Flag <strong className="text-slate-700">{globalFlag}</strong> • <strong className="text-slate-700">{globalMonths.length} Bulan</strong>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-200/60">
            <div className="bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-2xs">
              <span className="text-[11px] text-slate-500 block">Total Realisasi 2026</span>
              <span className="text-sm sm:text-base font-bold text-blue-900 font-mono">
                {formatRupiah(grandTotal.total2026)}
              </span>
            </div>
            <div className="bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-2xs">
              <span className="text-[11px] text-slate-500 block">Total Realisasi 2025</span>
              <span className="text-sm sm:text-base font-bold text-slate-700 font-mono">
                {formatRupiah(grandTotal.total2025)}
              </span>
            </div>
            <div className="bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-2xs">
              <span className="text-[11px] text-slate-500 block">Pertumbuhan (YoY)</span>
              <span
                className={`text-sm sm:text-base font-bold font-mono ${
                  grandTotal.pertumbuhan >= 0 ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                {formatPercent(grandTotal.pertumbuhan)} ({formatRupiah(grandTotal.selisih)})
              </span>
            </div>
            <div className="bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-2xs">
              <span className="text-[11px] text-slate-500 block">Jumlah Wajib Pajak</span>
              <span className="text-sm sm:text-base font-bold text-slate-900">
                {grandTotal.wpCount} WP Terdaftar
              </span>
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-6 bg-slate-50/50">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700 border-collapse">
                <thead className="bg-slate-100 text-[11px] font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200 select-none">
                  <tr>
                    <th scope="col" className="py-2.5 px-3 text-center w-10 text-slate-400">
                      No
                    </th>
                    <th
                      scope="col"
                      onClick={() => handleSort('namawp')}
                      className="py-2.5 px-4 font-bold text-slate-800 cursor-pointer hover:bg-slate-200 transition-colors"
                      title="Urutkan berdasarkan Nama Wajib Pajak"
                    >
                      <div className="flex items-center gap-1">
                        <span>Nama Wajib Pajak (WP)</span>
                        {renderSortIcon('namawp')}
                      </div>
                    </th>
                    <th
                      scope="col"
                      onClick={() => handleSort('namaAR')}
                      className="py-2.5 px-3 font-semibold text-slate-700 cursor-pointer hover:bg-slate-200 transition-colors"
                      title="Urutkan berdasarkan AR Pengampu"
                    >
                      <div className="flex items-center gap-1">
                        <span>AR Pengampu</span>
                        {renderSortIcon('namaAR')}
                      </div>
                    </th>
                    <th
                      scope="col"
                      onClick={() => handleSort('realisasi2026')}
                      className="py-2.5 px-4 text-right font-bold text-blue-900 bg-blue-50/60 border-x border-blue-100 cursor-pointer hover:bg-blue-100/70 transition-colors"
                      title="Urutkan Realisasi 2026. Klik angka untuk melihat rincian slip setoran"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>2026 (Berjalan)</span>
                        {renderSortIcon('realisasi2026')}
                      </div>
                    </th>
                    <th
                      scope="col"
                      onClick={() => handleSort('realisasi2025')}
                      className="py-2.5 px-4 text-right font-semibold text-slate-700 cursor-pointer hover:bg-slate-200 transition-colors"
                      title="Urutkan Realisasi 2025. Klik angka untuk melihat rincian slip setoran"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>2025 (Tahun Lalu)</span>
                        {renderSortIcon('realisasi2025')}
                      </div>
                    </th>
                    <th
                      scope="col"
                      onClick={() => handleSort('selisih')}
                      className="py-2.5 px-4 text-right font-semibold text-slate-700 cursor-pointer hover:bg-slate-200 transition-colors"
                      title="Urutkan Selisih"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Selisih</span>
                        {renderSortIcon('selisih')}
                      </div>
                    </th>
                    <th
                      scope="col"
                      onClick={() => handleSort('pertumbuhan')}
                      className="py-2.5 px-4 text-center font-semibold text-slate-700 cursor-pointer hover:bg-slate-200 transition-colors"
                      title="Urutkan Pertumbuhan"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>Tumbuh (%)</span>
                        {renderSortIcon('pertumbuhan')}
                      </div>
                    </th>
                    <th scope="col" className="py-2.5 px-3 text-center font-semibold text-slate-600">
                      Setoran
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedWPSummaries.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-xs text-slate-500">
                        Tidak ada Wajib Pajak yang cocok dengan pencarian / filter pada MAP {kdmap}.
                      </td>
                    </tr>
                  ) : (
                    sortedWPSummaries.map((wp, idx) => {
                      const isPositive = wp.pertumbuhan >= 0;
                      const isZero = wp.realisasi2025 === 0 && wp.realisasi2026 === 0;

                      return (
                        <tr key={wp.namawp} className="hover:bg-blue-50/40 transition-colors">
                          <td className="py-2.5 px-3 text-center font-mono text-xs text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-4 font-semibold text-slate-900">
                            {wp.namawp}
                          </td>
                          <td className="py-2.5 px-3 text-xs text-slate-700">
                            <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              {wp.namaAR}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono text-xs border-x border-blue-50 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => openSlipPopup(wp.namawp, 2026, wp.allTransactions)}
                              className={`w-full text-right font-mono text-xs cursor-pointer hover:underline transition-colors ${
                                wp.realisasi2026 > 0
                                  ? 'text-blue-900 font-bold hover:text-blue-600'
                                  : 'text-slate-400 hover:text-slate-600'
                              }`}
                              title={`Klik untuk melihat rincian transaksi setoran ${wp.namawp} MAP ${kdmap} tahun 2026`}
                            >
                              {formatRupiah(wp.realisasi2026)}
                            </button>
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono text-xs whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => openSlipPopup(wp.namawp, 2025, wp.allTransactions)}
                              className={`w-full text-right font-mono text-xs cursor-pointer hover:underline transition-colors ${
                                wp.realisasi2025 > 0
                                  ? 'text-slate-800 font-bold hover:text-blue-600'
                                  : 'text-slate-400 hover:text-slate-600'
                              }`}
                              title={`Klik untuk melihat rincian transaksi setoran ${wp.namawp} MAP ${kdmap} tahun 2025`}
                            >
                              {formatRupiah(wp.realisasi2025)}
                            </button>
                          </td>
                          <td
                            className={`py-2.5 px-4 text-right font-mono text-xs whitespace-nowrap font-medium ${
                              wp.selisih >= 0 ? 'text-emerald-700' : 'text-rose-600'
                            }`}
                          >
                            {formatRupiah(wp.selisih)}
                          </td>
                          <td className="py-2.5 px-4 text-center whitespace-nowrap">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-xs font-mono font-semibold ${
                                isZero
                                  ? 'text-slate-400'
                                  : isPositive
                                  ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                                  : 'text-rose-700 bg-rose-50 border border-rose-200'
                              }`}
                            >
                              {isZero ? '0,00%' : formatPercent(wp.pertumbuhan)}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center text-xs text-slate-500 font-mono">
                            {wp.txCount2026 + wp.txCount2025}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>

                {/* Footer Grand Total */}
                <tfoot className="bg-slate-900 text-white font-bold border-t-2 border-slate-700 text-xs">
                  <tr>
                    <td className="py-3 px-3 text-center text-slate-400">Σ</td>
                    <td className="py-3 px-4 uppercase tracking-wider">
                      TOTAL ({sortedWPSummaries.length} Wajib Pajak)
                    </td>
                    <td className="py-3 px-3 text-slate-400">-</td>
                    <td className="py-3 px-4 text-right font-mono text-white bg-blue-900/60 border-x border-blue-800 whitespace-nowrap">
                      {formatRupiah(grandTotal.total2026)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-300 whitespace-nowrap">
                      {formatRupiah(grandTotal.total2025)}
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-mono whitespace-nowrap ${
                        grandTotal.selisih >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {formatRupiah(grandTotal.selisih)}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-mono font-bold ${
                          grandTotal.pertumbuhan >= 0
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-rose-950 text-rose-300 border border-rose-800'
                        }`}
                      >
                        {formatPercent(grandTotal.pertumbuhan)}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center text-slate-400 font-mono">
                      {grandTotal.totalTx}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Footer Bar */}
        <div className="px-6 py-3.5 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500">
            Menampilkan <span className="font-semibold text-slate-800">{sortedWPSummaries.length}</span> Wajib Pajak pada MAP <strong>{kdmap} ({mapDescription})</strong>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              Tutup Rincian
            </button>
          </div>
        </div>
      </div>

      {/* Slip Detail Popup when clicking 2026 or 2025 numbers */}
      <SlipDetailPopup
        isOpen={slipPopup.isOpen}
        onClose={() => setSlipPopup((prev) => ({ ...prev, isOpen: false }))}
        wpName={slipPopup.wpName}
        kdmap={slipPopup.kdmap}
        year={slipPopup.year}
        monthNum={slipPopup.monthNum}
        monthBasis="bulanbayar"
        transactions={slipPopup.transactions}
      />
    </div>
  );
};
