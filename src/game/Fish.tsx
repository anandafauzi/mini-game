import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { FishHead, FishShape, FishSpecies } from '../lib/fish'

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
  torpedo: [0.30, 0.40, 0.78],
  round: [0.42, 0.56, 0.60],
  flat: [0.36, 0.30, 0.86],
  long: [0.15, 0.22, 1.02],
  ribbon: [0.20, 0.52, 0.72],
}

/** Tail fin size per archetype (its own silhouette). */
const TAIL_SCALE: Record<FishShape, [number, number, number]> = {
  torpedo: [0.5, 0.6, 0.85],
  round: [0.62, 0.55, 0.8],
  flat: [0.4, 0.7, 0.8],
  long: [0.32, 0.62, 0.95],
  ribbon: [0.4, 0.85, 0.9],
}

/** How high the body rides in the water / body-relative fin anchors. */
const HEAD_SIZE: Record<FishHead, number> = {
  catfish: 0.86,
  cichlid: 0.92,
  carp: 0.8,
  snakehead: 0.9,
  arowana: 0.88,
  mahseer: 0.84,
}

/**
 * Per-species structural fish mesh. Unlike the old generic body, each species
 * is assembled from the anatomy that actually identifies it: whiskers for
 * catfish, a deeply compressed body for gurami, an elongated eel-like form for
 * gabus / arwana, large plate scales for arwana, etc.
 */
