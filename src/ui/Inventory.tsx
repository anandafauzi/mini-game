import { useProgress } from '../lib/progress'
import { RARITY_LABEL } from '../lib/fish'
import type { BaitId } from '../lib/fish'

const BAIT_INFO: Record<BaitId, { label: string; emoji: string; desc: string }> = {
  cacing: { label: 'Cacing', emoji: '🪱', desc: 'Serba bisa, disukai lele & gabus' },
  pelet: { label: 'Pelet', emoji: '🟤', desc: 'Nila, mas, patin suka' },
  lumut: { label: 'Lumut', emoji: '🌿', desc: 'Lele, patin, baung, raksasa' },
  daun: { label: 'Daun', emoji: '🍃', desc: 'Tawes, bawal' },
  artifisial: { label: 'Umpan Tiruan', emoji: '✨', desc: 'Gabus, bawal, raksasa' },
}

export function Inventory({ onClose }: { onClose: () => void }) {
  const baits = useProgress((s) => s.baits)
  const currentBait = useProgress((s) => s.currentBait)
  const setBait = useProgress((s) => s.setBait)
  const equipment = useProgress((s) => s.equipment)
  const upgrade = useProgress((s) => s.upgrade)
  const money = useProgress((s) => s.money)
  const collection = useProgress((s) => s.collection)

  const upCost = (lvl: number) => 500 + lvl * 750

  const parts: { key: 'rodLevel' | 'lineLevel' | 'reelLevel'; label: string; emoji: string }[] = [
    { key: 'rodLevel', label: 'Joran', emoji: '🎣' },
    { key: 'lineLevel', label: 'Senar', emoji: '🧵' },
    { key: 'reelLevel', label: 'Reel', emoji: '⚙️' },
  ]

  return (
    <div data-ui className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl border border-white/15 bg-slate-900/95 p-5 text-white shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black">Tas Pancing</h2>
          <button
            onClick={onClose}
            className="rounded-lg bg-white/10 px-3 py-1 text-sm font-bold hover:bg-white/20"
          >
            Tutup
          </button>
        </div>

        <div className="mt-3 text-sm font-bold text-emerald-300">
          Rp {money.toLocaleString('id-ID')}
        </div>

        <h3 className="mt-4 text-xs font-bold uppercase tracking-wide text-white/50">Umpan</h3>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {(Object.keys(BAIT_INFO) as BaitId[]).map((b) => {
            const info = BAIT_INFO[b]
            const count = baits[b]
            const active = currentBait === b
            return (
              <button
                key={b}
                disabled={count <= 0}
                onClick={() => setBait(b)}
                className={`rounded-xl border p-2 text-left transition active:scale-95 ${
                  active ? 'border-emerald-400 bg-emerald-500/20' : 'border-white/10 bg-white/5'
                } ${count <= 0 ? 'opacity-40' : 'hover:bg-white/10'}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-lg">{info.emoji}</span>
                  <span className="text-xs font-bold">x{count}</span>
                </div>
                <div className="text-sm font-bold">{info.label}</div>
                <div className="text-[10px] leading-tight text-white/60">{info.desc}</div>
              </button>
            )
          })}
        </div>

        <h3 className="mt-4 text-xs font-bold uppercase tracking-wide text-white/50">Peralatan</h3>
        <div className="mt-2 space-y-2">
          {parts.map((p) => {
            const lvl = equipment[p.key]
            const cost = upCost(lvl)
            const canAfford = money >= cost
            return (
              <div key={p.key} className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{p.emoji}</span>
                  <div>
                    <div className="text-sm font-bold">{p.label}</div>
                    <div className="text-[10px] text-white/50">Level {lvl}</div>
                  </div>
                </div>
                <button
                  disabled={!canAfford}
                  onClick={() => upgrade(p.key, cost)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition active:scale-95 ${
                    canAfford ? 'bg-amber-500 text-slate-900 hover:bg-amber-400' : 'bg-white/10 text-white/40'
                  }`}
                >
                  Upgrade Rp{cost.toLocaleString('id-ID')}
                </button>
              </div>
            )
          })}
        </div>

        <h3 className="mt-4 text-xs font-bold uppercase tracking-wide text-white/50">
          Koleksi Ikan ({collection.length})
        </h3>
        <div className="mt-2 space-y-1">
          {collection.length === 0 && (
            <div className="text-xs text-white/40">Belum ada ikan tersimpan.</div>
          )}
          {collection.slice(0, 12).map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-1.5 text-xs">
              <span className="font-bold">{c.name}</span>
              <span className="text-white/60">
                {c.weight} kg · {RARITY_LABEL[c.rarity]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
