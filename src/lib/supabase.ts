import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { TargetRow, RealisasiRow } from '../types/tax';

// Storage keys
const STORAGE_KEY_URL = 'WAS1_SUPABASE_URL';
const STORAGE_KEY_KEY = 'WAS1_SUPABASE_ANON_KEY';
const STORAGE_KEY_MODE = 'WAS1_DATA_SOURCE_MODE'; // 'auto' | 'supabase' | 'demo'

// In-memory server credentials cache
let serverCredsCache: { url: string; anonKey: string; detectedKeys: string[] } | null = null;
let serverCredsPromise: Promise<{ url: string; anonKey: string; detectedKeys: string[] }> | null = null;

// Declare global vite-defined vars
declare const __ENV_SUPABASE_URL__: string;
declare const __ENV_SUPABASE_ANON_KEY__: string;

export async function fetchServerCredentials(): Promise<{ url: string; anonKey: string; detectedKeys: string[] }> {
  if (serverCredsCache) return serverCredsCache;
  if (serverCredsPromise) return serverCredsPromise;

  serverCredsPromise = (async () => {
    try {
      const res = await fetch('/api/supabase-config');
      if (res.ok) {
        const json = await res.json();
        serverCredsCache = {
          url: json.url || '',
          anonKey: json.anonKey || '',
          detectedKeys: json.detectedKeys || [],
        };
        return serverCredsCache;
      }
    } catch (e) {
      // Backend api might not be available in pure client build or preview
      console.warn('Could not fetch server-side supabase credentials:', e);
    }
    serverCredsCache = { url: '', anonKey: '', detectedKeys: [] };
    return serverCredsCache;
  })();

  return serverCredsPromise;
}

export function getSupabaseCredentials(): { url: string; anonKey: string; source: string } {
  // 1. Browser LocalStorage (highest priority for manual overrides)
  const localUrl = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_URL) : '';
  const localKey = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_KEY) : '';

  if (localUrl && localKey && localUrl.startsWith('http')) {
    return { url: localUrl.trim(), anonKey: localKey.trim(), source: 'Local Storage (Manual)' };
  }

  // 2. Server credentials cache
  if (serverCredsCache && serverCredsCache.url && serverCredsCache.anonKey) {
    return {
      url: serverCredsCache.url.trim(),
      anonKey: serverCredsCache.anonKey.trim(),
      source: `Server Secret (${serverCredsCache.detectedKeys.join(', ') || 'AI Studio Secret'})`,
    };
  }

  // 3. Vite Define (__ENV_SUPABASE_URL__)
  try {
    if (typeof __ENV_SUPABASE_URL__ !== 'undefined' && __ENV_SUPABASE_URL__ && typeof __ENV_SUPABASE_ANON_KEY__ !== 'undefined' && __ENV_SUPABASE_ANON_KEY__) {
      return {
        url: __ENV_SUPABASE_URL__.trim(),
        anonKey: __ENV_SUPABASE_ANON_KEY__.trim(),
        source: 'Vite Define / Process Env',
      };
    }
  } catch {
    // ignore
  }

  // 4. import.meta.env
  const envUrl = (import.meta.env.VITE_SUPABASE_URL as string) || '';
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '';
  if (envUrl && envKey) {
    return { url: envUrl.trim(), anonKey: envKey.trim(), source: '.env (VITE_SUPABASE_URL)' };
  }

  return { url: '', anonKey: '', source: 'Belum Terdeteksi' };
}

export function saveSupabaseCredentials(url: string, anonKey: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_URL, url.trim());
    localStorage.setItem(STORAGE_KEY_KEY, anonKey.trim());
    reinitClient();
  }
}

export function clearSupabaseCredentials() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY_URL);
    localStorage.removeItem(STORAGE_KEY_KEY);
    reinitClient();
  }
}

export function getDataSourceMode(): 'auto' | 'supabase' | 'demo' {
  if (typeof window !== 'undefined') {
    const mode = localStorage.getItem(STORAGE_KEY_MODE);
    if (mode === 'supabase' || mode === 'demo') return mode;
  }
  return 'auto';
}

