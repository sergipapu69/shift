export type Difficulty = 'facil' | 'intermedio' | 'avanzado'

export interface Habit {
  id: string
  name: string
  category: string | null
  /** Meta de tiempo por día de práctica, en minutos. */
  goalMinutes: number
  /** Días de la semana programados (0 = domingo … 6 = sábado). */
  days: number[]
  difficulty: Difficulty
  /** Hora de recordatorio "HH:MM" (opcional). */
  reminderTime: string | null
  color: HabitColor
  createdAt: string
}

export type HabitColor = 'purple' | 'blue' | 'yellow' | 'green' | 'orange' | 'pink'

export interface Session {
  /** Mismo id que el cronómetro que la originó: garantiza que no se dupliquen. */
  id: string
  habitId: string
  startedAt: string
  endedAt: string
  durationSec: number
  /** Día local (YYYY-MM-DD) en el que empezó la sesión. */
  day: string
}

export interface ActiveTimer {
  id: string
  habitId: string
  startedAt: string
  /** Milisegundos acumulados en tramos ya cerrados (antes de la última pausa). */
  accumulatedMs: number
  /** Marca de tiempo (ms epoch) del tramo en curso; null si está en pausa. */
  runningSince: number | null
}

export type HabitInput = Omit<Habit, 'id' | 'createdAt'>
