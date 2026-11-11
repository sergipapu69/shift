import type { ActiveTimer, Session } from './types'
import { localDay } from './dates'

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

export function startTimer(habitId: string, now: number): ActiveTimer {
  return {
    id: newId(),
    habitId,
    startedAt: new Date(now).toISOString(),
    accumulatedMs: 0,
    runningSince: now,
  }
}

export function pauseTimer(t: ActiveTimer, now: number): ActiveTimer {
  if (t.runningSince === null) return t
  return { ...t, accumulatedMs: t.accumulatedMs + Math.max(0, now - t.runningSince), runningSince: null }
}

export function resumeTimer(t: ActiveTimer, now: number): ActiveTimer {
  if (t.runningSince !== null) return t
  return { ...t, runningSince: now }
}

/** Tiempo transcurrido calculado SIEMPRE a partir de marcas de tiempo. */
export function elapsedMs(t: ActiveTimer, now: number): number {
  const running = t.runningSince === null ? 0 : Math.max(0, now - t.runningSince)
  return t.accumulatedMs + running
}

/** Convierte el cronómetro en sesión. El id de la sesión es el del cronómetro (idempotente). */
export function finishTimer(t: ActiveTimer, now: number): Session {
  const ms = elapsedMs(t, now)
  return {
    id: t.id,
    habitId: t.habitId,
    startedAt: t.startedAt,
    endedAt: new Date(now).toISOString(),
    durationSec: Math.round(ms / 1000),
    day: localDay(new Date(t.startedAt)),
  }
}
