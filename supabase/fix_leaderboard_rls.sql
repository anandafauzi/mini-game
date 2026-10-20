-- PERBAIKAN TOTAL: hapus SEMUA policy pada tabel leaderboard apa pun namanya,
-- lalu buat ulang hanya SELECT + INSERT. RLS tetap aktif.

alter table public.leaderboard enable row level security;

-- Hapus semua policy apa pun namanya secara otomatis
do $$
declare
  pol record;
begin
  for pol in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'leaderboard'
  loop
    execute format('drop policy if exists %I on public.leaderboard', pol.policyname);
  end loop;
end $$;

-- Buat ulang hanya 2 policy aman
create policy "leaderboard_select"
  on public.leaderboard for select
  using (true);

create policy "leaderboard_insert"
  on public.leaderboard for insert
  with check (true);

-- Verifikasi: harus muncul tepat 2 baris (INSERT, SELECT)
select policyname, cmd
from pg_policies
where schemaname = 'public' and tablename = 'leaderboard'
order by cmd;
