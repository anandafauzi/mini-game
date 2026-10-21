import { useMemo, useState } from 'react'
import { FISH_SPECIES, RARITY_COLOR, RARITY_LABEL, RARITY_ORDER, type Rarity, type FishSpecies } from '../lib/fish'
import { useProgress } from '../lib/progress'

/**
 * CiriKhas: a compact, species-specific SVG silhouette. Instead of one generic
 * fish icon recoloured per species, the outline actually changes with the body
 * archetype (catfish, elongated, deep-bodied, etc.) and shows whiskers / fins
 * that identify the fish. Used both as the catalogue thumbnail and as the
 * "not yet discovered" silhouette.
 */
function FishGlyph({ species, silhouette = false }: { species: FishSpecies; silhouette?: boolean }) {
  const fill = silhouette ? 'rgba(148,163,184,0.55)' : species.color
  const fin = silhouette ? 'rgba(100,116,139,0.6)' : species.finColor
  const belly = silhouette ? 'rgba(203,213,225,0.5)' : species.bellyColor

  // body ellipse sized by archetype
  const compact = species.shape === 'round'
  const elongated = species.shape === 'long'
  const flat = species.shape === 'flat'
  const ribbon = species.shape === 'ribbon'

  const cx = 60
  const cy = 40
  const rx = elongated ? 26 : flat ? 30 : ribbon ? 22 : compact ? 26 : 30
  const ry = compact || ribbon ? 20 : flat ? 11 : 15

  const whiskers = species.head === 'catfish' || species.head === 'arowana'

  return (
    <svg viewBox="0 0 120 80" className="h-full w-full">
      {/* tail */}
      <polygon
        points={`${cx + rx - 2},${cy} ${cx + rx + 20},${cy - (compact || ribbon ? 16 : 12)} ${cx + rx + 20},${cy + (compact || ribbon ? 16 : 12)}`}
        fill={fin}
      />
      {/* dorsal fin */}
      <polygon
        points={`${cx - 6},${cy - ry + 2} ${cx + 6},${cy - ry - (elongated || flat ? 9 : 15)} ${cx + 14},${cy - ry + 2}`}
        fill={fin}
      />
      {/* body */}
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={fill} />
      {/* belly */}
      <ellipse cx={cx} cy={cy + ry * 0.35} rx={rx * 0.85} ry={ry * 0.5} fill={belly} opacity={0.75} />
      {/* lower (anal) fin */}
      <polygon
        points={`${cx - 4},${cy + ry - 2} ${cx + 6},${cy + ry + 10} ${cx + 16},${cy + ry - 2}`}
        fill={fin}
      />
      {/* pectoral fin */}
      <polygon
        points={`${cx + 4},${cy + 2} ${cx - 6},${cy + ry + 4} ${cx + 8},${cy + 6}`}
        fill={fin}
      />
      {/* whiskers */}
      {whiskers && (
        <g stroke={fin} strokeWidth={1.6} fill="none" strokeLinecap="round">
          <path d={`M${cx + rx - 3},${cy + 3} q -8 6 -16 4`} />
          <path d={`M${cx + rx - 3},${cy + 6} q -8 9 -15 11`} />
          {/* arowana chin barbels */}
          {species.head === 'arowana' && <path d={`M${cx - 2},${cy + ry - 1} q -4 8 -2 12`} />}
        </g>
      )}
      {/* big plate scales for arwana/belida */}
      {!silhouette && species.pattern === 'bigscales' && (
        <g fill={species.finColor} opacity={0.55}>
          {[-12, -2, 8].map((dx, i) =>
            [-4, 2].map((dy, j) => (
              <circle key={`${i}-${j}`} cx={cx + dx} cy={cy + dy} r={3.2} />
            )),
          )}
        </g>
      )}
      {/* eye */}
      <circle cx={cx - rx + 6} cy={cy - ry * 0.35} r={2.6} fill={silhouette ? '#64748b' : '#0b0b0d'} />
    </svg>
  )
}

function RarityBadge({ rarity }: { rarity: Rarity }) {
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-white"
      style={{ backgroundColor: RARITY_COLOR[rarity] }}
    >
      {RARITY_LABEL[rarity]}
    </span>
  )
}

function SpeciesCard({ species, onSelect }: { species: FishSpecies; onSelect: () => void }) {
  const record = useProgress((s) => s.speciesRecords[species.id])
  const discovered = !!record

  return (
    <button
      onClick={onSelect}
      className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/5 p-2 text-left transition hover:border-white/25 hover:bg-white/10 active:scale-[0.98]"
    >
      <div className="mx-auto aspect-[3/2] w-full rounded-lg bg-slate-950/40">
        <FishGlyph species={species} silhouette={!discovered} />
      </div>
      <div className="mt-1.5">
        <div className="truncate text-xs font-bold text-white">
          {discovered ? species.name : '???'}
        </div>
        <div className="mt-0.5 flex items-center justify-between">
          <RarityBadge rarity={species.rarity} />
          {discovered && (
            <span className="text-[10px] font-bold text-emerald-300">x{record.count}</span>
          )}
        </div>
      </div>
    </button>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-1.5 text-xs">
      <span className="text-white/50">{label}</span>
      <span className="font-bold text-white">{value}</span>
    </div>
  )
}