export function Fish({
  species,
  position,
  target,
  speed = 1.5,
  visible = true,
  onArrive,
  scaleMultiplier = 1,
}: FishProps) {
  const groupRef = useRef<THREE.Group>(null)
  const tailRef = useRef<THREE.Group>(null)
  const jawRef = useRef<THREE.Group>(null)
  const t = useRef(0)

  useFrame((_, delta) => {
    if (!groupRef.current) return
    const wob = Math.sin(performance.now() * 0.01 * speed)
    if (tailRef.current) tailRef.current.rotation.y = wob * 0.5
    if (jawRef.current) jawRef.current.rotation.x = Math.sin(performance.now() * 0.004) * 0.05
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

  const mats = useMemo(() => {
    const body = new THREE.MeshStandardMaterial({
      color: species.color,
      roughness: 0.5,
      metalness: 0.22,
    })
    const belly = new THREE.MeshStandardMaterial({ color: species.bellyColor, roughness: 0.62 })
    const fin = new THREE.MeshStandardMaterial({
      color: species.finColor,
      roughness: 0.5,
      metalness: 0.1,
      side: THREE.DoubleSide,
    })
    const eye = new THREE.MeshStandardMaterial({ color: '#0b0b0d', roughness: 0.25 })
    const band = new THREE.MeshStandardMaterial({
      color: species.finColor,
      roughness: 0.55,
      metalness: 0.08,
      side: THREE.DoubleSide,
    })
    const scaleMat = new THREE.MeshStandardMaterial({
      color: species.finColor,
      roughness: 0.35,
      metalness: 0.5,
    })
    return { body, belly, fin, eye, band, scaleMat }
  }, [species.color, species.bellyColor, species.finColor])

  if (!visible) return null

  const s = species.size
  const [bx, by, bz] = SHAPE_SCALE[species.shape]
  const [tx, ty, tz] = TAIL_SCALE[species.shape]
  const headK = HEAD_SIZE[species.head]

  // pattern band positions along the length
  const stripes =
    species.pattern === 'stripes'
      ? [-0.4, -0.15, 0.1, 0.35]
      : species.pattern === 'bands'
        ? [-0.45, -0.15, 0.15, 0.45]
        : []
  const spots =
    species.pattern === 'spots' || species.pattern === 'spotfin' || species.pattern === 'mottled'
      ? [
          [0.18, 0.28, -0.1],
          [-0.16, 0.3, 0.05],
          [0.12, 0.24, 0.28],
          [-0.1, 0.26, -0.32],
          [0.02, 0.32, 0.42],
        ]
      : []

  const isCatfish = species.head === 'catfish'
  const isArowana = species.head === 'arowana'
  const isSnakehead = species.head === 'snakehead'

  // huge plate scales on arwana / belida
  const scales =
    species.pattern === 'bigscales'
      ? [
          [0.05, 0.18, 0.55],
          [-0.05, 0.2, 0.55],
          [0.06, 0.12, 0.2],
          [-0.06, 0.12, 0.2],
          [0.05, 0.14, -0.15],
          [-0.05, 0.14, -0.15],
          [0.04, 0.16, -0.5],
          [-0.04, 0.16, -0.5],
        ]
      : []

  return (
    <group ref={groupRef} position={position} scale={s * scaleMultiplier}>
      {/* main body */}
      <mesh castShadow scale={[bx, by, bz]}>
        <sphereGeometry args={[1, 22, 16]} />
        <primitive object={mats.body} attach="material" />
      </mesh>
      {/* lighter belly */}
      <mesh position={[0, -by * 0.42, 0]} scale={[bx * 0.92, by * 0.6, bz * 0.9]}>
        <sphereGeometry args={[1, 16, 10]} />
        <primitive object={mats.belly} attach="material" />
      </mesh>

      {/* ---- head group: shape + mouth + appendages ---- */}
      <group ref={jawRef} position={[0, 0, bz * 0.72]}>
        <mesh scale={[bx * headK, by * headK, bz * 0.42]}>
          <sphereGeometry args={[1, 18, 14]} />
          <primitive object={mats.body} attach="material" />
        </mesh>
        {/* catfish broad flat head */}
        {isCatfish && (
          <mesh position={[0, 0.02, bz * 0.1]} scale={[bx * 1.02, by * 0.7, bz * 0.36]}>
            <sphereGeometry args={[1, 16, 12]} />
            <primitive object={mats.body} attach="material" />
          </mesh>
        )}
        {/* snakehead elongated snout */}
        {isSnakehead && (
          <mesh position={[0, -0.02, bz * 0.32]} scale={[bx * 0.7, by * 0.5, bz * 0.3]}>
            <sphereGeometry args={[1, 14, 10]} />
            <primitive object={mats.body} attach="material" />
          </mesh>
        )}
        {/* arowana upturned mouth */}
        {isArowana && (
          <mesh position={[0, 0.06, bz * 0.26]} rotation={[0.3, 0, 0]} scale={[bx * 0.5, by * 0.2, bz * 0.3]}>
            <boxGeometry args={[1, 1, 1]} />
            <primitive object={mats.body} attach="material" />
          </mesh>
        )}

        {/* eyes */}
        <mesh position={[bx * 0.62, by * 0.3, bz * 0.18]}>
          <sphereGeometry args={[0.078, 10, 10]} />
          <primitive object={mats.eye} attach="material" />
        </mesh>
        <mesh position={[-bx * 0.62, by * 0.3, bz * 0.18]}>
          <sphereGeometry args={[0.078, 10, 10]} />
          <primitive object={mats.eye} attach="material" />
        </mesh>

        {/* catfish barbels (whiskers): upper pair long, lower pair short */}
        {isCatfish && (
          <>
            {[0.14, 0.05].map((w, i) => (
              <mesh
                key={`bw${i}`}
                position={[w, -by * 0.15, bz * 0.45]}
                rotation={[0.9, 0, 0.4]}
              >
                <cylinderGeometry args={[0.008, 0.014, bz * 1.5, 5]} />
                <primitive object={mats.fin} attach="material" />
              </mesh>
            ))}
            {[-0.14, -0.05].map((w, i) => (
              <mesh
                key={`bw2${i}`}
                position={[w, -by * 0.15, bz * 0.45]}
                rotation={[0.9, 0, -0.4]}
              >
                <cylinderGeometry args={[0.008, 0.014, bz * 1.5, 5]} />
                <primitive object={mats.fin} attach="material" />
              </mesh>
            ))}
          </>
        )}
        {/* arowana chin barbels */}
        {isArowana && (
          <>
            <mesh position={[0.06, -by * 0.32, bz * 0.3]} rotation={[1.2, 0, 0.2]}>
              <cylinderGeometry args={[0.006, 0.012, bz * 0.9, 5]} />
              <primitive object={mats.fin} attach="material" />
            </mesh>
            <mesh position={[-0.06, -by * 0.32, bz * 0.3]} rotation={[1.2, 0, -0.2]}>
              <cylinderGeometry args={[0.006, 0.012, bz * 0.9, 5]} />
              <primitive object={mats.fin} attach="material" />
            </mesh>
          </>
        )}
      </group>

      {/* tail fin (wags) */}
      <group ref={tailRef} position={[0, 0, -bz - 0.08]}>
        <mesh scale={[tx, ty, tz]} rotation={[0, 0, Math.PI / 2]}>
          <coneGeometry args={[0.5, 0.9, 4]} />
          <primitive object={mats.fin} attach="material" />
        </mesh>
      </group>

      {/* dorsal fin (longer low ridge for catfish / snakehead) */}
      <mesh
        position={[0, by * 0.82, isCatfish || isSnakehead ? -bz * 0.3 : -0.05]}
        rotation={[0, 0, 0]}
        scale={isCatfish || isSnakehead ? [1, 1, 2.4] : [1, 1, 1]}
      >
        <coneGeometry args={[0.18, 0.36, 3]} />
        <primitive object={mats.fin} attach="material" />
      </mesh>

      {/* pectoral fins */}
      <mesh position={[bx * 0.9, -0.02, 0.12]} rotation={[0, 0, 0.9]}>
        <coneGeometry args={[0.1, 0.26, 3]} />
        <primitive object={mats.fin} attach="material" />
      </mesh>
      <mesh position={[-bx * 0.9, -0.02, 0.12]} rotation={[0, 0, -0.9]}>
        <coneGeometry args={[0.1, 0.26, 3]} />
        <primitive object={mats.fin} attach="material" />
      </mesh>

      {/* anal fin near the tail */}
      <mesh position={[0, -by * 0.75, -bz * 0.4]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.12, 0.28, 3]} />
        <primitive object={mats.fin} attach="material" />
      </mesh>

      {/* stripes / bands */}
      {stripes.map((z, i) => (
        <mesh key={`st${i}`} position={[0, 0, z * bz * 1.4]} scale={[bx * 1.02, by * 1.02, 0.04]}>
          <sphereGeometry args={[1, 16, 12]} />
          <primitive object={mats.band} attach="material" />
        </mesh>
      ))}

      {/* spots / mottle marks */}
      {spots.map((p, i) => (
        <mesh key={`sp${i}`} position={[p[0] * bx * 1.3, p[1] * by, p[2] * bz * 1.4]}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <primitive object={mats.band} attach="material" />
        </mesh>
      ))}

      {/* large plate scales (arwana / belida) */}
      {scales.map((p, i) => (
        <mesh
          key={`sc${i}`}
          position={[p[0] * bx * 2.2, p[1] * by, p[2] * bz * 1.2]}
          rotation={[0, 0.2, 0]}
          scale={[0.5, 0.6, 1]}
        >
          <sphereGeometry args={[0.09, 8, 8]} />
          <primitive object={mats.scaleMat} attach="material" />
        </mesh>
      ))}
    </group>
  )
}
