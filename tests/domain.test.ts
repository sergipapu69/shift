import { describe, it, expect } from 'vitest'
import { computeStreaks } from '../src/lib/streaks'
import { startTimer, pauseTimer, resumeTimer, elapsedMs, finishTimer } from '../src/lib/timer'
import { addDays, dayNumber, localDay } from '../src/lib/dates'
import { habitStreak, secondsOnDay, goalProgressToday } from '../src/lib/stats'
import type { Habit, Session } from '../src/lib/types'

describe('fechas', () => {
  it('aritmética de días estable en cambio de mes/año y bisiestos', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
    expect(dayNumber('2026-03-09') - dayNumber('2026-03-08')).toBe(1)
  })
  it('localDay usa la fecha local, no UTC', () => {
    const d = new Date(2026, 10, 11, 23, 59, 59)
    expect(localDay(d)).toBe('2026-11-11')
  })
})

describe('rachas', () => {
  const today = '2026-11-11'
  it('sin actividad', () => {
    expect(computeStreaks([], today)).toEqual({ current: 0, best: 0, lastActiveDay: null })
  })
  it('días consecutivos', () => {
    const r = computeStreaks(['2026-11-09', '2026-11-10', '2026-11-11'], today)
    expect(r.current).toBe(3)
    expect(r.best).toBe(3)
  })
  it('varias sesiones el mismo día cuentan como un día', () => {
    const r = computeStreaks(['2026-11-11', '2026-11-11', '2026-11-11'], today)
    expect(r.current).toBe(1)
  })
  it('un día sin actividad no rompe la racha', () => {
    const r = computeStreaks(['2026-11-08', '2026-11-09', '2026-11-11'], today)
    expect(r.current).toBe(3)
  })
  it('hoy aún sin actividad mantiene la racha de ayer', () => {
    expect(computeStreaks(['2026-11-09', '2026-11-10'], today).current).toBe(2)
  })
  it('dos días sin actividad todavía la mantienen', () => {
    // último día activo 07; faltan 08, 09 (2 días); hoy 10 en curso
    expect(computeStreaks(['2026-11-06', '2026-11-07'], '2026-11-10').current).toBe(2)
  })
  it('tres días consecutivos sin actividad reinician la racha actual', () => {
    // último activo 07; faltan 08, 09, 10 → reinicio al llegar el 11
    const r = computeStreaks(['2026-11-06', '2026-11-07'], '2026-11-11')
    expect(r.current).toBe(0)
    expect(r.best).toBe(2)
  })
  it('un hueco de tres días separa rachas y se conserva la mejor', () => {
    const r = computeStreaks(
      ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-08', '2026-10-09'],
      '2026-10-09',
    )
    expect(r.best).toBe(4)
    expect(r.current).toBe(2)
  })
  it('un hueco de dos días NO separa rachas', () => {
    const r = computeStreaks(['2026-10-01', '2026-10-04'], '2026-10-04')
    expect(r.current).toBe(2)
  })
})

describe('cronómetro por marcas de tiempo', () => {
  it('pausa no acumula tiempo y reanuda correctamente', () => {
    const t0 = 1_000_000
    let t = startTimer('h1', t0)
    expect(elapsedMs(t, t0 + 10_000)).toBe(10_000)
    t = pauseTimer(t, t0 + 10_000)
    expect(elapsedMs(t, t0 + 500_000)).toBe(10_000) // en pausa: no crece
    t = resumeTimer(t, t0 + 600_000)
    expect(elapsedMs(t, t0 + 605_000)).toBe(15_000)
  })
  it('se recupera tras recargar (serializar y leer)', () => {
    const t0 = 5_000_000
    const t = startTimer('h1', t0)
    const restored = JSON.parse(JSON.stringify(t))
    expect(elapsedMs(restored, t0 + 90_000)).toBe(90_000)
  })
  it('pausar/reanudar repetidos son idempotentes', () => {
    const t0 = 1000
    const t = pauseTimer(pauseTimer(startTimer('h', t0), t0 + 1000), t0 + 9000)
    expect(elapsedMs(t, t0 + 20000)).toBe(1000)
    const r = resumeTimer(resumeTimer(t, 30000), 40000)
    expect(r.runningSince).toBe(30000)
  })
  it('finalizar genera sesión con el mismo id (sin duplicados posibles) y duración exacta', () => {
    const t0 = new Date(2026, 10, 11, 10, 0, 0).getTime()
    const t = startTimer('h1', t0)
    const s1 = finishTimer(t, t0 + 125_400)
    const s2 = finishTimer(t, t0 + 125_400)
    expect(s1.id).toBe(t.id)
    expect(s1.id).toBe(s2.id)
    expect(s1.durationSec).toBe(125)
    expect(s1.day).toBe('2026-11-11')
  })
})

describe('estadísticas', () => {
  const habit: Habit = {
    id: 'h1', name: 'Piano', category: null, goalMinutes: 60, days: [0, 1, 2, 3, 4, 5, 6],
    difficulty: 'avanzado', reminderTime: null, color: 'purple', createdAt: '2026-11-01T00:00:00Z',
  }
  const mk = (id: string, habitId: string, day: string, sec: number): Session => ({
    id, habitId, startedAt: day + 'T10:00:00Z', endedAt: day + 'T11:00:00Z', durationSec: sec, day,
  })
  it('las rachas son independientes por hábito', () => {
    const ss = [mk('1', 'h1', '2026-11-10', 600), mk('2', 'h1', '2026-11-11', 600), mk('3', 'h2', '2026-11-11', 600)]
    expect(habitStreak(ss, 'h1', '2026-11-11').current).toBe(2)
    expect(habitStreak(ss, 'h2', '2026-11-11').current).toBe(1)
  })
  it('suma por día y progreso de meta', () => {
    const ss = [mk('1', 'h1', '2026-11-11', 900), mk('2', 'h1', '2026-11-11', 900)]
    expect(secondsOnDay(ss, 'h1', '2026-11-11')).toBe(1800)
    expect(goalProgressToday(habit, ss, '2026-11-11')).toBeCloseTo(0.5)
  })
})
