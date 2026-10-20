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
      {/* First-person rig anchored lower-right, angled toward the river */}
      <group ref={rodRef} position={[0.52, -0.42, -0.35]} rotation={[0.15, -0.12, 0]}>
        {/* grip / handle */}
        <mesh castShadow position={[0, -0.15, 0.25]} rotation={[Math.PI / 2.35, 0, 0]}>
          <cylinderGeometry args={[0.03, 0.037, 0.7, 12]} />
          <meshStandardMaterial color="#2c2c30" roughness={0.6} />
        </mesh>
        {/* reel seat */}
        <mesh position={[0, -0.05, 0.28]} rotation={[Math.PI / 2.35, 0, 0]}>
          <cylinderGeometry args={[0.026, 0.026, 0.14, 12]} />
          <meshStandardMaterial color="#8a8f96" metalness={0.7} roughness={0.35} />
        </mesh>
        {/* spinning reel body */}
        <group ref={reelRef} position={[0, -0.42, 0.34]}>
          <mesh castShadow rotation={[0, 0, 0]}>
            <cylinderGeometry args={[0.055, 0.055, 0.05, 16]} />
            <meshStandardMaterial color="#5b6068" metalness={0.6} roughness={0.4} />
          </mesh>
          <mesh position={[0.045, 0, 0]} castShadow>
            <cylinderGeometry args={[0.018, 0.018, 0.1, 10]} />
            <meshStandardMaterial color="#3d4148" metalness={0.6} roughness={0.4} />
          </mesh>
        </group>
        {/* lower blank */}
        <mesh castShadow position={[0, 0.1, 0.28]} rotation={[Math.PI / 2.35, 0, 0]}>
          <cylinderGeometry args={[0.02, 0.026, 0.9, 12]} />
          <meshStandardMaterial color="#5c4033" roughness={0.5} />
        </mesh>
        {/* mid + tip blank (two-tone for depth) */}
        <mesh castShadow position={[0, 0.42, 0.62]} rotation={[Math.PI / 2.35, 0, 0]}>
          <cylinderGeometry args={[0.012, 0.019, 0.95, 12]} />
          <meshStandardMaterial color="#3f2c22" roughness={0.45} />
        </mesh>
        <mesh castShadow position={[0, 0.72, 0.95]} rotation={[Math.PI / 2.35, 0, 0]}>
          <cylinderGeometry args={[0.006, 0.011, 0.7, 10]} />
          <meshStandardMaterial color="#2a1d16" roughness={0.4} />
        </mesh>
        {/* line guides */}
        {[0.2, 0.5, 0.85].map((z, i) => (
          <mesh key={i} position={[0, z * 0.55 - 0.02, z]} rotation={[Math.PI / 2.35, 0, 0]}>
            <torusGeometry args={[0.03 - i * 0.004, 0.006, 8, 14]} />
            <meshStandardMaterial color="#c9ced4" metalness={0.7} roughness={0.3} />
          </mesh>
        ))}
        {/* two hands gripping the rod / reel */}
        <Hand position={[0.02, -0.12, 0.42]} rotation={[-0.3, 0, 0]} side="right" />
        <Hand position={[0.04, -0.34, 0.3]} rotation={[-0.5, 0, 0]} side="right" />
        {/* invisible tip anchor for the fishing line */}
        <object3D ref={tipRef} position={[0, 1.0, 1.28]} />
      </group>
    </group>
  )
}

export function FishingLine({
  tipRef,
  bobberPos,
}: {
  tipRef: React.RefObject<THREE.Object3D | null>
  bobberPos: [number, number, number] | null
}) {
  const lineObj = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3))
    const mat = new THREE.LineBasicMaterial({ color: '#e8eef2', transparent: true, opacity: 0.5 })
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
    if (bobberPos) {
      arr[3] = bobberPos[0]
      arr[4] = bobberPos[1] + 0.05
      arr[5] = bobberPos[2]
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
  return (
    <group position={[position[0], position[1] - dip, position[2]]}>
      <mesh castShadow>
        <sphereGeometry args={[0.08, 12, 12]} />
        <meshStandardMaterial color="#e23b3b" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.05, 0]}>
        <sphereGeometry args={[0.06, 12, 12]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.14, 0]}>
        <cylinderGeometry args={[0.008, 0.008, 0.12, 6]} />
        <meshStandardMaterial color="#facc15" emissive="#facc15" emissiveIntensity={0.3} />
      </mesh>
    </group>
  )
}
