import * as THREE from 'three'

/**
 * Shared ocean wave field.
 *
 * The same set of Gerstner-style directional waves drives both the water
 * shader (GLSL, mirrors this math) and CPU queries used to float the boat,
 * the bobber and the camera. Keeping them in one place means everything on
 * the surface stays in sync.
 */

export interface WaveLayer {
  dirX: number
  dirZ: number
  steepness: number
  wavelength: number
}

// Sum of directional waves. Chosen for a calm-but-living tropical swell.
export const WAVE_LAYERS: WaveLayer[] = [
  { dirX: 0.62, dirZ: 0.78, steepness: 0.18, wavelength: 28 },
  { dirX: -0.34, dirZ: 0.94, steepness: 0.14, wavelength: 18 },
  { dirX: 0.86, dirZ: 0.5, steepness: 0.1, wavelength: 11 },
  { dirX: -0.72, dirZ: -0.69, steepness: 0.07, wavelength: 6.5 },
  { dirX: 0.2, dirZ: 0.98, steepness: 0.045, wavelength: 3.6 },
]

const G = 9.8

/** Sample the ocean surface height at a world position. */
export function oceanHeight(x: number, z: number, time: number): number {
  let y = 0
  for (const w of WAVE_LAYERS) {
    const k = (Math.PI * 2) / w.wavelength
    const speed = Math.sqrt(G / k)
    const phase = k * (w.dirX * x + w.dirZ * z) - speed * time
    y += (w.steepness / k) * Math.sin(phase)
  }
  return y
}

/** Sample the surface normal at a world position (finite difference). */
export function oceanNormal(x: number, z: number, time: number, out: THREE.Vector3): THREE.Vector3 {
  const e = 0.35
  const hL = oceanHeight(x - e, z, time)
  const hR = oceanHeight(x + e, z, time)
  const hD = oceanHeight(x, z - e, time)
  const hU = oceanHeight(x, z + e, time)
  return out.set(hL - hR, 2 * e, hD - hU).normalize()
}

/** Approximate the surface normal's sea-state steepness (0 calm .. 1 choppy). */
export function oceanSlope(x: number, z: number, time: number): number {
  const e = 0.5
  const dx = oceanHeight(x + e, z, time) - oceanHeight(x - e, z, time)
  const dz = oceanHeight(x, z + e, time) - oceanHeight(x, z - e, time)
  return Math.min(1, Math.hypot(dx, dz) / (2 * e))
}

/** GLSL body for the shared wave sum — kept textually identical to the CPU version. */
export const GLSL_WAVES = `
float oceanWaveHeight(vec2 p, float t) {
  float y = 0.0;
  const int N = 5;
  vec2 dirs[5];
  dirs[0] = vec2(0.62, 0.78);
  dirs[1] = vec2(-0.34, 0.94);
  dirs[2] = vec2(0.86, 0.5);
  dirs[3] = vec2(-0.72, -0.69);
  dirs[4] = vec2(0.2, 0.98);
  float steep[5];
  steep[0] = 0.18; steep[1] = 0.14; steep[2] = 0.10; steep[3] = 0.07; steep[4] = 0.045;
  float len[5];
  len[0] = 28.0; len[1] = 18.0; len[2] = 11.0; len[3] = 6.5; len[4] = 3.6;
  for (int i = 0; i < N; i++) {
    float k = 6.28318530718 / len[i];
    float speed = sqrt(9.8 / k);
    float phase = k * dot(dirs[i], p) - speed * t;
    y += (steep[i] / k) * sin(phase);
  }
  return y;
}
`
