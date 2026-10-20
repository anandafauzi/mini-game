import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGraphics } from '../lib/graphics'
import { oceanHeight, oceanNormal } from './oceanWaves'

/**
 * A small tropical fishing boat built from primitives with PBR materials.
 *
 * The hull, deck, gunwale, rails, a bow post and a tackle box are all visible
 * from the first-person deck camera (deck at the bottom of the frame, sea in
 * the middle, sky above). The whole boat floats on the shared Gerstner wave
 * field: it heaves, pitches and rolls naturally, and a soft wake/foam collar
 * sits at the waterline.
 *
 * `boatRoot` is exposed via a ref-forwarded group so the camera rig can sample
 * its transform and ride along.
 */

export interface BoatRef {
  group: THREE.Group | null
  /** world-space deck top height for the current frame */
  deckY: number
}

export function Boat({ boatRef }: { boatRef: React.RefObject<BoatRef> }) {
  const quality = useGraphics((s) => s.quality)
  const roll = useRef(0)
  const group = useRef<THREE.Group>(null)
  const wake = useRef<THREE.Group>(null)
  const norm = useMemo(() => new THREE.Vector3(), [])

  // Boat sits just in front of / under the camera; origin at waterline.
  const BOAT_X = 0
  const BOAT_Z = -1.6

  const std = useMemo(
    () => ({
      deck: new THREE.MeshStandardMaterial({ color: '#b98a52', roughness: 0.82, metalness: 0.03 }),
      deckDark: new THREE.MeshStandardMaterial({ color: '#8f6636', roughness: 0.85, metalness: 0.03 }),
      hull: new THREE.MeshStandardMaterial({ color: '#2f5d7c', roughness: 0.55, metalness: 0.05 }),
      hullTrim: new THREE.MeshStandardMaterial({ color: '#e8e2d4', roughness: 0.6, metalness: 0.02 }),
      wood: new THREE.MeshStandardMaterial({ color: '#7a5630', roughness: 0.8, metalness: 0.02 }),
      metal: new THREE.MeshStandardMaterial({ color: '#cfd6dc', roughness: 0.35, metalness: 0.85 }),
      rope: new THREE.MeshStandardMaterial({ color: '#c9b483', roughness: 0.95, metalness: 0 }),
      foam: new THREE.MeshBasicMaterial({
        color: '#f3fbff',
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
      }),
    }),
    [],
  )

  useFrame((state) => {
    if (!group.current) return
    const t = state.clock.elapsedTime
    const x = BOAT_X
    const z = BOAT_Z
    const h = oceanHeight(x, z, t)
    group.current.position.set(x, h, z)

    // orientation from the surface normal (pitch/roll), damped for comfort
    oceanNormal(x, z, t, norm)
    const targetPitch = Math.atan2(norm.z, norm.y) * 0.55
    const targetRoll = -Math.atan2(norm.x, norm.y) * 0.55
    roll.current = THREE.MathUtils.lerp(roll.current, targetRoll, 0.08)
    group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, targetPitch, 0.06)
    group.current.rotation.z = roll.current
    // slow yaw sway
    group.current.rotation.y = Math.sin(t * 0.12) * 0.02

    if (boatRef.current) {
      boatRef.current.group = group.current
      boatRef.current.deckY = h
    }

    // wake foam ring breathes at the waterline
    if (wake.current) {
      const k = (Math.sin(t * 1.2) + 1) * 0.5
      wake.current.scale.setScalar(1 + k * 0.06)
      std.foam.opacity = 0.35 + k * 0.18
    }
  })

  const seg = quality === 'low' ? 10 : 18

  return (
    <group ref={group}>
      {/* --- Hull (pointed bow toward -Z) --- */}
      {/* main hull block */}
      <mesh position={[0, -0.35, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.1, 0.8, 4.6]} />
        <primitive object={std.hull} attach="material" />
      </mesh>
      {/* tapered bow */}
      <mesh position={[0, -0.34, -2.7]} rotation={[0, 0, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.05, 1.05, 1.8, seg === 10 ? 4 : 6]} />
        <primitive object={std.hull} attach="material" />
      </mesh>
      {/* white trim stripe along the rail */}
      <mesh position={[0, 0.14, 0]}>
        <boxGeometry args={[2.16, 0.1, 4.62]} />
        <primitive object={std.hullTrim} attach="material" />
      </mesh>

      {/* --- Deck --- */}
      <mesh position={[0, 0.2, -0.2]} receiveShadow>
        <boxGeometry args={[1.9, 0.06, 4.0]} />
        <primitive object={std.deck} attach="material" />
      </mesh>
      {/* deck plank lines */}
      {[-0.6, 0, 0.6].map((x, i) => (
        <mesh key={i} position={[x, 0.235, -0.2]}>
          <boxGeometry args={[0.04, 0.02, 3.9]} />
          <primitive object={std.deckDark} attach="material" />
        </mesh>
      ))}

      {/* --- Gunwale rails (left/right, visible at frame edges) --- */}
      {[-1, 1].map((s, i) => (
        <group key={i}>
          <mesh position={[s * 0.98, 0.35, 0]} castShadow>
            <boxGeometry args={[0.08, 0.34, 4.2]} />
            <primitive object={std.wood} attach="material" />
          </mesh>
          {/* rail posts */}
          {[-1.6, -0.4, 0.8, 1.9].map((z, j) => (
            <mesh key={j} position={[s * 0.98, 0.52, z]}>
              <boxGeometry args={[0.07, 0.12, 0.07]} />
              <primitive object={std.hullTrim} attach="material" />
            </mesh>
          ))}
        </group>
      ))}

      {/* --- Stern rail --- */}
      <mesh position={[0, 0.42, 2.05]} castShadow>
        <boxGeometry args={[2.0, 0.34, 0.08]} />
        <primitive object={std.wood} attach="material" />
      </mesh>

      {/* --- Bow post / small mast --- */}
      <mesh position={[0, 1.2, -2.3]} castShadow>
        <cylinderGeometry args={[0.05, 0.06, 2.0, 10]} />
        <primitive object={std.wood} attach="material" />
      </mesh>
      {/* crossbar for rod holders */}
      <mesh position={[0, 1.55, -2.3]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.035, 0.035, 0.9, 8]} />
        <primitive object={std.metal} attach="material" />
      </mesh>

      {/* --- Tackle box on the deck (right side) --- */}
      <group position={[0.62, 0.32, 1.2]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.5, 0.3, 0.4]} />
          <primitive object={std.hull} attach="material" />
        </mesh>
        <mesh position={[0, 0.17, 0]}>
          <boxGeometry args={[0.52, 0.06, 0.42]} />
          <primitive object={std.hullTrim} attach="material" />
        </mesh>
        <mesh position={[0, 0.22, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.07, 0.014, 8, 16]} />
          <primitive object={std.metal} attach="material" />
        </mesh>
      </group>

      {/* --- Coiled rope / bucket on the left --- */}
      <mesh position={[-0.62, 0.3, 1.1]}>
        <cylinderGeometry args={[0.22, 0.18, 0.26, 14, 1, true]} />
        <primitive object={std.metal} attach="material" />
      </mesh>

      {/* --- Wake / foam collar at the waterline --- */}
      <group ref={wake} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <mesh position={[0, 0, 0.4]}>
          <ringGeometry args={[1.5, 2.6, 40]} />
          <primitive object={std.foam} attach="material" />
        </mesh>
        <mesh position={[0, 0, -2.2]}>
          <ringGeometry args={[0.8, 1.5, 32]} />
          <primitive object={std.foam} attach="material" />
        </mesh>
      </group>
    </group>
  )
}
