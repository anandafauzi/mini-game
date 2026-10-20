import { useCallback, useEffect, useRef, useState } from 'react'
import { useFrame, useThree, useThree as useR3F } from '@react-three/fiber'
import { Sky } from '@react-three/drei'
import * as THREE from 'three'
import { Environment } from './Environment'
import { Water } from './Water'
import { Riverbed, Rapids } from './Riverbed'
import { Fish } from './Fish'
import { Bobber, FishingRod, FishingLine } from './FishingRod'
import { Clouds, Birds, Mist } from './Sky'
import { pickRandomSpecies, type FishSpecies } from '../lib/fish'
import { useGame } from '../lib/gameState'
import { playCastSound, playCatchSound, playSplashSound, playAlertSound } from '../lib/audio'
import { emitFishingState } from '../lib/useFishingAction'

type FishingState = 'idle' | 'casting' | 'waiting' | 'approaching' | 'bite' | 'reeling' | 'caught' | 'escaped'

const BOBBER_REST: [number, number, number] = [0, 0.05, -4]
const CAST_TARGET: [number, number, number] = [0.4, 0.05, -5.5]

export function FishingScene() {
  const phase = useGame((s) => s.phase)
  const onFishCaught = useGame((s) => s.onFishCaught)
  const onFishEscaped = useGame((s) => s.onFishEscaped)
  const consumeReelAttempt = useGame((s) => s.consumeReelAttempt)
  const caughtFishInfo = useGame((s) => s.caughtFishInfo)

  const [state, setState] = useState<FishingState>('idle')
  const [castProgress, setCastProgress] = useState<number | null>(null)
  const [bobberPos, setBobberPos] = useState<[number, number, number] | null>(null)
  const [bobberDip, setBobberDip] = useState(0)
  const [activeFish, setActiveFish] = useState<FishSpecies | null>(null)
  const [fishPos, setFishPos] = useState<[number, number, number]>([2, -0.4, -7])
  const [tension, setTension] = useState(0)
  const [reelProgress, setReelProgress] = useState(0)
  const [biteFlash, setBiteFlash] = useState(0)

  useEffect(() => {
    emitFishingState(state)
  }, [state])

  const reelValueRef = useRef(0)
  const reelDirRef = useRef(1)
  const escapeTimer = useRef<number | null>(null)
  const { camera } = useThree()
  const { gl } = useR3F()
  const fpRig = useRef<THREE.Group>(null)
  const rodTipRef = useRef<THREE.Object3D>(null)

  // Camera look-around state
  const lookYaw = useRef(0)
  const lookPitch = useRef(0)
  const dragging = useRef(false)
  const lastPointer = useRef({ x: 0, y: 0 })

  const startCast = useCallback(() => {
    if (state !== 'idle' || phase !== 'fishing') return
    playCastSound()
    setState('casting')
    setCastProgress(0)
    setBobberPos([CAST_TARGET[0], CAST_TARGET[1] + 3, CAST_TARGET[2]])
    setActiveFish(pickRandomSpecies())
  }, [state, phase])

  const hookFish = useCallback(() => {
    if (state !== 'bite') return
    playSplashSound()
    setState('reeling')
    setReelProgress(0)
    reelValueRef.current = 0
    reelDirRef.current = 1
  }, [state])

  useEffect(() => {
    if (phase === 'fishing' || phase === 'catch') return
    setState('idle')
    setCastProgress(null)
    setBobberPos(null)
    setActiveFish(null)
    setBobberDip(0)
    setTension(0)
    setBiteFlash(0)
    if (escapeTimer.current) window.clearTimeout(escapeTimer.current)
  }, [phase])

  useFrame((_, delta) => {
    if (phase !== 'fishing' && phase !== 'catch') return

    if (state === 'casting' && castProgress !== null) {
      const next = Math.min(1, castProgress + delta * 1.4)
      setCastProgress(next)
      setBobberPos([
        THREE.MathUtils.lerp(0, CAST_TARGET[0], next),
        THREE.MathUtils.lerp(1.2, CAST_TARGET[1], Math.sin(next * Math.PI) * 0.6 + next * 0.4),
        THREE.MathUtils.lerp(1, CAST_TARGET[2], next),
      ])
      if (next >= 1) {
        playSplashSound()
        setState('waiting')
        setBobberPos(BOBBER_REST)
        if (escapeTimer.current) window.clearTimeout(escapeTimer.current)
        const delay = 1500 + Math.random() * 3500
        escapeTimer.current = window.setTimeout(() => {
          setState((prev) => (prev !== 'waiting' ? prev : 'approaching'))
        }, delay)
      }
    }

    if (state === 'waiting') {
      setBobberDip(Math.sin(performance.now() * 0.002) * 0.015)
      if (activeFish) {
        setFishPos((p) => [
          THREE.MathUtils.lerp(p[0], CAST_TARGET[0], delta * 0.4),
          -0.45,
          THREE.MathUtils.lerp(p[2], CAST_TARGET[2] + 0.8, delta * 0.4),
        ])
      }
    }

    if (state === 'approaching') {
      setFishPos((p) => [
        THREE.MathUtils.lerp(p[0], CAST_TARGET[0], delta * 2),
        THREE.MathUtils.lerp(p[1], -0.15, delta * 2),
        THREE.MathUtils.lerp(p[2], CAST_TARGET[2], delta * 2),
      ])
      if (Math.abs(fishPos[0] - CAST_TARGET[0]) < 0.15 && Math.abs(fishPos[2] - CAST_TARGET[2]) < 0.3) {
        playAlertSound()
        setState('bite')
        setBobberDip(0.12)
        setTension(1)
        if (escapeTimer.current) window.clearTimeout(escapeTimer.current)
        escapeTimer.current = window.setTimeout(() => {
          setState((prev) => {
            if (prev !== 'bite') return prev
            consumeReelAttempt()
            return 'escaped'
          })
        }, 2000)
      }
    }

    if (state === 'bite') {
      const jitter = Math.sin(performance.now() * 0.03) * 0.04
      setBobberDip(0.12 + jitter)
      setBiteFlash((f) => (f + delta * 4) % (Math.PI * 2))
    }

    if (state === 'reeling') {
      if (escapeTimer.current) window.clearTimeout(escapeTimer.current)
      const diff = activeFish?.reelDifficulty ?? 0.3
      const speed = 0.7 + diff * 0.9
      reelValueRef.current += reelDirRef.current * delta * speed
      if (reelValueRef.current >= 1) {
        reelValueRef.current = 1
        reelDirRef.current = -1
      }
      if (reelValueRef.current <= 0) {
        reelValueRef.current = 0
        reelDirRef.current = 1
      }
      setReelProgress(reelValueRef.current)
      setTension(0.5 + Math.sin(performance.now() * 0.01) * 0.3)
      setFishPos((p) => [
        THREE.MathUtils.lerp(p[0], CAST_TARGET[0], delta * 3),
        THREE.MathUtils.lerp(p[1], 0, delta * 1.5),
        THREE.MathUtils.lerp(p[2], CAST_TARGET[2] + 1.2, delta * 1.2),
      ])
    }

    if (state === 'escaped') {
      setBobberDip(0)
      setTension(0)
      setFishPos((p) => [
        THREE.MathUtils.lerp(p[0], 4, delta * 2),
        THREE.MathUtils.lerp(p[1], -0.5, delta * 2),
        THREE.MathUtils.lerp(p[2], -9, delta * 2),
      ])
    }

    if (state === 'caught') {
      setBobberDip(0)
      setTension(0)
      setFishPos((p) => [
        THREE.MathUtils.lerp(p[0], 0.35, delta * 3),
        THREE.MathUtils.lerp(p[1], 1.35 + Math.sin(performance.now() * 0.004) * 0.06, delta * 3),
        THREE.MathUtils.lerp(p[2], -2.1, delta * 3),
      ])
    }
  })

  useEffect(() => {
    if (state !== 'escaped') return
    const t = window.setTimeout(() => {
      const remaining = useGame.getState().reelAttemptsLeft
      if (remaining > 0) {
        setState('idle')
        setCastProgress(null)
        setBobberPos(null)
        setActiveFish(null)
        setBobberDip(0)
        setTension(0)
      } else {
        onFishEscaped()
      }
    }, 900)
    return () => window.clearTimeout(t)
  }, [state, onFishEscaped])

  const handleReelClick = useCallback(() => {
    if (state !== 'reeling' || !activeFish) return
    const zoneSize = 0.28 - (activeFish.reelDifficulty ?? 0.3) * 0.12
    const inGreen =
      reelValueRef.current >= 0.5 - zoneSize / 2 &&
      reelValueRef.current <= 0.5 + zoneSize / 2
    const distFromCenter = Math.abs(reelValueRef.current - 0.5)
    const accuracy = Math.max(0, 1 - distFromCenter / 0.5)
    const sizeScale = inGreen ? 1 + 0.35 * accuracy : 0.55 + 0.25 * accuracy
    playCatchSound()
    setState('caught')
    setTension(0)
    onFishCaught(activeFish, { inGreen, sizeScale, accuracy })
  }, [state, activeFish, onFishCaught])

  const handleAction = useCallback(() => {
    if (state === 'idle') startCast()
    else if (state === 'bite') hookFish()
    else if (state === 'reeling') handleReelClick()
  }, [state, startCast, hookFish, handleReelClick])

  // Expose action to UI button
  useEffect(() => {
    const handler = () => handleAction()
    window.addEventListener('fishing-action', handler)
    return () => window.removeEventListener('fishing-action', handler)
  }, [handleAction])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault()
        handleAction()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleAction])

  // Camera look-around (drag to rotate view)
  useEffect(() => {
    const canvas = gl.domElement
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('[data-ui]')) return
      dragging.current = true
      lastPointer.current = { x: e.clientX, y: e.clientY }
    }
    const onPointerMove = (e: PointerEvent) => {
      if (!dragging.current) return
      const dx = e.clientX - lastPointer.current.x
      const dy = e.clientY - lastPointer.current.y
      lastPointer.current = { x: e.clientX, y: e.clientY }
      lookYaw.current = THREE.MathUtils.clamp(lookYaw.current - dx * 0.004, -1.1, 1.1)
      lookPitch.current = THREE.MathUtils.clamp(lookPitch.current - dy * 0.003, -0.5, 0.6)
    }
    const onPointerUp = () => {
      dragging.current = false
    }
    canvas.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }
  }, [gl])

  useFrame(() => {
    // Smoothly move camera according to drag look-around
    const targetRotY = lookYaw.current
    const targetRotX = -0.12 + lookPitch.current
    camera.rotation.y = THREE.MathUtils.lerp(camera.rotation.y, targetRotY, 0.1)
    camera.rotation.x = THREE.MathUtils.lerp(camera.rotation.x, targetRotX, 0.1)
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, 1.6 + Math.sin(performance.now() * 0.0005) * 0.03, 0.05)

    if (fpRig.current) {
      fpRig.current.position.copy(camera.position)
      fpRig.current.quaternion.copy(camera.quaternion)
    }
  })

  const fishVisible = state === 'waiting' || state === 'approaching' || state === 'bite' || state === 'reeling' || state === 'escaped' || state === 'caught'
  const displaySpecies = state === 'caught' ? caughtFishInfo?.fish ?? activeFish : activeFish
  const displayScale = state === 'caught' ? caughtFishInfo?.sizeScale ?? 1 : 1

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[10, 16, 8]}
        intensity={1.6}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
        color="#fff4e6"
      />
      <hemisphereLight args={['#bfe3f0', '#4f7a3a', 0.55]} />
      <Sky sunPosition={[10, 8, -20]} turbidity={5} rayleigh={1.0} mieCoefficient={0.008} mieDirectionalG={0.85} />
      <fog attach="fog" args={['#d6e8f0', 22, 62]} />

      <Clouds />
      <Birds />
      <Mist />
      <Environment />
      <Riverbed />
      <Water />
      <Rapids />

      <group ref={fpRig}>
        <FishingRod castProgress={castProgress} tension={tension} tipRef={rodTipRef} />
      </group>
      <FishingLine tipRef={rodTipRef} bobberPos={bobberPos} />
      {bobberPos && <Bobber position={bobberPos} dip={bobberDip} />}

      {displaySpecies && (
        <Fish
          species={displaySpecies}
          position={fishPos}
          visible={fishVisible}
          speed={state === 'reeling' || state === 'caught' ? 3 : 1.2}
          scaleMultiplier={displayScale}
        />
      )}

      {state === 'reeling' && (
        <group position={[0, 1.3, -2]}>
          <mesh>
            <planeGeometry args={[1.6, 0.18]} />
            <meshBasicMaterial color="#1f2937" transparent opacity={0.85} />
          </mesh>
          <mesh position={[0, 0, 0.01]}>
            <planeGeometry args={[0.28 - (activeFish?.reelDifficulty ?? 0.3) * 0.12, 0.18]} />
            <meshBasicMaterial color="#22c55e" />
          </mesh>
          <mesh position={[(reelProgress - 0.5) * 1.6, 0, 0.02]}>
            <planeGeometry args={[0.06, 0.22]} />
            <meshBasicMaterial color="#f8fafc" />
          </mesh>
        </group>
      )}

      {state === 'bite' && (
        <mesh position={[CAST_TARGET[0], 0.9, CAST_TARGET[2]]}>
          <ringGeometry args={[0.35 + Math.sin(biteFlash) * 0.05, 0.45 + Math.sin(biteFlash) * 0.05, 32]} />
          <meshBasicMaterial color="#fbbf24" transparent opacity={0.85} side={THREE.DoubleSide} />
        </mesh>
      )}
    </>
  )
}
