import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGraphics } from '../lib/graphics'

/**
 * Sea sky: a high drifting cumulus layer and fine sea-spray specks around the
 * boat. Sea birds and distant haze live in Islands.tsx. All clouds sit far
 * above the boat and drift slowly so the horizon stays open and readable.
 */

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
      [1.1, 0.12, 0.25, 0.8],
      [-1.0, -0.05, -0.2, 0.75],
      [0.5, 0.42, -0.12, 0.62],
      [-0.5, 0.36, 0.2, 0.58],
      [0.22, -0.28, 0.3, 0.5],
    ],
    [],
  )

  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#ffffff',
        transparent: true,
        opacity: 0.9,
        roughness: 1,
        emissive: '#dceaf6',
        emissiveIntensity: 0.18,
        depthWrite: false,
      }),
    [],
  )

  useFrame(({ clock }) => {
    if (groupRef.current) {
      const t = clock.elapsedTime * speed
      groupRef.current.position.x = startX + ((t % 220) - 110)
    }
  })

  return (
    <group ref={groupRef} position={position} scale={scale}>
      {puffs.map((p, i) => (
        <mesh key={i} position={[p[0], p[1], p[2]]}>
          <sphereGeometry args={[p[3], 14, 10]} />
          <primitive object={mat} attach="material" />
        </mesh>
      ))}
    </group>
  )
}

export function Clouds() {
  const low = useGraphics((s) => s.quality === 'low')
  const clouds = useMemo(
    () =>
      low
        ? [
            { pos: [-24, 42, -120] as [number, number, number], scale: 3.2, speed: 0.12 },
            { pos: [18, 46, -150] as [number, number, number], scale: 3.8, speed: 0.09 },
            { pos: [0, 50, -200] as [number, number, number], scale: 4.6, speed: 0.07 },
          ]
        : [
            { pos: [-24, 40, -110] as [number, number, number], scale: 3.0, speed: 0.14 },
            { pos: [-8, 46, -140] as [number, number, number], scale: 3.8, speed: 0.1 },
            { pos: [14, 42, -120] as [number, number, number], scale: 2.6, speed: 0.16 },
            { pos: [30, 48, -160] as [number, number, number], scale: 4.2, speed: 0.08 },
            { pos: [-40, 50, -190] as [number, number, number], scale: 4.6, speed: 0.07 },
            { pos: [6, 54, -240] as [number, number, number], scale: 5.2, speed: 0.055 },
            { pos: [46, 44, -130] as [number, number, number], scale: 2.8, speed: 0.13 },
          ],
    [low],
  )
  return (
    <group>
      {clouds.map((c, i) => (
        <Cloud key={i} position={c.pos} scale={c.scale} speed={c.speed} />
      ))}
    </group>
  )
}

/* ------------------------------------------------------------------ */
/*  Fine sea-spray specks drifting in the air around the boat         */
/* ------------------------------------------------------------------ */

export function Particles() {
  const count = useGraphics((s) => s.settings.particleCount)
  const ref = useRef<THREE.Points>(null)
  const { positions, speeds } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const speeds = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 30
      positions[i * 3 + 1] = 0.4 + Math.random() * 5
      positions[i * 3 + 2] = 8 - Math.random() * 60
      speeds[i] = 0.3 + Math.random() * 0.7
    }
    return { positions, speeds }
  }, [count])

  useFrame(() => {
    if (!ref.current) return
    const attr = ref.current.geometry.attributes.position as THREE.BufferAttribute
    const arr = attr.array as Float32Array
    const t = performance.now() * 0.001
    for (let i = 0; i < count; i++) {
      arr[i * 3] += Math.sin(t * speeds[i] + i) * 0.005
      arr[i * 3 + 1] += Math.cos(t * speeds[i] * 0.7 + i) * 0.002
    }
    attr.needsUpdate = true
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.045}
        color="#eaf6ff"
        transparent
        opacity={0.4}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  )
}
