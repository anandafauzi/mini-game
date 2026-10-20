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
  quizQuestion: Question | null
  lastPoints: number
  lastQuizCorrect: boolean
  quizStartedAt: number
  totalPlayTimeMs: number
  gameStartedAt: number
  reelAttemptsLeft: number
  fishCaughtCount: number

  setPlayerName: (name: string) => void
  setQuestions: (questions: Question[]) => void
  startGame: () => void
  onFishCaught: (fish: FishSpecies, info: CatchInfo) => void
  proceedToQuiz: (question: Question | null) => void
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
  quizQuestion: null,
  lastPoints: 0,
  lastQuizCorrect: false,
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
      quizQuestion: null,
      lastPoints: 0,
      lastQuizCorrect: false,
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

  proceedToQuiz: (question) =>
    set({
      phase: 'quiz',
      quizQuestion: question,
      quizStartedAt: Date.now(),
    }),

  returnToFishing: () =>
    set((s) => ({
      phase: 'fishing',
      caughtFish: null,
      caughtFishInfo: null,
      quizQuestion: null,
      reelAttemptsLeft: MAX_REEL_ATTEMPTS,
      gameStartedAt: s.gameStartedAt || Date.now(),
    })),

  onFishEscaped: () =>
    set({
      caughtFish: null,
      caughtFishInfo: null,
      quizQuestion: null,
      reelAttemptsLeft: MAX_REEL_ATTEMPTS,
      phase: 'fishing',
    }),

  consumeReelAttempt: () => set({ reelAttemptsLeft: Math.max(0, get().reelAttemptsLeft - 1) }),

  answerQuiz: (choice) => {
    const { quizQuestion, quizStartedAt, score, results } = get()
    if (!quizQuestion) {
      set({ phase: 'fishing', quizQuestion: null })
      return
    }
    const timeMs = Date.now() - quizStartedAt
    const correct = choice === quizQuestion.correct
    const points = correct ? quizQuestion.value + speedBonus(timeMs) : 0

    results.push({
      questionId: quizQuestion.id,
      caught: true,
      correct,
      points,
      timeMs,
      fishName: null,
      fishBonus: 0,
    })

    set({
      results: [...results],
      score: score + points,
      lastPoints: points,
      lastQuizCorrect: correct,
      quizQuestion: null,
      phase: 'fishing',
      caughtFish: null,
      caughtFishInfo: null,
      reelAttemptsLeft: MAX_REEL_ATTEMPTS,
    })
  },

  finishGame: () => set({ phase: 'result' }),

  backToMenu: () => set({ phase: 'menu' }),
}))
