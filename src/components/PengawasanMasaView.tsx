import React, { useState, useMemo } from 'react';
import { RealisasiRow, FlagFilter, MAP_DESCRIPTIONS } from '../types/tax';
import { formatRupiah, formatPercent } from '../utils/taxCalculations';
import {
  Search,
  Filter,
  Calendar,
  Layers,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Info,
} from 'lucide-react';
import { SlipDetailPopup } from './SlipDetailPopup';

interface PengawasanMasaViewProps {
  realisasiRows: RealisasiRow[];
  arList: string[];
  globalFlag?: FlagFilter;
  globalMonths?: number[];
}

export type YearFilterOption = 2026 | 2025 | 'both';

interface MonthColumnDef {
  monthNum: number;
  label: string;
}

const MONTH_COLUMNS: MonthColumnDef[] = [
  { monthNum: 1, label: 'Januari' },
  { monthNum: 2, label: 'Februari' },
  { monthNum: 3, label: 'Maret' },
  { monthNum: 4, label: 'April' },
  { monthNum: 5, label: 'Mei' },
  { monthNum: 6, label: 'Juni' },
  { monthNum: 7, label: 'Juli' },
  { monthNum: 8, label: 'Agustus' },
  { monthNum: 9, label: 'September' },
  { monthNum: 10, label: 'Oktober' },
  { monthNum: 11, label: 'November' },
  { monthNum: 12, label: 'Desember' },
  { monthNum: 0, label: 'Tahunan' },
];

interface MonthlyData {
  nominal2026: number;
  nominal2025: number;
  transactions: RealisasiRow[];
}

interface WPPeriodSummary {
  namawp: string;
  namaAR: string;
  kdmapList: string[];
  monthly: Record<number, MonthlyData>;
  total2026: number;
  total2025: number;
  allTransactions: RealisasiRow[];
}

type SortField = 'namawp' | 'namaAR' | 'total';
type SortOrder = 'asc' | 'desc';

