import { create } from 'zustand'
import type { FishSpecies } from './fish'
import type { Question } from './questions'

export type Phase = 'menu' | 'fishing' | 'catch' | 'quiz' | 'result'

export interface QuizResult {
  questionId: number
  caught: boolean
  correct: boolean
  points: number
  timeMs: number
  fishName: string | null
  fishBonus: number
}

interface GameState {
  phase: Phase
  playerName: string
  questions: Question[]
  questionIndex: number
  score: number
  results: QuizResult[]
  caughtFish: FishSpecies | null
  lastPoints: number
  quizStartedAt: number
  totalPlayTimeMs: number
  gameStartedAt: number

  setPlayerName: (name: string) => void
  setQuestions: (questions: Question[]) => void
  startGame: () => void
  onFishCaught: (fish: FishSpecies) => void
  proceedToQuiz: () => void
  onFishEscaped: () => void
  answerQuiz: (choice: 'a' | 'b' | 'c' | 'd' | null) => void
  finishGame: () => void
  backToMenu: () => void
}

const QUESTION_TIME_LIMIT_MS = 30000
const SPEED_BONUS_MAX = 20

export function speedBonus(timeMs: number): number {
  if (timeMs >= QUESTION_TIME_LIMIT_MS) return 0
  return Math.round(SPEED_BONUS_MAX * (1 - timeMs / QUESTION_TIME_LIMIT_MS))
}

export const QUESTION_TIME_LIMIT = QUESTION_TIME_LIMIT_MS

export const useGame = create<GameState>((set, get) => ({
  phase: 'menu',
  playerName: '',
  questions: [],
  questionIndex: 0,
  score: 0,
  results: [],
  caughtFish: null,
  lastPoints: 0,
  quizStartedAt: 0,
  totalPlayTimeMs: 0,
  gameStartedAt: 0,

  setPlayerName: (name) => set({ playerName: name }),
  setQuestions: (questions) => set({ questions }),

  startGame: () =>
    set({
      phase: 'fishing',
      questionIndex: 0,
      score: 0,
      results: [],
      caughtFish: null,
      lastPoints: 0,
      gameStartedAt: Date.now(),
      totalPlayTimeMs: 0,
    }),

  onFishCaught: (fish) =>
    set({
      phase: 'catch',
      caughtFish: fish,
      quizStartedAt: 0,
    }),

  proceedToQuiz: () =>
    set({
      phase: 'quiz',
      quizStartedAt: Date.now(),
    }),

  onFishEscaped: () => {
    const { questions, questionIndex, results } = get()
    const q = questions[questionIndex]
    results.push({
      questionId: q.id,
      caught: false,
      correct: false,
      points: 0,
      timeMs: 0,
      fishName: null,
      fishBonus: 0,
    })
    const next = questionIndex + 1
    set({
      results: [...results],
      caughtFish: null,
      questionIndex: next,
      phase: next >= questions.length ? 'result' : 'fishing',
      totalPlayTimeMs: Date.now() - get().gameStartedAt,
    })
  },

  answerQuiz: (choice) => {
    const { questions, questionIndex, results, score, caughtFish, quizStartedAt } = get()
    const q = questions[questionIndex]
    const timeMs = Date.now() - quizStartedAt
    const correct = choice === q.correct
    const fishBonus = caughtFish?.bonus ?? 0
    const points = correct ? q.value + speedBonus(timeMs) + fishBonus : 0

    results.push({
      questionId: q.id,
      caught: true,
      correct,
      points,
      timeMs,
      fishName: caughtFish?.name ?? null,
      fishBonus,
    })

    const next = questionIndex + 1
    set({
      results: [...results],
      score: score + points,
      lastPoints: points,
      caughtFish: null,
      questionIndex: next,
      phase: next >= questions.length ? 'result' : 'fishing',
      totalPlayTimeMs: Date.now() - get().gameStartedAt,
    })
  },

  finishGame: () => set({ phase: 'result' }),

  backToMenu: () => set({ phase: 'menu' }),
}))
