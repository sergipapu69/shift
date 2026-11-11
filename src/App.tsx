import { useEffect, useState } from 'react'
import { backend } from './data'
import type { AuthUser } from './data/repo'
import { StoreProvider, useStore } from './store'
import { Nav, type Tab } from './components/Nav'
import { Toasts } from './components/Toasts'
import { formatClock } from './lib/dates'
import { elapsedMs } from './lib/timer'
import Auth from './screens/Auth'
import Home from './screens/Home'
import HabitDetail from './screens/HabitDetail'
import Settings from './screens/Settings'
import Stats from './screens/Stats'
import Profile from './screens/Profile'

function useHash() {
  const [h, setH] = useState(() => location.hash || '#/')
  useEffect(() => {
    const on = () => { setH(location.hash || '#/'); window.scrollTo(0, 0) }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return h
}

function MiniTimer({ current }: { current: string | null }) {
  const { timers, habits, now } = useStore()
  const list = Object.values(timers).filter((t) => t.habitId !== current)
  if (list.length === 0) return null
  const t = list[0]
  const h = habits.find((x) => x.id === t.habitId)
  if (!h) return null
  return (
    <a className={'mini-timer c-' + h.color} href={`#/habit/${h.id}`}>
      <i className={t.runningSince !== null ? 'on' : ''} />
      <b>{h.name}</b>
      <span>{formatClock(elapsedMs(t, now) / 1000)}</span>
      {list.length > 1 && <em>+{list.length - 1}</em>}
    </a>
  )
}

function Shell() {
  const hash = useHash()
  const { loadError, reload, loading } = useStore()
  const m = /^#\/habit\/(.+)$/.exec(hash)
  const habitId = m ? decodeURIComponent(m[1]) : null
  const tab: Tab | null = habitId ? null : hash.startsWith('#/habits') ? 'settings' : hash.startsWith('#/streaks') ? 'streaks' : hash.startsWith('#/profile') ? 'profile' : 'home'

  return (
    <div className="app">
      <Nav active={tab ?? 'home'} />
      <div className="content">
        {loadError && !loading ? (
          <div className="screen"><div className="empty"><h3>No se pudieron cargar tus datos</h3><p>{loadError}</p><button className="btn primary" onClick={() => void reload()}>Reintentar</button></div></div>
        ) : habitId ? <HabitDetail id={habitId} /> : tab === 'settings' ? <Settings /> : tab === 'streaks' ? <Stats /> : tab === 'profile' ? <Profile /> : <Home />}
      </div>
      <MiniTimer current={habitId} />
      <Toasts />
    </div>
  )
}

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let alive = true
    void backend.auth.getUser().then((u) => { if (alive) { setUser(u); setReady(true) } }).catch(() => alive && setReady(true))
    const off = backend.auth.onChange((u) => { setUser(u); setReady(true) })
    return () => { alive = false; off() }
  }, [])

  if (!ready) return null
  if (!user) return <Auth />
  return (
    <StoreProvider key={user.id} backend={backend} email={user.email}>
      <Shell />
    </StoreProvider>
  )
}
