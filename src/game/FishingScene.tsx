import { useCallback, useEffect, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { Ocean } from './Ocean'
import { Boat, type BoatRef } from './Boat'
import { Islands, SeaBirds, SeaHaze } from './Islands'
import { Fish } from './Fish'
import { Bobber, FishingRod, FishingLine } from './FishingRod'
import { Clouds, Particles } from './Sky'
import { DayNight } from './DayNight'
import { pickRandomSpecies, type FishSpecies } from '../lib/fish'
import { useGame } from '../lib/gameState'
import { useProgress } from '../lib/progress'
import { useTime } from '../lib/timeOfDay'
import { playerInput, initKeyboard, combineInput } from '../lib/playerInput'
import { playCastSound, playCatchSound, playSplashSound, playAlertSound, startReelLoop, stopReelLoop } from '../lib/audio'
import { emitFishingState } from '../lib/useFishingAction'
import { oceanHeight } from './oceanWaves'

type FishingState = 'idle' | 'casting' | 'waiting' | 'approaching' | 'bite' | 'reeling' | 'caught' | 'escaped'

// Cast lands in the sea ahead of the boat.
const BOBBER_REST: [number, number, number] = [0.2, 0, -7]
const CAST_TARGET: [number, number, number] = [0.6, 0, -10.5]

// Scratch vectors for the camera-relative first-person rig anchor.
const _fwd = new THREE.Vector3()
const _right = new THREE.Vector3()
const _down = new THREE.Vector3()

/**
 * Bobber that floats on the animated sea surface.
 *
 * The bobber's horizontal position comes from game state, but its vertical
 * position is driven every frame from the shared wave field so it rides the
 * swell smoothly (no render-time sampling / desync). Its live world position
 * is published into `posRef` so the line, ripple and splash can follow it.
 */
function FloatingBobber({
  xz,
  dip,
  posRef,
}: {
  xz: [number, number]
  dip: number
  posRef: React.MutableRefObject<THREE.Vector3>
}) {
  const groupRef = useRef<THREE.Group>(null)
  const smoothY = useRef(oceanHeight(xz[0], xz[1], 0))
  useFrame((state) => {
    const t = state.clock.elapsedTime
    const target = oceanHeight(xz[0], xz[1], t)
    smoothY.current = THREE.MathUtils.lerp(smoothY.current, target, 0.2)
    const y = smoothY.current - dip
    if (groupRef.current) groupRef.current.position.set(xz[0], y, xz[1])
    posRef.current.set(xz[0], y, xz[1])
  })
  return (
    <group ref={groupRef}>
      <Bobber position={[0, 0, 0]} dip={0} />
    </group>
  )
}

/** Expanding ripple rings on the sea surface around the bobber. */
function Ripple({
  xz,
  yRef,
  active,
}: {
  xz: [number, number]
  yRef: React.MutableRefObject<THREE.Vector3>
  active: boolean
}) {
  const refs = useRef<(THREE.Mesh | null)[]>([])
  const groupRef = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (groupRef.current) groupRef.current.position.set(xz[0], yRef.current.y + 0.04, xz[1])
    refs.current.forEach((m, i) => {
      if (!m) return
      const p = (t * (active ? 0.9 : 0.5) + i * 0.5) % 1.5
      const k = p / 1.5
      m.scale.setScalar(0.15 + k * 1.1)
      const mat = m.material as THREE.MeshBasicMaterial
      mat.opacity = (1 - k) * (active ? 0.5 : 0.28)
    })
  })
  return (
    <group ref={groupRef} rotation={[-Math.PI / 2, 0, 0]}>
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          ref={(el) => {
            refs.current[i] = el
          }}
        >
          <ringGeometry args={[0.16, 0.22, 24]} />
          <meshBasicMaterial color="#eafaff" transparent opacity={0.3} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

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
  const [fishPos, setFishPos] = useState<[number, number, number]>([2, -0.6, -12])
  const [tension, setTension] = useState(0)
  const [reelProgress, setReelProgress] = useState(0)
  const [biteFlash, setBiteFlash] = useState(0)
  const [splash, setSplash] = useState(0)

  useEffect(() => {
    emitFishingState(state)
    if (state === 'reeling') startReelLoop()
    else stopReelLoop()
  }, [state])

  const reelValueRef = useRef(0)
  const reelDirRef = useRef(1)
  const escapeTimer = useRef<number | null>(null)
  const { camera } = useThree()
  const fpRig = useRef<THREE.Group>(null)
  const reelBarRef = useRef<THREE.Group>(null)
  const rodTipRef = useRef<THREE.Object3D>(null)
  const boatRef = useRef<BoatRef>({ group: null, deckY: 0 })
  const bobberLiveRef = useRef(new THREE.Vector3(0, 0, -7))
  const nullRef = useRef<THREE.Vector3 | null>(null)

  // Camera look-around state
  const lookYaw = useRef(0)
  const lookPitch = useRef(0)
  const dragging = useRef(false)
  const lastPointer = useRef({ x: 0, y: 0 })
  const pointerLocked = useRef(false)
  const playerPos = useRef(new THREE.Vector3(0, 0, 0))
  const clockAccum = useRef(0)
  const camBobT = useRef(0)
  // head-stabilised deck height: camera rides a slowed, reduced version of
  // the boat's heave so the view never makes the player seasick
  const smoothDeckY = useRef(0)

  const startCast = useCallback(() => {
    if (state !== 'idle' || phase !== 'fishing') return
    playCastSound()
    setState('casting')
    setCastProgress(0)
    setBobberPos([CAST_TARGET[0], CAST_TARGET[1] + 3, CAST_TARGET[2]])
    const bait = useProgress.getState().currentBait
    const tod = useTime.getState().period
    setActiveFish(pickRandomSpecies(bait, tod))
    useProgress.getState().consumeBait()
  }, [state, phase])

  const hookFish = useCallback(() => {
    if (state !== 'bite') return
    playSplashSound()
    setSplash(1)
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

    const t = performance.now() * 0.001
    if (splash > 0) setSplash((s) => Math.max(0, s - delta * 1.6))

    if (state === 'casting' && castProgress !== null) {
      const next = Math.min(1, castProgress + delta * 1.4)
      setCastProgress(next)
      setBobberPos([
        THREE.MathUtils.lerp(0, CAST_TARGET[0], next),
        THREE.MathUtils.lerp(1.4, CAST_TARGET[1], Math.sin(next * Math.PI) * 0.6 + next * 0.4),
        THREE.MathUtils.lerp(-4, CAST_TARGET[2], next),
      ])
      if (next >= 1) {
        playSplashSound()
        setSplash(1)
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
      setBobberDip(Math.sin(t * 2) * 0.015)
      if (activeFish) {
        setFishPos((p) => [
          THREE.MathUtils.lerp(p[0], CAST_TARGET[0], delta * 0.4),
          -0.75,
          THREE.MathUtils.lerp(p[2], CAST_TARGET[2] + 1.2, delta * 0.4),
        ])
      }
    }

    if (state === 'approaching') {
      setFishPos((p) => [
        THREE.MathUtils.lerp(p[0], CAST_TARGET[0], delta * 2),
        THREE.MathUtils.lerp(p[1], -0.3, delta * 2),
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
      const jitter = Math.sin(t * 30) * 0.04
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
      setTension(0.5 + Math.sin(t * 10) * 0.3)
      setFishPos((p) => [
        THREE.MathUtils.lerp(p[0], CAST_TARGET[0], delta * 3),
        THREE.MathUtils.lerp(p[1], -0.1, delta * 1.5),
        THREE.MathUtils.lerp(p[2], CAST_TARGET[2] + 1.4, delta * 1.2),
      ])
    }

    if (state === 'escaped') {
      setBobberDip(0)
      setTension(0)
      setFishPos((p) => [
        THREE.MathUtils.lerp(p[0], 4, delta * 2),
        THREE.MathUtils.lerp(p[1], -0.9, delta * 2),
        THREE.MathUtils.lerp(p[2], -14, delta * 2),
      ])
    }

    if (state === 'caught') {
      setBobberDip(0)
      setTension(0)
      setFishPos((p) => [
        THREE.MathUtils.lerp(p[0], 0.35, delta * 3),
        THREE.MathUtils.lerp(p[1], 1.6 + Math.sin(t * 4) * 0.06, delta * 3),
        THREE.MathUtils.lerp(p[2], -2.6, delta * 3),
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

  useEffect(() => {
    if (phase !== 'fishing') return
    const handler = () => handleAction()
    window.addEventListener('fishing-action', handler)
    return () => window.removeEventListener('fishing-action', handler)
  }, [handleAction, phase])

  useEffect(() => {
    if (phase !== 'fishing') return
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault()
        handleAction()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleAction, phase])

  // Camera look-around: pointer-lock on desktop, drag on touch
  useEffect(() => {
    const canvas = document.querySelector('canvas') as HTMLCanvasElement
    if (!canvas) return
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('[data-ui]')) return
      if (!pointerLocked.current && e.pointerType === 'mouse' && document.pointerLockElement !== canvas) {
        canvas.requestPointerLock?.()
      }
      dragging.current = true
      lastPointer.current = { x: e.clientX, y: e.clientY }
    }
    const onPointerMove = (e: PointerEvent) => {
      if (pointerLocked.current) return
      if (!dragging.current) return
      const dx = e.clientX - lastPointer.current.x
      const dy = e.clientY - lastPointer.current.y
      lastPointer.current = { x: e.clientX, y: e.clientY }
      lookYaw.current = THREE.MathUtils.clamp(lookYaw.current - dx * 0.004, -1.5, 1.5)
      lookPitch.current = THREE.MathUtils.clamp(lookPitch.current - dy * 0.003, -0.5, 0.6)
    }
    const onPointerUp = () => {
      dragging.current = false
    }
    const onMouseMove = (e: MouseEvent) => {
      if (!pointerLocked.current) return
      lookYaw.current = THREE.MathUtils.clamp(lookYaw.current - e.movementX * 0.0022, -1.5, 1.5)
      lookPitch.current = THREE.MathUtils.clamp(lookPitch.current - e.movementY * 0.002, -0.5, 0.6)
    }
    const onLockChange = () => {
      pointerLocked.current = document.pointerLockElement === canvas
      playerInput.pointerLocked = pointerLocked.current
    }
    canvas.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('mousemove', onMouseMove)
    document.addEventListener('pointerlockchange', onLockChange)
    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('pointerlockchange', onLockChange)
    }
  }, [])

  useEffect(() => {
    const cleanup = initKeyboard()
    return () => cleanup()
  }, [])

  useFrame((state, delta) => {
    clockAccum.current += delta
    if (clockAccum.current >= 0.2) {
      useTime.getState().tick(clockAccum.current)
      clockAccum.current = 0
    }

    combineInput()

    if (playerInput.look.yaw !== 0 || playerInput.look.pitch !== 0) {
      lookYaw.current = THREE.MathUtils.clamp(lookYaw.current - playerInput.look.yaw, -1.5, 1.5)
      lookPitch.current = THREE.MathUtils.clamp(lookPitch.current - playerInput.look.pitch, -0.5, 0.6)
      playerInput.look.yaw = 0
      playerInput.look.pitch = 0
    }

    // Player walks a little around the deck (small area, stays aboard)
    const speed = 1.6 * delta
    const fwd = new THREE.Vector3(-Math.sin(lookYaw.current), 0, -Math.cos(lookYaw.current))
    const right = new THREE.Vector3(Math.cos(lookYaw.current), 0, -Math.sin(lookYaw.current))
    playerPos.current.addScaledVector(fwd, playerInput.move.y * speed)
    playerPos.current.addScaledVector(right, playerInput.move.x * speed)
    playerPos.current.x = THREE.MathUtils.clamp(playerPos.current.x, -0.5, 0.5)
    playerPos.current.z = THREE.MathUtils.clamp(playerPos.current.z, -0.8, 0.9)

    const deckY = boatRef.current.deckY
    // almost no extra heave; the smoothed deck follow below does the lifting
    camBobT.current += delta
    const heave = oceanHeight(0, 0, state.clock.elapsedTime) * 0.02 + Math.sin(camBobT.current * 0.9) * 0.002

    // head-stabilised vertical: follow only ~55% of the boat's wave motion,
    // and slowly, so the horizon stays visually calm
    smoothDeckY.current = THREE.MathUtils.lerp(smoothDeckY.current, deckY, 0.035)
    const camDeckY = deckY * 0.45 + smoothDeckY.current * 0.55

    const targetRotY = lookYaw.current
    const targetRotX = -0.14 + lookPitch.current
    camera.rotation.y = THREE.MathUtils.lerp(camera.rotation.y, targetRotY, 0.1)
    camera.rotation.x = THREE.MathUtils.lerp(camera.rotation.x, targetRotX, 0.1)

    const bx = boatRef.current.group?.position.x ?? 0
    const bz = boatRef.current.group?.position.z ?? -1.6
    const camX = bx + playerPos.current.x
    const camZ = bz + playerPos.current.z
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, camX, 0.15)
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, camZ, 0.15)
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, camDeckY + 1.35 + heave * 0.2, 0.06)
    // roll: just a whisper of the boat's roll
    camera.rotation.z = THREE.MathUtils.lerp(camera.rotation.z, (boatRef.current.group?.rotation.z ?? 0) * 0.02, 0.03)

    // Anchor the first-person rod rig to the camera frustum so the rod stays
    // visible on both wide desktop and narrow portrait phone screens.
    if (fpRig.current) {
      const cam = camera as THREE.PerspectiveCamera
      _fwd.set(0, 0, -1).applyQuaternion(cam.quaternion)
      _right.set(1, 0, 0).applyQuaternion(cam.quaternion)
      _down.set(0, -1, 0).applyQuaternion(cam.quaternion)
      // lateral offset sized relative to the frustum half-width at rig depth
      const halfAtRef = Math.tan((cam.fov * Math.PI) / 360) * cam.aspect * 0.42
      const lat = THREE.MathUtils.clamp(halfAtRef * 0.45, 0.1, 0.3)
      fpRig.current.position
        .copy(cam.position)
        .addScaledVector(_right, lat)
        .addScaledVector(_down, 0.3)
        .addScaledVector(_fwd, 0.42)
      fpRig.current.quaternion.copy(cam.quaternion)

      // scale the reel bar so it never overflows narrow portrait screens
      if (reelBarRef.current) {
        const halfAtBar = Math.tan((cam.fov * Math.PI) / 360) * cam.aspect * 1.82
        reelBarRef.current.scale.setScalar(Math.min(1, halfAtBar / 0.85))
      }
    }
  })

  const fishVisible = state === 'waiting' || state === 'approaching' || state === 'bite' || state === 'reeling' || state === 'escaped' || state === 'caught'
  const displaySpecies = state === 'caught' ? caughtFishInfo?.fish ?? activeFish : activeFish
  const displayScale = state === 'caught' ? caughtFishInfo?.sizeScale ?? 1 : 1
  const liveBobber = bobberLiveRef.current

  return (
    <>
      <DayNight />
      <fog attach="fog" args={['#cfe3f0', 140, 1100]} />

      <Clouds />
      <SeaHaze />
      <Islands />
      <SeaBirds />
      <Particles />

      <Ocean />
      <Boat boatRef={boatRef} />

      {/* Splash burst when fish is hooked / cast lands */}
      {splash > 0 && bobberPos && (
        <mesh position={[bobberPos[0], liveBobber.y + 0.05, bobberPos[2]]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.1, 0.1 + splash * 0.7, 28]} />
          <meshBasicMaterial color="#f2fbff" transparent opacity={splash * 0.7} depthWrite={false} />
        </mesh>
      )}

      <group ref={fpRig}>
        <FishingRod castProgress={castProgress} tension={tension} tipRef={rodTipRef} />
        {state === 'reeling' && (
          <group ref={reelBarRef} position={[0, 0.12, -1.4]}>
            {/* track: light blue so it reads clearly against sea & sky */}
            <mesh>
              <planeGeometry args={[1.6, 0.18]} />
              <meshBasicMaterial color="#7dd3fc" transparent opacity={0.85} depthTest={false} />
            </mesh>
            {/* green bonus zone */}
            <mesh position={[0, 0, 0.01]}>
              <planeGeometry args={[0.28 - (activeFish?.reelDifficulty ?? 0.3) * 0.12, 0.18]} />
              <meshBasicMaterial color="#22c55e" transparent opacity={0.95} depthTest={false} />
            </mesh>
            {/* moving marker: bright white on blue/green */}
            <mesh position={[(reelProgress - 0.5) * 1.6, 0, 0.02]}>
              <planeGeometry args={[0.07, 0.22]} />
              <meshBasicMaterial color="#ffffff" depthTest={false} />
            </mesh>
          </group>
        )}
      </group>
      <FishingLine tipRef={rodTipRef} bobberRef={bobberPos ? bobberLiveRef : nullRef} />
      {bobberPos && (
        <FloatingBobber xz={[bobberPos[0], bobberPos[2]]} dip={bobberDip} posRef={bobberLiveRef} />
      )}
      {bobberPos && (
        <Ripple
          xz={[bobberPos[0], bobberPos[2]]}
          yRef={bobberLiveRef}
          active={state === 'bite' || bobberDip > 0.05}
        />
      )}

      {displaySpecies && (
        <Fish
          species={displaySpecies}
          position={fishPos}
          visible={fishVisible}
          speed={state === 'reeling' || state === 'caught' ? 3 : 1.2}
          scaleMultiplier={displayScale}
        />
      )}

      {state === 'bite' && bobberPos && (
        <mesh position={[CAST_TARGET[0], liveBobber.y + 1.2, CAST_TARGET[2]]}>
          <ringGeometry args={[0.35 + Math.sin(biteFlash) * 0.05, 0.45 + Math.sin(biteFlash) * 0.05, 32]} />
          <meshBasicMaterial color="#fbbf24" transparent opacity={0.85} side={THREE.DoubleSide} />
        </mesh>
      )}
    </>
  )
}
