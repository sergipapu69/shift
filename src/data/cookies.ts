/**
 * Backend por defecto: los datos se guardan en cookies del navegador del usuario.
 * - Sin cuentas ni servidor; no se sincroniza entre dispositivos.
 * - Si el usuario borra las cookies o usa modo privado, se pierden: por eso hay exportar/importar respaldo.
 */
import { shortId } from '../lib/timer'
import type { AuthApi, Backend, Repo, StorageInfo } from './repo'
import { CHUNK_SIZE, MAX_BYTES, MAX_CHUNKS, decodeDb, emptyDb, encodeDb, toChunks, validateBackup, type Db } from './cookieCodec'

const KEY = 'shift_d'
const COUNT = KEY + 'n'
const MAX_AGE = 60 * 60 * 24 * 400 // 400 días (tope de los navegadores)

function readCookie(name: string): string | null {
  const m = document.cookie.split('; ').find((c) => c.startsWith(name + '='))
  return m ? decodeURIComponent(m.slice(name.length + 1)) : null
}
function writeCookie(name: string, value: string) {
  const secure = location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${MAX_AGE}; SameSite=Lax${secure}`
}
function removeCookie(name: string) {
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`
}

let lastSize = 0

async function load(): Promise<Db> {
  const n = Number(readCookie(COUNT) ?? 0)
  if (!n) return emptyDb()
  let text = ''
  for (let i = 0; i < n; i++) {
    const part = readCookie(KEY + i)
    if (part === null) throw new Error('Los datos guardados están incompletos (se borró alguna cookie).')
    text += part
  }
  lastSize = text.length
  return decodeDb(text)
}

async function save(db: Db): Promise<void> {
  const text = await encodeDb(db)
  const chunks = toChunks(text)
  if (chunks.length > MAX_CHUNKS) {
    throw new Error('Límite de almacenamiento alcanzado. Exporta un respaldo y elimina sesiones antiguas.')
  }
  const previous = Number(readCookie(COUNT) ?? 0)
  chunks.forEach((c, i) => writeCookie(KEY + i, c))
  writeCookie(COUNT, String(chunks.length))
  for (let i = chunks.length; i < previous; i++) removeCookie(KEY + i)
  // Verificación: si las cookies están bloqueadas no se debe simular que se guardó.
  if (readCookie(COUNT) !== String(chunks.length) || readCookie(KEY + (chunks.length - 1)) !== chunks[chunks.length - 1]) {
    throw new Error('Las cookies están desactivadas o bloqueadas en este navegador.')
  }
  lastSize = text.length
}

// Lectura-modificación-escritura en serie para que dos acciones seguidas no se pisen.
let queue: Promise<unknown> = Promise.resolve()
function mutate<T>(fn: (db: Db) => T): Promise<T> {
  const run = async () => {
    const db = await load()
    const result = fn(db)
    await save(db)
    return result
  }
  const p = queue.then(run, run)
  queue = p.catch(() => undefined)
  return p
}
const read = <T>(fn: (db: Db) => T): Promise<T> => queue.then(() => load()).then(fn)

export function createCookieBackend(): Backend {
  const user = { id: 'cookies', email: '' }
  const auth: AuthApi = {
    getUser: async () => user,
    onChange: () => () => {},
    signIn: async () => {},
    signUp: async () => ({ needsConfirmation: false }),
    signOut: async () => {},
  }

  const repo: Repo = {
    getProfile: () => read((db) => ({ displayName: db.displayName, email: '' })),
    updateDisplayName: (name) => mutate((db) => { db.displayName = name.trim() }),
    listHabits: () => read((db) => db.habits),
    createHabit: (input) =>
      mutate((db) => {
        const h = { ...input, name: input.name.trim(), id: shortId(), createdAt: new Date().toISOString() }
        db.habits.push(h)
        return h
      }),
    updateHabit: (id, input) =>
      mutate((db) => {
        const i = db.habits.findIndex((h) => h.id === id)
        if (i < 0) throw new Error('Hábito no encontrado')
        db.habits[i] = { ...db.habits[i], ...input, name: input.name.trim() }
        return db.habits[i]
      }),
    deleteHabit: (id) =>
      mutate((db) => {
        db.habits = db.habits.filter((h) => h.id !== id)
        db.sessions = db.sessions.filter((s) => s.habitId !== id)
        db.timers = db.timers.filter((t) => t.habitId !== id)
      }),
    listSessions: () => read((db) => [...db.sessions].sort((a, b) => b.startedAt.localeCompare(a.startedAt))),
    insertSession: (s) =>
      mutate((db) => {
        if (!db.sessions.some((x) => x.id === s.id)) db.sessions.push(s)
      }),
    deleteSession: (id) => mutate((db) => { db.sessions = db.sessions.filter((s) => s.id !== id) }),
    listTimers: () => read((db) => db.timers),
    saveTimer: (t) => mutate((db) => { db.timers = [...db.timers.filter((x) => x.habitId !== t.habitId), t] }),
    removeTimer: (habitId) => mutate((db) => { db.timers = db.timers.filter((t) => t.habitId !== habitId) }),

    async storageInfo(): Promise<StorageInfo> {
      await read((db) => db)
      return { usedBytes: lastSize, maxBytes: MAX_BYTES }
    },
    async exportData() {
      const db = await read((d) => d)
      return JSON.stringify({ app: 'shift', version: 1, exportedAt: new Date().toISOString(), ...db }, null, 2)
    },
    async importData(json) {
      let parsed: unknown
      try { parsed = JSON.parse(json) } catch { throw new Error('El archivo no es un JSON válido.') }
      const incoming = validateBackup(parsed)
      await mutate((db) => {
        db.displayName = incoming.displayName
        db.habits = incoming.habits
        db.sessions = incoming.sessions
        db.timers = []
      })
    },
  }
  return { mode: 'cookies', auth, repo }
}

export { CHUNK_SIZE }
