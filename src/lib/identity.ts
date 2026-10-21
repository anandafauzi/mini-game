/**
 * Identity persistence for "Mancing Kuis Nusantara".
 * Stores full name + study program (prodi) locally so students don't
 * have to retype them between sessions/reloads.
 */
const IDENTITY_KEY = 'mkn-identity-v1'

export interface Identity {
  fullName: string
  prodi: string
}

function normalize(s: string): string {
  return s.replace(/\s+/g, ' ').trim()
}

export function loadIdentity(): Identity | null {
  try {
    const raw = localStorage.getItem(IDENTITY_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Identity
    const fullName = normalize(parsed.fullName || '')
    const prodi = normalize(parsed.prodi || '')
    if (fullName.length < 2 || prodi.length < 2) return null
    return { fullName, prodi }
  } catch {
    return null
  }
}

export function saveIdentity(id: Identity): Identity {
  const fullName = normalize(id.fullName)
  const prodi = normalize(id.prodi)
  if (fullName.length < 2) throw new Error('Nama lengkap wajib diisi')
  if (prodi.length < 2) throw new Error('Program studi wajib diisi')
  const normalized = { fullName, prodi }
  localStorage.setItem(IDENTITY_KEY, JSON.stringify(normalized))
  return normalized
}

export function clearIdentity(): void {
  try {
    localStorage.removeItem(IDENTITY_KEY)
  } catch {
    // ignore
  }
}

export function identityKey(fullName: string, prodi: string): string {
  return `${normalize(fullName).toLowerCase()}|${normalize(prodi).toLowerCase()}`
}
