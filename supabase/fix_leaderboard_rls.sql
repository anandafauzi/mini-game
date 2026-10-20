-- PERBAIKAN KEAMANAN: batasi leaderboard hanya bisa dibaca & ditambah.
-- Jalankan di Supabase SQL Editor.
--
-- Masalah sebelumnya: anon key ternyata bisa DELETE data. Di bawah ini kita
-- aktifkan RLS, hapus SEMUA policy lama, lalu buat hanya 2 policy yang aman:
--   SELECT (siapa pun)  +  INSERT (siapa pun)
-- Tidak ada policy UPDATE / DELETE => anon tidak bisa mengubah/menghapus data.

alter table public.leaderboard enable row level security;

-- Hapus semua policy yang ada supaya bersih
drop policy if exists "Leaderboard readable by everyone" on public.leaderboard;
drop policy if exists "Anyone can insert leaderboard" on public.leaderboard;
drop policy if exists "Enable read access for all users" on public.leaderboard;
drop policy if exists "Enable insert for all users" on public.leaderboard;
drop policy if exists "Enable delete for all users" on public.leaderboard;
drop policy if exists "Enable update for all users" on public.leaderboard;
drop policy if exists "public read" on public.leaderboard;
drop policy if exists "public insert" on public.leaderboard;
drop policy if exists "public delete" on public.leaderboard;
drop policy if exists "public update" on public.leaderboard;

-- Cek: tampilkan semua policy yang tersisa (harus kosong setelah drop di atas,
-- lalu buat ulang 2 policy di bawah)
-- select policyname, cmd from pg_policies where tablename = 'leaderboard';

create policy "leaderboard_select"
  on public.leaderboard for select
  using (true);

create policy "leaderboard_insert"
  on public.leaderboard for insert
  with check (true);

-- Verifikasi akhir: hanya boleh ada 2 baris (SELECT & INSERT)
select policyname, cmd
from pg_policies
where tablename = 'leaderboard'
order by cmd;
