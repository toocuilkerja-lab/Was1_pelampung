import React, { useState, useEffect } from 'react';
import {
  X,
  Database,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  Sliders,
  ExternalLink,
  Code,
  Trash2,
} from 'lucide-react';
import {
  getSupabaseCredentials,
  saveSupabaseCredentials,
  clearSupabaseCredentials,
  testSupabaseConnection,
  generateSupabaseSQLScript,
  getDataSourceMode,
  setDataSourceMode,
} from '../lib/supabase';

interface SupabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved: () => void;
}

export const SupabaseConfigModal: React.FC<SupabaseConfigModalProps> = ({
  isOpen,
  onClose,
  onConfigSaved,
}) => {
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [mode, setMode] = useState<'auto' | 'supabase' | 'demo'>('auto');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'config' | 'sql'>('config');

  useEffect(() => {
    if (isOpen) {
      const creds = getSupabaseCredentials();
      setUrl(creds.url);
      setAnonKey(creds.anonKey);
      setMode(getDataSourceMode());
      setTestResult(null);
    }
  }, [isOpen]);

  const handleSave = () => {
    saveSupabaseCredentials(url, anonKey);
    setDataSourceMode(mode);
    onConfigSaved();
    onClose();
  };

  const handleReset = () => {
    clearSupabaseCredentials();
    setUrl('');
    setAnonKey('');
    setMode('auto');
    setTestResult(null);
    onConfigSaved();
  };

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    // temporarily save to test
    saveSupabaseCredentials(url, anonKey);
    const result = await testSupabaseConnection();
    setTestResult(result);
    setIsTesting(false);
  };

  const handleCopySQL = () => {
    const sql = generateSupabaseSQLScript();
    navigator.clipboard.writeText(sql);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Pengaturan Database Supabase</h3>
              <p className="text-xs text-slate-400">
                Tabel: 952_was1_target & 952_was1_realisasi
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Header */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('config')}
            className={`flex items-center gap-2 pb-3 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'config'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Koneksi API & Kredensial</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sql')}
            className={`flex items-center gap-2 pb-3 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'sql'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>Script SQL Schema & Data Seed</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6">
          {activeTab === 'config' ? (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 text-xs text-blue-800 flex items-start gap-2.5">
                <Database className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Konfigurasi Fleksibel</p>
                  <p className="text-blue-700 mt-0.5">
                    Anda dapat mengisi kredensial di file <code className="bg-blue-100 px-1 py-0.5 rounded font-mono">.env</code> (VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY) atau langsung mengisinya pada formulir di bawah ini untuk disimpan di browser.
                  </p>
                </div>
              </div>

              {/* Form Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Supabase Project URL
                </label>
                <input
                  type="text"
                  placeholder="https://xyzprojectid.supabase.co"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Supabase Anon Key (Public)
                </label>
                <input
                  type="password"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={anonKey}
                  onChange={(e) => setAnonKey(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-mono"
                />
              </div>

              {/* Mode Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Mode Sumber Data:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setMode('auto')}
                    className={`px-3 py-2 text-xs font-medium rounded-lg border text-left cursor-pointer transition-colors ${
                      mode === 'auto'
                        ? 'bg-blue-50 border-blue-500 text-blue-900 font-semibold'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-bold">Otomatis (Auto)</div>
                    <div className="text-[10px] text-slate-500">Gunakan Supabase jika valid, fallback ke Demo</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMode('supabase')}
                    className={`px-3 py-2 text-xs font-medium rounded-lg border text-left cursor-pointer transition-colors ${
                      mode === 'supabase'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-semibold'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-bold">Paksa Supabase</div>
                    <div className="text-[10px] text-slate-500">Hanya ambil dari server Supabase</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMode('demo')}
                    className={`px-3 py-2 text-xs font-medium rounded-lg border text-left cursor-pointer transition-colors ${
                      mode === 'demo'
                        ? 'bg-amber-50 border-amber-500 text-amber-900 font-semibold'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-bold">Simulasi / Demo</div>
                    <div className="text-[10px] text-slate-500">Gunakan 8 AR contoh dengan ribuan transaksi</div>
                  </button>
                </div>
              </div>

              {/* Test Connection Button & Result */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleTest}
                  disabled={isTesting || !url || !anonKey}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 transition-colors inline-flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                  <span>{isTesting ? 'Menguji Koneksi...' : 'Uji Koneksi ke Supabase'}</span>
                </button>

                {testResult && (
                  <div
                    className={`mt-2.5 p-3 rounded-lg text-xs flex items-start gap-2 ${
                      testResult.success
                        ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                        : 'bg-rose-50 border border-rose-200 text-rose-800'
                    }`}
                  >
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <span>{testResult.message}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600">
                  Jalankan SQL ini di <strong>Supabase Dashboard &gt; SQL Editor</strong> untuk membuat tabel & hak akses secara instan:
                </span>
                <button
                  type="button"
                  onClick={handleCopySQL}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors cursor-pointer"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{isCopied ? 'Tersalin!' : 'Salin Script SQL'}</span>
                </button>
              </div>

              <div className="bg-slate-900 rounded-xl p-3.5 max-h-80 overflow-y-auto font-mono text-xs text-slate-200">
                <pre>{generateSupabaseSQLScript()}</pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-800 hover:underline"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Hapus Kredensial Browser</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors shadow-xs"
            >
              Simpan & Terapkan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
