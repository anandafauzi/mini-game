import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface FishingRodProps {
  castProgress: number | null
  tension: number
  tipRef?: React.Ref<THREE.Object3D>
}

const SKIN = '#c98a5e'
const SKIN_DARK = '#a86c45'
function Hand({ position, rotation = [0, 0, 0], side = 'right' }: {
  position: [number, number, number]
  rotation?: [number, number, number]
  side?: 'left' | 'right'
}) {
  const flip = side === 'left' ? -1 : 1
  return (
    <group position={position} rotation={rotation as [number, number, number]}>
      {/* forearm */}
      <mesh castShadow position={[0, -0.28, -0.05]} rotation={[0.35, 0, 0]}>
        <cylinderGeometry args={[0.075, 0.095, 0.5, 10]} />
        <meshStandardMaterial color={SKIN} roughness={0.85} />
      </mesh>
      {/* palm */}
      <mesh castShadow position={[0, 0, 0]} scale={[0.11, 0.07, 0.13]}>
        <sphereGeometry args={[1, 12, 10]} />
        <meshStandardMaterial color={SKIN} roughness={0.8} />
      </mesh>
      {/* fingers wrapping the grip */}
      {[0, 1, 2, 3].map((i) => (
        <mesh
          key={i}
          castShadow
          position={[flip * 0.02, 0.02, 0.05 - i * 0.055]}
          rotation={[0, 0, flip * 0.5]}
        >
          <capsuleGeometry args={[0.022, 0.08, 4, 8]} />
          <meshStandardMaterial color={SKIN} roughness={0.8} />
        </mesh>
      ))}
      {/* thumb */}
      <mesh castShadow position={[flip * 0.06, 0.04, 0.04]} rotation={[0.3, 0, flip * 0.9]}>
        <capsuleGeometry args={[0.024, 0.07, 4, 8]} />
        <meshStandardMaterial color={SKIN_DARK} roughness={0.8} />
      </mesh>
    </group>
  )
}

export function FishingRod({ castProgress, tension, tipRef }: FishingRodProps) {
  const rodRef = useRef<THREE.Group>(null)
  const reelRef = useRef<THREE.Group>(null)

  useFrame((_, delta) => {
    if (!rodRef.current) return
    const targetRot = castProgress !== null ? -0.6 + castProgress * 1.0 : 0.15 + tension * 0.3
    rodRef.current.rotation.x = THREE.MathUtils.lerp(rodRef.current.rotation.x, targetRot, 0.12)
    if (reelRef.current) {
      reelRef.current.rotation.z -= delta * (2 + tension * 6)
    }
  })

  return (
    <group>
      {/* First-person rod; lateral/down offset is handled by the camera-frustum
          anchor in FishingScene, so this group only carries the small local pose. */}
      <group ref={rodRef} position={[0, 0.02, -0.28]} rotation={[0.18, -0.1, 0]}>
        {/* grip / handle (nearest the player) */}
        <mesh castShadow position={[0, -0.05, 0.24]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.03, 0.037, 0.6, 12]} />
          <meshStandardMaterial color="#2c2c30" roughness={0.6} />
        </mesh>
        {/* reel seat */}
        <mesh position={[0, 0.01, 0.06]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.026, 0.026, 0.14, 12]} />
          <meshStandardMaterial color="#8a8f96" metalness={0.7} roughness={0.35} />
        </mesh>
        {/* spinning reel body (hangs below the seat) */}
        <group ref={reelRef} position={[0, -0.12, 0.02]}>
          <mesh castShadow rotation={[0, 0, 0]}>
            <cylinderGeometry args={[0.055, 0.055, 0.05, 16]} />
            <meshStandardMaterial color="#5b6068" metalness={0.6} roughness={0.4} />
          </mesh>
          <mesh position={[0.045, 0, 0]} castShadow>
            <cylinderGeometry args={[0.018, 0.018, 0.1, 10]} />
            <meshStandardMaterial color="#3d4148" metalness={0.6} roughness={0.4} />
          </mesh>
        </group>
        {/* lower blank (extends forward, -z) */}
        <mesh castShadow position={[0, 0.06, -0.35]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.02, 0.026, 0.9, 12]} />
          <meshStandardMaterial color="#5c4033" roughness={0.5} />
        </mesh>
        {/* mid blank (two-tone for depth) */}
        <mesh castShadow position={[0, 0.16, -1.05]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.012, 0.019, 0.85, 12]} />
          <meshStandardMaterial color="#3f2c22" roughness={0.4} metalness={0.08} />
        </mesh>
        {/* tip blank */}
        <mesh castShadow position={[0, 0.24, -1.7]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.006, 0.011, 0.65, 10]} />
          <meshStandardMaterial color="#2a1d16" roughness={0.35} metalness={0.1} />
        </mesh>
        {/* line guides */}
        {[
          [0.08, -0.55],
          [0.16, -1.2],
          [0.24, -1.85],
        ].map(([y, z], i) => (
          <mesh key={i} position={[0, y, z]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.03 - i * 0.004, 0.006, 8, 14]} />
            <meshStandardMaterial color="#c9ced4" metalness={0.7} roughness={0.3} />
          </mesh>
        ))}
        {/* two hands gripping the rod / reel */}
        <Hand position={[0.02, -0.02, 0.3]} rotation={[0.3, 0, 0]} side="right" />
        <Hand position={[0.04, -0.14, 0.08]} rotation={[0.5, 0, 0]} side="right" />
        {/* invisible tip anchor for the fishing line */}
        <object3D ref={tipRef} position={[0, 0.26, -2.15]} />
      </group>
    </group>
  )
}

