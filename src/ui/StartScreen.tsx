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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-b from-sky-300 via-sky-100 to-emerald-200">
      <div className="absolute inset-0 opacity-45">
        <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id="valleySky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7db9e8" />
              <stop offset="55%" stopColor="#c5e2ef" />
              <stop offset="100%" stopColor="#eaf3e4" />
            </linearGradient>
            <linearGradient id="riverBand" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#79a8ac" />
              <stop offset="100%" stopColor="#3d737b" />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="100" height="100" fill="url(#valleySky)" />
          <circle cx="76" cy="20" r="9" fill="#fef9c3" opacity="0.9" />
          <circle cx="76" cy="20" r="15" fill="#fef08a" opacity="0.25" />
          <path d="M0,52 L14,38 L26,48 L38,34 L52,50 L66,36 L80,48 L92,40 L100,50 L100,62 L0,62 Z" fill="#8fb0b4" opacity="0.75" />
          <path d="M0,58 L12,50 L24,57 L40,46 L56,58 L72,48 L86,57 L100,52 L100,72 L0,72 Z" fill="#6d9160" opacity="0.8" />
          <rect x="0" y="62" width="100" height="38" fill="#88a86b" />
          <rect x="8" y="68" width="26" height="8" fill="#a8c477" opacity="0.6" />
          <rect x="66" y="73" width="28" height="9" fill="#9dbb6d" opacity="0.55" />
          <path
            d="M43,62 C45,72 39,80 46,92 C49,97 48,100 48,100 L62,100 C60,95 58,90 62,80 C66,70 57,66 57,62 Z"
            fill="url(#riverBand)"
            opacity="0.85"
          />
        </svg>
      </div>

      <div data-ui className="relative w-full max-w-md mx-4 rounded-2xl bg-white/95 p-8 shadow-2xl backdrop-blur">
        <div className="text-center">
          <div className="text-5xl mb-2">🎣</div>
          <h1 className="text-3xl font-black text-sky-800">Mancing Mania</h1>
          <p className="mt-2 text-sm text-gray-600">
            Mancing di sungai Nusantara, jawab kuis, raih skor tertinggi!
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
          <p><b>Cara main:</b> Gerak dengan joystick (kiri) / WASD, geser layar atau gerakkan mouse untuk melihat. Tekan <b>CAST</b> untuk melempar, <b>HOOK</b> saat ikan menyambar, lalu <b>REEL</b> di zona hijau untuk ikan besar. Buka <b>Tas</b> untuk ganti umpan & upgrade alat, dan <b>Ensiklopedia</b> (📖) untuk melihat koleksi ikan sungai. ESC = jeda.</p>
        </div>
      </div>
    </div>
  )
}
