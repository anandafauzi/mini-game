import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Sky } from '@react-three/drei'
import * as THREE from 'three'
import { useTime, sunHeight } from '../lib/timeOfDay'
import { useGraphics } from '../lib/graphics'

interface Preset {
  sun: string
  ambient: number
  dirIntensity: number
  hemi: number
  fogColor: string
  skyTurbidity: number
  skyRayleigh: number
}

const PRESETS: Record<string, Preset> = {
  pagi: {
    sun: '#ffe0b0', ambient: 0.62, dirIntensity: 1.7, hemi: 0.75,
    fogColor: '#cfe6f2', skyTurbidity: 5, skyRayleigh: 1.3,
  },
  siang: {
    sun: '#fff6e8', ambient: 0.78, dirIntensity: 2.15, hemi: 0.9,
    fogColor: '#d3e9f6', skyTurbidity: 3.2, skyRayleigh: 0.7,
  },
  sore: {
    sun: '#ffb877', ambient: 0.6, dirIntensity: 1.6, hemi: 0.7,
    fogColor: '#ecd9c4', skyTurbidity: 7.5, skyRayleigh: 2.2,
  },
  malam: {
    sun: '#a9bfe6', ambient: 0.36, dirIntensity: 0.5, hemi: 0.42,
    fogColor: '#31465f', skyTurbidity: 9, skyRayleigh: 0.5,
  },
}

/**
 * Drives the sun position, sky, fog and light intensities from the game clock.
 * Keeps a readable minimum brightness at night so the game stays playable.
 */
export function DayNight() {
  const period = useTime((s) => s.period)
  const dirRef = useRef<THREE.DirectionalLight>(null)
  const ambientRef = useRef<THREE.AmbientLight>(null)
  const hemiRef = useRef<THREE.HemisphereLight>(null)
  const { scene } = useThree()

  const target = PRESETS[period]
  const current = useRef<Preset>({ ...PRESETS.malam })

  useFrame(() => {
    // lazily lerp current preset toward target for smooth transitions
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
    }
    if (hemiRef.current) hemiRef.current.intensity = c.hemi
    if ((scene as THREE.Scene).fog) {
      ((scene as THREE.Scene).fog as THREE.Fog).color.lerp(new THREE.Color(target.fogColor), 0.02)
    }
  })

  const clockHour = useTime((s) => s.clock)
  const h = sunHeight(clockHour)
  const angle = ((clockHour - 6) / 12) * Math.PI
  const sunPos: [number, number, number] = [Math.cos(angle) * 40, Math.max(-6, h * 40), -20]
  const shadowMap = useGraphics((s) => s.settings.shadowMapSize)
  const shadows = useGraphics((s) => s.settings.shadowsEnabled)

  return (
    <>
      <ambientLight ref={ambientRef} intensity={0.6} />
      <hemisphereLight ref={hemiRef} args={['#cfeaf5', '#2f6f96', 0.9]} />
      <directionalLight
        ref={dirRef}
        position={sunPos}
        intensity={1.9}
        castShadow={shadows}
        shadow-mapSize={[shadowMap, shadowMap]}
        shadow-camera-left={-26}
        shadow-camera-right={26}
        shadow-camera-top={26}
        shadow-camera-bottom={-26}
        shadow-camera-near={0.5}
        shadow-camera-far={120}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        color="#fff4e6"
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
