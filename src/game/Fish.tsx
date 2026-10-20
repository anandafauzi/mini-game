import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { FishShape, FishSpecies } from '../lib/fish'

interface FishProps {
  species: FishSpecies
  position: [number, number, number]
  target?: [number, number, number]
  speed?: number
  visible?: boolean
  onArrive?: () => void
  scaleMultiplier?: number
}

/** Body proportions [x, y, z] half-extents per silhouette archetype. */
const SHAPE_SCALE: Record<FishShape, [number, number, number]> = {
  torpedo: [0.32, 0.34, 0.74],
  round: [0.44, 0.5, 0.62],
  flat: [0.52, 0.4, 0.6],
  long: [0.16, 0.2, 0.98],
  ribbon: [0.1, 0.34, 0.86],
}

/** Tail fin size per archetype. */
const TAIL_SCALE: Record<FishShape, [number, number, number]> = {
  torpedo: [0.5, 0.6, 0.85],
  round: [0.65, 0.55, 0.8],
  flat: [0.7, 0.5, 0.8],
  long: [0.35, 0.55, 0.9],
  ribbon: [0.3, 0.7, 0.95],
}

export function Fish({ species, position, target, speed = 1.5, visible = true, onArrive, scaleMultiplier = 1 }: FishProps) {
  const groupRef = useRef<THREE.Group>(null)
  const tailRef = useRef<THREE.Mesh>(null)
  const t = useRef(0)

  useFrame((_, delta) => {
    if (!groupRef.current) return
    if (tailRef.current) {
      tailRef.current.rotation.y = Math.sin(performance.now() * 0.01 * speed) * 0.5
    }
    if (target) {
      t.current = Math.min(1, t.current + delta * speed * 0.5)
      const pos = new THREE.Vector3(...position).lerp(new THREE.Vector3(...target), t.current)
      groupRef.current.position.copy(pos)
      if (t.current >= 1 && onArrive) {
        onArrive()
        t.current = 0
      }
    }
  })

  const body = useMemo(
    () => new THREE.MeshStandardMaterial({ color: species.color, roughness: 0.55, metalness: 0.15 }),
    [species.color],
  )
  const belly = useMemo(
    () => new THREE.MeshStandardMaterial({ color: species.bellyColor, roughness: 0.6, metalness: 0.05 }),
    [species.bellyColor],
  )
  const finMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: species.finColor, roughness: 0.6, metalness: 0.05, side: THREE.DoubleSide }),
    [species.finColor],
  )
  const eyeMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#0b0b0d', roughness: 0.3 }), [])
  const bandMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: species.finColor, roughness: 0.6, metalness: 0.05 }),
    [species.finColor],
  )

  if (!visible) return null

  const s = species.size
  const [bx, by, bz] = SHAPE_SCALE[species.shape]
  const [tx, ty, tz] = TAIL_SCALE[species.shape]

  // pattern band positions along the length
  const stripes =
    species.pattern === 'stripes'
      ? [-0.4, -0.15, 0.1, 0.35]
      : species.pattern === 'bands'
        ? [-0.45, -0.15, 0.15, 0.45]
        : []
  const spots =
    species.pattern === 'spots'
      ? [
          [0.18, 0.28, -0.1],
          [-0.16, 0.3, 0.05],
          [0.12, 0.24, 0.28],
          [-0.1, 0.26, -0.32],
          [0.02, 0.32, 0.42],
        ]
      : []

  return (
    <group ref={groupRef} position={position} scale={s * scaleMultiplier}>
      {/* main body */}
      <mesh castShadow scale={[bx, by, bz]}>
        <sphereGeometry args={[1, 20, 14]} />
        <primitive object={body} attach="material" />
      </mesh>
      {/* lighter belly */}
      <mesh position={[0, -by * 0.4, 0]} scale={[bx * 0.92, by * 0.6, bz * 0.9]}>
        <sphereGeometry args={[1, 16, 10]} />
        <primitive object={belly} attach="material" />
      </mesh>

      {/* tail fin */}
      <mesh ref={tailRef} position={[0, 0, -bz - 0.12]} scale={[tx, ty, tz]} rotation={[0, 0, Math.PI / 2]}>
        <coneGeometry args={[0.5, 0.85, 4]} />
        <primitive object={finMat} attach="material" />
      </mesh>

      {/* dorsal fin */}
      <mesh position={[0, by * 0.85, -0.05]} rotation={[0, 0, 0]}>
        <coneGeometry args={[0.18, 0.36, 3]} />
        <primitive object={finMat} attach="material" />
      </mesh>

      {/* pectoral fins */}
      <mesh position={[bx * 0.9, -0.02, 0.12]} rotation={[0, 0, 0.9]}>
        <coneGeometry args={[0.1, 0.26, 3]} />
        <primitive object={finMat} attach="material" />
      </mesh>
      <mesh position={[-bx * 0.9, -0.02, 0.12]} rotation={[0, 0, -0.9]}>
        <coneGeometry args={[0.1, 0.26, 3]} />
        <primitive object={finMat} attach="material" />
      </mesh>

      {/* eyes */}
      <mesh position={[bx * 0.62, by * 0.28, bz * 0.62]}>
        <sphereGeometry args={[0.075, 10, 10]} />
        <primitive object={eyeMat} attach="material" />
      </mesh>
      <mesh position={[-bx * 0.62, by * 0.28, bz * 0.62]}>
        <sphereGeometry args={[0.075, 10, 10]} />
        <primitive object={eyeMat} attach="material" />
      </mesh>

      {/* stripes / bands */}
      {stripes.map((z, i) => (
        <mesh key={`st${i}`} position={[0, 0, z * bz * 1.4]} scale={[bx * 1.02, by * 1.02, 0.04]}>
          <sphereGeometry args={[1, 16, 12]} />
          <primitive object={bandMat} attach="material" />
        </mesh>
      ))}

      {/* spots */}
      {spots.map((p, i) => (
        <mesh key={`sp${i}`} position={[p[0] * bx * 1.3, p[1] * by, p[2] * bz * 1.4]}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <primitive object={bandMat} attach="material" />
        </mesh>
      ))}
    </group>
  )
}
