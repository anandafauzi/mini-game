export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary'

export type BaitId = 'cacing' | 'pelet' | 'lumut' | 'daun' | 'artifisial'

export interface FishSpecies {
  id: string
  name: string
  rarity: Rarity
  color: string
  bellyColor: string
  /** Base visual size (world units) used for the 3D mesh. */
  size: number
  /** Minimum / maximum weight in kilograms. */
  minWeight: number
  maxWeight: number
  /** Sell value per kilogram (in Rupiah). */
  pricePerKg: number
  /** Base score bonus (legacy quiz integration). */
  bonus: number
  /** 0..1 - how hard the fish fights during reeling. */
  reelDifficulty: number
  /** Relative spawn chance weight (higher = more common). */
  spawnWeight: number
  /** Bait ids this species prefers (grants spawn bias). */
  preferredBaits: BaitId[]
  /** Time-of-day activity bias, 0..1 per period. */
  activity: { pagi: number; siang: number; sore: number; malam: number }
}

export const RARITY_LABEL: Record<Rarity, string> = {
  common: 'Umum',
  uncommon: 'Jarang',
  rare: 'Langka',
  legendary: 'Legendaris',
}

export const RARITY_COLOR: Record<Rarity, string> = {
  common: '#9ca3af',
  uncommon: '#3b82f6',
  rare: '#a855f7',
  legendary: '#f59e0b',
}

export const RARITY_XP: Record<Rarity, number> = {
  common: 10,
  uncommon: 25,
  rare: 60,
  legendary: 150,
}

export const FISH_SPECIES: FishSpecies[] = [
  {
    id: 'lele', name: 'Lele', rarity: 'common', color: '#3f3f46', bellyColor: '#a1a1aa',
    size: 0.5, minWeight: 0.3, maxWeight: 3, pricePerKg: 22000, bonus: 10, reelDifficulty: 0.25,
    spawnWeight: 26, preferredBaits: ['cacing', 'lumut'],
    activity: { pagi: 0.7, siang: 0.4, sore: 0.8, malam: 1.0 },
  },
  {
    id: 'nila', name: 'Ikan Nila', rarity: 'common', color: '#64748b', bellyColor: '#e2e8f0',
    size: 0.45, minWeight: 0.2, maxWeight: 1.5, pricePerKg: 28000, bonus: 10, reelDifficulty: 0.3,
    spawnWeight: 24, preferredBaits: ['pelet', 'cacing'],
    activity: { pagi: 0.9, siang: 0.8, sore: 0.7, malam: 0.3 },
  },
  {
    id: 'tawes', name: 'Ikan Tawes', rarity: 'common', color: '#78716c', bellyColor: '#fcd34d',
    size: 0.42, minWeight: 0.15, maxWeight: 1.2, pricePerKg: 30000, bonus: 10, reelDifficulty: 0.3,
    spawnWeight: 20, preferredBaits: ['daun', 'pelet'],
    activity: { pagi: 0.8, siang: 0.7, sore: 0.6, malam: 0.3 },
  },
  {
    id: 'mas', name: 'Ikan Mas', rarity: 'uncommon', color: '#f97316', bellyColor: '#fde68a',
    size: 0.55, minWeight: 0.5, maxWeight: 5, pricePerKg: 45000, bonus: 25, reelDifficulty: 0.45,
    spawnWeight: 14, preferredBaits: ['pelet', 'cacing'],
    activity: { pagi: 0.9, siang: 0.6, sore: 0.8, malam: 0.4 },
  },
  {
    id: 'patin', name: 'Ikan Patin', rarity: 'uncommon', color: '#475569', bellyColor: '#cbd5e1',
    size: 0.6, minWeight: 1, maxWeight: 12, pricePerKg: 38000, bonus: 25, reelDifficulty: 0.5,
    spawnWeight: 11, preferredBaits: ['pelet', 'lumut'],
    activity: { pagi: 0.6, siang: 0.5, sore: 0.7, malam: 0.8 },
  },
  {
    id: 'gabus', name: 'Ikan Gabus', rarity: 'uncommon', color: '#365314', bellyColor: '#a3e635',
    size: 0.55, minWeight: 0.4, maxWeight: 4, pricePerKg: 55000, bonus: 25, reelDifficulty: 0.55,
    spawnWeight: 10, preferredBaits: ['cacing', 'artifisial'],
    activity: { pagi: 0.8, siang: 0.4, sore: 0.9, malam: 0.7 },
  },
  {
    id: 'baung', name: 'Ikan Baung', rarity: 'rare', color: '#7c2d12', bellyColor: '#fdba74',
    size: 0.65, minWeight: 1, maxWeight: 8, pricePerKg: 65000, bonus: 50, reelDifficulty: 0.65,
    spawnWeight: 5, preferredBaits: ['cacing', 'lumut'],
    activity: { pagi: 0.5, siang: 0.3, sore: 0.6, malam: 1.0 },
  },
  {
    id: 'bawal', name: 'Bawal Air Tawar', rarity: 'rare', color: '#1e293b', bellyColor: '#94a3b8',
    size: 0.7, minWeight: 1.5, maxWeight: 10, pricePerKg: 72000, bonus: 50, reelDifficulty: 0.7,
    spawnWeight: 4, preferredBaits: ['artifisial', 'daun'],
    activity: { pagi: 0.7, siang: 0.5, sore: 0.6, malam: 0.5 },
  },
  {
    id: 'sturgeon', name: 'Patin Raksasa', rarity: 'legendary', color: '#1e3a5f', bellyColor: '#e0f2fe',
    size: 0.95, minWeight: 8, maxWeight: 60, pricePerKg: 120000, bonus: 100, reelDifficulty: 0.85,
    spawnWeight: 1.5, preferredBaits: ['lumut', 'artifisial'],
    activity: { pagi: 0.3, siang: 0.2, sore: 0.4, malam: 0.9 },
  },
]

export type TimeOfDay = 'pagi' | 'siang' | 'sore' | 'malam'

/**
 * Pick a species using weighted probability, biased by the active bait and time of day.
 */
export function pickRandomSpecies(bait: BaitId = 'cacing', time: TimeOfDay = 'pagi'): FishSpecies {
  const weights = FISH_SPECIES.map((sp) => {
    let w = sp.spawnWeight
    if (sp.preferredBaits.includes(bait)) w *= 2.2
    w *= 0.4 + 0.6 * sp.activity[time]
    return w
  })
  const total = weights.reduce((a, b) => a + b, 0)
  let roll = Math.random() * total
  for (let i = 0; i < FISH_SPECIES.length; i++) {
    roll -= weights[i]
    if (roll <= 0) return FISH_SPECIES[i]
  }
  return FISH_SPECIES[0]
}

/**
 * Roll weight for a species, then derive length (world scale) & sell value.
 * Returns a fresh catch record ready to store in the collection.
 */
export function rollCatch(species: FishSpecies) {
  // Bias toward smaller fish; occasional trophies.
  const r = Math.pow(Math.random(), 1.7)
  const weight = +(species.minWeight + r * (species.maxWeight - species.minWeight)).toFixed(2)
  const range = species.maxWeight - species.minWeight || 1
  const norm = (weight - species.minWeight) / range
  const lengthCm = Math.round(15 + species.size * 40 + norm * species.size * 55)
  const scale = 0.6 + norm * 0.9
  const value = Math.round(weight * species.pricePerKg)
  return { weight, lengthCm, scale, value }
}
