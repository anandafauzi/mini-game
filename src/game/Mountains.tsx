import { useMemo } from 'react'
import * as THREE from 'three'
import { fbm, ridged } from './noise'

/**
 * Two distant ridge curtains that close the valley off at the horizon.
 *
 * Each range is a vertical strip wrapped around a wobbling circle: a ridged
 * crest line with a broad swell on top, unlit and vertex-tinted so the foot of
 * the range fades into haze while the crests stay readable. Scene fog does the
 * aerial perspective for free, so the far range recedes behind the near one.
 */

interface RangeSpec {
  radius: number
  height: number
  base: number
  bottom: number
  crest: [number, number, number]
  haze: [number, number, number]
  seed: number
  freq: number
}

function buildRidge(spec: RangeSpec, spokes: number): THREE.BufferGeometry {
  const positions = new Float32Array((spokes + 1) * 2 * 3)
  const colors = new Float32Array((spokes + 1) * 2 * 3)
  const indices = new Uint32Array(spokes * 6)
  const tmp = new THREE.Color()

  for (let i = 0; i <= spokes; i++) {
    const a = (i / spokes) * Math.PI * 2
    const ca = Math.cos(a)
    const sa = Math.sin(a)

    // the ring itself wobbles so the range never reads as a circle
    const rr = spec.radius * (0.94 + fbm(ca * 1.3 + spec.seed, sa * 1.3 + spec.seed, 3) * 0.13)
    const x = ca * rr
    const z = sa * rr

    const n = ridged(x * spec.freq + spec.seed * 3, z * spec.freq + spec.seed * 5, 5)
    const swell = fbm(x * spec.freq * 0.35 + 11, z * spec.freq * 0.35 + 7, 3)
    const h = spec.base + Math.pow(n, 1.4) * spec.height * (0.4 + swell * 0.85)

    const k = i * 6
    positions[k] = x
    positions[k + 1] = spec.bottom
    positions[k + 2] = z
    positions[k + 3] = x
    positions[k + 4] = h
    positions[k + 5] = z

    // per-spoke variation keeps long stretches from looking like a printed cutout
    const vary = 0.88 + fbm(x * 0.02 + 31, z * 0.02 + 17, 2) * 0.24
    tmp.setRGB(spec.crest[0] * vary, spec.crest[1] * vary, spec.crest[2] * vary)
    colors[k] = spec.haze[0]
    colors[k + 1] = spec.haze[1]
    colors[k + 2] = spec.haze[2]
    colors[k + 3] = tmp.r
    colors[k + 4] = tmp.g
    colors[k + 5] = tmp.b
  }

  for (let i = 0; i < spokes; i++) {
    const b = i * 2
    const k = i * 6
    indices[k] = b
    indices[k + 1] = b + 1
    indices[k + 2] = b + 2
    indices[k + 3] = b + 1
    indices[k + 4] = b + 3
    indices[k + 5] = b + 2
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geo.setIndex(new THREE.BufferAttribute(indices, 1))
  geo.computeBoundingSphere()
  return geo
}

export function Mountains() {
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        vertexColors: true,
        side: THREE.DoubleSide,
        fog: true,
        depthWrite: true,
        toneMapped: true,
      }),
    [],
  )

  const near = useMemo(
    () =>
      buildRidge(
        {
          radius: 660,
          height: 155,
          base: 4,
          bottom: -25,
          crest: [0.2, 0.29, 0.27],
          haze: [0.62, 0.71, 0.72],
          seed: 3.7,
          freq: 0.0052,
        },
        224,
      ),
    [],
  )

  const far = useMemo(
    () =>
      buildRidge(
        {
          radius: 830,
          height: 250,
          base: 10,
          bottom: -30,
          crest: [0.26, 0.33, 0.36],
          haze: [0.7, 0.78, 0.82],
          seed: 9.1,
          freq: 0.004,
        },
        176,
      ),
    [],
  )

  return (
    <group>
      <mesh geometry={near} material={material} frustumCulled={false} renderOrder={-2} />
      <mesh geometry={far} material={material} frustumCulled={false} renderOrder={-3} />
    </group>
  )
}
