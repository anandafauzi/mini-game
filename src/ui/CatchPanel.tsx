import { useMemo } from 'react'
import { useGame } from '../lib/gameState'
import { useProgress, type CatchRecord } from '../lib/progress'
import { RARITY_COLOR, RARITY_LABEL, rollCatch } from '../lib/fish'

export function CatchPanel() {
  const phase = useGame((s) => s.phase)
  const caughtFish = useGame((s) => s.caughtFish)
  const caughtFishInfo = useGame((s) => s.caughtFishInfo)
  const proceed = useGame((s) => s.returnToFishing)
  const addCatch = useProgress((s) => s.addCatch)
  const sellCatch = useProgress((s) => s.sellCatch)

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

  const handleSave = () => {
    addCatch(buildRecord())
    proceed()
  }

  const handleSell = () => {
    const rec = buildRecord()
    addCatch(rec)
    // addCatch prepends; sell it immediately to grant money
    sellCatch(rec.id)
    proceed()
  }

  const green = caughtFishInfo?.inGreen

  return (
    <div data-ui className="fixed inset-0 z-40 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-white/15 bg-slate-900/95 text-white shadow-2xl">
        <div
          className="px-6 py-3 text-center text-sm font-black uppercase tracking-wider"
          style={{ backgroundColor: RARITY_COLOR[caughtFish.rarity] }}
        >
          {RARITY_LABEL[caughtFish.rarity]} Tangkapan!
        </div>
        <div className="px-6 py-5 text-center">
          <div className="text-6xl">🐟</div>
          <h2 className="mt-2 text-2xl font-black">{caughtFish.name}</h2>
          {green && (
            <div className="mt-1 inline-block rounded-full bg-emerald-500/20 px-3 py-0.5 text-xs font-bold text-emerald-300">
              Zona hijau - ikan besar!
            </div>
          )}

          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-white/5 py-2">
              <div className="text-[10px] uppercase text-white/50">Berat</div>
              <div className="text-sm font-bold">{rolled.weight} kg</div>
            </div>
            <div className="rounded-xl bg-white/5 py-2">
              <div className="text-[10px] uppercase text-white/50">Panjang</div>
              <div className="text-sm font-bold">{rolled.lengthCm} cm</div>
            </div>
            <div className="rounded-xl bg-white/5 py-2">
              <div className="text-[10px] uppercase text-white/50">Harga</div>
              <div className="text-sm font-bold text-amber-300">
                {rolled.value.toLocaleString('id-ID')}
              </div>
            </div>
          </div>

          <div className="mt-5 flex gap-2">
            <button
              onClick={handleSave}
              className="flex-1 rounded-xl bg-sky-600 py-3 text-sm font-bold transition hover:bg-sky-700 active:scale-95"
            >
              Simpan ke Koleksi
            </button>
            <button
              onClick={handleSell}
              className="flex-1 rounded-xl bg-amber-500 py-3 text-sm font-bold text-slate-900 transition hover:bg-amber-400 active:scale-95"
            >
              Jual Rp
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
