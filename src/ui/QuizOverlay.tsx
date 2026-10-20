import { useEffect, useState } from 'react'
import { QUESTION_TIME_LIMIT, useGame } from '../lib/gameState'
import { RARITY_COLOR, RARITY_LABEL } from '../lib/fish'

export function QuizOverlay() {
  const phase = useGame((s) => s.phase)
  const caughtFish = useGame((s) => s.caughtFish)
  const caughtFishInfo = useGame((s) => s.caughtFishInfo)
  const questions = useGame((s) => s.questions)
  const questionIndex = useGame((s) => s.questionIndex)
  const answerQuiz = useGame((s) => s.answerQuiz)
  const proceedToQuiz = useGame((s) => s.proceedToQuiz)
  const lastPoints = useGame((s) => s.lastPoints)
  const results = useGame((s) => s.results)

  const [showCatch, setShowCatch] = useState(false)
  const [selected, setSelected] = useState<'a' | 'b' | 'c' | 'd' | null>(null)
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME_LIMIT)

  const question = questions[questionIndex]

  useEffect(() => {
    if (phase === 'catch' && caughtFish) {
      setShowCatch(true)
      setSelected(null)
      const t = window.setTimeout(() => {
        setShowCatch(false)
        proceedToQuiz()
      }, 2600)
      return () => window.clearTimeout(t)
    }
    if (phase === 'quiz') {
      setSelected(null)
      setTimeLeft(QUESTION_TIME_LIMIT)
    }
  }, [phase, caughtFish, proceedToQuiz])

  useEffect(() => {
    if (phase !== 'quiz' || selected) return
    const interval = window.setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 100) {
          window.clearInterval(interval)
          answerQuiz(null)
          return 0
        }
        return t - 100
      })
    }, 100)
    return () => window.clearInterval(interval)
  }, [phase, selected, answerQuiz])

  useEffect(() => {
    if (phase === 'quiz' && selected) {
      const t = window.setTimeout(() => answerQuiz(selected), 1400)
      return () => window.clearTimeout(t)
    }
  }, [phase, selected, answerQuiz])

  const lastResult = results[results.length - 1]

  if (phase === 'catch' && caughtFish && showCatch) {
    return (
      <div data-ui className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none">
        <div className="animate-bounce rounded-2xl bg-black/70 px-10 py-8 text-center text-white">
          <div className="text-6xl">🐟</div>
          <div className="mt-2 text-2xl font-black">{caughtFish.name}!</div>
          <div
            className="mt-1 inline-block rounded-full px-3 py-0.5 text-sm font-bold"
            style={{ backgroundColor: RARITY_COLOR[caughtFish.rarity] }}
          >
            {RARITY_LABEL[caughtFish.rarity]} +{caughtFishInfo?.bonus ?? caughtFish.bonus} poin
          </div>
          <div className="mt-2 text-xs font-semibold">
            {caughtFishInfo?.inGreen ? (
              <span className="text-emerald-300">Tepat di zona hijau! Ikan besar 🎣</span>
            ) : (
              <span className="text-sky-200">Dapat ikan! Tarik pas zona hijau untuk ikan lebih besar</span>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'quiz' && question) {
    const pct = (timeLeft / QUESTION_TIME_LIMIT) * 100
    return (
      <div data-ui className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>Soal {questionIndex + 1} / {questions.length}</span>
            <span>+{question.value} poin</span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full transition-all duration-100"
              style={{ width: `${pct}%`, backgroundColor: pct > 30 ? '#22c55e' : '#ef4444' }}
            />
          </div>

          <p className="mt-4 text-lg font-semibold text-gray-900">{question.text}</p>

          <div className="mt-4 grid gap-2">
            {(['a', 'b', 'c', 'd'] as const).map((key) => {
              const isCorrect = selected && question.correct === key
              const isWrongSelected = selected === key && question.correct !== key
              return (
                <button
                  key={key}
                  onClick={() => !selected && setSelected(key)}
                  disabled={!!selected}
                  className={`rounded-lg border-2 px-4 py-3 text-left font-medium transition
                    ${isCorrect ? 'border-green-500 bg-green-100 text-green-800' : ''}
                    ${isWrongSelected ? 'border-red-500 bg-red-100 text-red-800' : ''}
                    ${!selected && !isCorrect && !isWrongSelected ? 'border-gray-200 hover:border-emerald-400 hover:bg-emerald-50' : ''}
                    ${selected && !isCorrect && !isWrongSelected ? 'border-gray-200 opacity-50' : ''}
                  `}
                >
                  <span className="mr-2 font-bold uppercase">{key}.</span>
                  {question.options[key]}
                </button>
              )
            })}
          </div>

          {selected && lastResult && (
            <p className={`mt-3 text-center font-bold ${lastResult.correct ? 'text-green-600' : 'text-red-500'}`}>
              {lastResult.correct
                ? `Benar! +${lastPoints} poin!`
                : 'Salah! Tidak dapat poin.'}
            </p>
          )}
        </div>
      </div>
    )
  }

  return null
}
