import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGraphics } from '../lib/graphics'
import { fbm, seededRandom } from './noise'

/* ------------------------------------------------------------------ */
/*  Distant tropical islands (LOD-friendly, low-poly silhouettes)     */
/* ------------------------------------------------------------------ */

function makeIslandGeometry(size: number, seedVal: number, seg: number) {
  const g = new THREE.PlaneGeometry(size, size, seg, seg)
  g.rotateX(-Math.PI / 2)
  const pos = g.attributes.position as THREE.BufferAttribute
  const colors = new Float32Array(pos.count * 3)
  const sand = new THREE.Color('#d9c89a')
  const green = new THREE.Color('#3f6b3a')
  const deepGreen = new THREE.Color('#2d5230')
  const rock = new THREE.Color('#6b6a5f')

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const z = pos.getZ(i)
    const r = Math.hypot(x, z) / (size * 0.5)
    const n = fbm(x * 0.06 + seedVal * 10, z * 0.06 + seedVal * 5, 4)
    let h = (1 - r) * size * 0.16 * (0.55 + n * 0.9)
    if (h < 0.2) h = 0.2 - r * 0.35
    pos.setY(i, h)

    const c = new THREE.Color()
    if (h < 0.6) c.copy(sand)
    else if (h < size * 0.07) c.copy(green).lerp(deepGreen, n)
    else c.copy(rock).lerp(deepGreen, 0.3)
    c.offsetHSL(0, 0, (n - 0.5) * 0.06)
    colors[i * 3] = c.r
    colors[i * 3 + 1] = c.g
    colors[i * 3 + 2] = c.b
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  g.computeVertexNormals()
  return g
}

function Island({
  position,
  size,
  seedVal,
}: {
  position: [number, number, number]
  size: number
  seedVal: number
}) {
  const seg = useGraphics((s) => (s.quality === 'low' ? 24 : s.quality === 'medium' ? 40 : 56))
  const geometry = useMemo(() => makeIslandGeometry(size, seedVal, seg), [size, seedVal, seg])
  // a couple of palm silhouettes on top
  const palms = useMemo(() => {
    const arr: { x: number; z: number; h: number }[] = []
    for (let i = 0; i < 6; i++) {
      const a = seededRandom(seedVal + i) * Math.PI * 2
      const r = seededRandom(seedVal + i * 3 + 1) * size * 0.22
      arr.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, h: 1 + seededRandom(seedVal + i * 7) * 1.6 })
    }
    return arr
  }, [seedVal, size])

  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 }),
    [],
  )
  const trunk = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#5a4326', roughness: 0.9 }),
    [],
  )
  const leaf = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#2f5a2c', roughness: 0.85, flatShading: true }),
    [],
  )

  return (
    <group position={position}>
      <mesh geometry={geometry} material={mat} />
      {palms.map((p, i) => (
        <group key={i} position={[p.x, size * 0.05 + p.h * 0.1, p.z]}>
          <mesh position={[0, p.h * 0.5, 0]}>
            <cylinderGeometry args={[0.06, 0.1, p.h, 6]} />
            <primitive object={trunk} attach="material" />
          </mesh>
          <mesh position={[0, p.h, 0]}>
            <coneGeometry args={[0.7, 0.5, 6]} />
            <primitive object={leaf} attach="material" />
          </mesh>
        </group>
      ))}
    </group>
  )
}

