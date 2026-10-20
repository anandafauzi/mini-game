import { useState } from 'react'
import { setMuted, setVolume } from '../lib/audio'

export function PauseScreen({
  onResume,
  onQuit,
}: {
  onResume: () => void
  onQuit: () => void
}) {
  const [vol, setVol] = useState(0.35)
  const [muted, setMutedState] = useState(false)

  const handleVol = (v: number) => {
    setVol(v)
    setVolume(v)
    if (muted && v > 0) {
      setMutedState(false)
      setMuted(false)
    }
  }

  const toggleMute = () => {
    const next = !muted
    setMutedState(next)
    setMuted(next)
  }

  return (
    <div data-ui className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-xs rounded-2xl border border-white/15 bg-slate-900/90 p-6 text-center text-white shadow-2xl">
        <div className="text-4xl">⏸️</div>
        <h2 className="mt-2 text-xl font-black">Jeda</h2>
        <p className="mt-1 text-xs text-white/60">Permainan dihentikan sementara</p>

        <div className="mt-5 flex items-center gap-3">
          <button onClick={toggleMute} className="text-lg">
            {muted ? '🔇' : '🔊'}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={vol}
            onChange={(e) => handleVol(Number(e.target.value))}
            className="flex-1 accent-emerald-500"
          />
        </div>

        <button
          onClick={onResume}
          className="mt-5 w-full rounded-xl bg-emerald-600 py-3 font-bold transition hover:bg-emerald-700 active:scale-95"
        >
          Lanjut Mancing
        </button>
        <button
          onClick={onQuit}
          className="mt-2 w-full rounded-xl bg-white/10 py-3 text-sm font-bold transition hover:bg-white/20 active:scale-95"
        >
          Keluar ke Menu
        </button>
      </div>
    </div>
  )
}
