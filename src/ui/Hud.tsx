import { useGame } from '../lib/gameState'
import { useFishingAction } from '../lib/useFishingAction'

export function Hud() {
  const phase = useGame((s) => s.phase)
  const questions = useGame((s) => s.questions)
  const questionIndex = useGame((s) => s.questionIndex)
  const score = useGame((s) => s.score)
  const playerName = useGame((s) => s.playerName)
  const attempts = useGame((s) => s.reelAttemptsLeft)

  if (phase !== 'fishing') return null

  return (
    <div data-ui className="fixed top-3 left-3 z-30 rounded-xl bg-black/55 px-4 py-2 text-white backdrop-blur-sm">
      <div className="text-sm font-bold">🎣 {playerName}</div>
      <div className="mt-0.5 flex gap-3 text-xs">
        <span>
          Soal: {Math.min(questionIndex + 1, questions.length)}/{questions.length}
        </span>
        <span className="font-bold text-amber-300">Skor: {score}</span>
      </div>
      <div className="mt-1 flex items-center gap-1 text-xs">
        <span className="text-gray-300">Kesempatan:</span>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={`inline-block h-2.5 w-2.5 rounded-full ${
              i < attempts ? 'bg-emerald-400' : 'bg-gray-600'
            }`}
          />
        ))}
      </div>
    </div>
  )
}

export function FishingControls() {
  const phase = useGame((s) => s.phase)
  const { state, trigger } = useFishingAction()

  if (phase !== 'fishing') return null

  const isBite = state === 'bite'
  const label =
    state === 'idle'
      ? '🎣 Lempar Kail'
      : state === 'bite'
        ? '❗ TARIK SEKARANG!'
        : state === 'reeling'
          ? '⬇️ Tarik di Zona Hijau'
          : state === 'casting' || state === 'waiting' || state === 'approaching'
            ? 'Menunggu ikan...'
            : '...'

  const disabled = state !== 'idle' && state !== 'bite' && state !== 'reeling'

  return (
    <div data-ui className="fixed bottom-6 left-1/2 z-30 flex -translate-x-1/2 flex-col items-center gap-2">
      {isBite && (
        <div className="animate-pulse rounded-full bg-amber-500 px-4 py-1 text-sm font-bold text-white shadow-lg">
          Ikan makan umpan! Tarik!
        </div>
      )}
      <button
        onClick={trigger}
        disabled={disabled}
        className={`min-w-[220px] rounded-full px-8 py-4 text-lg font-bold text-white shadow-xl transition active:scale-95
          ${isBite ? 'animate-bounce bg-red-500 hover:bg-red-600' : ''}
          ${state === 'reeling' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
          ${state === 'idle' ? 'bg-blue-600 hover:bg-blue-700' : ''}
          ${disabled ? 'cursor-not-allowed bg-gray-500 opacity-60' : ''}
        `}
      >
        {label}
      </button>
      <p className="rounded-full bg-black/45 px-3 py-1 text-xs text-white/80">
        Geser layar untuk melihat sekitar · Spasi untuk aksi
      </p>
    </div>
  )
}
