import * as THREE from 'three'

/** Deterministic 2D value-noise. */
function hash2(x: number, y: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return s - Math.floor(s)
}

function smootherstep(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10)
}

export function valueNoise2(x: number, y: number): number {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const xf = x - xi
  const yf = y - yi
  const a = hash2(xi, yi)
  const b = hash2(xi + 1, yi)
  const c = hash2(xi, yi + 1)
  const d = hash2(xi + 1, yi + 1)
  const u = smootherstep(xf)
  const v = smootherstep(yf)
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}

/** Fractal Brownian motion (layered value noise). */
export function fbm(x: number, y: number, octaves = 4, lacunarity = 2.0, gain = 0.5): number {
  let amp = 0.5
  let freq = 1.0
  let sum = 0
  let norm = 0
  for (let i = 0; i < octaves; i++) {
    sum += amp * valueNoise2(x * freq, y * freq)
    norm += amp
    amp *= gain
    freq *= lacunarity
  }
  return sum / norm
}

/** Ridged fbm, good for mountain crests. */
export function ridged(x: number, y: number, octaves = 5): number {
  let amp = 0.5
  let freq = 1.0
  let sum = 0
  let norm = 0
  for (let i = 0; i < octaves; i++) {
    const n = 1 - Math.abs(valueNoise2(x * freq, y * freq) * 2 - 1)
    sum += amp * n * n
    norm += amp
    amp *= 0.5
    freq *= 2.0
  }
  return sum / norm
}

export function seededRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453
  return x - Math.floor(x)
}

/**
 * High-resolution terrain heightfield covering the whole valley.
 * The river channel is carved as a smooth trench along the Z axis and the
 * valley sides rise into rolling hills with layered fbm detail.
 */
export function terrainHeight(x: number, z: number): number {
  // distance from the river centreline (river runs down x=0)
  const riverDist = Math.abs(x)

  // multi-octave hills and ridge detail
  const hills = fbm(x * 0.04 + 10, z * 0.04 + 20, 5) * 10
  const ridges = ridged(x * 0.018 + 3, z * 0.018 + 7, 5) * 8
  const micro = fbm(x * 0.18 + 40, z * 0.18 + 60, 3) * 0.6

  let h = hills * 0.32 + ridges * 0.22 + micro
  // valley walls rise away from the river
  h += Math.min(1, Math.max(0, riverDist - 7) / 16) * 9

  // river trough carve
  const carve = Math.max(0, 1 - riverDist / 6.8)
  h -= Math.pow(carve, 2.2) * 3.4

  // flatten the near bank so the angler stands on level ground
  if (riverDist < 8) h = THREE.MathUtils.lerp(h, -0.05, (1 - riverDist / 8) * 0.65)

  return h - 0.15
}

/** True when a point is on/near the walkable riverbank. */
export function isBank(x: number, z: number): boolean {
  return Math.abs(x) < 9 && z > -12 && z < 9
}
