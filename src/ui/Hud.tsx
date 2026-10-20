import { useEffect, useRef, useState } from 'react'
import { useGame } from '../lib/gameState'
import { useProgress, xpForLevel } from '../lib/progress'
import { useTime, formatClock } from '../lib/timeOfDay'
import { useFishingAction } from '../lib/useFishingAction'
import { joystick } from '../lib/playerInput'

function Icon({ path, className = '' }: { path: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  )
}

const ICON = {
  wave: 'M2 8c2-2 4-2 6 0s4 2 6 0 4-2 6 0M2 14c2-2 4-2 6 0s4 2 6 0 4-2 6 0',
  sun: 'M12 4v2m0 12v2m8-8h-2M6 12H4m12.9-5.9-1.4 1.4M8.5 15.5l-1.4 1.4m10.8 0-1.4-1.4M8.5 8.5 7.1 7.1M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
  pause: 'M10 5v14M14 5v14',
  fish: 'M3 12c3-5 9-5 12 0-3 5-9 5-12 0zm12 0 5-3v6l-5-3z',
  hook: 'M12 3v9a4 4 0 0 0 8 0v-2m-8 2a4 4 0 0 1-8 0v-2',
}

function TopLeft() {
  const playerName = useGame((s) => s.playerName)
  const level = useProgress((s) => s.level)
  const xp = useProgress((s) => s.xp)
  const money = useProgress((s) => s.money)
  const need = xpForLevel(level)
  const xpPct = Math.min(100, Math.round((xp / need) * 100))

  return (
    <div data-ui className="fixed top-3 left-3 z-30 flex items-center gap-3 rounded-2xl border border-white/15 bg-black/45 px-3 py-2 text-white backdrop-blur-md">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/25 text-sky-300">
        <Icon path={ICON.wave} className="h-5 w-5" />
      </div>
      <div className="min-w-[150px]">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold leading-tight">Laut Nusantara</span>
          <span className="rounded-md bg-amber-400/20 px-1.5 text-[10px] font-bold text-amber-300">
            Lv {level}
          </span>
        </div>
        <div className="flex items-center justify-between text-[10px] text-white/70">
          <span>{playerName || 'Pemancing'}</span>
          <span className="font-bold text-emerald-300">
            Rp {money.toLocaleString('id-ID')}
          </span>
        </div>
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/15">
          <div className="h-full rounded-full bg-emerald-400" style={{ width: `${xpPct}%` }} />
        </div>
      </div>
    </div>
  )
}

function TopRight({ onPause }: { onPause: () => void }) {
  const clock = useTime((s) => s.clock)
  const period = useTime((s) => s.period)
  const label = period === 'pagi' ? 'Pagi' : period === 'siang' ? 'Siang' : period === 'sore' ? 'Sore' : 'Malam'
  const icon = period === 'malam' ? '🌙' : '☀️'

  return (
    <div data-ui className="fixed top-3 right-3 z-30 flex items-center gap-2 text-white">
      <div className="flex items-center gap-2 rounded-2xl border border-white/15 bg-black/45 px-3 py-2 backdrop-blur-md">
        <span className="text-sm font-bold tabular-nums">{formatClock(clock)}</span>
        <span className="text-sm">{icon}</span>
        <span className="hidden text-[10px] text-white/70 sm:inline">{label}</span>
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
  const count = useProgress((s) => s.totalCaught)
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
    joystick.x = dx / max
    joystick.y = -dy / max
  }

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!active.current) return
      move(e.clientX, e.clientY)
    }
    const onUp = () => {
      active.current = false
      setKnob({ x: 0, y: 0 })
      joystick.x = 0
      joystick.y = 0
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
      ? 'CAST'
      : isBite
        ? 'HOOK!'
        : isReeling
          ? 'REEL'
          : '...'

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

export function Hud({ onPause, onOpenBag }: { onPause: () => void; onOpenBag: () => void }) {
  const phase = useGame((s) => s.phase)
  if (phase !== 'fishing') return null

  return (
    <>
      <TopLeft />
      <TopRight onPause={onPause} />
      <FishCounter />
      <Joystick />
      <button
        data-ui
        onClick={onOpenBag}
        className="fixed bottom-6 left-44 z-30 flex h-14 w-14 flex-col items-center justify-center rounded-2xl border border-white/15 bg-black/45 text-white backdrop-blur-md transition hover:bg-black/60 active:scale-95"
      >
        <span className="text-xl">🎒</span>
        <span className="text-[9px] font-bold">Tas</span>
      </button>
    </>
  )
}
