import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { terrainHeight, fbm, seededRandom, ridged } from './noise'

/* ------------------------------------------------------------------ */
/*  Terrain heightfield (vertex-coloured grass / soil / rock)         */
/* ------------------------------------------------------------------ */

export function Terrain() {
  const geometry = useMemo(() => {
    const SIZE = 150
    const SEG = 140
    const g = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG)
    g.rotateX(-Math.PI / 2)
    const pos = g.attributes.position as THREE.BufferAttribute
    const colors = new Float32Array(pos.count * 3)

    const grassLow = new THREE.Color('#4a6b32')
    const grassHigh = new THREE.Color('#6d8b45')
    const soil = new THREE.Color('#6b5638')
    const rock = new THREE.Color('#7c766a')
    const mud = new THREE.Color('#54603f')

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const z = pos.getZ(i)
      const h = terrainHeight(x, z)
      pos.setY(i, h)

      const riverDist = Math.abs(x)
      const slope = Math.abs(terrainHeight(x + 0.6, z) - terrainHeight(x - 0.6, z)) +
        Math.abs(terrainHeight(x, z + 0.6) - terrainHeight(x, z - 0.6))

      const c = new THREE.Color()
      if (riverDist < 8 && h < 0.2) {
        // riverbank mud
        c.copy(mud).lerp(grassLow, Math.min(1, riverDist / 8))
      } else if (slope > 1.3) {
        c.copy(rock)
      } else if (h > 5) {
        c.copy(grassHigh).lerp(rock, Math.min(1, (h - 5) / 8))
      } else {
        const n = fbm(x * 0.08, z * 0.08, 3)
        c.copy(grassLow).lerp(grassHigh, n)
        if (n < 0.28) c.lerp(soil, 0.4)
      }
      colors[i * 3] = c.r
      colors[i * 3 + 1] = c.g
      colors[i * 3 + 2] = c.b
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    g.computeVertexNormals()
    return g
  }, [])

  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial vertexColors roughness={0.96} metalness={0} />
    </mesh>
  )
}

/* ------------------------------------------------------------------ */
/*  Rice terraces — stepped, organic contour paddies                  */
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
  const stepH = 0.45
  const stepD = 1.55

  const stalkData = useMemo(() => {
    const arr: { m: THREE.Matrix4; c: THREE.Color }[] = []
    const dummy = new THREE.Object3D()
    const greens = ['#8fbf4e', '#7fae3f', '#a3cf60', '#95c256']
    for (let s = 0; s < steps; s++) {
      const w = width - s * 1.1
      const count = Math.round(w * 3.2)
      for (let i = 0; i < count; i++) {
        const seed = s * 977 + i
        const x = (i / Math.max(1, count - 1) - 0.5) * w + (seededRandom(seed) - 0.5) * 0.25
        const z = -s * stepD + (seededRandom(seed + 3) - 0.5) * 0.7
        const y = s * stepH + stepH / 2 + 0.28
        const sc = 0.7 + seededRandom(seed + 9) * 0.6
        dummy.position.set(x, y, z)
        dummy.rotation.set((seededRandom(seed + 11) - 0.5) * 0.4, 0, (seededRandom(seed + 17) - 0.5) * 0.4)
        dummy.scale.set(sc, sc, sc)
        dummy.updateMatrix()
        arr.push({ m: dummy.matrix.clone(), c: new THREE.Color(greens[Math.floor(seededRandom(seed + 23) * greens.length)]) })
      }
    }
    return arr
  }, [steps, width])

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
      mat.opacity = 0.72 + Math.sin(t * 1.4 + i) * 0.05
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
              <meshStandardMaterial color="#5e4a30" roughness={1} />
            </mesh>
            {/* flooded paddy water */}
            <mesh
              ref={(el) => {
                waterRefs.current[i] = el
              }}
              position={[0, i * stepH + 0.24, -i * stepD]}
              rotation={[-Math.PI / 2, 0, 0]}
              receiveShadow
            >
              <planeGeometry args={[w, stepD + 0.2]} />
              <meshStandardMaterial
                color="#8fc6d8"
                roughness={0.15}
                metalness={0.35}
                transparent
                opacity={0.75}
              />
            </mesh>
            {/* grassy bank between paddies */}
            <mesh position={[0, i * stepH + 0.28, -i * stepD - stepD / 2 - 0.1]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[w + 0.6, 0.5]} />
              <meshStandardMaterial color="#5f7d38" roughness={1} />
            </mesh>
          </group>
        )
      })}
      <instancedMesh
        ref={stalkRef}
        args={[undefined, undefined, stalkData.length]}
        castShadow
        receiveShadow
      >
        <planeGeometry args={[0.09, 0.62]} />
        <meshStandardMaterial vertexColors side={THREE.DoubleSide} roughness={0.85} />
      </instancedMesh>
    </group>
  )
}

