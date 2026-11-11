import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { ActiveTimer, Habit, HabitInput, Session } from './lib/types'
import type { Backend, Profile } from './data/repo'
import { localDay } from './lib/dates'
import * as T from './lib/timer'

export interface ToastMsg {
  id: number
  text: string
  kind: 'ok' | 'error'
}

interface Store {
  backend: Backend
  profile: Profile
  habits: Habit[]
  sessions: Session[]
  timers: Record<string, ActiveTimer>
  loading: boolean
  loadError: string | null
  now: number
  today: string
  toasts: ToastMsg[]
  notify: (text: string, kind?: 'ok' | 'error') => void
  reload: () => Promise<void>
  saveHabit: (input: HabitInput, id?: string) => Promise<Habit>
  removeHabit: (id: string) => Promise<void>
  startTimer: (habitId: string) => Promise<void>
  pauseTimer: (habitId: string) => Promise<void>
  resumeTimer: (habitId: string) => Promise<void>
  finishTimer: (habitId: string) => Promise<boolean>
  discardTimer: (habitId: string) => Promise<void>
  removeSession: (id: string) => Promise<void>
  renameUser: (name: string) => Promise<void>
}

const Ctx = createContext<Store | null>(null)
export const useStore = () => {
  const s = useContext(Ctx)
  if (!s) throw new Error('Store no disponible')
  return s
}

const errText = (e: unknown) => (e instanceof Error ? e.message : 'Error inesperado')

export function StoreProvider({ backend, email, children }: { backend: Backend; email: string; children: ReactNode }) {
  const [profile, setProfile] = useState<Profile>({ displayName: '', email })
  const [habits, setHabits] = useState<Habit[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [timers, setTimers] = useState<Record<string, ActiveTimer>>({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [toasts, setToasts] = useState<ToastMsg[]>([])
  const timersRef = useRef(timers)
  timersRef.current = timers
  const finishing = useRef(new Set<string>())
  const toastId = useRef(0)

  const notify = useCallback((text: string, kind: 'ok' | 'error' = 'ok') => {
    const id = ++toastId.current
    setToasts((t) => [...t, { id, text, kind }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === 'error' ? 5000 : 2600)
  }, [])

  const reload = useCallback(async () => {
    try {
      const [p, h, s, t] = await Promise.all([
        backend.repo.getProfile(),
        backend.repo.listHabits(),
        backend.repo.listSessions(),
        backend.repo.listTimers(),
      ])
      setProfile(p)
      setHabits(h)
      setSessions(s)
      setTimers(Object.fromEntries(t.map((x) => [x.habitId, x])))
      setLoadError(null)
    } catch (e) {
      setLoadError(errText(e))
    } finally {
      setLoading(false)
    }
  }, [backend])

  useEffect(() => {
    void reload()
  }, [reload])

  // Al volver a la pestaña, se re-sincroniza (otro dispositivo pudo cambiar cronómetros/sesiones).
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        setNow(Date.now())
        void reload()
      }
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [reload])

  // Reloj de la UI: 1 s con cronómetros en marcha, 20 s en reposo. El tiempo SIEMPRE se calcula con marcas de tiempo.
  const anyRunning = Object.values(timers).some((t) => t.runningSince !== null)
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), anyRunning ? 1000 : 20_000)
    return () => clearInterval(id)
  }, [anyRunning])

  const saveHabit = useCallback(
    async (input: HabitInput, id?: string) => {
      const h = id ? await backend.repo.updateHabit(id, input) : await backend.repo.createHabit(input)
      setHabits((prev) => (id ? prev.map((x) => (x.id === id ? h : x)) : [...prev, h]))
      return h
    },
    [backend],
  )

  const removeHabit = useCallback(
    async (id: string) => {
      await backend.repo.deleteHabit(id)
      setHabits((p) => p.filter((h) => h.id !== id))
      setSessions((p) => p.filter((s) => s.habitId !== id))
      setTimers((p) => {
        const { [id]: _drop, ...rest } = p
        return rest
      })
    },
    [backend],
  )

  const persistTimer = useCallback(
    async (next: ActiveTimer, prev: ActiveTimer | undefined) => {
      setTimers((p) => ({ ...p, [next.habitId]: next }))
      try {
        await backend.repo.saveTimer(next)
      } catch (e) {
        setTimers((p) => {
          const copy = { ...p }
          if (prev) copy[next.habitId] = prev
          else delete copy[next.habitId]
          return copy
        })
        notify('No se pudo guardar el cronómetro: ' + errText(e), 'error')
      }
    },
    [backend, notify],
  )

  const startTimer = useCallback(
    async (habitId: string) => {
      if (timersRef.current[habitId]) return
      await persistTimer(T.startTimer(habitId, Date.now()), undefined)
    },
    [persistTimer],
  )
  const pauseTimer = useCallback(
    async (habitId: string) => {
      const t = timersRef.current[habitId]
      if (t && t.runningSince !== null) await persistTimer(T.pauseTimer(t, Date.now()), t)
    },
    [persistTimer],
  )
  const resumeTimer = useCallback(
    async (habitId: string) => {
      const t = timersRef.current[habitId]
      if (t && t.runningSince === null) await persistTimer(T.resumeTimer(t, Date.now()), t)
    },
    [persistTimer],
  )

  const finishTimer = useCallback(
    async (habitId: string): Promise<boolean> => {
      const t = timersRef.current[habitId]
      if (!t || finishing.current.has(t.id)) return false // evita doble clic / registros duplicados
      finishing.current.add(t.id)
      try {
        const session = T.finishTimer(t, Date.now())
        if (session.durationSec >= 1) {
          await backend.repo.insertSession(session) // idempotente por id
          setSessions((p) => (p.some((s) => s.id === session.id) ? p : [session, ...p]))
        }
        await backend.repo.removeTimer(habitId)
        setTimers((p) => {
          const { [habitId]: _d, ...rest } = p
          return rest
        })
        if (session.durationSec < 1) notify('Sesión demasiado corta: no se guardó', 'error')
        return session.durationSec >= 1
      } catch (e) {
        notify('No se pudo finalizar la sesión: ' + errText(e), 'error')
        return false
      } finally {
        finishing.current.delete(t.id)
      }
    },
    [backend, notify],
  )

  const discardTimer = useCallback(
    async (habitId: string) => {
      try {
        await backend.repo.removeTimer(habitId)
        setTimers((p) => {
          const { [habitId]: _d, ...rest } = p
          return rest
        })
      } catch (e) {
        notify('No se pudo descartar: ' + errText(e), 'error')
      }
    },
    [backend, notify],
  )

  const removeSession = useCallback(
    async (id: string) => {
      await backend.repo.deleteSession(id)
      setSessions((p) => p.filter((s) => s.id !== id))
    },
    [backend],
  )

  const renameUser = useCallback(
    async (name: string) => {
      await backend.repo.updateDisplayName(name)
      setProfile((p) => ({ ...p, displayName: name.trim() }))
    },
    [backend],
  )

  const today = localDay(now)
  const value = useMemo<Store>(
    () => ({
      backend, profile, habits, sessions, timers, loading, loadError, now, today, toasts, notify, reload,
      saveHabit, removeHabit, startTimer, pauseTimer, resumeTimer, finishTimer, discardTimer, removeSession, renameUser,
    }),
    [backend, profile, habits, sessions, timers, loading, loadError, now, today, toasts, notify, reload,
      saveHabit, removeHabit, startTimer, pauseTimer, resumeTimer, finishTimer, discardTimer, removeSession, renameUser],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
