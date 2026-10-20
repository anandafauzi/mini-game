let ctx: AudioContext | null = null
let masterGain: GainNode | null = null
let riverGain: GainNode | null = null
let windGain: GainNode | null = null
let started = false
let muted = false
let volume = 0.35

function createNoiseBuffer(context: AudioContext, seconds = 2): AudioBuffer {
  const buffer = context.createBuffer(1, context.sampleRate * seconds, context.sampleRate)
  const data = buffer.getChannelData(0)
  let last = 0
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1
    last = (last + 0.02 * white) / 1.02
    data[i] = last * 3.5
  }
  return buffer
}

export function startAmbient() {
  if (started) {
    ctx?.resume()
    return
  }
  const AudioCtor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  if (!AudioCtor) return
  ctx = new AudioCtor()
  masterGain = ctx.createGain()
  masterGain.gain.value = muted ? 0 : volume
  masterGain.connect(ctx.destination)

  // River: filtered brown noise
  riverGain = ctx.createGain()
  riverGain.gain.value = 0.5
  const riverSource = ctx.createBufferSource()
  riverSource.buffer = createNoiseBuffer(ctx, 3)
  riverSource.loop = true
  const riverFilter = ctx.createBiquadFilter()
  riverFilter.type = 'bandpass'
  riverFilter.frequency.value = 900
  riverFilter.Q.value = 0.6
  riverSource.connect(riverFilter).connect(riverGain).connect(masterGain)
  riverSource.start()

  // Wind: low-pass slow noise
  windGain = ctx.createGain()
  windGain.gain.value = 0.18
  const windSource = ctx.createBufferSource()
  windSource.buffer = createNoiseBuffer(ctx, 4)
  windSource.loop = true
  const windFilter = ctx.createBiquadFilter()
  windFilter.type = 'lowpass'
  windFilter.frequency.value = 400
  windSource.connect(windFilter).connect(windGain).connect(masterGain)
  windSource.start()

  // LFO for wind gusts
  const lfo = ctx.createOscillator()
  lfo.frequency.value = 0.08
  const lfoGain = ctx.createGain()
  lfoGain.gain.value = 0.12
  lfo.connect(lfoGain).connect(windGain.gain)
  lfo.start()

  // Birds: occasional chirps
  scheduleChirps(ctx)

  started = true
}

function scheduleChirps(context: AudioContext) {
  const chirp = () => {
    if (!masterGain) return
    const now = context.currentTime
    const chirps = 1 + Math.floor(Math.random() * 3)
    for (let i = 0; i < chirps; i++) {
      const osc = context.createOscillator()
      const g = context.createGain()
      osc.type = 'sine'
      const base = 2200 + Math.random() * 1400
      const t = now + i * (0.12 + Math.random() * 0.1)
      osc.frequency.setValueAtTime(base, t)
      osc.frequency.exponentialRampToValueAtTime(base * (1.2 + Math.random() * 0.4), t + 0.06)
      osc.frequency.exponentialRampToValueAtTime(base * 0.9, t + 0.12)
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(0.06, t + 0.01)
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.14)
      osc.connect(g).connect(masterGain)
      osc.start(t)
      osc.stop(t + 0.16)
    }
    setTimeout(chirp, 3000 + Math.random() * 7000)
  }
  setTimeout(chirp, 1500)
}

export function playCatchSound() {
  if (!ctx || !masterGain) return
  const now = ctx.currentTime
  ;[523, 659, 784, 1047].forEach((freq, i) => {
    const osc = ctx!.createOscillator()
    const g = ctx!.createGain()
    osc.type = 'triangle'
    const t = now + i * 0.09
    osc.frequency.value = freq
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(0.25, t + 0.02)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.25)
    osc.connect(g).connect(masterGain!)
    osc.start(t)
    osc.stop(t + 0.27)
  })
}

export function playCastSound() {
  if (!ctx || !masterGain) return
  const now = ctx.currentTime
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(600, now)
  osc.frequency.exponentialRampToValueAtTime(150, now + 0.3)
  g.gain.setValueAtTime(0.15, now)
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.3)
  osc.connect(g).connect(masterGain)
  osc.start(now)
  osc.stop(now + 0.32)
}

export function playSplashSound() {
  if (!ctx || !masterGain) return
  const now = ctx.currentTime
  const src = ctx.createBufferSource()
  src.buffer = createNoiseBuffer(ctx, 0.5)
  const filter = ctx.createBiquadFilter()
  filter.type = 'highpass'
  filter.frequency.value = 1200
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.3, now)
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.35)
  src.connect(filter).connect(g).connect(masterGain)
  src.start(now)
  src.stop(now + 0.4)
}

export function playAlertSound() {
  if (!ctx || !masterGain) return
  const now = ctx.currentTime
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = 'square'
  osc.frequency.setValueAtTime(880, now)
  osc.frequency.setValueAtTime(660, now + 0.08)
  g.gain.setValueAtTime(0.12, now)
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.18)
  osc.connect(g).connect(masterGain)
  osc.start(now)
  osc.stop(now + 0.2)
}

let reelNoise: { src: AudioBufferSourceNode; gain: GainNode } | null = null

/** Start a looping reel/line-tension noise (call while reeling). */
export function startReelLoop() {
  if (!ctx || !masterGain || reelNoise) return
  const src = ctx.createBufferSource()
  src.buffer = createNoiseBuffer(ctx, 1)
  src.loop = true
  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = 2600
  filter.Q.value = 1.2
  const gain = ctx.createGain()
  gain.gain.value = 0.0
  gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.1)
  src.connect(filter).connect(gain).connect(masterGain)
  src.start()
  reelNoise = { src, gain }
}

export function stopReelLoop() {
  if (!reelNoise || !ctx) return
  const { src, gain } = reelNoise
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15)
  setTimeout(() => {
    try {
      src.stop()
    } catch {
      /* already stopped */
    }
  }, 200)
  reelNoise = null
}

export function setVolume(v: number) {
  volume = Math.max(0, Math.min(1, v))
  if (masterGain && !muted) masterGain.gain.value = volume
}

export function setMuted(m: boolean) {
  muted = m
  if (masterGain) masterGain.gain.value = m ? 0 : volume
}

export function isMuted() {
  return muted
}

export function isAudioStarted() {
  return started
}

export function pauseAmbient() {
  if (masterGain) masterGain.gain.value = 0
  ctx?.suspend()
}

export function resumeAmbient() {
  if (!started || !ctx) return
  ctx.resume()
  if (masterGain) masterGain.gain.value = muted ? 0 : volume
}
