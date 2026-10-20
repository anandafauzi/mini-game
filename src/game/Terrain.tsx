import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { terrainHeight, fbm, seededRandom, ridged } from './noise'
import { useGraphics } from '../lib/graphics'

/* ------------------------------------------------------------------ */
/*  Shared materials (reused to reduce draw-state changes)            */
/* ------------------------------------------------------------------ */

const matTerrain = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.95,
  metalness: 0,
})
const matRock = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0.02, flatShading: true })
const matFoliage = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0, flatShading: true })
const matGrass = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0, side: THREE.DoubleSide })

/* ------------------------------------------------------------------ */
/*  Terrain heightfield (vertex-coloured grass / soil / rock)         */
/* ------------------------------------------------------------------ */

export function Terrain() {
  const segments = useGraphics((s) => s.settings.terrainSegments)
  const geometry = useMemo(() => {
    const SIZE = 170
    const SEG = segments
    const g = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG)
    g.rotateX(-Math.PI / 2)
    const pos = g.attributes.position as THREE.BufferAttribute
    const colors = new Float32Array(pos.count * 3)

    const grassLow = new THREE.Color('#456b2e')
    const grassMid = new THREE.Color('#5c8340')
    const grassHigh = new THREE.Color('#76a04f')
    const soil = new THREE.Color('#6b5638')
    const rock = new THREE.Color('#7d776a')
    const mud = new THREE.Color('#4f5a3c')
    const sandEdge = new THREE.Color('#8f8a70')

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const z = pos.getZ(i)
      const h = terrainHeight(x, z)
      pos.setY(i, h)

      const riverDist = Math.abs(x)
      const slope =
        Math.abs(terrainHeight(x + 0.7, z) - terrainHeight(x - 0.7, z)) +
        Math.abs(terrainHeight(x, z + 0.7) - terrainHeight(x, z - 0.7))

      const c = new THREE.Color()
      const patch = fbm(x * 0.07 + 5, z * 0.07 + 9, 3)
      if (riverDist < 7.2 && h < 0.25) {
        // wet sand / mud at the waterline blending to grass
        c.copy(sandEdge).lerp(mud, Math.min(1, riverDist / 7.2))
        c.lerp(grassLow, Math.max(0, (riverDist - 4.5) / 4) * 0.6)
      } else if (slope > 1.5) {
        c.copy(rock).lerp(soil, patch * 0.3)
      } else if (h > 6) {
        c.copy(grassHigh).lerp(rock, Math.min(1, (h - 6) / 10))
      } else {
        c.copy(grassLow).lerp(grassMid, patch)
        c.lerp(grassHigh, Math.max(0, (h - 1) / 8))
        if (patch < 0.3) c.lerp(soil, 0.35)
      }
      colors[i * 3] = c.r
      colors[i * 3 + 1] = c.g
      colors[i * 3 + 2] = c.b
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    g.computeVertexNormals()
    return g
  }, [segments])

  return <mesh geometry={geometry} material={matTerrain} receiveShadow />
}

/* ------------------------------------------------------------------ */
/*  Rice terraces — stepped, organic contour paddies with berms       */
/* ------------------------------------------------------------------ */

