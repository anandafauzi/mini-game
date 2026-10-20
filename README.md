# 🎣 Mancing Kuis Nusantara

Game web 3D: mancing ikan di sungai (POV pemancing) dengan latar gunung, desa, dan persawahan. Setiap ikan yang didapat memunculkan **soal kuis** — jawab dengan benar untuk menambah skor. Skor + waktu dikirim ke **leaderboard global**.

Untuk mahasiswa — main langsung di browser, tanpa install.

## Cara Main

1. Input nama → Mulai (suara ambient sungai/angin/burung otomatis menyala)
2. **Tombol "Lempar Kail"** atau tekan **Spasi/Enter** untuk melempar kail
3. **Geser layar** (drag) untuk menoleh melihat sekitar — gunung, desa, sawah
4. Saat ikan menyambar (indikator "Ikan makan umpan!" + ring kuning) → tekan **Tarik**
5. Tarik saat marker putih di **zona hijau** (makin langka ikannya, makin sempit zonanya)
6. Gagal tarik? Kamu punya **3 kesempatan** per soal. Habis 3x → ikan lepas & soal gugur
7. Jawab soal kuis yang muncul — **waktu 2 menit**, cepat = bonus poin!

### Fitur

- Grafis 3D: air sungai beriak (fresnel + shimmer), gunung bersalju, sawah terasering, desa, awan bergerak, burung terbang
- Audio ambient: suara sungai, angin bertiup (LFO gust), kicau burung acak, efek lempar/splas/tangkap
- Kamera POV yang bisa ditoleh (drag look-around)
- 9 jenis ikan air tawar (common → legendary)
- Panel kuis dari Google Sheets (edit spreadsheet → game langsung update)
- Leaderboard global Supabase

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
3. Salis **Project URL** + **anon key** ke `.env`:

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
