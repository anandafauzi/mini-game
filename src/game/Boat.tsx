import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGraphics } from '../lib/graphics'
import { waterHeight, waterNormal } from './waterWaves'

/**
 * A small wooden river boat (perahu) built from primitives with PBR materials.
 *
 * The hull, deck, gunwale, rails, a bow post and a woven basket are all
 * visible from the first-person deck camera (deck at the bottom of the frame,
 * river in the middle, valley above). The whole boat floats on the shared
 * river wave field: it heaves, pitches and rolls gently, and a soft ripple
 * collar sits at the waterline.
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
      deck: new THREE.MeshStandardMaterial({ color: '#a8815a', roughness: 0.86, metalness: 0.02 }),
      deckDark: new THREE.MeshStandardMaterial({ color: '#86643f', roughness: 0.88, metalness: 0.02 }),
      hull: new THREE.MeshStandardMaterial({ color: '#6b4f31', roughness: 0.78, metalness: 0.02 }),
      hullTrim: new THREE.MeshStandardMaterial({ color: '#4a3520', roughness: 0.85, metalness: 0.02 }),
      wood: new THREE.MeshStandardMaterial({ color: '#7a5630', roughness: 0.8, metalness: 0.02 }),
      bamboo: new THREE.MeshStandardMaterial({ color: '#9a8a52', roughness: 0.75, metalness: 0.02 }),
      basket: new THREE.MeshStandardMaterial({ color: '#8a6f42', roughness: 0.92, metalness: 0.0 }),
      rope: new THREE.MeshStandardMaterial({ color: '#c9b483', roughness: 0.95, metalness: 0 }),
      ripple: new THREE.MeshBasicMaterial({
        color: '#e6f0ea',
        transparent: true,
        opacity: 0.22,
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
    const h = waterHeight(x, z, t)
    group.current.position.set(x, h, z)

    // orientation from the surface normal (pitch/roll), almost static for comfort
    waterNormal(x, z, t, norm)
    const targetPitch = Math.atan2(norm.z, norm.y) * 0.045
    const targetRoll = -Math.atan2(norm.x, norm.y) * 0.045
    roll.current = THREE.MathUtils.lerp(roll.current, targetRoll, 0.02)
    group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, targetPitch, 0.018)
    group.current.rotation.z = roll.current
    // slow yaw sway (kept very subtle)
    group.current.rotation.y = Math.sin(t * 0.1) * 0.002

    if (boatRef.current) {
      boatRef.current.group = group.current
      boatRef.current.deckY = h
    }

    // ripple collar breathes at the waterline
    if (wake.current) {
      const k = (Math.sin(t * 1.2) + 1) * 0.5
      wake.current.scale.setScalar(1 + k * 0.05)
      std.ripple.opacity = 0.16 + k * 0.1
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
        <primitive object={std.bamboo} attach="material" />
      </mesh>

      {/* --- Wooden box with folded cloth (right side) --- */}
      <group position={[0.62, 0.32, 1.2]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.5, 0.3, 0.4]} />
          <primitive object={std.hull} attach="material" />
        </mesh>
        <mesh position={[0, 0.17, 0]}>
          <boxGeometry args={[0.52, 0.06, 0.42]} />
          <primitive object={std.hullTrim} attach="material" />
        </mesh>
        <mesh position={[0, 0.24, 0]} scale={[1, 0.5, 0.8]} castShadow>
          <sphereGeometry args={[0.2, 10, 8]} />
          <primitive object={std.rope} attach="material" />
        </mesh>
      </group>

      {/* --- Woven basket on the left --- */}
      <mesh position={[-0.62, 0.3, 1.1]} castShadow>
        <cylinderGeometry args={[0.22, 0.16, 0.28, 12, 1, true]} />
        <primitive object={std.basket} attach="material" />
      </mesh>
      <mesh position={[-0.62, 0.44, 1.1]}>
        <torusGeometry args={[0.22, 0.02, 6, 16]} />
        <primitive object={std.rope} attach="material" />
      </mesh>

      {/* --- Ripple collar at the waterline --- */}
      <group ref={wake} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <mesh position={[0, 0, 0.3]}>
          <ringGeometry args={[1.3, 2.0, 40]} />
          <primitive object={std.ripple} attach="material" />
        </mesh>
        <mesh position={[0, 0, -2.0]}>
          <ringGeometry args={[0.7, 1.25, 32]} />
          <primitive object={std.ripple} attach="material" />
        </mesh>
      </group>
    </group>
  )
}
