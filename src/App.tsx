import { Canvas } from '@react-three/fiber'
import { useEffect, useState } from 'react'
import { FishingScene } from './game/FishingScene'
import { useGame } from './lib/gameState'
import { loadQuestions } from './lib/questions'
import { StartScreen } from './ui/StartScreen'
import { QuizOverlay } from './ui/QuizOverlay'
import { LeaderboardWidget } from './ui/Leaderboard'
import { Hud, FishingControls } from './ui/Hud'
import { PauseScreen } from './ui/PauseScreen'
import { ResultScreen } from './ui/ResultScreen'
import { pauseAmbient, resumeAmbient } from './lib/audio'

const DEFAULT_QUESTIONS_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ89t10uH61U1DFch8HSsCBWc4yzt8o19DttoGdF_B3fCWrf-GthMEnVcihVdNhXaUkJc8tZNFSsQAD/pub?output=csv'
const QUESTIONS_CSV_URL =
  (import.meta.env.VITE_QUESTIONS_CSV_URL as string | undefined) || DEFAULT_QUESTIONS_CSV_URL

export default function App() {
  const phase = useGame((s) => s.phase)
  const setQuestions = useGame((s) => s.setQuestions)
  const backToMenu = useGame((s) => s.backToMenu)
  const [paused, setPaused] = useState(false)

  const handlePause = () => {
    setPaused(true)
    pauseAmbient()
  }
  const handleResume = () => {
    setPaused(false)
    resumeAmbient()
  }
  const handleQuit = () => {
    setPaused(false)
    resumeAmbient()
    backToMenu()
  }

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
        <Canvas shadows camera={{ position: [0, 1.6, 3], fov: 60 }}>
          <FishingScene />
        </Canvas>
      </div>

      <Hud onPause={handlePause} />
      <FishingControls />
      <LeaderboardWidget />
      <QuizOverlay />
      <ResultScreen />
      {paused && phase === 'fishing' && <PauseScreen onResume={handleResume} onQuit={handleQuit} />}
      {phase === 'menu' && <StartScreen />}
    </div>
  )
}