function TerraceField({
  position,
  rotation = 0,
  steps = 6,
  width = 12,
}: {
  position: [number, number, number]
  rotation?: number
  steps?: number
  width?: number
}) {
  const density = useGraphics((s) => s.settings.instancingDensity)
  const stepH = 0.42
  const stepD = 1.5

  const stalkData = useMemo(() => {
    const arr: { m: THREE.Matrix4; c: THREE.Color }[] = []
    const dummy = new THREE.Object3D()
    const greens = ['#8fbf4e', '#7fae3f', '#a3cf60', '#95c256', '#b6d873', '#86b648']
    for (let s = 0; s < steps; s++) {
      const w = width - s * 1.1
      const count = Math.round(w * 3.6 * density)
      for (let i = 0; i < count; i++) {
        const seed = s * 977 + i
        const x = (i / Math.max(1, count - 1) - 0.5) * w + (seededRandom(seed) - 0.5) * 0.25
        const z = -s * stepD + (seededRandom(seed + 3) - 0.5) * 0.7
        const y = s * stepH + stepH / 2 + 0.28
        const sc = 0.65 + seededRandom(seed + 9) * 0.6
        dummy.position.set(x, y, z)
        dummy.rotation.set((seededRandom(seed + 11) - 0.5) * 0.4, 0, (seededRandom(seed + 17) - 0.5) * 0.4)
        dummy.scale.set(sc, sc * (0.9 + seededRandom(seed + 5) * 0.3), sc)
        dummy.updateMatrix()
        arr.push({ m: dummy.matrix.clone(), c: new THREE.Color(greens[Math.floor(seededRandom(seed + 23) * greens.length)]) })
      }
    }
    return arr
  }, [steps, width, density])

  const stalkRef = useRef<THREE.InstancedMesh>(null)
  const waterRefs = useRef<(THREE.Mesh | null)[]>([])

  useLayoutEffect(() => {
    if (!stalkRef.current) return
    stalkData.forEach((d, i) => {
      stalkRef.current!.setMatrixAt(i, d.m)
      stalkRef.current!.setColorAt(i, d.c)
    })
    stalkRef.current.instanceMatrix.needsUpdate = true
    if (stalkRef.current.instanceColor) stalkRef.current.instanceColor.needsUpdate = true
  }, [stalkData])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    waterRefs.current.forEach((m, i) => {
      if (!m) return
      const mat = m.material as THREE.MeshStandardMaterial
      mat.opacity = 0.7 + Math.sin(t * 1.4 + i) * 0.05
      // subtle ripple shimmer
      const hs = m.position.y
      m.position.y = hs
    })
  })

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {Array.from({ length: steps }).map((_, i) => {
        const w = width - i * 1.1
        return (
          <group key={i}>
            {/* earthen embankment / riser */}
            <mesh position={[0, i * stepH - stepH / 2, -i * stepD]} receiveShadow castShadow>
              <boxGeometry args={[w + 0.6, stepH, stepD + 0.3]} />
              <meshStandardMaterial color="#6a5236" roughness={1} />
            </mesh>
            {/* pematang: grassy top edge of each berm */}
            <mesh position={[0, i * stepH + 0.02, -i * stepD - stepD / 2 - 0.12]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[w + 0.7, 0.45]} />
              <meshStandardMaterial color="#66803c" roughness={1} />
            </mesh>
            {/* flooded paddy water */}
            <mesh
              ref={(el) => {
                waterRefs.current[i] = el
              }}
              position={[0, i * stepH + 0.2, -i * stepD]}
              rotation={[-Math.PI / 2, 0, 0]}
              receiveShadow
            >
              <planeGeometry args={[w, stepD + 0.2]} />
              <meshStandardMaterial
                color="#8fc2d2"
                roughness={0.12}
                metalness={0.4}
                transparent
                opacity={0.72}
                envMapIntensity={1.2}
              />
            </mesh>
          </group>
        )
      })}
      {/* small irrigation channel running alongside the field */}
      <mesh position={[width / 2 + 1.4, 0.34, -steps * stepD * 0.4]} receiveShadow>
        <boxGeometry args={[0.5, 0.6, steps * stepD + 1]} />
        <meshStandardMaterial color="#7a6248" roughness={1} />
      </mesh>
      <mesh position={[width / 2 + 1.4, 0.52, -steps * stepD * 0.4]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.4, steps * stepD]} />
        <meshStandardMaterial color="#7fb8c8" roughness={0.15} metalness={0.4} transparent opacity={0.7} />
      </mesh>

      <instancedMesh
        ref={stalkRef}
        args={[undefined, undefined, stalkData.length]}
        castShadow
        receiveShadow
      >
        <planeGeometry args={[0.08, 0.7]} />
        <primitive object={matGrass} attach="material" />
      </instancedMesh>
    </group>
  )
}

