import { useState } from 'react'
import type { Habit } from '../lib/types'
import { DIFFICULTY_LABEL, frequencyLabel, goalLabel } from '../lib/labels'
import { useStore } from '../store'
import { Confirm } from '../components/Modal'
import { EditIcon, PlusIcon, TrashIcon } from '../components/Icons'
import { HabitForm } from './HabitForm'

export default function Settings() {
  const { habits, sessions, backend, removeHabit, notify, loading } = useStore()
  const [editing, setEditing] = useState<Habit | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Habit | null>(null)
  const [busy, setBusy] = useState(false)

  return (
    <div className="screen">
      <header className="page-head">
        <h1>Mis hábitos</h1>
        <button className="btn primary" onClick={() => setEditing('new')}><PlusIcon width={18} height={18} /> Nuevo</button>
      </header>

      {loading ? <div className="skeleton tall" /> : habits.length === 0 ? (
        <div className="empty">
          <div className="empty-ico">🌱</div>
          <h3>Todavía no hay hábitos</h3>
          <p>Crea tu primer hábito para empezar a medir tu constancia.</p>
          <button className="btn primary" onClick={() => setEditing('new')}>Crear hábito</button>
        </div>
      ) : (
        <ul className="habit-list">
          {habits.map((h) => (
            <li key={h.id} className={`habit-row c-${h.color}`}>
              <a href={`#/habit/${h.id}`} className="habit-row-main">
                <b>{h.name}</b>
                <small>{DIFFICULTY_LABEL[h.difficulty]} · {frequencyLabel(h)} · Meta {goalLabel(h.goalMinutes)}</small>
                <small>{sessions.filter((s) => s.habitId === h.id).length} sesiones</small>
              </a>
              <button className="icon-btn" aria-label={`Editar ${h.name}`} onClick={() => setEditing(h)}><EditIcon /></button>
              <button className="icon-btn" aria-label={`Eliminar ${h.name}`} onClick={() => setDeleting(h)}><TrashIcon /></button>
            </li>
          ))}
        </ul>
      )}

      <section className="panel">
        <h2>Almacenamiento</h2>
        {backend.mode === 'supabase'
          ? <p className="muted">Tus datos se guardan en tu cuenta (Supabase) y están disponibles en cualquier dispositivo.</p>
          : <p className="warn">Modo local de desarrollo: los datos solo viven en este navegador y no se sincronizan. No lo uses en producción.</p>}
      </section>

      {editing && <HabitForm habit={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
      {deleting && (
        <Confirm
          title="¿Eliminar hábito?" danger busy={busy} confirmLabel="Eliminar"
          message={`Se borrarán «${deleting.name}» y todas sus sesiones. Esta acción no se puede deshacer.`}
          onCancel={() => setDeleting(null)}
          onConfirm={async () => {
            setBusy(true)
            try { await removeHabit(deleting.id); notify('Hábito eliminado') }
            catch (e) { notify('No se pudo eliminar: ' + (e instanceof Error ? e.message : 'error'), 'error') }
            setBusy(false); setDeleting(null)
          }}
        />
      )}
    </div>
  )
}
