import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGraphics } from '../lib/graphics'
import { fbm, seededRandom } from './noise'
import { sampleLand, terrainHeight } from './landscape'
import { displace, ringTexture } from './geom'
import { useLayoutEffect } from 'react'

/**
 * Hard landscape details: river rocks with a wet waterline, a couple of
 * stilted sawah huts and a few distant birds.
 *
 * Rocks sit in a band along both banks (some half-submerged) and carry a
 * darker wet band baked into their vertex colours, so they read as objects
 * that have always been in the water.
 */

interface Spot {
  x: number
  y: number
  z: number
  rot: number
  sx: number
  sy: number
  sz: number
  color?: string
}

const UP = new THREE.Vector3(0, 1, 0)

function rockGeometry(seed: number): THREE.BufferGeometry {
  const g = new THREE.IcosahedronGeometry(1, 1)
  displace(g, (x, y, z) => {
    const n = fbm(x * 1.4 + seed, (y * 0.8 + z) * 1.4 + seed * 2, 3)
    const k = 0.55 + n * 0.95
    return new THREE.Vector3(x * k, y * k * 0.66, z * k)
  })
  // wet, darker band below the waterline + dry crown
  const pos = g.attributes.position as THREE.BufferAttribute
  const colors = new Float32Array(pos.count * 3)
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i)
    const wet = 1 - Math.min(1, Math.max(0, (y + 0.2) / 0.42))
    const base = 0.45 - wet * 0.25
    colors[i * 3] = base * 1.04
    colors[i * 3 + 1] = base
    colors[i * 3 + 2] = base * 0.93
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  return g
}

function scatterRocks(count: number, seed: number, range: number): Spot[] {
  const out: Spot[] = []
  let attempts = 0
  while (out.length < count && attempts < count * 20) {
    const a = attempts++
    const ang = seededRandom(seed + a * 1.31) * Math.PI * 2
    const r = Math.pow(seededRandom(seed + a * 2.17), 0.7) * range
    const x = Math.cos(ang) * r
    const z = Math.sin(ang) * r
    const s = sampleLand(x, z)
    // hug the waterline, both in the river and just above the bank
    if (s.t > 2.6 || s.t < -1.6) continue
    if (Math.abs(s.t) < 0.4 && seededRandom(seed + a * 3.7) > 0.45) continue
    const scale = 0.18 + seededRandom(seed + a * 4.9) * (Math.abs(s.t) < 0.8 ? 0.55 : 1.0)
    out.push({
      x,
      y: s.h - scale * 0.3,
      z,
      rot: seededRandom(seed + a * 5.3) * Math.PI * 2,
      sx: scale * (0.8 + seededRandom(seed + a * 6.1) * 0.6),
      sy: scale * (0.6 + seededRandom(seed + a * 7.7) * 0.5),
      sz: scale * (0.8 + seededRandom(seed + a * 8.3) * 0.6),
      color: seededRandom(seed + a * 9.1) > 0.5 ? '#8d8878' : '#7c7869',
    })
  }
  return out
}

function InstancedRocks({
  geometry,
  spots,
}: {
  geometry: THREE.BufferGeometry
  spots: Spot[]
}) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.78,
        metalness: 0.02,
      }),
    [],
  )

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const p = new THREE.Vector3()
    const s = new THREE.Vector3()
    const c = new THREE.Color()
    for (let i = 0; i < spots.length; i++) {
      const sp = spots[i]
      p.set(sp.x, sp.y, sp.z)
      q.setFromAxisAngle(UP, sp.rot)
      s.set(sp.sx, sp.sy, sp.sz)
      m.compose(p, q, s)
      mesh.setMatrixAt(i, m)
      if (sp.color) mesh.setColorAt(i, c.set(sp.color))
    }
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [spots])

  if (spots.length === 0) return null
  return (
    <instancedMesh
      ref={ref}
      args={[geometry, material, spots.length]}
      castShadow
      receiveShadow
      frustumCulled={false}
    />
  )
}

/** Soft rings where stones meet the current. */
function RockRipples({ rocks }: { rocks: Spot[] }) {
  const tex = useMemo(() => ringTexture(0.42, 0.5, '230,244,238'), [])
  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    [tex],
  )
  const group = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (!group.current) return
    const t = clock.elapsedTime
    group.current.children.forEach((child, i) => {
      const k = 1 + Math.sin(t * 1.1 + i * 1.7) * 0.08
      child.scale.setScalar(k)
    })
  })

  const inWater = rocks.filter((r) => r.y < 0.05 && Math.max(r.sx, r.sz) > 0.3)
  if (inWater.length === 0) return null

  return (
    <group ref={group} rotation={[-Math.PI / 2, 0, 0]}>
      {inWater.map((r, i) => (
        <mesh key={i} position={[r.x, 0.03, r.z]} material={mat}>
          <planeGeometry args={[r.sx * 4.2, r.sx * 4.2]} />
        </mesh>
      ))}
    </group>
  )
}

/* ------------------------------------------------------------------ */
/*  Sawah hut                                                          */
/* ------------------------------------------------------------------ */