export function setDataSourceMode(mode: 'auto' | 'supabase' | 'demo') {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_MODE, mode);
  }
}

let supabaseInstance: SupabaseClient | null = null;

export function reinitClient(): SupabaseClient | null {
  const { url, anonKey } = getSupabaseCredentials();
  if (url && anonKey && url.startsWith('http')) {
    try {
      supabaseInstance = createClient(url, anonKey);
      return supabaseInstance;
    } catch (e) {
      console.warn('Failed to initialize Supabase client:', e);
      supabaseInstance = null;
    }
  } else {
    supabaseInstance = null;
  }
  return null;
}

// Initial init
reinitClient();

export function getSupabaseClient(): SupabaseClient | null {
  if (!supabaseInstance) {
    reinitClient();
  }
  return supabaseInstance;
}

export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = getSupabaseCredentials();
  return Boolean(url && anonKey && url.startsWith('https://') && anonKey.length > 20);
}

// Helper to safely parse nominal number from any Postgres format
export function parseNominal(val: unknown): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return 0;
    // Check if Indonesian currency string with dot as thousand separator and comma as decimal: "15.000.000,00"
    if (trimmed.includes('.') && trimmed.includes(',')) {
      return parseFloat(trimmed.replace(/\./g, '').replace(',', '.')) || 0;
    }
    // Standard numeric string or decimal "15000000" or "15000000.50"
    const parsed = parseFloat(trimmed);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

// Helper to parse month from number or text (e.g. 1, "1", "01", "Januari", etc.)
const MONTH_TEXT_MAP: Record<string, number> = {
  jan: 1, januari: 1, january: 1,
  feb: 2, februari: 2, february: 2,
  mar: 3, maret: 3, march: 3,
  apr: 4, april: 4,
  mei: 5, may: 5,
  jun: 6, juni: 6, june: 6,
  jul: 7, juli: 7, july: 7,
  agu: 8, agustus: 8, august: 8, agt: 8,
  sep: 9, september: 9,
  okt: 10, oktober: 10, october: 10,
  nov: 11, november: 11,
  des: 12, desember: 12, december: 12,
};

export function parseMonth(val: unknown): number {
  if (val === null || val === undefined) return 1;
  if (typeof val === 'number') {
    return val >= 1 && val <= 12 ? val : 1;
  }
  if (typeof val === 'string') {
    const s = val.trim().toLowerCase();
    const num = parseInt(s, 10);
    if (!isNaN(num) && num >= 1 && num <= 12) return num;
    for (const [key, mNum] of Object.entries(MONTH_TEXT_MAP)) {
      if (s.startsWith(key)) return mNum;
    }
  }
  return 1;
}

// Flexible case-insensitive row property getter
function getProp(obj: Record<string, unknown>, keys: string[]): unknown {
  const lowerObj: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    lowerObj[k.toLowerCase().replace(/_/g, '')] = v;
  }
  for (const k of keys) {
    const cleanKey = k.toLowerCase().replace(/_/g, '');
    if (lowerObj[cleanKey] !== undefined && lowerObj[cleanKey] !== null) {
      return lowerObj[cleanKey];
    }
  }
  return undefined;
}

// Normalize target row
export function normalizeTargetRow(raw: Record<string, unknown>, index: number): TargetRow {
  const nama = String(getProp(raw, ['nama', 'ar', 'namaar', 'nama_ar']) || `AR ${index + 1}`).trim();
  const flag = String(getProp(raw, ['flag', 'jenis', 'kategori']) || 'PPM').trim().toUpperCase();
  const nominal = parseNominal(getProp(raw, ['nominal', 'target', 'nilai', 'rupiah']));

  return {
    id: raw.id ? String(raw.id) : index + 1,
    nama,
    flag,
    nominal,
  };
}

