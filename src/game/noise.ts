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
 * The river channel is carved as a smooth trench along the Z axis.
 */
export function terrainHeight(x: number, z: number): number {
  // distance from the river centreline (river runs down x=0)
  const riverDist = Math.abs(x)

  // gentle far terrain rise with fbm hills
  const hills = fbm(x * 0.045 + 10, z * 0.045 + 20, 5) * 9
  const ridges = ridged(x * 0.02 + 3, z * 0.02 + 7, 4) * 6

  // river valley carve
  const bankWidth = 6.5
  const carve = Math.max(0, 1 - riverDist / bankWidth)
  const channel = Math.pow(carve, 2.2)

  let h = hills * 0.3 + ridges * 0.2
  // raise sides far from river to form valley walls (starts beyond the bank)
  h += Math.min(1, Math.max(0, riverDist - 8) / 14) * 7
  // carve river trough
  h -= channel * 3.2
  // flatten near bank for walkable ground
  if (riverDist < 8) h = THREE.MathUtils.lerp(h, -0.05, (1 - riverDist / 8) * 0.6)

  return h - 0.15
}
