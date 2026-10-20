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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-b from-sky-400 via-emerald-200 to-green-500">
      <div className="absolute inset-0 opacity-30">
        <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
          <polygon points="0,60 20,40 40,55 60,30 80,50 100,35 100,100 0,100" fill="#2d5a27" />
          <polygon points="0,75 25,60 50,70 75,55 100,65 100,100 0,100" fill="#1a3a16" />
        </svg>
      </div>

      <div data-ui className="relative w-full max-w-md mx-4 rounded-2xl bg-white/95 p-8 shadow-2xl backdrop-blur">
        <div className="text-center">
          <div className="text-5xl mb-2">🎣</div>
          <h1 className="text-3xl font-black text-emerald-800">Mancing Kuis Nusantara</h1>
          <p className="mt-2 text-sm text-gray-600">
            Mancing ikan, jawab kuis, raih skor tertinggi!
          </p>
        </div>

        <div className="mt-6">
          <label className="block text-sm font-semibold text-gray-700 mb-1">Nama Pemain</label>
          <input
            type="text"
            value={name}
            maxLength={24}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && canStart && handleStart()}
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
          <p><b>Cara main:</b> Klik / tap untuk melempar kail → saat ikan menyambar, klik lagi untuk mengait → tarik saat marker di zona hijau → jawab kuisnya!</p>
        </div>
      </div>
    </div>
  )
}
