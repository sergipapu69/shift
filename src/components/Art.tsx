import type { Habit } from '../lib/types'

/** Teclado de piano ondulado (decoración tipo referencia). */
function PianoArt() {
  const keys = Array.from({ length: 11 }, (_, i) => i)
  return (
    <svg viewBox="0 0 410 190" className="art-svg" aria-hidden="true" preserveAspectRatio="xMidYMax meet">
      <defs>
        <linearGradient id="kw" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#d9dbd8" />
        </linearGradient>
        <linearGradient id="kb" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a3a3d" /><stop offset="1" stopColor="#0f0f10" />
        </linearGradient>
      </defs>
      <g transform="translate(0,0)">
        {keys.map((i) => {
          const x = 8 + i * 36
          const y = 66 - Math.sin(i * 0.62) * 34 + i * 2
          const rot = -14 + Math.cos(i * 0.62) * 8
          return (
            <g key={i} transform={`translate(${x} ${y}) rotate(${rot})`}>
              <rect x="0" y="0" width="34" height="78" rx="5" fill="url(#kw)" stroke="#bfc2be" strokeWidth="1" />
              {[0, 1, 3, 4, 5].includes(i % 7) && (
                <rect x="23" y="-2" width="22" height="46" rx="4" fill="url(#kb)" />
              )}
            </g>
          )
        })}
      </g>
    </svg>
  )
}

function BottleArt() {
  return (
    <svg viewBox="0 0 120 220" className="art-svg bottle" aria-hidden="true">
      <g transform="rotate(14 60 110)">
        <rect x="44" y="6" width="32" height="20" rx="8" fill="#6fb4e8" />
        <path d="M46 26h28l10 24c4 8 6 14 6 26v104c0 12-8 20-20 20H50c-12 0-20-8-20-20V76c0-12 2-18 6-26z" fill="#a9d8f7" />
        <path d="M30 98h60v56H30z" fill="#fff" opacity=".92" />
        <path d="M60 110c-8 11-10 16-10 21a10 10 0 0 0 20 0c0-5-2-10-10-21z" fill="#4a90d9" />
        <path d="M40 60c-3 10-4 40-4 70" stroke="#fff" strokeOpacity=".55" strokeWidth="5" strokeLinecap="round" fill="none" />
      </g>
    </svg>
  )
}

function BlobArt({ seed }: { seed: number }) {
  const r = (n: number) => 20 + ((seed * 37 + n * 53) % 40)
  return (
    <svg viewBox="0 0 200 160" className="art-svg" aria-hidden="true">
      <circle cx="150" cy="60" r={r(1)} fill="#fff" opacity=".28" />
      <circle cx="90" cy="110" r={r(2)} fill="#fff" opacity=".2" />
      <rect x="30" y="30" width="46" height="46" rx="16" fill="#000" opacity=".12" transform="rotate(18 53 53)" />
      <path d="M20 140c30-40 70-40 100-10s50 10 70-20" stroke="#fff" strokeOpacity=".5" strokeWidth="8" strokeLinecap="round" fill="none" />
    </svg>
  )
}

export function pickArt(h: Pick<Habit, 'name' | 'category' | 'id'>): 'piano' | 'bottle' | 'blob' {
  const t = (h.name + ' ' + (h.category ?? '')).toLowerCase()
  if (/piano|música|musica|teclado/.test(t)) return 'piano'
  if (/agua|hidrat|beber/.test(t)) return 'bottle'
  return 'blob'
}

export function Art({ habit }: { habit: Pick<Habit, 'name' | 'category' | 'id'> }) {
  const kind = pickArt(habit)
  const seed = habit.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return (
    <div className={`art art-${kind}`}>
      {kind === 'piano' ? <PianoArt /> : kind === 'bottle' ? <BottleArt /> : <BlobArt seed={seed} />}
    </div>
  )
}
