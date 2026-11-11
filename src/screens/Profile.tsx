import { useState, type FormEvent } from 'react'
import { formatDuration } from '../lib/dates'
import { globalStreak, totalSeconds } from '../lib/stats'
import { useStore } from '../store'
import { Avatar } from './Home'

export default function Profile() {
  const { profile, renameUser, notify, sessions, habits, today, backend } = useStore()
  const [name, setName] = useState(profile.displayName)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const g = globalStreak(sessions, today)

  const save = async (e: FormEvent) => {
    e.preventDefault()
    const n = name.trim()
    if (!n) return setErr('El nombre no puede estar vacío.')
    if (n.length > 40) return setErr('Máximo 40 caracteres.')
    setErr(''); setSaving(true)
    try { await renameUser(n); notify('Nombre actualizado ✓') }
    catch (x) { notify('No se pudo guardar: ' + (x instanceof Error ? x.message : 'error'), 'error') }
    setSaving(false)
  }

  return (
    <div className="screen">
      <header className="page-head"><h1>Perfil</h1></header>
      <div className="profile-card">
        <Avatar name={profile.displayName} />
        <div><b>{profile.displayName}</b><small>{profile.email}</small></div>
      </div>
      <div className="kpis">
        <div className="kpi"><span>Hábitos</span><b>{habits.length}</b></div>
        <div className="kpi"><span>Tiempo total</span><b>{formatDuration(totalSeconds(sessions))}</b></div>
        <div className="kpi"><span>Racha general</span><b>{g.current}</b></div>
        <div className="kpi"><span>Mejor racha</span><b>{g.best}</b></div>
      </div>
      <form className="panel form" onSubmit={save} noValidate>
        <h2>Tu nombre</h2>
        <label className="field"><span>Nombre para el saludo</span>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={50} />
          {err && <em className="err">{err}</em>}
        </label>
        <div className="row end"><button className="btn primary" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button></div>
      </form>
      {backend.mode === 'supabase' && (
        <button className="btn ghost wide" onClick={() => void backend.auth.signOut()}>Cerrar sesión</button>
      )}
    </div>
  )
}
