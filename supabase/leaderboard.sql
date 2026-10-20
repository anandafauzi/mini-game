-- Jalankan di Supabase SQL Editor (Dashboard -> SQL Editor -> New query)
create table if not exists public.leaderboard (
  id uuid primary key default gen_random_uuid(),
  player_name text not null check (char_length(player_name) between 2 and 24),
  score integer not null check (score >= 0),
  duration_ms integer not null check (duration_ms >= 0),
  created_at timestamptz not null default now()
);

-- Satu baris per pemain: skor terakhir (bukan akumulasi beberapa sesi)
create unique index if not exists leaderboard_player_name_key
  on public.leaderboard (player_name);

create index if not exists leaderboard_score_idx
  on public.leaderboard (score desc, duration_ms asc);

alter table public.leaderboard enable row level security;

-- Siapa pun boleh baca leaderboard
create policy "Leaderboard readable by everyone"
  on public.leaderboard for select
  using (true);

-- Siapa pun boleh insert (tanpa login — game input nama saja)
create policy "Anyone can insert leaderboard"
  on public.leaderboard for insert
  with check (true);

-- Upsert satu-per-pemain lewat SECURITY DEFINER, supaya anon tidak perlu
-- hak UPDATE langsung ke tabel (lihat fix_leaderboard_grants.sql).
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
