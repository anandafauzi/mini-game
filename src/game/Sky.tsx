import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGraphics } from '../lib/graphics'
import { seededRandom } from './noise'

/**
 * Morning sky dressing: a few soft cumulus billboards drifting high over the
 * valley, plus a whisper of airborne motes catching the light near the banks.
 * Replaces the old bubble-clouds / sea-spray pair.
 */

function cloudTexture(seed: number): THREE.CanvasTexture {
  const W = 256
  const H = 128
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  for (let i = 0; i < 24; i++) {
    const u = seededRandom(seed + i * 1.7)
    const v = seededRandom(seed + i * 3.3)
    const x = W * (0.12 + u * 0.76)
    const y = H * (0.42 + v * 0.42)
    const r = W * (0.07 + seededRandom(seed + i * 5.9) * 0.13)
    const a = 0.42 + seededRandom(seed + i * 7.1) * 0.34
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, `rgba(255,255,255,${a})`)
    g.addColorStop(0.55, `rgba(250,252,255,${a * 0.55})`)
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }

  // flatten and shade the underside so they read as cumulus, not blobs
  const shade = ctx.createLinearGradient(0, H * 0.52, 0, H)
  shade.addColorStop(0, 'rgba(168,182,196,0)')
  shade.addColorStop(1, 'rgba(150,166,184,0.4)')
  ctx.globalCompositeOperation = 'source-atop'
  ctx.fillStyle = shade
  ctx.fillRect(0, H * 0.52, W, H * 0.48)
  ctx.globalCompositeOperation = 'source-over'

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

interface CloudDef {
  pos: [number, number, number]
  size: [number, number]
  speed: number
}

function Cloud({ tex, def }: { tex: THREE.CanvasTexture; def: CloudDef }) {
  const ref = useRef<THREE.Sprite>(null)
  const startX = def.pos[0]
  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.elapsedTime * def.speed
    ref.current.position.x = startX + ((t % 320) - 160)
  })
  return (
    <sprite ref={ref} position={def.pos} scale={[def.size[0], def.size[1], 1]}>
      <spriteMaterial map={tex} transparent opacity={0.82} depthWrite={false} fog />
    </sprite>
  )
}

export function Clouds() {
  const low = useGraphics((s) => s.quality === 'low')
  const texA = useMemo(() => cloudTexture(4.2), [])
  const texB = useMemo(() => cloudTexture(17.6), [])

  const defs = useMemo<CloudDef[]>(() => {
    if (low) {
      return [
        { pos: [-60, 92, -300], size: [170, 58], speed: 0.7 },
        { pos: [70, 118, -430], size: [230, 74], speed: 0.5 },
        { pos: [10, 96, -230], size: [140, 46], speed: 0.85 },
      ]
    }
    return [
      { pos: [-90, 88, -280], size: [160, 54], speed: 0.75 },
      { pos: [-10, 112, -400], size: [220, 70], speed: 0.5 },
      { pos: [80, 96, -320], size: [150, 48], speed: 0.85 },
      { pos: [150, 124, -480], size: [250, 82], speed: 0.42 },
      { pos: [-170, 108, -420], size: [200, 64], speed: 0.55 },
      { pos: [30, 140, -560], size: [290, 92], speed: 0.36 },
      { pos: [190, 100, -360], size: [130, 42], speed: 0.9 },
    ]
  }, [low])

  return (
    <group>
      {defs.map((d, i) => (
        <Cloud key={i} tex={i % 2 === 0 ? texA : texB} def={d} />
      ))}
    </group>
  )
}

/* ------------------------------------------------------------------ */
/*  Airborne motes — pollen / dust drifting over the water             */
/* ------------------------------------------------------------------ */

export function Motes() {
  const count = useGraphics((s) => s.settings.particleCount)
  const ref = useRef<THREE.Points>(null)
  const { positions, speeds } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const speeds = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 26
      positions[i * 3 + 1] = 0.3 + Math.random() * 4.5
      positions[i * 3 + 2] = 6 - Math.random() * 46
      speeds[i] = 0.25 + Math.random() * 0.6
    }
    return { positions, speeds }
  }, [count])

  useFrame(() => {
    if (!ref.current) return
    const attr = ref.current.geometry.attributes.position as THREE.BufferAttribute
    const arr = attr.array as Float32Array
    const t = performance.now() * 0.001
    for (let i = 0; i < count; i++) {
      arr[i * 3] += Math.sin(t * speeds[i] + i) * 0.004
      arr[i * 3 + 1] += Math.cos(t * speeds[i] * 0.7 + i) * 0.0016
    }
    attr.needsUpdate = true
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.035}
        color="#fff1d8"
        transparent
        opacity={0.32}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  )
}