// Normalize realisasi row
export function normalizeRealisasiRow(raw: Record<string, unknown>, index: number): RealisasiRow {
  const nama = String(getProp(raw, ['nama', 'ar', 'namaar', 'nama_ar']) || 'Unknown AR').trim();
  const namawp = String(getProp(raw, ['namawp', 'nama_wp', 'wajibpajak', 'nama_wajib_pajak', 'wp']) || 'WP Tanpa Nama').trim();
  const kdmap = String(getProp(raw, ['kdmap', 'kd_map', 'map', 'kodemap']) || '411121').trim();
  const kdbayar = String(getProp(raw, ['kdbayar', 'kd_bayar', 'kodepembayaran', 'bayar']) || '100').trim();
  const masa = String(getProp(raw, ['masa', 'masapajak', 'masa_pajak']) || '1').trim();
  const rawTahun = Number(getProp(raw, ['tahun', 'tahunpajak', 'tahun_pajak'])) || 2026;
  const rawTahunBayar = Number(getProp(raw, ['tahunbayar', 'tahun_bayar', 'thnbayar'])) || rawTahun;
  const rawBulanBayar = parseMonth(getProp(raw, ['bulanbayar', 'bulan_bayar', 'blnbayar', 'bulan']));
  const nominal = parseNominal(getProp(raw, ['nominal', 'realisasi', 'nilai', 'rupiah', 'jumlah', 'bayar']));
  const flag = String(getProp(raw, ['flag', 'jenis', 'kategori']) || 'PPM').trim().toUpperCase();

  return {
    id: raw.id ? String(raw.id) : index + 1,
    nama,
    namawp,
    kdmap,
    kdbayar,
    masa,
    tahun: rawTahun,
    tahunbayar: rawTahunBayar,
    bulanbayar: rawBulanBayar,
    nominal,
    flag,
  };
}

// Test connection
export async function testSupabaseConnection(): Promise<{ success: boolean; message: string; targetCount?: number; realisasiCount?: number }> {
  await fetchServerCredentials();
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      message: 'Supabase URL atau Anon Key belum ditemukan di Secrets atau LocalStorage.',
    };
  }

  try {
    const [targetRes, realisasiRes] = await Promise.all([
      client.from('952_was1_target').select('count', { count: 'exact', head: true }),
      client.from('952_was1_realisasi').select('count', { count: 'exact', head: true }),
    ]);

    if (targetRes.error && targetRes.error.code === '42P01') {
      return {
        success: false,
        message: 'Koneksi ke Supabase berhasil, namun tabel "952_was1_target" belum dibuat. Silakan jalankan script SQL Schema.',
      };
    }
    if (realisasiRes.error && realisasiRes.error.code === '42P01') {
      return {
        success: false,
        message: 'Koneksi ke Supabase berhasil, namun tabel "952_was1_realisasi" belum dibuat. Silakan jalankan script SQL Schema.',
      };
    }
    if (targetRes.error) {
      return {
        success: false,
        message: `Gagal akses tabel target: ${targetRes.error.message}`,
      };
    }

    const tCount = targetRes.count ?? 0;
    const rCount = realisasiRes.count ?? 0;

    return {
      success: true,
      message: `Berhasil terhubung ke Supabase! Ditemukan ${tCount} baris Target dan ${rCount} baris Realisasi.`,
      targetCount: tCount,
      realisasiCount: rCount,
    };
  } catch (err: unknown) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Terjadi kesalahan saat menguji koneksi.',
    };
  }
}

// Fetch Target Data with pagination & normalization
export async function fetchTargetData(): Promise<{
  data: TargetRow[];
  source: 'supabase' | 'demo';
  totalCount?: number;
  error?: string;
}> {
  await fetchServerCredentials();
  const mode = getDataSourceMode();
  const client = getSupabaseClient();

  if (mode !== 'demo' && client) {
    try {
      // Fetch all targets (typically < 1000 rows, but we fetch safely)
      const { data, error, count } = await client
        .from('952_was1_target')
        .select('*', { count: 'exact' });

      if (!error && data && data.length > 0) {
        const normalized = data.map((item, idx) => normalizeTargetRow(item, idx));
        return {
          data: normalized,
          source: 'supabase',
          totalCount: count ?? normalized.length,
        };
      } else if (error) {
        console.warn('Supabase fetch target error:', error.message);
      }
    } catch (err) {
      console.warn('Supabase fetch target exception:', err);
    }
  }

  // DILARANG KERAS MENGGUNAKAN DATA MOCK: Selalu kembalikan array kosong jika belum ada data asli dari Supabase
  return {
    data: [],
    source: 'supabase',
    totalCount: 0,
  };
}

