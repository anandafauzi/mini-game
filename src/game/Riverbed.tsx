import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453
  return x - Math.floor(x)
}

/**
 * Riverbed visible through the clear blue water:
 * sandy bottom + scattered underwater stones / pebbles with caustic tint.
 */
export function Riverbed() {
  const stones = useMemo(() => {
    const arr: { pos: [number, number, number]; s: number; rot: number; c: string }[] = []
    const palette = ['#7c8a86', '#6a7570', '#8b9488', '#5d6b68', '#96917f']
    for (let i = 0; i < 90; i++) {
      const x = (seededRandom(i * 3 + 1) - 0.5) * 14
      const z = -6 + (seededRandom(i * 5 + 2) - 0.5) * 20
      const s = 0.08 + seededRandom(i * 7 + 3) * 0.32
      arr.push({
        pos: [x, -0.28 + seededRandom(i * 11 + 4) * 0.1, z],
        s,
        rot: seededRandom(i * 13 + 5) * Math.PI * 2,
        c: palette[Math.floor(seededRandom(i * 17 + 6) * palette.length)],
      })
    }
    return arr
  }, [])

  const pebbles = useMemo(() => {
    const arr: { pos: [number, number, number]; s: number }[] = []
    for (let i = 0; i < 260; i++) {
      const x = (seededRandom(i * 19 + 7) - 0.5) * 15
      const z = -6 + (seededRandom(i * 23 + 8) - 0.5) * 22
      arr.push({
        pos: [x, -0.34 + seededRandom(i * 29 + 9) * 0.06, z],
        s: 0.03 + seededRandom(i * 31 + 10) * 0.09,
      })
    }
    return arr
  }, [])

  return (
    <group>
      {/* sandy / gravel riverbed floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.42, -6]} receiveShadow>
        <planeGeometry args={[16.5, 23]} />
        <meshStandardMaterial color="#6f8a72" roughness={1} />
      </mesh>
      {/* darker central channel for depth illusion */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.4, -6]}>
        <planeGeometry args={[10, 22]} />
        <meshStandardMaterial color="#4d6b58" roughness={1} />
      </mesh>

      {stones.map((st, i) => (
        <mesh key={`st${i}`} position={st.pos} rotation={[st.rot * 0.4, st.rot, st.rot * 0.3]} scale={[st.s, st.s * 0.7, st.s]}>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={st.c} roughness={0.95} flatShading />
        </mesh>
      ))}
      {pebbles.map((p, i) => (
        <mesh key={`pb${i}`} position={p.pos} scale={[p.s, p.s * 0.6, p.s]}>
          <icosahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#8a8677" roughness={1} flatShading />
        </mesh>
      ))}
    </group>
  )
}

/**
 * Rapids / whitewater: foam patches where the current speeds over stones,
 * plus a couple of protruding boulders breaking the surface.
 */
export function Rapids() {
  const foamRef = useRef<THREE.Group>(null)
  const foam = useMemo(
    () => [
      { pos: [-3.2, 0.06, -9] as [number, number, number], s: 1.1 },
      { pos: [2.6, 0.06, -12] as [number, number, number], s: 1.4 },
      { pos: [-1.5, 0.06, -15.5] as [number, number, number], s: 1.0 },
      { pos: [3.4, 0.06, -18] as [number, number, number], s: 1.2 },
    ],
    [],
  )
  const boulders = useMemo(
    () => [
      { pos: [-3.2, 0.05, -9] as [number, number, number], s: 0.5, r: 0.4 },
      { pos: [2.6, 0.08, -12] as [number, number, number], s: 0.62, r: 1.1 },
      { pos: [3.4, 0.02, -18] as [number, number, number], s: 0.45, r: 2.2 },
    ],
    [],
  )

  useFrame(({ clock }) => {
    if (foamRef.current) {
      const t = clock.elapsedTime
      foamRef.current.children.forEach((c, i) => {
        c.scale.setScalar(1 + Math.sin(t * 3 + i) * 0.08)
      })
    }
  })

  return (
    <group>
      <group ref={foamRef}>
        {foam.map((f, i) => (
          <mesh key={`f${i}`} position={f.pos} rotation={[-Math.PI / 2, 0, seededRandom(i * 5) * Math.PI]}>
            <circleGeometry args={[f.s, 20]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.28} depthWrite={false} />
          </mesh>
        ))}
      </group>
      {boulders.map((b, i) => (
        <mesh key={`b${i}`} position={b.pos} rotation={[b.r, b.r * 1.5, 0]} scale={[b.s, b.s * 0.6, b.s]} castShadow>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#6a6f66" roughness={1} flatShading />
        </mesh>
      ))}
    </group>
  )
}
