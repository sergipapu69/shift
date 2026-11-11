import { dayNumber } from './dates'

/**
 * Regla de rachas
 * ---------------
 * - La racha cuenta DÍAS DISTINTOS con actividad (varias sesiones el mismo día = 1 día).
 * - Dos días de actividad pertenecen a la misma racha si entre ellos hay como máximo
 *   2 días completos sin actividad. Con 3 días consecutivos sin actividad la racha se reinicia.
 * - La racha actual sigue viva mientras no hayan pasado 3 días completos sin actividad
 *   desde el último día activo (el día de hoy aún no cuenta como "perdido").
 */
export const MAX_MISSED_DAYS = 2

export interface StreakResult {
  current: number
  best: number
  lastActiveDay: string | null
}

export function computeStreaks(activeDays: Iterable<string>, today: string): StreakResult {
  const unique = Array.from(new Set(activeDays)).sort()
  if (unique.length === 0) return { current: 0, best: 0, lastActiveDay: null }

  let best = 0
  let run = 0
  let prev: number | null = null
  const runs: { length: number; last: number }[] = []

  for (const d of unique) {
    const n = dayNumber(d)
    if (prev !== null && n - prev - 1 <= MAX_MISSED_DAYS) {
      run += 1
    } else {
      if (prev !== null) runs.push({ length: run, last: prev })
      run = 1
    }
    prev = n
    if (run > best) best = run
  }
  runs.push({ length: run, last: prev as number })

  const lastRun = runs[runs.length - 1]
  const missedSinceLast = dayNumber(today) - lastRun.last - 1
  const alive = missedSinceLast <= MAX_MISSED_DAYS
  return {
    current: alive ? lastRun.length : 0,
    best,
    lastActiveDay: unique[unique.length - 1],
  }
}
