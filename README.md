# Dashboard Monitoring Penerimaan Pajak - Seksi Pengawasan I

Aplikasi monitoring penerimaan pajak interaktif untuk Seksi Pengawasan I (Was I) KPP Pratama. Memantau realisasi dan capaian target 8 Account Representative (AR) dengan drill-down rincian per Wajib Pajak (WP), Kode MAP, dan Masa/Bulan Pembayaran.

## Fitur Utama

- **Agregasi AR**: Perbandingan Target vs Realisasi (2026 vs 2025), Selisih, % Capaian, dan % Pertumbuhan (YoY).
- **Drill-down Wajib Pajak**: Rincian per WP per AR dengan breakdown kode MAP pajak dan bulan/masa pajak (01-12 dan 00-Tahunan).
- **Slip Setoran Pajak**: Popup slip rincian transaksi setoran dengan opsi unduh CSV.
- **Filter Fleksibel**: Filter Flag (PPM, PKM, PKM P3) dan multi-select Bulan Pembayaran/Masa Pajak.
- **Supabase Direct Integration**: Auto-pagination untuk penarikan data dalam jumlah besar tanpa batas 1000 baris.
- **Diagnostik & Pengaturan Database**: UI bawaan untuk menguji koneksi dan melihat status data.

## Menjalankan Aplikasi

1. Pasang dependensi:
   ```bash
   npm install
   ```

2. Konfigurasi kredensial Supabase di `.env`:
   ```env
   VITE_SUPABASE_URL="https://your-project.supabase.co"
   VITE_SUPABASE_ANON_KEY="your-anon-key"
   ```

3. Jalankan server pengembangan:
   ```bash
   npm run dev
   ```
