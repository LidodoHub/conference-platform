import { useState } from 'react'
import Modal from '../../components/ui/Modal'
import { archiveEvent } from '../../lib/eventsApi'

export default function ArchiveModal({ event, open, onClose, onArchived }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const handleConfirm = async () => {
    setBusy(true)
    setError(null)
    const { error: archiveError } = await archiveEvent(event.id)
    setBusy(false)
    if (archiveError) {
      setError(archiveError.message)
      return
    }
    onArchived?.()
    onClose()
  }

  return (
    <Modal open={open} title="Archiver la conférence" onClose={onClose}>
      <p className="text-sm text-taupe leading-relaxed">
        « {event?.title} » quittera le catalogue actif. Les données (soumissions, paiements,
        certificats) restent en base. Un administrateur ou l'organisateur pourra la restaurer
        vers le statut publié.
      </p>
      {error && <div className="alert-error mt-4">{error}</div>}
      <div className="flex justify-end gap-2 mt-6">
        <button type="button" className="btn-outline" onClick={onClose} disabled={busy}>
          Annuler
        </button>
        <button type="button" className="btn-danger" onClick={handleConfirm} disabled={busy}>
          {busy ? 'Archivage…' : 'Confirmer l\'archivage'}
        </button>
      </div>
    </Modal>
  )
}
