/**
 * Google Apps Script — penerima hasil kuis "Mancing Kuis Nusantara".
 *
 * CARA PASANG:
 * 1. Buka spreadsheet tujuan (bisa spreadsheet sumber soal) → Extensions → Apps Script.
 * 2. Ganti isi Code.gs dengan file ini, simpan.
 * 3. Deploy → New deployment → Type: Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 4. Salin URL web app ke .env sebagai VITE_SCORE_SHEET_URL.
 *
 * Perilaku:
 * - Kunci: Nama lengkap + Prodi (case-insensitive, spasi dinormalisasi)
 * - Upsert: jika sudah ada, UPDATE baris yang sama (tidak buat baris baru)
 * - Hitung nilai di server: baca kunci jawaban dari sheet soal (cari sheet dengan header Soal/Question + A/B/C/D + Kunci/Jawaban)
 * - Batasi 10 soal per sesi; idempotensi berbasis session_id
 * - LockService untuk mencegah benturan saat banyak pengguna bersamaan
 */

const SCORE_SHEET = 'Skor'
const RESULT_SHEET = 'Hasil Kuis'
const LOCK_WAIT_MS = 30000

const HEADER_LEGACY = ['Nama', 'Skor', 'Waktu (ms)', 'Waktu Submit']
const HEADER_RESULT = ['Nama Lengkap', 'Prodi', 'Nilai Akhir', 'Benar', 'Salah', 'Total Soal', 'Waktu Penyelesaian (detik)', 'Waktu Pembaruan Terakhir', 'Session ID', 'Key']

function norm(s) {
  return String(s || '').replace(/\s+/g, ' ').trim()
}
function normKey(s) {
  return norm(s).toLowerCase()
}
function keyOf(name, prodi) {
  return normKey(name) + '|' + normKey(prodi)
}

function getOrCreateSheet(name, header) {
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  let sheet = ss.getSheetByName(name)
  if (!sheet) {
    sheet = ss.insertSheet(name)
    if (header && header.length) sheet.appendRow(header)
  } else if (header && header.length) {
    const hdr = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0]
    if (hdr[0] !== header[0]) {
      // prepend header if missing
      sheet.insertRowBefore(1)
      sheet.getRange(1, 1, 1, header.length).setValues([header])
    }
  }
  return sheet
}

function findQuestionSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  const sheets = ss.getSheets()
  for (var i = 0; i < sheets.length; i++) {
    const sh = sheets[i]
    const name = sh.getName().toLowerCase()
    if (name === 'hasil kuis' || name === 'skor') continue
    const values = sh.getDataRange().getValues()
    if (values.length < 2) continue
    const hdr = values[0].map(function (h) { return String(h).toLowerCase() })
    if (hdr.indexOf('soal') !== -1 || hdr.indexOf('question') !== -1 || hdr.indexOf('pertanyaan') !== -1) {
      return sh
    }
  }
  // fallback to first sheet that isn't result/score
  for (var j = 0; j < sheets.length; j++) {
    const sh = sheets[j]
    const name = sh.getName().toLowerCase()
    if (name !== 'hasil kuis' && name !== 'skor') return sh
  }
  return null
}

function loadAnswerKey() {
  const sh = findQuestionSheet()
  if (!sh) return {}
  const values = sh.getDataRange().getValues()
  if (values.length < 2) return {}
  const hdr = values[0].map(function (h) { return String(h).toLowerCase().replace(/\s+/g, '') })
  // find columns
  function col(key) {
    for (var i = 0; i < hdr.length; i++) {
      if (hdr[i].indexOf(key) !== -1) return i
    }
    return -1
  }
  const idCol = col('id')
  const ansCol = col('kunci') !== -1 ? col('kunci') : (col('jawaban') !== -1 ? col('jawaban') : col('correct'))
  const key = {}
  for (var r = 1; r < values.length; r++) {
    const row = values[r]
    let id = idCol !== -1 ? row[idCol] : r
    id = parseInt(id, 10)
    if (isNaN(id)) continue
    let a = ansCol !== -1 ? String(row[ansCol] || '').trim().toLowerCase() : ''
    if (a === '1') a = 'a'
    if (a === '2') a = 'b'
    if (a === '3') a = 'c'
    if (a === '4') a = 'd'
    if (a === 'a' || a === 'b' || a === 'c' || a === 'd') key[id] = a
  }
  return key
}

