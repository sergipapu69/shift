import { useMemo, useState } from 'react'
import type { Habit } from '../lib/types'
import { DAY_SHORT, addDays, dayOfMonth, dayOfWeek, formatClock, formatDayLabel } from '../lib/dates'
import { elapsedMs } from '../lib/timer'
import { useStore } from '../store'
import { HabitCard, type CardSize } from '../components/HabitCard'
import { Art } from '../components/Art'
import { PlusIcon } from '../components/Icons'
import { HabitForm } from './HabitForm'
import { formatTime12 } from '../lib/dates'
import { goalLabel } from '../lib/labels'

const SIZES: CardSize[] = ['tall', 'medium', 'small']

export function Avatar({ name }: { name: string }) {
  return <span className="avatar" aria-hidden="true">{(name.trim()[0] ?? 'S').toUpperCase()}</span>
}

function Hero({ habits, day }: { habits: Habit[]; day: string }) {
  const { timers, now, today } = useStore()
  const featured = useMemo(() => {
    const withTimer = habits.find((h) => timers[h.id])
    if (withTimer) return withTimer
    const dow = dayOfWeek(today)
    const scheduled = habits.filter((h) => h.days.includes(dow))
    const nowHHMM = new Date(now).toTimeString().slice(0, 5)
    const sorted = [...scheduled].sort((a, b) => (a.reminderTime ?? '99:99').localeCompare(b.reminderTime ?? '99:99'))
    return sorted.find((h) => h.reminderTime && h.reminderTime >= nowHHMM) ?? sorted[0] ?? habits[0]
  }, [habits, timers, now, today])

  if (!featured) {
    return (
      <div className="hero c-purple hero-empty">
        <h2 className="hero-title">Empieza tu primer hábito</h2>
        <p className="hero-sub">Crea un hábito, ponle una meta de tiempo y cronometra tus sesiones.</p>
      </div>
    )
  }
  const t = timers[featured.id]
  const sub = t
    ? `${t.runningSince !== null ? 'Sesión en curso' : 'Sesión en pausa'} · ${formatClock(elapsedMs(t, now) / 1000)}`
    : featured.reminderTime
      ? `Recuerda ${featured.name.toLowerCase()} a las ${formatTime12(featured.reminderTime).replace(/(AM|PM)/, '\u00a0$1')}`
      : `Meta de ${day === today ? 'hoy' : 'ese día'}: ${goalLabel(featured.goalMinutes)}`
  return (
    <a href={`#/habit/${featured.id}`} className={`hero c-${featured.color}`}>
      <Art habit={featured} />
      <h2 className="hero-title">{featured.name}</h2>
      <p className="hero-sub">{sub}</p>
    </a>
  )
}

export default function Home() {
  const { habits, sessions, profile, today, loading } = useStore()
  const [selected, setSelected] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [creating, setCreating] = useState(false)
  const day = selected ?? today

  const strip = Array.from({ length: 7 }, (_, i) => addDays(today, i - 3))
  const active = useMemo(() => new Set(sessions.filter((s) => s.durationSec > 0).map((s) => s.day)), [sessions])
  const dow = dayOfWeek(day)
  const list = showAll ? habits : habits.filter((h) => h.days.includes(dow))

  return (
    <div className="screen home">
      <header className="topbar">
        <a href="#/profile" aria-label="Perfil"><Avatar name={profile.displayName} /></a>
        <div className="greet">
          <h1>Hola, {profile.displayName || '…'}</h1>
          <p>Hoy, {formatDayLabel(today)}</p>
        </div>
        <button className="plus-btn" onClick={() => setCreating(true)} aria-label="Crear hábito"><PlusIcon width={30} height={30} /></button>
      </header>

      <Hero habits={habits} day={day} />

      <div className="week" role="tablist" aria-label="Días">
        {strip.map((d) => (
          <button key={d} role="tab" aria-selected={d === day} className={'day' + (d === day ? ' sel' : '')} onClick={() => setSelected(d === today ? null : d)}>
            <i className={active.has(d) ? 'on' : ''} />
            <span>{DAY_SHORT[dayOfWeek(d)]}</span>
            <b>{dayOfMonth(d)}</b>
          </button>
        ))}
      </div>

      <div className="section-head">
        <h2>Tus Hábitos</h2>
        {habits.length > 0 && (
          <button className="link-btn" onClick={() => setShowAll((v) => !v)}>{showAll ? 'Solo del día' : 'Ver todos'}</button>
        )}
      </div>

      {loading ? (
        <div className="loading-grid" aria-busy="true"><div className="skeleton" /><div className="skeleton" /></div>
      ) : habits.length === 0 ? (
        <div className="empty">
          <div className="empty-ico">⏱</div>
          <h3>Aún no tienes hábitos</h3>
          <p>Crea el primero: leer, estudiar, tocar piano, hacer ejercicio…</p>
          <button className="btn primary" onClick={() => setCreating(true)}><PlusIcon width={18} height={18} /> Crear hábito</button>
        </div>
      ) : list.length === 0 ? (
        <div className="empty">
          <h3>Nada programado para este día</h3>
          <p>Ningún hábito está programado el {DAY_SHORT[dow].toLowerCase()}.</p>
          <button className="btn ghost" onClick={() => setShowAll(true)}>Ver todos los hábitos</button>
        </div>
      ) : (
        <div className="grid">
          {list.map((h, i) => <HabitCard key={h.id} habit={h} size={SIZES[i % 3]} day={day} />)}
        </div>
      )}

      {creating && <HabitForm onClose={() => setCreating(false)} />}
    </div>
  )
}