export function Islands() {
  const islands = useMemo(
    () => [
      // near-shore islets around the boat (visible while fishing)
      { pos: [-46, -1.2, -70] as [number, number, number], size: 20, seed: 41 },
      { pos: [58, -1.4, -88] as [number, number, number], size: 26, seed: 47 },
      { pos: [-72, -1.3, -140] as [number, number, number], size: 30, seed: 53 },
      { pos: [40, -1.6, -170] as [number, number, number], size: 34, seed: 59 },
      // distant tropical islands on the horizon
      { pos: [-160, -2, -420] as [number, number, number], size: 70, seed: 3 },
      { pos: [210, -3, -520] as [number, number, number], size: 110, seed: 9 },
      { pos: [-320, -2.5, -300] as [number, number, number], size: 60, seed: 17 },
      { pos: [90, -4, -640] as [number, number, number], size: 150, seed: 23 },
      { pos: [-60, -3, -560] as [number, number, number], size: 90, seed: 31 },
    ],
    [],
  )
  return (
    <group>
      {islands.map((is, i) => (
        <Island key={i} position={is.pos} size={is.size} seedVal={is.seed} />
      ))}
    </group>
  )
}

/* ------------------------------------------------------------------ */
/*  Sea birds (gulls) that occasionally glide across the sky          */
/* ------------------------------------------------------------------ */

function Gull({
  offset,
  radius,
  height,
  speed,
  base,
}: {
  offset: number
  radius: number
  height: number
  speed: number
  base: [number, number, number]
}) {
  const ref = useRef<THREE.Group>(null)
  const wingL = useRef<THREE.Mesh>(null)
  const wingR = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    const t = clock.elapsedTime * speed + offset
    if (ref.current) {
      ref.current.position.set(
        base[0] + Math.cos(t) * radius,
        height + Math.sin(t * 2) * 0.5,
        base[2] + Math.sin(t) * radius * 0.7,
      )
      ref.current.rotation.y = -t + Math.PI / 2
      ref.current.rotation.z = Math.cos(t) * 0.3
    }
    const flap = Math.sin(clock.elapsedTime * 7 + offset) * 0.6
    if (wingL.current) wingL.current.rotation.z = flap
    if (wingR.current) wingR.current.rotation.z = -flap
  })

  const body = useMemo(() => new THREE.MeshStandardMaterial({ color: '#f4f4f0', roughness: 0.7 }), [])
  const wing = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#d7d9dd', roughness: 0.8, side: THREE.DoubleSide }),
    [],
  )

  return (
    <group ref={ref} scale={1.4}>
      <mesh scale={[1, 0.7, 1.7]}>
        <sphereGeometry args={[0.09, 8, 6]} />
        <primitive object={body} attach="material" />
      </mesh>
      <mesh ref={wingL} position={[-0.16, 0, 0]}>
        <planeGeometry args={[0.44, 0.14]} />
        <primitive object={wing} attach="material" />
      </mesh>
      <mesh ref={wingR} position={[0.16, 0, 0]}>
        <planeGeometry args={[0.44, 0.14]} />
        <primitive object={wing} attach="material" />
      </mesh>
    </group>
  )
}

export function SeaBirds() {
  return (
    <group>
      <Gull offset={0} radius={26} height={11} speed={0.22} base={[0, 11, -40]} />
      <Gull offset={0.5} radius={27} height={11.6} speed={0.22} base={[0, 11, -40]} />
      <Gull offset={1.0} radius={28} height={11.2} speed={0.22} base={[0, 11, -40]} />
      <Gull offset={2.4} radius={40} height={14} speed={0.16} base={[-40, 14, -120]} />
      <Gull offset={2.9} radius={41} height={14.6} speed={0.16} base={[-40, 14, -120]} />
    </group>
  )
}

/* ------------------------------------------------------------------ */
/*  Layered atmospheric haze band at the horizon                      */
/* ------------------------------------------------------------------ */

export function SeaHaze() {
  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#dbe9f2',
        transparent: true,
        opacity: 0.4,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      }),
    [],
  )
  return (
    <group>
      <mesh position={[0, 8, -700]}>
        <planeGeometry args={[2000, 90]} />
        <primitive object={mat} attach="material" />
      </mesh>
      <mesh position={[0, 4.5, -520]}>
        <planeGeometry args={[1600, 50]} />
        <primitive object={mat.clone()} attach="material" />
      </mesh>
    </group>
  )
}
