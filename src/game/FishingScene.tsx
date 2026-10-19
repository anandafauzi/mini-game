import { useCallback, useEffect, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Sky } from '@react-three/drei'
import * as THREE from 'three'
import { Environment } from './Environment'
import { Water } from './Water'
import { Fish } from './Fish'
import { Bobber, FishingRod } from './FishingRod'
import { pickRandomSpecies, type FishSpecies } from '../lib/fish'
import { useGame } from '../lib/gameState'

type FishingState = 'idle' | 'casting' | 'waiting' | 'approaching' | 'bite' | 'reeling' | 'caught' | 'escaped'

const BOBBER_REST: [number, number, number] = [0, 0.05, -4]
const CAST_TARGET: [number, number, number] = [0.4, 0.05, -5.5]

export function FishingScene() {
  const phase = useGame((s) => s.phase)
  const onFishCaught = useGame((s) => s.onFishCaught)
  const onFishEscaped = useGame((s) => s.onFishEscaped)

  const [state, setState] = useState<FishingState>('idle')
  const [castProgress, setCastProgress] = useState<number | null>(null)
  const [bobberPos, setBobberPos] = useState<[number, number, number] | null>(null)
  const [bobberDip, setBobberDip] = useState(0)
  const [activeFish, setActiveFish] = useState<FishSpecies | null>(null)
  const [fishPos, setFishPos] = useState<[number, number, number]>([2, -0.4, -7])
  const [tension, setTension] = useState(0)
  const [reelProgress, setReelProgress] = useState(0)

  const reelValueRef = useRef(0)
  const reelDirRef = useRef(1)
  const escapeTimer = useRef<number | null>(null)
  const { size } = useThree()

  const startCast = useCallback(() => {
    if (state !== 'idle' || phase !== 'fishing') return
    setState('casting')
    setCastProgress(0)
    setBobberPos([CAST_TARGET[0], CAST_TARGET[1] + 3, CAST_TARGET[2]])
    setActiveFish(pickRandomSpecies())
  }, [state, phase])

  const hookFish = useCallback(() => {
    if (state !== 'bite') return
    setState('reeling')
    setReelProgress(0)
    reelValueRef.current = 0
    reelDirRef.current = 1
  }, [state])

  useEffect(() => {
    if (phase !== 'fishing') {
      setState('idle')
      setCastProgress(null)
      setBobberPos(null)
      setActiveFish(null)
      setBobberDip(0)
      setTension(0)
      if (escapeTimer.current) window.clearTimeout(escapeTimer.current)
    }
  }, [phase])

  useFrame((_, delta) => {
    if (phase !== 'fishing') return

    if (state === 'casting' && castProgress !== null) {
      const next = Math.min(1, castProgress + delta * 1.4)
      setCastProgress(next)
      setBobberPos([
        THREE.MathUtils.lerp(0, CAST_TARGET[0], next),
        THREE.MathUtils.lerp(1.2, CAST_TARGET[1], Math.sin(next * Math.PI) * 0.6 + next * 0.4),
        THREE.MathUtils.lerp(1, CAST_TARGET[2], next),
      ])
      if (next >= 1) {
        setState('waiting')
        setBobberPos(BOBBER_REST)
        if (escapeTimer.current) window.clearTimeout(escapeTimer.current)
        const delay = 1500 + Math.random() * 3500
        escapeTimer.current = window.setTimeout(() => {
          setState((prev) => {
            if (prev !== 'waiting') return prev
            return 'approaching'
          })
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
        setState('bite')
        setBobberDip(0.12)
        setTension(1)
        if (escapeTimer.current) window.clearTimeout(escapeTimer.current)
        escapeTimer.current = window.setTimeout(() => {
          setState((prev) => {
            if (prev !== 'bite') return prev
            return 'escaped'
          })
        }, 1600)
      }
    }

    if (state === 'bite') {
      const jitter = Math.sin(performance.now() * 0.03) * 0.04
      setBobberDip(0.12 + jitter)
    }

    if (state === 'reeling') {
      if (escapeTimer.current) window.clearTimeout(escapeTimer.current)
      const diff = activeFish?.reelDifficulty ?? 0.3
      const speed = 1.6 + diff * 2.2
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
  })

  useEffect(() => {
    if (state !== 'escaped') return
    const t = window.setTimeout(() => {
      onFishEscaped()
    }, 900)
    return () => window.clearTimeout(t)
  }, [state, onFishEscaped])

  const handleReelClick = useCallback(() => {
    if (state !== 'reeling' || !activeFish) return
    const zoneSize = 0.28 - (activeFish.reelDifficulty ?? 0.3) * 0.12
    const success = reelValueRef.current >= 0.5 - zoneSize / 2 && reelValueRef.current <= 0.5 + zoneSize / 2
    if (success) {
      setState('caught')
      setTension(0)
      onFishCaught(activeFish)
    } else {
      setState('escaped')
      setTension(0)
    }
  }, [state, activeFish, onFishCaught])

  const handleClick = useCallback(() => {
    if (state === 'idle') startCast()
    else if (state === 'bite') hookFish()
    else if (state === 'reeling') handleReelClick()
  }, [state, startCast, hookFish, handleReelClick])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault()
        handleClick()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleClick])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement
      if (t.closest('[data-ui]')) return
      handleClick()
    }
    window.addEventListener('click', onClick)
    return () => window.removeEventListener('click', onClick)
  }, [handleClick])

  const fishVisible = state === 'waiting' || state === 'approaching' || state === 'bite' || state === 'reeling' || state === 'escaped'

  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[8, 12, 5]} intensity={1.2} castShadow shadow-mapSize={[1024, 1024]} />
      <hemisphereLight args={['#87ceeb', '#3f7d3a', 0.4]} />
      <Sky sunPosition={[10, 8, -20]} turbidity={6} rayleigh={1.2} />
      <fog attach="fog" args={['#c5dfc5', 18, 55]} />

      <Environment />
      <Water />

      <FishingRod castProgress={castProgress} tension={tension} bobberPos={bobberPos} />
      {bobberPos && <Bobber position={bobberPos} dip={bobberDip} />}

      {activeFish && (
        <Fish
          species={activeFish}
          position={fishPos}
          visible={fishVisible}
          speed={state === 'reeling' ? 3 : 1.2}
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

      <mesh position={[0, -0.5, 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[size.width, 8]} />
        <meshStandardMaterial color="#6b5637" visible={false} />
      </mesh>
    </>
  )
}
