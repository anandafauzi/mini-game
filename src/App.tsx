import { Canvas } from '@react-three/fiber'
import { useEffect } from 'react'
import { FishingScene } from './game/FishingScene'
import { useGame } from './lib/gameState'
import { loadQuestions } from './lib/questions'
import { StartScreen } from './ui/StartScreen'
import { QuizOverlay } from './ui/QuizOverlay'
import { LeaderboardWidget } from './ui/Leaderboard'
import { Hud, FishingHint } from './ui/Hud'
import { ResultScreen } from './ui/ResultScreen'

const QUESTIONS_CSV_URL = import.meta.env.VITE_QUESTIONS_CSV_URL as string | undefined

export default function App() {
  const phase = useGame((s) => s.phase)
  const setQuestions = useGame((s) => s.setQuestions)

  useEffect(() => {
    if (!QUESTIONS_CSV_URL) {
      console.warn('VITE_QUESTIONS_CSV_URL belum di-set. Pakai soal contoh.')
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
      return
    }
    loadQuestions(QUESTIONS_CSV_URL)
      .then(setQuestions)
      .catch((err) => console.error(err))
  }, [setQuestions])

  return (
    <div className="relative h-full w-full">
      <div id="game-canvas-container" className="absolute inset-0">
        <Canvas shadows camera={{ position: [0, 1.6, 3], fov: 60 }}>
          <FishingScene />
        </Canvas>
      </div>

      <Hud />
      <FishingHint />
      <LeaderboardWidget />
      <QuizOverlay />
      <ResultScreen />
      {phase === 'menu' && <StartScreen />}
    </div>
  )
}
