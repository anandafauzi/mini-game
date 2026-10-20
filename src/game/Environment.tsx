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
    const g = new THREE.ConeGeometry(6, 8, 24, 8)
    const pos = g.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i)
      const nx = (Math.sin(i * 12.9898) * 43758.5453) % 1
      const nz = (Math.cos(i * 78.233) * 12345.6789) % 1
      const bump = (Math.abs(nx) + Math.abs(nz)) * 0.18
      if (y < 3.9) {
        pos.setX(i, pos.getX(i) + nx * 0.35)
        pos.setZ(i, pos.getZ(i) + nz * 0.35)
        pos.setY(i, y + bump)
      }
    }
    g.computeVertexNormals()
    return g
  }, [])

  return (
    <group position={position} scale={scale}>
      <mesh geometry={geo} castShadow>
        <meshStandardMaterial color={color} roughness={0.95} flatShading />
      </mesh>
      {snow && (
        <mesh position={[0, 3.2, 0]}>
          <coneGeometry args={[1.9, 2.2, 24, 4]} />
          <meshStandardMaterial color="#f4f7fb" roughness={0.7} />
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
    const arr: { x: number; z: number; y: number; h: number }[] = []
    for (let r = 0; r < rows; r++) {
      const width = 6 - r * 0.9
      const count = Math.round(width * 1.6)
      for (let i = 0; i < count; i++) {
        const seed = r * 1000 + i
        arr.push({
          x: (i / (count - 1) - 0.5) * width,
          z: -r * 0.95 + (seededRandom(seed) - 0.5) * 0.3,
          y: r * 0.35,
          h: 0.28 + seededRandom(seed + 7) * 0.14,
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
          <meshStandardMaterial
            color="#8fbf4d"
            roughness={0.6}
            metalness={0.05}
          />
        </mesh>
      ))}
      {stalks.map((s, i) => (
        <mesh key={`s${i}`} position={[s.x, s.y + s.h / 2 + 0.1, s.z]}>
          <planeGeometry args={[0.05, s.h]} />
          <meshStandardMaterial color="#9ccb52" side={THREE.DoubleSide} roughness={0.8} />
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
  return (
    <group position={position} ref={groupRef}>
      <mesh castShadow position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.11, 0.18, 1.2, 8]} />
        <meshStandardMaterial color="#6b4423" roughness={1} />
      </mesh>
      {[
        [0, 1.5, 0, 0.75],
        [0.35, 1.3, 0.2, 0.5],
        [-0.3, 1.35, -0.25, 0.55],
        [0.1, 1.9, -0.1, 0.5],
      ].map((c, i) => (
        <mesh key={i} castShadow position={[c[0], c[1], c[2]]}>
          <icosahedronGeometry args={[c[3], 1]} />
          <meshStandardMaterial color={i % 2 === 0 ? '#2f8b3d' : '#3fa14a'} roughness={0.9} flatShading />
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

export function Environment() {
  return (
    <group>
      <mesh position={[0, -0.02, -6]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[80, 80, 40, 40]} />
        <meshStandardMaterial color="#4f7a3a" roughness={1} />
      </mesh>

      <RiceTerrace position={[-9, 0.1, -11]} rotation={0.1} rows={4} />
      <RiceTerrace position={[9, 0.1, -12]} rotation={-0.1} rows={4} />
      <RiceTerrace position={[-12, 0.1, -17]} rotation={0.2} rows={3} />
      <RiceTerrace position={[12, 0.1, -18]} rotation={-0.2} rows={3} />

      <Mountain position={[-12, 3, -38]} scale={2.4} color="#5a6f4a" />
      <Mountain position={[1, 4.8, -46]} scale={3.4} color="#4a5c3e" />
      <Mountain position={[15, 3.4, -40]} scale={2.6} color="#5a6f4a" />
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
