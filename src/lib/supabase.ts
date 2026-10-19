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
    .limit(limit)
  if (error) {
    console.error('Leaderboard fetch error:', error)
    return []
  }
  return data ?? []
}

export async function submitScore(
  playerName: string,
  score: number,
  durationMs: number,
): Promise<boolean> {
  if (!supabase) return false
  const { error } = await supabase.from('leaderboard').insert({
    player_name: playerName,
    score,
    duration_ms: durationMs,
  })
  if (error) {
    console.error('Leaderboard submit error:', error)
    return false
  }
  return true
}
