import { TargetRow, RealisasiRow } from '../types/tax';

export const INITIAL_AR_NAMES: string[] = [
  'Ardiansyach',
  'Budi Santoso',
  'Citra Dewi Maharani',
  'Dedy Kurniawan',
  'Eko Prasetyo',
  'Fitri Handayani',
  'Gilang Ramadhan',
  'Hendra Wijaya',
];

// Target nominal per AR for PPM and PKM
export const MOCK_TARGETS: TargetRow[] = [
  // 1. Ardiansyach
  { nama: 'Ardiansyach', flag: 'PPM', nominal: 22500000000 },
  { nama: 'Ardiansyach', flag: 'PKM', nominal: 9800000000 },

  // 2. Budi Santoso
  { nama: 'Budi Santoso', flag: 'PPM', nominal: 19800000000 },
  { nama: 'Budi Santoso', flag: 'PKM', nominal: 8500000000 },

  // 3. Citra Dewi Maharani
  { nama: 'Citra Dewi Maharani', flag: 'PPM', nominal: 24000000000 },
  { nama: 'Citra Dewi Maharani', flag: 'PKM', nominal: 11200000000 },

  // 4. Dedy Kurniawan
  { nama: 'Dedy Kurniawan', flag: 'PPM', nominal: 18500000000 },
  { nama: 'Dedy Kurniawan', flag: 'PKM', nominal: 7900000000 },

  // 5. Eko Prasetyo
  { nama: 'Eko Prasetyo', flag: 'PPM', nominal: 21000000000 },
  { nama: 'Eko Prasetyo', flag: 'PKM', nominal: 9200000000 },

  // 6. Fitri Handayani
  { nama: 'Fitri Handayani', flag: 'PPM', nominal: 23200000000 },
  { nama: 'Fitri Handayani', flag: 'PKM', nominal: 10500000000 },

  // 7. Gilang Ramadhan
  { nama: 'Gilang Ramadhan', flag: 'PPM', nominal: 17800000000 },
  { nama: 'Gilang Ramadhan', flag: 'PKM', nominal: 8100000000 },

  // 8. Hendra Wijaya
  { nama: 'Hendra Wijaya', flag: 'PPM', nominal: 20500000000 },
  { nama: 'Hendra Wijaya', flag: 'PKM', nominal: 8900000000 },
];

const TAXPAYERS = [
  'PT Surya Prima Abadi',
  'CV Maju Jaya Lestari',
  'PT Sumber Rejeki Makmur',
  'PT Nusantara Graha Perkasa',
  'CV Berkah Sentosa Mandiri',
  'PT Cipta Karya Gemilang',
  'PT Indo Global Logistik',
  'PT Delta Kharisma Metalindo',
  'CV Bintang Timur Energi',
  'PT Tri Daya Mitra Sejahtera',
  'PT Aneka Tambang Selaras',
  'PT Graha Bangun Mandiri',
  'CV Cahaya Terang Abadi',
  'PT Mega Sarana Distribusi',
  'PT Sinar Terang Semesta',
  'Koperasi Pegawai Was-1 Mandiri',
  'PT Wahana Citra Mandiri',
  'CV Usaha Makmur Bersama',
  'PT Samudra Bahari Perkasa',
  'PT Prima Multi Teknik',
];

const MAP_CODES = ['411121', '411122', '411124', '411125', '411126', '411128', '411211'];
const KODE_BAYAR = ['100', '100', '100', '200', '300', '310', '500'];
const FLAGS: ('PPM' | 'PKM' | 'PKM P3')[] = ['PPM', 'PPM', 'PPM', 'PKM', 'PKM', 'PKM P3'];

// Generate deterministic realistic realisasi dataset for 2025 and 2026
function generateMockRealisasi(): RealisasiRow[] {
  const rows: RealisasiRow[] = [];
  let id = 1;

  INITIAL_AR_NAMES.forEach((arName, arIndex) => {
    // Select subset of taxpayers for each AR
    const arTaxpayers = TAXPAYERS.filter((_, idx) => idx % INITIAL_AR_NAMES.length === arIndex || (idx + 3) % INITIAL_AR_NAMES.length === arIndex);
    // Add extra WP so each AR has 4-6 WP
    const extraWp = TAXPAYERS.slice(0, 3).map((w) => `${w} Cab. ${arName.split(' ')[0]}`);
    const allWp = [...arTaxpayers, ...extraWp];

    // Seed 2025 payments (all 12 months)
    for (let month = 1; month <= 12; month++) {
      allWp.forEach((wp, wpIndex) => {
        const flag = FLAGS[(arIndex + wpIndex + month) % FLAGS.length];
        const kdmap = MAP_CODES[(wpIndex + month) % MAP_CODES.length];
        const kdbayar = KODE_BAYAR[(month + wpIndex) % KODE_BAYAR.length];
        // Base payment
        const baseAmount = 150000000 + ((arIndex * 37 + wpIndex * 53 + month * 19) % 350) * 1250000;

        rows.push({
          id: id++,
          nama: arName,
          namawp: wp,
          kdmap,
          kdbayar,
          masa: month,
          tahun: 2025,
          tahunbayar: 2025,
          bulanbayar: month,
          nominal: baseAmount,
          flag,
        });

        // Add periodic larger payments
        if (month % 3 === 0) {
          rows.push({
            id: id++,
            nama: arName,
            namawp: wp,
            kdmap: '411126',
            kdbayar: '200',
            masa: '12',
            tahun: 2024,
            tahunbayar: 2025,
            bulanbayar: month,
            nominal: baseAmount * 1.8,
            flag: 'PKM',
          });
        }
      });
    }

    // Seed 2026 payments (January to October - current period)
    for (let month = 1; month <= 10; month++) {
      allWp.forEach((wp, wpIndex) => {
        const flag = FLAGS[(arIndex + wpIndex + month * 2) % FLAGS.length];
        const kdmap = MAP_CODES[(wpIndex + month) % MAP_CODES.length];
        const kdbayar = KODE_BAYAR[(month + wpIndex) % KODE_BAYAR.length];

        // 2026 amount has some growth/variation compared to 2025
        const growthFactor = 1.05 + ((arIndex % 3 === 0 ? 0.15 : arIndex % 2 === 0 ? -0.06 : 0.08));
        const baseAmount = Math.round((165000000 + ((arIndex * 41 + wpIndex * 61 + month * 23) % 400) * 1400000) * growthFactor);

        rows.push({
          id: id++,
          nama: arName,
          namawp: wp,
          kdmap,
          kdbayar,
          masa: month,
          tahun: 2026,
          tahunbayar: 2026,
          bulanbayar: month,
          nominal: baseAmount,
          flag,
        });

        if (month % 2 === 0 && wpIndex === 0) {
          rows.push({
            id: id++,
            nama: arName,
            namawp: wp,
            kdmap: '411211',
            kdbayar: '100',
            masa: month,
            tahun: 2026,
            tahunbayar: 2026,
            bulanbayar: month,
            nominal: Math.round(baseAmount * 1.5),
            flag: 'PPM',
          });
        }

        if (month === 4 || month === 8) {
          rows.push({
            id: id++,
            nama: arName,
            namawp: wp,
            kdmap: '411126',
            kdbayar: '310',
            masa: '04',
            tahun: 2025,
            tahunbayar: 2026,
            bulanbayar: month,
            nominal: Math.round(baseAmount * 2.2),
            flag: 'PKM P3',
          });
        }
      });
    }
  });

  return rows;
}

export const MOCK_REALISASI: RealisasiRow[] = generateMockRealisasi();