export function FishingLine({
  tipRef,
  bobberRef,
}: {
  tipRef: React.RefObject<THREE.Object3D | null>
  bobberRef: React.RefObject<THREE.Vector3 | null>
}) {
  const lineObj = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3))
    const mat = new THREE.LineBasicMaterial({ color: '#f8fafc', transparent: true, opacity: 0.95 })
    return new THREE.Line(geo, mat)
  }, [])

  const tipWorld = useMemo(() => new THREE.Vector3(), [])

  useFrame(() => {
    const attr = lineObj.geometry.attributes.position as THREE.BufferAttribute
    const arr = attr.array as Float32Array
    if (tipRef.current) {
      tipRef.current.getWorldPosition(tipWorld)
      arr[0] = tipWorld.x
      arr[1] = tipWorld.y
      arr[2] = tipWorld.z
    }
    const b = bobberRef.current
    if (b) {
      arr[3] = b.x
      arr[4] = b.y + 0.05
      arr[5] = b.z
    } else {
      arr[3] = arr[0] + 0.1
      arr[4] = arr[1] - 2.5
      arr[5] = arr[2] - 0.6
    }
    attr.needsUpdate = true
  })

  return <primitive object={lineObj} />
}

export function Bobber({ position, dip = 0 }: { position: [number, number, number]; dip?: number }) {
  const metal = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#d4d9de', metalness: 0.85, roughness: 0.25 }),
    [],
  )
  const bait = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#b98a52', roughness: 0.8 }),
    [],
  )
  return (
    <group position={[position[0], position[1] - dip, position[2]]}>
      <mesh castShadow>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="#e23b3b" roughness={0.28} metalness={0.1} />
      </mesh>
      <mesh position={[0, 0.05, 0]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.22} metalness={0.05} />
      </mesh>
      <mesh position={[0, 0.14, 0]}>
        <cylinderGeometry args={[0.008, 0.008, 0.12, 8]} />
        <meshStandardMaterial
          color="#facc15"
          emissive="#facc15"
          emissiveIntensity={0.45}
          roughness={0.3}
          metalness={0.2}
        />
      </mesh>
      {/* sinker + J-hook + bait hanging under the float so the kail is visible */}
      <mesh position={[0, -0.1, 0]}>
        <sphereGeometry args={[0.026, 10, 10]} />
        <primitive object={metal} attach="material" />
      </mesh>
      <mesh position={[0, -0.17, 0]} rotation={[0, 0, Math.PI * 0.9]}>
        <torusGeometry args={[0.035, 0.007, 6, 14, Math.PI * 1.35]} />
        <primitive object={metal} attach="material" />
      </mesh>
      <mesh position={[0.03, -0.2, 0]}>
        <sphereGeometry args={[0.02, 8, 8]} />
        <primitive object={bait} attach="material" />
      </mesh>
    </group>
  )
}
