import type { Habit } from '../lib/types'
import { DIFFICULTY_LABEL, frequencyLabel, goalLabel, scheduleLine } from '../lib/labels'
import { formatClock, formatTime12 } from '../lib/dates'
import { elapsedMs } from '../lib/timer'
import { goalProgressToday, habitStreak } from '../lib/stats'
import { useStore } from '../store'
import { Art } from './Art'
import { FlameIcon } from './Icons'

export type CardSize = 'tall' | 'medium' | 'small'

export function HabitCard({ habit, size, day }: { habit: Habit; size: CardSize; day: string }) {
  const { sessions, timers, now, today } = useStore()
  const timer = timers[habit.id]
  const streak = habitStreak(sessions, habit.id, today).current
  const prog = Math.min(1, goalProgressToday(habit, sessions.filter((s) => s.day === day), day))
  const running = timer && timer.runningSince !== null

  const meta = size === 'tall' && habit.reminderTime && habit.days.length === 7
    ? `${frequencyLabel(habit)}\n${formatTime12(habit.reminderTime)} · ${goalLabel(habit.goalMinutes)}`
    : size === 'tall'
      ? `${frequencyLabel(habit)}\nMeta ${goalLabel(habit.goalMinutes)}`
      : scheduleLine(habit)

  return (
    <a href={`#/habit/${habit.id}`} className={`card card-${size} c-${habit.color}`} aria-label={`${habit.name}. Abrir detalle`}>
      <div className="card-top">
        <span className="badge">{DIFFICULTY_LABEL[habit.difficulty]}</span>
        {timer && (
          <span className={'live' + (running ? ' on' : '')}>
            <i /> {formatClock(elapsedMs(timer, now) / 1000)}
          </span>
        )}
      </div>
      <h3 className="card-title">{habit.name}</h3>
      {size !== 'small' && <Art habit={habit} />}
      {size !== 'small' && (
        <div className="card-bottom">
          <p className="card-meta">{meta}</p>
          <div className="card-foot">
            {streak > 0 && <span className="streak-chip"><FlameIcon width={14} height={14} />{streak}</span>}
            <div className="mini-bar" aria-label={`Progreso ${Math.round(prog * 100)}%`}><b style={{ width: `${prog * 100}%` }} /></div>
          </div>
        </div>
      )}
      {size === 'small' && <div className="mini-bar small-bar"><b style={{ width: `${prog * 100}%` }} /></div>}
    </a>
  )
}
