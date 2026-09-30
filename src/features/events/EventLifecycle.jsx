import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { updateEventStatus } from '../../lib/eventsApi'

const ACTIONS = [
  { from: 'draft', to: 'pending_approval', label: 'Demander la publication', className: 'btn-outline' },
  { from: 'published', to: 'ongoing', label: 'Marquer en cours', className: 'btn-primary' },
  { from: 'ongoing', to: 'closed', label: 'Clôturer', className: 'btn-outline' },
]

export default function EventLifecycle({ event, canManage, onUpdated, onRequestArchive }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(event.title)
  const [description, setDescription] = useState(event.description || '')
  const [location, setLocation] = useState(event.location || '')
  const [startDate, setStartDate] = useState(event.start_date || '')
  const [endDate, setEndDate] = useState(event.end_date || '')

  if (!canManage) return null

  const run = async (status) => {
    setBusy(true)
    setError(null)
    const { error: updateError } = await updateEventStatus(event.id, status)
    setBusy(false)
    if (updateError) {
      setError(updateError.message)
      return
    }
    onUpdated()
  }

  const saveEdit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error: updateError } = await supabase
      .from('events')
      .update({ title, description, location, start_date: startDate, end_date: endDate })
      .eq('id', event.id)
    setBusy(false)
    if (updateError) {
      setError(updateError.message)
      return
    }
    setEditing(false)
    onUpdated()
  }

  return (
    <div className="mt-5 space-y-4">
      {error && <div className="alert-error">{error}</div>}

      <div className="flex flex-wrap gap-2">
        {ACTIONS.filter((action) => action.from === event.status).map((action) => (
          <button
            key={action.to}
            type="button"
            disabled={busy}
            className={action.className}
            onClick={() => run(action.to)}
          >
            {action.label}
          </button>
        ))}
        {['published', 'ongoing', 'closed'].includes(event.status) && (
          <button type="button" className="btn-outline" disabled={busy} onClick={onRequestArchive}>
            Archiver
          </button>
        )}
        <button type="button" className="btn-ghost" onClick={() => setEditing((value) => !value)}>
          {editing ? 'Fermer l\'édition' : 'Modifier'}
        </button>
      </div>

      {editing && (
        <form onSubmit={saveEdit} className="space-y-3 pt-2">
          <div>
            <label className="form-label" htmlFor="edit-title">Titre</label>
            <input id="edit-title" className="input-field" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div>
            <label className="form-label" htmlFor="edit-desc">Description</label>
            <textarea id="edit-desc" className="textarea-field" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="form-label" htmlFor="edit-loc">Lieu</label>
              <input id="edit-loc" className="input-field" value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
            <div>
              <label className="form-label" htmlFor="edit-start">Début</label>
              <input id="edit-start" type="date" className="input-field font-mono" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
            </div>
            <div>
              <label className="form-label" htmlFor="edit-end">Fin</label>
              <input id="edit-end" type="date" className="input-field font-mono" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
            </div>
          </div>
          <button type="submit" className="btn-primary" disabled={busy}>Enregistrer</button>
        </form>
      )}
    </div>
  )
}
