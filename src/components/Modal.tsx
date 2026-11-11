import { useEffect, type ReactNode } from 'react'
import { CloseIcon } from './Icons'

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])
  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar"><CloseIcon /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Confirm({
  title, message, confirmLabel, danger, busy, onConfirm, onCancel,
}: {
  title: string; message: string; confirmLabel: string; danger?: boolean; busy?: boolean
  onConfirm: () => void; onCancel: () => void
}) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="muted">{message}</p>
      <div className="row end gap">
        <button className="btn ghost" onClick={onCancel} disabled={busy}>Cancelar</button>
        <button className={danger ? 'btn danger' : 'btn primary'} onClick={onConfirm} disabled={busy}>
          {busy ? 'Un momento…' : confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
