import { create } from 'zustand'
import type { FishSpecies } from './fish'
import type { Question } from './questions'
import { identityKey } from './identity'

export type Phase = 'identity' | 'menu' | 'fishing' | 'catch' | 'quiz' | 'result'

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
  playerProdi: string
  identityKey: string
  sessionId: string
  questions: Question[]
  questionIndex: number
  score: number
  correctCount: number
  wrongCount: number
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
  /** Ids of questions already asked this session (never repeated). */
  usedQuestionIds: number[]
  hasFinishedSession: boolean

  setIdentity: (fullName: string, prodi: string) => void
  changeIdentity: () => void
  setPlayerName: (name: string) => void
  setQuestions: (questions: Question[]) => void
  startGame: () => void
  onFishCaught: (fish: FishSpecies, info: CatchInfo) => void
  proceedToQuiz: (question: Question | null) => void
  nextQuizQuestion: () => Question | null
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

function makeSessionId(): string {
  try {
    const buf = new Uint8Array(8)
    crypto.getRandomValues(buf)
    return Array.from(buf).map((b) => b.toString(16).padStart(2, '0')).join('')
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  }
}

export const useGame = create<GameState>((set, get) => ({
  phase: 'identity',
  playerName: '',
  playerProdi: '',
  identityKey: '',
  sessionId: makeSessionId(),
  questions: [],
  questionIndex: 0,
  score: 0,
  correctCount: 0,
  wrongCount: 0,
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
  usedQuestionIds: [],
  hasFinishedSession: false,

  setIdentity: (fullName, prodi) => {
    const name = fullName.replace(/\s+/g, ' ').trim()
    const prodiNorm = prodi.replace(/\s+/g, ' ').trim()
    if (name.length < 2 || prodiNorm.length < 2) return
    set({ playerName: name, playerProdi: prodiNorm, identityKey: identityKey(name, prodiNorm), phase: 'menu' })
  },
  changeIdentity: () => {
    set({
      phase: 'identity',
      playerName: '',
      playerProdi: '',
      identityKey: '',
      sessionId: makeSessionId(),
      score: 0,
      correctCount: 0,
      wrongCount: 0,
      results: [],
      questionIndex: 0,
      usedQuestionIds: [],
      hasFinishedSession: false,
      quizQuestion: null,
      caughtFish: null,
      caughtFishInfo: null,
      totalPlayTimeMs: 0,
    })
  },
  setPlayerName: (name) => set({ playerName: name.replace(/\s+/g, ' ').trim() }),
  // Drop duplicate questions on load (same id or same wording) so a question
  // can never appear twice in a session even if the spreadsheet has repeats.
  setQuestions: (questions) => {
    const seenIds = new Set<number>()
    const seenText = new Set<string>()
    const deduped: Question[] = []
    for (const q of questions) {
      const key = q.text.trim().toLowerCase().replace(/\s+/g, ' ')
      if (seenIds.has(q.id) || seenText.has(key)) continue
      seenIds.add(q.id)
      seenText.add(key)
      deduped.push(q)
    }
    set({ questions: deduped })
  },

  startGame: () => {
    const s = get()
    if (!s.playerName || !s.playerProdi) {
      set({ phase: 'identity' })
      return
    }
    set({
      phase: 'fishing',
      sessionId: makeSessionId(),
      questionIndex: 0,
      score: 0,
      correctCount: 0,
      wrongCount: 0,
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
      usedQuestionIds: [],
      hasFinishedSession: false,
    })
  },

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

  /**
   * Pick a random question that has not been asked yet this session.
   * Returns null once every question has been answered (so the round can end
   * instead of repeating questions).
   */
  nextQuizQuestion: () => {
    const { questions, usedQuestionIds } = get()
    if (questions.length === 0) return null
    const used = new Set(usedQuestionIds)
    const remaining = questions.filter((q) => !used.has(q.id))
    if (remaining.length === 0) return null
    return remaining[Math.floor(Math.random() * remaining.length)]
  },

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
    const { quizQuestion, quizStartedAt, score, results, usedQuestionIds } = get()
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

    const updatedCorrect = correct ? get().correctCount + 1 : get().correctCount
    const updatedWrong = !correct ? get().wrongCount + 1 : get().wrongCount
    const updatedScore = score + points

    set({
      results: [...results],
      score: updatedScore,
      correctCount: updatedCorrect,
      wrongCount: updatedWrong,
      lastPoints: points,
      lastQuizCorrect: correct,
      quizQuestion: null,
      phase: 'fishing',
      caughtFish: null,
      caughtFishInfo: null,
      reelAttemptsLeft: MAX_REEL_ATTEMPTS,
      usedQuestionIds: usedQuestionIds.includes(quizQuestion.id)
        ? usedQuestionIds
        : [...usedQuestionIds, quizQuestion.id],
    })
  },

  finishGame: () => {
    const { gameStartedAt, totalPlayTimeMs } = get()
    const elapsed = totalPlayTimeMs || (gameStartedAt ? Date.now() - gameStartedAt : 0)
    set({ phase: 'result', totalPlayTimeMs: elapsed, hasFinishedSession: true })
  },

  backToMenu: () => {
    const { playerName, playerProdi } = get()
    if (!playerName || !playerProdi) {
      set({ phase: 'identity' })
      return
    }
    set({ phase: 'menu', sessionId: makeSessionId() })
  },
}))
