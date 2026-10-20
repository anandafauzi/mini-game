-- MIGRASI: satu baris per pemain (skor akhir menang, bukan akumulasi).
-- Jalankan SEKALI di Supabase SQL Editor untuk database yang sudah punya
-- data leaderboard lama (banyak baris per nama).
--
-- Urutan penting: dedupe dulu, baru unique index (gagal kalau masih ada duplikat).

-- 1) Simpan hanya baris terbaik per nama: skor tertinggi, lalu waktu tercepat.
with ranked as (
  select id,
         row_number() over (
           partition by player_name
           order by score desc, duration_ms asc, created_at asc
         ) as rn
  from public.leaderboard
)
delete from public.leaderboard l
using ranked r
where l.id = r.id
  and r.rn > 1;

-- 2) Unique index = syarat ON CONFLICT di fungsi submit_score.
create unique index if not exists leaderboard_player_name_key
  on public.leaderboard (player_name);

-- 3) RPC upsert: anon tetap tanpa hak UPDATE langsung ke tabel.
create or replace function public.submit_score(
  p_player_name text,
  p_score integer,
  p_duration_ms integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.leaderboard (player_name, score, duration_ms, created_at)
  values (p_player_name, p_score, p_duration_ms, now())
  on conflict (player_name) do update
    set score = excluded.score,
        duration_ms = excluded.duration_ms,
        created_at = excluded.created_at;
end;
$$;

revoke all on function public.submit_score(text, integer, integer) from public;
grant execute on function public.submit_score(text, integer, integer) to anon, authenticated;

-- 4) Verifikasi: tidak boleh ada nama duplikat.
select player_name, count(*)
from public.leaderboard
group by player_name
having count(*) > 1;
