import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabaseEnabled = Boolean(supabaseUrl && supabaseKey)

export const supabase = supabaseEnabled ? createClient(supabaseUrl!, supabaseKey!) : null

export interface LeaderboardEntry {
  id: string
  player_name: string
  score: number
  duration_ms: number
  created_at?: string
}

export async function fetchTopLeaderboard(limit = 5): Promise<LeaderboardEntry[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('leaderboard')
    .select('*')
    .order('score', { ascending: false })
    .order('duration_ms', { ascending: true })
    .limit(limit * 5)
  if (error) {
    console.error('Leaderboard fetch error:', error)
    return []
  }
  // Keep only the highest score per player (defensive: legacy rows may have
  // duplicates from before the upsert-by-name change).
  const seen = new Map<string, LeaderboardEntry>()
  for (const row of data ?? []) {
    const existing = seen.get(row.player_name)
    if (!existing || row.score > existing.score) seen.set(row.player_name, row)
  }
  return [...seen.values()]
    .sort((a, b) => b.score - a.score || a.duration_ms - b.duration_ms)
    .slice(0, limit)
}

export async function submitScore(
  playerName: string,
  score: number,
  durationMs: number,
): Promise<boolean> {
  if (!supabase) return false
  // One row per player, overwritten each round. The table is intentionally
  // insert-only for anon (see fix_leaderboard_grants.sql), so the upsert
  // lives in a SECURITY DEFINER RPC instead of a direct .upsert().
  const { error } = await supabase.rpc('submit_score', {
    p_player_name: playerName,
    p_score: score,
    p_duration_ms: durationMs,
  })
  if (error) {
    console.error('Leaderboard submit error:', error)
    return false
  }
  return true
}
