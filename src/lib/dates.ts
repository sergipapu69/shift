/** Día local en formato YYYY-MM-DD (sin depender de UTC). */
export function localDay(d: Date | number | string = new Date()): string {
  const date = d instanceof Date ? d : new Date(d)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Número de día absoluto; la aritmética por UTC evita errores por cambios de horario. */
export function dayNumber(day: string): number {
  const [y, m, d] = day.split('-').map(Number)
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000)
}

export function addDays(day: string, n: number): string {
  const t = new Date((dayNumber(day) + n) * 86_400_000)
  const y = t.getUTCFullYear()
  const m = String(t.getUTCMonth() + 1).padStart(2, '0')
  const d = String(t.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function dayOfWeek(day: string): number {
  return new Date(dayNumber(day) * 86_400_000).getUTCDay()
}

export const DAY_SHORT = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab']
export const DAY_LETTER = ['D', 'L', 'M', 'X', 'J', 'V', 'S']
const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

export function dayOfMonth(day: string): number {
  return Number(day.slice(8, 10))
}

export function formatDayLabel(day: string): string {
  const m = Number(day.slice(5, 7)) - 1
  return `${dayOfMonth(day)} ${MONTHS[m]}.`
}

export function formatDayLong(day: string): string {
  return `${DAY_SHORT[dayOfWeek(day)]} ${formatDayLabel(day)}`
}

export function formatClock(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(sec).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

export function formatDuration(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec))
  if (s < 60) return `${s} s`
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h === 0) return `${m} min`
  return m === 0 ? `${h} h` : `${h} h ${m} min`
}

export function formatTime12(hhmm: string | null): string {
  if (!hhmm) return ''
  const [h, m] = hhmm.split(':').map(Number)
  const suffix = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(m).padStart(2, '0')}${suffix}`
}