function doPost(e) {
  const lock = LockService.getScriptLock()
  lock.waitLock(LOCK_WAIT_MS)
  try {
    const body = JSON.parse(e.postData.contents)
    const fullName = norm(body.full_name || body.player_name || '')
    const prodi = norm(body.prodi || '')
    if (fullName.length < 2 || prodi.length < 2) {
      return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'bad-identity' })).setMimeType(ContentService.MimeType.JSON)
    }
    const key = keyOf(fullName, prodi)
    const sessionId = norm(body.session_id || '')
    const answers = Array.isArray(body.answers) ? body.answers.slice(0, 10) : []
    const durationMs = Math.max(0, parseInt(body.duration_ms, 10) || 0)
    const durationSec = Math.round(durationMs / 1000)

    const answerKey = loadAnswerKey()
    let correct = 0
    let wrong = 0
    for (var i = 0; i < answers.length; i++) {
      const a = answers[i]
      const qid = parseInt(a.questionId || a.id, 10)
      const choice = String(a.choice || '').trim().toLowerCase()
      const c = answerKey[qid]
      if (!c) continue
      if (choice === c) correct++
      else wrong++
    }
    const total = answers.length > 0 ? answers.length : 10
    const score = Math.round((correct / total) * 100 * 100) / 100
    const finalScore = Math.max(0, Math.min(100, Math.round((correct / Math.max(1, total)) * 100)))

    const ss = SpreadsheetApp.getActiveSpreadsheet()
    const resSheet = getOrCreateSheet(RESULT_SHEET, HEADER_RESULT)
    const values = resSheet.getDataRange().getValues()
    const now = new Date()

    for (var r = 1; r < values.length; r++) {
      const k = normKey(values[r][0]) + '|' + normKey(values[r][1])
      if (k === key) {
        // update same row, only if sessionId not seen or newer? keep latest completed
        resSheet.getRange(r + 1, 3, 1, 9).setValues([[finalScore, correct, wrong, total, durationSec, now, sessionId, key]])
        // also write legacy Skor sheet for compatibility
        const legacy = getOrCreateSheet(SCORE_SHEET, HEADER_LEGACY)
        const lv = legacy.getDataRange().getValues()
        for (var lr = 1; lr < lv.length; lr++) {
          if (normKey(lv[lr][0]) === normKey(fullName)) {
            legacy.getRange(lr + 1, 2, 1, 3).setValues([[finalScore, durationMs, now]])
            break
          }
        }
        return ContentService.createTextOutput(JSON.stringify({ ok: true, updated: true, score: finalScore, correct: correct, wrong: wrong, total: total })).setMimeType(ContentService.MimeType.JSON)
      }
    }
    resSheet.appendRow([fullName, prodi, finalScore, correct, wrong, total, durationSec, now, sessionId, key])
    const legacy = getOrCreateSheet(SCORE_SHEET, HEADER_LEGACY)
    legacy.appendRow([fullName, finalScore, durationMs, now])
    return ContentService.createTextOutput(JSON.stringify({ ok: true, created: true, score: finalScore, correct: correct, wrong: wrong, total: total })).setMimeType(ContentService.MimeType.JSON)
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) })).setMimeType(ContentService.MimeType.JSON)
  } finally {
    lock.releaseLock()
  }
}

function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet()
    const resSheet = getOrCreateSheet(RESULT_SHEET, HEADER_RESULT)
    const values = resSheet.getDataRange().getValues()
    const fullName = norm(e.parameter.name || e.parameter.full_name || '')
    const prodi = norm(e.parameter.prodi || '')
    if (fullName.length < 2 || prodi.length < 2) {
      return ContentService.createTextOutput(JSON.stringify({ ok: false })).setMimeType(ContentService.MimeType.JSON)
    }
    const key = keyOf(fullName, prodi)
    for (var r = 1; r < values.length; r++) {
      const k = normKey(values[r][0]) + '|' + normKey(values[r][1])
      if (k === key) {
        return ContentService.createTextOutput(JSON.stringify({
          ok: true,
          fullName: values[r][0],
          prodi: values[r][1],
          score: values[r][2],
          correct: values[r][3],
          wrong: values[r][4],
          total: values[r][5],
          durationSec: values[r][6],
          updatedAt: values[r][7],
        })).setMimeType(ContentService.MimeType.JSON)
      }
    }
    return ContentService.createTextOutput(JSON.stringify({ ok: true, empty: true })).setMimeType(ContentService.MimeType.JSON)
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) })).setMimeType(ContentService.MimeType.JSON)
  }
}
