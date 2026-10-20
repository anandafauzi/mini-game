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

export interface CatchInfo {
  inGreen: boolean
  sizeScale: number
  accuracy: number
}

export interface CaughtFishState {
  fish: FishSpecies
  sizeScale: number
  inGreen: boolean
  bonus: number
}

interface GameState {
  phase: Phase
  playerName: string
  questions: Question[]
  questionIndex: number
  score: number
  results: QuizResult[]
  caughtFish: FishSpecies | null
  caughtFishInfo: CaughtFishState | null
  lastPoints: number
  quizStartedAt: number
  totalPlayTimeMs: number
  gameStartedAt: number
  reelAttemptsLeft: number
  fishCaughtCount: number

  setPlayerName: (name: string) => void
  setQuestions: (questions: Question[]) => void
  startGame: () => void
  onFishCaught: (fish: FishSpecies, info: CatchInfo) => void
  proceedToQuiz: () => void
  returnToFishing: () => void
  onFishEscaped: () => void
  consumeReelAttempt: () => void
  answerQuiz: (choice: 'a' | 'b' | 'c' | 'd' | null) => void
  finishGame: () => void
  backToMenu: () => void
}

const QUESTION_TIME_LIMIT_MS = 120000
const SPEED_BONUS_MAX = 20

export function speedBonus(timeMs: number): number {
  if (timeMs >= QUESTION_TIME_LIMIT_MS) return 0
  return Math.round(SPEED_BONUS_MAX * (1 - timeMs / QUESTION_TIME_LIMIT_MS))
}

export const QUESTION_TIME_LIMIT = QUESTION_TIME_LIMIT_MS
export const MAX_REEL_ATTEMPTS = 3

export const useGame = create<GameState>((set, get) => ({
  phase: 'menu',
  playerName: '',
  questions: [],
  questionIndex: 0,
  score: 0,
  results: [],
  caughtFish: null,
  caughtFishInfo: null,
  lastPoints: 0,
  quizStartedAt: 0,
  totalPlayTimeMs: 0,
  gameStartedAt: 0,
  reelAttemptsLeft: MAX_REEL_ATTEMPTS,
  fishCaughtCount: 0,

  setPlayerName: (name) => set({ playerName: name }),
  setQuestions: (questions) => set({ questions }),

  startGame: () =>
    set({
      phase: 'fishing',
      questionIndex: 0,
      score: 0,
      results: [],
      caughtFish: null,
      caughtFishInfo: null,
      lastPoints: 0,
      gameStartedAt: Date.now(),
      totalPlayTimeMs: 0,
      reelAttemptsLeft: MAX_REEL_ATTEMPTS,
      fishCaughtCount: 0,
    }),

  onFishCaught: (fish, info) =>
    set((s) => ({
      phase: 'catch',
      caughtFish: fish,
      fishCaughtCount: s.fishCaughtCount + 1,
      caughtFishInfo: {
        fish,
        sizeScale: info.sizeScale,
        inGreen: info.inGreen,
        bonus: Math.round(fish.bonus * info.sizeScale),
      },
      quizStartedAt: 0,
    })),

  proceedToQuiz: () =>
    set({
      phase: 'quiz',
      quizStartedAt: Date.now(),
    }),

  returnToFishing: () =>
    set((s) => ({
      phase: 'fishing',
      caughtFish: null,
      caughtFishInfo: null,
      reelAttemptsLeft: MAX_REEL_ATTEMPTS,
      gameStartedAt: s.gameStartedAt || Date.now(),
    })),

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
      reelAttemptsLeft: MAX_REEL_ATTEMPTS,
      phase: next >= questions.length ? 'result' : 'fishing',
      totalPlayTimeMs: Date.now() - get().gameStartedAt,
    })
  },

  consumeReelAttempt: () => set({ reelAttemptsLeft: Math.max(0, get().reelAttemptsLeft - 1) }),

  answerQuiz: (choice) => {
    const { questions, questionIndex, results, score, caughtFishInfo, quizStartedAt } = get()
    const q = questions[questionIndex]
    const timeMs = Date.now() - quizStartedAt
    const correct = choice === q.correct
    const fishBonus = caughtFishInfo?.bonus ?? 0
    const points = correct ? q.value + speedBonus(timeMs) + fishBonus : 0

    results.push({
      questionId: q.id,
      caught: true,
      correct,
      points,
      timeMs,
      fishName: caughtFishInfo?.fish.name ?? null,
      fishBonus,
    })

    const next = questionIndex + 1
    set({
      results: [...results],
      score: score + points,
      lastPoints: points,
      caughtFish: null,
      caughtFishInfo: null,
      questionIndex: next,
      phase: next >= questions.length ? 'result' : 'fishing',
      totalPlayTimeMs: Date.now() - get().gameStartedAt,
    })
  },

  finishGame: () => set({ phase: 'result' }),

  backToMenu: () => set({ phase: 'menu' }),
}))
