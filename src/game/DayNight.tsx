import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Sky } from '@react-three/drei'
import * as THREE from 'three'
import { useTime, sunHeight } from '../lib/timeOfDay'
import { useGraphics } from '../lib/graphics'
import { sunColor, sunDirection } from './sun'

interface Preset {
  sun: string
  ambient: number
  dirIntensity: number
  hemi: number
  fogColor: string
  skyTurbidity: number
  skyRayleigh: number
}

/**
 * Soft, slightly hazy morning light by default: a low warm sun, restrained
 * ambient fill and a cool sky/ground bounce so the valley keeps its contrast
 * without ever going black in the shadows.
 */
const PRESETS: Record<string, Preset> = {
  pagi: {
    sun: '#ffe6bc', ambient: 0.32, dirIntensity: 2.2, hemi: 0.5,
    fogColor: '#c8dae6', skyTurbidity: 4.6, skyRayleigh: 1.25,
  },
  siang: {
    sun: '#fff4e0', ambient: 0.38, dirIntensity: 2.5, hemi: 0.55,
    fogColor: '#cbdde9', skyTurbidity: 3.4, skyRayleigh: 0.85,
  },
  sore: {
    sun: '#ffd7a0', ambient: 0.3, dirIntensity: 1.95, hemi: 0.42,
    fogColor: '#e3cdb6', skyTurbidity: 6.8, skyRayleigh: 1.9,
  },
  malam: {
    sun: '#a8bfe4', ambient: 0.16, dirIntensity: 0.4, hemi: 0.24,
    fogColor: '#2e4157', skyTurbidity: 8.5, skyRayleigh: 0.4,
  },
}

/**
 * A tiny gradient sky baked into an environment map so wet paddies, the river
 * and the foliage get a believable ambient reflection instead of flat fill.
 */
function SkyEnvironment() {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl)
    const envScene = new THREE.Scene()
    const geo = new THREE.SphereGeometry(10, 24, 16)
    const top = new THREE.Color('#9fc0dd')
    const hor = new THREE.Color('#e6eef2')
    const gnd = new THREE.Color('#6d7a56')
    const c = new THREE.Color()
    const colors: number[] = []
    const pos = geo.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i) / 10
      if (y > 0) c.copy(hor).lerp(top, Math.min(1, y * 1.7))
      else c.copy(hor).lerp(gnd, Math.min(1, -y * 2.4))
      colors.push(c.r, c.g, c.b)
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    const mat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })
    const mesh = new THREE.Mesh(geo, mat)
    envScene.add(mesh)

    const rt = pmrem.fromScene(envScene, 0.04)
    scene.environment = rt.texture
    scene.environmentIntensity = 0.45

    return () => {
      scene.environment = null
      rt.dispose()
      pmrem.dispose()
      geo.dispose()
      mat.dispose()
    }
  }, [gl, scene])

  return null
}

/**
 * Drives sun position, sky, fog and light intensities from the game clock and
 * publishes the result into the shared sun record used by the water shader.
 */
export function DayNight() {
  const period = useTime((s) => s.period)
  const dirRef = useRef<THREE.DirectionalLight>(null)
  const ambientRef = useRef<THREE.AmbientLight>(null)
  const hemiRef = useRef<THREE.HemisphereLight>(null)
  const { scene } = useThree()

  const target = PRESETS[period]
  const current = useRef<Preset>({ ...PRESETS.pagi })

  useFrame(() => {
    const lerp = (a: number, b: number) => THREE.MathUtils.lerp(a, b, 0.02)
    current.current = {
      ...current.current,
      ambient: lerp(current.current.ambient, target.ambient),
      dirIntensity: lerp(current.current.dirIntensity, target.dirIntensity),
      hemi: lerp(current.current.hemi, target.hemi),
      skyTurbidity: lerp(current.current.skyTurbidity, target.skyTurbidity),
      skyRayleigh: lerp(current.current.skyRayleigh, target.skyRayleigh),
    }
    const c = current.current
    if (ambientRef.current) ambientRef.current.intensity = c.ambient
    if (dirRef.current) {
      dirRef.current.intensity = c.dirIntensity
      dirRef.current.color.lerp(new THREE.Color(target.sun), 0.03)
      // publish for the water / wet-surface shaders
      sunDirection.copy(dirRef.current.position).normalize()
      sunColor.copy(dirRef.current.color)
    }
    if (hemiRef.current) hemiRef.current.intensity = c.hemi
    const fog = scene.fog as THREE.Fog | null
    if (fog) fog.color.lerp(new THREE.Color(target.fogColor), 0.02)
  })

  const clockHour = useTime((s) => s.clock)
  const h = sunHeight(clockHour)
  const angle = ((clockHour - 6) / 12) * Math.PI
  // low warm sun: keeps long soft shadows across the terraces
  const sunPos: [number, number, number] =
    h > 0 ? [Math.cos(angle) * 46, 10 + h * 40, -32] : [Math.cos(angle) * 46, -14, -32]
  const shadowMap = useGraphics((s) => s.settings.shadowMapSize)
  const shadows = useGraphics((s) => s.settings.shadowsEnabled)

  return (
    <>
      <SkyEnvironment />
      <ambientLight ref={ambientRef} intensity={0.32} />
      <hemisphereLight ref={hemiRef} args={['#bcd7ea', '#5d7444', 0.5]} />
      <directionalLight
        ref={dirRef}
        position={sunPos}
        intensity={2.2}
        castShadow={shadows}
        shadow-mapSize={[shadowMap, shadowMap]}
        shadow-camera-left={-48}
        shadow-camera-right={48}
        shadow-camera-top={48}
        shadow-camera-bottom={-48}
        shadow-camera-near={1}
        shadow-camera-far={300}
        shadow-bias={-0.0005}
        shadow-normalBias={0.06}
        color="#ffe6bc"
      />
      <Sky
        sunPosition={sunPos}
        turbidity={current.current.skyTurbidity}
        rayleigh={current.current.skyRayleigh}
        mieCoefficient={0.006}
        mieDirectionalG={0.8}
      />
    </>
  )
}
