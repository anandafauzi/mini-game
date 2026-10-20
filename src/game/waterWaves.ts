import * as THREE from 'three'

/**
 * Shared wave field for the river surface.
 *
 * Long, low swells only — a river is nearly flat, so the whole field stays
 * under ~12 cm. The water mesh, the boat, the bobber and the fish all sample
 * this one function, so everything on the surface moves together. Fine ripples
 * live in the water fragment shader instead (they carry no height).
 */

export interface WaveLayer {
  dirX: number
  dirZ: number
  steepness: number
  wavelength: number
}

export const WAVE_LAYERS: WaveLayer[] = [
  { dirX: 0.12, dirZ: 0.99, steepness: 0.008, wavelength: 54 },
  { dirX: -0.24, dirZ: 0.97, steepness: 0.006, wavelength: 36 },
  { dirX: 0.58, dirZ: 0.81, steepness: 0.005, wavelength: 23 },
  { dirX: -0.66, dirZ: 0.75, steepness: 0.004, wavelength: 15 },
]

const G = 9.8

/** Sample the river surface height at a world position. */
export function waterHeight(x: number, z: number, time: number): number {
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
export function waterNormal(x: number, z: number, time: number, out: THREE.Vector3): THREE.Vector3 {
  const e = 0.4
  const hL = waterHeight(x - e, z, time)
  const hR = waterHeight(x + e, z, time)
  const hD = waterHeight(x, z - e, time)
  const hU = waterHeight(x, z + e, time)
  return out.set(hL - hR, 2 * e, hD - hU).normalize()
}

/** GLSL twin of the sum above — kept textually identical to the CPU version. */
export const GLSL_WATER_WAVES = `
float waterWaveHeight(vec2 p, float t) {
  float y = 0.0;
  const int N = 4;
  vec2 dirs[4];
  dirs[0] = vec2(0.12, 0.99);
  dirs[1] = vec2(-0.24, 0.97);
  dirs[2] = vec2(0.58, 0.81);
  dirs[3] = vec2(-0.66, 0.75);
  float steep[4];
  steep[0] = 0.008; steep[1] = 0.006; steep[2] = 0.005; steep[3] = 0.004;
  float len[4];
  len[0] = 54.0; len[1] = 36.0; len[2] = 23.0; len[3] = 15.0;
  for (int i = 0; i < N; i++) {
    float k = 6.28318530718 / len[i];
    float speed = sqrt(9.8 / k);
    float phase = k * dot(dirs[i], p) - speed * t;
    y += (steep[i] / k) * sin(phase);
  }
  return y;
}
`
