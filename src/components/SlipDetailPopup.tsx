import React from 'react';
import { RealisasiRow, MAP_DESCRIPTIONS, MONTHS } from '../types/tax';
import { formatRupiah } from '../utils/taxCalculations';
import { X, Receipt, Download, FileText } from 'lucide-react';

interface SlipDetailPopupProps {
  isOpen: boolean;
  onClose: () => void;
  wpName: string;
  kdmap: string;
  year: number;
  monthNum?: number; // 1-12 or undefined for all months of that MAP
  monthBasis?: 'bulanbayar' | 'masapajak';
  transactions: RealisasiRow[];
}

export const SlipDetailPopup: React.FC<SlipDetailPopupProps> = ({
  isOpen,
  onClose,
  wpName,
  kdmap,
  year,
  monthNum,
  monthBasis = 'bulanbayar',
  transactions,
}) => {
  if (!isOpen) return null;

  const mapDescription = MAP_DESCRIPTIONS[kdmap] || 'Pajak';
  const isTahunan = monthNum === 0;
  const monthName = monthNum !== undefined
    ? (isTahunan ? '00 - Tahunan' : (MONTHS.find((m) => m.value === monthNum)?.label || String(monthNum)))
    : undefined;

  const totalNominal = transactions.reduce((acc, t) => acc + Number(t.nominal || 0), 0);

  const handleExportCSV = () => {
    const headers = [
      'No',
      'Nama Wajib Pajak',
      'MAP',
      'Kode Bayar',
      'Masa Pajak',
      'Tahun Pajak',
      'Tahun Bayar',
      'Bulan Bayar',
      'Flag',
      'Nominal',
    ];
    const rows = transactions.map((t, idx) => [
      idx + 1,
      `"${t.namawp}"`,
      `"${t.kdmap}"`,
      `"${t.kdbayar}"`,
      `"${t.masa}"`,
      t.tahun,
      t.tahunbayar,
      t.bulanbayar,
      `"${t.flag}"`,
      t.nominal,
    ]);

    const csvContent = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `Rincian_Slip_${wpName.replace(/\s+/g, '_')}_${kdmap}_Thn${year}${monthNum !== undefined ? `_Bln${monthNum}` : ''}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      className="fixed inset-0 z-60 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[88vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-400 font-bold">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs uppercase tracking-wider text-blue-400 font-semibold">
                  Rincian Transaksi Setoran Pajak
                </span>
                <span className="text-slate-500">•</span>
                <span className="text-xs text-amber-300 font-semibold">
                  {monthBasis === 'masapajak' ? `Tahun Pajak ${year}` : `Tahun Bayar ${year}`}
                </span>
                {monthName && (
                  <>
                    <span className="text-slate-500">•</span>
                    <span className={`text-xs font-semibold ${isTahunan ? 'text-amber-300' : 'text-emerald-300'}`}>
                      {monthBasis === 'masapajak'
                        ? (isTahunan ? 'Masa 00 - Tahunan' : `Masa Pajak ${monthName} (${String(monthNum).padStart(2, '0')})`)
                        : `Bulan Bayar ${monthName}`}
                    </span>
                  </>
                )}
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight mt-0.5">
                {wpName}
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={transactions.length === 0}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Info Banner */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2 text-slate-700">
            <span className="font-semibold text-slate-500">MAP Pajak:</span>
            <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200 font-bold text-blue-900">
              {kdmap}
            </span>
            <span className="font-semibold text-slate-900">{mapDescription}</span>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium">
            <div>
              <span className="text-slate-500">Jumlah Transaksi: </span>
              <strong className="text-slate-900">{transactions.length} Setoran</strong>
            </div>
            <div>
              <span className="text-slate-500">Total Nominal: </span>
              <strong className="font-mono text-sm text-blue-950 font-bold">{formatRupiah(totalNominal)}</strong>
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-6 bg-slate-50/50">
          {transactions.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300 p-8">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h4 className="text-sm font-semibold text-slate-800">Tidak ada transaksi setoran</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Pada periode {monthBasis === 'masapajak' ? 'Masa Pajak' : 'pembayaran'} {monthName ? `${monthName}` : ''} {monthBasis === 'masapajak' ? 'Tahun Pajak' : 'tahun'} {year} untuk MAP {kdmap}, nominal realisasi tercatat <strong>Rp 0</strong>.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-[11px] font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200 select-none">
                    <tr>
                      <th className="py-2.5 px-3 text-center w-10 text-slate-400">No</th>
                      <th className="py-2.5 px-3 font-bold text-slate-800">Kode MAP</th>
                      <th className="py-2.5 px-3 text-center font-bold text-slate-800">Kode Bayar</th>
                      <th className="py-2.5 px-3 text-center font-bold text-slate-800">Masa Pajak</th>
                      <th className="py-2.5 px-3 text-center font-bold text-slate-800">Tahun Pajak</th>
                      <th className="py-2.5 px-3 text-center font-bold text-slate-800">Tahun Bayar</th>
                      <th className="py-2.5 px-3 text-center font-bold text-slate-800">Bulan Bayar</th>
                      <th className="py-2.5 px-3 text-center font-bold text-slate-800">Flag</th>
                      <th className="py-2.5 px-4 text-right font-bold text-blue-900 bg-blue-50/60 border-l border-blue-100">
                        Nominal Setoran
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transactions.map((tx, idx) => {
                      const mObj = MONTHS.find((m) => m.value === tx.bulanbayar);
                      const mLabel = mObj ? `${mObj.label} (${tx.bulanbayar})` : tx.bulanbayar;
                      return (
                        <tr key={idx} className="hover:bg-blue-50/40 transition-colors">
                          <td className="py-2 px-3 text-center font-mono text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-3 font-mono font-bold text-slate-900">
                            <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              {tx.kdmap}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center font-mono font-medium text-slate-700">
                            <span className="bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                              {tx.kdbayar}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center font-mono text-slate-700">
                            {tx.masa}
                          </td>
                          <td className="py-2 px-3 text-center font-mono text-slate-700">
                            {tx.tahun}
                          </td>
                          <td className="py-2 px-3 text-center font-mono font-bold text-blue-900">
                            {tx.tahunbayar}
                          </td>
                          <td className="py-2 px-3 text-center font-medium text-slate-700">
                            {mLabel}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                tx.flag === 'PPM'
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : tx.flag === 'PKM'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-purple-50 text-purple-700 border border-purple-200'
                              }`}
                            >
                              {tx.flag}
                            </span>
                          </td>
                          <td className="py-2 px-4 text-right font-mono font-bold text-blue-950 bg-blue-50/20 border-l border-blue-100 whitespace-nowrap">
                            {formatRupiah(tx.nominal)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-900 text-white font-bold border-t-2 border-slate-700 text-xs">
                    <tr>
                      <td colSpan={8} className="py-3 px-3 text-right uppercase tracking-wider text-slate-300">
                        Total {transactions.length} Setoran:
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-white text-sm whitespace-nowrap bg-blue-900 border-l border-blue-800">
                        {formatRupiah(totalNominal)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            Sumber data: Tabel <code>952_was1_realisasi</code>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={transactions.length === 0}
              className="sm:hidden px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 text-slate-700"
            >
              Export CSV
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              Tutup Rincian
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
