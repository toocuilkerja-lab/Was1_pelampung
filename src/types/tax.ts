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
  '411121': 'PPh Pasal 21',
  '411122': 'PPh Pasal 22',
  '411124': 'PPh Pasal 23',
  '411125': 'PPh Pasal 25/29 Orang Pribadi',
  '411126': 'PPh Pasal 25/29 Badan',
  '411128': 'PPh Final',
  '411211': 'PPN Dalam Negeri',
  '411212': 'PPN Impor',
  '411619': 'Pajak Lainnya',
};
