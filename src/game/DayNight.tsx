import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Sky } from '@react-three/drei'
import * as THREE from 'three'
import { useTime, sunHeight } from '../lib/timeOfDay'

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
    sun: '#ffd9a0', ambient: 0.5, dirIntensity: 1.3, hemi: 0.5,
    fogColor: '#d9ecf5', skyTurbidity: 6, skyRayleigh: 1.2,
  },
  siang: {
    sun: '#fff4e6', ambient: 0.65, dirIntensity: 1.8, hemi: 0.6,
    fogColor: '#dcecf7', skyTurbidity: 4, skyRayleigh: 0.8,
  },
  sore: {
    sun: '#ffb066', ambient: 0.5, dirIntensity: 1.4, hemi: 0.5,
    fogColor: '#f0d9c2', skyTurbidity: 8, skyRayleigh: 2.2,
  },
  malam: {
    sun: '#9fb6e0', ambient: 0.28, dirIntensity: 0.45, hemi: 0.3,
    fogColor: '#2a3a55', skyTurbidity: 10, skyRayleigh: 0.4,
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

  return (
    <>
      <ambientLight ref={ambientRef} intensity={0.6} />
      <hemisphereLight ref={hemiRef} args={['#bfe3f0', '#4f7a3a', 0.55]} />
      <directionalLight
        ref={dirRef}
        position={sunPos}
        intensity={1.6}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
        color="#fff4e6"
      />
      <Sky
        sunPosition={sunPos}
        turbidity={current.current.skyTurbidity}
        rayleigh={current.current.skyRayleigh}
        mieCoefficient={0.008}
        mieDirectionalG={0.85}
      />
    </>
  )
}
