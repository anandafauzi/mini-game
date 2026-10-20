import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453
  return x - Math.floor(x)
}

function Mountain({
  position,
  scale,
  color,
  snow = true,
}: {
  position: [number, number, number]
  scale: number
  color: string
  snow?: boolean
}) {
  const geo = useMemo(() => {
    const g = new THREE.ConeGeometry(6, 8, 40, 14)
    const pos = g.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const y = pos.getY(i)
      const z = pos.getZ(i)
      const ridge =
        Math.sin(x * 0.9 + z * 0.5) * 0.18 +
        Math.sin(z * 1.3 - x * 0.7) * 0.14 +
        Math.cos(x * 2.1 + z * 1.7) * 0.07
      const taper = Math.max(0, (4.0 - y) / 8.0)
      pos.setX(i, x + ridge * taper * 1.4)
      pos.setZ(i, z + ridge * taper * 1.4)
      pos.setY(i, y + Math.sin(x * 1.7 + z * 1.1) * 0.12 * taper)
    }
    g.computeVertexNormals()
    return g
  }, [])

  return (
    <group position={position} scale={scale}>
      <mesh geometry={geo} castShadow>
        <meshStandardMaterial color={color} roughness={0.98} flatShading={false} />
      </mesh>
      <mesh geometry={geo} scale={[0.72, 0.98, 0.72]} position={[0.35, 0.05, 0.35]}>
        <meshStandardMaterial color={color} roughness={1} />
      </mesh>
      {snow && (
        <mesh position={[0, 3.25, 0]}>
          <coneGeometry args={[1.85, 2.3, 32, 6]} />
          <meshStandardMaterial color="#f4f7fb" roughness={0.55} />
        </mesh>
      )}
    </group>
  )
}

function RiceTerrace({
  position,
  rotation = 0,
  rows = 4,
}: {
  position: [number, number, number]
  rotation?: number
  rows?: number
}) {
  const stalks = useMemo(() => {
    const arr: { x: number; z: number; y: number; h: number; tint: number }[] = []
    for (let r = 0; r < rows; r++) {
      const width = 6 - r * 0.9
      const count = Math.round(width * 2.4)
      for (let i = 0; i < count; i++) {
        const seed = r * 1000 + i
        arr.push({
          x: (i / (count - 1) - 0.5) * width + (seededRandom(seed) - 0.5) * 0.12,
          z: -r * 0.95 + (seededRandom(seed + 7) - 0.5) * 0.5,
          y: r * 0.35,
          h: 0.26 + seededRandom(seed + 13) * 0.18,
          tint: seededRandom(seed + 21),
        })
      }
    }
    return arr
  }, [rows])

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {Array.from({ length: rows }).map((_, i) => (
        <mesh key={`t${i}`} position={[0, i * 0.35 - 0.18, -i * 0.95]} receiveShadow castShadow>
          <boxGeometry args={[6.4 - i * 0.9, 0.36, 1.5]} />
          <meshStandardMaterial color={i % 2 === 0 ? '#6b7a3a' : '#5c6b30'} roughness={1} />
        </mesh>
      ))}
      {Array.from({ length: rows }).map((_, i) => (
        <mesh key={`w${i}`} position={[0, i * 0.35 + 0.02, -i * 0.95]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[6.2 - i * 0.9, 1.35]} />
          <meshStandardMaterial color="#9ecf6b" roughness={0.5} metalness={0.08} />
        </mesh>
      ))}
      {stalks.map((s, i) => (
        <mesh
          key={`s${i}`}
          position={[s.x, s.y + s.h / 2 + 0.1, s.z]}
          rotation={[(s.tint - 0.5) * 0.5, 0, (s.tint - 0.5) * 0.4]}
        >
          <planeGeometry args={[0.05, s.h]} />
          <meshStandardMaterial
            color={s.tint > 0.66 ? '#a9d95f' : s.tint > 0.33 ? '#9ccb52' : '#8cbb47'}
            side={THREE.DoubleSide}
            roughness={0.8}
          />
        </mesh>
      ))}
    </group>
  )
}

