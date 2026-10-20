/**
 * Google Apps Script — penerima skor dari game "Mancing Kuis Nusantara".
 *
 * CARA PASANG:
 * 1. Buka spreadsheet tujuan skor → Extensions → Apps Script.
 * 2. Ganti isi Code.gs dengan file ini, simpan.
 * 3. Deploy → New deployment → Type: Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 4. Salin URL web app (…/exec) ke .env sebagai VITE_SCORE_SHEET_URL.
 *
 * Perilaku: satu baris per nama pemain. Kalau nama yang sama mengirim skor
 * lagi, barisnya diUPDATE (skor akhir yang menang, bukan akumulasi).
 */

const SHEET_NAME = 'Skor'
const HEADER = ['Nama', 'Skor', 'Waktu (ms)', 'Waktu Submit']

function doPost(e) {
  const lock = LockService.getScriptLock()
  lock.waitLock(30000)
  try {
    const body = JSON.parse(e.postData.contents)
    const name = String(body.player_name || '').trim().slice(0, 24)
    const score = Math.max(0, parseInt(body.score, 10) || 0)
    const durationMs = Math.max(0, parseInt(body.duration_ms, 10) || 0)
    if (name.length < 2) return ContentService.createTextOutput('bad-name')

    const ss = SpreadsheetApp.getActiveSpreadsheet()
    let sheet = ss.getSheetByName(SHEET_NAME)
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME)
      sheet.appendRow(HEADER)
    }

    const values = sheet.getDataRange().getValues()
    for (let i = 1; i < values.length; i++) {
      if (String(values[i][0]).trim() === name) {
        sheet.getRange(i + 1, 2, 1, 3).setValues([[score, durationMs, new Date()]])
        return ContentService.createTextOutput('updated')
      }
    }
    sheet.appendRow([name, score, durationMs, new Date()])
    return ContentService.createTextOutput('ok')
  } catch (err) {
    return ContentService.createTextOutput('error: ' + err)
  } finally {
    lock.releaseLock()
  }
}
