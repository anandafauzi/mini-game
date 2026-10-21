import { useEffect, useState } from 'react'
import { useGame } from '../lib/gameState'
import { loadIdentity, saveIdentity } from '../lib/identity'

export function IdentityScreen() {
  const setIdentity = useGame((s) => s.setIdentity)
  const changeIdentity = useGame((s) => s.changeIdentity)
  const phase = useGame((s) => s.phase)
  const playerName = useGame((s) => s.playerName)
  const playerProdi = useGame((s) => s.playerProdi)

  const [name, setName] = useState('')
  const [prodi, setProdi] = useState('')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState<ReturnType<typeof loadIdentity>>(null)

  useEffect(() => {
    const id = loadIdentity()
    if (id) {
      setSaved(id)
      // If phase is identity and we have saved identity, prefill
      if (phase === 'identity') {
        setName(id.fullName)
        setProdi(id.prodi)
      }
    }
  }, [phase])

  const canStart = name.replace(/\s+/g, ' ').trim().length >= 2 && prodi.replace(/\s+/g, ' ').trim().length >= 2

  const handleStart = () => {
    const nm = name.replace(/\s+/g, ' ').trim()
    const pd = prodi.replace(/\s+/g, ' ').trim()
    if (nm.length < 2) {
      setError('Nama lengkap wajib diisi')
      return
    }
    if (pd.length < 2) {
      setError('Program studi wajib diisi')
      return
    }
    try {
      saveIdentity({ fullName: nm, prodi: pd })
      setIdentity(nm, pd)
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menyimpan identitas')
    }
  }

  const handleUseSaved = () => {
    if (!saved) return
    setName(saved.fullName)
    setProdi(saved.prodi)
    setError('')
    saveIdentity(saved)
    setIdentity(saved.fullName, saved.prodi)
  }

  const handleChange = () => {
    setError('')
    changeIdentity()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-b from-sky-300 via-sky-100 to-emerald-200">
      <div className="absolute inset-0 opacity-40">
        <svg viewBox="0 0 100 100" className="h-full w-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id="idSky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7db9e8" />
              <stop offset="55%" stopColor="#c5e2ef" />
              <stop offset="100%" stopColor="#eaf3e4" />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="100" height="100" fill="url(#idSky)" />
          <circle cx="78" cy="18" r="8" fill="#fef9c3" opacity="0.9" />
          <path d="M0,55 L18,42 L34,54 L52,38 L70,56 L88,44 L100,54 L100,70 L0,70 Z" fill="#6d9160" opacity="0.8" />
          <rect x="0" y="70" width="100" height="30" fill="#88a86b" />
        </svg>
      </div>

      <div data-ui className="relative mx-4 w-full max-w-md rounded-2xl bg-white/95 p-7 shadow-2xl backdrop-blur">
        <div className="text-center">
          <div className="mb-2 text-5xl">🎣</div>
          <h1 className="text-2xl font-black text-sky-800">Mancing Mania</h1>
          <p className="mt-1 text-sm text-gray-600">Masukkan nama lengkap dan program studi untuk memulai</p>
        </div>

        <div className="mt-5 space-y-3">
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">Nama Lengkap</label>
            <input
              type="text"
              value={name}
              maxLength={48}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Budi Santoso"
              className="w-full rounded-lg border-2 border-emerald-300 px-4 py-2.5 text-base outline-none focus:border-emerald-500"
              autoFocus
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">Program Studi (Prodi)</label>
            <input
              type="text"
              value={prodi}
              maxLength={48}
              onChange={(e) => setProdi(e.target.value)}
              placeholder="Ketik nama prodi (bebas)"
              className="w-full rounded-lg border-2 border-emerald-300 px-4 py-2.5 text-base outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {error && <div className="mt-2 text-xs font-bold text-red-600">{error}</div>}

        <button
          onClick={handleStart}
          disabled={!canStart}
          className="mt-4 w-full rounded-lg bg-emerald-600 py-3 text-base font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Mulai Bermain
        </button>

        {saved && phase === 'identity' && (
          <button
            onClick={handleUseSaved}
            className="mt-2 w-full rounded-lg border-2 border-sky-300 py-2.5 text-sm font-bold text-sky-700 transition hover:bg-sky-50"
          >
            Gunakan Identitas Tersimpan ({saved.fullName} - {saved.prodi})
          </button>
        )}

        {phase === 'menu' && playerName && playerProdi && (
          <button
            onClick={handleChange}
            className="mt-2 w-full rounded-lg border-2 border-gray-300 py-2 text-xs font-bold text-gray-600 transition hover:bg-gray-50"
          >
            Ganti Identitas
          </button>
        )}

        <p className="mt-3 text-[10px] text-gray-500">
          Identitas disimpan di browser (localStorage) untuk kenyamanan. Hanya digunakan untuk menghubungkan hasil kuis.
        </p>
      </div>
    </div>
  )
}
