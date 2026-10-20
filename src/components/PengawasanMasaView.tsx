import React, { useState, useMemo } from 'react';
import { RealisasiRow, FlagFilter, MONTHS, MAP_DESCRIPTIONS } from '../types/tax';
import { matchesFlagFilter, formatRupiah, formatPercent } from '../utils/taxCalculations';
import {
  Search,
  Filter,
  Calendar,
  Layers,
  ChevronDown,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Info,
  CheckCircle2,
  Table,
  LayoutGrid,
} from 'lucide-react';
import { SlipDetailPopup } from './SlipDetailPopup';

interface PengawasanMasaViewProps {
  realisasiRows: RealisasiRow[];
  arList: string[];
  globalFlag: FlagFilter;
  globalMonths: number[];
}

interface PeriodBreakdown {
  monthNum: number; // 1-12 or 0 (Tahunan)
  monthCode: string; // "01", "02", ..., "12", "00"
  displayName: string;
  isTahunan: boolean;
  nominal2026: number;
  nominal2025: number;
  selisih: number;
  pertumbuhan: number;
  txCount2026: number;
  txCount2025: number;
}

interface WPPeriodSummary {
  namawp: string;
  namaAR: string;
  kdmapList: string[];
  total2026: number;
  total2025: number;
  selisih: number;
  pertumbuhan: number;
  periods: PeriodBreakdown[];
  allTransactions: RealisasiRow[];
}

type SortField = 'namawp' | 'namaAR' | 'total2026' | 'total2025' | 'selisih' | 'pertumbuhan';
type SortOrder = 'asc' | 'desc';

