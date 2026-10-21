import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useState } from 'react'
import * as THREE from 'three'
import { FishingScene } from './game/FishingScene'
import { useGame } from './lib/gameState'
import { loadQuestions } from './lib/questions'
import { StartScreen } from './ui/StartScreen'
import { IdentityScreen } from './ui/IdentityScreen'
import { QuizOverlay } from './ui/QuizOverlay'
import { CatchPanel } from './ui/CatchPanel'
import { LeaderboardWidget } from './ui/Leaderboard'
import { Hud, FishingControls } from './ui/Hud'
import { Inventory } from './ui/Inventory'
import { Encyclopedia } from './ui/Encyclopedia'
import { PauseScreen } from './ui/PauseScreen'
import { ResultScreen } from './ui/ResultScreen'
import { pauseAmbient, resumeAmbient } from './lib/audio'
import { useTime } from './lib/timeOfDay'
import { useGraphics } from './lib/graphics'
import { loadIdentity } from './lib/identity'

const DEFAULT_QUESTIONS_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ89t10uH61U1DFch8HSsCBWc4yzt8o19DttoGdF_B3fCWrf-GthMEnVcihVdNhXaUkJc8tZNFSsQAD/pub?output=csv'
const QUESTIONS_CSV_URL =
  (import.meta.env.VITE_QUESTIONS_CSV_URL as string | undefined) || DEFAULT_QUESTIONS_CSV_URL

/**
 * Applies graphics-quality changes to the live renderer without remounting the
 * scene, so switching quality mid-game no longer resets fishing state.
 */
function QualityBridge() {
  const quality = useGraphics((s) => s.quality)
  const settings = useGraphics((s) => s.settings)
  const gl = useThree((s) => s.gl)

  useEffect(() => {
    gl.setPixelRatio(Math.min(window.devicePixelRatio, settings.dpr[1]))
    gl.shadowMap.enabled = settings.shadowsEnabled
    // force material/shadow recompilation now that quality changed
    gl.shadowMap.needsUpdate = true
  }, [quality, settings, gl])

  return null
}

/**
 * Keeps the vertical lens comfortable on every aspect ratio: a slightly
 * tighter 54° on wide screens (less edge distortion, more presence), opening
 * up to ~70° in portrait so the valley and the river still fit in frame.
 */
function ResponsiveFov() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera

  useFrame((_, delta) => {
    const a = camera.aspect
    const goal = a > 1.2 ? 54 : a > 0.75 ? 61 : 70
    if (Math.abs(camera.fov - goal) < 0.05) return
    camera.fov = THREE.MathUtils.lerp(camera.fov, goal, Math.min(1, delta * 3))
    camera.updateProjectionMatrix()
  })

  return null
}

export default function App() {
  const phase = useGame((s) => s.phase)
  const setQuestions = useGame((s) => s.setQuestions)
  const finishGame = useGame((s) => s.finishGame)
  const setIdentity = useGame((s) => s.setIdentity)
  const setTimePaused = useTime((s) => s.setPaused)
  const quality = useGraphics((s) => s.quality)
  const settings = useGraphics((s) => s.settings)
  const [paused, setPaused] = useState(false)
  const [bagOpen, setBagOpen] = useState(false)
  const [bookOpen, setBookOpen] = useState(false)

  useEffect(() => {
    const id = loadIdentity()
    if (id) {
      setIdentity(id.fullName, id.prodi)
    }
  }, [setIdentity])

  const handlePause = () => {
    document.exitPointerLock?.()
    setPaused(true)
    setTimePaused(true)
    pauseAmbient()
  }
  const handleResume = () => {
    setPaused(false)
    setTimePaused(false)
    resumeAmbient()
  }
  const handleQuit = () => {
    setPaused(false)
    setTimePaused(false)
    resumeAmbient()
    finishGame()
  }

  // ESC opens pause menu while fishing
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape' && phase === 'fishing') {
        if (bagOpen) {
          setBagOpen(false)
        } else if (bookOpen) {
          setBookOpen(false)
        } else {
          setPaused((p) => {
            const next = !p
            setTimePaused(next)
            if (next) pauseAmbient()
            else resumeAmbient()
            return next
          })
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, bagOpen, bookOpen, setTimePaused])

  useEffect(() => {
    loadQuestions(QUESTIONS_CSV_URL)
      .then(setQuestions)
      .catch((err) => {
        console.error('Gagal memuat soal, pakai soal contoh:', err)
        setQuestions([
          {
            id: 1,
            text: 'Ikan hiu termasuk golongan ikan yang...',
            options: { a: 'Bertulang keras', b: 'Bertulang rawan', c: 'Tanpa tulang', d: 'Amfibi' },
            correct: 'b',
            value: 20,
          },
          {
            id: 2,
            text: 'Terumbu karang dengan keanekaragaman hayati terkaya ada di perairan...',
            options: { a: 'Dangkal tropis', b: 'Dalam samudra', c: 'Kutub', d: 'Muara sungai' },
            correct: 'a',
            value: 20,
          },
          {
            id: 3,
            text: 'Tuna bisa berenang sangat cepat karena bentuk tubuhnya menyerupai...',
            options: { a: 'Ubur-ubur', b: 'Torpedo', c: 'Bintang laut', d: 'Kerang' },
            correct: 'b',
            value: 20,
          },
        ])
      })
  }, [setQuestions])

  return (
    <div className="relative h-full w-full">
      <div id="game-canvas-container" className="absolute inset-0">
        <Canvas
          shadows={settings.shadowsEnabled}
          dpr={settings.dpr}
          camera={{ position: [0, 1.6, 1.4], fov: 54, near: 0.1, far: 1400 }}
          gl={{
            antialias: quality !== 'low',
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.0,
            outputColorSpace: THREE.SRGBColorSpace,
            powerPreference: 'high-performance',
          }}
          onCreated={({ gl }) => {
            gl.shadowMap.type = THREE.PCFSoftShadowMap
          }}
        >
          <QualityBridge />
          <ResponsiveFov />
          <FishingScene />
        </Canvas>
        <div className="pointer-events-none absolute inset-0 cinematic-grade" />
        <div className="pointer-events-none absolute inset-0 cinematic-vignette" />
      </div>

      <Hud onPause={handlePause} onOpenBag={() => { document.exitPointerLock?.(); setBagOpen(true) }} onOpenBook={() => { document.exitPointerLock?.(); setBookOpen(true) }} />
      <FishingControls />
      <LeaderboardWidget />
      <QuizOverlay />
      <CatchPanel />
      <ResultScreen />
      {bagOpen && <Inventory onClose={() => setBagOpen(false)} onOpenBook={() => { setBagOpen(false); setBookOpen(true) }} />}
      {bookOpen && <Encyclopedia onClose={() => setBookOpen(false)} />}
      {paused && phase === 'fishing' && <PauseScreen onResume={handleResume} onQuit={handleQuit} />}
      {phase === 'identity' && <IdentityScreen />}
      {phase === 'menu' && <StartScreen />}
    </div>
  )
}