/* ------------------------------------------------------------------ */
/*  Chaparral vegetation — instanced shrubs / bushes                  */
/* ------------------------------------------------------------------ */

function Shrubs() {
  const count = 200
  const ref = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    if (!ref.current) return
    const dummy = new THREE.Object3D()
    const c = new THREE.Color()
    const pal = ['#3f6b2a', '#4f7c33', '#356022', '#5b8a3a']
    for (let i = 0; i < count; i++) {
      const x = (seededRandom(i * 5 + 1) - 0.5) * 90
      const z = -35 + seededRandom(i * 7 + 2) * 80
      const s = 0.5 + seededRandom(i * 11 + 3) * 1.1
      if (Math.abs(x) < 9) {
        dummy.position.set(x, -50, z)
        dummy.scale.set(0.001, 0.001, 0.001)
        dummy.rotation.set(0, 0, 0)
      } else {
        const y = terrainHeight(x, z)
        dummy.position.set(x, y + s * 0.4, z)
        dummy.rotation.set(0, seededRandom(i * 13 + 4) * Math.PI, 0)
        dummy.scale.set(s, s * (0.7 + seededRandom(i * 17 + 5) * 0.5), s)
      }
      dummy.updateMatrix()
      ref.current.setMatrixAt(i, dummy.matrix)
      ref.current.setColorAt(i, c.set(pal[Math.floor(seededRandom(i * 19 + 6) * pal.length)]))
    }
    ref.current.instanceMatrix.needsUpdate = true
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true
  }, [])

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} castShadow receiveShadow>
      <icosahedronGeometry args={[0.9, 1]} />
      <meshStandardMaterial vertexColors roughness={1} flatShading />
    </instancedMesh>
  )
}

/* ------------------------------------------------------------------ */
/*  Natural scattered boulders & rocky outcrops                       */
/* ------------------------------------------------------------------ */

function Boulders() {
  const count = 70
  const ref = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    if (!ref.current) return
    const dummy = new THREE.Object3D()
    const c = new THREE.Color()
    const pal = ['#6f6a5e', '#7c766a', '#5f6b60', '#8a8578']
    for (let i = 0; i < count; i++) {
      const side = seededRandom(i * 3 + 1) > 0.5 ? 1 : -1
      const x = side * (3.6 + seededRandom(i * 5 + 2) * 16)
      const z = -4 - seededRandom(i * 7 + 3) * 34
      const s = 0.35 + seededRandom(i * 11 + 4) * 1.4
      dummy.position.set(x, -0.1 + seededRandom(i * 13 + 5) * 0.3, z)
      dummy.rotation.set(seededRandom(i * 17) * 0.6, seededRandom(i * 19 + 6) * Math.PI, seededRandom(i * 23 + 7) * 0.6)
      dummy.scale.set(s, s * 0.72, s * 0.95)
      dummy.updateMatrix()
      ref.current.setMatrixAt(i, dummy.matrix)
      ref.current.setColorAt(i, c.set(pal[Math.floor(seededRandom(i * 29 + 8) * pal.length)]))
    }
    ref.current.instanceMatrix.needsUpdate = true
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true
  }, [])

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} castShadow receiveShadow>
      <dodecahedronGeometry args={[1, 1]} />
      <meshStandardMaterial vertexColors roughness={1} flatShading />
    </instancedMesh>
  )
}

/* ------------------------------------------------------------------ */
/*  Tropical palms                                                    */
/* ------------------------------------------------------------------ */

