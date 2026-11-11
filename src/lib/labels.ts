import type { Difficulty, Habit, HabitColor } from './types'
import { DAY_SHORT, formatTime12 } from './dates'

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  facil: 'Fácil',
  intermedio: 'Intermedio',
  avanzado: 'Avanzado',
}

export const COLORS: HabitColor[] = ['purple', 'blue', 'yellow', 'green', 'orange', 'pink']
export const COLOR_NAME: Record<HabitColor, string> = {
  purple: 'Morado', blue: 'Azul', yellow: 'Amarillo', green: 'Verde', orange: 'Naranja', pink: 'Rosa',
}

export const CATEGORIES = ['Estudio', 'Salud', 'Arte', 'Música', 'Lectura', 'Idiomas', 'Deporte', 'Bienestar']

export function frequencyLabel(h: Habit): string {
  if (h.days.length === 7) return 'Todos los días'
  const sorted = [...h.days].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7))
  return sorted.map((d) => DAY_SHORT[d]).join(' · ')
}

export function goalLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `${h} h ${m} min` : `${h} h`
}

export function scheduleLine(h: Habit): string {
  const f = frequencyLabel(h)
  return h.reminderTime ? `${f} ${formatTime12(h.reminderTime)}` : f
}
