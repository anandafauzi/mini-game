const SHEET_URL = import.meta.env.VITE_SCORE_SHEET_URL as string | undefined

export const sheetScoreEnabled = Boolean(SHEET_URL)

/**
 * Kirim skor akhir ke Google Spreadsheet lewat Apps Script web app
 * (lihat sheets/submit_score.gs untuk cara pasang).
 *
 * Apps Script menangani "satu baris per pemain": nama yang sama mengirim
 * skor lagi → barisnya diupdate (skor akhir menang). Request memakai
 * mode 'no-cors' karena URL-nya domain Google sendiri; respon dibuang,
 * yang penting skor terkirim.
 */
export async function submitScoreToSheet(
  playerName: string,
  score: number,
  durationMs: number,
): Promise<void> {
  if (!SHEET_URL) return
  try {
    await fetch(SHEET_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        player_name: playerName,
        score,
        duration_ms: durationMs,
      }),
      mode: 'no-cors',
    })
  } catch (err) {
    console.error('Sheet score error:', err)
  }
}
