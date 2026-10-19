import { useEffect, useState } from 'react'
import { fetchTopLeaderboard, type LeaderboardEntry } from '../lib/supabase'

function formatDuration(ms: number): string {
  const totalSec = Math.round(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return `${min}:${sec.toString().padStart(2, '0')}`
}

export function LeaderboardWidget() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])

  useEffect(() => {
    let mounted = true
    const load = async () => {
      const data = await fetchTopLeaderboard(5)
      if (mounted) setEntries(data)
    }
    load()
    const interval = window.setInterval(load, 15000)
    return () => {
      mounted = false
      window.clearInterval(interval)
    }
  }, [])

  if (entries.length === 0) return null

  return (
    <div data-ui className="fixed top-3 right-3 z-30 w-56 rounded-xl bg-black/55 p-3 text-white backdrop-blur-sm">
      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide">
        🏆 Leaderboard
      </div>
      <ol className="mt-2 space-y-1">
        {entries.map((e, i) => (
          <li key={e.id} className="flex items-center justify-between text-xs">
            <span className="truncate pr-1">
              <span className="mr-1 font-bold text-amber-300">{i + 1}.</span>
              {e.player_name}
            </span>
            <span className="shrink-0 tabular-nums">
              <b>{e.score}</b>
              <span className="ml-1 text-gray-300">{formatDuration(e.duration_ms)}</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}

export { formatDuration }