function House({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh castShadow position={[0, 0.45, 0]}>
        <boxGeometry args={[1.1, 0.9, 1.1]} />
        <meshStandardMaterial color="#e3cba0" roughness={0.9} />
      </mesh>
      <mesh castShadow position={[0, 1.18, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[0.95, 0.75, 4]} />
        <meshStandardMaterial color="#8b4a2b" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.42, 0.56]}>
        <boxGeometry args={[0.28, 0.5, 0.05]} />
        <meshStandardMaterial color="#5c3a21" />
      </mesh>
      <mesh position={[0.38, 0.55, 0.56]}>
        <boxGeometry args={[0.22, 0.22, 0.05]} />
        <meshStandardMaterial color="#9ad0e0" emissive="#4a7d8c" emissiveIntensity={0.15} />
      </mesh>
    </group>
  )
}

function PalmTree({ position }: { position: [number, number, number] }) {
  const leaves = useMemo(() => {
    const arr: { rot: number; pos: [number, number, number] }[] = []
    for (let i = 0; i < 7; i++) {
      const angle = (i / 7) * Math.PI * 2
      arr.push({ rot: angle, pos: [Math.cos(angle) * 0.55, 2.25, Math.sin(angle) * 0.55] })
    }
    return arr
  }, [])
  const groupRef = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.z = Math.sin(clock.elapsedTime * 0.6) * 0.02
    }
  })
  return (
    <group position={position} ref={groupRef}>
      <mesh castShadow position={[0, 1.1, 0]} rotation={[0, 0, 0.04]}>
        <cylinderGeometry args={[0.09, 0.16, 2.3, 10]} />
        <meshStandardMaterial color="#9c7b3a" roughness={0.95} />
      </mesh>
      {leaves.map((leaf, i) => (
        <mesh key={i} position={leaf.pos} rotation={[0.55, leaf.rot, 0]} castShadow>
          <boxGeometry args={[0.18, 0.04, 1.25]} />
          <meshStandardMaterial color="#2f8b3d" roughness={0.85} />
        </mesh>
      ))}
    </group>
  )
}

function Tree({ position }: { position: [number, number, number] }) {
  const groupRef = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.z = Math.sin(clock.elapsedTime * 0.8 + position[0]) * 0.015
    }
  })
  const canopy = useMemo(
    () => [
      { p: [0, 1.55, 0] as [number, number, number], r: 0.82, c: '#2f8b3d' },
      { p: [0.42, 1.35, 0.22] as [number, number, number], r: 0.56, c: '#3fa14a' },
      { p: [-0.38, 1.4, -0.28] as [number, number, number], r: 0.6, c: '#379a44' },
      { p: [0.12, 2.0, -0.12] as [number, number, number], r: 0.54, c: '#43a850' },
      { p: [-0.2, 1.85, 0.3] as [number, number, number], r: 0.46, c: '#2f8b3d' },
    ],
    [],
  )
  return (
    <group position={position} ref={groupRef}>
      <mesh castShadow position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.11, 0.2, 1.25, 9]} />
        <meshStandardMaterial color="#6b4423" roughness={1} />
      </mesh>
      {canopy.map((c, i) => (
        <mesh key={i} castShadow position={c.p}>
          <icosahedronGeometry args={[c.r, 2]} />
          <meshStandardMaterial color={c.c} roughness={0.92} />
        </mesh>
      ))}
    </group>
  )
}

function RiverBank() {
  const rocks = useMemo(() => {
    const arr: { pos: [number, number, number]; s: number; rot: number }[] = []
    for (let i = 0; i < 22; i++) {
      const side = seededRandom(i * 3) > 0.5 ? 1 : -1
      arr.push({
        pos: [
          side * (4.5 + seededRandom(i * 5 + 1) * 2.5),
          0.05,
          -2 - seededRandom(i * 7 + 2) * 14,
        ],
        s: 0.25 + seededRandom(i * 11 + 3) * 0.5,
        rot: seededRandom(i * 13 + 4) * Math.PI,
      })
    }
    return arr
  }, [])
  return (
    <group>
      {rocks.map((r, i) => (
        <mesh key={i} position={r.pos} rotation={[0, r.rot, 0]} castShadow receiveShadow>
          <dodecahedronGeometry args={[r.s, 0]} />
          <meshStandardMaterial color={i % 3 === 0 ? '#8a8578' : '#6f6a5e'} roughness={1} flatShading />
        </mesh>
      ))}
    </group>
  )
}