// Fetch Realisasi Data with CRITICAL PAGINATION to avoid 1000 row truncation!
export async function fetchRealisasiData(): Promise<{
  data: RealisasiRow[];
  source: 'supabase' | 'demo';
  totalCount?: number;
  error?: string;
}> {
  await fetchServerCredentials();
  const mode = getDataSourceMode();
  const client = getSupabaseClient();

  if (mode !== 'demo' && client) {
    try {
      // 1. First get total count
      const countRes = await client
        .from('952_was1_realisasi')
        .select('*', { count: 'exact', head: true });
      const totalExpected = countRes.count ?? 0;

      // 2. Paginate to fetch 100% of all rows with concurrent batching (e.g. 36k+ rows loaded in ~2-3 seconds)
      const batchSize = 1000;
      const totalPages = Math.ceil(totalExpected / batchSize);
      let allRawRows: Record<string, unknown>[] = [];

      if (totalPages <= 1) {
        const { data, error } = await client.from('952_was1_realisasi').select('*');
        if (!error && data) allRawRows = data;
      } else {
        const concurrency = 6;
        for (let i = 0; i < totalPages; i += concurrency) {
          const chunkPromises = [];
          for (let j = i; j < Math.min(i + concurrency, totalPages); j++) {
            const from = j * batchSize;
            const to = from + batchSize - 1;
            chunkPromises.push(
              client.from('952_was1_realisasi').select('*').range(from, to)
            );
          }
          const results = await Promise.all(chunkPromises);
          for (const res of results) {
            if (!res.error && res.data) {
              allRawRows.push(...res.data);
            } else if (res.error) {
              console.warn('Batch fetch error:', res.error.message);
            }
          }
        }
      }

      if (allRawRows.length > 0) {
        const normalized = allRawRows.map((item, idx) => normalizeRealisasiRow(item, idx));
        console.log(`[Supabase] Successfully fetched ${normalized.length} realisasi rows (expected ${totalExpected})`);
        return {
          data: normalized,
          source: 'supabase',
          totalCount: totalExpected || normalized.length,
        };
      }
    } catch (err) {
      console.warn('Supabase fetch realisasi exception:', err);
    }
  }

  // DILARANG KERAS MENGGUNAKAN DATA MOCK: Selalu kembalikan array kosong jika belum ada data asli dari Supabase
  return {
    data: [],
    source: 'supabase',
    totalCount: 0,
  };
}

// Complete Diagnostics Inspector
export interface SupabaseDiagnosticReport {
  credentialSource: string;
  isConfigured: boolean;
  targetCount: number;
  realisasiCount: number;
  distinctARs: string[];
  distinctFlags: string[];
  distinctYears: number[];
  sampleTargets: TargetRow[];
  sampleRealisasi: RealisasiRow[];
  sumNominal2026: number;
  sumNominal2025: number;
  error?: string;
}

