export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary'

export interface FishSpecies {
  id: string
  name: string
  rarity: Rarity
  color: string
  bellyColor: string
  size: number
  bonus: number
  reelDifficulty: number
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

export const FISH_SPECIES: FishSpecies[] = [
  { id: 'lele', name: 'Lele', rarity: 'common', color: '#3f3f46', bellyColor: '#a1a1aa', size: 0.5, bonus: 10, reelDifficulty: 0.25 },
  { id: 'nila', name: 'Nila', rarity: 'common', color: '#64748b', bellyColor: '#e2e8f0', size: 0.45, bonus: 10, reelDifficulty: 0.3 },
  { id: 'tawes', name: 'Tawes', rarity: 'common', color: '#78716c', bellyColor: '#fcd34d', size: 0.42, bonus: 10, reelDifficulty: 0.3 },
  { id: 'mas', name: 'Ikan Mas', rarity: 'uncommon', color: '#f97316', bellyColor: '#fde68a', size: 0.55, bonus: 25, reelDifficulty: 0.45 },
  { id: 'patin', name: 'Patin', rarity: 'uncommon', color: '#475569', bellyColor: '#cbd5e1', size: 0.6, bonus: 25, reelDifficulty: 0.5 },
  { id: 'gabus', name: 'Gabus', rarity: 'uncommon', color: '#365314', bellyColor: '#a3e635', size: 0.55, bonus: 25, reelDifficulty: 0.5 },
  { id: 'baung', name: 'Baung', rarity: 'rare', color: '#7c2d12', bellyColor: '#fdba74', size: 0.65, bonus: 50, reelDifficulty: 0.65 },
  { id: 'bawal', name: 'Bawal Air Tawar', rarity: 'rare', color: '#1e293b', bellyColor: '#94a3b8', size: 0.7, bonus: 50, reelDifficulty: 0.7 },
  { id: 'sturgeon', name: 'Patin Raksasa', rarity: 'legendary', color: '#1e3a5f', bellyColor: '#e0f2fe', size: 0.95, bonus: 100, reelDifficulty: 0.85 },
]

export function pickRandomSpecies(): FishSpecies {
  const roll = Math.random()
  if (roll < 0.05) return FISH_SPECIES[8]
  if (roll < 0.2) return FISH_SPECIES[Math.floor(Math.random() * 3) + 6]
  if (roll < 0.5) return FISH_SPECIES[Math.floor(Math.random() * 3) + 3]
  return FISH_SPECIES[Math.floor(Math.random() * 3)]
}
