import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { TargetRow, RealisasiRow, FlagFilter } from './types/tax';
import {
  fetchTargetData,
  fetchRealisasiData,
} from './lib/supabase';
import { calculateARSummaries, calculateJenisPajakSummaries } from './utils/taxCalculations';
import { Header } from './components/Header';
import { GlobalFilter } from './components/GlobalFilter';
import { MetricCards } from './components/MetricCards';
import { MainTable } from './components/MainTable';
import { DetailModal } from './components/DetailModal';
import { JenisPajakTable } from './components/JenisPajakTable';
import { JenisPajakDetailModal } from './components/JenisPajakDetailModal';
import { PengawasanMasaView } from './components/PengawasanMasaView';
import { LoadingProgressModal } from './components/LoadingProgressModal';
import { Database, RefreshCw, AlertCircle, Users, Layers, CalendarRange } from 'lucide-react';

export default function App() {
  // Navigation Tab State: 'ar' | 'map' | 'pengawasan_masa' (Default: 'ar')
  const [activeTab, setActiveTab] = useState<'ar' | 'map' | 'pengawasan_masa'>('ar');

  // Data states - strictly initialized as empty arrays (NO DUMMY DATA)
  const [targetRows, setTargetRows] = useState<TargetRow[]>([]);
  const [realisasiRows, setRealisasiRows] = useState<RealisasiRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const [hasLoaded, setHasLoaded] = useState<boolean>(false);

  // Global Filter states: Default to ALL 12 MONTHS
  const [globalFlag, setGlobalFlag] = useState<FlagFilter>('Semua');
  const [globalMonths, setGlobalMonths] = useState<number[]>([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);

  // Drill-down Modal states (per AR)
  const [selectedAR, setSelectedAR] = useState<string | null>(null);
  const [drilldownYear, setDrilldownYear] = useState<number>(2026);

  // Drill-down Modal state (per Jenis Pajak / MAP)
  const [selectedMAP, setSelectedMAP] = useState<string | null>(null);

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

  // Aggregate summaries per Jenis Pajak (Kode MAP)
  const { jenisPajakSummaries, grandTotalJenisPajak } = useMemo(() => {
    return calculateJenisPajakSummaries(
      realisasiRows,
      globalFlag,
      globalMonths,
      currentYear,
      previousYear
    );
  }, [realisasiRows, globalFlag, globalMonths, currentYear, previousYear]);

  // Handle drill-down selection (per AR)
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
              Belum Ada Data di Database
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto mb-6">
              Tabel <code>952_was1_target</code> atau <code>952_was1_realisasi</code> belum memiliki baris data atau belum terisi. Sesuai ketentuan, data demo tidak ditampilkan.
            </p>
            <button
              onClick={loadData}
              disabled={isLoading}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-2 cursor-pointer transition-colors shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Muat Ulang Data</span>
            </button>
          </div>
        ) : (
          // Real Data Rendered Only After 100% Loading Done
          <>
            {/* 3. Global Filter Section (Flag & Bulan Bayar) */}
            <section aria-label="Global Filter">
              <GlobalFilter
                flag={activeTab === 'pengawasan_masa' ? 'Semua' : globalFlag}
                onFlagChange={setGlobalFlag}
                selectedMonths={globalMonths}
                onMonthsChange={setGlobalMonths}
                disableFlagSelection={activeTab === 'pengawasan_masa'}
              />
            </section>

            {/* 4. Metric KPI Cards */}
            <section aria-label="Ringkasan Eksekutif">
              <MetricCards
                summary={grandTotal}
                selectedMonthsCount={globalMonths.length}
              />
            </section>

            {/* 5. Main Content Navigation Tabs: Per AR (Default) | Per Jenis Pajak | Pengawasan Masa */}
            <section aria-label="Kinerja Penerimaan Pajak" className="space-y-3">
              {/* Tab Navigation Buttons */}
              <div className="flex border-b border-slate-200 bg-white rounded-t-xl px-2 pt-2 gap-1 shadow-2xs overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab('ar')}
                  className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === 'ar'
                      ? 'border-blue-600 text-blue-900 bg-blue-50/50 rounded-t-lg'
                      : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-t-lg'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Per AR</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('map')}
                  className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === 'map'
                      ? 'border-blue-600 text-blue-900 bg-blue-50/50 rounded-t-lg'
                      : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-t-lg'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  <span>Per Jenis Pajak</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('pengawasan_masa')}
                  className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === 'pengawasan_masa'
                      ? 'border-blue-600 text-blue-900 bg-blue-50/50 rounded-t-lg'
                      : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-t-lg'
                  }`}
                >
                  <CalendarRange className="w-4 h-4" />
                  <span>Pengawasan Masa</span>
                </button>
              </div>

              {/* Tab Panel 1: Per AR */}
              {activeTab === 'ar' && (
                <div className="animate-in fade-in duration-150">
                  <MainTable
                    summaries={arSummaries}
                    grandTotal={grandTotal}
                    onSelectAR={handleSelectAR}
                    activeFlag={globalFlag}
                  />
                </div>
              )}

              {/* Tab Panel 2: Per Jenis Pajak */}
              {activeTab === 'map' && (
                <div className="animate-in fade-in duration-150">
                  <JenisPajakTable
                    summaries={jenisPajakSummaries}
                    grandTotal={grandTotalJenisPajak}
                    onSelectMAP={(kdmap) => setSelectedMAP(kdmap)}
                    activeFlag={globalFlag}
                  />
                </div>
              )}

              {/* Tab Panel 3: Pengawasan Masa */}
              {activeTab === 'pengawasan_masa' && (
                <div className="animate-in fade-in duration-150">
                  <PengawasanMasaView
                    realisasiRows={realisasiRows}
                    arList={arList}
                    globalFlag={globalFlag}
                    globalMonths={globalMonths}
                  />
                </div>
              )}
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

      {/* 7. Drill-down Modal (Wajib Pajak Detail per Jenis Pajak / MAP) */}
      {selectedMAP && (
        <JenisPajakDetailModal
          isOpen={Boolean(selectedMAP)}
          onClose={() => setSelectedMAP(null)}
          kdmap={selectedMAP}
          allRealisasiRows={realisasiRows}
          globalFlag={globalFlag}
          globalMonths={globalMonths}
        />
      )}

      {/* 7. Loading Progress Modal Overlay (0% to 100%) */}
      <LoadingProgressModal
        isOpen={isLoading}
        progress={loadingProgress}
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