/* ------------------------------------------------------------------ */
/*  Instanced vegetation groups                                       */
/* ------------------------------------------------------------------ */

function Shrubs() {
  const density = useGraphics((s) => s.settings.instancingDensity)
  const count = Math.round(240 * density)
  const ref = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    if (!ref.current) return
    const dummy = new THREE.Object3D()
    const c = new THREE.Color()
    const pal = ['#3f6b2a', '#4f7c33', '#356022', '#5b8a3a', '#467630']
    for (let i = 0; i < count; i++) {
      const x = (seededRandom(i * 5 + 1) - 0.5) * 100
      const z = -40 + seededRandom(i * 7 + 2) * 90
      const s = 0.5 + seededRandom(i * 11 + 3) * 1.2
      if (Math.abs(x) < 9) {
        dummy.position.set(x, -50, z)
        dummy.scale.set(0.001, 0.001, 0.001)
        dummy.rotation.set(0, 0, 0)
      } else {
        const y = terrainHeight(x, z)
        dummy.position.set(x, y + s * 0.35, z)
        dummy.rotation.set(0, seededRandom(i * 13 + 4) * Math.PI, 0)
        dummy.scale.set(s, s * (0.6 + seededRandom(i * 17 + 5) * 0.5), s)
      }
      dummy.updateMatrix()
      ref.current.setMatrixAt(i, dummy.matrix)
      ref.current.setColorAt(i, c.set(pal[Math.floor(seededRandom(i * 19 + 6) * pal.length)]))
    }
    ref.current.instanceMatrix.needsUpdate = true
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true
  }, [count])

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} castShadow receiveShadow>
      <icosahedronGeometry args={[0.85, 1]} />
      <primitive object={matFoliage} attach="material" />
    </instancedMesh>
  )
}

/** Mossy riverbank rocks — varied size, shape, with green moss tinting. */
function RiverRocks() {
  const density = useGraphics((s) => s.settings.instancingDensity)
  const count = Math.round(120 * density)
  const ref = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    if (!ref.current) return
    const dummy = new THREE.Object3D()
    const c = new THREE.Color()
    const rockPal = ['#6f6a5e', '#7c766a', '#5f6b60', '#8a8578', '#736f63']
    const moss = new THREE.Color('#4c6a35')
    for (let i = 0; i < count; i++) {
      const side = seededRandom(i * 3 + 1) > 0.5 ? 1 : -1
      // hug the waterline, bigger ones at the edge
      const x = side * (3.2 + seededRandom(i * 5 + 2) * 12)
      const z = -2 - seededRandom(i * 7 + 3) * 30
      const s = 0.3 + seededRandom(i * 11 + 4) * 1.5
      dummy.position.set(x, -0.05 + seededRandom(i * 13 + 5) * 0.25, z)
      dummy.rotation.set(seededRandom(i * 17) * 0.7, seededRandom(i * 19 + 6) * Math.PI, seededRandom(i * 23 + 7) * 0.7)
      dummy.scale.set(s, s * (0.65 + seededRandom(i * 31) * 0.3), s * (0.85 + seededRandom(i * 37) * 0.3))
      dummy.updateMatrix()
      ref.current.setMatrixAt(i, dummy.matrix)
      const col = c.set(rockPal[Math.floor(seededRandom(i * 29 + 8) * rockPal.length)])
      if (seededRandom(i * 41) > 0.55) col.lerp(moss, 0.35 + seededRandom(i * 43) * 0.3)
      ref.current.setColorAt(i, col)
    }
    ref.current.instanceMatrix.needsUpdate = true
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true
  }, [count])

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} castShadow receiveShadow>
      <dodecahedronGeometry args={[1, 1]} />
      <primitive object={matRock} attach="material" />
    </instancedMesh>
  )
}

