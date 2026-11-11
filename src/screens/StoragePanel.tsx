import { useEffect, useState } from 'react'
import type { StorageInfo } from '../data/repo'
import { useStore } from '../store'
import { Confirm } from '../components/Modal'

export function StoragePanel() {
  const { backend, reload, notify, sessions, habits } = useStore()
  const repo = backend.repo
  const [info, setInfo] = useState<StorageInfo | null>(null)
  const [pending, setPending] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void repo.storageInfo?.().then(setInfo).catch(() => setInfo(null))
  }, [repo, sessions.length, habits.length])

  if (backend.mode === 'supabase') {
    return (
      <section className="panel">
        <h2>Almacenamiento</h2>
        <p className="muted">Tus datos se guardan en tu cuenta (Supabase) y están disponibles en cualquier dispositivo.</p>
      </section>
    )
  }

  const pct = info ? Math.min(100, Math.round((info.usedBytes / info.maxBytes) * 100)) : 0

  const exportBackup = async () => {
    try {
      const json = await repo.exportData!()
      const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `shift-respaldo-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      notify('Respaldo descargado ✓')
    } catch (e) {
      notify('No se pudo exportar: ' + (e instanceof Error ? e.message : 'error'), 'error')
    }
  }

  const pickFile = async (file: File | undefined) => {
    if (!file) return
    if (file.size > 2_000_000) return notify('El archivo es demasiado grande.', 'error')
    setPending(await file.text())
  }

  return (
    <section className="panel">
      <h2>Almacenamiento <small>cookies de este navegador</small></h2>
      <p className="muted small">
        Tus hábitos y sesiones se guardan en cookies de este navegador. No se sincronizan con otros dispositivos y se pierden si borras las cookies o usas una ventana privada. Descarga un respaldo de vez en cuando.
      </p>
      {info && (
        <>
          <div className={'meter' + (pct >= 90 ? ' full' : '')} aria-label={`Espacio usado ${pct}%`}><b style={{ width: `${pct}%` }} /></div>
          <p className="muted small">Espacio usado: {pct}% ({(info.usedBytes / 1024).toFixed(1)} de {(info.maxBytes / 1024).toFixed(0)} KB){pct >= 80 ? ' · casi lleno: exporta un respaldo y elimina sesiones antiguas' : ''}</p>
        </>
      )}
      <div className="row gap wrap">
        <button className="btn ghost" onClick={() => void exportBackup()}>Exportar respaldo</button>
        <label className="btn ghost file-btn">
          Importar respaldo
          <input type="file" accept="application/json,.json" aria-label="Importar respaldo" onChange={(e) => { void pickFile(e.target.files?.[0]); e.target.value = '' }} />
        </label>
      </div>
      {pending !== null && (
        <Confirm
          title="¿Importar respaldo?" danger busy={busy} confirmLabel="Reemplazar mis datos"
          message="Esto reemplaza todos tus hábitos y sesiones actuales por los del archivo. Los cronómetros en curso se descartan."
          onCancel={() => setPending(null)}
          onConfirm={async () => {
            setBusy(true)
            try {
              await repo.importData!(pending)
              await reload()
              notify('Respaldo importado ✓')
            } catch (e) {
              notify(e instanceof Error ? e.message : 'No se pudo importar', 'error')
            }
            setBusy(false)
            setPending(null)
          }}
        />
      )}
    </section>
  )
}
