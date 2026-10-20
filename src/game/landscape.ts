import { fbm, ridged } from './noise'

/**
 * Shared, purely procedural description of the river valley.
 *
 * One source of truth for:
 *  - the meandering river centre-line / width / depth (runs along Z)
 *  - the terrain height field (banks, terraced rice fields, hills, mountains)
 *  - per-vertex colouring (soil, grass, paddy, rock, river bed)
 *
 * The terrain mesh, the water depth lookup and every object placement call
 * into this module, so nothing ever floats or sinks by accident.
 */

export const WATER_LEVEL = 0
/** Half-extent of the generated terrain square — beyond it only backdrop ranges exist. */
export const TERRAIN_RADIUS = 560

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x
}

/* ------------------------------------------------------------------ */
/*  River geometry                                                     */
/* ------------------------------------------------------------------ */

const K2 = 3.0 * Math.sin(0.85)

/**
 * Centre of the river for a given world z. Gentle near the angler (so the
 * cast always lands in water) and increasingly meandering further away.
 * Exactly 0 at z = 0.
 */
export function riverCenterX(z: number): number {
  const near = 5.0 * Math.sin(z * 0.0145) + 3.0 * Math.sin(z * 0.038 + 0.85) - K2
  const far = 8.0 * Math.sin(z * 0.0065 + 2.0) * smoothstep(30, 150, Math.abs(z))
  return near + far
}

/** Half-width of the river (10–19 m wide overall, never narrower than ~9 m). */
export function riverHalfWidth(z: number): number {
  return 7.2 + 1.6 * Math.sin(z * 0.026 + 0.7) + 1.1 * Math.sin(z * 0.061 + 2.4)
}

/** Channel depth below water level at the centre line. */
export function riverDepth(z: number): number {
  return 1.45 + 0.35 * Math.sin(z * 0.05 + 1.1)
}

/* ------------------------------------------------------------------ */
/*  Terrain                                                            */
/* ------------------------------------------------------------------ */

export interface LandSample {
  /** terrain height in metres (negative inside the river channel) */
  h: number
  /** lateral distance from the river centre line */
  d: number
  /** river half width at this z */
  w: number
  /** signed distance outside the water edge: < 0 is under water */
  t: number
  /** radial distance from the player / origin */
  r: number
  /** 0..1 how strongly this spot is a terraced rice field */
  paddy: number
}

/** Sample every terrain attribute at one world position. */
export function sampleLand(x: number, z: number): LandSample {
  const cx = riverCenterX(z)
  const w = riverHalfWidth(z)
  const d = Math.abs(x - cx)
  const t = d - w
  const r = Math.hypot(x, z)
  let h: number
  let paddy = 0

  if (t <= 0) {
    // --- river channel: smooth parabolic bed with a little bed texture
    const s = clamp01(d / w)
    const prof = Math.pow(1 - s * s, 0.7)
    const bed = (fbm(x * 0.19 + 31, z * 0.19 + 17, 2) - 0.5) * 0.24 * (1 - s * s)
    h = -riverDepth(z) * prof + bed
  } else {
    // --- dry land: banks -> valley floor -> foothills -> mountains
    const roll = (fbm(x * 0.0085 + 3, z * 0.0085 + 7, 4) - 0.5) * 4.0
    const detail = (fbm(x * 0.05 + 11, z * 0.05 + 17, 3) - 0.5) * 1.1
    const floor =
      0.5 * smoothstep(0, 4, t) +
      0.9 * smoothstep(2, 26, t) +
      0.03 * t +
      roll * smoothstep(5, 40, t) +
      detail * smoothstep(2, 16, t)
    const foothills =
      smoothstep(85, 250, r) * ridged(x * 0.011 + 2, z * 0.011 + 3, 4) * 16
    const mountains =
      smoothstep(150, 350, r) *
      Math.pow(ridged(x * 0.0042 + 5, z * 0.0042 + 9, 5), 1.3) *
      115
    h = floor + foothills + mountains

    // --- terraced rice fields on the gentle valley floor
    paddy =
      smoothstep(4.5, 10, t) *
      (1 - smoothstep(62, 92, t)) *
      (1 - smoothstep(11, 17, h))

    if (paddy > 0.01) {
      const step = 0.85
      const k = h / step
      const f = k - Math.floor(k)
      const riser = smoothstep(0.68, 0.97, f)
      const terraced = Math.floor(k) * step + riser * step
      const bund = Math.exp(-Math.pow((f - 0.93) / 0.09, 2)) * 0.13
      const micro = (fbm(x * 0.32 + 7, z * 0.32 + 3, 2) - 0.5) * 0.09
      h = h + (terraced - h) * paddy + bund * paddy + micro * paddy
    }
  }

  return { h, d, w, t, r, paddy }
}