export async function runSupabaseDiagnostics(): Promise<SupabaseDiagnosticReport> {
  const creds = getSupabaseCredentials();
  const client = getSupabaseClient();

  if (!client) {
    return {
      credentialSource: creds.source,
      isConfigured: false,
      targetCount: 0,
      realisasiCount: 0,
      distinctARs: [],
      distinctFlags: [],
      distinctYears: [],
      sampleTargets: [],
      sampleRealisasi: [],
      sumNominal2026: 0,
      sumNominal2025: 0,
      error: 'Supabase client belum terinisialisasi. Periksa kredensial di Secret / Pengaturan.',
    };
  }

  try {
    const [targetsRes, realisasiRes] = await Promise.all([
      fetchTargetData(),
      fetchRealisasiData(),
    ]);

    const targets = targetsRes.data;
    const realisasi = realisasiRes.data;

    const distinctARs = Array.from(new Set([...targets.map((t) => t.nama), ...realisasi.map((r) => r.nama)])).sort();
    const distinctFlags = Array.from(new Set([...targets.map((t) => t.flag), ...realisasi.map((r) => r.flag)])).sort();
    const distinctYears = Array.from(new Set(realisasi.map((r) => r.tahunbayar))).sort((a, b) => b - a);

    const sum2026 = realisasi
      .filter((r) => r.tahunbayar === 2026)
      .reduce((sum, r) => sum + r.nominal, 0);
    const sum2025 = realisasi
      .filter((r) => r.tahunbayar === 2025)
      .reduce((sum, r) => sum + r.nominal, 0);

    return {
      credentialSource: creds.source,
      isConfigured: true,
      targetCount: targets.length,
      realisasiCount: realisasi.length,
      distinctARs,
      distinctFlags,
      distinctYears,
      sampleTargets: targets.slice(0, 3),
      sampleRealisasi: realisasi.slice(0, 3),
      sumNominal2026: sum2026,
      sumNominal2025: sum2025,
    };
  } catch (e: unknown) {
    return {
      credentialSource: creds.source,
      isConfigured: true,
      targetCount: 0,
      realisasiCount: 0,
      distinctARs: [],
      distinctFlags: [],
      distinctYears: [],
      sampleTargets: [],
      sampleRealisasi: [],
      sumNominal2026: 0,
      sumNominal2025: 0,
      error: e instanceof Error ? e.message : 'Gagal menjalankan diagnostik Supabase.',
    };
  }
}

// SQL Script Generator
export function generateSupabaseSQLScript(): string {
  return `-- ========================================================
-- SCHEMA & DATA SEEDING UNTUK SUPABASE
-- DASHBOARD PENERIMAAN PAJAK - SEKSI PENGAWASAN I (952)
-- ========================================================

-- 1. Buat Tabel: 952_was1_target
CREATE TABLE IF NOT EXISTS public."952_was1_target" (
    id BIGSERIAL PRIMARY KEY,
    nama TEXT NOT NULL,
    flag TEXT NOT NULL,
    nominal NUMERIC(18, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Buat Tabel: 952_was1_realisasi
CREATE TABLE IF NOT EXISTS public."952_was1_realisasi" (
    id BIGSERIAL PRIMARY KEY,
    nama TEXT NOT NULL,
    namawp TEXT NOT NULL,
    kdmap TEXT NOT NULL,
    kdbayar TEXT NOT NULL,
    masa TEXT NOT NULL,
    tahun INT NOT NULL,
    tahunbayar INT NOT NULL,
    bulanbayar INT NOT NULL,
    nominal NUMERIC(18, 2) NOT NULL DEFAULT 0,
    flag TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexing untuk query cepat agregasi AR & Wajib Pajak
CREATE INDEX IF NOT EXISTS idx_target_nama_flag ON public."952_was1_target" (nama, flag);
CREATE INDEX IF NOT EXISTS idx_realisasi_nama_thn_bln ON public."952_was1_realisasi" (nama, tahunbayar, bulanbayar);
CREATE INDEX IF NOT EXISTS idx_realisasi_flag ON public."952_was1_realisasi" (flag);
CREATE INDEX IF NOT EXISTS idx_realisasi_namawp ON public."952_was1_realisasi" (namawp);

-- Aktifkan Row Level Security (RLS) dan berikan hak akses READ publik untuk anon key
ALTER TABLE public."952_was1_target" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."952_was1_realisasi" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access for target" ON public."952_was1_target";
CREATE POLICY "Public read access for target" ON public."952_was1_target"
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read access for realisasi" ON public."952_was1_realisasi";
CREATE POLICY "Public read access for realisasi" ON public."952_was1_realisasi"
    FOR SELECT USING (true);
`;
}
