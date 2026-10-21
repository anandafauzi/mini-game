export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'

export type BaitId = 'cacing' | 'pelet' | 'lumut' | 'daun' | 'artifisial'

/**
 * Body silhouette archetype used by the 3D fish mesh.
 *  - torpedo : streamlined mid-body (nila, tawes, patin)
 *  - round   : deep compressed body (gurami, bawal)
 *  - flat    : wide bottom-dweller (lele, baung, belida)
 *  - long    : very elongated eel-like (gabus, arwana, belut)
 *  - ribbon  : tall thin body, big flowing fins (kancra, arwana juvenile)
 */
export type FishShape = 'torpedo' | 'round' | 'flat' | 'long' | 'ribbon'

/**
 * Distinct head/mouth/appendage archetype so each species reads as itself and
 * never as a recoloured generic fish.
 */
export type FishHead =
  | 'catfish' // broad flat head + long barbels (lele, baung, patin, belida)
  | 'cichlid' // deep head, terminal mouth (nila, mujair, gurami)
  | 'carp' // small rounded head, small barbels (mas, tawes)
  | 'snakehead' // flat snout, long head (gabus)
  | 'arowana' // upturned mouth, big scales (arwana)
  | 'mahseer' // pointed streamlined head (kancra)

/** Body pattern applied on top of the base colour. */
export type FishPattern = 'none' | 'stripes' | 'spots' | 'bands' | 'mottled' | 'bigscales' | 'spotfin'

export interface FishSpecies {
  id: string
  /** Nama umum dalam bahasa Indonesia. */
  name: string
  /** Nama ilmiah. */
  scientific: string
  rarity: Rarity
  color: string
  bellyColor: string
  /** Accent colour for fins / tail. */
  finColor: string
  /** Body silhouette archetype. */
  shape: FishShape
  /** Head / mouth archetype. */
  head: FishHead
  /** Pattern painted on the body. */
  pattern: FishPattern
  /** Base visual size (world units) used for the 3D mesh. */
  size: number
  /** Minimum / maximum weight in kilograms. */
  minWeight: number
  maxWeight: number
  /** Sell value per kilogram (in Rupiah). */
  pricePerKg: number
  /** Base score bonus. */
  bonus: number
  /** 0..1 - how hard the fish fights during reeling. */
  reelDifficulty: number
  /** Relative spawn chance weight (higher = more common). */
  spawnWeight: number
  /** Bait ids this species prefers (grants spawn bias). */
  preferredBaits: BaitId[]
  /** Time-of-day activity bias, 0..1 per period. */
  activity: { pagi: number; siang: number; sore: number; malam: number }
  /** Habitat singkat (untuk ensiklopedia). */
  habitat: string
  /** Deskripsi singkat (untuk ensiklopedia). */
  description: string
}

export const RARITY_LABEL: Record<Rarity, string> = {
  common: 'Umum',
  uncommon: 'Jarang',
  rare: 'Langka',
  epic: 'Epik',
  legendary: 'Legendaris',
}

export const RARITY_COLOR: Record<Rarity, string> = {
  common: '#9ca3af',
  uncommon: '#22c55e',
  rare: '#3b82f6',
  epic: '#a855f7',
  legendary: '#f59e0b',
}

export const RARITY_XP: Record<Rarity, number> = {
  common: 10,
  uncommon: 25,
  rare: 60,
  epic: 110,
  legendary: 180,
}

/** Rarity order for sorting / catalogue grouping. */
export const RARITY_ORDER: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary']

/**
 * Ikan air tawar sungai Nusantara. Sepuluh spesies umum/langka daerah sungai
 * ditambah tiga ikan langka bernilai koleksi tinggi.
 */