function Hut({ x, z, rot }: { x: number; z: number; rot: number }) {
  const mats = useMemo(
    () => ({
      wood: new THREE.MeshStandardMaterial({ color: '#7a5a34', roughness: .88 }),
      dark: new THREE.MeshStandardMaterial({ color: '#5b4126', roughness: 0.9 }),
      thatch: new THREE.MeshStandardMaterial({ color: '#9a7a42', roughness: 0.95 }),
      floor: new THREE.MeshStandardMaterial({ color: '#8a6a3e', roughness: 0.9 }),
    }),
    [],
  )
  const y = terrainHeight(x, z)

  return (
    <group position={[x, y, z]} rotation={[0, rot, 0]}>
      {/* stilts */}
      {[
        [-0.75, -0.6],
        [0.75, -0.6],
        [-0.75, 0.6],
        [0.75, 0.6],
      ].map((p, i) => (
        <mesh key={i} position={[p[0], 0.45, p[1]]} castShadow material={mats.dark}>
          <boxGeometry args={[0.13, 1.5, 0.13]} />
        </mesh>
      ))}
      {/* floor */}
      <mesh position={[0, 1.22, 0]} castShadow receiveShadow material={mats.floor}>
        <boxGeometry args={[1.9, 0.1, 1.7]} />
      </mesh>
      {/* low walls, open front */}
      <mesh position={[0, 1.62, 0.78]} castShadow material={mats.wood}>
        <boxGeometry args={[1.8, 0.7, 0.07]} />
      </mesh>
      <mesh position={[-0.88, 1.62, 0]} castShadow material={mats.wood}>
        <boxGeometry args={[0.07, 0.7, 1.6]} />
      </mesh>
      <mesh position={[0.88, 1.62, 0]} castShadow material={mats.wood}>
        <boxGeometry args={[0.07, 0.7, 1.6]} />
      </mesh>
      {/* thatched roof */}
      <mesh position={[0, 2.55, 0]} rotation={[0, Math.PI / 4, 0]} castShadow material={mats.thatch}>
        <coneGeometry args={[1.85, 1.15, 4]} />
      </mesh>
      {/* ridge cap */}
      <mesh position={[0, 3.15, 0]} material={mats.dark}>
        <sphereGeometry args={[0.12, 8, 6]} />
      </mesh>
      {/* leaning pole / fishing rack */}
      <mesh position={[1.25, 1.1, -0.3]} rotation={[0, 0, 0.35]} material={mats.dark}>
        <cylinderGeometry args={[0.05, 0.05, 2.2, 6]} />
      </mesh>
    </group>
  )
}

function findPaddySpot(cx: number, cz: number, maxR: number): { x: number; z: number } | null {
  for (let i = 0; i < 500; i++) {
    const a = seededRandom(i * 1.37 + cx) * Math.PI * 2
    const r = Math.pow(seededRandom(i * 2.63 + cz), 0.6) * maxR
    const x = cx + Math.cos(a) * r
    const z = cz + Math.sin(a) * r
    const s = sampleLand(x, z)
    if (s.paddy > 0.6 && s.h > 0.2 && s.h < 7) return { x, z }
  }
  return null
}

function Huts() {
  const spots = useMemo(() => {
    const wanted: Array<[number, number]> = [
      [26, -34],
      [-30, -58],
      [34, -96],
    ]
    const out: Array<{ x: number; z: number; rot: number }> = []
    wanted.forEach(([cx, cz], i) => {
      const p = findPaddySpot(cx, cz, 26)
      if (p) out.push({ x: p.x, z: p.z, rot: seededRandom(i * 3.3) * Math.PI * 2 })
    })
    return out
  }, [])

  return (
    <group>
      {spots.map((s, i) => (
        <Hut key={i} x={s.x} z={s.z} rot={s.rot} />
      ))}
    </group>
  )
}

/* ------------------------------------------------------------------ */
/*  Birds                                                              */
/* ------------------------------------------------------------------ */

function Bird({
  radius,
  height,
  speed,
  phase,
}: {
  radius: number
  height: number
  speed: number
  phase: number
}) {
  const group = useRef<THREE.Group>(null)
  const wingL = useRef<THREE.Mesh>(null)
  const wingR = useRef<THREE.Mesh>(null)
  const mat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: '#3d4448', side: THREE.DoubleSide, fog: true }),
    [],
  )

  useFrame(({ clock }) => {
    const t = clock.elapsedTime * speed + phase
    if (group.current) {
      group.current.position.set(Math.cos(t) * radius, height + Math.sin(t * 0.6) * 3.5, Math.sin(t) * radius - 70)
      group.current.rotation.y = -t
    }
    const flap = Math.sin(t * 5.5) * 0.55
    if (wingL.current) wingL.current.rotation.z = flap
    if (wingR.current) wingR.current.rotation.z = -flap
  })

  return (
    <group ref={group}>
      <mesh material={mat}>
        <sphereGeometry args={[0.22, 6, 5]} />
      </mesh>
      <mesh ref={wingL} position={[-0.35, 0, 0]} material={mat}>
        <planeGeometry args={[0.7, 0.22]} />
      </mesh>
      <mesh ref={wingR} position={[0.35, 0, 0]} rotation={[0, Math.PI, 0]} material={mat}>
        <planeGeometry args={[0.7, 0.22]} />
      </mesh>
    </group>
  )
}

