import { useState, type FormEvent } from 'react'
import type { Difficulty, Habit, HabitColor, HabitInput } from '../lib/types'
import { CATEGORIES, COLORS, COLOR_NAME, DIFFICULTY_LABEL } from '../lib/labels'
import { DAY_SHORT } from '../lib/dates'
import { useStore } from '../store'
import { Modal } from '../components/Modal'

const ORDER = [1, 2, 3, 4, 5, 6, 0] // lunes primero

export function HabitForm({ habit, onClose, onSaved }: { habit?: Habit; onClose: () => void; onSaved?: (h: Habit) => void }) {
  const { habits, saveHabit, notify } = useStore()
  const [name, setName] = useState(habit?.name ?? '')
  const [category, setCategory] = useState(habit?.category ?? '')
  const [goal, setGoal] = useState(String(habit?.goalMinutes ?? 30))
  const [days, setDays] = useState<number[]>(habit?.days ?? [0, 1, 2, 3, 4, 5, 6])
  const [difficulty, setDifficulty] = useState<Difficulty>(habit?.difficulty ?? 'facil')
  const [reminder, setReminder] = useState(habit?.reminderTime ?? '')
  const [color, setColor] = useState<HabitColor>(habit?.color ?? 'purple')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const validate = (): HabitInput | null => {
    const e: Record<string, string> = {}
    const n = name.trim()
    if (!n) e.name = 'Escribe un nombre para el hábito.'
    else if (n.length > 60) e.name = 'Máximo 60 caracteres.'
    else if (habits.some((h) => h.id !== habit?.id && h.name.trim().toLowerCase() === n.toLowerCase()))
      e.name = 'Ya tienes un hábito con ese nombre.'
    if (category.trim().length > 30) e.category = 'Máximo 30 caracteres.'
    const g = Number(goal)
    if (!goal.trim() || !Number.isInteger(g)) e.goal = 'Indica la meta en minutos (número entero).'
    else if (g < 1 || g > 1440) e.goal = 'La meta debe estar entre 1 y 1440 minutos.'
    if (days.length === 0) e.days = 'Elige al menos un día.'
    setErrors(e)
    if (Object.keys(e).length) return null
    return {
      name: n, category: category.trim() || null, goalMinutes: g, days: [...days].sort(), difficulty,
      reminderTime: reminder || null, color,
    }
  }

  const submit = async (ev: FormEvent) => {
    ev.preventDefault()
    if (saving) return
    const input = validate()
    if (!input) return
    setSaving(true)
    try {
      const h = await saveHabit(input, habit?.id)
      notify(habit ? 'Hábito actualizado ✓' : 'Hábito creado ✓')
      onSaved?.(h)
      onClose()
    } catch (err) {
      notify('No se pudo guardar: ' + (err instanceof Error ? err.message : 'error'), 'error')
      setSaving(false)
    }
  }

  const toggleDay = (d: number) => setDays((p) => (p.includes(d) ? p.filter((x) => x !== d) : [...p, d]))

  return (
    <Modal title={habit ? 'Editar hábito' : 'Nuevo hábito'} onClose={onClose}>
      <form onSubmit={submit} noValidate className="form">
        <label className="field">
          <span>Nombre</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Practicar piano" maxLength={70} autoFocus aria-invalid={!!errors.name} />
          {errors.name && <em className="err">{errors.name}</em>}
        </label>

        <label className="field">
          <span>Categoría <small>(opcional)</small></span>
          <input value={category} onChange={(e) => setCategory(e.target.value)} list="cats" placeholder="Ej. Música" maxLength={40} />
          <datalist id="cats">{CATEGORIES.map((c) => <option key={c} value={c} />)}</datalist>
          {errors.category && <em className="err">{errors.category}</em>}
        </label>

        <div className="two">
          <label className="field">
            <span>Meta por día (min)</span>
            <input inputMode="numeric" value={goal} onChange={(e) => setGoal(e.target.value.replace(/[^0-9]/g, ''))} aria-invalid={!!errors.goal} />
            {errors.goal && <em className="err">{errors.goal}</em>}
          </label>
          <label className="field">
            <span>Recordatorio <small>(opcional)</small></span>
            <input type="time" value={reminder} onChange={(e) => setReminder(e.target.value)} />
          </label>
        </div>

        <fieldset className="field">
          <legend>Frecuencia</legend>
          <div className="chips">
            {ORDER.map((d) => (
              <button type="button" key={d} className={'chip' + (days.includes(d) ? ' on' : '')} onClick={() => toggleDay(d)} aria-pressed={days.includes(d)}>
                {DAY_SHORT[d]}
              </button>
            ))}
            <button type="button" className="chip link" onClick={() => setDays([0, 1, 2, 3, 4, 5, 6])}>Todos</button>
          </div>
          {errors.days && <em className="err">{errors.days}</em>}
        </fieldset>

        <fieldset className="field">
          <legend>Dificultad</legend>
          <div className="chips">
            {(Object.keys(DIFFICULTY_LABEL) as Difficulty[]).map((d) => (
              <button type="button" key={d} className={'chip' + (difficulty === d ? ' on' : '')} onClick={() => setDifficulty(d)} aria-pressed={difficulty === d}>
                {DIFFICULTY_LABEL[d]}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="field">
          <legend>Color</legend>
          <div className="swatches">
            {COLORS.map((c) => (
              <button type="button" key={c} className={`swatch c-${c}` + (color === c ? ' on' : '')} onClick={() => setColor(c)} aria-label={COLOR_NAME[c]} aria-pressed={color === c} />
            ))}
          </div>
        </fieldset>

        <div className="row end gap">
          <button type="button" className="btn ghost" onClick={onClose} disabled={saving}>Cancelar</button>
          <button type="submit" className="btn primary" disabled={saving}>{saving ? 'Guardando…' : habit ? 'Guardar cambios' : 'Crear hábito'}</button>
        </div>
      </form>
    </Modal>
  )
}