/* ------------------------------------------------------------------ */
/*  Tropical palms (canopy sways in the wind)                         */
/* ------------------------------------------------------------------ */

function Palm({ position, scale = 1, lean = 0 }: { position: [number, number, number]; scale?: number; lean?: number }) {
  const group = useRef<THREE.Group>(null)
  const fronds = useMemo(() => {
    const arr: { rot: number; droop: number; len: number; phase: number }[] = []
    for (let i = 0; i < 10; i++) {
      arr.push({
        rot: (i / 10) * Math.PI * 2 + seededRandom(i) * 0.3,
        droop: 0.35 + seededRandom(i + 5) * 0.65,
        len: 2.3 + seededRandom(i + 11) * 1.0,
        phase: seededRandom(i + 19) * Math.PI * 2,
      })
    }
    return arr
  }, [])

  useFrame(({ clock }) => {
    if (!group.current) return
    const t = clock.elapsedTime
    group.current.rotation.z = lean + Math.sin(t * 0.7 + position[0]) * 0.025
    group.current.children.forEach((child, i) => {
      if (i === 0) return
      child.rotation.x = Math.sin(t * 1.1 + i * 0.7) * 0.05
    })
  })

  return (
    <group ref={group} position={position} scale={scale}>
      <mesh position={[0, 2.4, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.22, 4.8, 8]} />
        <meshStandardMaterial color="#8a6a3a" roughness={0.95} />
      </mesh>
      {fronds.map((f, i) => (
        <group key={i} rotation={[0, f.rot, 0]} position={[0, 4.7, 0]}>
          <mesh
            rotation={[f.droop, 0, 0]}
            position={[0, -Math.sin(f.droop) * f.len * 0.4, Math.cos(f.droop) * f.len * 0.45]}
            castShadow
          >
            <boxGeometry args={[0.4, 0.05, f.len]} />
            <meshStandardMaterial color={i % 2 ? '#2f7d38' : '#378f42'} roughness={0.85} />
          </mesh>
        </group>
      ))}
      {/* coconut cluster */}
      {[0, 1, 2].map((i) => (
        <mesh key={`c${i}`} position={[Math.cos(i * 2) * 0.18, 4.55, Math.sin(i * 2) * 0.18]} castShadow>
          <sphereGeometry args={[0.11, 8, 8]} />
          <meshStandardMaterial color="#5c4326" roughness={0.9} />
        </mesh>
      ))}
    </group>
  )
}

/* ------------------------------------------------------------------ */
/*  Layered tropical broadleaf trees with sway                        */
/* ------------------------------------------------------------------ */

function Tree({ position, scale = 1, seed = 0 }: { position: [number, number, number]; scale?: number; seed?: number }) {
  const group = useRef<THREE.Group>(null)
  const blobs = useMemo(() => {
    const arr: { p: [number, number, number]; r: number; c: string }[] = []
    const pal = ['#2f7d38', '#3a8f44', '#276b30', '#449a4e', '#358240', '#4aa254']
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + seed
      arr.push({
        p: [
          Math.cos(a) * (0.5 + seededRandom(i + seed) * 0.6),
          2.6 + seededRandom(i + 3 + seed) * 1.4,
          Math.sin(a) * (0.5 + seededRandom(i + 7 + seed) * 0.6),
        ],
        r: 1.0 + seededRandom(i + 11 + seed) * 0.8,
        c: pal[Math.floor(seededRandom(i + 13 + seed) * pal.length)],
      })
    }
    arr.push({ p: [0, 3.7, 0], r: 1.5, c: pal[0] })
    return arr
  }, [seed])

  useFrame(({ clock }) => {
    if (group.current) group.current.rotation.z = Math.sin(clock.elapsedTime * 0.9 + position[0]) * 0.014
  })

  return (
    <group ref={group} position={position} scale={scale}>
      <mesh position={[0, 1.5, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.34, 3.0, 9]} />
        <meshStandardMaterial color="#5c3e22" roughness={1} />
      </mesh>
      {blobs.map((b, i) => (
        <mesh key={i} position={b.p} castShadow>
          <icosahedronGeometry args={[b.r, 1]} />
          <meshStandardMaterial color={b.c} roughness={0.9} flatShading />
        </mesh>
      ))}
    </group>
  )
}