function Palm({ position, scale = 1, lean = 0 }: { position: [number, number, number]; scale?: number; lean?: number }) {
  const group = useRef<THREE.Group>(null)
  const fronds = useMemo(() => {
    const arr: { rot: number; droop: number; len: number }[] = []
    for (let i = 0; i < 9; i++) {
      arr.push({
        rot: (i / 9) * Math.PI * 2 + seededRandom(i) * 0.3,
        droop: 0.4 + seededRandom(i + 5) * 0.6,
        len: 2.2 + seededRandom(i + 11) * 0.9,
      })
    }
    return arr
  }, [])

  useFrame(({ clock }) => {
    if (group.current) group.current.rotation.z = lean + Math.sin(clock.elapsedTime * 0.7 + position[0]) * 0.03
  })

  return (
    <group ref={group} position={position} scale={scale}>
      <mesh position={[0, 2.4, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.22, 4.8, 8]} />
        <meshStandardMaterial color="#8a6a3a" roughness={0.95} />
      </mesh>
      {fronds.map((f, i) => (
        <group key={i} rotation={[0, f.rot, 0]} position={[0, 4.7, 0]}>
          <mesh rotation={[f.droop, 0, 0]} position={[0, -Math.sin(f.droop) * f.len * 0.4, Math.cos(f.droop) * f.len * 0.45]} castShadow>
            <boxGeometry args={[0.42, 0.06, f.len]} />
            <meshStandardMaterial color={i % 2 ? '#2f7d38' : '#378f42'} roughness={0.85} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/* ------------------------------------------------------------------ */
/*  Layered tropical broadleaf trees                                  */
/* ------------------------------------------------------------------ */

function Tree({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  const group = useRef<THREE.Group>(null)
  const blobs = useMemo(() => {
    const arr: { p: [number, number, number]; r: number; c: string }[] = []
    const pal = ['#2f7d38', '#3a8f44', '#276b30', '#449a4e', '#358240']
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2
      arr.push({
        p: [Math.cos(a) * (0.5 + seededRandom(i) * 0.5), 2.6 + seededRandom(i + 3) * 1.2, Math.sin(a) * (0.5 + seededRandom(i + 7) * 0.5)],
        r: 1.0 + seededRandom(i + 11) * 0.7,
        c: pal[Math.floor(seededRandom(i + 13) * pal.length)],
      })
    }
    arr.push({ p: [0, 3.6, 0], r: 1.4, c: pal[0] })
    return arr
  }, [])

  useFrame(({ clock }) => {
    if (group.current) group.current.rotation.z = Math.sin(clock.elapsedTime * 0.9 + position[0]) * 0.012
  })

  return (
    <group ref={group} position={position} scale={scale}>
      <mesh position={[0, 1.5, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.34, 3.0, 9]} />
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
/*  Foreground reeds / river grass at the water's edge                */
/* ------------------------------------------------------------------ */

function Reeds() {
  const count = 160
  const ref = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    if (!ref.current) return
    const dummy = new THREE.Object3D()
    const c = new THREE.Color()
    for (let i = 0; i < count; i++) {
      const side = seededRandom(i * 3 + 1) > 0.5 ? 1 : -1
      const x = side * (6.4 + seededRandom(i * 5 + 2) * 2.2)
      const z = 2 - seededRandom(i * 7 + 3) * 24
      const s = 0.6 + seededRandom(i * 11 + 4) * 0.8
      dummy.position.set(x, 0.1 + seededRandom(i * 13) * 0.2, z)
      dummy.rotation.set((seededRandom(i * 17) - 0.5) * 0.3, seededRandom(i * 19) * Math.PI, (seededRandom(i * 23) - 0.5) * 0.3)
      dummy.scale.set(s, s * 1.6, s)
      dummy.updateMatrix()
      ref.current.setMatrixAt(i, dummy.matrix)
      ref.current.setColorAt(i, c.set(seededRandom(i * 29) > 0.5 ? '#6f9a3e' : '#83ab4a'))
    }
    ref.current.instanceMatrix.needsUpdate = true
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true
  }, [])

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} castShadow>
      <coneGeometry args={[0.12, 1.0, 4]} />
      <meshStandardMaterial vertexColors roughness={0.9} />
    </instancedMesh>
  )
}

/* ------------------------------------------------------------------ */
/*  Simple thatched village houses                                    */
/* ------------------------------------------------------------------ */

function House({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh castShadow receiveShadow position={[0, 0.55, 0]}>
        <boxGeometry args={[1.6, 1.1, 1.6]} />
        <meshStandardMaterial color="#d8c39a" roughness={0.95} />
      </mesh>
      <mesh castShadow position={[0, 1.5, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[1.5, 1.0, 4]} />
        <meshStandardMaterial color="#7a4a28" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.5, 0.82]}>
        <boxGeometry args={[0.36, 0.7, 0.06]} />
        <meshStandardMaterial color="#4f3319" />
      </mesh>
      <mesh position={[0.5, 0.7, 0.82]}>
        <boxGeometry args={[0.3, 0.3, 0.06]} />
        <meshStandardMaterial color="#9ad0e0" emissive="#3a6d7c" emissiveIntensity={0.2} />
      </mesh>
    </group>
  )
}

/* ------------------------------------------------------------------ */
/*  Distant layered mountains for horizon depth                       */
/* ------------------------------------------------------------------ */

function Mountains() {
  const ridges = useMemo(() => {
    const arr: { geo: THREE.BufferGeometry; z: number; color: THREE.Color; x: number; y: number }[] = []
    const palette = ['#5b7160', '#4e6755', '#69806c', '#43584a', '#7a8f7c']
    const layers = [
      { z: -70, base: 14, peaks: 9, spread: 90, col: 0 },
      { z: -95, base: 22, peaks: 11, spread: 130, col: 1 },
      { z: -125, base: 32, peaks: 13, spread: 175, col: 3 },
    ]
    layers.forEach((L, li) => {
      const g = new THREE.PlaneGeometry(L.spread, L.base, 120, 24)
      const pos = g.attributes.position as THREE.BufferAttribute
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i)
        const y = pos.getY(i)
        // keep top edge low, raise bottom into silhouette using ridged noise
        const t = (y + L.base / 2) / L.base // 0 bottom -> 1 top
        const ridge = ridged((x + li * 100) * 0.012 + li * 3, li * 5, 5)
        const peak = Math.pow(t, 0.6) * ridge * L.peaks
        pos.setZ(i, peak)
      }
      g.computeVertexNormals()
      arr.push({ geo: g, z: L.z, color: new THREE.Color(palette[L.col]), x: 0, y: L.base / 2 - 6 })
    })
    return arr
  }, [])

  return (
    <group>
      {ridges.map((r, i) => (
        <mesh key={i} geometry={r.geo} position={[r.x, r.y, r.z]} receiveShadow={false}>
          <meshStandardMaterial color={r.color} roughness={1} flatShading />
        </mesh>
      ))}
    </group>
  )
}

