import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { ActiveTimer, Habit, HabitColor, HabitInput, Difficulty, Session } from '../lib/types'
import type { AuthApi, Backend, Repo } from './repo'

type Row = Record<string, any>

const toHabit = (r: Row): Habit => ({
  id: r.id,
  name: r.name,
  category: r.category,
  goalMinutes: r.goal_minutes,
  days: r.days,
  difficulty: r.difficulty as Difficulty,
  reminderTime: r.reminder_time,
  color: r.color as HabitColor,
  createdAt: r.created_at,
})

const fromHabitInput = (h: HabitInput) => ({
  name: h.name.trim(),
  category: h.category?.trim() || null,
  goal_minutes: h.goalMinutes,
  days: h.days,
  difficulty: h.difficulty,
  reminder_time: h.reminderTime,
  color: h.color,
})

const toSession = (r: Row): Session => ({
  id: r.id,
  habitId: r.habit_id,
  startedAt: r.started_at,
  endedAt: r.ended_at,
  durationSec: r.duration_sec,
  day: r.day,
})

const toTimer = (r: Row): ActiveTimer => ({
  id: r.id,
  habitId: r.habit_id,
  startedAt: r.started_at,
  accumulatedMs: Number(r.accumulated_ms),
  runningSince: r.running_since === null ? null : Number(r.running_since),
})

function must<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data as T
}

export function createSupabaseBackend(url: string, anonKey: string): Backend {
  const sb: SupabaseClient = createClient(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  })

  const auth: AuthApi = {
    async getUser() {
      const { data } = await sb.auth.getSession()
      const u = data.session?.user
      return u ? { id: u.id, email: u.email ?? '' } : null
    },
    onChange(cb) {
      const { data } = sb.auth.onAuthStateChange((_e, session) => {
        const u = session?.user
        cb(u ? { id: u.id, email: u.email ?? '' } : null)
      })
      return () => data.subscription.unsubscribe()
    },
    async signIn(email, password) {
      const { error } = await sb.auth.signInWithPassword({ email, password })
      if (error) throw new Error(error.message)
    },
    async signUp(email, password, displayName) {
      const { data, error } = await sb.auth.signUp({
        email,
        password,
        options: { data: { display_name: displayName }, emailRedirectTo: window.location.origin },
      })
      if (error) throw new Error(error.message)
      return { needsConfirmation: !data.session }
    },
    async signOut() {
      const { error } = await sb.auth.signOut()
      if (error) throw new Error(error.message)
    },
  }

  const repo: Repo = {
    async getProfile() {
      const { data: u } = await sb.auth.getUser()
      const email = u.user?.email ?? ''
      const res = await sb.from('profiles').select('display_name').maybeSingle()
      const row = must<Row | null>(res)
      return { displayName: row?.display_name ?? email.split('@')[0] ?? 'Usuario', email }
    },
    async updateDisplayName(name) {
      const { data: u } = await sb.auth.getUser()
      if (!u.user) throw new Error('Sesión no válida')
      must(await sb.from('profiles').upsert({ id: u.user.id, display_name: name.trim() }))
    },
    async listHabits() {
      return (must<Row[]>(await sb.from('habits').select('*').order('created_at')) ?? []).map(toHabit)
    },
    async createHabit(input) {
      return toHabit(must(await sb.from('habits').insert(fromHabitInput(input)).select().single()))
    },
    async updateHabit(id, input) {
      return toHabit(must(await sb.from('habits').update(fromHabitInput(input)).eq('id', id).select().single()))
    },
    async deleteHabit(id) {
      must(await sb.from('habits').delete().eq('id', id))
    },
    async listSessions() {
      return (must<Row[]>(await sb.from('sessions').select('*').order('started_at', { ascending: false }).limit(5000)) ?? []).map(toSession)
    },
    async insertSession(s) {
      must(
        await sb.from('sessions').upsert(
          {
            id: s.id,
            habit_id: s.habitId,
            started_at: s.startedAt,
            ended_at: s.endedAt,
            duration_sec: s.durationSec,
            day: s.day,
          },
          { onConflict: 'id', ignoreDuplicates: true },
        ),
      )
    },
    async deleteSession(id) {
      must(await sb.from('sessions').delete().eq('id', id))
    },
    async listTimers() {
      return (must<Row[]>(await sb.from('active_timers').select('*')) ?? []).map(toTimer)
    },
    async saveTimer(t) {
      must(
        await sb.from('active_timers').upsert(
          {
            habit_id: t.habitId,
            id: t.id,
            started_at: t.startedAt,
            accumulated_ms: t.accumulatedMs,
            running_since: t.runningSince,
          },
          { onConflict: 'habit_id' },
        ),
      )
    },
    async removeTimer(habitId) {
      must(await sb.from('active_timers').delete().eq('habit_id', habitId))
    },
  }

  return { mode: 'supabase', auth, repo }
}
