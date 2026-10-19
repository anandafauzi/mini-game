-- Jalankan di Supabase SQL Editor (Dashboard -> SQL Editor -> New query)
create table if not exists public.leaderboard (
  id uuid primary key default gen_random_uuid(),
  player_name text not null check (char_length(player_name) between 2 and 24),
  score integer not null check (score >= 0),
  duration_ms integer not null check (duration_ms >= 0),
  created_at timestamptz not null default now()
);

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