/** Terrain height only — the common query for object placement. */
export function terrainHeight(x: number, z: number): number {
  return sampleLand(x, z).h
}

/** True when a sample sits inside the open water of the river. */
export function isWater(s: LandSample): boolean {
  return s.t < 0
}

/* ------------------------------------------------------------------ */
/*  Colours                                                            */
/* ------------------------------------------------------------------ */

export interface TerrainPaint {
  r: number
  g: number
  b: number
  /** 0..1 surface wetness — drives a lower roughness for flooded paddies */
  wet: number
}

const C = {
  bedSand: [0.44, 0.4, 0.3] as const,
  bedDeep: [0.28, 0.28, 0.23] as const,
  wetSoil: [0.36, 0.32, 0.23] as const,
  soil: [0.44, 0.37, 0.26] as const,
  grassA: [0.3, 0.4, 0.2] as const,
  grassB: [0.38, 0.48, 0.24] as const,
  grassC: [0.26, 0.36, 0.19] as const,
  paddyYoung: [0.42, 0.56, 0.24] as const,
  paddyMid: [0.5, 0.62, 0.28] as const,
  paddyRipe: [0.6, 0.65, 0.32] as const,
  paddyWet: [0.36, 0.47, 0.3] as const,
  forest: [0.18, 0.28, 0.15] as const,
  rock: [0.45, 0.43, 0.39] as const,
  rockHigh: [0.4, 0.41, 0.38] as const,
}

function mix(
  a: readonly [number, number, number],
  b: readonly [number, number, number],
  k: number,
): [number, number, number] {
  const t = clamp01(k)
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
}

/**
 * Vertex colour for a terrain sample. `slope` is 1 - normal.y (0 flat, 1 steep).
 * Colours stay deliberately desaturated so the valley reads as a real place.
 */
export function terrainPaint(s: LandSample, slope: number): TerrainPaint {
  const patch = fbm(s.r * 0.045 + 41, (s.h + s.d) * 0.05 + 7, 3)
  const jitter = fbm(s.d * 0.6 + 3, s.r * 0.6 + 19, 2) - 0.5

  if (s.t < 0) {
    // river bed — silt near the banks, darker gravel in the channel
    const deep = clamp01(-s.h / 1.4)
    const c = mix(C.bedSand, C.bedDeep, deep * 0.85)
    const v = 1 + jitter * 0.16
    return { r: c[0] * v, g: c[1] * v, b: c[2] * v, wet: 1 }
  }

  let c: [number, number, number]
  let wet = 0

  if (s.paddy > 0.35) {
    // rice paddies: colour varies field to field, slightly ripening
    const which = fbm(s.r * 0.018 + 13, s.d * 0.018 + 5, 2)
    const base =
      which < 0.36 ? C.paddyYoung : which < 0.66 ? C.paddyMid : which < 0.85 ? C.paddyRipe : C.paddyWet
    c = mix(base, C.grassB, (1 - s.paddy) * 0.5)
    // the bunds / risers keep a grassier, darker tone
    const flat = 1 - clamp01(slope * 4)
    c = mix(C.grassC, c, 0.35 + 0.65 * flat)
    wet = s.paddy * (0.55 + 0.45 * flat)
  } else if (s.t < 1.6) {
    // shoreline: wet soil blending into grass
    c = mix(C.wetSoil, C.grassA, smoothstep(0, 1.6, s.t))
    wet = 1 - smoothstep(0.2, 1.6, s.t)
  } else if (slope > 0.45) {
    // steep ground shows soil and rock
    c = mix(C.soil, C.rock, smoothstep(0.45, 0.8, slope))
  } else {
    // open grass / valley meadow
    c = mix(C.grassA, C.grassB, patch)
    c = mix(c, C.grassC, smoothstep(0.55, 0.85, patch))
    if (patch < 0.3) c = mix(c, C.soil, 0.3)
    // higher and further out turns into darker hill vegetation
    c = mix(c, C.forest, smoothstep(5, 14, s.h) * 0.7)
    c = mix(c, C.forest, smoothstep(70, 150, s.r) * 0.5)
  }

  // rocky mountain flanks far away
  const mountainRock = smoothstep(0.5, 0.78, slope) * smoothstep(130, 240, s.r)
  c = mix(c, C.rockHigh, mountainRock * 0.8)

  const v = 1 + jitter * 0.18 + (patch - 0.5) * 0.1
  return { r: c[0] * v, g: c[1] * v, b: c[2] * v, wet }
}

/**
 * Open-water depth in metres at a world position (0 on dry land).
 * The water shader samples the same numbers through a baked texture so the
 * shoreline of the mesh and of the shader always agree.
 */
export function waterDepth(x: number, z: number): number {
  const h = terrainHeight(x, z)
  return Math.max(0, WATER_LEVEL - h)
}
