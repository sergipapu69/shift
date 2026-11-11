/**
 * Codec para guardar toda la base de datos del usuario en cookies.
 * JSON compacto → gzip (si el navegador lo soporta) → base64url → trozos de ≤3000 caracteres.
 */
import type { ActiveTimer, Difficulty, Habit, HabitColor, Session } from '../lib/types'

export interface Db {
  displayName: string
  habits: Habit[]
  sessions: Session[]
  timers: ActiveTimer[]
}

export const CHUNK_SIZE = 3000
/** ≈24 KB en total: las cookies viajan en cada petición HTTP, así que se mantiene un tope prudente. */
export const MAX_CHUNKS = 8
export const MAX_BYTES = CHUNK_SIZE * MAX_CHUNKS

export const emptyDb = (): Db => ({ displayName: 'Usuario', habits: [], sessions: [], timers: [] })

const toB64u = (bytes: Uint8Array): string => {
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
const fromB64u = (t: string): Uint8Array => {
  const b = atob(t.replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(b, (c) => c.charCodeAt(0))
}

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const w = stream.writable.getWriter()
  // Si los datos están corruptos el error llega por la lectura; aquí solo se evita un rechazo sin capturar.
  w.write(bytes as BufferSource).catch(() => undefined)
  w.close().catch(() => undefined)
  return new Uint8Array(await new Response(stream.readable).arrayBuffer())
}

const hasGzip = () => typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined'

/** Forma compacta: las sesiones son arrays y referencian el hábito por posición. */
function compact(db: Db) {
  const idx = new Map(db.habits.map((h, i) => [h.id, i]))
  return {
    v: 1,
    n: db.displayName,
    h: db.habits.map((h) => [h.id, h.name, h.category, h.goalMinutes, h.days.join(''), h.difficulty, h.reminderTime, h.color, h.createdAt]),
    s: db.sessions
      .filter((s) => idx.has(s.habitId))
      .map((s) => [s.id, idx.get(s.habitId), Math.round(Date.parse(s.startedAt) / 1000), Math.round(Date.parse(s.endedAt) / 1000), s.durationSec, s.day]),
    t: db.timers
      .filter((t) => idx.has(t.habitId))
      .map((t) => [idx.get(t.habitId), t.id, Date.parse(t.startedAt), t.accumulatedMs, t.runningSince]),
  }
}

function expand(raw: any): Db {
  if (!raw || raw.v !== 1) throw new Error('Formato de datos no reconocido')
  const habits: Habit[] = raw.h.map((r: any[]) => ({
    id: r[0], name: r[1], category: r[2], goalMinutes: r[3], days: String(r[4]).split('').map(Number),
    difficulty: r[5] as Difficulty, reminderTime: r[6], color: r[7] as HabitColor, createdAt: r[8],
  }))
  const sessions: Session[] = raw.s.map((r: any[]) => ({
    id: r[0], habitId: habits[r[1]].id, startedAt: new Date(r[2] * 1000).toISOString(),
    endedAt: new Date(r[3] * 1000).toISOString(), durationSec: r[4], day: r[5],
  }))
  const timers: ActiveTimer[] = raw.t.map((r: any[]) => ({
    habitId: habits[r[0]].id, id: r[1], startedAt: new Date(r[2]).toISOString(), accumulatedMs: r[3], runningSince: r[4],
  }))
  return { displayName: raw.n, habits, sessions, timers }
}

export async function encodeDb(db: Db): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(compact(db)))
  if (hasGzip()) return 'z' + toB64u(await pipe(bytes, new CompressionStream('gzip')))
  return 'r' + toB64u(bytes)
}

export async function decodeDb(text: string): Promise<Db> {
  const body = fromB64u(text.slice(1))
  let bytes: Uint8Array
  if (text[0] === 'z') {
    if (!hasGzip()) throw new Error('Este navegador no puede leer los datos comprimidos')
    bytes = await pipe(body, new DecompressionStream('gzip'))
  } else if (text[0] === 'r') bytes = body
  else throw new Error('Formato de datos no reconocido')
  return expand(JSON.parse(new TextDecoder().decode(bytes)))
}

export const toChunks = (text: string): string[] => {
  const out: string[] = []
  for (let i = 0; i < text.length; i += CHUNK_SIZE) out.push(text.slice(i, i + CHUNK_SIZE))
  return out.length ? out : ['']
}

/** Valida y sanea un respaldo importado (JSON exportado por la app). */
export function validateBackup(input: unknown): Db {
  const o = input as any
  const bad = (m: string): never => { throw new Error('Respaldo no válido: ' + m) }
  if (!o || typeof o !== 'object' || o.app !== 'shift' || !Array.isArray(o.habits) || !Array.isArray(o.sessions)) bad('no es un respaldo de SHIFT')
  const str = (v: unknown, max: number) => typeof v === 'string' && v.length > 0 && v.length <= max
  const habits: Habit[] = o.habits.map((h: any) => {
    if (!str(h?.id, 64) || !str(h?.name, 60)) bad('hábito inválido')
    if (!Number.isInteger(h.goalMinutes) || h.goalMinutes < 1 || h.goalMinutes > 1440) bad('meta inválida')
    if (!Array.isArray(h.days) || h.days.length < 1 || h.days.some((d: unknown) => !Number.isInteger(d) || (d as number) < 0 || (d as number) > 6)) bad('días inválidos')
    return {
      id: h.id, name: h.name, category: typeof h.category === 'string' ? h.category.slice(0, 30) : null,
      goalMinutes: h.goalMinutes, days: [...new Set<number>(h.days)].sort(),
      difficulty: ['facil', 'intermedio', 'avanzado'].includes(h.difficulty) ? h.difficulty : 'facil',
      reminderTime: typeof h.reminderTime === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(h.reminderTime) ? h.reminderTime : null,
      color: ['purple', 'blue', 'yellow', 'green', 'orange', 'pink'].includes(h.color) ? h.color : 'purple',
      createdAt: typeof h.createdAt === 'string' && !isNaN(Date.parse(h.createdAt)) ? h.createdAt : new Date().toISOString(),
    }
  })
  const ids = new Set(habits.map((h) => h.id))
  const seen = new Set<string>()
  const sessions: Session[] = []
  for (const s of o.sessions) {
    if (!str(s?.id, 64) || !ids.has(s.habitId) || seen.has(s.id)) continue
    if (isNaN(Date.parse(s.startedAt)) || isNaN(Date.parse(s.endedAt))) continue
    if (!Number.isFinite(s.durationSec) || s.durationSec < 0 || s.durationSec > 86400) continue
    if (typeof s.day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s.day)) continue
    seen.add(s.id)
    sessions.push({ id: s.id, habitId: s.habitId, startedAt: s.startedAt, endedAt: s.endedAt, durationSec: Math.round(s.durationSec), day: s.day })
  }
  return { displayName: str(o.displayName, 40) ? o.displayName : 'Usuario', habits, sessions, timers: [] }
}