function SpeciesDetail({ species, onClose }: { species: FishSpecies; onClose: () => void }) {
  const record = useProgress((s) => s.speciesRecords[species.id])
  const discovered = !!record

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" data-ui>
      <div className="max-h-[88vh] w-full max-w-md overflow-y-auto rounded-2xl border border-white/15 bg-slate-900/95 p-5 text-white shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-black leading-tight">
              {discovered ? species.name : 'Ikan Misterius'}
            </h2>
            <p className="text-xs italic text-white/60">
              {discovered ? species.scientific : 'Belum ditemukan'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg bg-white/10 px-3 py-1 text-sm font-bold hover:bg-white/20"
          >
            Tutup
          </button>
        </div>

        <div className="mx-auto mt-3 aspect-[3/2] w-full max-w-xs rounded-xl bg-slate-950/50 p-2">
          <FishGlyph species={species} silhouette={!discovered} />
        </div>

        <div className="mt-3 flex items-center gap-2">
          <RarityBadge rarity={species.rarity} />
          {discovered && (
            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
              Sudah ditangkap · {record.count}x
            </span>
          )}
        </div>

        {discovered ? (
          <>
            <p className="mt-3 text-xs leading-relaxed text-white/80">{species.description}</p>
            <div className="mt-3 space-y-1.5">
              <DetailRow label="Habitat" value={species.habitat} />
              <DetailRow
                label="Berat rata-rata"
                value={`${species.minWeight}–${species.maxWeight} kg`}
              />
              <DetailRow label="Rekor beratmu" value={`${record.bestWeight.toFixed(2)} kg`} />
              <DetailRow label="Rekor panjangmu" value={`${record.bestLengthCm} cm`} />
              <DetailRow
                label="Harga jual"
                value={`Rp ${species.pricePerKg.toLocaleString('id-ID')}/kg`}
              />
              <DetailRow label="Kesulitan tarik" value={`${Math.round(species.reelDifficulty * 100)}%`} />
            </div>
          </>
        ) : (
          <p className="mt-3 rounded-lg bg-white/5 px-3 py-3 text-xs leading-relaxed text-white/60">
            Tangkap ikan ini untuk membuka nama, deskripsi, habitat, dan catatan rekor di
            ensiklopedia. Petunjuk: umpan{' '}
            <span className="font-bold text-white/80">{species.preferredBaits.join(', ')}</span>{' '}
            lebih disukainya.
          </p>
        )}
      </div>
    </div>
  )
}

export function Encyclopedia({ onClose }: { onClose: () => void }) {
  const speciesRecords = useProgress((s) => s.speciesRecords)
  const [selected, setSelected] = useState<FishSpecies | null>(null)
  const [rarityFilter, setRarityFilter] = useState<Rarity | 'all'>('all')

  const discoveredCount = useMemo(
    () => FISH_SPECIES.filter((s) => !!speciesRecords[s.id]).length,
    [speciesRecords],
  )

  const list = useMemo(() => {
    const order = (r: Rarity) => RARITY_ORDER.indexOf(r)
    return [...FISH_SPECIES]
      .filter((s) => rarityFilter === 'all' || s.rarity === rarityFilter)
      .sort((a, b) => order(a.rarity) - order(b.rarity) || a.name.localeCompare(b.name))
  }, [rarityFilter])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" data-ui>
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-slate-900/95 text-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
          <div>
            <h2 className="text-xl font-black">Ensiklopedia Ikan</h2>
            <p className="text-[11px] text-white/60">
              Terkoleksi {discoveredCount} / {FISH_SPECIES.length} spesies
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-bold hover:bg-white/20"
          >
            Tutup
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5 px-5 py-3">
          {(['all', ...RARITY_ORDER] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRarityFilter(r as Rarity | 'all')}
              className={`rounded-full px-3 py-1 text-[11px] font-bold transition ${
                rarityFilter === r ? 'bg-white text-slate-900' : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              {r === 'all' ? 'Semua' : RARITY_LABEL[r as Rarity]}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2 overflow-y-auto px-5 pb-5 sm:grid-cols-4">
          {list.map((s) => (
            <SpeciesCard key={s.id} species={s} onSelect={() => setSelected(s)} />
          ))}
        </div>
      </div>

      {selected && <SpeciesDetail species={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
