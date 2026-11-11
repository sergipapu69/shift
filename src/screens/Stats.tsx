import { useMemo, useState } from 'react'
import { formatClock, formatDayLong, formatDuration } from '../lib/dates'
import { goalLabel } from '../lib/labels'
import { globalStreak, goalProgressToday, goalProgressWeek, habitStreak, lastDays, secondsByHabit, totalSeconds } from '../lib/stats'
import { useStore } from '../store'
import { BarChart } from '../components/BarChart'
import { Confirm } from '../components/Modal'
import { FlameIcon, TrashIcon } from '../components/Icons'

export default function Stats() {
  const { habits, sessions, today, loading, removeSession, notify } = useStore()
  const [tab, setTab] = useState<'summary' | 'history'>('summary')
  const [filter, setFilter] = useState('all')
  const [del, setDel] = useState<string | null>(null)

  const g = useMemo(() => globalStreak(sessions, today), [sessions, today])
  const byHabit = useMemo(() => secondsByHabit(sessions), [sessions])
  const total = totalSeconds(sessions)
  const name = (id: string) => habits.find((h) => h.id === id)?.name ?? 'Hábito eliminado'

  const filtered = sessions.filter((s) => filter === 'all' || s.habitId === filter)
  const groups = useMemo(() => {
    const m = new Map<string, typeof filtered>()
    for (const s of filtered) m.set(s.day, [...(m.get(s.day) ?? []), s])
    return [...m.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  }, [filtered])

  return (
    <div className="screen">
      <header className="page-head"><h1>Rachas y estadísticas</h1></header>
      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'summary'} className={tab === 'summary' ? 'on' : ''} onClick={() => setTab('summary')}>Resumen</button>
        <button role="tab" aria-selected={tab === 'history'} className={tab === 'history' ? 'on' : ''} onClick={() => setTab('history')}>Historial</button>
      </div>

      {loading ? <div className="skeleton tall" /> : tab === 'summary' ? (
        habits.length === 0 ? (
          <div className="empty"><div className="empty-ico">📈</div><h3>Aquí verás tu progreso</h3><p>Crea un hábito y registra tu primera sesión para ver rachas y estadísticas.</p><a className="btn primary" href="#/habits">Crear hábito</a></div>
        ) : (
          <>
            <div className="kpis">
              <div className="kpi"><span>Tiempo total</span><b>{formatDuration(total)}</b></div>
              <div className="kpi"><span><FlameIcon width={16} height={16} /> Racha general</span><b>{g.current} {g.current === 1 ? 'día' : 'días'}</b></div>
              <div className="kpi"><span>Mejor racha</span><b>{g.best} {g.best === 1 ? 'día' : 'días'}</b></div>
              <div className="kpi"><span>Sesiones</span><b>{sessions.length}</b></div>
            </div>

            <section className="panel">
              <h2>Últimos 14 días</h2>
              {total === 0 ? <p className="muted">Sin sesiones todavía. Cronometra un hábito y aparecerá aquí.</p> : <BarChart bars={lastDays(sessions, null, today, 14)} today={today} />}
            </section>

            <section className="panel">
              <h2>Por hábito</h2>
              <ul className="habit-stats">
                {habits.map((h) => {
                  const st = habitStreak(sessions, h.id, today)
                  const t = goalProgressToday(h, sessions, today)
                  const w = goalProgressWeek(h, sessions, today)
                  return (
                    <li key={h.id} className={`c-${h.color}`}>
                      <div className="hs-head"><a href={`#/habit/${h.id}`}><i className="dot" /> {h.name}</a><b>{formatDuration(byHabit.get(h.id) ?? 0)}</b></div>
                      <div className="hs-meta"><span><FlameIcon width={14} height={14} /> {st.current} · mejor {st.best}</span><span>Meta {goalLabel(h.goalMinutes)}/día</span></div>
                      <div className="prog-row"><span>Hoy</span><div className="bar-track"><b style={{ width: `${Math.min(1, t) * 100}%` }} /></div><em>{Math.round(t * 100)}%</em></div>
                      <div className="prog-row"><span>7 días</span><div className="bar-track"><b style={{ width: `${Math.min(1, w) * 100}%` }} /></div><em>{Math.round(w * 100)}%</em></div>
                    </li>
                  )
                })}
              </ul>
            </section>
          </>
        )
      ) : (
        <>
          <label className="field inline">
            <span>Hábito</span>
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">Todos</option>
              {habits.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </label>
          {groups.length === 0 ? (
            <div className="empty"><div className="empty-ico">🕘</div><h3>Sin actividad registrada</h3><p>Tus sesiones finalizadas aparecerán aquí con su fecha y duración.</p></div>
          ) : groups.map(([day, list]) => (
            <section className="panel" key={day}>
              <h2>{formatDayLong(day)} <small>{formatDuration(list.reduce((a, s) => a + s.durationSec, 0))}</small></h2>
              <ul className="list">
                {list.map((s) => (
                  <li key={s.id}>
                    <div><b>{name(s.habitId)}</b><small>{new Date(s.startedAt).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}</small></div>
                    <span>{formatClock(s.durationSec)}</span>
                    <button className="icon-btn" aria-label="Eliminar sesión" onClick={() => setDel(s.id)}><TrashIcon width={18} height={18} /></button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </>
      )}
      {del && (
        <Confirm title="¿Eliminar sesión?" danger confirmLabel="Eliminar" message="Se quitará del historial y de las estadísticas."
          onCancel={() => setDel(null)}
          onConfirm={async () => {
            try { await removeSession(del); notify('Sesión eliminada') } catch (e) { notify('No se pudo eliminar: ' + (e instanceof Error ? e.message : 'error'), 'error') }
            setDel(null)
          }} />
      )}
    </div>
  )
}