function Birds() {
  const count = useGraphics((s) => (s.quality === 'low' ? 2 : 4))
  const birds = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        radius: 40 + i * 16,
        height: 22 + i * 6,
        speed: 0.045 + i * 0.012,
        phase: i * 2.1,
      })),
    [count],
  )
  return (
    <group>
      {birds.map((b, i) => (
        <Bird key={i} {...b} />
      ))}
    </group>
  )
}

/* ------------------------------------------------------------------ */
/*  Moored sampan                                                      */
/* ------------------------------------------------------------------ */

function Sampan({ x, z, rot, flip }: { x: number; z: number; rot: number; flip: number }) {
  const mats = useMemo(
    () => ({
      hull: new THREE.MeshStandardMaterial({ color: '#6b4a2a', roughness: 0.9 }),
      rim: new THREE.MeshStandardMaterial({ color: '#8a663c', roughness: 0.9 }),
      seat: new THREE.MeshStandardMaterial({ color: '#9c7a4a', roughness: 0.92 }),
    }),
    [],
  )
  const y = 0.12
  return (
    <group position={[x, y, z]} rotation={[0, rot, 0]} scale={[flip, 1, 1]}>
      {/* dugout hull: a long half-cylinder sunk to the waterline */}
      <mesh position={[0, -0.16, 0]} rotation={[0, 0, Math.PI / 2]} castShadow material={mats.hull}>
        <cylinderGeometry args={[0.28, 0.28, 3.1, 12, 1, false, 0, Math.PI]} />
      </mesh>
      {/* gunwale rails along both sides */}
      <mesh position={[0, 0.02, 0.27]} rotation={[0, 0, Math.PI / 2]} material={mats.rim}>
        <cylinderGeometry args={[0.035, 0.035, 3.0, 6]} />
      </mesh>
      <mesh position={[0, 0.02, -0.27]} rotation={[0, 0, Math.PI / 2]} material={mats.rim}>
        <cylinderGeometry args={[0.035, 0.035, 3.0, 6]} />
      </mesh>
      {/* cross seats */}
      {[-0.6, 0.5].map((z0, i) => (
        <mesh key={i} position={[0, 0.0, z0]} material={mats.seat}>
          <boxGeometry args={[0.62, 0.05, 0.16]} />
        </mesh>
      ))}
      {/* a leaning bamboo pole resting across the sampan */}
      <mesh position={[0.1, 0.18, 0]} rotation={[Math.PI / 2, 0, 0.12]} material={mats.rim}>
        <cylinderGeometry args={[0.025, 0.025, 3.4, 6]} />
      </mesh>
    </group>
  )
}

function Sampans() {
  const spots = useMemo(() => {
    const wanted: Array<{ cx: number; cz: number }> = [
      { cx: 40, cz: -22 },
      { cx: -46, cz: -70 },
    ]
    const out: Array<{ x: number; z: number; rot: number; flip: number }> = []
    wanted.forEach(({ cx, cz }, i) => {
      // walk out to the water's edge (t ~ 0) near the requested spot
      for (let k = 0; k < 400; k++) {
        const a = seededRandom(k * 1.9 + cx) * Math.PI * 2
        const r = Math.pow(seededRandom(k * 2.9 + cz), 0.6) * 22
        const x = cx + Math.cos(a) * r
        const z = cz + Math.sin(a) * r
        const s = sampleLand(x, z)
        if (Math.abs(s.t) < 0.9 && s.h < 2.0) {
          out.push({ x, z, rot: seededRandom(i * 5.1) * Math.PI * 2, flip: i % 2 === 0 ? 1 : -1 })
          break
        }
      }
    })
    return out
  }, [])

  return (
    <group>
      {spots.map((s, i) => (
        <Sampan key={i} {...s} />
      ))}
    </group>
  )
}

/* ------------------------------------------------------------------ */

export function Props() {
  const density = useGraphics((s) => s.settings.instancingDensity)
  const rocks = useMemo(() => scatterRocks(Math.round(150 * density), 89, 130), [density])
  const geoA = useMemo(() => rockGeometry(3.3), [])
  const geoB = useMemo(() => rockGeometry(11.7), [])

  const split = useMemo(() => {
    const a: Spot[] = []
    const b: Spot[] = []
    rocks.forEach((r, i) => (i % 2 === 0 ? a : b).push(r))
    return { a, b }
  }, [rocks])

  return (
    <group>
      <InstancedRocks geometry={geoA} spots={split.a} />
      <InstancedRocks geometry={geoB} spots={split.b} />
      <RockRipples rocks={rocks} />
      <Huts />
      <Sampans />
      <Birds />
    </group>
  )
}
