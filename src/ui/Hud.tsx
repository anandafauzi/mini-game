import { useEffect, useRef, useState } from 'react'
import { useGame } from '../lib/gameState'
import { useFishingAction } from '../lib/useFishingAction'

function Icon({ path, className = '' }: { path: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  )
}

const ICON = {
  mountain: 'M3 20h18L14 6l-4 7-2-3-5 10z',
  sun: 'M12 4v2m0 12v2m8-8h-2M6 12H4m12.9-5.9-1.4 1.4M8.5 15.5l-1.4 1.4m10.8 0-1.4-1.4M8.5 8.5 7.1 7.1M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
  pause: 'M10 5v14M14 5v14',
  fish: 'M3 12c3-5 9-5 12 0-3 5-9 5-12 0zm12 0 5-3v6l-5-3z',
  hook: 'M12 3v9a4 4 0 0 0 8 0v-2m-8 2a4 4 0 0 1-8 0v-2',
}

function TopLeft() {
  const playerName = useGame((s) => s.playerName)
  const score = useGame((s) => s.score)
  const level = 1 + Math.floor(score / 100)
  const xp = score % 100

  return (
    <div data-ui className="fixed top-3 left-3 z-30 flex items-center gap-3 rounded-2xl border border-white/15 bg-black/45 px-3 py-2 text-white backdrop-blur-md">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/25 text-emerald-300">
        <Icon path={ICON.mountain} className="h-5 w-5" />
      </div>
      <div className="min-w-[130px]">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold leading-tight">Sungai Lestari</span>
          <span className="rounded-md bg-amber-400/20 px-1.5 text-[10px] font-bold text-amber-300">
            Lv {level}
          </span>
        </div>
        <div className="text-[10px] text-white/70">{playerName || 'Pemancing'}</div>
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/15">
          <div className="h-full rounded-full bg-emerald-400" style={{ width: `${xp}%` }} />
        </div>
      </div>
    </div>
  )
}

function TopRight({ onPause }: { onPause: () => void }) {
  const [time, setTime] = useState('06:30')

  useEffect(() => {
    const start = Date.now()
    const id = window.setInterval(() => {
      const mins = Math.floor((Date.now() - start) / 1000 / 6)
      const h = (6 + Math.floor(mins / 60)) % 24
      const m = mins % 60
      setTime(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    }, 1000)
    return () => window.clearInterval(id)
  }, [])

  return (
    <div data-ui className="fixed top-3 right-3 z-30 flex items-center gap-2 text-white">
      <div className="flex items-center gap-2 rounded-2xl border border-white/15 bg-black/45 px-3 py-2 backdrop-blur-md">
        <span className="text-sm font-bold tabular-nums">{time}</span>
        <span className="text-amber-300">
          <Icon path={ICON.sun} className="h-4 w-4" />
        </span>
        <span className="hidden text-[10px] text-white/70 sm:inline">Cerah</span>
      </div>
      <button
        onClick={onPause}
        className="flex h-9 w-9 items-center justify-center rounded-2xl border border-white/15 bg-black/45 backdrop-blur-md transition hover:bg-black/60 active:scale-95"
      >
        <Icon path={ICON.pause} className="h-4 w-4" />
      </button>
    </div>
  )
}

function FishCounter() {
  const count = useGame((s) => s.fishCaughtCount)
  return (
    <div data-ui className="fixed top-1/2 right-3 z-30 flex -translate-y-1/2 flex-col items-center rounded-2xl border border-white/15 bg-black/45 px-2.5 py-3 text-white backdrop-blur-md">
      <span className="text-sky-300">
        <Icon path={ICON.fish} className="h-6 w-6" />
      </span>
      <span className="mt-1 text-sm font-black tabular-nums">{count}</span>
      <span className="mt-0.5 text-[9px] leading-tight text-white/60">Ikan</span>
    </div>
  )
}

function Joystick() {
  const baseRef = useRef<HTMLDivElement>(null)
  const [knob, setKnob] = useState({ x: 0, y: 0 })
  const active = useRef(false)

  const move = (clientX: number, clientY: number) => {
    const el = baseRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2
    const max = r.width / 2 - 14
    let dx = clientX - cx
    let dy = clientY - cy
    const len = Math.hypot(dx, dy)
    if (len > max) {
      dx = (dx / len) * max
      dy = (dy / len) * max
    }
    setKnob({ x: dx, y: dy })
  }

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!active.current) return
      move(e.clientX, e.clientY)
    }
    const onUp = () => {
      active.current = false
      setKnob({ x: 0, y: 0 })
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [])

  return (
    <div
      data-ui
      ref={baseRef}
      onPointerDown={(e) => {
        active.current = true
        move(e.clientX, e.clientY)
      }}
      className="fixed bottom-6 left-6 z-30 h-32 w-32 touch-none rounded-full border border-white/20 bg-white/5 backdrop-blur-sm"
    >
      <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10" />
      <div
        className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/30 shadow-lg backdrop-blur"
        style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }}
      />
    </div>
  )
}

export function FishingControls() {
  const phase = useGame((s) => s.phase)
  const { state, trigger } = useFishingAction()

  if (phase !== 'fishing') return null

  const isBite = state === 'bite'
  const isReeling = state === 'reeling'
  const disabled = state !== 'idle' && state !== 'bite' && state !== 'reeling'

  const label =
    state === 'idle'
      ? 'Lempar'
      : isBite
        ? 'TARIK!'
        : isReeling
          ? 'Gulung'
          : 'Menunggu'

  return (
    <>
      {isBite && (
        <div data-ui className="fixed bottom-44 left-1/2 z-30 -translate-x-1/2 animate-pulse rounded-full bg-amber-500/90 px-4 py-1 text-sm font-bold text-white shadow-lg">
          Ikan makan umpan! Tarik!
        </div>
      )}
      <button
        data-ui
        onClick={trigger}
        disabled={disabled}
        className={`fixed bottom-6 right-6 z-30 flex h-24 w-24 flex-col items-center justify-center rounded-full border-2 text-white shadow-2xl transition active:scale-95
          ${isBite ? 'animate-bounce border-red-300 bg-red-500/90' : ''}
          ${isReeling ? 'border-emerald-300 bg-emerald-600/90' : ''}
          ${state === 'idle' ? 'border-sky-300 bg-sky-600/90' : ''}
          ${disabled ? 'cursor-not-allowed border-white/20 bg-gray-600/70 opacity-70' : ''}
        `}
      >
        <Icon path={ICON.hook} className="h-8 w-8" />
        <span className="mt-0.5 text-[11px] font-black uppercase tracking-wide">{label}</span>
      </button>
    </>
  )
}

export function Hud({ onPause }: { onPause: () => void }) {
  const phase = useGame((s) => s.phase)
  if (phase !== 'fishing') return null

  return (
    <>
      <TopLeft />
      <TopRight onPause={onPause} />
      <FishCounter />
      <Joystick />
    </>
  )
}
