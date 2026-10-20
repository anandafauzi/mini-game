import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

function Cloud({
  position,
  scale,
  speed,
}: {
  position: [number, number, number]
  scale: number
  speed: number
}) {
  const groupRef = useRef<THREE.Group>(null)
  const startX = position[0]
  const puffs = useMemo(
    () => [
      [0, 0, 0, 1.0],
      [0.9, 0.1, 0.2, 0.75],
      [-0.85, -0.05, -0.15, 0.7],
      [0.4, 0.35, -0.1, 0.6],
      [-0.4, 0.3, 0.15, 0.55],
    ],
    [],
  )

  useFrame(({ clock }) => {
    if (groupRef.current) {
      const t = clock.elapsedTime * speed
      groupRef.current.position.x = startX + ((t % 60) - 30)
    }
  })

  return (
    <group ref={groupRef} position={position} scale={scale}>
      {puffs.map((p, i) => (
        <mesh key={i} position={[p[0], p[1], p[2]]}>
          <sphereGeometry args={[p[3], 12, 10]} />
          <meshStandardMaterial
            color="#ffffff"
            transparent
            opacity={0.9}
            roughness={1}
            emissive="#e8f0f8"
            emissiveIntensity={0.1}
          />
        </mesh>
      ))}
    </group>
  )
}

export function Clouds() {
  const clouds = useMemo(
    () => [
      { pos: [-14, 11, -30] as [number, number, number], scale: 1.6, speed: 0.18 },
      { pos: [-6, 13, -38] as [number, number, number], scale: 2.2, speed: 0.12 },
      { pos: [4, 10.5, -28] as [number, number, number], scale: 1.3, speed: 0.22 },
      { pos: [12, 12.5, -34] as [number, number, number], scale: 1.9, speed: 0.15 },
      { pos: [20, 11.5, -40] as [number, number, number], scale: 1.5, speed: 0.2 },
      { pos: [-20, 12, -42] as [number, number, number], scale: 1.7, speed: 0.13 },
    ],
    [],
  )
  return (
    <group>
      {clouds.map((c, i) => (
        <Cloud key={i} position={c.pos} scale={c.scale} speed={c.speed} />
      ))}
    </group>
  )
}

function Bird({
  offset,
  radius,
  height,
  speed,
}: {
  offset: number
  radius: number
  height: number
  speed: number
}) {
  const ref = useRef<THREE.Group>(null)
  const wingL = useRef<THREE.Mesh>(null)
  const wingR = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    const t = clock.elapsedTime * speed + offset
    if (ref.current) {
      ref.current.position.x = Math.cos(t) * radius
      ref.current.position.z = -20 + Math.sin(t) * radius * 0.6
      ref.current.position.y = height + Math.sin(t * 2) * 0.4
      ref.current.rotation.y = -t + Math.PI / 2
      ref.current.rotation.z = Math.cos(t) * 0.25
    }
    const flap = Math.sin(clock.elapsedTime * 8 + offset) * 0.7
    if (wingL.current) wingL.current.rotation.z = flap
    if (wingR.current) wingR.current.rotation.z = -flap
  })

  return (
    <group ref={ref}>
      <mesh scale={[1, 0.7, 1.6]}>
        <sphereGeometry args={[0.09, 8, 6]} />
        <meshStandardMaterial color="#333333" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0, 0.16]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.03, 0.12, 6]} />
        <meshStandardMaterial color="#222222" />
      </mesh>
      <mesh ref={wingL} position={[-0.14, 0, 0]} rotation={[0, 0, 0]}>
        <planeGeometry args={[0.32, 0.12]} />
        <meshStandardMaterial color="#444444" side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={wingR} position={[0.14, 0, 0]} rotation={[0, 0, 0]}>
        <planeGeometry args={[0.32, 0.12]} />
        <meshStandardMaterial color="#444444" side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

export function Birds() {
  return (
    <group>
      <Bird offset={0} radius={12} height={8} speed={0.25} />
      <Bird offset={0.4} radius={12.5} height={8.4} speed={0.25} />
      <Bird offset={0.8} radius={13} height={7.8} speed={0.25} />
      <Bird offset={2.5} radius={16} height={10} speed={0.18} />
      <Bird offset={2.9} radius={16.5} height={10.3} speed={0.18} />
    </group>
  )
}
