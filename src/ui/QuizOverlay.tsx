import { useEffect, useState } from 'react'
import { QUESTION_TIME_LIMIT, useGame } from '../lib/gameState'

export function QuizOverlay() {
  const phase = useGame((s) => s.phase)
  const quizQuestion = useGame((s) => s.quizQuestion)
  const answerQuiz = useGame((s) => s.answerQuiz)

  const [selected, setSelected] = useState<'a' | 'b' | 'c' | 'd' | null>(null)
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME_LIMIT)

  useEffect(() => {
    if (phase === 'quiz') {
      setSelected(null)
      setTimeLeft(QUESTION_TIME_LIMIT)
    }
  }, [phase, quizQuestion])

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

  if (phase !== 'quiz' || !quizQuestion) return null

  const correct = quizQuestion.correct
  const isRight = selected === correct
  const pct = (timeLeft / QUESTION_TIME_LIMIT) * 100

  return (
    <div data-ui className="fixed inset-0 z-40 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>🧠 Kuis Bonus</span>
          <span>+{quizQuestion.value} skor</span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full rounded-full transition-all duration-100"
            style={{ width: `${pct}%`, backgroundColor: pct > 30 ? '#22c55e' : '#ef4444' }}
          />
        </div>

        <p className="mt-4 text-lg font-semibold text-gray-900">{quizQuestion.text}</p>

        <div className="mt-4 grid gap-2">
          {(['a', 'b', 'c', 'd'] as const).map((key) => {
            const isCorrect = selected && correct === key
            const isWrongSelected = selected === key && correct !== key
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
                {quizQuestion.options[key]}
              </button>
            )
          })}
        </div>

        {selected && (
          <p className={`mt-3 text-center font-bold ${isRight ? 'text-green-600' : 'text-red-500'}`}>
            {isRight ? `Benar! +${quizQuestion.value} skor!` : 'Salah! Tidak dapat skor.'}
          </p>
        )}

        {!selected && (
          <p className="mt-3 text-center text-xs text-gray-400">
            Jawab untuk menambah skor. Salah tidak masalah - ikan tetap dapat.
          </p>
        )}
      </div>
    </div>
  )
}
