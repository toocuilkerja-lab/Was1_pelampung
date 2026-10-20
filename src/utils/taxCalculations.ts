import { TargetRow, RealisasiRow, FlagFilter, ARSummary, JenisPajakSummary, MAP_DESCRIPTIONS } from '../types/tax';

/**
 * Format number to Indonesian Rupiah currency format
 * e.g., 22500000000 -> "Rp 22.500.000.000"
 */
export function formatRupiah(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) return 'Rp 0';
  const isNegative = amount < 0;
  const absVal = Math.abs(amount);
  const formatted = new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 0,
  }).format(absVal);
  return `${isNegative ? '- Rp ' : 'Rp '}${formatted}`;
}

/**
 * Format compact Rupiah for KPI chips or mobile
 * e.g., 22500000000 -> "Rp 22,50 M"
 */
export function formatCompactRupiah(amount: number): string {
  if (isNaN(amount) || amount === 0) return 'Rp 0';
  const isNegative = amount < 0;
  const absVal = Math.abs(amount);

  if (absVal >= 1_000_000_000_000) {
    return `${isNegative ? '-' : ''}Rp ${(absVal / 1_000_000_000_000).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} T`;
  }
  if (absVal >= 1_000_000_000) {
    return `${isNegative ? '-' : ''}Rp ${(absVal / 1_000_000_000).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} M`;
  }
  if (absVal >= 1_000_000) {
    return `${isNegative ? '-' : ''}Rp ${(absVal / 1_000_000).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Jt`;
  }
  return formatRupiah(amount);
}

/**
 * Format percentage with positive sign
 * e.g., 14.25 -> "+14,25%"
 */
