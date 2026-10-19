# 🎣 Mancing Kuis Nusantara

Game web 3D: mancing ikan di sungai (POV pemancing) dengan latar gunung, desa, dan persawahan. Setiap ikan yang didapat memunculkan **soal kuis** — jawab dengan benar untuk menambah skor. Skor + waktu dikirim ke **leaderboard global**.

Untuk mahasiswa — main langsung di browser, tanpa install.

## Cara Main

1. Input nama → Mulai
2. **Klik / tap / spasi** untuk melempar kail
3. Saat ikan menyambar (bobber bergerak) → klik lagi untuk mengait
4. Tarik saat marker putih di **zona hijau** (makin langka ikannya, makin sempit zonanya)
5. Jawab soal kuis yang muncul — cepat = bonus poin!
6. Kalau gagal menarik, ikan lepas dan soal **gugur** (0 poin)

### Skor

`Poin = nilai soal + bonus kecepatan (maks +20) + bonus kelangkaan ikan (+10 s/d +100)`

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
