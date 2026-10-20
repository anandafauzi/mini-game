import { useState } from 'react'
import { useGame } from '../lib/gameState'
import { startAmbient } from '../lib/audio'

export function StartScreen() {
  const playerName = useGame((s) => s.playerName)
  const setPlayerName = useGame((s) => s.setPlayerName)
  const startGame = useGame((s) => s.startGame)
  const questions = useGame((s) => s.questions)
  const [name, setName] = useState(playerName)

  const canStart = name.trim().length >= 2 && questions.length > 0

  const handleStart = () => {
    startAmbient()
    setPlayerName(name.trim())
    startGame()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-b from-sky-300 via-sky-500 to-blue-800">
      <div className="absolute inset-0 opacity-40">
        <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id="deepSea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="55%" stopColor="#0369a1" />
              <stop offset="100%" stopColor="#082f49" />
            </linearGradient>
          </defs>
          <rect x="0" y="55" width="100" height="45" fill="url(#deepSea)" />
          <path d="M0,58 Q12,54 24,58 T48,58 T72,58 T96,58 L100,58 L100,68 L0,68 Z" fill="#7dd3fc" opacity="0.5" />
          <path d="M0,64 Q14,60 28,64 T56,64 T84,64 T100,64 L100,76 L0,76 Z" fill="#0ea5e9" opacity="0.45" />
          <path d="M0,72 Q16,68 32,72 T64,72 T96,72 L100,72 L100,86 L0,86 Z" fill="#075985" opacity="0.5" />
          <circle cx="78" cy="22" r="9" fill="#fef9c3" opacity="0.85" />
          <circle cx="78" cy="22" r="15" fill="#fef08a" opacity="0.25" />
        </svg>
      </div>

      <div data-ui className="relative w-full max-w-md mx-4 rounded-2xl bg-white/95 p-8 shadow-2xl backdrop-blur">
        <div className="text-center">
          <div className="text-5xl mb-2">🎣</div>
          <h1 className="text-3xl font-black text-sky-800">Mancing Kuis Nusantara</h1>
          <p className="mt-2 text-sm text-gray-600">
            Mancing di atas kapal, jawab kuis, raih skor tertinggi!
          </p>
        </div>

        <div className="mt-6">
          <label className="block text-sm font-semibold text-gray-700 mb-1">Nama Pemain</label>
          <input
            type="text"
            value={name}
            maxLength={24}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && canStart) {
                e.preventDefault()
                e.stopPropagation()
                handleStart()
              }
            }}
            placeholder="Masukkan namamu..."
            className="w-full rounded-lg border-2 border-emerald-300 px-4 py-3 text-lg outline-none focus:border-emerald-500"
            autoFocus
          />
        </div>

        <button
          onClick={handleStart}
          disabled={!canStart}
          className="mt-4 w-full rounded-lg bg-emerald-600 py-3 text-lg font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {questions.length > 0 ? `Mulai Mancing! (${questions.length} soal)` : 'Memuat soal...'}
        </button>

        <div className="mt-4 text-xs text-gray-500 leading-relaxed">
          <p><b>Cara main:</b> Gerak dengan joystick (kiri) / WASD, geser layar atau gerakkan mouse untuk melihat. Tekan <b>CAST</b> untuk melempar, <b>HOOK</b> saat ikan menyambar, lalu <b>REEL</b> di zona hijau untuk ikan besar. Buka <b>Tas</b> untuk ganti umpan & upgrade alat. ESC = jeda.</p>
        </div>
      </div>
    </div>
  )
}
