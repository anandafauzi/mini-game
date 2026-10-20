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

/** Ridged fbm — sharp crests, ideal for mountain silhouettes and foothills. */
export function ridged(x: number, y: number, octaves = 5, lacunarity = 2.0, gain = 0.5): number {
  let amp = 0.5
  let freq = 1.0
  let sum = 0
  let norm = 0
  for (let i = 0; i < octaves; i++) {
    const n = 1 - Math.abs(valueNoise2(x * freq, y * freq) * 2 - 1)
    sum += amp * n * n
    norm += amp
    amp *= gain
    freq *= lacunarity
  }
  return sum / norm
}

export function seededRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453
  return x - Math.floor(x)
}
