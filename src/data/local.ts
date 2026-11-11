/**
 * Backend LOCAL: solo para desarrollo y pruebas sin Supabase (VITE_DATA_MODE=local).
 * Guarda en localStorage del navegador, NO sincroniza entre dispositivos y NO es
 * persistencia de producción. La app muestra un aviso visible cuando está activo.
 */
import type { ActiveTimer, Habit, Session } from '../lib/types'
import { newId } from '../lib/timer'
import type { AuthApi, Backend, Repo } from './repo'

const K = 'shift.local.v1'
interface Db {
  displayName: string
  habits: Habit[]
  sessions: Session[]
  timers: ActiveTimer[]
}

const load = (): Db => {
  try {
    const raw = localStorage.getItem(K)
    if (raw) return JSON.parse(raw)
  } catch {
    /* ignorar */
  }
  return { displayName: 'Marlon', habits: [], sessions: [], timers: [] }
}
const save = (db: Db) => localStorage.setItem(K, JSON.stringify(db))

export function createLocalBackend(): Backend {
  const user = { id: 'local-user', email: 'local@shift.dev' }
  const auth: AuthApi = {
    getUser: async () => user,
    onChange: () => () => {},
    signIn: async () => {},
    signUp: async () => ({ needsConfirmation: false }),
    signOut: async () => {},
  }
  const repo: Repo = {
    async getProfile() {
      return { displayName: load().displayName, email: user.email }
    },
    async updateDisplayName(name) {
      const db = load()
      db.displayName = name.trim()
      save(db)
    },
    async listHabits() {
      return load().habits
    },
    async createHabit(input) {
      const db = load()
      const h: Habit = { ...input, name: input.name.trim(), id: newId(), createdAt: new Date().toISOString() }
      db.habits.push(h)
      save(db)
      return h
    },
    async updateHabit(id, input) {
      const db = load()
      const i = db.habits.findIndex((h) => h.id === id)
      if (i < 0) throw new Error('Hábito no encontrado')
      db.habits[i] = { ...db.habits[i], ...input, name: input.name.trim() }
      save(db)
      return db.habits[i]
    },
    async deleteHabit(id) {
      const db = load()
      db.habits = db.habits.filter((h) => h.id !== id)
      db.sessions = db.sessions.filter((s) => s.habitId !== id)
      db.timers = db.timers.filter((t) => t.habitId !== id)
      save(db)
    },
    async listSessions() {
      return [...load().sessions].sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    },
    async insertSession(s) {
      const db = load()
      if (!db.sessions.some((x) => x.id === s.id)) db.sessions.push(s)
      save(db)
    },
    async deleteSession(id) {
      const db = load()
      db.sessions = db.sessions.filter((s) => s.id !== id)
      save(db)
    },
    async listTimers() {
      return load().timers
    },
    async saveTimer(t) {
      const db = load()
      db.timers = [...db.timers.filter((x) => x.habitId !== t.habitId), t]
      save(db)
    },
    async removeTimer(habitId) {
      const db = load()
      db.timers = db.timers.filter((t) => t.habitId !== habitId)
      save(db)
    },
  }
  return { mode: 'local', auth, repo }
}