export const PengawasanMasaView: React.FC<PengawasanMasaViewProps> = ({
  realisasiRows,
  arList,
}) => {
  // 1. Filter states - Default filter tahun = 2026
  const [filterYear, setFilterYear] = useState<YearFilterOption>(2026);
  const [filterAR, setFilterAR] = useState<string>('Semua');
  const [filterMAP, setFilterMAP] = useState<string>('Semua');
  const [searchWP, setSearchWP] = useState<string>('');
  const [yearBasis, setYearBasis] = useState<'tahunbayar' | 'tahun'>('tahunbayar'); // Tahun Bayar vs Tahun Pajak

  // Table sorting
  const [sortField, setSortField] = useState<SortField>('total');
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

  // Distinct MAPs present in realisasi rows
  const distinctMAPs = useMemo(() => {
    const set = new Set<string>();
    realisasiRows.forEach((r) => r.kdmap && set.add(String(r.kdmap)));
    return Array.from(set).sort();
  }, [realisasiRows]);

  // Helper to extract numeric month from masa pajak
  const parseMasaToNumber = (masa: string | number | undefined | null): number => {
    if (masa === undefined || masa === null) return 0;
    const str = String(masa).trim();
    const num = parseInt(str, 10);
    return isNaN(num) ? 0 : num;
  };

  // Helper to get transaction year based on selected yearBasis
  const getTxYear = (tx: RealisasiRow): number => {
    return yearBasis === 'tahun' ? tx.tahun : tx.tahunbayar;
  };

  // Helper to get period number (month 1-12 or 0 for Tahunan)
  const getTxPeriod = (tx: RealisasiRow): number => {
    if (String(tx.kdbayar) === '200' || String(tx.masa) === '00' || tx.masa === 0) {
      return 0; // 00 - Tahunan
    }
    const m = parseMasaToNumber(tx.masa);
    if (m >= 1 && m <= 12) return m;
    return tx.bulanbayar || 0;
  };

  // 1. Filter base transactions by top filters: AR and MAP
  // Rule: Pengawasan Masa SELALU SEMUA FLAG (tidak memfilter PPM, PKM, PKM P3)
  const filteredBaseTransactions = useMemo(() => {
    return realisasiRows.filter((tx) => {
      // Filter AR
      if (filterAR !== 'Semua' && tx.nama.trim().toLowerCase() !== filterAR.trim().toLowerCase()) {
        return false;
      }

      // Filter MAP
      if (filterMAP !== 'Semua' && String(tx.kdmap) !== filterMAP) {
        return false;
      }

      // Note: Khusus Pengawasan Masa hanya semua flag (tidak bisa memilih PPM, PKM, PKM P3)
      return true;
    });
  }, [realisasiRows, filterAR, filterMAP]);

  // 2. Aggregate per Wajib Pajak and by month (Jan-Des & Tahunan)
  const wpSummaries: WPPeriodSummary[] = useMemo(() => {
    const wpMap = new Map<string, {
      namawp: string;
      namaAR: string;
      kdmapSet: Set<string>;
      transactions: RealisasiRow[];
    }>();

    filteredBaseTransactions.forEach((tx) => {
      if (!wpMap.has(tx.namawp)) {
        wpMap.set(tx.namawp, {
          namawp: tx.namawp,
          namaAR: tx.nama || '-',
          kdmapSet: new Set(),
          transactions: [],
        });
      }
      const entry = wpMap.get(tx.namawp)!;
      entry.transactions.push(tx);
      if (tx.kdmap) entry.kdmapSet.add(String(tx.kdmap));
    });

    const results: WPPeriodSummary[] = [];

    wpMap.forEach((entry) => {
      // Initialize monthly map (0-12)
      const monthly: Record<number, MonthlyData> = {};
      MONTH_COLUMNS.forEach((col) => {
        monthly[col.monthNum] = { nominal2026: 0, nominal2025: 0, transactions: [] };
      });

      let total2026 = 0;
      let total2025 = 0;

      entry.transactions.forEach((tx) => {
        const y = getTxYear(tx);
        const p = getTxPeriod(tx);
        const nom = Number(tx.nominal || 0);

        if (monthly[p]) {
          monthly[p].transactions.push(tx);
          if (y === 2026) {
            monthly[p].nominal2026 += nom;
            total2026 += nom;
          } else if (y === 2025) {
            monthly[p].nominal2025 += nom;
            total2025 += nom;
          }
        }
      });

      // Filter WP based on filterYear
      const hasRelevantData =
        filterYear === 'both'
          ? total2026 > 0 || total2025 > 0
          : filterYear === 2026
          ? total2026 > 0
          : total2025 > 0;

      if (!hasRelevantData) return;

      results.push({
        namawp: entry.namawp,
        namaAR: entry.namaAR,
        kdmapList: Array.from(entry.kdmapSet),
        monthly,
        total2026,
        total2025,
        allTransactions: entry.transactions,
      });
    });

    // Search filter
    let filtered = results;
    if (searchWP.trim() !== '') {
      const q = searchWP.toLowerCase().trim();
      filtered = filtered.filter(
        (w) =>
          w.namawp.toLowerCase().includes(q) ||
          w.namaAR.toLowerCase().includes(q) ||
          w.kdmapList.some((k) => k.includes(q))
      );
    }

    return filtered;
  }, [filteredBaseTransactions, filterYear, searchWP, yearBasis]);

  // 3. Sort WP Summaries
  const sortedWPSummaries = useMemo(() => {
    return [...wpSummaries].sort((a, b) => {
      if (sortField === 'namawp') {
        return sortOrder === 'asc'
          ? a.namawp.localeCompare(b.namawp)
          : b.namawp.localeCompare(a.namawp);
      }
      if (sortField === 'namaAR') {
        return sortOrder === 'asc'
          ? a.namaAR.localeCompare(b.namaAR)
          : b.namaAR.localeCompare(a.namaAR);
      }
      // 'total'
      const valA = filterYear === 2025 ? a.total2025 : a.total2026;
      const valB = filterYear === 2025 ? b.total2025 : b.total2026;
      return sortOrder === 'asc' ? valA - valB : valB - valA;
    });
  }, [wpSummaries, sortField, sortOrder, filterYear]);

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

  // Open slip detail popup
  const openSlip = (
    wpName: string,
    year: number,
    monthNum?: number,
    txList: RealisasiRow[] = [],
    kdmap?: string
  ) => {
    const filtered = txList.filter((tx) => {
      if (getTxYear(tx) !== year) return false;
      if (kdmap && String(tx.kdmap) !== kdmap) return false;
      if (monthNum !== undefined) {
        const p = getTxPeriod(tx);
        if (p !== monthNum) return false;
      }
      return true;
    });

    setSlipPopup({
      isOpen: true,
      wpName,
      kdmap: kdmap || (filtered[0]?.kdmap ? String(filtered[0].kdmap) : ''),
      year,
      monthNum,
      transactions: filtered,
    });
  };

  // Grand totals per month and overall
  const grandMonthlyTotals = useMemo(() => {
    const monthly: Record<number, { nom2026: number; nom2025: number; transactions: RealisasiRow[] }> = {};
    MONTH_COLUMNS.forEach((col) => {
      monthly[col.monthNum] = { nom2026: 0, nom2025: 0, transactions: [] };
    });

    let overall2026 = 0;
    let overall2025 = 0;
    const allTx: RealisasiRow[] = [];

    sortedWPSummaries.forEach((wp) => {
      overall2026 += wp.total2026;
      overall2025 += wp.total2025;
      allTx.push(...wp.allTransactions);

      MONTH_COLUMNS.forEach((col) => {
        const m = wp.monthly[col.monthNum];
        if (m) {
          monthly[col.monthNum].nom2026 += m.nominal2026;
          monthly[col.monthNum].nom2025 += m.nominal2025;
          monthly[col.monthNum].transactions.push(...m.transactions);
        }
      });
    });

    return {
      monthly,
      overall2026,
      overall2025,
      allTx,
    };
  }, [sortedWPSummaries]);

  // Helper to render month cell content
  const renderMonthCell = (
    nom2026: number,
    nom2025: number,
    wpName: string,
    monthNum: number,
    txList: RealisasiRow[],
    kdmap?: string
  ) => {
    if (filterYear === 'both') {
      // 2026 & 2025 selected
      if (nom2026 === 0 && nom2025 === 0) {
        return <span className="text-slate-300 font-mono text-center block">-</span>;
      }

      const diff = nom2026 - nom2025;
      const growth = nom2025 > 0 ? (diff / nom2025) * 100 : nom2026 > 0 ? 100 : 0;
      const isZero = nom2025 === 0 && nom2026 === 0;

      return (
        <div className="text-[11px] font-mono leading-tight space-y-0.5 text-right py-0.5">
          <div className="flex items-center justify-between gap-1 text-slate-800">
            <span className="text-[10px] text-slate-400 font-sans select-none">2026 :</span>
            <button
              type="button"
              onClick={() => openSlip(wpName, 2026, monthNum, txList, kdmap)}
              className={`font-mono transition-colors ${
                nom2026 > 0
                  ? 'text-blue-900 font-bold hover:text-blue-600 hover:underline cursor-pointer'
                  : 'text-slate-400'
              }`}
              title={`Lihat slip 2026: ${formatRupiah(nom2026)}`}
            >
              {nom2026 > 0 ? formatRupiah(nom2026) : '-'}
            </button>
          </div>
          <div className="flex items-center justify-between gap-1 text-slate-700">
            <span className="text-[10px] text-slate-400 font-sans select-none">2025 :</span>
            <button
              type="button"
              onClick={() => openSlip(wpName, 2025, monthNum, txList, kdmap)}
              className={`font-mono transition-colors ${
                nom2025 > 0
                  ? 'text-slate-700 font-medium hover:text-blue-600 hover:underline cursor-pointer'
                  : 'text-slate-400'
              }`}
              title={`Lihat slip 2025: ${formatRupiah(nom2025)}`}
            >
              {nom2025 > 0 ? formatRupiah(nom2025) : '-'}
            </button>
          </div>
          <div className="pt-0.5 text-right border-t border-slate-100">
            <span
              className={`inline-block text-[10px] font-semibold px-1 rounded ${
                isZero
                  ? 'text-slate-400'
                  : growth >= 0
                  ? 'text-emerald-700 bg-emerald-50'
                  : 'text-rose-700 bg-rose-50'
              }`}
            >
              {isZero ? '0%' : `Tumbuh ${growth >= 0 ? '+' : ''}${formatPercent(growth)}`}
            </span>
          </div>
        </div>
      );
    } else {
      // Single year selected (2026 or 2025) - only amount without year prefix
      const val = filterYear === 2026 ? nom2026 : nom2025;
      if (val === 0) {
        return <span className="text-slate-300 font-mono text-center block">-</span>;
      }
      return (
        <button
          type="button"
          onClick={() => openSlip(wpName, filterYear, monthNum, txList, kdmap)}
          className="w-full text-right font-mono text-xs text-blue-900 font-semibold hover:text-blue-600 hover:underline cursor-pointer whitespace-nowrap block"
          title={`Lihat slip ${filterYear}: ${formatRupiah(val)}`}
        >
          {formatRupiah(val)}
        </button>
      );
    }
  };

  // Helper to render total cell content
  const renderTotalCell = (
    tot2026: number,
    tot2025: number,
    wpName: string,
    txList: RealisasiRow[],
    kdmap?: string
  ) => {
    if (filterYear === 'both') {
      const diff = tot2026 - tot2025;
      const growth = tot2025 > 0 ? (diff / tot2025) * 100 : tot2026 > 0 ? 100 : 0;
      const isZero = tot2025 === 0 && tot2026 === 0;

      return (
        <div className="text-[11px] font-mono leading-tight space-y-0.5 text-right py-0.5">
          <div className="flex items-center justify-between gap-1 text-slate-800">
            <span className="text-[10px] text-slate-400 font-sans select-none">2026 :</span>
            <button
              type="button"
              onClick={() => openSlip(wpName, 2026, undefined, txList, kdmap)}
              className={`font-mono transition-colors ${
                tot2026 > 0
                  ? 'text-blue-900 font-bold hover:text-blue-600 hover:underline cursor-pointer'
                  : 'text-slate-400'
              }`}
              title={`Lihat total slip 2026: ${formatRupiah(tot2026)}`}
            >
              {tot2026 > 0 ? formatRupiah(tot2026) : '-'}
            </button>
          </div>
          <div className="flex items-center justify-between gap-1 text-slate-700">
            <span className="text-[10px] text-slate-400 font-sans select-none">2025 :</span>
            <button
              type="button"
              onClick={() => openSlip(wpName, 2025, undefined, txList, kdmap)}
              className={`font-mono transition-colors ${
                tot2025 > 0
                  ? 'text-slate-700 font-medium hover:text-blue-600 hover:underline cursor-pointer'
                  : 'text-slate-400'
              }`}
              title={`Lihat total slip 2025: ${formatRupiah(tot2025)}`}
            >
              {tot2025 > 0 ? formatRupiah(tot2025) : '-'}
            </button>
          </div>
          <div className="pt-0.5 text-right border-t border-slate-200">
            <span
              className={`inline-block text-[10px] font-bold px-1 rounded ${
                isZero
                  ? 'text-slate-400'
                  : growth >= 0
                  ? 'text-emerald-700 bg-emerald-50'
                  : 'text-rose-700 bg-rose-50'
              }`}
            >
              {isZero ? '0%' : `Tumbuh ${growth >= 0 ? '+' : ''}${formatPercent(growth)}`}
            </span>
          </div>
        </div>
      );
    } else {
      const val = filterYear === 2026 ? tot2026 : tot2025;
      if (val === 0) {
        return <span className="text-slate-300 font-mono text-center block">-</span>;
      }
      return (
        <button
          type="button"
          onClick={() => openSlip(wpName, filterYear, undefined, txList, kdmap)}
          className="w-full text-right font-mono text-xs text-blue-900 font-bold hover:text-blue-600 hover:underline cursor-pointer whitespace-nowrap block"
          title={`Lihat total slip ${filterYear}: ${formatRupiah(val)}`}
        >
          {formatRupiah(val)}
        </button>
      );
    }
  };

  const grandDiff = grandMonthlyTotals.overall2026 - grandMonthlyTotals.overall2025;
  const grandGrowth =
    grandMonthlyTotals.overall2025 > 0
      ? (grandDiff / grandMonthlyTotals.overall2025) * 100
      : grandMonthlyTotals.overall2026 > 0
      ? 100
      : 0;

  return (
    <div className="space-y-4">
      {/* 1. Header & Filters Bar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <span>Pengawasan Masa Pajak</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Tabel matriks setoran per masa pajak (Januari s.d. Desember & Tahunan) per Wajib Pajak (Semua Flag)
            </p>
          </div>

          {/* Basis Tahun Selector */}
          <div className="flex items-center gap-1.5 self-start sm:self-auto text-xs bg-slate-100 p-1 rounded-lg border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 px-1">Basis:</span>
            <button
              type="button"
              onClick={() => setYearBasis('tahunbayar')}
              className={`px-2 py-0.5 rounded text-xs font-medium transition-colors cursor-pointer ${
                yearBasis === 'tahunbayar'
                  ? 'bg-white text-blue-900 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Penyandingan berdasarkan Tahun Bayar transaksi"
            >
              Tahun Bayar
            </button>
            <button
              type="button"
              onClick={() => setYearBasis('tahun')}
              className={`px-2 py-0.5 rounded text-xs font-medium transition-colors cursor-pointer ${
                yearBasis === 'tahun'
                  ? 'bg-white text-blue-900 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Penyandingan berdasarkan Tahun Pajak (SPT/Ketetapan)"
            >
              Tahun Pajak
            </button>
          </div>
        </div>

        {/* 4 Top Filters: Tahun, AR, Jenis Pajak (MAP), and Search WP */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3">
          {/* Filter 1: Tahun (Default: 2026, options: 2026, 2025, 2026 & 2025) */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
              <Calendar className="w-3 h-3 text-blue-600" />
              <span>Filter Tahun:</span>
            </label>
            <select
              value={filterYear}
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'both') setFilterYear('both');
                else setFilterYear(parseInt(val, 10) as 2026 | 2025);
              }}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500 cursor-pointer shadow-2xs transition-colors"
            >
              <option value={2026}>2026</option>
              <option value={2025}>2025</option>
              <option value="both">2026 & 2025</option>
            </select>
          </div>

          {/* Filter 2: AR */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
              <Filter className="w-3 h-3 text-blue-600" />
              <span>Filter AR Pengampu:</span>
            </label>
            <select
              value={filterAR}
              onChange={(e) => setFilterAR(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500 cursor-pointer shadow-2xs transition-colors"
            >
              <option value="Semua">Semua AR ({arList.length} AR)</option>
              {arList.map((ar) => (
                <option key={ar} value={ar}>
                  {ar}
                </option>
              ))}
            </select>
          </div>

          {/* Filter 3: Jenis Pajak (MAP) */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
              <Layers className="w-3 h-3 text-blue-600" />
              <span>Filter Jenis Pajak (MAP):</span>
            </label>
            <select
              value={filterMAP}
              onChange={(e) => setFilterMAP(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500 cursor-pointer shadow-2xs transition-colors"
            >
              <option value="Semua">Semua Jenis Pajak ({distinctMAPs.length} MAP)</option>
              {distinctMAPs.map((kd) => (
                <option key={kd} value={kd}>
                  {kd} - {MAP_DESCRIPTIONS[kd] || 'Pajak'}
                </option>
              ))}
            </select>
          </div>

          {/* Filter 4: Search WP */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
              <Search className="w-3 h-3 text-blue-600" />
              <span>Cari Wajib Pajak:</span>
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Ketik Nama WP..."
                value={searchWP}
                onChange={(e) => setSearchWP(e.target.value)}
                className="w-full pl-3 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500 shadow-2xs transition-colors"
              />
              {searchWP && (
                <button
                  type="button"
                  onClick={() => setSearchWP('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3.5 mt-3 border-t border-slate-100">
          {filterYear === 'both' ? (
            <>
              <div className="bg-slate-50/70 p-2.5 rounded-lg border border-slate-200">
                <span className="text-[11px] text-slate-500 block">Total Realisasi 2026</span>
                <span className="text-sm font-bold text-blue-900 font-mono">
                  {formatRupiah(grandMonthlyTotals.overall2026)}
                </span>
              </div>
              <div className="bg-slate-50/70 p-2.5 rounded-lg border border-slate-200">
                <span className="text-[11px] text-slate-500 block">Total Realisasi 2025</span>
                <span className="text-sm font-bold text-slate-700 font-mono">
                  {formatRupiah(grandMonthlyTotals.overall2025)}
                </span>
              </div>
              <div className="bg-slate-50/70 p-2.5 rounded-lg border border-slate-200">
                <span className="text-[11px] text-slate-500 block">Pertumbuhan (YoY)</span>
                <span
                  className={`text-sm font-bold font-mono ${
                    grandGrowth >= 0 ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  {formatPercent(grandGrowth)}
                </span>
              </div>
              <div className="bg-slate-50/70 p-2.5 rounded-lg border border-slate-200">
                <span className="text-[11px] text-slate-500 block">Jumlah Wajib Pajak</span>
                <span className="text-sm font-bold text-slate-900">
                  {sortedWPSummaries.length} WP
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="bg-slate-50/70 p-2.5 rounded-lg border border-slate-200">
                <span className="text-[11px] text-slate-500 block">Total Realisasi {filterYear}</span>
                <span className="text-sm font-bold text-blue-900 font-mono">
                  {formatRupiah(filterYear === 2026 ? grandMonthlyTotals.overall2026 : grandMonthlyTotals.overall2025)}
                </span>
              </div>
              <div className="bg-slate-50/70 p-2.5 rounded-lg border border-slate-200">
                <span className="text-[11px] text-slate-500 block">Jumlah Wajib Pajak</span>
                <span className="text-sm font-bold text-slate-900">
                  {sortedWPSummaries.length} WP
                </span>
              </div>
              <div className="bg-slate-50/70 p-2.5 rounded-lg border border-slate-200">
                <span className="text-[11px] text-slate-500 block">Rata-rata per WP</span>
                <span className="text-sm font-bold text-slate-700 font-mono">
                  {formatRupiah(
                    sortedWPSummaries.length > 0
                      ? (filterYear === 2026 ? grandMonthlyTotals.overall2026 : grandMonthlyTotals.overall2025) /
                          sortedWPSummaries.length
                      : 0
                  )}
                </span>
              </div>
              <div className="bg-slate-50/70 p-2.5 rounded-lg border border-slate-200">
                <span className="text-[11px] text-slate-500 block">Rata-rata per Bulan</span>
                <span className="text-sm font-bold text-slate-700 font-mono">
                  {formatRupiah(
                    (filterYear === 2026 ? grandMonthlyTotals.overall2026 : grandMonthlyTotals.overall2025) / 12
                  )}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 2. Main Table: Kolom Januari s.d. Desember & Tahunan + Total (Tanpa +- Jenis Pajak) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
        {/* Table Toolbar */}
        <div className="px-5 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-800">
              Menampilkan {sortedWPSummaries.length} Wajib Pajak
            </span>
          </div>

          <div className="text-xs text-slate-500 flex items-center gap-2">
            <span>Filter Aktif:</span>
            <span className="font-semibold text-slate-800">
              {filterYear === 'both' ? '2026 & 2025' : `Tahun ${filterYear}`}
            </span>
            <span>•</span>
            <span className="font-semibold text-slate-800">Semua Flag</span>
            <span>•</span>
            <span className="font-semibold text-slate-800">{filterAR}</span>
            <span>•</span>
            <span className="font-semibold text-slate-800">
              {filterMAP === 'Semua' ? 'Semua MAP' : `MAP ${filterMAP}`}
            </span>
          </div>
        </div>

        {/* Matrix Table with Horizontal Scroll */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 border-collapse">
            <thead className="bg-slate-100/90 text-xs text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200 select-none">
              <tr>
                <th scope="col" className="py-3 px-3 text-center w-12 text-slate-500">
                  No
                </th>
                <th
                  scope="col"
                  className="py-3 px-3 cursor-pointer hover:bg-slate-200/70 transition-colors group min-w-[200px]"
                  onClick={() => handleSort('namawp')}
                  title="Urutkan berdasarkan Nama Wajib Pajak"
                >
                  <div className="flex items-center gap-1">
                    <span>Nama Wajib Pajak</span>
                    {renderSortIcon('namawp')}
                  </div>
                </th>
                <th
                  scope="col"
                  className="py-3 px-3 cursor-pointer hover:bg-slate-200/70 transition-colors group min-w-[130px]"
                  onClick={() => handleSort('namaAR')}
                  title="Urutkan berdasarkan AR Pengampu"
                >
                  <div className="flex items-center gap-1">
                    <span>AR Pengampu</span>
                    {renderSortIcon('namaAR')}
                  </div>
                </th>

                {/* Januari s.d. Desember & Tahunan */}
                {MONTH_COLUMNS.map((col) => (
                  <th
                    key={col.monthNum}
                    scope="col"
                    className={`py-3 px-2.5 text-center font-bold text-slate-700 border-l border-slate-200 ${
                      filterYear === 'both' ? 'min-w-[140px]' : 'min-w-[110px]'
                    }`}
                  >
                    <span>{col.label}</span>
                  </th>
                ))}

                {/* Total Column */}
                <th
                  scope="col"
                  onClick={() => handleSort('total')}
                  className={`py-3 px-3 text-right font-bold text-blue-950 bg-blue-50/70 border-l-2 border-blue-200 cursor-pointer hover:bg-blue-100/70 transition-colors ${
                    filterYear === 'both' ? 'min-w-[150px]' : 'min-w-[130px]'
                  }`}
                  title="Urutkan berdasarkan Total Realisasi"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Total</span>
                    {renderSortIcon('total')}
                  </div>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 font-sans">
              {sortedWPSummaries.length === 0 ? (
                <tr>
                  <td colSpan={3 + MONTH_COLUMNS.length + 1} className="py-12 text-center text-xs text-slate-500">
                    <Info className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    Tidak ada data transaksi yang sesuai dengan filter tahun, AR, Jenis Pajak, atau kata kunci pencarian.
                  </td>
                </tr>
              ) : (
                sortedWPSummaries.map((wp, idx) => {
                  return (
                    <tr
                      key={wp.namawp}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* No */}
                      <td className="py-2.5 px-3 text-center text-xs font-mono text-slate-400">
                        {idx + 1}
                      </td>

                      {/* Nama Wajib Pajak */}
                      <td className="py-2.5 px-3 font-semibold text-slate-900 min-w-[200px]">
                        <span>{wp.namawp}</span>
                      </td>

                      {/* AR Pengampu */}
                      <td className="py-2.5 px-3 text-xs text-slate-700 whitespace-nowrap min-w-[130px]">
                        <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                          {wp.namaAR}
                        </span>
                      </td>

                      {/* Month Columns: Januari s.d. Desember & Tahunan */}
                      {MONTH_COLUMNS.map((col) => {
                        const mData = wp.monthly[col.monthNum] || { nominal2026: 0, nominal2025: 0, transactions: [] };
                        return (
                          <td
                            key={col.monthNum}
                            className={`py-2 px-2.5 border-l border-slate-100 align-middle ${
                              filterYear === 'both' ? 'min-w-[140px]' : 'min-w-[110px]'
                            }`}
                          >
                            {renderMonthCell(
                              mData.nominal2026,
                              mData.nominal2025,
                              wp.namawp,
                              col.monthNum,
                              mData.transactions
                            )}
                          </td>
                        );
                      })}

                      {/* Total Column */}
                      <td
                        className={`py-2 px-3 border-l-2 border-slate-200 bg-slate-50/50 align-middle font-bold ${
                          filterYear === 'both' ? 'min-w-[150px]' : 'min-w-[130px]'
                        }`}
                      >
                        {renderTotalCell(
                          wp.total2026,
                          wp.total2025,
                          wp.namawp,
                          wp.allTransactions
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Grand Total Row */}
            {sortedWPSummaries.length > 0 && (
              <tfoot className="bg-slate-100/95 font-bold text-slate-900 border-t-2 border-slate-300">
                <tr>
                  <td className="py-3 px-3 text-center text-slate-400 font-mono text-xs">
                    Σ
                  </td>
                  <td className="py-3 px-3 uppercase tracking-wider font-extrabold text-blue-950 text-xs">
                    TOTAL SELURUH WP
                  </td>
                  <td className="py-3 px-3 text-xs text-slate-600 font-medium whitespace-nowrap">
                    {sortedWPSummaries.length} Wajib Pajak
                  </td>

                  {/* Grand Total for Each Month */}
                  {MONTH_COLUMNS.map((col) => {
                    const gData = grandMonthlyTotals.monthly[col.monthNum] || { nom2026: 0, nom2025: 0, transactions: [] };
                    return (
                      <td
                        key={col.monthNum}
                        className={`py-2 px-2.5 border-l border-slate-200 align-middle ${
                          filterYear === 'both' ? 'min-w-[140px]' : 'min-w-[110px]'
                        }`}
                      >
                        {renderMonthCell(
                          gData.nom2026,
                          gData.nom2025,
                          'Semua Wajib Pajak',
                          col.monthNum,
                          gData.transactions
                        )}
                      </td>
                    );
                  })}

                  {/* Overall Total */}
                  <td
                    className={`py-2 px-3 border-l-2 border-blue-200 bg-blue-50/70 align-middle font-black ${
                      filterYear === 'both' ? 'min-w-[150px]' : 'min-w-[130px]'
                    }`}
                  >
                    {renderTotalCell(
                      grandMonthlyTotals.overall2026,
                      grandMonthlyTotals.overall2025,
                      'Semua Wajib Pajak',
                      grandMonthlyTotals.allTx
                    )}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* 3. Slip Detail Popup Modal */}
      {slipPopup.isOpen && (
        <SlipDetailPopup
          isOpen={slipPopup.isOpen}
          onClose={() => setSlipPopup((prev) => ({ ...prev, isOpen: false }))}
          wpName={slipPopup.wpName}
          kdmap={slipPopup.kdmap}
          year={slipPopup.year}
          monthNum={slipPopup.monthNum}
          monthBasis={yearBasis === 'tahun' ? 'masapajak' : 'bulanbayar'}
          transactions={slipPopup.transactions}
        />
      )}
    </div>
  );
};
