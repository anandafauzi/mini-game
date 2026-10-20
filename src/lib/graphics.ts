import { create } from 'zustand'

export type Quality = 'low' | 'medium' | 'high'

export interface QualitySettings {
  dpr: [number, number]
  shadowMapSize: number
  shadowsEnabled: boolean
  waterSegments: [number, number]
  terrainSegments: number
  fogNear: number
  fogFar: number
  particleCount: number
  instancingDensity: number
  caustics: boolean
}

export const QUALITY_PRESETS: Record<Quality, QualitySettings> = {
  low: {
    dpr: [1, 1],
    shadowMapSize: 1024,
    shadowsEnabled: true,
    waterSegments: [10, 140],
    terrainSegments: 100,
    fogNear: 90,
    fogFar: 820,
    particleCount: 20,
    instancingDensity: 0.5,
    caustics: false,
  },
  medium: {
    dpr: [1, 1.5],
    shadowMapSize: 1536,
    shadowsEnabled: true,
    waterSegments: [12, 190],
    terrainSegments: 140,
    fogNear: 110,
    fogFar: 1020,
    particleCount: 40,
    instancingDensity: 0.8,
    caustics: true,
  },
  high: {
    dpr: [1, 1.75],
    shadowMapSize: 2048,
    shadowsEnabled: true,
    waterSegments: [14, 220],
    terrainSegments: 176,
    fogNear: 120,
    fogFar: 1180,
    particleCount: 60,
    instancingDensity: 1,
    caustics: true,
  },
}

export const QUALITY_LABEL: Record<Quality, string> = {
  low: 'Rendah',
  medium: 'Sedang',
  high: 'Tinggi',
}

const STORAGE_KEY = 'laut-nusantara-quality-v1'

function detectDefault(): Quality {
  if (typeof navigator === 'undefined') return 'medium'
  const ua = navigator.userAgent || ''
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua)
  if (!isMobile) return 'high'
  // assume lower-end on mobile by default
  const mem = (navigator as unknown as { deviceMemory?: number }).deviceMemory
  if (typeof mem === 'number' && mem <= 4) return 'low'
  return 'medium'
}

function loadQuality(): Quality {
  if (typeof localStorage === 'undefined') return detectDefault()
  try {
    const raw = localStorage.getItem(STORAGE_KEY) as Quality | null
    if (raw === 'low' || raw === 'medium' || raw === 'high') return raw
  } catch {
    /* ignore */
  }
  return detectDefault()
}

interface GraphicsState {
  quality: Quality
  settings: QualitySettings
  setQuality: (q: Quality) => void
}

export const useGraphics = create<GraphicsState>((set) => ({
  quality: loadQuality(),
  settings: QUALITY_PRESETS[loadQuality()],
  setQuality: (q) => {
    try {
      localStorage.setItem(STORAGE_KEY, q)
    } catch {
      /* ignore */
    }
    set({ quality: q, settings: QUALITY_PRESETS[q] })
  },
}))
