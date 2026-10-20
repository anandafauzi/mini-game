# 🎣 Mancing Kuis Nusantara

Game web 3D: mancing ikan di laut lepas dari atas kapal (POV pemancing) dengan latar ombak, pulau tropis, dan burung laut. Setiap ikan yang didapat memunculkan **soal kuis** — jawab dengan benar untuk menambah skor. Skor + waktu dikirim ke **leaderboard global**.

Untuk mahasiswa — main langsung di browser, tanpa install.

## Cara Main

1. Input nama → Mulai (suara ambient ombak/angin/burung laut otomatis menyala)
2. **Tombol CAST** atau tekan **Spasi/Enter** untuk melempar kail
3. **Geser layar** (drag) untuk menoleh melihat sekitar — laut, pulau, kapal
4. Saat ikan menyambar (indikator "Ikan makan umpan!" + ring kuning) → tekan **HOOK**
5. Tarik saat marker putih di **zona hijau** (makin langka ikannya, makin sempit zonanya)
6. Gagal tarik? Kamu punya **3 kesempatan** per soal. Habis 3x → ikan lepas & soal gugur
7. Jawab soal kuis yang muncul — **waktu 2 menit**, cepat = bonus poin!

### Fitur

- Grafis 3D: samudra dengan ombak Gerstner (fresnel + sun glitter + busa puncak), kapal yang mengikuti gelombang, pulau tropis, burung laut, kabut laut
- Audio ambient: suara ombak (swell LFO), angin bertiup (LFO gust), kicau burung acak, efek lempar/splash/tangkap
- Kamera POV yang bisa ditoleh (drag look-around)
- 15 jenis ikan laut (common → legendary), tiap spesies punya siluet & pola tubuh berbeda
- Soal kuis tidak berulang dalam satu sesi — sesi berakhir otomatis kalau soal habis
- Panel kuis dari Google Sheets (edit spreadsheet → game langsung update)
- Leaderboard global Supabase (satu baris per pemain, skor akhir menang)

### Skor

`Poin = nilai soal + bonus kecepatan (maks +20, berbasis waktu 2 menit) + bonus kelangkaan ikan (+10 s/d +100)`

Leaderboard diurutkan: skor tertinggi, lalu waktu tercepat.

## Setup

```bash
npm install
npm run dev
```

### 1. Soal Kuis (Google Sheets)

Isi soal di spreadsheet dengan format:

| No | Soal | a | b | c | d | Kunci Jawaban | Nilai per soal |
|----|------|---|---|---|---|---------------|----------------|
| 1 | ... | ... | ... | ... | ... | A/B/C/D | 20 |

Lalu: **File → Share → Publish to web → CSV**, salin link-nya ke `.env`:

```
VITE_QUESTIONS_CSV_URL=https://docs.google.com/spreadsheets/d/.../pub?output=csv
```

Tanpa `.env`, game pakai 3 soal contoh.

### 2. Leaderboard Global (Supabase — opsional)

1. Buat project gratis di [supabase.com](https://supabase.com)
2. Buka **SQL Editor**, jalankan isi `supabase/leaderboard.sql`
   (database lama yang sudah punya data: jalankan `supabase/migrate_leaderboard_one_row_per_player.sql` sekali)
3. Salin **Project URL** + **anon key** ke `.env`:

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

Tanpa Supabase, game tetap jalan (leaderboard disembunyikan).

## Deploy (Vercel)

```bash
npm i -g vercel
vercel
```

Isi environment variables yang sama di dashboard Vercel.

## Tech Stack

React 19 · Vite · TypeScript · Three.js (@react-three/fiber) · Tailwind CSS · Zustand · Supabase
