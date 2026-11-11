import { useState } from 'react'
import { formatClock, formatDayLong, formatDuration } from '../lib/dates'
import { DIFFICULTY_LABEL, frequencyLabel, goalLabel } from '../lib/labels'
import { goalProgressToday, goalProgressWeek, habitStreak, lastDays, secondsByHabit } from '../lib/stats'
import { useStore } from '../store'
import { Art } from '../components/Art'
import { BarChart } from '../components/BarChart'
import { Confirm } from '../components/Modal'
import { TimerPanel } from '../components/TimerPanel'
import { BackIcon, EditIcon, FlameIcon, TrashIcon } from '../components/Icons'
import { HabitForm } from './HabitForm'

export default function HabitDetail({ id }: { id: string }) {
  const { habits, sessions, today, loading, removeHabit, notify, removeSession } = useStore()
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [busy, setBusy] = useState(false)
  const [delSession, setDelSession] = useState<string | null>(null)
  const habit = habits.find((h) => h.id === id)

  if (loading) return <div className="screen"><div className="skeleton tall" /></div>
  if (!habit) {
    return (
      <div className="screen">
        <div className="empty"><h3>Hábito no encontrado</h3><p>Puede que se haya eliminado.</p><a className="btn primary" href="#/">Volver al inicio</a></div>
      </div>
    )
  }

  const mine = sessions.filter((s) => s.habitId === id)
  const st = habitStreak(sessions, id, today)
  const total = secondsByHabit(sessions).get(id) ?? 0
  const todayProg = goalProgressToday(habit, sessions, today)
  const weekProg = goalProgressWeek(habit, sessions, today)
  const bars = lastDays(sessions, id, today, 7)

  return (
    <div className="screen detail">
      <div className={`detail-hero c-${habit.color}`}>
        <a href="#/" className="back-btn" aria-label="Volver"><BackIcon /></a>
        <Art habit={habit} />
        <span className="badge">{DIFFICULTY_LABEL[habit.difficulty]}</span>
        <h1>{habit.name}</h1>
        <p>{frequencyLabel(habit)} · Meta {goalLabel(habit.goalMinutes)}{habit.category ? ` · ${habit.category}` : ''}</p>
      </div>

      <TimerPanel habit={habit} />

      <div className="kpis">
        <div className="kpi"><span><FlameIcon width={16} height={16} /> Racha actual</span><b>{st.current} {st.current === 1 ? 'día' : 'días'}</b></div>
        <div className="kpi"><span>Mejor racha</span><b>{st.best} {st.best === 1 ? 'día' : 'días'}</b></div>
        <div className="kpi"><span>Tiempo total</span><b>{formatDuration(total)}</b></div>
        <div className="kpi"><span>Sesiones</span><b>{mine.length}</b></div>
      </div>

      <section className="panel">
        <h2>Progreso</h2>
        <div className="prog-row"><span>Hoy</span><div className="bar-track"><b style={{ width: `${Math.min(1, todayProg) * 100}%` }} /></div><em>{Math.round(todayProg * 100)}%</em></div>
        <div className="prog-row"><span>Últimos 7 días</span><div className="bar-track"><b style={{ width: `${Math.min(1, weekProg) * 100}%` }} /></div><em>{Math.round(weekProg * 100)}%</em></div>
        <BarChart bars={bars} goalSec={habit.goalMinutes * 60} today={today} />
        <p className="muted small">La línea punteada marca tu meta diaria de {goalLabel(habit.goalMinutes)}.</p>
      </section>

      <section className="panel">
        <h2>Últimas sesiones</h2>
        {mine.length === 0 ? (
          <p className="muted">Todavía no hay sesiones. Pulsa <b>Iniciar</b> para registrar la primera.</p>
        ) : (
          <ul className="list">
            {mine.slice(0, 6).map((s) => (
              <li key={s.id}>
                <div><b>{formatDayLong(s.day)}</b><small>{new Date(s.startedAt).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}</small></div>
                <span>{formatClock(s.durationSec)}</span>
                <button className="icon-btn" aria-label="Eliminar sesión" onClick={() => setDelSession(s.id)}><TrashIcon width={18} height={18} /></button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="row gap wrap">
        <button className="btn ghost" onClick={() => setEditing(true)}><EditIcon width={18} height={18} /> Editar</button>
        <button className="btn danger-ghost" onClick={() => setDeleting(true)}><TrashIcon width={18} height={18} /> Eliminar</button>
      </div>

      {editing && <HabitForm habit={habit} onClose={() => setEditing(false)} />}
      {deleting && (
        <Confirm
          title="¿Eliminar hábito?" danger busy={busy} confirmLabel="Eliminar"
          message={`Se borrarán «${habit.name}» y sus ${mine.length} sesiones. Esta acción no se puede deshacer.`}
          onCancel={() => setDeleting(false)}
          onConfirm={async () => {
            setBusy(true)
            try { await removeHabit(habit.id); notify('Hábito eliminado'); location.hash = '#/' }
            catch (e) { notify('No se pudo eliminar: ' + (e instanceof Error ? e.message : 'error'), 'error'); setBusy(false) }
          }}
        />
      )}
      {delSession && (
        <Confirm
          title="¿Eliminar sesión?" danger confirmLabel="Eliminar"
          message="Se quitará del historial y de las estadísticas."
          onCancel={() => setDelSession(null)}
          onConfirm={async () => {
            try { await removeSession(delSession); notify('Sesión eliminada') }
            catch (e) { notify('No se pudo eliminar: ' + (e instanceof Error ? e.message : 'error'), 'error') }
            setDelSession(null)
          }}
        />
      )}
    </div>
  )
}
