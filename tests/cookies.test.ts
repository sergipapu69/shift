import { describe, it, expect } from 'vitest'
import { CHUNK_SIZE, MAX_CHUNKS, decodeDb, emptyDb, encodeDb, toChunks, validateBackup, type Db } from '../src/data/cookieCodec'
import { shortId as newId } from '../src/lib/timer'

const habit = (i: number) => ({
  id: 'h' + i, name: 'Hábito ' + i, category: i % 2 ? 'Música' : null, goalMinutes: 30 + i, days: [0, 1, 2, 3, 4, 5, 6],
  difficulty: 'avanzado' as const, reminderTime: '07:00', color: 'purple' as const, createdAt: '2026-11-01T10:00:00.000Z',
})

function bigDb(sessions: number): Db {
  const db = emptyDb()
  db.displayName = 'Marlon'
  db.habits = [habit(0), habit(1), habit(2)]
  for (let i = 0; i < sessions; i++) {
    const t = Date.UTC(2026, 0, 1) + i * 86_400_000 * 0.6 + Math.floor(Math.random() * 3_000_000)
    db.sessions.push({
      id: newId(), habitId: 'h' + (i % 3), startedAt: new Date(Math.round(t / 1000) * 1000).toISOString(),
      endedAt: new Date(Math.round(t / 1000) * 1000 + 1_800_000).toISOString(), durationSec: 600 + (i * 37) % 2400,
      day: new Date(t).toISOString().slice(0, 10),
    })
  }
  db.timers = [{ habitId: 'h1', id: newId(), startedAt: '2026-11-11T15:00:00.000Z', accumulatedMs: 12_000, runningSince: null }]
  return db
}

describe('codec de cookies', () => {
  it('ida y vuelta sin perder datos', async () => {
    const db = bigDb(40)
    const back = await decodeDb(await encodeDb(db))
    expect(back).toEqual(db)
  })
  it('la base vacía cabe en un solo trozo', async () => {
    expect(toChunks(await encodeDb(emptyDb())).length).toBe(1)
  })
  it('los trozos no superan el tamaño de una cookie y son seguros', async () => {
    const enc = await encodeDb(bigDb(300))
    for (const c of toChunks(enc)) {
      expect(c.length).toBeLessThanOrEqual(CHUNK_SIZE)
      expect(c).toMatch(/^[A-Za-z0-9_-]*$/)
    }
  })
  it('caben cientos de sesiones dentro del límite', async () => {
    const n = toChunks(await encodeDb(bigDb(500))).length
    expect(n).toBeLessThanOrEqual(MAX_CHUNKS)
  })
  it('capacidad real: cuántas sesiones caben', async () => {
    let n = 400
    while (toChunks(await encodeDb(bigDb(n + 50))).length <= MAX_CHUNKS) n += 50
    console.log('Sesiones que caben en', MAX_CHUNKS, 'cookies ≈', n)
    expect(n).toBeGreaterThanOrEqual(500)
  })
  it('rechaza datos corruptos', async () => {
    await expect(decodeDb('zNOESGZIP')).rejects.toThrow()
    await expect(decodeDb('x123')).rejects.toThrow()
  })
})

describe('importación de respaldos', () => {
  const base = () => ({ app: 'shift', habits: [habit(0)], sessions: [] as any[], displayName: 'Ana' })
  it('acepta un respaldo válido y descarta sesiones huérfanas y duplicadas', () => {
    const b = base()
    const s = { id: 'a', habitId: 'h0', startedAt: '2026-11-10T10:00:00Z', endedAt: '2026-11-10T10:30:00Z', durationSec: 1800, day: '2026-11-10' }
    b.sessions = [s, s, { ...s, id: 'b', habitId: 'nope' }]
    const db = validateBackup(b)
    expect(db.sessions).toHaveLength(1)
    expect(db.displayName).toBe('Ana')
  })
  it('rechaza archivos ajenos o con metas inválidas', () => {
    expect(() => validateBackup({ foo: 1 })).toThrow()
    expect(() => validateBackup({ ...base(), habits: [{ ...habit(0), goalMinutes: 0 }] })).toThrow()
    expect(() => validateBackup({ ...base(), habits: [{ ...habit(0), days: [9] }] })).toThrow()
  })
})
