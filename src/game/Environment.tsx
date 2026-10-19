import { useMemo } from 'react'

function Mountain({ position, scale, color }: { position: [number, number, number]; scale: number; color: string }) {
  return (
    <group position={position} scale={scale}>
      <mesh castShadow>
        <coneGeometry args={[6, 8, 6]} />
        <meshStandardMaterial color={color} flatShading />
      </mesh>
      <mesh position={[0, 2.8, 0]}>
        <coneGeometry args={[2.1, 2.5, 6]} />
        <meshStandardMaterial color="#e8eef5" flatShading />
      </mesh>
    </group>
  )
}

function RiceTerrace({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0, i * 0.35, -i * 0.9]} receiveShadow>
          <boxGeometry args={[6 - i * 1.2, 0.35, 1.4]} />
          <meshStandardMaterial color={i % 2 === 0 ? '#4ade80' : '#22c55e'} />
        </mesh>
      ))}
    </group>
  )
}

function House({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh castShadow position={[0, 0.45, 0]}>
        <boxGeometry args={[1, 0.9, 1]} />
        <meshStandardMaterial color="#d6b98c" />
      </mesh>
      <mesh castShadow position={[0, 1.15, 0]}>
        <coneGeometry args={[0.85, 0.7, 4]} />
        <meshStandardMaterial color="#8b4513" flatShading />
      </mesh>
    </group>
  )
}

function Tree({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.1, 0.15, 1, 6]} />
        <meshStandardMaterial color="#6b4423" />
      </mesh>
      <mesh castShadow position={[0, 1.4, 0]}>
        <sphereGeometry args={[0.7, 6, 5]} />
        <meshStandardMaterial color="#16a34a" flatShading />
      </mesh>
    </group>
  )
}

function PalmTree({ position }: { position: [number, number, number] }) {
  const leaves = useMemo(() => {
    const arr: { rot: number; pos: [number, number, number] }[] = []
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2
      arr.push({
        rot: angle,
        pos: [Math.cos(angle) * 0.5, 2.1, Math.sin(angle) * 0.5],
      })
    }
    return arr
  }, [])

  return (
    <group position={position}>
      <mesh castShadow position={[0, 1, 0]} rotation={[0.1, 0, 0.05]}>
        <cylinderGeometry args={[0.08, 0.14, 2.2, 6]} />
        <meshStandardMaterial color="#8b6914" />
      </mesh>
      {leaves.map((leaf, i) => (
        <mesh key={i} position={leaf.pos} rotation={[0.5, leaf.rot, 0]}>
          <boxGeometry args={[0.15, 0.05, 1.1]} />
          <meshStandardMaterial color="#15803d" />
        </mesh>
      ))}
    </group>
  )
}

export function Environment() {
  return (
    <group>
      <mesh position={[0, -0.01, -6]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#3f7d3a" />
      </mesh>

      <RiceTerrace position={[-8, 0.1, -10]} />
      <RiceTerrace position={[8, 0.1, -11]} />
      <RiceTerrace position={[-11, 0.1, -16]} />

      <Mountain position={[-10, 3, -35]} scale={2.2} color="#4a6741" />
      <Mountain position={[2, 4.5, -42]} scale={3.2} color="#3d5c37" />
      <Mountain position={[13, 3.2, -37]} scale={2.5} color="#4a6741" />

      <House position={[-5.5, 0, -13]} rotation={0.4} />
      <House position={[-7.2, 0, -15]} rotation={-0.3} />
      <House position={[6.5, 0, -14]} rotation={-0.5} />
      <House position={[8.3, 0, -16]} rotation={0.2} />

      <Tree position={[-3.5, 0, -9]} />
      <Tree position={[3.8, 0, -10]} />
      <Tree position={[-9.5, 0, -12]} />
      <Tree position={[10, 0, -12]} />
      <PalmTree position={[-4.8, 0, -11]} />
      <PalmTree position={[5.2, 0, -12]} />

      <mesh position={[0, 0.1, 1.5]} receiveShadow>
        <boxGeometry args={[4, 0.2, 2]} />
        <meshStandardMaterial color="#8b7355" />
      </mesh>
      <mesh position={[0, 0.05, 3]} receiveShadow>
        <boxGeometry args={[1.2, 0.1, 2]} />
        <meshStandardMaterial color="#6b5637" />
      </mesh>
    </group>
  )
}
