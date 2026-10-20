import React, { useState, useRef, useEffect } from 'react';
import { FlagFilter, MONTHS } from '../types/tax';
import { Filter, Calendar, ChevronDown, Check, X, RotateCcw } from 'lucide-react';

interface GlobalFilterProps {
  flag: FlagFilter;
  onFlagChange: (flag: FlagFilter) => void;
  selectedMonths: number[];
  onMonthsChange: (months: number[]) => void;
  className?: string;
  isCompact?: boolean;
  disableFlagSelection?: boolean;
}

export const GlobalFilter: React.FC<GlobalFilterProps> = ({
  flag,
  onFlagChange,
  selectedMonths,
  onMonthsChange,
  className = '',
  isCompact = false,
  disableFlagSelection = false,
}) => {
  const [isMonthDropdownOpen, setIsMonthDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsMonthDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const flagOptions: FlagFilter[] = ['Semua', 'PPM', 'PKM', 'PKM P3'];

  const toggleMonth = (m: number) => {
    if (selectedMonths.includes(m)) {
      // Don't allow empty months - if it's the last one, keep it or allow empty to mean none
      onMonthsChange(selectedMonths.filter((item) => item !== m));
    } else {
      onMonthsChange([...selectedMonths, m].sort((a, b) => a - b));
    }
  };

  const selectAllMonths = () => {
    onMonthsChange(MONTHS.map((m) => m.value));
  };

  const selectYTD = () => {
    // Up to current month (e.g., month 10 / October)
    onMonthsChange([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  };

  const selectQ1 = () => onMonthsChange([1, 2, 3]);
  const selectQ2 = () => onMonthsChange([4, 5, 6]);
  const selectQ3 = () => onMonthsChange([7, 8, 9]);

  const monthLabel = () => {
    if (selectedMonths.length === 0) return 'Tidak ada bulan dipilih';
    if (selectedMonths.length === 12) return 'Semua Bulan (Jan - Des)';
    if (selectedMonths.length === 10 && selectedMonths.every((m, idx) => m === idx + 1)) {
      return 'Januari - Oktober (s.d. Berjalan)';
    }
    if (selectedMonths.length <= 3) {
      return selectedMonths.map((m) => MONTHS.find((item) => item.value === m)?.shortLabel).join(', ');
    }
    return `${selectedMonths.length} Bulan Terpilih (${MONTHS.find((m) => m.value === selectedMonths[0])?.shortLabel} - ${
      MONTHS.find((m) => m.value === selectedMonths[selectedMonths.length - 1])?.shortLabel
    })`;
  };

  return (
    <div
      className={`bg-white rounded-xl border border-slate-200 shadow-xs p-3.5 sm:p-4 ${className}`}
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
        {/* Left Side: Filter Flag & Month */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Label Header */}
          <div className="flex items-center gap-2 text-slate-700 text-xs font-semibold uppercase tracking-wider shrink-0">
            <Filter className="w-3.5 h-3.5 text-blue-600" />
            <span>Filter Data:</span>
          </div>

          {/* 1. Flag Filter Segmented Control */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200/80 overflow-x-auto">
            {flagOptions.map((opt) => {
              const isLockedSemua = disableFlagSelection;
              const isEffectiveActive = isLockedSemua ? opt === 'Semua' : flag === opt;
              const isDisabled = isLockedSemua && opt !== 'Semua';

              return (
                <button
                  key={opt}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => !isDisabled && onFlagChange(opt)}
                  title={
                    isDisabled
                      ? 'Pengawasan Masa hanya mencakup Semua Flag'
                      : `Pilih filter ${opt}`
                  }
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
                    isDisabled
                      ? 'opacity-35 cursor-not-allowed text-slate-400 bg-transparent'
                      : isEffectiveActive
                      ? 'bg-blue-600 text-white shadow-xs font-semibold cursor-pointer'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 cursor-pointer'
                  }`}
                >
                  {opt === 'Semua' ? 'Semua Flag' : opt}
                </button>
              );
            })}
          </div>

          {/* 2. Bulan Bayar Multi-Select Dropdown */}
          <div className="relative shrink-0" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsMonthDropdownOpen(!isMonthDropdownOpen)}
              className="w-full sm:w-auto flex items-center justify-between gap-2.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-1.5 text-slate-600">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-slate-500 font-normal">Bulan Bayar:</span>
              </div>
              <span className="font-semibold text-slate-900 max-w-[190px] truncate">
                {monthLabel()}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${isMonthDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Panel */}
            {isMonthDropdownOpen && (
              <div className="absolute left-0 sm:left-auto right-0 sm:right-auto mt-2 w-80 sm:w-88 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-3 animate-in fade-in zoom-in-95 duration-100">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                  <span className="text-xs font-semibold text-slate-800">
                    Pilih Bulan Pembayaran
                  </span>
                  <button
                    onClick={() => setIsMonthDropdownOpen(false)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap gap-1.5 mb-3 pb-2.5 border-b border-slate-100">
                  <button
                    type="button"
                    onClick={selectAllMonths}
                    className="px-2 py-1 text-[11px] font-medium rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                  >
                    Semua (12 Bulan)
                  </button>
                  <button
                    type="button"
                    onClick={selectYTD}
                    className="px-2 py-1 text-[11px] font-medium rounded bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors"
                  >
                    Jan - Okt (YTD)
                  </button>
                  <button
                    type="button"
                    onClick={selectQ1}
                    className="px-2 py-1 text-[11px] font-medium rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                  >
                    TW I (Jan-Mar)
                  </button>
                  <button
                    type="button"
                    onClick={selectQ2}
                    className="px-2 py-1 text-[11px] font-medium rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                  >
                    TW II (Apr-Jun)
                  </button>
                  <button
                    type="button"
                    onClick={selectQ3}
                    className="px-2 py-1 text-[11px] font-medium rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                  >
                    TW III (Jul-Sep)
                  </button>
                </div>

                {/* Grid of Months (1-12) */}
                <div className="grid grid-cols-3 gap-1.5 mb-3">
                  {MONTHS.map((m) => {
                    const isSelected = selectedMonths.includes(m.value);
                    return (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => toggleMonth(m.value)}
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white font-semibold shadow-xs'
                            : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-100'
                        }`}
                      >
                        <span>{m.label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                      </button>
                    );
                  })}
                </div>

                {/* Bottom Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <span className="text-slate-500">
                    {selectedMonths.length} dari 12 bulan dipilih
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsMonthDropdownOpen(false)}
                    className="px-3 py-1 bg-slate-900 text-white font-medium rounded-md hover:bg-slate-800 transition-colors"
                  >
                    Terapkan
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Active Info & Quick Reset */}
        <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>Filter aktif:</span>
            <span className="font-semibold text-slate-800">
              Flag: {flag}
            </span>
            <span>•</span>
            <span className="font-semibold text-slate-800">
              {selectedMonths.length} Bulan
            </span>
          </div>

          {(flag !== 'Semua' || selectedMonths.length !== 10) && (
            <button
              onClick={() => {
                onFlagChange('Semua');
                selectYTD();
              }}
              title="Kembalikan ke filter awal (Semua Flag, Jan-Okt)"
              className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium hover:underline cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
