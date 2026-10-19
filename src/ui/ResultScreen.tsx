import { useEffect, useState } from 'react'
import { useGame } from '../lib/gameState'
import { fetchTopLeaderboard, submitScore, supabaseEnabled, type LeaderboardEntry } from '../lib/supabase'
import { formatDuration } from './Leaderboard'

export function ResultScreen() {
  const phase = useGame((s) => s.phase)
  const playerName = useGame((s) => s.playerName)
  const score = useGame((s) => s.score)
  const totalPlayTimeMs = useGame((s) => s.totalPlayTimeMs)
  const results = useGame((s) => s.results)
  const backToMenu = useGame((s) => s.backToMenu)
  const startGame = useGame((s) => s.startGame)

  const [submitted, setSubmitted] = useState(false)
  const [top, setTop] = useState<LeaderboardEntry[]>([])

  const correctCount = results.filter((r) => r.correct).length
  const caughtCount = results.filter((r) => r.caught).length
  const escapedCount = results.length - caughtCount

  useEffect(() => {
    if (phase !== 'result' || submitted || !supabaseEnabled) return
    setSubmitted(true)
    submitScore(playerName, score, totalPlayTimeMs).then(() =>
      fetchTopLeaderboard(10).then(setTop),
    )
  }, [phase, submitted, playerName, score, totalPlayTimeMs])

  useEffect(() => {
    if (phase === 'result' && supabaseEnabled) {
      fetchTopLeaderboard(10).then(setTop)
    }
  }, [phase])

  if (phase !== 'result') return null

  return (
    <div data-ui className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="text-center text-2xl font-black text-emerald-800">Hasil Mancing!</h2>
        <p className="mt-1 text-center text-sm text-gray-500">{playerName}</p>

        <div className="mt-4 rounded-xl bg-emerald-50 p-4 text-center">
          <div className="text-4xl font-black text-emerald-600">{score}</div>
          <div className="text-sm text-gray-500">Total Skor</div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
          <div className="rounded-lg bg-green-50 p-2">
            <div className="font-bold text-green-700">{correctCount}</div>
            <div className="text-xs text-gray-500">Benar</div>
          </div>
          <div className="rounded-lg bg-amber-50 p-2">
            <div className="font-bold text-amber-700">{escapedCount}</div>
            <div className="text-xs text-gray-500">Ikan Lolos</div>
          </div>
          <div className="rounded-lg bg-blue-50 p-2">
            <div className="font-bold text-blue-700">{formatDuration(totalPlayTimeMs)}</div>
            <div className="text-xs text-gray-500">Waktu</div>
          </div>
        </div>

        {supabaseEnabled && top.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-bold text-gray-700">🏆 Top 10</h3>
            <ol className="mt-1 max-h-44 space-y-1 overflow-y-auto">
              {top.map((e, i) => (
                <li
                  key={e.id}
                  className={`flex justify-between rounded px-2 py-1 text-xs ${
                    e.player_name === playerName && e.score === score ? 'bg-amber-100 font-bold' : 'bg-gray-50'
                  }`}
                >
                  <span className="truncate">{i + 1}. {e.player_name}</span>
                  <span className="shrink-0 tabular-nums">{e.score} · {formatDuration(e.duration_ms)}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        <div className="mt-5 flex gap-2">
          <button
            onClick={startGame}
            className="flex-1 rounded-lg bg-emerald-600 py-3 font-bold text-white hover:bg-emerald-700"
          >
            Main Lagi
          </button>
          <button
            onClick={backToMenu}
            className="flex-1 rounded-lg border-2 border-gray-300 py-3 font-bold text-gray-600 hover:bg-gray-50"
          >
            Menu
          </button>
        </div>
      </div>
    </div>
  )
}