/* ------------------------------------------------------------------ */
/*  Bamboo clumps                                                     */
/* ------------------------------------------------------------------ */

function BambooClump({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  const group = useRef<THREE.Group>(null)
  const stalks = useMemo(() => {
    const arr: { x: number; z: number; h: number; lean: number; phase: number }[] = []
    for (let i = 0; i < 14; i++) {
      arr.push({
        x: (seededRandom(i * 3) - 0.5) * 1.2,
        z: (seededRandom(i * 5 + 1) - 0.5) * 1.2,
        h: 5 + seededRandom(i * 7 + 2) * 4,
        lean: (seededRandom(i * 11 + 3) - 0.5) * 0.14,
        phase: seededRandom(i * 13 + 4) * Math.PI * 2,
      })
    }
    return arr
  }, [])

  useFrame(({ clock }) => {
    if (!group.current) return
    const t = clock.elapsedTime
    group.current.children.forEach((c, i) => {
      c.rotation.z = stalks[i].lean + Math.sin(t * 0.8 + stalks[i].phase) * 0.03
    })
  })

  return (
    <group ref={group} position={position} scale={scale}>
      {stalks.map((s, i) => (
        <group key={i} position={[s.x, 0, s.z]}>
          <mesh position={[0, s.h / 2, 0]} castShadow>
            <cylinderGeometry args={[0.06, 0.07, s.h, 6]} />
            <meshStandardMaterial color={i % 2 ? '#6f9a3e' : '#7ea846'} roughness={0.8} />
          </mesh>
          {[0.55, 0.85].map((f, j) => (
            <mesh key={j} position={[0, s.h * f, 0]} castShadow>
              <icosahedronGeometry args={[0.55, 0]} />
              <meshStandardMaterial color="#4f8b33" roughness={0.9} flatShading />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}

/* ------------------------------------------------------------------ */
/*  Foreground reeds / river grass at the water's edge                */
/* ------------------------------------------------------------------ */

function Reeds() {
  const density = useGraphics((s) => s.settings.instancingDensity)
  const count = Math.round(200 * density)
  const ref = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    if (!ref.current) return
    const dummy = new THREE.Object3D()
    const c = new THREE.Color()
    const pal = ['#6f9a3e', '#83ab4a', '#5e8a34', '#94b858']
    for (let i = 0; i < count; i++) {
      const side = seededRandom(i * 3 + 1) > 0.5 ? 1 : -1
      const x = side * (6.2 + seededRandom(i * 5 + 2) * 2.6)
      const z = 3 - seededRandom(i * 7 + 3) * 30
      const s = 0.6 + seededRandom(i * 11 + 4) * 0.9
      dummy.position.set(x, 0.05 + seededRandom(i * 13) * 0.2, z)
      dummy.rotation.set((seededRandom(i * 17) - 0.5) * 0.35, seededRandom(i * 19) * Math.PI, (seededRandom(i * 23) - 0.5) * 0.35)
      dummy.scale.set(s, s * (1.4 + seededRandom(i * 27) * 0.7), s)
      dummy.updateMatrix()
      ref.current.setMatrixAt(i, dummy.matrix)
      ref.current.setColorAt(i, c.set(pal[Math.floor(seededRandom(i * 29) * pal.length)]))
    }
    ref.current.instanceMatrix.needsUpdate = true
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true
  }, [count])

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} castShadow>
      <coneGeometry args={[0.1, 1.0, 4]} />
      <primitive object={matGrass} attach="material" />
    </instancedMesh>
  )
}

/* ------------------------------------------------------------------ */
/*  Ground grass tufts near the bank                                  */
/* ------------------------------------------------------------------ */

function GrassTufts() {
  const density = useGraphics((s) => s.settings.instancingDensity)
  const count = Math.round(300 * density)
  const ref = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    if (!ref.current) return
    const dummy = new THREE.Object3D()
    const c = new THREE.Color()
    const pal = ['#5f8a34', '#709a40', '#547d2c', '#83ab4a']
    for (let i = 0; i < count; i++) {
      const x = (seededRandom(i * 3 + 1) - 0.5) * 26
      const z = 6 - seededRandom(i * 5 + 2) * 26
      const s = 0.4 + seededRandom(i * 7 + 3) * 0.7
      dummy.position.set(x, terrainHeight(x, z) + 0.25, z)
      dummy.rotation.set(0, seededRandom(i * 11) * Math.PI, (seededRandom(i * 13) - 0.5) * 0.2)
      dummy.scale.set(s, s * 1.1, s)
      dummy.updateMatrix()
      ref.current.setMatrixAt(i, dummy.matrix)
      ref.current.setColorAt(i, c.set(pal[Math.floor(seededRandom(i * 17) * pal.length)]))
    }
    ref.current.instanceMatrix.needsUpdate = true
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true
  }, [count])

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} receiveShadow>
      <coneGeometry args={[0.14, 0.7, 4]} />
      <primitive object={matGrass} attach="material" />
    </instancedMesh>
  )
}

