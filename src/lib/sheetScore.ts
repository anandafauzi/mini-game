const SHEET_URL = import.meta.env.VITE_SCORE_SHEET_URL as string | undefined

export const sheetScoreEnabled = Boolean(SHEET_URL)

export interface QuizAnswerPayload {
  questionId: number
  choice: 'a' | 'b' | 'c' | 'd' | null
}

export interface SubmitQuizResult {
  ok: boolean
  score?: number
  correct?: number
  wrong?: number
  total?: number
  updated?: boolean
  created?: boolean
  error?: string
}

function normalize(s: string): string {
  return s.replace(/\s+/g, ' ').trim()
}

/**
 * Kirim hasil kuis lengkap ke Google Apps Script.
 * Backend memvalidasi jawaban dari sheet soal, menghitung nilai,
 * dan melakukan upsert ke sheet 'Hasil Kuis' berdasarkan (nama+prodi).
 */
export async function submitQuizResult(opts: {
  fullName: string
  prodi: string
  sessionId: string
  answers: QuizAnswerPayload[]
  durationMs: number
  retries?: number
}): Promise<SubmitQuizResult> {
  if (!SHEET_URL) return { ok: false, error: 'sheet-disabled' }
  const fullName = normalize(opts.fullName)
  const prodi = normalize(opts.prodi)
  if (fullName.length < 2 || prodi.length < 2) return { ok: false, error: 'bad-identity' }

  const payload = {
    full_name: fullName,
    prodi,
    session_id: opts.sessionId,
    answers: opts.answers.slice(0, 10),
    duration_ms: Math.max(0, Math.round(opts.durationMs)),
  }

  const attempts = Math.max(1, opts.retries ?? 3)
  let lastErr: unknown

  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(SHEET_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
        mode: 'cors',
      })
      if (res.ok) {
        const text = await res.text()
        try {
          return JSON.parse(text) as SubmitQuizResult
        } catch {
          return { ok: true }
        }
      }
      // If cors blocked in some env, try no-cors as last resort
      if (i === attempts - 1 && res.type === 'opaque') {
        await fetch(SHEET_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload),
          mode: 'no-cors',
        })
        return { ok: true }
      }
    } catch (err) {
      lastErr = err
      // simple exponential-ish backoff
      await new Promise((r) => setTimeout(r, 250 * (i + 1)))
    }
  }
  console.error('Sheet quiz result error:', lastErr)
  return { ok: false, error: 'network-error' }
}

export async function fetchQuizResult(fullName: string, prodi: string): Promise<Record<string, unknown> | null> {
  if (!SHEET_URL) return null
  const name = normalize(fullName)
  const pd = normalize(prodi)
  if (name.length < 2 || pd.length < 2) return null
  try {
    const url = `${SHEET_URL}?name=${encodeURIComponent(name)}&prodi=${encodeURIComponent(pd)}`
    const res = await fetch(url, { method: 'GET' })
    if (!res.ok) return null
    const json = await res.json()
    if (!json || json.empty) return null
    return json
  } catch {
    return null
  }
}

/**
 * Kirim skor akhir ke Google Spreadsheet lewat Apps Script web app
 * (backward compatible).
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