export const FISH_SPECIES: FishSpecies[] = [
  /* ---------------- Umum (common) ---------------- */
  {
    id: 'nila', name: 'Ikan Nila', scientific: 'Oreochromis niloticus',
    rarity: 'common', color: '#8b98a0', bellyColor: '#e8eef1', finColor: '#5f6f78',
    shape: 'torpedo', head: 'cichlid', pattern: 'bands',
    size: 0.42, minWeight: 0.2, maxWeight: 1.6, pricePerKg: 34000, bonus: 10, reelDifficulty: 0.3,
    spawnWeight: 26, preferredBaits: ['pelet', 'daun'],
    activity: { pagi: 1.0, siang: 0.9, sore: 0.9, malam: 0.4 },
    habitat: 'Sungai tenang, kolam, dan waduk',
    description: 'Ikan budidaya paling populer di Indonesia. Tubuh agak pipih dengan garis-garis gelap tegak di sisi badan.',
  },
  {
    id: 'mujair', name: 'Ikan Mujair', scientific: 'Oreochromis mossambicus',
    rarity: 'common', color: '#6b7280', bellyColor: '#e5e7eb', finColor: '#4b5563',
    shape: 'torpedo', head: 'cichlid', pattern: 'stripes',
    size: 0.38, minWeight: 0.15, maxWeight: 1.2, pricePerKg: 30000, bonus: 10, reelDifficulty: 0.28,
    spawnWeight: 24, preferredBaits: ['pelet', 'daun', 'cacing'],
    activity: { pagi: 0.9, siang: 0.9, sore: 0.8, malam: 0.4 },
    habitat: 'Sungai, muara, dan genangan air tawar',
    description: 'Kerabat dekat nila dengan tubuh lebih gelap dan toleran terhadap air payau.',
  },
  {
    id: 'mas', name: 'Ikan Mas', scientific: 'Cyprinus carpio',
    rarity: 'common', color: '#c98a3c', bellyColor: '#f0d9a8', finColor: '#a86a26',
    shape: 'torpedo', head: 'carp', pattern: 'none',
    size: 0.5, minWeight: 0.4, maxWeight: 4, pricePerKg: 42000, bonus: 10, reelDifficulty: 0.38,
    spawnWeight: 20, preferredBaits: ['pelet', 'cacing'],
    activity: { pagi: 0.9, siang: 0.7, sore: 0.9, malam: 0.5 },
    habitat: 'Sungai berarus lambat dan kolam',
    description: 'Ikan mas koi asli Asia. Bersisik keemasan, dua sungut kecil di sudut mulut.',
  },
  {
    id: 'tawes', name: 'Ikan Tawes', scientific: 'Barbonymus gonionotus',
    rarity: 'common', color: '#b9c3c9', bellyColor: '#f2f6f8', finColor: '#7d8b93',
    shape: 'torpedo', head: 'carp', pattern: 'none',
    size: 0.44, minWeight: 0.3, maxWeight: 2.4, pricePerKg: 32000, bonus: 10, reelDifficulty: 0.32,
    spawnWeight: 20, preferredBaits: ['daun', 'pelet', 'lumut'],
    activity: { pagi: 1.0, siang: 0.8, sore: 0.8, malam: 0.3 },
    habitat: 'Sungai dan saluran irigasi',
    description: 'Ikan pemakan tumbuhan air dengan tubuh perak mengkilap dan sirip agak kemerahan.',
  },
  {
    id: 'lele', name: 'Ikan Lele', scientific: 'Clarias batrachus',
    rarity: 'common', color: '#3d3a36', bellyColor: '#8f8879', finColor: '#2b2825',
    shape: 'flat', head: 'catfish', pattern: 'mottled',
    size: 0.5, minWeight: 0.3, maxWeight: 2.5, pricePerKg: 30000, bonus: 10, reelDifficulty: 0.36,
    spawnWeight: 22, preferredBaits: ['cacing'],
    activity: { pagi: 0.6, siang: 0.4, sore: 0.8, malam: 1.0 },
    habitat: 'Sungai berlumpur, rawa, dan sawah',
    description: 'Ikan berkumis dengan kepala gepeng dan kulit licin. Aktif mencari makan pada malam hari.',
  },
  {
    id: 'bawal_tawar', name: 'Bawal Air Tawar', scientific: 'Colossoma macropomum',
    rarity: 'common', color: '#2f2f33', bellyColor: '#9aa0a6', finColor: '#1f1f22',
    shape: 'round', head: 'cichlid', pattern: 'none',
    size: 0.55, minWeight: 0.8, maxWeight: 6, pricePerKg: 38000, bonus: 10, reelDifficulty: 0.42,
    spawnWeight: 15, preferredBaits: ['pelet', 'daun'],
    activity: { pagi: 0.8, siang: 0.8, sore: 0.8, malam: 0.4 },
    habitat: 'Sungai besar dan waduk',
    description: 'Sepupu pirarucu dari Amazon yang hidup di perairan tawar Indonesia. Tubuh dalam dan kuat.',
  },
  /* ---------------- Jarang (uncommon) ---------------- */
  {
    id: 'gurami', name: 'Ikan Gurami', scientific: 'Osphronemus goramy',
    rarity: 'uncommon', color: '#7a6a52', bellyColor: '#d9cbb0', finColor: '#5a4d3a',
    shape: 'round', head: 'cichlid', pattern: 'none',
    size: 0.62, minWeight: 0.9, maxWeight: 8, pricePerKg: 52000, bonus: 25, reelDifficulty: 0.5,
    spawnWeight: 13, preferredBaits: ['daun', 'lumut', 'pelet'],
    activity: { pagi: 0.8, siang: 0.7, sore: 0.8, malam: 0.4 },
    habitat: 'Sungai tenang, rawa, dan kolam',
    description: 'Ikan bertubuh pipih dan lebar dengan mulut kecil. Termasuk ikan labirin yang tahan air minim oksigen.',
  },
  {
    id: 'patin', name: 'Ikan Patin', scientific: 'Pangasianodon hypophthalmus',
    rarity: 'uncommon', color: '#6f7b83', bellyColor: '#eef2f4', finColor: '#4d585f',
    shape: 'long', head: 'catfish', pattern: 'none',
    size: 0.66, minWeight: 1, maxWeight: 9, pricePerKg: 46000, bonus: 25, reelDifficulty: 0.54,
    spawnWeight: 12, preferredBaits: ['pelet', 'cacing'],
    activity: { pagi: 0.7, siang: 0.6, sore: 0.8, malam: 0.8 },
    habitat: 'Sungai besar dan muara',
    description: 'Ikan berkumis bertubuh memanjang tanpa sisik dengan sirip punggung bermata satu.',
  },
  {
    id: 'gabus', name: 'Ikan Gabus', scientific: 'Channa striata',
    rarity: 'uncommon', color: '#4a4433', bellyColor: '#cfc8b0', finColor: '#37321f',
    shape: 'long', head: 'snakehead', pattern: 'mottled',
    size: 0.7, minWeight: 0.6, maxWeight: 5, pricePerKg: 56000, bonus: 25, reelDifficulty: 0.62,
    spawnWeight: 11, preferredBaits: ['cacing', 'lumut'],
    activity: { pagi: 0.6, siang: 0.4, sore: 0.8, malam: 1.0 },
    habitat: 'Rawa, sawah, dan sungai berlumpur',
    description: 'Predator air tawar dengan kepala mirip ular dan pola batik di sisi tubuh. Tahan hidup di air keruh.',
  },
  {
    id: 'baung', name: 'Ikan Baung', scientific: 'Hemibagrus nemurus',
    rarity: 'uncommon', color: '#5a5046', bellyColor: '#c8bda8', finColor: '#3e362d',
    shape: 'flat', head: 'catfish', pattern: 'none',
    size: 0.6, minWeight: 0.6, maxWeight: 6, pricePerKg: 58000, bonus: 25, reelDifficulty: 0.56,
    spawnWeight: 10, preferredBaits: ['cacing'],
    activity: { pagi: 0.5, siang: 0.4, sore: 0.7, malam: 1.0 },
    habitat: 'Sungai berarus, lubuk dalam',
    description: 'Ikan berkumis dengan kulit abu kecoklatan. Ikan dasar perairan yang aktif di malam hari.',
  },
  /* ---------------- Langka (rare) ---------------- */
  {
    id: 'belida', name: 'Ikan Belida', scientific: 'Chitala lopis',
    rarity: 'rare', color: '#c9ccd1', bellyColor: '#f4f6f8', finColor: '#8e939a',
    shape: 'flat', head: 'catfish', pattern: 'bigscales',
    size: 0.78, minWeight: 1.5, maxWeight: 10, pricePerKg: 90000, bonus: 50, reelDifficulty: 0.7,
    spawnWeight: 5, preferredBaits: ['cacing', 'lumut'],
    activity: { pagi: 0.3, siang: 0.3, sore: 0.6, malam: 0.9 },
    habitat: 'Sungai besar dan danau, dasar berlumpur',
    description: 'Ikan bertubuh pipih keperakan dengan sirip dada berbercak hitam. Bahan baku pempek yang khas.',
  },
  {
    id: 'kancra', name: 'Ikan Kancra (Mahseer)', scientific: 'Tor soro',
    rarity: 'rare', color: '#b98a52', bellyColor: '#efe0c4', finColor: '#8b5f2c',
    shape: 'ribbon', head: 'mahseer', pattern: 'spotfin',
    size: 0.8, minWeight: 1, maxWeight: 12, pricePerKg: 120000, bonus: 50, reelDifficulty: 0.76,
    spawnWeight: 4, preferredBaits: ['daun', 'pelet'],
    activity: { pagi: 0.8, siang: 0.6, sore: 0.8, malam: 0.5 },
    habitat: 'Sungai berarus deras, berbatu',
    description: 'Ikan mahseer endemik Sumatera dan Jawa. Bersisik besar, sirip kemerahan, hidup di sungai jernih berarus.',
  },
  /* ---------------- Epik (epic) ---------------- */
  {
    id: 'arwana', name: 'Ikan Arwana Asia', scientific: 'Scleropages formosus',
    rarity: 'epic', color: '#b5543a', bellyColor: '#f0c9a8', finColor: '#8a3826',
    shape: 'long', head: 'arowana', pattern: 'bigscales',
    size: 0.95, minWeight: 2, maxWeight: 15, pricePerKg: 260000, bonus: 100, reelDifficulty: 0.85,
    spawnWeight: 1.6, preferredBaits: ['cacing', 'artifisial'],
    activity: { pagi: 0.6, siang: 0.5, sore: 0.7, malam: 0.8 },
    habitat: 'Sungai keruh dan rawa gambut',
    description: 'Ikan hias bergengsi dengan sisik besar berkilau dan dua sungut di dagu. Dijuluki naga air.',
  },
  {
    id: 'belut_besar', name: 'Ikan Betok Besar', scientific: 'Anabas testudineus',
    rarity: 'epic', color: '#3f4a35', bellyColor: '#a8b09a', finColor: '#2c3424',
    shape: 'round', head: 'snakehead', pattern: 'mottled',
    size: 0.72, minWeight: 0.8, maxWeight: 7, pricePerKg: 140000, bonus: 100, reelDifficulty: 0.8,
    spawnWeight: 2.2, preferredBaits: ['lumut', 'cacing'],
    activity: { pagi: 0.5, siang: 0.4, sore: 0.7, malam: 0.9 },
    habitat: 'Rawa, sawah, dan parit berlumpur',
    description: 'Ikan kepala besar yang dapat merangkak di darat. Sisik keras gelap dengan bercak samar.',
  },
  /* ---------------- Legendaris (legendary) ---------------- */
  {
    id: 'tapah', name: 'Ikan Tapah', scientific: 'Wallago leeri',
    rarity: 'legendary', color: '#4b4740', bellyColor: '#b9b2a2', finColor: '#332f29',
    shape: 'long', head: 'catfish', pattern: 'mottled',
    size: 1.05, minWeight: 8, maxWeight: 80, pricePerKg: 220000, bonus: 150, reelDifficulty: 0.92,
    spawnWeight: 1.1, preferredBaits: ['cacing', 'lumut'],
    activity: { pagi: 0.3, siang: 0.3, sore: 0.6, malam: 1.0 },
    habitat: 'Lubuk terdalam sungai besar',
    description: 'Raksasa sungai Nusantara, panjang hingga dua meter. Predator puncak lubuk yang sangat sulit ditaklukkan.',
  },
]

export type TimeOfDay = 'pagi' | 'siang' | 'sore' | 'malam'

export function speciesById(id: string): FishSpecies | undefined {
  return FISH_SPECIES.find((s) => s.id === id)
}

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
  const lengthCm = Math.round(12 + species.size * 45 + norm * species.size * 60)
  const scale = 0.6 + norm * 0.9
  const value = Math.round(weight * species.pricePerKg)
  return { weight, lengthCm, scale, value }
}
