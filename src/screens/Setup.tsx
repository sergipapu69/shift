export default function Setup() {
  return (
    <main className="auth">
      <h1 className="logo">SHIFT</h1>
      <div className="panel">
        <h2>Falta configurar Supabase</h2>
        <p className="muted">Esta app guarda los datos en Supabase. Define estas variables de entorno y vuelve a compilar:</p>
        <pre className="code">VITE_SUPABASE_URL{'\n'}VITE_SUPABASE_ANON_KEY</pre>
        <p className="muted small">Pasos completos en el README (sección «Configurar Supabase»).</p>
      </div>
    </main>
  )
}
