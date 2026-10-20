export interface TargetRow {
  id?: string | number;
  nama: string;
  flag: string; // PPM, PKM
  nominal: number;
}

export interface RealisasiRow {
  id?: string | number;
  nama: string; // Nama AR
  namawp: string; // Nama Wajib Pajak
  kdmap: string; // Kode MAP pajak (e.g., 411121)
  kdbayar: string; // Kode bayar (e.g., 100, 200, 300)
  masa: string | number; // Masa pajak
  tahun: number; // Tahun pajak (e.g., 2025, 2026)
  tahunbayar: number; // Tahun pembayaran (2025, 2026)
  bulanbayar: number; // Bulan pembayaran (1-12)
  nominal: number; // Realisasi penerimaan
  flag: string; // PPM / PKM / PKM P3
}

export type FlagFilter = 'Semua' | 'PPM' | 'PKM' | 'PKM P3';

export interface ARSummary {
  nama: string;
  target: number;
  realisasi2026: number;
  realisasi2025: number;
  selisih: number;
  capaian: number; // percentage
  pertumbuhan: number; // percentage
  wpCount2026: number;
  transaksiCount2026: number;
}

export interface MonthOption {
  value: number;
  label: string;
  shortLabel: string;
}

export const MONTHS: MonthOption[] = [
  { value: 1, label: 'Januari', shortLabel: 'Jan' },
  { value: 2, label: 'Februari', shortLabel: 'Feb' },
  { value: 3, label: 'Maret', shortLabel: 'Mar' },
  { value: 4, label: 'April', shortLabel: 'Apr' },
  { value: 5, label: 'Mei', shortLabel: 'Mei' },
  { value: 6, label: 'Juni', shortLabel: 'Jun' },
  { value: 7, label: 'Juli', shortLabel: 'Jul' },
  { value: 8, label: 'Agustus', shortLabel: 'Agu' },
  { value: 9, label: 'September', shortLabel: 'Sep' },
  { value: 10, label: 'Oktober', shortLabel: 'Okt' },
  { value: 11, label: 'November', shortLabel: 'Nov' },
  { value: 12, label: 'Desember', shortLabel: 'Des' },
];

export const MAP_DESCRIPTIONS: Record<string, string> = {
  // 1. Kelompok PPh Ditanggung Pemerintah (DTP) & Khusus
  '411141': 'PPh Pasal 21 Ditanggung Pemerintah (DTP)',
  '411142': 'PPh Pasal 22 DTP',
  '411143': 'PPh Pasal 22 Impor DTP',
  '411144': 'PPh Pasal 23 DTP',
  '411145': 'PPh Pasal 25/29 Orang Pribadi DTP',
  '411146': 'PPh Pasal 25/29 Badan DTP',
  '411147': 'PPh Pasal 26 DTP',
  '411148': 'PPh Final DTP',
  '411149': 'PPh Non-Migas Lainnya DTP',
  '411241': 'PPN DTP',
  '411242': 'PPnBM DTP',
  '411631': 'Sanksi Penagihan PPh DTP',
  '411641': 'Pajak Karbon',

  // 2. Kelompok Pajak Penghasilan (PPh) Reguler
  '411111': 'PPh Minyak Bumi',
  '411112': 'PPh Gas Alam',
  '411121': 'PPh Pasal 21',
  '411122': 'PPh Pasal 22',
  '411123': 'PPh Pasal 22 Impor',
  '411124': 'PPh Pasal 23',
  '411125': 'PPh Pasal 25/29 Orang Pribadi',
  '411126': 'PPh Pasal 25/29 Badan',
  '411127': 'PPh Pasal 26',
  '411128': 'PPh Final',
  '411129': 'PPh Non-Migas Lainnya',

  // 3. Kelompok PPN dan PPnBM
  '411211': 'PPN Dalam Negeri',
  '411212': 'PPN Impor',
  '411219': 'PPN Lainnya',
  '411221': 'PPnBM Dalam Negeri',
  '411222': 'PPnBM Impor',
  '411229': 'PPnBM Lainnya',

  // 4. Kelompok PBB (Pajak Bumi dan Bangunan) Sektor Pusat
  '411313': 'PBB Perkebunan',
  '411314': 'PBB Perhutanan',
  '411315': 'PBB Pertambangan Minerba',
  '411316': 'PBB Pertambangan Migas',
  '411317': 'PBB Sektor Panas Bumi',
  '411319': 'PBB Sektor Lainnya',

  // 5. Kelompok Bea Meterai & Bunga/Denda Penagihan
  '411611': 'Bea Meterai',
  '411618': 'Deposit Pajak',
  '411619': 'Pajak Lainnya',
  '411621': 'Bunga/Denda Penagihan PPh',
  '411622': 'Bunga/Denda Penagihan PPN',
  '411623': 'Bunga/Denda Penagihan PPnBM',
  '411624': 'Bunga/Denda Penagihan Pajak Tidak Langsung Lainnya',
};

export interface JenisPajakSummary {
  kdmap: string;
  namaJenisPajak: string;
  realisasi2026: number;
  realisasi2025: number;
  selisih: number;
  pertumbuhan: number; // percentage
  kontribusi: number; // percentage of 2026 total
  wpCount2026: number;
  transaksiCount2026: number;
  transaksiCount2025: number;
}

export interface PengawasanMasaBulanBreakdown {
  monthNum: number; // 1-12 or 0 (Tahunan)
  monthCode: string; // "01", "02", ..., "12", "00"
  displayName: string;
  isTahunan: boolean;
  nominal2026: number;
  nominal2025: number;
  selisih: number;
  pertumbuhan: number;
}

export interface PengawasanMasaWPSummary {
  namawp: string;
  namaAR: string;
  kdmapList: string[];
  total2026: number;
  total2025: number;
  selisih: number;
  pertumbuhan: number;
  bulanBreakdown: PengawasanMasaBulanBreakdown[];
  allTransactions: RealisasiRow[];
}

