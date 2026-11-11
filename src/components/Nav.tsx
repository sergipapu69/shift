import { FlameIcon, GearIcon, HomeIcon, UserIcon } from './Icons'

export type Tab = 'home' | 'settings' | 'streaks' | 'profile'

const ITEMS: { tab: Tab; label: string; Icon: typeof HomeIcon; hash: string }[] = [
  { tab: 'home', label: 'Inicio', Icon: HomeIcon, hash: '#/' },
  { tab: 'settings', label: 'Mis hábitos', Icon: GearIcon, hash: '#/habits' },
  { tab: 'streaks', label: 'Rachas y estadísticas', Icon: FlameIcon, hash: '#/streaks' },
  { tab: 'profile', label: 'Perfil', Icon: UserIcon, hash: '#/profile' },
]

export function Nav({ active }: { active: Tab | null }) {
  return (
    <nav className="nav" aria-label="Navegación principal">
      {ITEMS.map(({ tab, label, Icon, hash }) => (
        <a key={tab} href={hash} className={'nav-item' + (active === tab ? ' active' : '')} aria-label={label} aria-current={active === tab ? 'page' : undefined} title={label}>
          <span className="nav-dot"><Icon /></span>
          <span className="nav-text">{label}</span>
        </a>
      ))}
    </nav>
  )
}
