import { DAY_LETTER, dayOfWeek } from '../lib/dates'
import type { DayBar } from '../lib/stats'

const W = 320
const H = 120
const PAD = 22

export function BarChart({ bars, goalSec, today }: { bars: DayBar[]; goalSec?: number; today: string }) {
  const max = Math.max(goalSec ?? 0, ...bars.map((b) => b.seconds), 60)
  const bw = W / bars.length
  const y = (v: number) => H - (v / max) * H
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H + PAD}`} role="img" aria-label="Tiempo por día">
      <line x1="0" x2={W} y1={H} y2={H} className="chart-axis" />
      {goalSec ? <line x1="0" x2={W} y1={y(goalSec)} y2={y(goalSec)} className="chart-goal" /> : null}
      {bars.map((b, i) => {
        const h = b.seconds > 0 ? Math.max(4, (b.seconds / max) * H) : 0
        const cx = i * bw + bw / 2
        const w = Math.min(28, bw * 0.62)
        return (
          <g key={b.day}>
            {h > 0 && (
              <rect x={cx - w / 2} width={w} y={H - h} height={h} rx={Math.min(6, w / 2)} className={b.day === today ? 'bar bar-today' : 'bar'}>
                <title>{`${b.day}: ${Math.round(b.seconds / 60)} min`}</title>
              </rect>
            )}
            <text x={cx} y={H + 16} textAnchor="middle" className="chart-label">
              {bars.length <= 8 ? DAY_LETTER[dayOfWeek(b.day)] : Number(b.day.slice(8))}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
