import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { seededRandom, fbm } from './noise'

/**
 * Riverbed seen through the clear water: layered sand/gravel, scattered
 * pebbles and underwater stones with a subtle caustic look.
 */
export function Riverbed() {
  const floor = useMemo(() => {
    const g = new THREE.PlaneGeometry(16.5, 44, 60, 120)
    g.rotateX(-Math.PI / 2)
    const pos = g.attributes.position as THREE.BufferAttribute
    const colors = new Float32Array(pos.count * 3)
    const sand = new THREE.Color('#8b8d78')
    const gravel = new THREE.Color('#6e7364')
    const dark = new THREE.Color('#4c5a4c')
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const z = pos.getZ(i)
      const n = fbm(x * 0.35, z * 0.35, 3)
      pos.setY(i, -0.42 + (n - 0.5) * 0.14)
      const c = new THREE.Color().copy(sand).lerp(gravel, n)
      if (Math.abs(x) < 5) c.lerp(dark, 0.35)
      colors[i * 3] = c.r
      colors[i * 3 + 1] = c.g
      colors[i * 3 + 2] = c.b
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    g.computeVertexNormals()
    return g
  }, [])

  const stones = useMemo(() => {
    const arr: { pos: [number, number, number]; s: number; rot: [number, number, number]; c: string }[] = []
    const palette = ['#7c8a86', '#6a7570', '#8b9488', '#5d6b68', '#96917f', '#a89a86']
    for (let i = 0; i < 130; i++) {
      const x = (seededRandom(i * 3 + 1) - 0.5) * 14
      const z = -8 + (seededRandom(i * 5 + 2) - 0.5) * 34
      const s = 0.1 + seededRandom(i * 7 + 3) * 0.4
      arr.push({
        pos: [x, -0.34 + seededRandom(i * 11 + 4) * 0.12, z],
        s,
        rot: [seededRandom(i * 13) * 0.5, seededRandom(i * 17 + 5) * Math.PI * 2, seededRandom(i * 19) * 0.5],
        c: palette[Math.floor(seededRandom(i * 23 + 6) * palette.length)],
      })
    }
    return arr
  }, [])

  const pebbles = useMemo(() => {
    const ref: { pos: [number, number, number]; s: number; c: string }[] = []
    const pal = ['#8a8677', '#9a9484', '#7d7a6c', '#a49b88']
    for (let i = 0; i < 400; i++) {
      const x = (seededRandom(i * 19 + 7) - 0.5) * 15.5
      const z = -8 + (seededRandom(i * 23 + 8) - 0.5) * 38
      ref.push({
        pos: [x, -0.4 + seededRandom(i * 29 + 9) * 0.07, z],
        s: 0.03 + seededRandom(i * 31 + 10) * 0.11,
        c: pal[Math.floor(seededRandom(i * 37 + 11) * pal.length)],
      })
    }
    return ref
  }, [])

  return (
    <group>
      <mesh geometry={floor} position={[0, 0, -8]} receiveShadow>
        <meshStandardMaterial vertexColors roughness={1} />
      </mesh>

      {stones.map((st, i) => (
        <mesh key={`st${i}`} position={st.pos} rotation={st.rot} scale={[st.s, st.s * 0.72, st.s * 0.95]} castShadow>
          <dodecahedronGeometry args={[1, 1]} />
          <meshStandardMaterial color={st.c} roughness={0.95} flatShading />
        </mesh>
      ))}
      {pebbles.map((p, i) => (
        <mesh key={`pb${i}`} position={p.pos} scale={[p.s, p.s * 0.65, p.s]}>
          <icosahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={p.c} roughness={1} flatShading />
        </mesh>
      ))}
    </group>
  )
}

/**
 * Rapids / whitewater where the current breaks over submerged rocks,
 * plus a few protruding boulders silhouetted against the water.
 */
export function Rapids() {
  const foamRef = useRef<THREE.Group>(null)
  const foam = useMemo(
    () => [
      { pos: [-3.4, 0.1, -11] as [number, number, number], s: 1.3 },
      { pos: [2.8, 0.1, -14] as [number, number, number], s: 1.6 },
      { pos: [-1.6, 0.1, -18] as [number, number, number], s: 1.1 },
      { pos: [3.6, 0.1, -22] as [number, number, number], s: 1.4 },
      { pos: [-2.4, 0.1, -27] as [number, number, number], s: 1.2 },
    ],
    [],
  )
  const boulders = useMemo(
    () => [
      { pos: [-3.4, 0.02, -11] as [number, number, number], s: 0.6, r: 0.4 },
      { pos: [2.8, 0.05, -14] as [number, number, number], s: 0.72, r: 1.1 },
      { pos: [3.6, -0.02, -22] as [number, number, number], s: 0.55, r: 2.2 },
    ],
    [],
  )

  useFrame(({ clock }) => {
    if (foamRef.current) {
      const t = clock.elapsedTime
      foamRef.current.children.forEach((c, i) => {
        c.scale.setScalar(1 + Math.sin(t * 3.5 + i) * 0.12)
      })
    }
  })

  return (
    <group>
      <group ref={foamRef}>
        {foam.map((f, i) => (
          <group key={`f${i}`} position={f.pos}>
            <mesh rotation={[-Math.PI / 2, 0, seededRandom(i * 5) * Math.PI]}>
              <circleGeometry args={[f.s, 24]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0.34} depthWrite={false} />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
              <ringGeometry args={[f.s * 0.7, f.s * 1.15, 24]} />
              <meshBasicMaterial color="#eafcff" transparent opacity={0.22} depthWrite={false} />
            </mesh>
          </group>
        ))}
      </group>
      {boulders.map((b, i) => (
        <mesh key={`b${i}`} position={b.pos} rotation={[b.r, b.r * 1.5, 0]} scale={[b.s, b.s * 0.6, b.s]} castShadow>
          <dodecahedronGeometry args={[1, 1]} />
          <meshStandardMaterial color="#5f665c" roughness={1} flatShading />
        </mesh>
      ))}
    </group>
  )
}
