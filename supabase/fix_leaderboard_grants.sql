-- FIX GRANT: cabut hak DELETE/UPDATE/TRUNCATE dari anon & authenticated.
-- RLS policy hanya menyaring baris; grant di level tabel ini yang membuat
-- anon tetap bisa menghapus data. Sisakan hanya SELECT & INSERT.

revoke delete, update, truncate, references, trigger on public.leaderboard from anon;
revoke delete, update, truncate, references, trigger on public.leaderboard from authenticated;

grant select, insert on public.leaderboard to anon;
grant select, insert on public.leaderboard to authenticated;