export function formatPercent(value: number, includeSign: boolean = true): string {
  if (isNaN(value) || !isFinite(value)) return '0,00%';
  const sign = includeSign && value > 0 ? '+' : '';
  return `${sign}${value.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

/**
 * Match realisasi flag with selected filter
 */
export function matchesFlagFilter(rowFlag: string, filter: FlagFilter): boolean {
  if (filter === 'Semua') return true;
  const cleanRowFlag = (rowFlag || '').trim().toUpperCase();
  const cleanFilter = filter.trim().toUpperCase();

  if (cleanFilter === 'PKM P3') {
    return cleanRowFlag.includes('P3') || cleanRowFlag === 'PKM P3' || cleanRowFlag === 'PKM-P3';
  }

  if (cleanFilter === 'PKM') {
    // Exact PKM (excluding PKM P3 if PKM is selected specifically, or general PKM)
    return cleanRowFlag === 'PKM' || (!cleanRowFlag.includes('P3') && cleanRowFlag.includes('PKM'));
  }

  if (cleanFilter === 'PPM') {
    return cleanRowFlag.includes('PPM');
  }

  return cleanRowFlag === cleanFilter;
}

/**
 * Match target flag with selected filter
 * Note: Target table typically has 'PPM' and 'PKM'.
 * If user selects 'PKM P3', we associate it with 'PKM' target.
 */
export function matchesTargetFlag(targetFlag: string, filter: FlagFilter): boolean {
  if (filter === 'Semua') return true;
  const cleanTargetFlag = (targetFlag || '').trim().toUpperCase();
  if (filter === 'PKM P3') {
    return cleanTargetFlag.includes('PKM');
  }
  if (filter === 'PKM') {
    return cleanTargetFlag.includes('PKM');
  }
  if (filter === 'PPM') {
    return cleanTargetFlag.includes('PPM');
  }
  return cleanTargetFlag === (filter as string).trim().toUpperCase();
}

/**
 * Filter realisasi rows based on flag, months, and optional AR name & search query
 */
export function filterRealisasiRows(
  rows: RealisasiRow[],
  filter: {
    flag: FlagFilter;
    bulanBayar: number[];
    tahunBayar?: number;
    namaAR?: string;
    searchQuery?: string;
  }
): RealisasiRow[] {
  return rows.filter((row) => {
    // 1. AR filter
    if (filter.namaAR && row.nama.trim().toLowerCase() !== filter.namaAR.trim().toLowerCase()) {
      return false;
    }

    // 2. Tahun bayar filter
    if (filter.tahunBayar && row.tahunbayar !== filter.tahunBayar) {
      return false;
    }

    // 3. Flag filter
    if (!matchesFlagFilter(row.flag, filter.flag)) {
      return false;
    }

    // 4. Bulan bayar filter
    if (filter.bulanBayar.length > 0 && !filter.bulanBayar.includes(row.bulanbayar)) {
      return false;
    }

    // 5. Search query filter (namawp, kdmap, kdbayar)
    if (filter.searchQuery && filter.searchQuery.trim() !== '') {
      const q = filter.searchQuery.toLowerCase().trim();
      const matchWP = row.namawp.toLowerCase().includes(q);
      const matchMap = String(row.kdmap).toLowerCase().includes(q);
      const matchKodeBayar = String(row.kdbayar).toLowerCase().includes(q);
      const matchMasa = String(row.masa).toLowerCase().includes(q);
      if (!matchWP && !matchMap && !matchKodeBayar && !matchMasa) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Calculate aggregation summary per AR
 */
export function calculateARSummaries(
  targetRows: TargetRow[],
  realisasiRows: RealisasiRow[],
  arList: string[],
  flagFilter: FlagFilter,
  selectedMonths: number[],
  yearCurrent: number = 2026,
  yearPrevious: number = 2025
): {
  arSummaries: ARSummary[];
  grandTotal: ARSummary;
} {
  // Aggregate targets per AR
  const targetMap = new Map<string, number>();
  targetRows.forEach((row) => {
    if (matchesTargetFlag(row.flag, flagFilter)) {
      const current = targetMap.get(row.nama) || 0;
      targetMap.set(row.nama, current + Number(row.nominal || 0));
    }
  });

  // Filter current year realisasi
  const realisasi2026Filtered = realisasiRows.filter(
    (row) =>
      row.tahunbayar === yearCurrent &&
      matchesFlagFilter(row.flag, flagFilter) &&
      (selectedMonths.length === 0 || selectedMonths.includes(row.bulanbayar))
  );

  // Filter previous year realisasi (same months for YoY comparison)
  const realisasi2025Filtered = realisasiRows.filter(
    (row) =>
      row.tahunbayar === yearPrevious &&
      matchesFlagFilter(row.flag, flagFilter) &&
      (selectedMonths.length === 0 || selectedMonths.includes(row.bulanbayar))
  );

  // Map 2026 nominals and WP count
  const realisasi2026Map = new Map<string, number>();
  const wpCount2026Map = new Map<string, Set<string>>();
  const txCount2026Map = new Map<string, number>();

  realisasi2026Filtered.forEach((row) => {
    const curNominal = realisasi2026Map.get(row.nama) || 0;
    realisasi2026Map.set(row.nama, curNominal + Number(row.nominal || 0));

    if (!wpCount2026Map.has(row.nama)) {
      wpCount2026Map.set(row.nama, new Set());
    }
    wpCount2026Map.get(row.nama)!.add(row.namawp);

    const curTx = txCount2026Map.get(row.nama) || 0;
    txCount2026Map.set(row.nama, curTx + 1);
  });

  // Map 2025 nominals
  const realisasi2025Map = new Map<string, number>();
  realisasi2025Filtered.forEach((row) => {
    const curNominal = realisasi2025Map.get(row.nama) || 0;
    realisasi2025Map.set(row.nama, curNominal + Number(row.nominal || 0));
  });

  // Calculate per AR
  const arSummaries: ARSummary[] = arList.map((nama) => {
    const target = targetMap.get(nama) || 0;
    const realisasi2026 = realisasi2026Map.get(nama) || 0;
    const realisasi2025 = realisasi2025Map.get(nama) || 0;
    const selisih = realisasi2026 - realisasi2025;

    const capaian = target > 0 ? (realisasi2026 / target) * 100 : 0;
    const pertumbuhan =
      realisasi2025 > 0
        ? (selisih / realisasi2025) * 100
        : realisasi2026 > 0
        ? 100
        : 0;

    const wpCount2026 = wpCount2026Map.get(nama)?.size || 0;
    const transaksiCount2026 = txCount2026Map.get(nama) || 0;

    return {
      nama,
      target,
      realisasi2026,
      realisasi2025,
      selisih,
      capaian,
      pertumbuhan,
      wpCount2026,
      transaksiCount2026,
    };
  });

  // Grand Total calculation
  const totalTarget = arSummaries.reduce((acc, ar) => acc + ar.target, 0);
  const total2026 = arSummaries.reduce((acc, ar) => acc + ar.realisasi2026, 0);
  const total2025 = arSummaries.reduce((acc, ar) => acc + ar.realisasi2025, 0);
  const totalSelisih = total2026 - total2025;
  const totalCapaian = totalTarget > 0 ? (total2026 / totalTarget) * 100 : 0;
  const totalPertumbuhan =
    total2025 > 0
      ? (totalSelisih / total2025) * 100
      : total2026 > 0
      ? 100
      : 0;

  const allWpSet = new Set<string>();
  realisasi2026Filtered.forEach((r) => allWpSet.add(r.namawp));

  const grandTotal: ARSummary = {
    nama: 'TOTAL SEKSI PENGAWASAN I',
    target: totalTarget,
    realisasi2026: total2026,
    realisasi2025: total2025,
    selisih: totalSelisih,
    capaian: totalCapaian,
    pertumbuhan: totalPertumbuhan,
    wpCount2026: allWpSet.size,
    transaksiCount2026: realisasi2026Filtered.length,
  };

  return { arSummaries, grandTotal };
}

/**
 * Calculate aggregation summary per Jenis Pajak (Kode MAP)
 */
export function calculateJenisPajakSummaries(
  realisasiRows: RealisasiRow[],
  flagFilter: FlagFilter,
  selectedMonths: number[],
  yearCurrent: number = 2026,
  yearPrevious: number = 2025
): {
  jenisPajakSummaries: JenisPajakSummary[];
  grandTotalJenisPajak: JenisPajakSummary;
} {
  // Collect all distinct MAP codes present in realisasi rows
  const distinctMaps = Array.from(
    new Set(realisasiRows.map((r) => String(r.kdmap)))
  )
    .filter((k) => k && k.trim() !== '')
    .sort((a, b) => a.localeCompare(b));

  // Filter 2026 realisasi
  const r2026Filtered = realisasiRows.filter(
    (row) =>
      row.tahunbayar === yearCurrent &&
      matchesFlagFilter(row.flag, flagFilter) &&
      (selectedMonths.length === 0 || selectedMonths.includes(row.bulanbayar))
  );

  // Filter 2025 realisasi
  const r2025Filtered = realisasiRows.filter(
    (row) =>
      row.tahunbayar === yearPrevious &&
      matchesFlagFilter(row.flag, flagFilter) &&
      (selectedMonths.length === 0 || selectedMonths.includes(row.bulanbayar))
  );

  // Pre-calculate total 2026 for contribution %
  const totalRealisasi2026All = r2026Filtered.reduce((sum, r) => sum + Number(r.nominal || 0), 0);

  // Group 2026 per map
  const map2026 = new Map<string, { nominal: number; wpSet: Set<string>; count: number }>();
  r2026Filtered.forEach((row) => {
    const k = String(row.kdmap);
    if (!map2026.has(k)) {
      map2026.set(k, { nominal: 0, wpSet: new Set(), count: 0 });
    }
    const cur = map2026.get(k)!;
    cur.nominal += Number(row.nominal || 0);
    cur.wpSet.add(row.namawp);
    cur.count += 1;
  });

  // Group 2025 per map
  const map2025 = new Map<string, { nominal: number; count: number }>();
  r2025Filtered.forEach((row) => {
    const k = String(row.kdmap);
    if (!map2025.has(k)) {
      map2025.set(k, { nominal: 0, count: 0 });
    }
    const cur = map2025.get(k)!;
    cur.nominal += Number(row.nominal || 0);
    cur.count += 1;
  });

  const jenisPajakSummaries: JenisPajakSummary[] = distinctMaps
    .map((kdmap) => {
      const data2026 = map2026.get(kdmap) || { nominal: 0, wpSet: new Set(), count: 0 };
      const data2025 = map2025.get(kdmap) || { nominal: 0, count: 0 };

      const realisasi2026 = data2026.nominal;
      const realisasi2025 = data2025.nominal;
      const selisih = realisasi2026 - realisasi2025;
      const pertumbuhan =
        realisasi2025 > 0
          ? (selisih / realisasi2025) * 100
          : realisasi2026 > 0
          ? 100
          : 0;

      const kontribusi =
        totalRealisasi2026All > 0 ? (realisasi2026 / totalRealisasi2026All) * 100 : 0;

      const namaJenisPajak = MAP_DESCRIPTIONS[kdmap] || `Pajak MAP ${kdmap}`;

      return {
        kdmap,
        namaJenisPajak,
        realisasi2026,
        realisasi2025,
        selisih,
        pertumbuhan,
        kontribusi,
        wpCount2026: data2026.wpSet.size,
        transaksiCount2026: data2026.count,
        transaksiCount2025: data2025.count,
      };
    })
    // Only show maps that have transactions or realisasi
    .filter((item) => item.realisasi2026 > 0 || item.realisasi2025 > 0 || item.transaksiCount2026 > 0 || item.transaksiCount2025 > 0);

  const total2026 = jenisPajakSummaries.reduce((sum, item) => sum + item.realisasi2026, 0);
  const total2025 = jenisPajakSummaries.reduce((sum, item) => sum + item.realisasi2025, 0);
  const totalSelisih = total2026 - total2025;
  const totalPertumbuhan =
    total2025 > 0
      ? (totalSelisih / total2025) * 100
      : total2026 > 0
      ? 100
      : 0;

  const totalWpAll = new Set<string>();
  r2026Filtered.forEach((r) => totalWpAll.add(r.namawp));

  const grandTotalJenisPajak: JenisPajakSummary = {
    kdmap: 'ALL',
    namaJenisPajak: 'TOTAL SELURUH JENIS PAJAK',
    realisasi2026: total2026,
    realisasi2025: total2025,
    selisih: totalSelisih,
    pertumbuhan: totalPertumbuhan,
    kontribusi: total2026 > 0 ? 100 : 0,
    wpCount2026: totalWpAll.size,
    transaksiCount2026: r2026Filtered.length,
    transaksiCount2025: r2025Filtered.length,
  };

  return { jenisPajakSummaries, grandTotalJenisPajak };
}

