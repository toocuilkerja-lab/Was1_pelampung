import React, { useState, useEffect, useMemo } from 'react';
import { RealisasiRow, FlagFilter, MONTHS, MAP_DESCRIPTIONS } from '../types/tax';
import { matchesFlagFilter, formatRupiah, formatPercent } from '../utils/taxCalculations';
import {
  X,
  Search,
  Download,
  Filter,
  Calendar,
  Building2,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  List,
  Layers,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { SlipDetailPopup } from './SlipDetailPopup';

interface DetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  namaAR: string;
  allRealisasiRows: RealisasiRow[];
  globalFlag: FlagFilter;
  globalMonths: number[];
  initialYear?: number;
}

interface WPSummaryRow {
  namawp: string;
  realisasi2026: number;
  realisasi2025: number;
  selisih: number;
  pertumbuhan: number;
  txCount2026: number;
  txCount2025: number;
  allTransactions: RealisasiRow[];
}

type SortField = 'namawp' | 'realisasi2026' | 'realisasi2025' | 'selisih' | 'pertumbuhan';
type SortOrder = 'asc' | 'desc';

export const DetailModal: React.FC<DetailModalProps> = ({
  isOpen,
  onClose,
  namaAR,
  allRealisasiRows,
  globalFlag,
  globalMonths,
}) => {
  // Modal-local filter states initialized from global filters
  const [modalFlag, setModalFlag] = useState<FlagFilter>(globalFlag);
  const [modalMonths, setModalMonths] = useState<number[]>(globalMonths);
  // Tambahan filter khusus PPM: 'bulanbayar' (default) vs 'masapajak' (bulan masa pajak 01-12)
  const [ppmFilterBasis, setPpmFilterBasis] = useState<'bulanbayar' | 'masapajak'>('bulanbayar');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMonthDropdownOpen, setIsMonthDropdownOpen] = useState(false);
  const [expandedWPs, setExpandedWPs] = useState<Set<string>>(new Set());
  const [expandedMAPs, setExpandedMAPs] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'wp_summary' | 'transactions'>('wp_summary');

  // Helper to extract numeric month (1-12) from masa pajak (e.g., "01" -> 1, "02" -> 2, 12 -> 12)
  const parseMasaToMonth = (masa: string | number | undefined | null): number => {
    if (masa === undefined || masa === null) return 0;
    const str = String(masa).trim();
    const num = parseInt(str, 10);
    return isNaN(num) ? 0 : num;
  };

  // Helper to extract period number:
  // "jika kdbayar = 200 maka pada kolom MAP untuk masa pajak = 00 - Tahunan ditaruh dibawah 12 - Masa Pajak desember"
  const getTxPeriodNum = (tx: RealisasiRow, isMasaBasis: boolean): number => {
    if (!isMasaBasis) {
      return tx.bulanbayar;
    }
    const kdbayar = String(tx.kdbayar ?? '').trim();
    const masaStr = String(tx.masa ?? '').trim();
    if (kdbayar === '200' || masaStr === '00' || masaStr === '0' || tx.masa === 0) {
      return 0; // 0 represents '00 - Tahunan'
    }
    return parseMasaToMonth(tx.masa);
  };

  // Helper to determine whether to use Tahun Pajak vs Tahun Bayar:
  // "Pada drill down per wajib pajak, pada flag PPM, flag bulan (masa pajak), khusus filter diatas maka menggunkaan tahun (tahun pajak) bukan tahun bayar"
  const getTxYear = (tx: RealisasiRow, isMasaBasis: boolean): number => {
    if (isMasaBasis) {
      return Number(tx.tahun) || 0;
    }
    return Number(tx.tahunbayar) || 0;
  };

  // Helper to check if period number matches modalMonths filter:
  const matchesMonthFilter = (periodNum: number, isMasaBasis: boolean): boolean => {
    if (modalMonths.length === 0) return false;
    // Default all selected (>=12 months): include 0 (Tahunan) when on masa basis
    if (modalMonths.length >= 12 && isMasaBasis && periodNum === 0) return true;
    return modalMonths.includes(periodNum);
  };

  // Popup state for clicking 2026 or 2025 nominals
  const [slipPopup, setSlipPopup] = useState<{
    isOpen: boolean;
    wpName: string;
    kdmap: string;
    year: number;
    monthNum?: number;
    monthBasis?: 'bulanbayar' | 'masapajak';
    transactions: RealisasiRow[];
  }>({
    isOpen: false,
    wpName: '',
    kdmap: '',
    year: 2026,
    monthBasis: 'bulanbayar',
    transactions: [],
  });

  const openSlipPopup = (
    wpName: string,
    kdmap: string,
    year: number,
    monthNum?: number,
    allWpTx: RealisasiRow[] = []
  ) => {
    const isMasaBasis = modalFlag === 'PPM' && ppmFilterBasis === 'masapajak';
    const filtered = allWpTx.filter((tx) => {
      if (kdmap !== 'Semua MAP' && String(tx.kdmap) !== kdmap) return false;
      const txYr = getTxYear(tx, isMasaBasis);
      if (txYr !== year) return false;
      const txPeriod = getTxPeriodNum(tx, isMasaBasis);
      if (monthNum !== undefined && txPeriod !== monthNum) return false;
      if (!matchesFlagFilter(tx.flag, modalFlag)) return false;
      if (monthNum === undefined && !matchesMonthFilter(txPeriod, isMasaBasis)) return false;
      return true;
    });

    setSlipPopup({
      isOpen: true,
      wpName,
      kdmap,
      year,
      monthNum,
      monthBasis: isMasaBasis ? 'masapajak' : 'bulanbayar',
      transactions: filtered,
    });
  };

  // Sorting state for WP summary table
  const [sortField, setSortField] = useState<SortField>('realisasi2026');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Sync with global filters whenever modal opens or global filters change
  useEffect(() => {
    if (isOpen) {
      setModalFlag(globalFlag);
      setModalMonths(globalMonths);
      setPpmFilterBasis('bulanbayar');
      setSearchQuery('');
      setExpandedWPs(new Set());
      setSortField('realisasi2026');
      setSortOrder('desc');
    }
  }, [isOpen, globalFlag, globalMonths]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // 1. Filter rows for this AR matching modal flag and active month basis
  const arRows = useMemo(() => {
    const isMasaBasis = modalFlag === 'PPM' && ppmFilterBasis === 'masapajak';
    return allRealisasiRows.filter((r) => {
      if (r.nama.trim().toLowerCase() !== namaAR.trim().toLowerCase()) return false;
      if (!matchesFlagFilter(r.flag, modalFlag)) return false;
      const txPeriod = getTxPeriodNum(r, isMasaBasis);
      if (!matchesMonthFilter(txPeriod, isMasaBasis)) return false;
      return true;
    });
  }, [allRealisasiRows, namaAR, modalFlag, modalMonths, ppmFilterBasis]);

  // 2. Aggregate per Wajib Pajak: Nama WP, 2026, 2025, Selisih, Tumbuh (%)
  const wpSummaries: WPSummaryRow[] = useMemo(() => {
    const isMasaBasis = modalFlag === 'PPM' && ppmFilterBasis === 'masapajak';
    const map = new Map<string, {
      namawp: string;
      realisasi2026: number;
      realisasi2025: number;
      txCount2026: number;
      txCount2025: number;
      allTransactions: RealisasiRow[];
    }>();

    arRows.forEach((row) => {
      if (!map.has(row.namawp)) {
        map.set(row.namawp, {
          namawp: row.namawp,
          realisasi2026: 0,
          realisasi2025: 0,
          txCount2026: 0,
          txCount2025: 0,
          allTransactions: [],
        });
      }
      const entry = map.get(row.namawp)!;
      entry.allTransactions.push(row);
      const nom = Number(row.nominal) || 0;
      const txYr = getTxYear(row, isMasaBasis);

      if (txYr === 2026) {
        entry.realisasi2026 += nom;
        entry.txCount2026 += 1;
      } else if (txYr === 2025) {
        entry.realisasi2025 += nom;
        entry.txCount2025 += 1;
      }
    });

    const list: WPSummaryRow[] = Array.from(map.values()).map((item) => {
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

    // Apply search filter
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      return list.filter((wp) =>
        wp.namawp.toLowerCase().includes(q) ||
        wp.allTransactions.some((t) => String(t.kdmap).includes(q) || String(t.kdbayar).includes(q))
      );
    }

    return list;
  }, [arRows, searchQuery]);

  // 3. Sort WP summaries
  const sortedWPSummaries = useMemo(() => {
    return [...wpSummaries].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      if (typeof aVal === 'string') {
        return sortOrder === 'asc'
          ? (aVal as string).localeCompare(bVal as string)
          : (bVal as string).localeCompare(aVal as string);
      }
      return sortOrder === 'asc'
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });
  }, [wpSummaries, sortField, sortOrder]);

  // 4. Totals for this AR
  const grandTotalWP = useMemo(() => {
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
      totalTx: arRows.length,
    };
  }, [wpSummaries, arRows]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder(field === 'namawp' ? 'asc' : 'desc');
    }
  };

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

  const toggleExpandWP = (namawp: string) => {
    const next = new Set(expandedWPs);
    if (next.has(namawp)) {
      next.delete(namawp);
    } else {
      next.add(namawp);
    }
    setExpandedWPs(next);
  };

  const toggleExpandAll = () => {
    if (expandedWPs.size === wpSummaries.length) {
      setExpandedWPs(new Set());
    } else {
      setExpandedWPs(new Set(wpSummaries.map((w) => w.namawp)));
    }
  };

  const toggleExpandMAP = (key: string) => {
    setExpandedMAPs((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleExpandAllMAPsForWP = (wpName: string, mapCodes: string[]) => {
    const keys = mapCodes.map((m) => `${wpName}_${m}`);
    const allExpanded = keys.every((k) => expandedMAPs.has(k));
    setExpandedMAPs((prev) => {
      const next = new Set(prev);
      if (allExpanded) {
        keys.forEach((k) => next.delete(k));
      } else {
        keys.forEach((k) => next.add(k));
      }
      return next;
    });
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['No', 'Nama AR', 'Nama Wajib Pajak', 'Realisasi 2026', 'Realisasi 2025', 'Selisih', 'Tumbuh (%)'];
    const rows = sortedWPSummaries.map((wp, idx) => [
      idx + 1,
      `"${namaAR}"`,
      `"${wp.namawp}"`,
      wp.realisasi2026,
      wp.realisasi2025,
      wp.selisih,
      `${wp.pertumbuhan.toFixed(2)}%`,
    ]);
    const csvContent = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Rincian_WP_${namaAR.replace(/\s+/g, '_')}_${modalFlag}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const flagOptions: FlagFilter[] = ['Semua', 'PPM', 'PKM', 'PKM P3'];

  const toggleModalMonth = (m: number) => {
    if (modalMonths.includes(m)) {
      setModalMonths(modalMonths.filter((val) => val !== m));
    } else {
      setModalMonths([...modalMonths, m].sort((a, b) => a - b));
    }
  };

  const resetToGlobalFilters = () => {
    setModalFlag(globalFlag);
    setModalMonths(globalMonths);
    setSearchQuery('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[94vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-400 font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs uppercase tracking-wider text-blue-400 font-semibold">
                  Drill-Down Kinerja per Wajib Pajak
                </span>
                <span className="text-slate-500">•</span>
                <span className="text-xs text-slate-300">Seksi Pengawasan I</span>
              </div>
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                <span>Account Representative:</span>
                <span className="text-amber-400 underline decoration-amber-400/40 underline-offset-4">
                  {namaAR}
                </span>
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
              title="Unduh Tabel WP ke file CSV / Excel"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export CSV</span>
            </button>
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

        {/* Modal Filter Bar */}
        <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-200 shrink-0 flex flex-col gap-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Filter Controls: Flag & Bulan Bayar */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Flag Segmented Control */}
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 shrink-0">
                <Filter className="w-3.5 h-3.5 text-blue-600" />
                <span>Filter Flag:</span>
              </div>
              <div className="flex items-center bg-white p-0.5 rounded-lg border border-slate-200 shadow-2xs">
                {flagOptions.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setModalFlag(f)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                      modalFlag === f
                        ? 'bg-blue-600 text-white shadow-2xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              {/* Tambahan Filter khusus Flag PPM: Bulan Bayar vs Bulan (Masa Pajak) */}
              {modalFlag === 'PPM' && (
                <div className="flex items-center gap-1 bg-amber-50 border border-amber-300 rounded-lg p-0.5 shadow-2xs shrink-0">
                  <span className="text-[11px] font-semibold text-amber-900 px-2 flex items-center gap-1">
                    <span>Basis Periode:</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setPpmFilterBasis('bulanbayar')}
                    className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all cursor-pointer ${
                      ppmFilterBasis === 'bulanbayar'
                        ? 'bg-amber-600 text-white font-semibold shadow-2xs'
                        : 'text-amber-900 hover:bg-amber-100'
                    }`}
                    title="Filter menggunakan Bulan Pembayaran (1 s.d. 12)"
                  >
                    Bulan Bayar
                  </button>
                  <button
                    type="button"
                    onClick={() => setPpmFilterBasis('masapajak')}
                    className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all cursor-pointer ${
                      ppmFilterBasis === 'masapajak'
                        ? 'bg-amber-600 text-white font-semibold shadow-2xs'
                        : 'text-amber-900 hover:bg-amber-100'
                    }`}
                    title="Filter menggunakan Bulan Masa Pajak (01 s.d. 12)"
                  >
                    Bulan (Masa Pajak)
                  </button>
                </div>
              )}

              {/* Bulan Selector inside Modal */}
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setIsMonthDropdownOpen(!isMonthDropdownOpen)}
                  className="flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 transition-colors cursor-pointer shadow-2xs"
                >
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  <span className="text-slate-500 font-normal">
                    {modalFlag === 'PPM' && ppmFilterBasis === 'masapajak'
                      ? 'Bulan (Masa Pajak):'
                      : 'Bulan Bayar:'}
                  </span>
                  <span className="font-semibold text-slate-900">
                    {modalMonths.length >= 12
                      ? (modalFlag === 'PPM' && ppmFilterBasis === 'masapajak' ? 'Semua (12 Masa + Tahunan)' : 'Semua (12 Bulan)')
                      : modalMonths.length === 0
                      ? 'Tidak ada'
                      : `${modalMonths.length} Periode`}
                  </span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {isMonthDropdownOpen && (
                  <div className="absolute left-0 mt-1.5 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2 text-xs font-semibold text-slate-800">
                      <span>
                        {modalFlag === 'PPM' && ppmFilterBasis === 'masapajak'
                          ? 'Pilih Bulan Masa Pajak (01 - 12 & 00)'
                          : 'Pilih Bulan Pembayaran (01 - 12)'}
                      </span>
                      <button
                        onClick={() => setIsMonthDropdownOpen(false)}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 mb-2.5">
                      {MONTHS.map((m) => {
                        const isSel = modalMonths.includes(m.value);
                        return (
                          <button
                            key={m.value}
                            type="button"
                            onClick={() => toggleModalMonth(m.value)}
                            className={`px-2 py-1 rounded text-xs font-medium cursor-pointer ${
                              isSel
                                ? 'bg-blue-600 text-white font-semibold'
                                : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                            }`}
                          >
                            {m.shortLabel}
                          </button>
                        );
                      })}
                    </div>

                    {/* Masa 00 - Tahunan jika PPM Masa Pajak */}
                    {modalFlag === 'PPM' && ppmFilterBasis === 'masapajak' && (
                      <div className="pt-2 pb-1.5 border-t border-slate-100 mb-2">
                        <button
                          type="button"
                          onClick={() => toggleModalMonth(0)}
                          className={`w-full py-1.5 px-2.5 rounded-lg text-xs font-medium flex items-center justify-between cursor-pointer transition-colors ${
                            modalMonths.includes(0) || modalMonths.length >= 12
                              ? 'bg-amber-600 text-white font-semibold shadow-2xs'
                              : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold">00</span>
                            <span>Masa 00 - Tahunan (kdbayar 200)</span>
                          </div>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/10">00</span>
                        </button>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                      <button
                        onClick={() =>
                          setModalMonths(
                            modalFlag === 'PPM' && ppmFilterBasis === 'masapajak'
                              ? [...MONTHS.map((m) => m.value), 0]
                              : MONTHS.map((m) => m.value)
                          )
                        }
                        className="text-blue-600 hover:underline font-medium cursor-pointer"
                      >
                        Pilih Semua
                      </button>
                      <button
                        onClick={() => setIsMonthDropdownOpen(false)}
                        className="px-2.5 py-0.5 bg-slate-900 text-white rounded font-medium cursor-pointer"
                      >
                        Selesai
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Reset to Global Filters */}
              {(modalFlag !== globalFlag || modalMonths.length !== globalMonths.length) && (
                <button
                  type="button"
                  onClick={resetToGlobalFilters}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium hover:underline ml-1 cursor-pointer"
                  title="Kembalikan filter modal ke filter dashboard utama"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Ikuti Dashboard</span>
                </button>
              )}
            </div>

            {/* View Mode & Search */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari Wajib Pajak..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1 bg-white border border-slate-200 rounded-lg text-xs placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500 w-44 sm:w-56"
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

              {/* View Mode Toggle */}
              <div className="flex items-center bg-white p-0.5 rounded-lg border border-slate-200 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setViewMode('wp_summary')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    viewMode === 'wp_summary'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                  title="Tabel Rekap per Wajib Pajak (2026, 2025, Selisih, Tumbuh)"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Rekap WP</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('transactions')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    viewMode === 'transactions'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                  title="Daftar Transaksi Pembayaran Pajak"
                >
                  <List className="w-3.5 h-3.5" />
                  <span>Transaksi</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar in Modal */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-200/60">
            <div className="bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-2xs">
              <span className="text-[11px] text-slate-500 block">Total Realisasi 2026</span>
              <span className="text-sm sm:text-base font-bold text-blue-900 font-mono">
                {formatRupiah(grandTotalWP.total2026)}
              </span>
            </div>
            <div className="bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-2xs">
              <span className="text-[11px] text-slate-500 block">Total Realisasi 2025</span>
              <span className="text-sm sm:text-base font-bold text-slate-700 font-mono">
                {formatRupiah(grandTotalWP.total2025)}
              </span>
            </div>
            <div className="bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-2xs">
              <span className="text-[11px] text-slate-500 block">Pertumbuhan (YoY)</span>
              <span className={`text-sm sm:text-base font-bold font-mono ${grandTotalWP.pertumbuhan >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {formatPercent(grandTotalWP.pertumbuhan)} ({formatRupiah(grandTotalWP.selisih)})
              </span>
            </div>
            <div className="bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-2xs">
              <span className="text-[11px] text-slate-500 block">Jumlah WP Terdaftar</span>
              <span className="text-sm sm:text-base font-bold text-slate-900">
                {grandTotalWP.wpCount} WP ({grandTotalWP.totalTx} Setoran)
              </span>
            </div>
          </div>
        </div>

        {/* Modal Main Content: The Drill-Down Table */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-6 bg-slate-50/50">
          {wpSummaries.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300 p-8">
              <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-slate-800">Tidak ada Wajib Pajak yang sesuai filter</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Silakan sesuaikan pilihan Flag, Bulan Bayar, atau kata kunci pencarian Wajib Pajak di atas.
              </p>
              <button
                type="button"
                onClick={resetToGlobalFilters}
                className="mt-4 px-4 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Filter</span>
              </button>
            </div>
          ) : viewMode === 'wp_summary' ? (
            /* PRIMARY DRILL-DOWN TABLE:
               Columns: Nama Wajib Pajak, 2026, 2025, Selisih, Tumbuh */
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-100/70 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
                <span className="font-semibold text-slate-800">
                  Daftar Kinerja Penerimaan Wajib Pajak ({sortedWPSummaries.length} WP)
                </span>
                <button
                  type="button"
                  onClick={toggleExpandAll}
                  className="text-blue-600 hover:text-blue-800 hover:underline font-medium cursor-pointer"
                >
                  {expandedWPs.size === wpSummaries.length ? 'Tutup Semua Rincian Setoran' : 'Buka Semua Rincian Setoran'}
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700 border-collapse">
                  <thead className="bg-slate-100 text-[11px] font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200 select-none">
                    <tr>
                      <th scope="col" className="py-3 px-3 text-center w-10 text-slate-400">
                        No
                      </th>
                      <th
                        scope="col"
                        className="py-3 px-4 cursor-pointer hover:bg-slate-200/70 transition-colors group"
                        onClick={() => handleSort('namawp')}
                      >
                        <div className="flex items-center gap-1 font-bold text-slate-900">
                          <span>Nama Wajib Pajak</span>
                          {renderSortIcon('namawp')}
                        </div>
                      </th>
                      <th
                        scope="col"
                        className="py-3 px-4 text-right cursor-pointer hover:bg-blue-100/60 transition-colors group bg-blue-50/50 text-blue-900 border-x border-blue-100"
                        onClick={() => handleSort('realisasi2026')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          <span>{modalFlag === 'PPM' && ppmFilterBasis === 'masapajak' ? '2026 (Thn Pajak)' : '2026 (Berjalan)'}</span>
                          {renderSortIcon('realisasi2026')}
                        </div>
                      </th>
                      <th
                        scope="col"
                        className="py-3 px-4 text-right cursor-pointer hover:bg-slate-200/70 transition-colors group"
                        onClick={() => handleSort('realisasi2025')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          <span>{modalFlag === 'PPM' && ppmFilterBasis === 'masapajak' ? '2025 (Thn Pajak)' : '2025 (Tahun Lalu)'}</span>
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
                        onClick={() => handleSort('pertumbuhan')}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span>Tumbuh (%)</span>
                          {renderSortIcon('pertumbuhan')}
                        </div>
                      </th>
                      <th scope="col" className="py-3 px-4 text-center w-28">
                        Rincian Setoran
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sortedWPSummaries.map((wp, idx) => {
                      const isExpanded = expandedWPs.has(wp.namawp);
                      const isGrowthPositive = wp.pertumbuhan >= 0;

                      return (
                        <React.Fragment key={wp.namawp}>
                          <tr className="hover:bg-blue-50/40 transition-colors group">
                            {/* 1. No */}
                            <td className="py-3 px-3 text-center font-mono text-slate-400">
                              {idx + 1}
                            </td>

                            {/* 2. Nama Wajib Pajak */}
                            <td className="py-3 px-4 font-semibold text-slate-900">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => toggleExpandWP(wp.namawp)}
                                  className="text-slate-400 hover:text-blue-600 transition-colors p-0.5 rounded cursor-pointer"
                                  title="Klik untuk membuka/tutup rincian setoran pajak WP ini"
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="w-4 h-4 text-blue-600" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4" />
                                  )}
                                </button>
                                <div>
                                  <div className="font-bold text-slate-900">{wp.namawp}</div>
                                  <div className="text-[10px] text-slate-400 font-normal">
                                    {wp.txCount2026} Setoran 2026 • {wp.txCount2025} Setoran 2025
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* 3. 2026 */}
                            <td className="py-3 px-4 text-right font-mono font-bold text-blue-950 bg-blue-50/20 border-x border-blue-100/60 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => openSlipPopup(wp.namawp, 'Semua MAP', 2026, undefined, wp.allTransactions)}
                                className="w-full text-right font-mono font-bold text-blue-950 hover:text-blue-600 hover:underline cursor-pointer transition-colors"
                                title={`Klik untuk melihat rincian transaksi setoran ${wp.namawp} tahun 2026`}
                              >
                                {formatRupiah(wp.realisasi2026)}
                              </button>
                            </td>

                            {/* 4. 2025 */}
                            <td className="py-3 px-4 text-right font-mono text-slate-700 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => openSlipPopup(wp.namawp, 'Semua MAP', 2025, undefined, wp.allTransactions)}
                                className="w-full text-right font-mono text-slate-700 hover:text-blue-600 hover:underline cursor-pointer transition-colors"
                                title={`Klik untuk melihat rincian transaksi setoran ${wp.namawp} tahun 2025`}
                              >
                                {formatRupiah(wp.realisasi2025)}
                              </button>
                            </td>

                            {/* 5. Selisih */}
                            <td
                              className={`py-3 px-4 text-right font-mono font-semibold whitespace-nowrap ${
                                wp.selisih >= 0 ? 'text-emerald-700' : 'text-rose-700'
                              }`}
                            >
                              {formatRupiah(wp.selisih)}
                            </td>

                            {/* 6. Tumbuh (%) */}
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              <span
                                className={`inline-block px-2.5 py-0.5 rounded text-xs font-bold ${
                                  isGrowthPositive
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : 'bg-rose-50 text-rose-700'
                                }`}
                              >
                                {formatPercent(wp.pertumbuhan)}
                              </span>
                            </td>

                            {/* 7. Toggle Accordion Button */}
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => toggleExpandWP(wp.namawp)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
                              >
                                <span>{isExpanded ? 'Tutup' : 'Lihat Slip'}</span>
                                {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                              </button>
                            </td>
                          </tr>

                          {/* Expanded Transaction Details for this WP */}
                          {isExpanded && (
                            <tr className="bg-slate-50/90">
                              <td colSpan={7} className="p-3 sm:p-5">
                                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                                  {/* Section Header */}
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-3 border-b border-slate-100">
                                    <div>
                                      <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                                        <span>
                                          Rincian Slip: Perbandingan per{' '}
                                          {modalFlag === 'PPM' && ppmFilterBasis === 'masapajak' ? 'Bulan (Masa Pajak)' : 'Bulan Bayar'}{' '}
                                          & MAP
                                        </span>
                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                                          {wp.namawp}
                                        </span>
                                        {modalFlag === 'PPM' && (
                                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                                            Basis: {ppmFilterBasis === 'masapajak' ? 'Masa Pajak (01-12)' : 'Bulan Bayar (1-12)'}
                                          </span>
                                        )}
                                      </h4>
                                      <p className="text-[11px] text-slate-500 mt-0.5">
                                        {modalFlag === 'PPM' && ppmFilterBasis === 'masapajak'
                                          ? 'Perbandingan realisasi 2026 vs 2025 per bulan Masa Pajak (01 s.d. 12) sesuai filter yang aktif'
                                          : 'Perbandingan realisasi 2026 vs 2025 per bulan pembayaran sesuai filter yang aktif'}
                                      </p>
                                    </div>
                                    <div className="text-[11px] text-slate-500 flex items-center gap-2">
                                      <span>Filter Flag: <strong>{modalFlag}</strong></span>
                                      <span>•</span>
                                      <span>{modalMonths.length} Bulan</span>
                                    </div>
                                  </div>

                                  {/* Comparison Table by MAP and Months */}
                                  {(() => {
                                    const isMasaBasis = modalFlag === 'PPM' && ppmFilterBasis === 'masapajak';
                                    const distinctMAPs = Array.from(
                                      new Set(wp.allTransactions.map((tx) => String(tx.kdmap)))
                                    ).sort((a, b) => a.localeCompare(b));

                                    if (distinctMAPs.length === 0) {
                                      return (
                                        <div className="py-6 text-center text-xs text-slate-500">
                                          Tidak ada transaksi pembayaran pada filter bulan & flag yang dipilih.
                                        </div>
                                      );
                                    }

                                    const mapData = distinctMAPs.map((kdmap) => {
                                      const mapKey = `${wp.namawp}_${kdmap}`;
                                      const isMapExpanded = expandedMAPs.has(mapKey);

                                      const filteredTx = wp.allTransactions.filter((tx) => {
                                        if (String(tx.kdmap) !== kdmap) return false;
                                        if (!matchesFlagFilter(tx.flag, modalFlag)) return false;
                                        const txPeriod = getTxPeriodNum(tx, isMasaBasis);
                                        if (!matchesMonthFilter(txPeriod, isMasaBasis)) return false;
                                        return true;
                                      });

                                      const nominal2026 = filteredTx
                                        .filter((tx) => getTxYear(tx, isMasaBasis) === 2026)
                                        .reduce((sum, tx) => sum + Number(tx.nominal || 0), 0);
                                      const nominal2025 = filteredTx
                                        .filter((tx) => getTxYear(tx, isMasaBasis) === 2025)
                                        .reduce((sum, tx) => sum + Number(tx.nominal || 0), 0);
                                      const selisih = nominal2026 - nominal2025;
                                      const pertumbuhan =
                                        nominal2025 > 0
                                          ? (selisih / nominal2025) * 100
                                          : nominal2026 > 0
                                          ? 100
                                          : 0;

                                      const breakdownItems = isMasaBasis
                                        ? [
                                            ...MONTHS.map((m) => ({
                                              monthNum: m.value,
                                              monthCode: String(m.value).padStart(2, '0'),
                                              monthName: m.label,
                                              displayName: `${String(m.value).padStart(2, '0')} - Masa Pajak ${m.label}`,
                                              isTahunan: false,
                                            })),
                                            {
                                              monthNum: 0,
                                              monthCode: '00',
                                              monthName: 'Tahunan',
                                              displayName: '00 - Tahunan',
                                              isTahunan: true,
                                            },
                                          ]
                                        : MONTHS.map((m) => ({
                                            monthNum: m.value,
                                            monthCode: String(m.value).padStart(2, '0'),
                                            monthName: m.label,
                                            displayName: `${String(m.value).padStart(2, '0')} - ${m.label}`,
                                            isTahunan: false,
                                          }));

                                      const monthsBreakdown = breakdownItems.map((item) => {
                                        const monthTx = wp.allTransactions.filter((tx) => {
                                          if (String(tx.kdmap) !== kdmap) return false;
                                          if (!matchesFlagFilter(tx.flag, modalFlag)) return false;
                                          const txPeriod = getTxPeriodNum(tx, isMasaBasis);
                                          if (txPeriod !== item.monthNum) return false;
                                          if (!matchesMonthFilter(item.monthNum, isMasaBasis)) return false;
                                          return true;
                                        });

                                        const m2026 = monthTx
                                          .filter((tx) => getTxYear(tx, isMasaBasis) === 2026)
                                          .reduce((sum, tx) => sum + Number(tx.nominal || 0), 0);
                                        const m2025 = monthTx
                                          .filter((tx) => getTxYear(tx, isMasaBasis) === 2025)
                                          .reduce((sum, tx) => sum + Number(tx.nominal || 0), 0);
                                        const mSelisih = m2026 - m2025;
                                        const mGrowth =
                                          m2025 > 0
                                            ? (mSelisih / m2025) * 100
                                            : m2026 > 0
                                            ? 100
                                            : 0;

                                        return {
                                          ...item,
                                          nominal2026: m2026,
                                          nominal2025: m2025,
                                          selisih: mSelisih,
                                          pertumbuhan: mGrowth,
                                        };
                                      });

                                      return {
                                        kdmap,
                                        mapKey,
                                        isMapExpanded,
                                        nominal2026,
                                        nominal2025,
                                        selisih,
                                        pertumbuhan,
                                        monthsBreakdown,
                                      };
                                    });

                                    const totalAll2026 = mapData.reduce((acc, m) => acc + m.nominal2026, 0);
                                    const totalAll2025 = mapData.reduce((acc, m) => acc + m.nominal2025, 0);
                                    const totalAllSelisih = totalAll2026 - totalAll2025;
                                    const totalAllGrowth =
                                      totalAll2025 > 0
                                        ? (totalAllSelisih / totalAll2025) * 100
                                        : totalAll2026 > 0
                                        ? 100
                                        : 0;

                                    const allMapsExpanded = distinctMAPs.every((m) =>
                                      expandedMAPs.has(`${wp.namawp}_${m}`)
                                    );

                                    return (
                                      <div className="space-y-2">
                                        <div className="flex justify-end">
                                          <button
                                            type="button"
                                            onClick={() => toggleExpandAllMAPsForWP(wp.namawp, distinctMAPs)}
                                            className="text-[11px] font-semibold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded transition-colors cursor-pointer inline-flex items-center gap-1.5"
                                          >
                                            <span className="font-mono">{allMapsExpanded ? '[-]' : '[+]'}</span>
                                            <span>{allMapsExpanded ? 'Tutup Semua Bulan MAP' : 'Buka Semua Bulan (01-12) MAP'}</span>
                                          </button>
                                        </div>
                                        <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-2xs">
                                          <table className="w-full text-left text-xs border-collapse">
                                            <thead className="bg-slate-100 text-[11px] font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200">
                                              <tr>
                                                <th className="py-2.5 px-3 text-center w-12 text-slate-600">
                                                  +-
                                                </th>
                                                <th className="py-2.5 px-4 font-bold text-slate-800">
                                                  MAP
                                                </th>
                                                <th className="py-2.5 px-4 text-right font-bold text-blue-900 bg-blue-50/60 border-x border-blue-100">
                                                  {isMasaBasis ? '2026 (Thn Pajak)' : '2026'}
                                                </th>
                                                <th className="py-2.5 px-4 text-right font-bold text-slate-800">
                                                  {isMasaBasis ? '2025 (Thn Pajak)' : '2025'}
                                                </th>
                                                <th className="py-2.5 px-4 text-right font-bold text-slate-800">
                                                  Selisih
                                                </th>
                                                <th className="py-2.5 px-4 text-center font-bold text-slate-800">
                                                  Tumbuh
                                                </th>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                              {mapData.map((m) => {
                                                const isGrowthPos = m.pertumbuhan >= 0;
                                                return (
                                                  <React.Fragment key={m.kdmap}>
                                                    <tr className="bg-slate-50/70 hover:bg-slate-100/80 transition-colors font-semibold">
                                                      <td className="py-2.5 px-3 text-center">
                                                        <button
                                                          type="button"
                                                          onClick={() => toggleExpandMAP(m.mapKey)}
                                                          title={m.isMapExpanded ? 'Tutup rincian bulan 01-12' : 'Buka rincian bulan 01-12'}
                                                          className="w-7 h-6 rounded border border-slate-300 bg-white hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700 flex items-center justify-center font-mono text-[11px] font-bold text-slate-700 shadow-2xs transition-colors cursor-pointer"
                                                        >
                                                          {m.isMapExpanded ? '[-]' : '[+]'}
                                                        </button>
                                                      </td>
                                                      <td className="py-2.5 px-4 text-slate-900 font-bold">
                                                        <div className="flex items-center gap-2">
                                                          <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-blue-950 font-bold">
                                                            {m.kdmap}
                                                          </span>
                                                          <span className="text-slate-800">
                                                            - {MAP_DESCRIPTIONS[m.kdmap] || 'Pajak'}
                                                          </span>
                                                        </div>
                                                      </td>
                                                      <td className="py-2.5 px-4 text-right font-mono font-bold text-blue-950 bg-blue-50/30 border-x border-blue-100 whitespace-nowrap">
                                                        <button
                                                          type="button"
                                                          onClick={() => openSlipPopup(wp.namawp, m.kdmap, 2026, undefined, wp.allTransactions)}
                                                          className="w-full text-right font-mono font-bold text-blue-950 hover:text-blue-600 hover:underline cursor-pointer transition-colors"
                                                          title={`Klik untuk melihat rincian transaksi setoran MAP ${m.kdmap} tahun 2026`}
                                                        >
                                                          {formatRupiah(m.nominal2026)}
                                                        </button>
                                                      </td>
                                                      <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-800 whitespace-nowrap">
                                                        <button
                                                          type="button"
                                                          onClick={() => openSlipPopup(wp.namawp, m.kdmap, 2025, undefined, wp.allTransactions)}
                                                          className="w-full text-right font-mono font-bold text-slate-800 hover:text-blue-600 hover:underline cursor-pointer transition-colors"
                                                          title={`Klik untuk melihat rincian transaksi setoran MAP ${m.kdmap} tahun 2025`}
                                                        >
                                                          {formatRupiah(m.nominal2025)}
                                                        </button>
                                                      </td>
                                                      <td
                                                        className={`py-2.5 px-4 text-right font-mono font-bold whitespace-nowrap ${
                                                          m.selisih < 0 ? 'text-rose-600' : 'text-emerald-700'
                                                        }`}
                                                      >
                                                        {formatRupiah(m.selisih)}
                                                      </td>
                                                      <td className="py-2.5 px-4 text-center whitespace-nowrap">
                                                        <span
                                                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                                                            isGrowthPos
                                                              ? 'bg-emerald-100 text-emerald-800'
                                                              : 'bg-rose-100 text-rose-800'
                                                          }`}
                                                        >
                                                          {formatPercent(m.pertumbuhan)}
                                                        </span>
                                                      </td>
                                                    </tr>

                                                    {/* Child Rows: Bulan 01-12 */}
                                                    {m.isMapExpanded &&
                                                      m.monthsBreakdown.map((mb) => {
                                                        const isMonthPos = mb.pertumbuhan >= 0;
                                                        const isZero = mb.nominal2026 === 0 && mb.nominal2025 === 0;

                                                        return (
                                                          <tr
                                                            key={`${m.kdmap}_${mb.monthNum}`}
                                                            className={`transition-colors ${
                                                              mb.isTahunan
                                                                ? 'bg-amber-50/40 hover:bg-amber-100/50 border-t border-amber-200/60 font-semibold'
                                                                : isZero
                                                                ? 'opacity-60 bg-white hover:bg-blue-50/30'
                                                                : 'bg-white hover:bg-blue-50/30'
                                                            }`}
                                                          >
                                                            <td className="py-1.5 px-3 text-center text-slate-300">
                                                              {mb.isTahunan ? (
                                                                <span className="text-amber-600 font-bold">•</span>
                                                              ) : (
                                                                '•'
                                                              )}
                                                            </td>
                                                            <td className="py-1.5 px-4">
                                                              <div className="pl-6 text-slate-700 flex items-center gap-2">
                                                                <span className={mb.isTahunan ? 'text-amber-500 font-bold' : 'text-slate-400 font-bold'}>└</span>
                                                                <span
                                                                  className={`font-mono text-xs ${
                                                                    mb.isTahunan
                                                                      ? 'font-bold text-amber-950 bg-amber-100/80 px-2 py-0.5 rounded border border-amber-300'
                                                                      : 'font-medium text-slate-800'
                                                                  }`}
                                                                >
                                                                  {mb.displayName}
                                                                </span>
                                                                {mb.isTahunan && (
                                                                  <span className="text-[10px] font-sans font-medium text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                                                                    kdbayar 200
                                                                  </span>
                                                                )}
                                                              </div>
                                                            </td>
                                                            <td className="py-1.5 px-4 text-right font-mono text-xs border-x border-slate-100 whitespace-nowrap">
                                                              <button
                                                                type="button"
                                                                onClick={() => openSlipPopup(wp.namawp, m.kdmap, 2026, mb.monthNum, wp.allTransactions)}
                                                                className={`w-full text-right font-mono text-xs cursor-pointer hover:underline transition-colors ${
                                                                  mb.nominal2026 > 0 ? 'text-blue-900 font-bold hover:text-blue-600' : 'text-slate-400 hover:text-slate-600'
                                                                }`}
                                                                title={`Klik untuk melihat rincian transaksi setoran MAP ${m.kdmap} ${mb.displayName} ${
                                                                  isMasaBasis ? 'tahun pajak' : 'tahun bayar'
                                                                } 2026`}
                                                              >
                                                                {formatRupiah(mb.nominal2026)}
                                                              </button>
                                                            </td>
                                                            <td className="py-1.5 px-4 text-right font-mono text-xs whitespace-nowrap">
                                                              <button
                                                                type="button"
                                                                onClick={() => openSlipPopup(wp.namawp, m.kdmap, 2025, mb.monthNum, wp.allTransactions)}
                                                                className={`w-full text-right font-mono text-xs cursor-pointer hover:underline transition-colors ${
                                                                  mb.nominal2025 > 0 ? 'text-slate-800 font-bold hover:text-blue-600' : 'text-slate-400 hover:text-slate-600'
                                                                }`}
                                                                title={`Klik untuk melihat rincian transaksi setoran MAP ${m.kdmap} ${mb.displayName} ${
                                                                  isMasaBasis ? 'tahun pajak' : 'tahun bayar'
                                                                } 2025`}
                                                              >
                                                                {formatRupiah(mb.nominal2025)}
                                                              </button>
                                                            </td>
                                                            <td
                                                              className={`py-1.5 px-4 text-right font-mono text-xs whitespace-nowrap ${
                                                                mb.selisih === 0
                                                                  ? 'text-slate-400'
                                                                  : mb.selisih < 0
                                                                  ? 'text-rose-600 font-semibold'
                                                                  : 'text-emerald-700 font-semibold'
                                                              }`}
                                                            >
                                                              {formatRupiah(mb.selisih)}
                                                            </td>
                                                            <td className="py-1.5 px-4 text-center whitespace-nowrap">
                                                              <span
                                                                className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-mono font-medium ${
                                                                  isZero
                                                                    ? 'text-slate-400'
                                                                    : isMonthPos
                                                                    ? 'text-emerald-700 bg-emerald-50'
                                                                    : 'text-rose-700 bg-rose-50'
                                                                }`}
                                                              >
                                                                {isZero ? '0,00%' : formatPercent(mb.pertumbuhan)}
                                                              </span>
                                                            </td>
                                                          </tr>
                                                        );
                                                      })}
                                                  </React.Fragment>
                                                );
                                              })}
                                            </tbody>

                                            <tfoot className="bg-slate-900 text-white font-bold border-t-2 border-slate-700 text-xs">
                                              <tr>
                                                <td className="py-3 px-3 text-center text-slate-400">
                                                </td>
                                                <td className="py-3 px-4 font-bold tracking-tight">
                                                  TOTAL SELURUH MAP ({distinctMAPs.length} MAP)
                                                </td>
                                                <td className="py-3 px-4 text-right font-mono text-xs whitespace-nowrap bg-blue-900/60 text-white border-x border-blue-800">
                                                  <button
                                                    type="button"
                                                    onClick={() => openSlipPopup(wp.namawp, 'Semua MAP', 2026, undefined, wp.allTransactions)}
                                                    className="w-full text-right font-mono text-xs text-white hover:text-blue-200 hover:underline cursor-pointer font-bold transition-colors"
                                                    title={`Klik untuk melihat seluruh rincian setoran ${wp.namawp} tahun 2026`}
                                                  >
                                                    {formatRupiah(totalAll2026)}
                                                  </button>
                                                </td>
                                                <td className="py-3 px-4 text-right font-mono text-xs whitespace-nowrap text-slate-300">
                                                  <button
                                                    type="button"
                                                    onClick={() => openSlipPopup(wp.namawp, 'Semua MAP', 2025, undefined, wp.allTransactions)}
                                                    className="w-full text-right font-mono text-xs text-slate-200 hover:text-white hover:underline cursor-pointer font-bold transition-colors"
                                                    title={`Klik untuk melihat seluruh rincian setoran ${wp.namawp} tahun 2025`}
                                                  >
                                                    {formatRupiah(totalAll2025)}
                                                  </button>
                                                </td>
                                                <td
                                                  className={`py-3 px-4 text-right font-mono text-xs whitespace-nowrap ${
                                                    totalAllSelisih < 0 ? 'text-rose-400' : 'text-emerald-400'
                                                  }`}
                                                >
                                                  {formatRupiah(totalAllSelisih)}
                                                </td>
                                                <td className="py-3 px-4 text-center whitespace-nowrap">
                                                  <span
                                                    className={`inline-block px-2 py-0.5 rounded text-xs font-mono font-bold ${
                                                      totalAllGrowth >= 0
                                                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                                        : 'bg-rose-950 text-rose-300 border border-rose-800'
                                                    }`}
                                                  >
                                                    {formatPercent(totalAllGrowth)}
                                                  </span>
                                                </td>
                                              </tr>
                                            </tfoot>
                                          </table>
                                        </div>
                                      </div>
                                    );
                                  })()}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>

                  {/* Grand Total Footer for this AR */}
                  <tfoot className="bg-slate-900 text-white font-bold border-t-2 border-slate-700">
                    <tr>
                      <td className="py-3.5 px-3 text-center text-xs text-slate-400">
                      </td>
                      <td className="py-3.5 px-4 text-xs font-bold tracking-tight">
                        TOTAL SELURUH WP (AR {namaAR})
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-xs whitespace-nowrap bg-blue-900/60 text-white border-x border-blue-800">
                        {formatRupiah(grandTotalWP.total2026)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-xs whitespace-nowrap text-slate-300">
                        {formatRupiah(grandTotalWP.total2025)}
                      </td>
                      <td
                        className={`py-3.5 px-4 text-right font-mono text-xs whitespace-nowrap ${
                          grandTotalWP.selisih >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {formatRupiah(grandTotalWP.selisih)}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-mono font-bold ${
                            grandTotalWP.pertumbuhan >= 0
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : 'bg-rose-950 text-rose-300 border border-rose-800'
                          }`}
                        >
                          {formatPercent(grandTotalWP.pertumbuhan)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center text-[11px] text-slate-400">
                        {grandTotalWP.wpCount} WP Aktif
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ) : (
            /* SECONDARY VIEW: FLAT TRANSACTIONS LIST */
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700 border-collapse">
                  <thead className="bg-slate-100 text-[11px] font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th scope="col" className="py-2.5 px-3 text-center w-10 text-slate-400">
                        No
                      </th>
                      <th scope="col" className="py-2.5 px-4 font-bold text-slate-800">
                        Nama Wajib Pajak (WP)
                      </th>
                      <th scope="col" className="py-2.5 px-3 text-center">
                        MAP
                      </th>
                      <th scope="col" className="py-2.5 px-3 text-center">
                        Kode Bayar
                      </th>
                      <th scope="col" className="py-2.5 px-3 text-center">
                        Masa
                      </th>
                      <th scope="col" className="py-2.5 px-3 text-center font-bold text-blue-900 bg-blue-50/50">
                        Tahun Pajak
                      </th>
                      <th scope="col" className="py-2.5 px-3 text-center">
                        Tahun Bayar
                      </th>
                      <th scope="col" className="py-2.5 px-3 text-center">
                        Bulan Bayar
                      </th>
                      <th scope="col" className="py-2.5 px-3 text-center">
                        Flag
                      </th>
                      <th scope="col" className="py-2.5 px-4 text-right font-bold text-slate-900">
                        Nominal Realisasi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {arRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-blue-50/50 transition-colors">
                        <td className="py-2 px-3 text-center font-mono text-slate-400">{idx + 1}</td>
                        <td className="py-2 px-4 font-semibold text-slate-900">{row.namawp}</td>
                        <td className="py-2 px-3 text-center font-mono">{row.kdmap}</td>
                        <td className="py-2 px-3 text-center font-mono">{row.kdbayar}</td>
                        <td className="py-2 px-3 text-center font-mono">{row.masa}</td>
                        <td className="py-2 px-3 text-center font-mono font-bold text-blue-950 bg-blue-50/30">{row.tahun}</td>
                        <td className="py-2 px-3 text-center font-mono">{row.tahunbayar}</td>
                        <td className="py-2 px-3 text-center font-mono">
                          {MONTHS.find((m) => m.value === row.bulanbayar)?.shortLabel} ({row.bulanbayar})
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 border border-slate-200">
                            {row.flag}
                          </span>
                        </td>
                        <td className="py-2 px-4 text-right font-mono font-semibold text-slate-900">
                          {formatRupiah(row.nominal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Bar */}
        <div className="px-6 py-3.5 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500">
            Menampilkan <span className="font-semibold text-slate-800">{wpSummaries.length}</span> Wajib Pajak untuk AR <strong>{namaAR}</strong> ({arRows.length} setoran pajak terfilter)
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              className="sm:hidden px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
            >
              Export CSV
            </button>
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
        monthBasis={slipPopup.monthBasis}
        transactions={slipPopup.transactions}
      />
    </div>
  );
};
