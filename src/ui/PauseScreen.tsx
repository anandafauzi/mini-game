export function PauseScreen({
  onResume,
  onQuit,
}: {
  onResume: () => void
  onQuit: () => void
}) {
  return (
    <div data-ui className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-xs rounded-2xl border border-white/15 bg-slate-900/90 p-6 text-center text-white shadow-2xl">
        <div className="text-4xl">⏸️</div>
        <h2 className="mt-2 text-xl font-black">Jeda</h2>
        <p className="mt-1 text-xs text-white/60">Permainan dihentikan sementara</p>
        <button
          onClick={onResume}
          className="mt-5 w-full rounded-xl bg-emerald-600 py-3 font-bold transition hover:bg-emerald-700 active:scale-95"
        >
          Lanjut Mancing
        </button>
        <button
          onClick={onQuit}
          className="mt-2 w-full rounded-xl bg-white/10 py-3 text-sm font-bold transition hover:bg-white/20 active:scale-95"
        >
          Keluar ke Menu
        </button>
      </div>
    </div>
  )
}
