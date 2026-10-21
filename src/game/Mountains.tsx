import { useMemo } from 'react'
import * as THREE from 'three'
import { fbm, ridged } from './noise'

/**
 * Layered mountain backdrop.
 *
 * Rather than cones or pyramids, each range is a tall vertical curtain wrapped
 * around a wobbling ring: a ridged crest line modulated by a broad swell, with
 * foothills that dip and rise irregularly. Three concentric ranges at different
 * radii / heights give real atmospheric perspective: the nearest is dark and
 * forested, the middle one hazy blue-green, and the farthest fades almost into
 * the sky. Vertex colours bake the foot-to-crest gradient so the base of every
 * range melts into the valley haze while the summits stay readable.
 */

interface RangeSpec {
  radius: number
  height: number
  base: number
  bottom: number
  crest: [number, number, number]
  ridge: [number, number, number]
  haze: [number, number, number]
  seed: number
  freq: number
  snow: number
}

function buildRidge(spec: RangeSpec, spokes: number): THREE.BufferGeometry {
  const positions = new Float32Array((spokes + 1) * 2 * 3)
  const colors = new Float32Array((spokes + 1) * 2 * 3)
  const indices = new Uint32Array(spokes * 6)
  const tmp = new THREE.Color()

  const crestC = new THREE.Color(spec.crest[0], spec.crest[1], spec.crest[2])
  const ridgeC = new THREE.Color(spec.ridge[0], spec.ridge[1], spec.ridge[2])

  for (let i = 0; i <= spokes; i++) {
    const a = (i / spokes) * Math.PI * 2
    const ca = Math.cos(a)
    const sa = Math.sin(a)

    // the ring itself wobbles so the range never reads as a perfect circle
    const rr = spec.radius * (0.92 + fbm(ca * 1.3 + spec.seed, sa * 1.3 + spec.seed, 3) * 0.18)
    const x = ca * rr
    const z = sa * rr

    // two noise scales: sharp ridged peaks + broad swell so summits cluster
    const n = ridged(x * spec.freq + spec.seed * 3, z * spec.freq + spec.seed * 5, 5)
    const swell = fbm(x * spec.freq * 0.32 + 11, z * spec.freq * 0.32 + 7, 3)
    // foothill term keeps long stretches from being flat-cut
    const hill = fbm(x * spec.freq * 1.7 + 41, z * spec.freq * 1.7 + 23, 2)
    const h =
      spec.base +
      Math.pow(n, 1.35) * spec.height * (0.35 + swell * 0.9) +
      hill * spec.height * 0.16

    const k = i * 6
    positions[k] = x
    positions[k + 1] = spec.bottom
    positions[k + 2] = z
    positions[k + 3] = x
    positions[k + 4] = h
    positions[k + 5] = z

    // colour: haze at the foot -> ridge tone at mid -> crest at the top,
    // faintly snow-dusted on the highest peaks of the far range
    const hn = THREE.MathUtils.clamp((h - spec.base) / spec.height, 0, 1)
    tmp.copy(ridgeC).lerp(crestC, THREE.MathUtils.smoothstep(hn, 0.25, 0.8))
    if (spec.snow > 0) tmp.lerp(new THREE.Color(0.92, 0.94, 0.97), hn * spec.snow * 0.5)

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

  // Nearest range: forested, dark, sharp.
  const near = useMemo(
    () =>
      buildRidge(
        {
          radius: 560,
          height: 140,
          base: 6,
          bottom: -25,
          crest: [0.22, 0.32, 0.2],
          ridge: [0.16, 0.26, 0.16],
          haze: [0.5, 0.6, 0.58],
          seed: 3.7,
          freq: 0.0062,
          snow: 0,
        },
        256,
      ),
    [],
  )

  // Middle range: hazy blue-green.
  const mid = useMemo(
    () =>
      buildRidge(
        {
          radius: 720,
          height: 205,
          base: 8,
          bottom: -28,
          crest: [0.28, 0.36, 0.34],
          ridge: [0.24, 0.32, 0.32],
          haze: [0.62, 0.71, 0.72],
          seed: 6.4,
          freq: 0.005,
          snow: 0.1,
        },
        224,
      ),
    [],
  )

  // Far range: pale, almost sky-coloured, snow-dusted peaks.
  const far = useMemo(
    () =>
      buildRidge(
        {
          radius: 900,
          height: 280,
          base: 12,
          bottom: -30,
          crest: [0.34, 0.4, 0.44],
          ridge: [0.31, 0.38, 0.42],
          haze: [0.71, 0.79, 0.83],
          seed: 9.1,
          freq: 0.0038,
          snow: 0.35,
        },
        192,
      ),
    [],
  )

  return (
    <group>
      <mesh geometry={near} material={material} frustumCulled={false} renderOrder={-2} />
      <mesh geometry={mid} material={material} frustumCulled={false} renderOrder={-3} />
      <mesh geometry={far} material={material} frustumCulled={false} renderOrder={-4} />
    </group>
  )
}
