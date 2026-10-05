import { useState } from 'react'
import { TYPE_LABELS, FORMAT_LABELS } from '../../lib/constants'

const EMPTY_EVENT = {
  title: '',
  description: '',
  type: 'conference',
  format: 'onsite',
  start_date: '',
  end_date: '',
  location: '',
}

// Formulaire partagé : création (EventsPage) et modification (onglet Organisation).
export default function EventForm({ initial = EMPTY_EVENT, submitLabel, busyLabel, onSubmit, onCancel, error }) {
  const [form, setForm] = useState({ ...EMPTY_EVENT, ...initial })
  const [localError, setLocalError] = useState(null)
  const [busy, setBusy] = useState(false)

  const field = (name) => ({
    value: form[name] ?? '',
    onChange: (e) => setForm((f) => ({ ...f, [name]: e.target.value })),
  })

  const submit = async (e) => {
    e.preventDefault()
    setLocalError(null)
    if (form.end_date && form.start_date && form.end_date < form.start_date) {
      setLocalError('La date de fin doit être le même jour ou après la date de début.')
      return
    }
    setBusy(true)
    await onSubmit({
      title: form.title.trim(),
      description: form.description.trim() || null,
      type: form.type,
      format: form.format,
      start_date: form.start_date,
      end_date: form.end_date || form.start_date,
      location: form.location.trim() || null,
    })
    setBusy(false)
  }

  const shownError = localError || error

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <label htmlFor="event-title" className="form-label">
          Titre
        </label>
        <input id="event-title" className="input-field" required {...field('title')} />
      </div>

      <div>
        <label htmlFor="event-desc" className="form-label">
          Description
        </label>
        <textarea id="event-desc" className="textarea-field" rows={4} {...field('description')} />
        <p className="form-hint">Thématiques, public visé, appel à communications.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="event-type" className="form-label">
            Type
          </label>
          <select id="event-type" className="select-field" {...field('type')}>
            {Object.entries(TYPE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="event-format" className="form-label">
            Format
          </label>
          <select id="event-format" className="select-field" {...field('format')}>
            {Object.entries(FORMAT_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="event-start" className="form-label">
            Début
          </label>
          <input id="event-start" type="date" className="input-field num" required {...field('start_date')} />
        </div>
        <div>
          <label htmlFor="event-end" className="form-label">
            Fin
          </label>
          <input
            id="event-end"
            type="date"
            className="input-field num"
            min={form.start_date || undefined}
            {...field('end_date')}
          />
          <p className="form-hint">Laisse vide pour un événement d'une journée.</p>
        </div>
      </div>

      <div>
        <label htmlFor="event-location" className="form-label">
          Lieu
        </label>
        <input id="event-location" className="input-field" {...field('location')} />
      </div>

      {shownError && (
        <div role="alert" className="alert-error">
          {shownError}
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        <button type="submit" disabled={busy} className="btn-primary">
          {busy ? busyLabel : submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-ghost">
            Annuler
          </button>
        )}
      </div>
    </form>
  )
}
