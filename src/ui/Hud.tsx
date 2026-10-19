import { useGame } from '../lib/gameState'

export function Hud() {
  const phase = useGame((s) => s.phase)
  const questions = useGame((s) => s.questions)
  const questionIndex = useGame((s) => s.questionIndex)
  const score = useGame((s) => s.score)
  const playerName = useGame((s) => s.playerName)

  if (phase !== 'fishing') return null

  return (
    <div data-ui className="fixed top-3 left-3 z-30 rounded-xl bg-black/55 px-4 py-2 text-white backdrop-blur-sm">
      <div className="text-sm font-bold">
        🎣 {playerName}
      </div>
      <div className="mt-0.5 flex gap-3 text-xs">
        <span>Soal: {Math.min(questionIndex + 1, questions.length)}/{questions.length}</span>
        <span className="font-bold text-amber-300">Skor: {score}</span>
      </div>
    </div>
  )
}

export function FishingHint() {
  const phase = useGame((s) => s.phase)

  if (phase !== 'fishing') return null

  return (
    <div data-ui className="fixed bottom-6 left-1/2 z-30 -translate-x-1/2 rounded-full bg-black/55 px-5 py-2 text-sm text-white backdrop-blur-sm">
      Klik / tap / spasi untuk melempar kail dan menarik ikan
    </div>
  )
}