export const PengawasanMasaView: React.FC<PengawasanMasaViewProps> = ({
  realisasiRows,
  arList,
  globalFlag,
  globalMonths,
}) => {
  // Required Top Filters: AR, Jenis Pajak (MAP), and Search WP
  const [filterAR, setFilterAR] = useState<string>('Semua');
  const [filterMAP, setFilterMAP] = useState<string>('Semua');
  const [searchWP, setSearchWP] = useState<string>('');
  const [yearBasis, setYearBasis] = useState<'tahunbayar' | 'tahun'>('tahunbayar'); // Tahun Bayar vs Tahun Pajak
  const [viewMode, setViewMode] = useState<'hierarchical' | 'flat'>('hierarchical');

  // Accordion state for expanded WPs
  const [expandedWPs, setExpandedWPs] = useState<Set<string>>(new Set());

  // Table sorting
  const [sortField, setSortField] = useState<SortField>('total2026');
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

  // Helper to get period number (month 1-12 or 0)
  const getTxPeriod = (tx: RealisasiRow): number => {
    if (String(tx.kdbayar) === '200' || String(tx.masa) === '00' || tx.masa === 0) {
      return 0; // 00 - Tahunan
    }
    const m = parseMasaToNumber(tx.masa);
    if (m >= 1 && m <= 12) return m;
    return tx.bulanbayar || 0;
  };

  // 1. Filter base transactions by top filters: AR, MAP, Flag, globalMonths
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

      // Global Flag filter
      if (!matchesFlagFilter(tx.flag, globalFlag)) {
        return false;
      }

      // Global Months filter (applies to payment month)
      if (globalMonths.length > 0 && !globalMonths.includes(tx.bulanbayar)) {
        return false;
      }

      return true;
    });
  }, [realisasiRows, filterAR, filterMAP, globalFlag, globalMonths]);

  // Defined periods for juxtaposition: 01 to 12, plus 00 Tahunan
  const periodDefinitions = useMemo(() => {
    const list: { monthNum: number; monthCode: string; displayName: string; isTahunan: boolean }[] = [];
    MONTHS.forEach((m) => {
      list.push({
        monthNum: m.value,
        monthCode: String(m.value).padStart(2, '0'),
        displayName: `${String(m.value).padStart(2, '0')} - Masa Pajak ${m.label}`,
        isTahunan: false,
      });
    });
    list.push({
      monthNum: 0,
      monthCode: '00',
      displayName: '00 - Tahunan',
      isTahunan: true,
    });
    return list;
  }, []);

  // 2. Aggregate per Wajib Pajak and juxtapose periods 2025 vs 2026
  const wpSummaries: WPPeriodSummary[] = useMemo(() => {
    const map = new Map<string, {
      namawp: string;
      namaAR: string;
      kdmapSet: Set<string>;
      allTransactions: RealisasiRow[];
    }>();

    filteredBaseTransactions.forEach((tx) => {
      if (!map.has(tx.namawp)) {
        map.set(tx.namawp, {
          namawp: tx.namawp,
          namaAR: tx.nama || '-',
          kdmapSet: new Set(),
          allTransactions: [],
        });
      }
      const entry = map.get(tx.namawp)!;
      entry.allTransactions.push(tx);
      if (tx.kdmap) entry.kdmapSet.add(String(tx.kdmap));
    });

    const results: WPPeriodSummary[] = [];

    map.forEach((entry) => {
      // Calculate each period for this WP
      const periods: PeriodBreakdown[] = periodDefinitions.map((def) => {
        const periodTx = entry.allTransactions.filter((tx) => {
          const p = getTxPeriod(tx);
          return p === def.monthNum;
        });

        const tx2026 = periodTx.filter((t) => getTxYear(t) === 2026);
        const tx2025 = periodTx.filter((t) => getTxYear(t) === 2025);

        const nom2026 = tx2026.reduce((sum, t) => sum + Number(t.nominal || 0), 0);
        const nom2025 = tx2025.reduce((sum, t) => sum + Number(t.nominal || 0), 0);
        const diff = nom2026 - nom2025;
        const growth = nom2025 > 0 ? (diff / nom2025) * 100 : nom2026 > 0 ? 100 : 0;

        return {
          monthNum: def.monthNum,
          monthCode: def.monthCode,
          displayName: def.displayName,
          isTahunan: def.isTahunan,
          nominal2026: nom2026,
          nominal2025: nom2025,
          selisih: diff,
          pertumbuhan: growth,
          txCount2026: tx2026.length,
          txCount2025: tx2025.length,
        };
      });

      const total2026 = periods.reduce((sum, p) => sum + p.nominal2026, 0);
      const total2025 = periods.reduce((sum, p) => sum + p.nominal2025, 0);
      const selisih = total2026 - total2025;
      const pertumbuhan = total2025 > 0 ? (selisih / total2025) * 100 : total2026 > 0 ? 100 : 0;

      // Only include WP if they have transactions in the periods
      if (total2026 > 0 || total2025 > 0) {
        results.push({
          namawp: entry.namawp,
          namaAR: entry.namaAR,
          kdmapList: Array.from(entry.kdmapSet),
          total2026,
          total2025,
          selisih,
          pertumbuhan,
          periods: periods,
          allTransactions: entry.allTransactions,
        });
      }
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
  }, [filteredBaseTransactions, periodDefinitions, searchWP, yearBasis]);

  // 3. Sort WP Summaries
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

  // Toggle WP accordion
  const toggleWP = (namawp: string) => {
    setExpandedWPs((prev) => {
      const next = new Set(prev);
      if (next.has(namawp)) {
        next.delete(namawp);
      } else {
        next.add(namawp);
      }
      return next;
    });
  };

  // Toggle expand all WPs
  const allExpanded = useMemo(() => {
    if (sortedWPSummaries.length === 0) return false;
    return sortedWPSummaries.every((w) => expandedWPs.has(w.namawp));
  }, [sortedWPSummaries, expandedWPs]);

  const toggleAllWPs = () => {
    if (allExpanded) {
      setExpandedWPs(new Set());
    } else {
      setExpandedWPs(new Set(sortedWPSummaries.map((w) => w.namawp)));
    }
  };

  // Grand totals across all filtered WPs
  const grandTotal = useMemo(() => {
    const total2026 = wpSummaries.reduce((acc, wp) => acc + wp.total2026, 0);
    const total2025 = wpSummaries.reduce((acc, wp) => acc + wp.total2025, 0);
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
    };
  }, [wpSummaries]);

  // Open slip detail popup when a nominal is clicked
  const openSlip = (
    wpName: string,
    year: number,
    monthNum: number | undefined,
    transactions: RealisasiRow[]
  ) => {
    const tx = transactions.filter((t) => {
      if (getTxYear(t) !== year) return false;
      if (monthNum !== undefined && getTxPeriod(t) !== monthNum) return false;
      if (filterMAP !== 'Semua' && String(t.kdmap) !== filterMAP) return false;
      if (filterAR !== 'Semua' && t.nama.trim().toLowerCase() !== filterAR.trim().toLowerCase()) return false;
      return true;
    });

    const targetKdmap = filterMAP !== 'Semua' ? filterMAP : (tx[0]?.kdmap ? String(tx[0].kdmap) : 'Semua MAP');

    setSlipPopup({
      isOpen: true,
      wpName,
      kdmap: targetKdmap,
      year,
      monthNum,
      transactions: tx,
    });
  };

  return (
    <div className="space-y-4">
      {/* 1. Header & Required Filters Bar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <span>Pengawasan Masa (Penyandingan Setoran 2025 vs 2026)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Monitoring kepatuhan setoran per masa pajak (01 s.d. 12 & Tahunan) disandingkan antara tahun 2025 dan 2026
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

        {/* The Mandatory Filters: Filter AR and Filter Jenis Pajak (MAP) + Search WP */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3">
          {/* Filter 1: AR */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
              <Filter className="w-3 h-3 text-blue-600" />
              <span>Filter Account Representative (AR):</span>
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

          {/* Filter 2: Jenis Pajak (MAP) */}
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

          {/* Filter 3: Search WP */}
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

        {/* KPI Mini-cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3.5 mt-3 border-t border-slate-100">
          <div className="bg-slate-50/70 p-2.5 rounded-lg border border-slate-200">
            <span className="text-[11px] text-slate-500 block">Total Realisasi 2026</span>
            <span className="text-sm font-bold text-blue-900 font-mono">
              {formatRupiah(grandTotal.total2026)}
            </span>
          </div>
          <div className="bg-slate-50/70 p-2.5 rounded-lg border border-slate-200">
            <span className="text-[11px] text-slate-500 block">Total Realisasi 2025</span>
            <span className="text-sm font-bold text-slate-700 font-mono">
              {formatRupiah(grandTotal.total2025)}
            </span>
          </div>
          <div className="bg-slate-50/70 p-2.5 rounded-lg border border-slate-200">
            <span className="text-[11px] text-slate-500 block">Pertumbuhan (YoY)</span>
            <span
              className={`text-sm font-bold font-mono ${
                grandTotal.pertumbuhan >= 0 ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {formatPercent(grandTotal.pertumbuhan)} ({formatRupiah(grandTotal.selisih)})
            </span>
          </div>
          <div className="bg-slate-50/70 p-2.5 rounded-lg border border-slate-200">
            <span className="text-[11px] text-slate-500 block">Wajib Pajak Terfilter</span>
            <span className="text-sm font-bold text-slate-900">
              {grandTotal.wpCount} Wajib Pajak
            </span>
          </div>
        </div>
      </div>

      {/* 2. Main Table: Setoran per Masa Pajak per Wajib Pajak Disandingkan */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
        {/* Table Top Toolbar */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleAllWPs}
              className="text-xs font-semibold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
            >
              <span className="font-mono">{allExpanded ? '[-]' : '[+]'}</span>
              <span>{allExpanded ? 'Tutup Seluruh Rincian Masa' : 'Buka Seluruh Rincian 12 Masa'}</span>
            </button>
            <span className="text-xs text-slate-500 hidden sm:inline">
              (Menampilkan {sortedWPSummaries.length} WP)
            </span>
          </div>

          <div className="text-xs text-slate-500 flex items-center gap-2">
            <span>Filter Aktif:</span>
            <span className="font-semibold text-slate-800">{filterAR}</span>
            <span>•</span>
            <span className="font-semibold text-slate-800">
              {filterMAP === 'Semua' ? 'Semua MAP' : `MAP ${filterMAP}`}
            </span>
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700 border-collapse">
            <thead className="bg-slate-100/90 text-xs text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200 select-none">
              <tr>
                <th scope="col" className="py-3 px-3 text-center w-12 text-slate-500">
                  +/-
                </th>
                <th scope="col" className="py-3 px-2 text-center w-10 text-slate-500">
                  No
                </th>
                <th
                  scope="col"
                  className="py-3 px-4 cursor-pointer hover:bg-slate-200/70 transition-colors group"
                  onClick={() => handleSort('namawp')}
                  title="Urutkan berdasarkan Nama Wajib Pajak"
                >
                  <div className="flex items-center gap-1">
                    <span>Nama Wajib Pajak (WP)</span>
                    {renderSortIcon('namawp')}
                  </div>
                </th>
                <th
                  scope="col"
                  className="py-3 px-3 cursor-pointer hover:bg-slate-200/70 transition-colors group"
                  onClick={() => handleSort('namaAR')}
                  title="Urutkan berdasarkan AR Pengampu"
                >
                  <div className="flex items-center gap-1">
                    <span>AR Pengampu</span>
                    {renderSortIcon('namaAR')}
                  </div>
                </th>
                <th
                  scope="col"
                  className="py-3 px-4 text-right cursor-pointer hover:bg-blue-100/60 transition-colors group bg-blue-50/50 text-blue-900 border-x border-blue-100"
                  onClick={() => handleSort('total2026')}
                  title="Urutkan Realisasi 2026. Klik nominal untuk rincian slip"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>2026 ({yearBasis === 'tahun' ? 'Thn Pajak' : 'Berjalan'})</span>
                    {renderSortIcon('total2026')}
                  </div>
                </th>
                <th
                  scope="col"
                  className="py-3 px-4 text-right cursor-pointer hover:bg-slate-200/70 transition-colors group"
                  onClick={() => handleSort('total2025')}
                  title="Urutkan Realisasi 2025. Klik nominal untuk rincian slip"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>2025 ({yearBasis === 'tahun' ? 'Thn Pajak' : 'Tahun Lalu'})</span>
                    {renderSortIcon('total2025')}
                  </div>
                </th>
                <th
                  scope="col"
                  className="py-3 px-4 text-right cursor-pointer hover:bg-slate-200/70 transition-colors group"
                  onClick={() => handleSort('selisih')}
                  title="Urutkan Selisih"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Selisih (Rp)</span>
                    {renderSortIcon('selisih')}
                  </div>
                </th>
                <th
                  scope="col"
                  className="py-3 px-4 text-center cursor-pointer hover:bg-slate-200/70 transition-colors group"
                  onClick={() => handleSort('pertumbuhan')}
                  title="Urutkan Pertumbuhan"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Tumbuh (%)</span>
                    {renderSortIcon('pertumbuhan')}
                  </div>
                </th>
                <th scope="col" className="py-3 px-3 text-center w-28">
                  Rincian
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 font-sans">
              {sortedWPSummaries.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-xs text-slate-500">
                    <Info className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    Tidak ada data transaksi yang sesuai dengan filter AR, Jenis Pajak, atau kata kunci pencarian.
                  </td>
                </tr>
              ) : (
                sortedWPSummaries.map((wp, idx) => {
                  const isExpanded = expandedWPs.has(wp.namawp);
                  const isPositive = wp.pertumbuhan >= 0;
                  const isZero = wp.total2025 === 0 && wp.total2026 === 0;

                  return (
                    <React.Fragment key={wp.namawp}>
                      {/* Parent WP Row */}
                      <tr
                        className={`hover:bg-slate-50/80 transition-colors group ${
                          isExpanded ? 'bg-blue-50/20' : ''
                        }`}
                      >
                        {/* Toggle button +/- */}
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => toggleWP(wp.namawp)}
                            className="w-6 h-6 rounded flex items-center justify-center text-slate-500 hover:text-blue-700 hover:bg-blue-100 font-mono text-xs font-bold transition-colors cursor-pointer border border-slate-200 shadow-2xs"
                            title={isExpanded ? 'Tutup Rincian Masa' : 'Buka Rincian 12 Masa Pajak'}
                          >
                            {isExpanded ? '−' : '+'}
                          </button>
                        </td>

                        {/* No */}
                        <td className="py-3 px-2 text-center text-xs font-mono text-slate-400">
                          {idx + 1}
                        </td>

                        {/* Nama WP */}
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          <button
                            type="button"
                            onClick={() => toggleWP(wp.namawp)}
                            className="text-left hover:text-blue-600 cursor-pointer transition-colors block"
                          >
                            <span>{wp.namawp}</span>
                          </button>
                        </td>

                        {/* AR Pengampu */}
                        <td className="py-3 px-3 text-xs text-slate-700 whitespace-nowrap">
                          <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {wp.namaAR}
                          </span>
                        </td>

                        {/* 2026 */}
                        <td className="py-3 px-4 text-right font-mono text-xs border-x border-blue-50 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => openSlip(wp.namawp, 2026, undefined, wp.allTransactions)}
                            className={`w-full text-right font-mono text-xs cursor-pointer hover:underline transition-colors ${
                              wp.total2026 > 0
                                ? 'text-blue-900 font-bold hover:text-blue-600'
                                : 'text-slate-400 hover:text-slate-600'
                            }`}
                            title={`Klik untuk melihat rincian transaksi setoran ${wp.namawp} tahun 2026`}
                          >
                            {formatRupiah(wp.total2026)}
                          </button>
                        </td>

                        {/* 2025 */}
                        <td className="py-3 px-4 text-right font-mono text-xs whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => openSlip(wp.namawp, 2025, undefined, wp.allTransactions)}
                            className={`w-full text-right font-mono text-xs cursor-pointer hover:underline transition-colors ${
                              wp.total2025 > 0
                                ? 'text-slate-800 font-bold hover:text-blue-600'
                                : 'text-slate-400 hover:text-slate-600'
                            }`}
                            title={`Klik untuk melihat rincian transaksi setoran ${wp.namawp} tahun 2025`}
                          >
                            {formatRupiah(wp.total2025)}
                          </button>
                        </td>

                        {/* Selisih */}
                        <td
                          className={`py-3 px-4 text-right font-mono text-xs whitespace-nowrap font-medium ${
                            wp.selisih >= 0 ? 'text-emerald-700' : 'text-rose-600'
                          }`}
                        >
                          {formatRupiah(wp.selisih)}
                        </td>

                        {/* Tumbuh */}
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold ${
                              isZero
                                ? 'text-slate-400 bg-slate-100'
                                : isPositive
                                ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                                : 'text-rose-700 bg-rose-50 border border-rose-200'
                            }`}
                          >
                            {isZero ? '0,00%' : formatPercent(wp.pertumbuhan)}
                          </span>
                        </td>

                        {/* Aksi Button */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => toggleWP(wp.namawp)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
                          >
                            <span>{isExpanded ? 'Tutup' : 'Lihat 12 Masa'}</span>
                            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Sub-table: Setoran per Masa Pajak (01-12 & 00 Tahunan) Disandingkan 2025 vs 2026 */}
                      {isExpanded && (
                        <tr className="bg-slate-50/90">
                          <td colSpan={9} className="p-3 sm:p-4">
                            <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 shadow-sm">
                              <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-100">
                                <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                                  <span>Penyandingan 12 Masa Pajak:</span>
                                  <span className="font-semibold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                    {wp.namawp}
                                  </span>
                                </span>
                                <span className="text-[11px] text-slate-500">
                                  Klik nominal untuk melihat bukti slip setoran per masa
                                </span>
                              </div>

                              <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                  <thead className="bg-slate-100 text-[11px] font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200 select-none">
                                    <tr>
                                      <th className="py-2 px-3 text-center w-10 text-slate-400">No</th>
                                      <th className="py-2 px-4 font-bold text-slate-800">
                                        Masa Pajak
                                      </th>
                                      <th className="py-2 px-4 text-right font-bold text-blue-900 bg-blue-50/60 border-x border-blue-100">
                                        Realisasi 2026 ({yearBasis === 'tahun' ? 'Thn Pajak' : 'Tahun Bayar'})
                                      </th>
                                      <th className="py-2 px-4 text-right font-semibold text-slate-700">
                                        Realisasi 2025 ({yearBasis === 'tahun' ? 'Thn Pajak' : 'Tahun Bayar'})
                                      </th>
                                      <th className="py-2 px-4 text-right font-semibold text-slate-700">
                                        Selisih (Rp)
                                      </th>
                                      <th className="py-2 px-4 text-center font-semibold text-slate-700">
                                        Tumbuh (%)
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {wp.periods.map((period, pIdx) => {
                                      const pPositive = period.pertumbuhan >= 0;
                                      const pZero = period.nominal2025 === 0 && period.nominal2026 === 0;

                                      return (
                                        <tr
                                          key={period.monthCode}
                                          className={`hover:bg-blue-50/40 transition-colors ${
                                            period.isTahunan ? 'bg-amber-50/30' : ''
                                          }`}
                                        >
                                          <td className="py-2 px-3 text-center font-mono text-slate-400">
                                            {pIdx + 1}
                                          </td>
                                          <td className="py-2 px-4">
                                            <span
                                              className={`font-mono text-xs ${
                                                period.isTahunan
                                                  ? 'font-bold text-amber-950 bg-amber-100/80 px-2 py-0.5 rounded border border-amber-300'
                                                  : 'font-medium text-slate-800'
                                              }`}
                                            >
                                              {period.displayName}
                                            </span>
                                            {period.isTahunan && (
                                              <span className="ml-2 text-[10px] text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                                kdbayar 200
                                              </span>
                                            )}
                                          </td>
                                          {/* 2026 Nominal */}
                                          <td className="py-2 px-4 text-right font-mono text-xs border-x border-blue-50 whitespace-nowrap">
                                            <button
                                              type="button"
                                              onClick={() =>
                                                openSlip(wp.namawp, 2026, period.monthNum, wp.allTransactions)
                                              }
                                              className={`w-full text-right font-mono text-xs cursor-pointer hover:underline transition-colors ${
                                                period.nominal2026 > 0
                                                  ? 'text-blue-900 font-bold hover:text-blue-600'
                                                  : 'text-slate-400 hover:text-slate-600'
                                              }`}
                                              title={`Lihat bukti slip ${wp.namawp} Masa ${period.displayName} tahun 2026`}
                                            >
                                              {formatRupiah(period.nominal2026)}
                                            </button>
                                          </td>
                                          {/* 2025 Nominal */}
                                          <td className="py-2 px-4 text-right font-mono text-xs whitespace-nowrap">
                                            <button
                                              type="button"
                                              onClick={() =>
                                                openSlip(wp.namawp, 2025, period.monthNum, wp.allTransactions)
                                              }
                                              className={`w-full text-right font-mono text-xs cursor-pointer hover:underline transition-colors ${
                                                period.nominal2025 > 0
                                                  ? 'text-slate-800 font-bold hover:text-blue-600'
                                                  : 'text-slate-400 hover:text-slate-600'
                                              }`}
                                              title={`Lihat bukti slip ${wp.namawp} Masa ${period.displayName} tahun 2025`}
                                            >
                                              {formatRupiah(period.nominal2025)}
                                            </button>
                                          </td>
                                          {/* Selisih */}
                                          <td
                                            className={`py-2 px-4 text-right font-mono text-xs whitespace-nowrap font-medium ${
                                              period.selisih >= 0 ? 'text-emerald-700' : 'text-rose-600'
                                            }`}
                                          >
                                            {formatRupiah(period.selisih)}
                                          </td>
                                          {/* Tumbuh */}
                                          <td className="py-2 px-4 text-center whitespace-nowrap">
                                            <span
                                              className={`inline-block px-2 py-0.5 rounded text-[11px] font-mono font-semibold ${
                                                pZero
                                                  ? 'text-slate-400'
                                                  : pPositive
                                                  ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                                                  : 'text-rose-700 bg-rose-50 border border-rose-200'
                                              }`}
                                            >
                                              {pZero ? '0,00%' : formatPercent(period.pertumbuhan)}
                                            </span>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                  <tfoot className="bg-slate-900 text-white font-bold border-t-2 border-slate-700 text-xs">
                                    <tr>
                                      <td className="py-2.5 px-3 text-center text-slate-400">Σ</td>
                                      <td className="py-2.5 px-4 uppercase tracking-wider">
                                        TOTAL SELURUH MASA
                                      </td>
                                      <td className="py-2.5 px-4 text-right font-mono text-white bg-blue-900/60 border-x border-blue-800 whitespace-nowrap">
                                        {formatRupiah(wp.total2026)}
                                      </td>
                                      <td className="py-2.5 px-4 text-right font-mono text-slate-300 whitespace-nowrap">
                                        {formatRupiah(wp.total2025)}
                                      </td>
                                      <td
                                        className={`py-2.5 px-4 text-right font-mono whitespace-nowrap ${
                                          wp.selisih >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                        }`}
                                      >
                                        {formatRupiah(wp.selisih)}
                                      </td>
                                      <td className="py-2.5 px-4 text-center whitespace-nowrap">
                                        <span
                                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                                            wp.pertumbuhan >= 0
                                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                              : 'bg-rose-950 text-rose-300 border border-rose-800'
                                          }`}
                                        >
                                          {formatPercent(wp.pertumbuhan)}
                                        </span>
                                      </td>
                                    </tr>
                                  </tfoot>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>

            {/* Grand Total Footer */}
            <tfoot className="bg-slate-900 text-white font-semibold text-xs border-t-2 border-slate-700">
              <tr>
                <td className="py-4 px-3 text-center text-slate-400">Σ</td>
                <td className="py-4 px-2 text-center text-slate-400 font-mono">-</td>
                <td className="py-4 px-4 font-bold tracking-tight text-white uppercase">
                  TOTAL KESELURUHAN PENGAWASAN MASA ({sortedWPSummaries.length} WP)
                </td>
                <td className="py-4 px-3 text-slate-400">-</td>
                <td className="py-4 px-4 text-right font-mono font-bold text-white whitespace-nowrap bg-blue-900/60 border-x border-blue-800">
                  {formatRupiah(grandTotal.total2026)}
                </td>
                <td className="py-4 px-4 text-right font-mono text-slate-300 whitespace-nowrap">
                  {formatRupiah(grandTotal.total2025)}
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
                <td className="py-4 px-3 text-center text-slate-400 text-[11px]">-</td>
              </tr>
            </tfoot>
          </table>
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
        monthBasis="masapajak"
        transactions={slipPopup.transactions}
      />
    </div>
  );
};
