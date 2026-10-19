import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface FishingRodProps {
  castProgress: number | null
  tension: number
  bobberPos: [number, number, number] | null
}

export function FishingRod({ castProgress, tension, bobberPos }: FishingRodProps) {
  const rodRef = useRef<THREE.Group>(null)

  const lineObj = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3))
    const mat = new THREE.LineBasicMaterial({ color: '#eeeeee', transparent: true, opacity: 0.6 })
    return new THREE.Line(geo, mat)
  }, [])

  useFrame(() => {
    if (!rodRef.current) return
    const targetRot = castProgress !== null ? -0.6 + castProgress * 1.0 : 0.15 + tension * 0.3
    rodRef.current.rotation.x = THREE.MathUtils.lerp(rodRef.current.rotation.x, targetRot, 0.12)
  })

  useFrame(() => {
    const attr = lineObj.geometry.attributes.position as THREE.BufferAttribute
    const arr = attr.array as Float32Array
    arr[0] = 0.6
    arr[1] = -0.3
    arr[2] = 1.15
    if (bobberPos) {
      arr[3] = bobberPos[0]
      arr[4] = bobberPos[1] + 0.05
      arr[5] = bobberPos[2]
    } else {
      arr[3] = arr[0]
      arr[4] = arr[1] - 2.5 - tension
      arr[5] = arr[2] - 0.8
    }
    attr.needsUpdate = true
  })

  return (
    <group>
      <group ref={rodRef} position={[0.6, -0.4, 0.2]} rotation={[0.15, 0, 0]}>
        <mesh position={[0, -0.1, 0.2]} rotation={[Math.PI / 2.4, 0, 0]}>
          <cylinderGeometry args={[0.025, 0.035, 1.4, 8]} />
          <meshStandardMaterial color="#5c4033" />
        </mesh>
        <mesh position={[0, -0.35, 0.55]} rotation={[Math.PI / 2.4, 0, 0]}>
          <cylinderGeometry args={[0.015, 0.025, 1.2, 8]} />
          <meshStandardMaterial color="#6b5240" />
        </mesh>
        <mesh position={[0, -0.28, 0.35]} rotation={[Math.PI / 2.4, 0, 0]}>
          <torusGeometry args={[0.06, 0.012, 8, 16]} />
          <meshStandardMaterial color="#888888" metalness={0.6} roughness={0.4} />
        </mesh>
      </group>
      <primitive object={lineObj} />
    </group>
  )
}

export function Bobber({ position, dip = 0 }: { position: [number, number, number]; dip?: number }) {
  return (
    <group position={[position[0], position[1] - dip, position[2]]}>
      <mesh>
        <sphereGeometry args={[0.08, 10, 10]} />
        <meshStandardMaterial color="#ef4444" />
      </mesh>
      <mesh position={[0, 0.05, 0]}>
        <sphereGeometry args={[0.06, 10, 10]} />
        <meshStandardMaterial color="#f8fafc" />
      </mesh>
      <mesh position={[0, 0.14, 0]}>
        <cylinderGeometry args={[0.01, 0.01, 0.12, 6]} />
        <meshStandardMaterial color="#facc15" />
      </mesh>
    </group>
  )
}
