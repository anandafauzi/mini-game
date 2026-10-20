import { Canvas, useThree } from '@react-three/fiber'
import { useEffect, useState } from 'react'
import * as THREE from 'three'
import { FishingScene } from './game/FishingScene'
import { useGame } from './lib/gameState'
import { loadQuestions } from './lib/questions'
import { StartScreen } from './ui/StartScreen'
import { QuizOverlay } from './ui/QuizOverlay'
import { CatchPanel } from './ui/CatchPanel'
import { LeaderboardWidget } from './ui/Leaderboard'
import { Hud, FishingControls } from './ui/Hud'
import { Inventory } from './ui/Inventory'
import { PauseScreen } from './ui/PauseScreen'
import { ResultScreen } from './ui/ResultScreen'
import { pauseAmbient, resumeAmbient } from './lib/audio'
import { useTime } from './lib/timeOfDay'
import { useGraphics } from './lib/graphics'

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

export default function App() {
  const phase = useGame((s) => s.phase)
  const setQuestions = useGame((s) => s.setQuestions)
  const finishGame = useGame((s) => s.finishGame)
  const setTimePaused = useTime((s) => s.setPaused)
  const quality = useGraphics((s) => s.quality)
  const settings = useGraphics((s) => s.settings)
  const [paused, setPaused] = useState(false)
  const [bagOpen, setBagOpen] = useState(false)

  const handlePause = () => {
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
  }, [phase, bagOpen, setTimePaused])

  useEffect(() => {
    loadQuestions(QUESTIONS_CSV_URL)
      .then(setQuestions)
      .catch((err) => {
        console.error('Gagal memuat soal, pakai soal contoh:', err)
        setQuestions([
          {
            id: 1,
            text: 'Ikan apa yang terkenal sebagai ikan nasional Indonesia?',
            options: { a: 'Ikan Mas', b: 'Ikan Lele', c: 'Ikan Nila', d: 'Ikan Tawes' },
            correct: 'a',
            value: 20,
          },
          {
            id: 2,
            text: 'Sungai terpanjang di Pulau Jawa adalah?',
            options: { a: 'Sungai Bengawan Solo', b: 'Sungai Kapuas', c: 'Sungai Musi', d: 'Sungai Ciliwung' },
            correct: 'a',
            value: 20,
          },
          {
            id: 3,
            text: 'Habitat ikan gabus paling umum ditemukan di?',
            options: { a: 'Laut dalam', b: 'Danau pegunungan', c: 'Sungai dan sawah', d: 'Karang terumbu' },
            correct: 'c',
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
          camera={{ position: [0, 1.6, 1.4], fov: 62, near: 0.1, far: 1400 }}
          gl={{
            antialias: quality !== 'low',
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.05,
            outputColorSpace: THREE.SRGBColorSpace,
            powerPreference: 'high-performance',
          }}
          onCreated={({ gl }) => {
            gl.shadowMap.type = THREE.PCFSoftShadowMap
          }}
        >
          <QualityBridge />
          <FishingScene />
        </Canvas>
        <div className="pointer-events-none absolute inset-0 cinematic-grade" />
        <div className="pointer-events-none absolute inset-0 cinematic-vignette" />
      </div>

      <Hud onPause={handlePause} onOpenBag={() => setBagOpen(true)} />
      <FishingControls />
      <LeaderboardWidget />
      <QuizOverlay />
      <CatchPanel />
      <ResultScreen />
      {bagOpen && <Inventory onClose={() => setBagOpen(false)} />}
      {paused && phase === 'fishing' && <PauseScreen onResume={handleResume} onQuit={handleQuit} />}
      {phase === 'menu' && <StartScreen />}
    </div>
  )
}
