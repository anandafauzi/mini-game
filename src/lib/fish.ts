export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary'

export type BaitId = 'cacing' | 'pelet' | 'lumut' | 'daun' | 'artifisial'

/** Body silhouette archetype used by the 3D fish mesh. */
export type FishShape = 'torpedo' | 'round' | 'flat' | 'long' | 'ribbon'

export interface FishSpecies {
  id: string
  name: string
  rarity: Rarity
  color: string
  bellyColor: string
  /** Accent colour for fins / tail. */
  finColor: string
  /** Body silhouette archetype. */
  shape: FishShape
  /** Stripes/spots pattern painted on the body. */
  pattern: 'none' | 'stripes' | 'spots' | 'bands'
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
  /* ---------- Kecil (small) ---------- */
  {
    id: 'teri', name: 'Ikan Teri', rarity: 'common', color: '#cfd8e3', bellyColor: '#f1f5f9',
    finColor: '#9fb3c8', shape: 'long', pattern: 'none',
    size: 0.3, minWeight: 0.02, maxWeight: 0.2, pricePerKg: 18000, bonus: 10, reelDifficulty: 0.15,
    spawnWeight: 24, preferredBaits: ['pelet', 'cacing'],
    activity: { pagi: 1.0, siang: 0.7, sore: 0.9, malam: 0.4 },
  },
  {
    id: 'kembung', name: 'Ikan Kembung', rarity: 'common', color: '#3b6ea5', bellyColor: '#dbeafe',
    finColor: '#24476b', shape: 'torpedo', pattern: 'bands',
    size: 0.36, minWeight: 0.05, maxWeight: 0.4, pricePerKg: 32000, bonus: 10, reelDifficulty: 0.25,
    spawnWeight: 22, preferredBaits: ['pelet', 'artifisial'],
    activity: { pagi: 0.9, siang: 0.8, sore: 0.8, malam: 0.4 },
  },
  {
    id: 'selar', name: 'Ikan Selar', rarity: 'common', color: '#4b7fa6', bellyColor: '#e8f2f9',
    finColor: '#2f5c78', shape: 'torpedo', pattern: 'stripes',
    size: 0.34, minWeight: 0.05, maxWeight: 0.45, pricePerKg: 30000, bonus: 10, reelDifficulty: 0.28,
    spawnWeight: 20, preferredBaits: ['pelet', 'artifisial'],
    activity: { pagi: 0.9, siang: 0.8, sore: 0.8, malam: 0.4 },
  },
  {
    id: 'tembang', name: 'Ikan Tembang', rarity: 'common', color: '#7f9bb0', bellyColor: '#f3f7fa',
    finColor: '#5a7688', shape: 'torpedo', pattern: 'spots',
    size: 0.33, minWeight: 0.04, maxWeight: 0.35, pricePerKg: 26000, bonus: 10, reelDifficulty: 0.22,
    spawnWeight: 18, preferredBaits: ['pelet', 'cacing'],
    activity: { pagi: 0.8, siang: 0.7, sore: 0.8, malam: 0.4 },
  },
  {
    id: 'mujair', name: 'Ikan Mujair Laut', rarity: 'common', color: '#6b7280', bellyColor: '#e5e7eb',
    finColor: '#4b5563', shape: 'round', pattern: 'stripes',
    size: 0.4, minWeight: 0.15, maxWeight: 0.9, pricePerKg: 34000, bonus: 10, reelDifficulty: 0.3,
    spawnWeight: 16, preferredBaits: ['pelet', 'daun'],
    activity: { pagi: 0.9, siang: 0.8, sore: 0.7, malam: 0.3 },
  },
  {
    id: 'layang', name: 'Ikan Layang', rarity: 'common', color: '#5b8fb9', bellyColor: '#eaf4fb',
    finColor: '#3a6785', shape: 'torpedo', pattern: 'spots',
    size: 0.32, minWeight: 0.04, maxWeight: 0.35, pricePerKg: 24000, bonus: 10, reelDifficulty: 0.24,
    spawnWeight: 19, preferredBaits: ['artifisial', 'pelet'],
    activity: { pagi: 0.9, siang: 0.8, sore: 0.9, malam: 0.3 },
  },
  {
    id: 'belanak', name: 'Ikan Belanak', rarity: 'common', color: '#9aa8b5', bellyColor: '#f4f7fa',
    finColor: '#6d7c8a', shape: 'round', pattern: 'none',
    size: 0.38, minWeight: 0.15, maxWeight: 1.2, pricePerKg: 28000, bonus: 10, reelDifficulty: 0.27,
    spawnWeight: 15, preferredBaits: ['lumut', 'daun', 'pelet'],
    activity: { pagi: 0.9, siang: 0.6, sore: 0.8, malam: 0.3 },
  },
  /* ---------- Sedang (medium) ---------- */
  {
    id: 'ekor_kuning', name: 'Ikan Ekor Kuning', rarity: 'uncommon', color: '#2f7bbf', bellyColor: '#e0f2fe',
    finColor: '#facc15', shape: 'torpedo', pattern: 'stripes',
    size: 0.5, minWeight: 0.3, maxWeight: 2, pricePerKg: 48000, bonus: 25, reelDifficulty: 0.4,
    spawnWeight: 13, preferredBaits: ['pelet', 'artifisial'],
    activity: { pagi: 0.9, siang: 0.7, sore: 0.8, malam: 0.4 },
  },
  {
    id: 'kakap_merah', name: 'Kakap Merah', rarity: 'uncommon', color: '#c2413a', bellyColor: '#fbd5d0',
    finColor: '#8f2d27', shape: 'round', pattern: 'spots',
    size: 0.55, minWeight: 0.4, maxWeight: 3, pricePerKg: 62000, bonus: 25, reelDifficulty: 0.45,
    spawnWeight: 12, preferredBaits: ['pelet', 'cacing', 'artifisial'],
    activity: { pagi: 0.7, siang: 0.6, sore: 0.8, malam: 0.7 },
  },
  {
    id: 'baronang', name: 'Ikan Baronang', rarity: 'uncommon', color: '#7c7a55', bellyColor: '#eae6cf',
    finColor: '#57553a', shape: 'round', pattern: 'spots',
    size: 0.52, minWeight: 0.4, maxWeight: 2.5, pricePerKg: 58000, bonus: 25, reelDifficulty: 0.5,
    spawnWeight: 11, preferredBaits: ['lumut', 'daun'],
    activity: { pagi: 0.8, siang: 0.7, sore: 0.7, malam: 0.4 },
  },
  {
    id: 'tenggiri', name: 'Ikan Tenggiri', rarity: 'uncommon', color: '#334155', bellyColor: '#cbd5e1',
    finColor: '#1e293b', shape: 'torpedo', pattern: 'stripes',
    size: 0.6, minWeight: 0.6, maxWeight: 5, pricePerKg: 75000, bonus: 25, reelDifficulty: 0.58,
    spawnWeight: 10, preferredBaits: ['artifisial', 'pelet'],
    activity: { pagi: 0.9, siang: 0.6, sore: 0.8, malam: 0.5 },
  },
  {
    id: 'tongkol', name: 'Ikan Tongkol', rarity: 'uncommon', color: '#44566b', bellyColor: '#dde5ee',
    finColor: '#2b3947', shape: 'torpedo', pattern: 'bands',
    size: 0.58, minWeight: 0.5, maxWeight: 4, pricePerKg: 56000, bonus: 25, reelDifficulty: 0.55,
    spawnWeight: 10, preferredBaits: ['pelet', 'artifisial'],
    activity: { pagi: 0.9, siang: 0.8, sore: 0.8, malam: 0.4 },
  },
  {
    id: 'bawal_hitam', name: 'Bawal Hitam', rarity: 'uncommon', color: '#1f2937', bellyColor: '#94a3b8',
    finColor: '#111827', shape: 'round', pattern: 'none',
    size: 0.56, minWeight: 0.6, maxWeight: 4, pricePerKg: 68000, bonus: 25, reelDifficulty: 0.6,
    spawnWeight: 8, preferredBaits: ['artifisial', 'daun'],
    activity: { pagi: 0.8, siang: 0.6, sore: 0.7, malam: 0.5 },
  },
  {
    id: 'kue', name: 'Ikan Kue', rarity: 'uncommon', color: '#c08457', bellyColor: '#f5e2cf',
    finColor: '#8a5a34', shape: 'round', pattern: 'bands',
    size: 0.54, minWeight: 0.5, maxWeight: 3.5, pricePerKg: 64000, bonus: 25, reelDifficulty: 0.5,
    spawnWeight: 9, preferredBaits: ['pelet', 'cacing'],
    activity: { pagi: 0.8, siang: 0.7, sore: 0.7, malam: 0.5 },
  },
  /* ---------- Besar (large) ---------- */
  {
    id: 'kerapu', name: 'Kerapu Bebek', rarity: 'rare', color: '#5b6b4a', bellyColor: '#e6ecdd',
    finColor: '#3f4d33', shape: 'round', pattern: 'spots',
    size: 0.72, minWeight: 1.5, maxWeight: 12, pricePerKg: 95000, bonus: 50, reelDifficulty: 0.68,
    spawnWeight: 5, preferredBaits: ['pelet', 'cacing', 'artifisial'],
    activity: { pagi: 0.6, siang: 0.5, sore: 0.7, malam: 0.8 },
  },
  {
    id: 'kakap_putih', name: 'Kakap Putih', rarity: 'rare', color: '#94a3b8', bellyColor: '#f1f5f9',
    finColor: '#64748b', shape: 'torpedo', pattern: 'none',
    size: 0.78, minWeight: 2, maxWeight: 18, pricePerKg: 105000, bonus: 50, reelDifficulty: 0.72,
    spawnWeight: 4, preferredBaits: ['artifisial', 'pelet'],
    activity: { pagi: 0.7, siang: 0.5, sore: 0.7, malam: 0.6 },
  },
  {
    id: 'cakalang', name: 'Ikan Cakalang', rarity: 'rare', color: '#2b3d52', bellyColor: '#cbd5e1',
    finColor: '#1b2a3a', shape: 'torpedo', pattern: 'stripes',
    size: 0.85, minWeight: 3, maxWeight: 20, pricePerKg: 88000, bonus: 50, reelDifficulty: 0.75,
    spawnWeight: 4, preferredBaits: ['artifisial', 'pelet'],
    activity: { pagi: 0.9, siang: 0.6, sore: 0.8, malam: 0.4 },
  },
  {
    id: 'tuna', name: 'Ikan Tuna', rarity: 'rare', color: '#33506b', bellyColor: '#dce6f0',
    finColor: '#22364a', shape: 'torpedo', pattern: 'none',
    size: 0.95, minWeight: 5, maxWeight: 40, pricePerKg: 140000, bonus: 50, reelDifficulty: 0.8,
    spawnWeight: 3, preferredBaits: ['artifisial', 'pelet'],
    activity: { pagi: 0.8, siang: 0.6, sore: 0.8, malam: 0.5 },
  },
  {
    id: 'barakuda', name: 'Ikan Barakuda', rarity: 'rare', color: '#8fa3b0', bellyColor: '#f1f5f9',
    finColor: '#5b6d7a', shape: 'torpedo', pattern: 'spots',
    size: 0.8, minWeight: 2, maxWeight: 9, pricePerKg: 98000, bonus: 50, reelDifficulty: 0.74,
    spawnWeight: 4, preferredBaits: ['artifisial', 'cacing'],
    activity: { pagi: 0.7, siang: 0.5, sore: 0.8, malam: 0.7 },
  },
  {
    id: 'marlin', name: 'Ikan Marlin', rarity: 'legendary', color: '#1e3a5f', bellyColor: '#e0f2fe',
    finColor: '#132a45', shape: 'long', pattern: 'bands',
    size: 1.05, minWeight: 20, maxWeight: 120, pricePerKg: 180000, bonus: 100, reelDifficulty: 0.9,
    spawnWeight: 1.4, preferredBaits: ['artifisial'],
    activity: { pagi: 0.5, siang: 0.5, sore: 0.7, malam: 0.6 },
  },
  {
    id: 'todak', name: 'Ikan Todak', rarity: 'legendary', color: '#2c4a63', bellyColor: '#dceaf5',
    finColor: '#1a3348', shape: 'long', pattern: 'none',
    size: 1.12, minWeight: 30, maxWeight: 180, pricePerKg: 200000, bonus: 100, reelDifficulty: 0.91,
    spawnWeight: 1.1, preferredBaits: ['artifisial'],
    activity: { pagi: 0.5, siang: 0.6, sore: 0.7, malam: 0.4 },
  },
  {
    id: 'pari', name: 'Ikan Pari', rarity: 'legendary', color: '#6b5b4a', bellyColor: '#e8ddcc',
    finColor: '#4a3f33', shape: 'flat', pattern: 'spots',
    size: 1.0, minWeight: 8, maxWeight: 60, pricePerKg: 150000, bonus: 100, reelDifficulty: 0.86,
    spawnWeight: 1.3, preferredBaits: ['cacing', 'pelet'],
    activity: { pagi: 0.5, siang: 0.7, sore: 0.6, malam: 0.5 },
  },
  {
    id: 'hiu', name: 'Hiu Karang', rarity: 'legendary', color: '#5b6773', bellyColor: '#e7edf2',
    finColor: '#3d4750', shape: 'long', pattern: 'none',
    size: 1.0, minWeight: 15, maxWeight: 90, pricePerKg: 160000, bonus: 100, reelDifficulty: 0.92,
    spawnWeight: 1.2, preferredBaits: ['artifisial', 'cacing'],
    activity: { pagi: 0.4, siang: 0.4, sore: 0.6, malam: 0.9 },
  },
  {
    id: 'napoleon', name: 'Ikan Napoleon', rarity: 'legendary', color: '#1f6b57', bellyColor: '#d7f0e4',
    finColor: '#134a3c', shape: 'round', pattern: 'spots',
    size: 1.1, minWeight: 25, maxWeight: 150, pricePerKg: 220000, bonus: 100, reelDifficulty: 0.88,
    spawnWeight: 1, preferredBaits: ['pelet', 'lumut'],
    activity: { pagi: 0.6, siang: 0.6, sore: 0.7, malam: 0.7 },
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
