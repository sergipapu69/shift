import { useState, type FormEvent } from 'react'
import { backend } from '../data'

export default function Auth() {
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy || !backend) return
    setError(''); setInfo('')
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Escribe un correo válido.')
    if (pass.length < 6) return setError('La contraseña debe tener al menos 6 caracteres.')
    if (mode === 'up' && !name.trim()) return setError('Escribe tu nombre.')
    setBusy(true)
    try {
      if (mode === 'in') await backend.auth.signIn(email.trim(), pass)
      else {
        const r = await backend.auth.signUp(email.trim(), pass, name.trim())
        if (r.needsConfirmation) setInfo('Te enviamos un correo para confirmar tu cuenta. Después podrás iniciar sesión.')
      }
    } catch (x) {
      const m = x instanceof Error ? x.message : 'Error'
      setError(/invalid login/i.test(m) ? 'Correo o contraseña incorrectos.' : m)
    }
    setBusy(false)
  }

  return (
    <main className="auth">
      <h1 className="logo">SHIFT</h1>
      <p className="muted center">Organiza tu tiempo. Construye tus hábitos.</p>
      <form className="panel form" onSubmit={submit} noValidate>
        <div className="tabs">
          <button type="button" className={mode === 'in' ? 'on' : ''} onClick={() => setMode('in')}>Entrar</button>
          <button type="button" className={mode === 'up' ? 'on' : ''} onClick={() => setMode('up')}>Crear cuenta</button>
        </div>
        {mode === 'up' && <label className="field"><span>Nombre</span><input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoComplete="name" /></label>}
        <label className="field"><span>Correo</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></label>
        <label className="field"><span>Contraseña</span><input type="password" value={pass} onChange={(e) => setPass(e.target.value)} autoComplete={mode === 'in' ? 'current-password' : 'new-password'} /></label>
        {error && <p className="err" role="alert">{error}</p>}
        {info && <p className="ok" role="status">{info}</p>}
        <button className="btn primary wide" disabled={busy}>{busy ? 'Un momento…' : mode === 'in' ? 'Entrar' : 'Crear cuenta'}</button>
      </form>
    </main>
  )
}
