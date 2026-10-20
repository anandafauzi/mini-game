import { create } from 'zustand'
import type { TimeOfDay } from './fish'

/** A full in-game day lasts this many real seconds. */
const DAY_LENGTH_SEC = 300

export interface TimeState {
  /** 0..24 game clock hours. */
  clock: number
  period: TimeOfDay
  paused: boolean
  speed: number
  tick: (deltaSec: number) => void
  setPaused: (p: boolean) => void
}

function periodFor(clock: number): TimeOfDay {
  if (clock >= 5 && clock < 11) return 'pagi'
  if (clock >= 11 && clock < 15) return 'siang'
  if (clock >= 15 && clock < 18.5) return 'sore'
  return 'malam'
}

export function formatClock(clock: number): string {
  const h = Math.floor(clock) % 24
  const m = Math.floor((clock - Math.floor(clock)) * 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** Sun elevation factor 0 (night) .. 1 (noon). */
export function sunHeight(clock: number): number {
  const t = (clock - 6) / 12 // 0 at 06:00, 1 at 18:00
  return Math.max(0, Math.sin(Math.PI * Math.min(1, Math.max(0, t))))
}

export const useTime = create<TimeState>((set) => ({
  clock: 6.5,
  period: 'pagi',
  paused: false,
  speed: 1,

  tick: (deltaSec) =>
    set((s) => {
      if (s.paused) return s
      const clock = (s.clock + (deltaSec / DAY_LENGTH_SEC) * 24 * s.speed) % 24
      return { clock, period: periodFor(clock) }
    }),

  setPaused: (paused) => set({ paused }),
}))