/* ------------------------------------------------------------------ */
/*  Thatched village hut with wooden posts                            */
/* ------------------------------------------------------------------ */

function Hut({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* stilted wooden platform */}
      <mesh castShadow receiveShadow position={[0, 0.7, 0]}>
        <boxGeometry args={[1.9, 0.16, 1.7]} />
        <meshStandardMaterial color="#7a5a34" roughness={0.9} />
      </mesh>
      {[[-0.8, -0.7], [0.8, -0.7], [-0.8, 0.7], [0.8, 0.7]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.35, z]} castShadow>
          <cylinderGeometry args={[0.07, 0.07, 0.7, 6]} />
          <meshStandardMaterial color="#5c4326" roughness={1} />
        </mesh>
      ))}
      {/* bamboo walls */}
      <mesh castShadow receiveShadow position={[0, 1.35, 0]}>
        <boxGeometry args={[1.8, 1.1, 1.6]} />
        <meshStandardMaterial color="#c8b184" roughness={0.95} />
      </mesh>
      {/* thatched roof */}
      <mesh castShadow position={[0, 2.35, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[1.7, 1.1, 4]} />
        <meshStandardMaterial color="#8a5a2e" roughness={0.95} />
      </mesh>
      {/* door + window */}
      <mesh position={[0, 1.1, 0.82]}>
        <boxGeometry args={[0.42, 0.8, 0.06]} />
        <meshStandardMaterial color="#4f3319" roughness={0.9} />
      </mesh>
      <mesh position={[0.55, 1.45, 0.82]}>
        <boxGeometry args={[0.34, 0.34, 0.06]} />
        <meshStandardMaterial color="#9ad0e0" emissive="#3a6d7c" emissiveIntensity={0.25} roughness={0.3} />
      </mesh>
    </group>
  )
}

/* ------------------------------------------------------------------ */
/*  Distant layered mountains — irregular contour + atmospheric fog   */
/* ------------------------------------------------------------------ */

