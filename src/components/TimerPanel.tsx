import { useState } from 'react'
import type { Habit } from '../lib/types'
import { formatClock } from '../lib/dates'
import { elapsedMs } from '../lib/timer'
import { useStore } from '../store'
import { PauseIcon, PlayIcon, StopIcon } from './Icons'
import { Confirm } from './Modal'

export function TimerPanel({ habit }: { habit: Habit }) {
  const { timers, now, startTimer, pauseTimer, resumeTimer, finishTimer, discardTimer, notify } = useStore()
  const t = timers[habit.id]
  const [busy, setBusy] = useState(false)
  const [askDiscard, setAskDiscard] = useState(false)
  const ms = t ? elapsedMs(t, now) : 0
  const running = !!t && t.runningSince !== null
  const goalSec = habit.goalMinutes * 60
  const pct = Math.min(1, ms / 1000 / goalSec)

  const finish = async () => {
    if (busy) return
    setBusy(true)
    const ok = await finishTimer(habit.id)
    setBusy(false)
    if (ok) notify('Sesión guardada ✓')
  }

  return (
    <section className="timer-panel" aria-label="Cronómetro">
      <div className={'timer-clock' + (running ? ' running' : '')} role="timer" aria-live="off">
        {formatClock(ms / 1000)}
      </div>
      <p className="timer-state">
        {!t ? 'Listo para empezar' : running ? 'En curso' : 'En pausa'}
        {t ? ` · ${Math.round(pct * 100)}% de la meta de la sesión` : ''}
      </p>
      <div className="timer-actions">
        {!t && (
          <button className="btn big primary" onClick={() => void startTimer(habit.id)}>
            <PlayIcon width={20} height={20} /> Iniciar
          </button>
        )}
        {t && running && (
          <button className="btn big primary" onClick={() => void pauseTimer(habit.id)}>
            <PauseIcon width={20} height={20} /> Pausar
          </button>
        )}
        {t && !running && (
          <button className="btn big primary" onClick={() => void resumeTimer(habit.id)}>
            <PlayIcon width={20} height={20} /> Reanudar
          </button>
        )}
        {t && (
          <>
            <button className="btn big dark" onClick={() => void finish()} disabled={busy}>
              <StopIcon width={18} height={18} /> {busy ? 'Guardando…' : 'Finalizar'}
            </button>
            <button className="btn ghost" onClick={() => setAskDiscard(true)} disabled={busy}>Descartar</button>
          </>
        )}
      </div>
      {askDiscard && (
        <Confirm
          title="¿Descartar sesión?"
          message="Se perderá el tiempo de esta sesión en curso y no se guardará en el historial."
          confirmLabel="Descartar"
          danger
          onCancel={() => setAskDiscard(false)}
          onConfirm={async () => {
            await discardTimer(habit.id)
            setAskDiscard(false)
          }}
        />
      )}
    </section>
  )
}