/* ------------------------------------------------------------------ */
/*  Aggregate                                                         */
/* ------------------------------------------------------------------ */

export function Environment() {
  const trees: { pos: [number, number, number]; s: number }[] = useMemo(() => {
    const arr: { pos: [number, number, number]; s: number }[] = []
    const spots: [number, number][] = [
      [-8.5, -8], [9, -9], [-11, -13], [11.5, -12], [-14, -17], [14, -16],
      [-18, -22], [18, -21], [-9, -24], [10, -25], [-22, -28], [22, -27],
    ]
    spots.forEach(([x, z], i) => {
      arr.push({ pos: [x, terrainHeight(x, z), z], s: 0.9 + seededRandom(i * 4) * 0.7 })
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

      <Boulders />
      <Shrubs />
      <Reeds />

      <Palm position={[-6.5, -0.05, -9]} scale={1.1} lean={-0.05} />
      <Palm position={[6.8, -0.05, -10]} scale={1.15} lean={0.06} />
      <Palm position={[-9.5, 0.2, -15]} scale={0.95} lean={-0.03} />

      {trees.map((t, i) => (
        <Tree key={i} position={t.pos} scale={t.s} />
      ))}

      <House position={[-8, terrainHeight(-8, -15), -15]} rotation={0.4} />
      <House position={[-10.2, terrainHeight(-10.2, -17), -17]} rotation={-0.3} />
      <House position={[9, terrainHeight(9, -16), -16]} rotation={-0.5} />
      <House position={[11.2, terrainHeight(11.2, -18), -18]} rotation={0.2} />
    </group>
  )
}
