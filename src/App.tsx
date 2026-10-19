import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { TargetRow, RealisasiRow, FlagFilter } from './types/tax';
import {
  fetchTargetData,
  fetchRealisasiData,
} from './lib/supabase';
import { calculateARSummaries } from './utils/taxCalculations';
import { Header } from './components/Header';
import { GlobalFilter } from './components/GlobalFilter';
import { MetricCards } from './components/MetricCards';
import { MainTable } from './components/MainTable';
import { DetailModal } from './components/DetailModal';
import { LoadingProgressModal } from './components/LoadingProgressModal';
import { SupabaseConfigModal } from './components/SupabaseConfigModal';
import { DataDiagnosticModal } from './components/DataDiagnosticModal';
import { DeploymentGuideModal } from './components/DeploymentGuideModal';
import { Database, RefreshCw, Sliders } from 'lucide-react';

export default function App() {
  // Data states - strictly initialized as empty arrays (NO DUMMY DATA)
  const [targetRows, setTargetRows] = useState<TargetRow[]>([]);
  const [realisasiRows, setRealisasiRows] = useState<RealisasiRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const [hasLoaded, setHasLoaded] = useState<boolean>(false);

  // Global Filter states: Default to ALL 12 MONTHS
  const [globalFlag, setGlobalFlag] = useState<FlagFilter>('Semua');
  const [globalMonths, setGlobalMonths] = useState<number[]>([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);

  // Drill-down Modal states
  const [selectedAR, setSelectedAR] = useState<string | null>(null);
  const [drilldownYear, setDrilldownYear] = useState<number>(2026);

  // Modals for Supabase configuration, Diagnostics, and Deployment Guide
  const [isConfigOpen, setIsConfigOpen] = useState<boolean>(false);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState<boolean>(false);
  const [isDeployGuideOpen, setIsDeployGuideOpen] = useState<boolean>(false);

  // Load data function with simulated smooth progress from 0% to 90%, then snapping to 100% on resolution
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setLoadingProgress(5);

    // Smooth simulated progress timer up to 90%
    const progressTimer = setInterval(() => {
      setLoadingProgress((prev) => {
        if (prev < 35) {
          return prev + Math.floor(Math.random() * 5) + 3; // +3 to +7
        } else if (prev < 65) {
          return prev + Math.floor(Math.random() * 4) + 2; // +2 to +5
        } else if (prev < 88) {
          return prev + 1; // slow crawl near 88%
        }
        return prev;
      });
    }, 80);

    try {
      const [targetsRes, realisasiRes] = await Promise.all([
        fetchTargetData(),
        fetchRealisasiData(),
      ]);

      // Jump to 100% immediately when Promise resolved
      clearInterval(progressTimer);
      setLoadingProgress(100);

      // Brief delay to let user see 100% completed
      await new Promise((resolve) => setTimeout(resolve, 400));

      setTargetRows(targetsRes.data);
      setRealisasiRows(realisasiRes.data);
      setHasLoaded(true);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      clearInterval(progressTimer);
      setLoadingProgress(100);
      await new Promise((resolve) => setTimeout(resolve, 350));
      setTargetRows([]);
      setRealisasiRows([]);
      setHasLoaded(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Determine available comparison years dynamically from realisasi data
  const availableYears = useMemo(() => {
    const years = Array.from(new Set(realisasiRows.map((r) => r.tahunbayar)))
      .filter((y) => typeof y === 'number' && y >= 2000)
      .sort((a, b) => b - a);
    return years.length >= 2 ? years : [2026, 2025];
  }, [realisasiRows]);

  const currentYear = availableYears[0] || 2026;
  const previousYear = availableYears[1] || currentYear - 1;

  // Collect strictly real AR names from database rows (NO DUMMY NAMES)
  const arList = useMemo(() => {
    const dbARs = new Set<string>();
    targetRows.forEach((r) => r.nama && dbARs.add(r.nama));
    realisasiRows.forEach((r) => r.nama && dbARs.add(r.nama));
    return Array.from(dbARs).sort();
  }, [targetRows, realisasiRows]);

  // Aggregate summaries per AR based on global filters and dynamic comparison years
  const { arSummaries, grandTotal } = useMemo(() => {
    return calculateARSummaries(
      targetRows,
      realisasiRows,
      arList,
      globalFlag,
      globalMonths,
      currentYear,
      previousYear
    );
  }, [targetRows, realisasiRows, arList, globalFlag, globalMonths, currentYear, previousYear]);

  // Handle drill-down selection
  const handleSelectAR = (namaAR: string, defaultYear: number = currentYear) => {
    setSelectedAR(namaAR);
    setDrilldownYear(defaultYear);
  };

  const handleCloseDetailModal = () => {
    setSelectedAR(null);
  };

  const hasData = targetRows.length > 0 || realisasiRows.length > 0;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-800 antialiased font-sans">
      {/* 1. Header Navigation */}
      <Header
        isLoading={isLoading}
        onRefresh={loadData}
        onOpenSupabaseConfig={() => setIsConfigOpen(true)}
        onOpenDiagnostics={() => setIsDiagnosticsOpen(true)}
        onOpenDeploymentGuide={() => setIsDeployGuideOpen(true)}
      />

      {/* 2. Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6 space-y-5">
        {!hasLoaded && isLoading ? (
          // During initial fetch: Empty placeholder while loading overlay covers the screen
          <div className="py-24" />
        ) : !hasData ? (
          // Empty state if database has no records (STRICTLY NO DUMMY DATA)
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 sm:p-12 text-center max-w-xl mx-auto shadow-sm my-10">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-100">
              <Database className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">
              Belum Ada Data di Database Supabase
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto mb-6">
              Tabel <code>952_was1_target</code> atau <code>952_was1_realisasi</code> belum memiliki baris data atau belum terisi. Sesuai ketentuan, data demo tidak ditampilkan.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={() => setIsConfigOpen(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-2 cursor-pointer transition-colors shadow-sm"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Pengaturan Supabase</span>
              </button>
              <button
                onClick={loadData}
                disabled={isLoading}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-2 cursor-pointer transition-colors shadow-sm disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Muat Ulang dari Supabase</span>
              </button>
            </div>
          </div>
        ) : (
          // Real Data Rendered Only After 100% Loading Done
          <>
            {/* 3. Global Filter Section (Flag & Bulan Bayar) */}
            <section aria-label="Global Filter">
              <GlobalFilter
                flag={globalFlag}
                onFlagChange={setGlobalFlag}
                selectedMonths={globalMonths}
                onMonthsChange={setGlobalMonths}
              />
            </section>

            {/* 4. Metric KPI Cards */}
            <section aria-label="Ringkasan Eksekutif">
              <MetricCards
                summary={grandTotal}
                selectedMonthsCount={globalMonths.length}
              />
            </section>

            {/* 5. Main Aggregation Table (AR of Was I) */}
            <section aria-label="Tabel Agregasi per AR">
              <MainTable
                summaries={arSummaries}
                grandTotal={grandTotal}
                onSelectAR={handleSelectAR}
                activeFlag={globalFlag}
              />
            </section>
          </>
        )}
      </main>

      {/* 6. Drill-down Modal (Wajib Pajak Detail per AR) */}
      {selectedAR && (
        <DetailModal
          isOpen={Boolean(selectedAR)}
          onClose={handleCloseDetailModal}
          namaAR={selectedAR}
          allRealisasiRows={realisasiRows}
          globalFlag={globalFlag}
          globalMonths={globalMonths}
          initialYear={drilldownYear}
        />
      )}

      {/* 7. Loading Progress Modal Overlay (0% to 100%) */}
      <LoadingProgressModal
        isOpen={isLoading}
        progress={loadingProgress}
      />

      {/* 8. Supabase Config Modal */}
      <SupabaseConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        onConfigSaved={() => loadData()}
      />

      {/* 9. Data Diagnostics Modal */}
      <DataDiagnosticModal
        isOpen={isDiagnosticsOpen}
        onClose={() => setIsDiagnosticsOpen(false)}
        onRefreshData={loadData}
        onOpenSettings={() => {
          setIsDiagnosticsOpen(false);
          setIsConfigOpen(true);
        }}
      />

      {/* 10. Deployment Guide Modal */}
      <DeploymentGuideModal
        isOpen={isDeployGuideOpen}
        onClose={() => setIsDeployGuideOpen(false)}
      />

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <span>Kementerian Keuangan Republik Indonesia • Direktorat Jenderal Pajak</span>
          </div>
          <div>
            <span>Seksi Pengawasan I • KPP Pratama</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
