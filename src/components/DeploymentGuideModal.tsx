import React, { useState } from 'react';
import { X, GitBranch, Check, Copy } from 'lucide-react';

interface DeploymentGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DeploymentGuideModal: React.FC<DeploymentGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-400 font-bold">
              <GitBranch className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Panduan Push ke GitHub & Deploy ke Vercel</h3>
              <p className="text-xs text-slate-400">
                Langkah praktis membawa aplikasi ke produksi
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700">
          {/* Step 1: Push ke GitHub */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
                1
              </span>
              <h4 className="text-sm font-bold text-slate-900">
                Push Proyek ke Repositori GitHub
              </h4>
            </div>
            <p className="text-slate-600 pl-8">
              Buka terminal di root direktori proyek Anda dan jalankan perintah berikut untuk menginisialisasi git dan melakukan push ke repositori GitHub baru:
            </p>
            <div className="ml-8 bg-slate-900 rounded-xl p-3.5 text-slate-200 font-mono relative group">
              <pre className="overflow-x-auto text-[11px] leading-relaxed">
{`git init
git add .
git commit -m "feat: Dashboard Penerimaan Pajak Seksi Pengawasan I"
git branch -M main
git remote add origin https://github.com/USERNAME-ANDA/dashboard-was1.git
git push -u origin main`}
              </pre>
              <button
                onClick={() =>
                  copyToClipboard(
                    `git init\ngit add .\ngit commit -m "feat: Dashboard Penerimaan Pajak Seksi Pengawasan I"\ngit branch -M main\ngit remote add origin https://github.com/USERNAME-ANDA/dashboard-was1.git\ngit push -u origin main`,
                    1
                  )
                }
                className="absolute right-3 top-3 px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-[10px] text-slate-300 flex items-center gap-1 cursor-pointer"
              >
                {copiedIndex === 1 ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedIndex === 1 ? 'Disalin' : 'Salin'}</span>
              </button>
            </div>
          </div>

          {/* Step 2: Import ke Vercel */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
                2
              </span>
              <h4 className="text-sm font-bold text-slate-900">
                Import Repositori di Vercel
              </h4>
            </div>
            <div className="pl-8 space-y-1.5 text-slate-600">
              <p>1. Buka <a href="https://vercel.com" target="_blank" rel="noreferrer" className="text-blue-600 underline font-semibold">vercel.com</a> dan masuk menggunakan akun GitHub Anda.</p>
              <p>2. Klik tombol <strong>Add New...</strong> &gt; <strong>Project</strong>.</p>
              <p>3. Pilih repositori <strong>dashboard-was1</strong> yang baru saja Anda push.</p>
              <p>4. Framework Preset akan otomatis terdeteksi sebagai <strong>Vite</strong>.</p>
            </div>
          </div>

          {/* Step 3: Environment Variables */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
                3
              </span>
              <h4 className="text-sm font-bold text-slate-900">
                Konfigurasi Environment Variables di Vercel
              </h4>
            </div>
            <p className="text-slate-600 pl-8">
              Pada bagian <strong>Environment Variables</strong> di halaman konfigurasi Vercel, tambahkan dua kunci berikut:
            </p>
            <div className="ml-8 bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between font-mono bg-white p-2 rounded border border-slate-200 text-xs">
                <span className="font-semibold text-blue-700">VITE_SUPABASE_URL</span>
                <span className="text-slate-500">https://your-project.supabase.co</span>
              </div>
              <div className="flex items-center justify-between font-mono bg-white p-2 rounded border border-slate-200 text-xs">
                <span className="font-semibold text-blue-700">VITE_SUPABASE_ANON_KEY</span>
                <span className="text-slate-500">eyJhbGciOiJIUzI1NiIsInR5cCI6...</span>
              </div>
            </div>
          </div>

          {/* Step 4: Selesai & Deploy */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs">
                4
              </span>
              <h4 className="text-sm font-bold text-slate-900">
                Klik Deploy!
              </h4>
            </div>
            <p className="text-slate-600 pl-8">
              Klik <strong>Deploy</strong>. Dalam ~30 detik, dashboard penerimaan pajak Seksi Pengawasan I siap diakses oleh rekan AR dan pimpinan melalui domain Vercel yang aman (HTTPS).
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            Tutup Panduan
          </button>
        </div>
      </div>
    </div>
  );
};
