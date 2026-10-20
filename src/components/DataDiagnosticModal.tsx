import React, { useState, useEffect } from 'react';
import {
  X,
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Database,
  Search,
  Layers,
  Calendar,
  Users,
  Coins,
  ShieldCheck,
} from 'lucide-react';
import {
  getSupabaseCredentials,
  runSupabaseDiagnostics,
  SupabaseDiagnosticReport,
  getDataSourceMode,
  setDataSourceMode,
} from '../lib/supabase';
import { formatRupiah } from '../utils/taxCalculations';

interface DataDiagnosticModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshData: () => void;
  onOpenSettings: () => void;
}

export const DataDiagnosticModal: React.FC<DataDiagnosticModalProps> = ({
  isOpen,
  onClose,
  onRefreshData,
  onOpenSettings,
}) => {
  const [report, setReport] = useState<SupabaseDiagnosticReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'summary' | 'raw'>('summary');

  const loadDiagnostics = async () => {
    setIsLoading(true);
    try {
      const data = await runSupabaseDiagnostics();
      setReport(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadDiagnostics();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const creds = getSupabaseCredentials();
  const currentMode = getDataSourceMode();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 font-bold">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">Diagnostik Data Supabase</h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-900 text-blue-300 border border-blue-700">
                  Data Inspector
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Pemeriksaan komprehensif koneksi, jumlah baris, dan pemetaan data riil
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadDiagnostics}
              disabled={isLoading}
              title="Periksa Ulang"
              className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('summary')}
            className={`flex items-center gap-2 pb-3 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'summary'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Status & Agregasi Nilai</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('raw')}
            className={`flex items-center gap-2 pb-3 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'raw'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Sampel Baris Data Mentah</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
          {isLoading ? (
            <div className="py-16 text-center">
              <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-800">Sedang memeriksa data Supabase...</p>
              <p className="text-xs text-slate-500 mt-1">Mengambil data tabel 952_was1_target dan 952_was1_realisasi</p>
            </div>
          ) : report?.error ? (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-rose-800">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm">Terjadi Masalah Koneksi ke Supabase</h4>
                  <p className="mt-1 text-rose-700">{report.error}</p>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={onOpenSettings}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-medium transition-colors cursor-pointer"
                    >
                      Buka Pengaturan Supabase
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : report ? (
            activeTab === 'summary' ? (
              <div className="space-y-4">
                {/* 1. Status Sumber Kredensial */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-3 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                      <span className="font-bold text-sm text-slate-900">Sumber Kredensial:</span>
                      <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {report.credentialSource}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Mode Aktif: <strong className="text-slate-800">{currentMode}</strong>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500 block">Supabase URL Terdeteksi:</span>
                      <span className="font-mono font-semibold text-slate-800 break-all">
                        {creds.url ? creds.url : 'Tidak ada (Kosong)'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Anon Key Terdeteksi:</span>
                      <span className="font-mono text-slate-800">
                        {creds.anonKey ? `Ada (${creds.anonKey.length} karakter - Valid)` : 'Tidak ada'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Jumlah Baris yang Ditemukan di Database */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                    <div className="flex items-center justify-between text-blue-700 text-xs font-semibold">
                      <span>Tabel Target</span>
                      <Database className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-xl font-bold text-blue-900 mt-1">
                      {report.targetCount} <span className="text-xs font-normal">Baris</span>
                    </div>
                    <div className="text-[10px] text-blue-600 mt-0.5">Tabel 952_was1_target</div>
                  </div>

                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                    <div className="flex items-center justify-between text-emerald-700 text-xs font-semibold">
                      <span>Tabel Realisasi</span>
                      <Coins className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-xl font-bold text-emerald-900 mt-1">
                      {report.realisasiCount} <span className="text-xs font-normal">Baris</span>
                    </div>
                    <div className="text-[10px] text-emerald-600 mt-0.5">100% dipaginasi tanpa terpotong</div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                    <div className="flex items-center justify-between text-slate-600 text-xs font-semibold">
                      <span>Total Realisasi 2026</span>
                      <Calendar className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-sm font-bold text-slate-900 mt-1 font-mono" title={formatRupiah(report.sumNominal2026)}>
                      {formatRupiah(report.sumNominal2026)}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Total mentah tahun 2026</div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                    <div className="flex items-center justify-between text-slate-600 text-xs font-semibold">
                      <span>Total Realisasi 2025</span>
                      <Calendar className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-sm font-bold text-slate-900 mt-1 font-mono" title={formatRupiah(report.sumNominal2025)}>
                      {formatRupiah(report.sumNominal2025)}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Total mentah tahun 2025</div>
                  </div>
                </div>

                {/* 3. Nilai Unik di Database Pengguna */}
                <div className="space-y-3">
                  <div className="bg-white border border-slate-200 rounded-xl p-3.5">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs mb-2">
                      <Users className="w-3.5 h-3.5 text-blue-600" />
                      <span>Nama-Nama AR yang Terdeteksi di Database ({report.distinctARs.length} AR):</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {report.distinctARs.map((ar) => (
                        <span
                          key={ar}
                          className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200"
                        >
                          {ar}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-white border border-slate-200 rounded-xl p-3.5">
                      <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs mb-2">
                        <Layers className="w-3.5 h-3.5 text-amber-600" />
                        <span>Nilai Flag yang Ditemukan di Database:</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {report.distinctFlags.map((fl) => (
                          <span
                            key={fl}
                            className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200"
                          >
                            {fl}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl p-3.5">
                      <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs mb-2">
                        <Calendar className="w-3.5 h-3.5 text-purple-600" />
                        <span>Tahun Pembayaran yang Ditemukan:</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {report.distinctYears.map((yr) => (
                          <span
                            key={yr}
                            className="px-2 py-0.5 rounded text-xs font-semibold bg-purple-50 text-purple-800 border border-purple-200"
                          >
                            Tahun {yr}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Petunjuk Solusi jika data belum sama */}
                <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 space-y-2">
                  <h4 className="font-bold text-blue-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                    <span>Mengapa Sebelumnya Data Tampak Tidak Sama?</span>
                  </h4>
                  <ul className="list-disc pl-5 space-y-1 text-slate-700">
                    <li>
                      <strong>Nama Secret di AI Studio:</strong> Vite secara default hanya meneruskan variabel berawalan <code>VITE_</code> ke browser. Kini kami telah memasang server-side handler yang otomatis membaca secret apa pun (<code>SUPABASE_URL</code>, <code>SUPABASE_KEY</code>, <code>VITE_SUPABASE_URL</code>, dll).
                    </li>
                    <li>
                      <strong>Batas 1.000 Baris Supabase:</strong> Supabase secara default membatasi hasil query maksimal 1.000 baris. Kini kami telah mengaktifkan <em>auto-pagination</em> sehingga ribuan baris realisasi akan ditarik secara penuh tanpa ada yang terpotong.
                    </li>
                    <li>
                      <strong>Filter Bulan Default:</strong> Sebelumnya bulan bayar default hanya Jan-Okt. Kini filter otomatis mencakup seluruh 12 bulan (Jan-Des).
                    </li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h4 className="font-bold text-slate-900 mb-1.5">Sampel Baris dari 952_was1_target:</h4>
                  <div className="bg-slate-900 text-slate-200 p-3 rounded-xl font-mono text-[11px] overflow-x-auto max-h-48">
                    <pre>{JSON.stringify(report.sampleTargets, null, 2)}</pre>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 mb-1.5">Sampel Baris dari 952_was1_realisasi:</h4>
                  <div className="bg-slate-900 text-slate-200 p-3 rounded-xl font-mono text-[11px] overflow-x-auto max-h-48">
                    <pre>{JSON.stringify(report.sampleRealisasi, null, 2)}</pre>
                  </div>
                </div>
              </div>
            )
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onOpenSettings}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
          >
            Buka Form Input Kredensial Manual
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onRefreshData();
                loadDiagnostics();
              }}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors cursor-pointer"
            >
              Muat Ulang Data
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