function ForestLine() {
  const trees = useMemo(() => {
    const arr: { pos: [number, number, number]; s: number; c: string }[] = []
    const palette = ['#2f6b34', '#357a3a', '#3d8a44', '#2a5f30']
    for (let i = 0; i < 40; i++) {
      const x = -26 + i * 1.35 + (seededRandom(i * 4 + 1) - 0.5) * 1.6
      const z = -26 - seededRandom(i * 6 + 2) * 8
      const s = 0.8 + seededRandom(i * 8 + 3) * 0.9
      arr.push({ pos: [x, 0, z], s, c: palette[Math.floor(seededRandom(i * 9 + 4) * palette.length)] })
    }
    return arr
  }, [])
  return (
    <group>
      {trees.map((t, i) => (
        <mesh key={i} position={[t.pos[0], 1.1 * t.s, t.pos[2]]} scale={t.s} castShadow>
          <icosahedronGeometry args={[1.0, 1]} />
          <meshStandardMaterial color={t.c} roughness={1} />
        </mesh>
      ))}
    </group>
  )
}

export function Environment() {
  return (
    <group>
      {/* base terrain far below the riverbed so underwater stones stay visible */}
      <mesh position={[0, -0.7, -6]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[80, 80, 40, 40]} />
        <meshStandardMaterial color="#3d5f2e" roughness={1} />
      </mesh>
      {/* grass banks flanking the river channel (river is x in [-8, 8]) */}
      <mesh position={[-24, -0.02, -6]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[32, 80]} />
        <meshStandardMaterial color="#4f7a3a" roughness={1} />
      </mesh>
      <mesh position={[24, -0.02, -6]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[32, 80]} />
        <meshStandardMaterial color="#4f7a3a" roughness={1} />
      </mesh>
      {/* green banks behind the river (far end) */}
      <mesh position={[0, -0.02, -40]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[16.5, 46]} />
        <meshStandardMaterial color="#436b32" roughness={1} />
      </mesh>

      <RiceTerrace position={[-9, 0.1, -11]} rotation={0.1} rows={4} />
      <RiceTerrace position={[9, 0.1, -12]} rotation={-0.1} rows={4} />
      <RiceTerrace position={[-12, 0.1, -17]} rotation={0.2} rows={3} />
      <RiceTerrace position={[12, 0.1, -18]} rotation={-0.2} rows={3} />

      <Mountain position={[-13, 3, -42]} scale={2.6} color="#6b81a3" snow={false} />
      <Mountain position={[-12, 3, -38]} scale={2.4} color="#5a6f4a" />
      <Mountain position={[1, 4.8, -46]} scale={3.4} color="#4a5c3e" />
      <Mountain position={[15, 3.4, -40]} scale={2.6} color="#5a6f4a" />
      <Mountain position={[16, 3, -44]} scale={2.8} color="#6b81a3" snow={false} />
      <Mountain position={[26, 2.6, -44]} scale={2.0} color="#657a52" snow={false} />
      <Mountain position={[-24, 2.8, -43]} scale={2.2} color="#657a52" snow={false} />

      <House position={[-6, 0, -14]} rotation={0.4} />
      <House position={[-7.8, 0, -16]} rotation={-0.3} />
      <House position={[7, 0, -15]} rotation={-0.5} />
      <House position={[8.8, 0, -17]} rotation={0.2} />

      <Tree position={[-3.6, 0, -9.5]} />
      <Tree position={[4, 0, -10.5]} />
      <Tree position={[-10.5, 0, -13]} />
      <Tree position={[11, 0, -13]} />
      <PalmTree position={[-5, 0, -12]} />
      <PalmTree position={[5.4, 0, -13]} />

      <ForestLine />

      <RiverBank />

      <mesh position={[0, 0.1, 2]} receiveShadow castShadow>
        <boxGeometry args={[5, 0.24, 2.4]} />
        <meshStandardMaterial color="#8b7355" roughness={1} />
      </mesh>
      <mesh position={[0, 0.06, 3.6]} receiveShadow>
        <boxGeometry args={[1.4, 0.12, 2.4]} />
        <meshStandardMaterial color="#6b5637" roughness={1} />
      </mesh>
    </group>
  )
}
