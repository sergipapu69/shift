import type { Habit, Session } from './types'
import { addDays, dayOfWeek, localDay } from './dates'
import { computeStreaks, type StreakResult } from './streaks'

export function totalSeconds(sessions: Session[]): number {
  return sessions.reduce((a, s) => a + s.durationSec, 0)
}

export function secondsByHabit(sessions: Session[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const s of sessions) m.set(s.habitId, (m.get(s.habitId) ?? 0) + s.durationSec)
  return m
}

export function secondsOnDay(sessions: Session[], habitId: string | null, day: string): number {
  return sessions
    .filter((s) => s.day === day && (habitId === null || s.habitId === habitId))
    .reduce((a, s) => a + s.durationSec, 0)
}

export function habitStreak(sessions: Session[], habitId: string, today: string): StreakResult {
  return computeStreaks(
    sessions.filter((s) => s.habitId === habitId && s.durationSec > 0).map((s) => s.day),
    today,
  )
}

export function globalStreak(sessions: Session[], today: string): StreakResult {
  return computeStreaks(sessions.filter((s) => s.durationSec > 0).map((s) => s.day), today)
}

/** Progreso de hoy frente a la meta diaria (0..1, puede superar 1 y se recorta en la UI). */
export function goalProgressToday(h: Habit, sessions: Session[], today: string): number {
  if (h.goalMinutes <= 0) return 0
  return secondsOnDay(sessions, h.id, today) / (h.goalMinutes * 60)
}

/** Progreso semanal (últimos 7 días) frente a la meta × días programados. */
export function goalProgressWeek(h: Habit, sessions: Session[], today: string): number {
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, -i))
  const scheduled = days.filter((d) => h.days.includes(dayOfWeek(d))).length || 1
  const done = days.reduce((a, d) => a + secondsOnDay(sessions, h.id, d), 0)
  return done / (h.goalMinutes * 60 * scheduled)
}

export interface DayBar {
  day: string
  seconds: number
}

export function lastDays(sessions: Session[], habitId: string | null, today: string, n: number): DayBar[] {
  return Array.from({ length: n }, (_, i) => {
    const day = addDays(today, -(n - 1 - i))
    return { day, seconds: secondsOnDay(sessions, habitId, day) }
  })
}

export function todayLocal(): string {
  return localDay(new Date())
}