function Mountains() {
  const ridges = useMemo(() => {
    const arr: { geo: THREE.BufferGeometry; z: number; color: THREE.Color; x: number; y: number }[] = []
    // bluish-green palette, desaturated with distance for aerial perspective
    const palette = ['#6d8068', '#5c7259', '#556a63', '#465a55', '#3f5350']
    const layers = [
      { z: -78, base: 16, peaks: 11, spread: 110, col: 0, seed: 1 },
      { z: -108, base: 26, peaks: 14, spread: 160, col: 2, seed: 7 },
      { z: -145, base: 38, peaks: 17, spread: 220, col: 4, seed: 13 },
    ]
    layers.forEach((L) => {
      const g = new THREE.PlaneGeometry(L.spread, L.base, 140, 28)
      const pos = g.attributes.position as THREE.BufferAttribute
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i)
        const y = pos.getY(i)
        const t = (y + L.base / 2) / L.base // 0 bottom -> 1 top
        // irregular silhouette: ridged noise + secondary detail
        const r1 = ridged((x + L.seed * 100) * 0.012, L.seed * 5, 5)
        const r2 = ridged((x + L.seed * 100) * 0.035 + 50, L.seed * 9, 4)
        const ridge = r1 * 0.75 + r2 * 0.35
        const peak = Math.pow(t, 0.55) * ridge * L.peaks
        pos.setZ(i, peak)
      }
      g.computeVertexNormals()
      arr.push({ geo: g, z: L.z, color: new THREE.Color(palette[L.col]), x: 0, y: L.base / 2 - 7 })
    })
    return arr
  }, [])

  return (
    <group>
      {ridges.map((r, i) => (
        <mesh key={i} geometry={r.geo} position={[r.x, r.y, r.z]}>
          <meshStandardMaterial color={r.color} roughness={1} flatShading fog />
        </mesh>
      ))}
    </group>
  )
}

/* ------------------------------------------------------------------ */
/*  Aggregate                                                         */
/* ------------------------------------------------------------------ */

export function Environment() {
  const trees = useMemo(() => {
    const arr: { pos: [number, number, number]; s: number; seed: number }[] = []
    const spots: [number, number][] = [
      [-8.5, -8], [9, -9], [-11, -13], [11.5, -12], [-14, -17], [14, -16],
      [-18, -22], [18, -21], [-9, -24], [10, -25], [-22, -28], [22, -27],
      [-16, -30], [16, -31], [-25, -18], [24, -19],
    ]
    spots.forEach(([x, z], i) => {
      arr.push({ pos: [x, terrainHeight(x, z), z], s: 0.9 + seededRandom(i * 4) * 0.8, seed: i * 3 })
    })
    return arr
  }, [])

  return (
    <group>
      <Terrain />
      <Mountains />

      {/* terraced rice paddies flanking the valley */}
      <TerraceField position={[-13, 0.4, -12]} rotation={0.25} steps={7} width={13} />
      <TerraceField position={[13, 0.4, -13]} rotation={-0.25} steps={7} width={13} />
      <TerraceField position={[-20, 1.2, -20]} rotation={0.5} steps={5} width={10} />
      <TerraceField position={[20, 1.2, -21]} rotation={-0.5} steps={5} width={10} />

      <RiverRocks />
      <Shrubs />
      <Reeds />
      <GrassTufts />

      <Palm position={[-6.5, -0.05, -9]} scale={1.1} lean={-0.05} />
      <Palm position={[6.8, -0.05, -10]} scale={1.15} lean={0.06} />
      <Palm position={[-9.5, 0.2, -15]} scale={0.95} lean={-0.03} />
      <Palm position={[10.5, 0.3, -20]} scale={1.0} lean={0.04} />

      <BambooClump position={[-7.5, -0.05, -6]} scale={1} />
      <BambooClump position={[8.2, -0.05, -7]} scale={1.05} />

      {trees.map((t, i) => (
        <Tree key={i} position={t.pos} scale={t.s} seed={t.seed} />
      ))}

      <Hut position={[-8, terrainHeight(-8, -15), -15]} rotation={0.4} />
      <Hut position={[-10.2, terrainHeight(-10.2, -17), -17]} rotation={-0.3} />
      <Hut position={[9, terrainHeight(9, -16), -16]} rotation={-0.5} />
      <Hut position={[11.2, terrainHeight(11.2, -18), -18]} rotation={0.2} />
    </group>
  )
}
