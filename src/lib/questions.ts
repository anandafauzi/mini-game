export interface Question {
  id: number
  text: string
  options: { a: string; b: string; c: string; d: string }
  correct: 'a' | 'b' | 'c' | 'd'
  value: number
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        cur += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      cells.push(cur.trim())
      cur = ''
    } else {
      cur += ch
    }
  }
  cells.push(cur.trim())
  return cells
}

const CORRECT_MAP: Record<string, 'a' | 'b' | 'c' | 'd'> = {
  a: 'a',
  b: 'b',
  c: 'c',
  d: 'd',
  1: 'a',
  2: 'b',
  3: 'c',
  4: 'd',
  A: 'a',
  B: 'b',
  C: 'c',
  D: 'd',
}

export function parseQuestionsCsv(csv: string): Question[] {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0)
  const questions: Question[] = []
  for (const line of lines) {
    const cells = parseCsvLine(line)
    if (cells.length < 7) continue
    const id = parseInt(cells[0], 10)
    if (isNaN(id)) continue
    const text = cells[1]
    const a = cells[2]
    const b = cells[3]
    const c = cells[4]
    const d = cells[5]
    if (!text || !a || !b || !c || !d) continue
    const correct = CORRECT_MAP[cells[6]]
    if (!correct) continue
    const value = parseInt(cells[7], 10)
    questions.push({
      id,
      text,
      options: { a, b, c, d },
      correct,
      value: isNaN(value) ? 20 : value,
    })
  }
  return questions
}

export async function loadQuestions(csvUrl: string): Promise<Question[]> {
  const res = await fetch(csvUrl)
  if (!res.ok) throw new Error(`Gagal memuat soal: ${res.status}`)
  const text = await res.text()
  const questions = parseQuestionsCsv(text)
  if (questions.length === 0) throw new Error('Tidak ada soal valid di spreadsheet')
  return questions
}
