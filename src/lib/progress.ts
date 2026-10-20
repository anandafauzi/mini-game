import { create } from 'zustand'
import type { BaitId, FishSpecies } from './fish'
import { RARITY_XP } from './fish'

export interface CatchRecord {
  id: string
  speciesId: string
  name: string
  rarity: FishSpecies['rarity']
  weight: number
  lengthCm: number
  value: number
  caughtAt: number
}

export interface Equipment {
  rodLevel: number
  lineLevel: number
  reelLevel: number
}

export interface ProgressState {
  xp: number
  money: number
  level: number
  collection: CatchRecord[]
  totalCaught: number
  bestWeight: number
  bestWeightName: string | null
  currentBait: BaitId
  baits: Record<BaitId, number>
  equipment: Equipment

  addCatch: (rec: CatchRecord) => void
  sellCatch: (id: string) => void
  saveCatch: () => void
  setBait: (bait: BaitId) => void
  consumeBait: () => void
  upgrade: (part: keyof Equipment, cost: number) => boolean
  reset: () => void
}

const STORAGE_KEY = 'laut-nusantara-progress-v1'

/** XP needed to reach the next level from the given level. */
export function xpForLevel(level: number): number {
  return 100 + (level - 1) * 60
}

function defaultBaits(): Record<BaitId, number> {
  return { cacing: 30, pelet: 20, lumut: 15, daun: 15, artifisial: 10 }
}

function initialState() {
  return {
    xp: 0,
    money: 0,
    level: 1,
    collection: [] as CatchRecord[],
    totalCaught: 0,
    bestWeight: 0,
    bestWeightName: null as string | null,
    currentBait: 'cacing' as BaitId,
    baits: defaultBaits(),
    equipment: { rodLevel: 1, lineLevel: 1, reelLevel: 1 } as Equipment,
  }
}

function loadPersisted(): Partial<ProgressState> {
  if (typeof localStorage === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    const base = initialState()
    return {
      ...base,
      ...parsed,
      baits: { ...base.baits, ...(parsed.baits ?? {}) },
      equipment: { ...base.equipment, ...(parsed.equipment ?? {}) },
      collection: Array.isArray(parsed.collection) ? parsed.collection : [],
    }
  } catch {
    return {}
  }
}

function persist(state: ProgressState) {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        xp: state.xp,
        money: state.money,
        level: state.level,
        collection: state.collection,
        totalCaught: state.totalCaught,
        bestWeight: state.bestWeight,
        bestWeightName: state.bestWeightName,
        currentBait: state.currentBait,
        baits: state.baits,
        equipment: state.equipment,
      }),
    )
  } catch {
    /* storage full or unavailable - ignore */
  }
}

export const useProgress = create<ProgressState>((set, get) => ({
  ...initialState(),
  ...loadPersisted(),

  addCatch: (rec) => {
    const s = get()
    const gainedXp = RARITY_XP[rec.rarity]
    let xp = s.xp + gainedXp
    let level = s.level
    while (xp >= xpForLevel(level)) {
      xp -= xpForLevel(level)
      level += 1
    }
    set({
      ...s,
      xp,
      level,
      collection: [rec, ...s.collection],
      totalCaught: s.totalCaught + 1,
      bestWeight: rec.weight > s.bestWeight ? rec.weight : s.bestWeight,
      bestWeightName: rec.weight > s.bestWeight ? rec.name : s.bestWeightName,
    })
    persist(get())
  },

  sellCatch: (id) => {
    const s = get()
    const rec = s.collection.find((c) => c.id === id)
    if (!rec) return
    set({
      ...s,
      money: s.money + rec.value,
      collection: s.collection.filter((c) => c.id !== id),
    })
    persist(get())
  },

  saveCatch: () => persist(get()),

  setBait: (bait) => {
    const s = get()
    if (s.baits[bait] <= 0) return
    set({ ...s, currentBait: bait })
    persist(get())
  },

  consumeBait: () => {
    const s = get()
    const left = s.baits[s.currentBait]
    if (left <= 0) return
    set({ ...s, baits: { ...s.baits, [s.currentBait]: left - 1 } })
    persist(get())
  },

  upgrade: (part, cost) => {
    const s = get()
    if (s.money < cost) return false
    const equipment = { ...s.equipment, [part]: s.equipment[part] + 1 }
    set({ ...s, equipment, money: s.money - cost })
    persist(get())
    return true
  },

  reset: () => {
    set(initialState())
    persist(get())
  },
}))
