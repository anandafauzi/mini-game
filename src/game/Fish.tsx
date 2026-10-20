import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { FishSpecies } from '../lib/fish'

interface FishProps {
  species: FishSpecies
  position: [number, number, number]
  target?: [number, number, number]
  speed?: number
  visible?: boolean
  onArrive?: () => void
  scaleMultiplier?: number
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

  if (!visible) return null

  const s = species.size

  return (
    <group ref={groupRef} position={position} scale={s * scaleMultiplier}>
      <mesh castShadow>
        <sphereGeometry args={[0.5, 12, 8]} />
        <meshStandardMaterial color={species.color} />
      </mesh>
      <mesh position={[0, -0.12, 0]} scale={[0.85, 0.5, 0.85]}>
        <sphereGeometry args={[0.5, 10, 6]} />
        <meshStandardMaterial color={species.bellyColor} />
      </mesh>
      <mesh ref={tailRef} position={[0, 0, -0.55]} rotation={[0, 0, 0]}>
        <coneGeometry args={[0.28, 0.5, 4]} />
        <meshStandardMaterial color={species.color} flatShading />
      </mesh>
      <mesh position={[0, 0.35, 0]} rotation={[0.3, 0, 0]}>
        <coneGeometry args={[0.15, 0.3, 4]} />
        <meshStandardMaterial color={species.color} flatShading />
      </mesh>
      <mesh position={[0.28, 0.15, 0.35]}>
        <sphereGeometry args={[0.07, 8, 8]} />
        <meshStandardMaterial color="#111111" />
      </mesh>
      <mesh position={[-0.28, 0.15, 0.35]}>
        <sphereGeometry args={[0.07, 8, 8]} />
        <meshStandardMaterial color="#111111" />
      </mesh>
    </group>
  )
}
