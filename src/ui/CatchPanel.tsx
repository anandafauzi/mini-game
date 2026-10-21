import { useMemo, useState } from 'react'
import { useGame } from '../lib/gameState'
import { useProgress, type CatchRecord } from '../lib/progress'
import { RARITY_COLOR, RARITY_LABEL, rollCatch, type Rarity } from '../lib/fish'
import { Encyclopedia } from './Encyclopedia'

/** Bigger, flashier burst for the rarer fish. */
const RARITY_GLOW: Record<Rarity, string> = {
  common: 'shadow-none',
  uncommon: 'shadow-[0_0_40px_-6px_rgba(34,197,94,0.7)]',
  rare: 'shadow-[0_0_50px_-6px_rgba(59,130,246,0.8)]',
  epic: 'shadow-[0_0_60px_-4px_rgba(168,85,247,0.85)]',
  legendary: 'shadow-[0_0_75px_-2px_rgba(245,158,11,0.95)]',
}

export function CatchPanel() {
  const phase = useGame((s) => s.phase)
  const caughtFish = useGame((s) => s.caughtFish)
  const caughtFishInfo = useGame((s) => s.caughtFishInfo)
  const nextQuizQuestion = useGame((s) => s.nextQuizQuestion)
  const proceedToQuiz = useGame((s) => s.proceedToQuiz)
  const finishGame = useGame((s) => s.finishGame)
  const addCatch = useProgress((s) => s.addCatch)

  const [showBook, setShowBook] = useState(false)
  const [saved, setSaved] = useState(false)

  // roll weight/value once per catch
  const rolled = useMemo(
    () => (caughtFish ? rollCatch(caughtFish) : null),
    [caughtFish],
  )

  if (phase !== 'catch' || !caughtFish || !rolled) return null

  const buildRecord = (): CatchRecord => ({
    id: `${caughtFish.id}-${Date.now()}`,
    speciesId: caughtFish.id,
    name: caughtFish.name,
    rarity: caughtFish.rarity,
    weight: rolled.weight,
    lengthCm: rolled.lengthCm,
    value: rolled.value,
    caughtAt: Date.now(),
  })

  const handleCollect = () => {
    if (saved) return
    addCatch(buildRecord())
    setSaved(true)
  }

  const handleOpenQuiz = () => {
    if (!saved) addCatch(buildRecord())
    const next = nextQuizQuestion()
    if (next) proceedToQuiz(next)
    else finishGame()
  }

  const green = caughtFishInfo?.inGreen
  const glow = RARITY_GLOW[caughtFish.rarity]

  return (
    <>
      <div data-ui className="fixed inset-0 z-40 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
        <div className={`w-full max-w-sm overflow-hidden rounded-2xl border border-white/15 bg-slate-900/95 text-white ${glow}`}>
          <div
            className="px-6 py-3 text-center text-sm font-black uppercase tracking-wider"
            style={{ backgroundColor: RARITY_COLOR[caughtFish.rarity] }}
          >
            {RARITY_LABEL[caughtFish.rarity]} Tangkapan!
          </div>
          <div className="px-6 py-5 text-center">
            <div className="text-6xl">🐟</div>
            <h2 className="mt-2 text-2xl font-black">{caughtFish.name}</h2>
            <p className="text-xs italic text-white/60">{caughtFish.scientific}</p>
            {green && (
              <div className="mt-1 inline-block rounded-full bg-emerald-500/20 px-3 py-0.5 text-xs font-bold text-emerald-300">
                Zona hijau - ikan besar!
              </div>
            )}

            <div className="mt-4 grid grid-cols-2 gap-2 text-center">
              <div className="rounded-xl bg-white/5 py-2">
                <div className="text-[10px] uppercase text-white/50">Berat</div>
                <div className="text-sm font-bold">{rolled.weight} kg</div>
              </div>
              <div className="rounded-xl bg-white/5 py-2">
                <div className="text-[10px] uppercase text-white/50">Panjang</div>
                <div className="text-sm font-bold">{rolled.lengthCm} cm</div>
              </div>
            </div>

            <p className="mt-3 text-[11px] leading-relaxed text-white/60">{caughtFish.description}</p>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                onClick={() => setShowBook(true)}
                className="rounded-xl border border-white/15 bg-white/5 py-2.5 text-xs font-bold transition hover:bg-white/10 active:scale-95"
              >
                📖 Lihat Ikan
              </button>
              <button
                onClick={handleCollect}
                disabled={saved}
                className={`rounded-xl py-2.5 text-xs font-bold transition active:scale-95 ${
                  saved ? 'bg-white/10 text-white/40' : 'bg-sky-600 hover:bg-sky-700'
                }`}
              >
                {saved ? '✓ Koleksi' : 'Masukkan Koleksi'}
              </button>
            </div>

            <div className="mt-3">
              <button
                onClick={handleOpenQuiz}
                className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold transition hover:bg-emerald-700 active:scale-95"
              >
                Buka Soal
              </button>
            </div>
          </div>
        </div>
      </div>

      {showBook && <Encyclopedia onClose={() => setShowBook(false)} />}
    </>
  )
}
