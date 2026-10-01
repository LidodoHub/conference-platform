import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabaseClient'
import EmptyState from '../../components/ui/EmptyState'

const TYPE_LABELS = {
  talk: 'Présentation',
  workshop: 'Atelier',
  panel: 'Table ronde',
}

const EMPTY_FORM = {
  title: '',
  description: '',
  session_type: 'talk',
  start_time: '',
  end_time: '',
  max_capacity: '',
}

const formatDate = (iso) =>
  iso
    ? new Date(iso).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })
    : 'À planifier'

export default function SessionsPanel({ eventId, isOrganizer }) {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)

  const loadSessions = useCallback(async () => {
    const { data, error: loadError } = await supabase
      .from('sessions')
      .select('id, title, description, session_type, start_time, end_time, max_capacity')
      .eq('event_id', eventId)
      .order('start_time', { ascending: true, nullsFirst: false })

    if (loadError) setError(loadError.message)
    else setSessions(data)
    setLoading(false)
  }, [eventId])

  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  const updateField = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (form.start_time && form.end_time && new Date(form.end_time) <= new Date(form.start_time)) {
      setError('La fin doit être après le début.')
      return
    }

    setSaving(true)
    const { error: insertError } = await supabase.from('sessions').insert({
      event_id: eventId,
      title: form.title.trim(),
      description: form.description.trim() || null,
      session_type: form.session_type,
      start_time: form.start_time ? new Date(form.start_time).toISOString() : null,
      end_time: form.end_time ? new Date(form.end_time).toISOString() : null,
      max_capacity: form.max_capacity ? Number(form.max_capacity) : null,
    })
    setSaving(false)

    if (insertError) {
      setError(insertError.message)
      return
    }
    setForm(EMPTY_FORM)
    setShowForm(false)
    loadSessions()
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette session ?')) return
    setError(null)

    const { data, error: deleteError } = await supabase
      .from('sessions')
      .delete()
      .eq('id', id)
      .select('id')

    if (deleteError) setError(deleteError.message)
    else if (!data || data.length === 0) setError("Suppression refusée : tu n'es pas organisateur de cet événement.")
    else loadSessions()
  }

  return (
    <section>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <p className="section-label">Programme</p>
          <h2 className="section-heading text-xl mt-1">Sessions et ateliers</h2>
        </div>
        {isOrganizer && (
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className={showForm ? 'btn-outline btn-sm' : 'btn-ghost-gold btn-sm'}
          >
            {showForm ? 'Annuler' : '+ Ajouter une session'}
          </button>
        )}
      </div>

      {error && <div className="alert-error mb-4">{error}</div>}

      {isOrganizer && showForm && (
        <form onSubmit={handleSubmit} className="card p-5 space-y-4 mb-6">
          <div>
            <label htmlFor="session-title" className="form-label">Titre</label>
            <input
              id="session-title"
              className="input-field"
              value={form.title}
              onChange={updateField('title')}
              required
            />
          </div>

          <div>
            <label htmlFor="session-type" className="form-label">Type</label>
            <select
              id="session-type"
              className="select-field"
              value={form.session_type}
              onChange={updateField('session_type')}
            >
              {Object.entries(TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="session-start" className="form-label">Début</label>
              <input
                id="session-start"
                type="datetime-local"
                className="input-field"
                value={form.start_time}
                onChange={updateField('start_time')}
              />
            </div>
            <div>
              <label htmlFor="session-end" className="form-label">Fin</label>
              <input
                id="session-end"
                type="datetime-local"
                className="input-field"
                value={form.end_time}
                onChange={updateField('end_time')}
              />
            </div>
          </div>

          <div>
            <label htmlFor="session-capacity" className="form-label">Capacité (optionnel)</label>
            <input
              id="session-capacity"
              type="number"
              min="1"
              className="input-field font-mono w-32"
              value={form.max_capacity}
              onChange={updateField('max_capacity')}
            />
          </div>

          <div>
            <label htmlFor="session-description" className="form-label">Description (optionnel)</label>
            <textarea
              id="session-description"
              className="textarea-field"
              rows={3}
              value={form.description}
              onChange={updateField('description')}
            />
          </div>

          <button type="submit" disabled={saving} className="btn-primary w-full sm:w-auto">
            {saving ? 'Enregistrement…' : 'Créer la session'}
          </button>
        </form>
      )}

      {loading ? (
        <div className="space-y-3">
          <div className="skeleton h-20 w-full" />
          <div className="skeleton h-20 w-full" />
        </div>
      ) : sessions.length === 0 ? (
        <EmptyState title="Aucune session" body="Le programme de l'événement apparaîtra ici." />
      ) : (
        <ul className="space-y-4">
          {sessions.map((s) => (
            <li key={s.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h3 className="font-display font-semibold text-ink leading-snug">{s.title}</h3>
                <span className="badge-type">{TYPE_LABELS[s.session_type] || s.session_type}</span>
              </div>
              {s.description && (
                <p className="text-sm text-taupe mt-3 leading-relaxed">{s.description}</p>
              )}
              <p className="font-mono text-xs text-taupe/70 mt-3">
                {formatDate(s.start_time)}
                {s.end_time && <> → {formatDate(s.end_time)}</>}
                {s.max_capacity && <> · {s.max_capacity} places</>}
              </p>
              {isOrganizer && (
                <button
                  type="button"
                  className="btn-danger btn-sm mt-4"
                  onClick={() => handleDelete(s.id)}
                >
                  Supprimer
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}