import type { ActiveTimer, Habit, HabitInput, Session } from '../lib/types'

export interface Profile {
  displayName: string
  email: string
}

export interface Repo {
  getProfile(): Promise<Profile>
  updateDisplayName(name: string): Promise<void>
  listHabits(): Promise<Habit[]>
  createHabit(input: HabitInput): Promise<Habit>
  updateHabit(id: string, input: HabitInput): Promise<Habit>
  deleteHabit(id: string): Promise<void>
  listSessions(): Promise<Session[]>
  /** Idempotente: si el id ya existe no crea un duplicado. */
  insertSession(s: Session): Promise<void>
  deleteSession(id: string): Promise<void>
  listTimers(): Promise<ActiveTimer[]>
  saveTimer(t: ActiveTimer): Promise<void>
  removeTimer(habitId: string): Promise<void>
}

export interface AuthUser {
  id: string
  email: string
}

export interface AuthApi {
  getUser(): Promise<AuthUser | null>
  onChange(cb: (u: AuthUser | null) => void): () => void
  signIn(email: string, password: string): Promise<void>
  signUp(email: string, password: string, displayName: string): Promise<{ needsConfirmation: boolean }>
  signOut(): Promise<void>
}

export interface Backend {
  mode: 'supabase' | 'local'
  auth: AuthApi
  repo: Repo
}
