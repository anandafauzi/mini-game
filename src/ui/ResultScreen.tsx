import { useEffect, useState } from 'react'
import { useGame } from '../lib/gameState'
import { submitQuizResult, sheetScoreEnabled } from '../lib/sheetScore'

export function ResultScreen() {
  const phase = useGame((s) => s.phase)
  const playerName = useGame((s) => s.playerName)
  const playerProdi = useGame((s) => s.playerProdi)
  const correctCount = useGame((s) => s.correctCount)
  const wrongCount = useGame((s) => s.wrongCount)
  const totalPlayTimeMs = useGame((s) => s.totalPlayTimeMs)
  const results = useGame((s) => s.results)
  const sessionId = useGame((s) => s.sessionId)
  const startGame = useGame((s) => s.startGame)
  const backToMenu = useGame((s) => s.backToMenu)

  const [submitted, setSubmitted] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle')
  const [submitMsg, setSubmitMsg] = useState('')

  const totalQuestions = results.length > 0 ? results.length : 10
  const correct = correctCount || results.filter((r) => r.correct).length
  const wrong = wrongCount || (totalQuestions - correct)
  const finalScore = Math.round((correct / Math.max(1, totalQuestions)) * 100)

  useEffect(() => {
    if (phase !== 'result') {
      setSubmitted(false)
      setSubmitStatus('idle')
      setSubmitMsg('')
      return
    }
    if (submitted || !sheetScoreEnabled) return
    setSubmitted(true)
    setSubmitStatus('sending')

    submitQuizResult({
      fullName: playerName,
      prodi: playerProdi,
      sessionId,
      answers: results.map((r) => ({ questionId: r.questionId, choice: null })),
      durationMs: totalPlayTimeMs,
    })
      .then((res) => {
        if (res.ok) {
          setSubmitStatus('ok')
          setSubmitMsg('Hasil tersimpan')
        } else {
          setSubmitStatus('error')
          setSubmitMsg(res.error || 'Gagal menyimpan')
        }
      })
      .catch(() => {
        setSubmitStatus('error')
        setSubmitMsg('Kesalahan jaringan')
      })
  }, [phase, submitted, sheetScoreEnabled, playerName, playerProdi, sessionId, results, totalPlayTimeMs])

  if (phase !== 'result') return null

  return (
    <div data-ui className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="text-center text-2xl font-black text-emerald-800">Hasil Kuis</h2>
        <p className="mt-1 text-center text-sm text-gray-500">{playerName}</p>
        <p className="text-center text-xs text-gray-400">{playerProdi}</p>

        <div className="mt-4 rounded-xl bg-emerald-50 p-4 text-center">
          <div className="text-4xl font-black text-emerald-600">{finalScore}</div>
          <div className="text-sm text-gray-500">Nilai Akhir (0–100)</div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
          <div className="rounded-lg bg-green-50 p-2">
            <div className="font-bold text-green-700">{correct}</div>
            <div className="text-xs text-gray-500">Benar</div>
          </div>
          <div className="rounded-lg bg-red-50 p-2">
            <div className="font-bold text-red-700">{wrong}</div>
            <div className="text-xs text-gray-500">Salah</div>
          </div>
          <div className="rounded-lg bg-blue-50 p-2">
            <div className="font-bold text-blue-700">{totalQuestions}</div>
            <div className="text-xs text-gray-500">Total Soal</div>
          </div>
        </div>

        <div className="mt-2 text-center text-xs text-gray-500">
          Skor disimpan{sheetScoreEnabled ? '' : ' (offline)'}
          {submitStatus === 'sending' && ' · menyimpan...'}
          {submitStatus === 'ok' && ` · ${submitMsg}`}
          {submitStatus === 'error' && ` · ${submitMsg}`}
        </div>

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
