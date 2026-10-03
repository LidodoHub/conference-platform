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

// session la plus recommandée par les reviewers pour une soumission
const suggestedSessionId = (s) => {
  const counts = {}
  for (const r of s.reviews || []) {
    if (r.recommended_session_id) {
      counts[r.recommended_session_id] = (counts[r.recommended_session_id] || 0) + 1
    }
  }
  const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
  return best ? best[0] : ''
}

export default function SessionsPanel({ eventId, isOrganizer, phase, submissions = [] }) {
  const [sessions, setSessions] = useState([])
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [choices, setChoices] = useState({})

  const organizational = phase === 'organizational'
  const canAssign = isOrganizer && organizational

  const load = useCallback(async () => {
    const { data: sessionsData, error: loadError } = await supabase
      .from('sessions')
      .select('id, title, description, session_type, start_time, end_time, max_capacity')
      .eq('event_id', eventId)
      .order('start_time', { ascending: true, nullsFirst: false })

    if (loadError) {
      setError(loadError.message)
      setLoading(false)
      return
    }
    setSessions(sessionsData)

    const ids = sessionsData.map((x) => x.id)
    if (ids.length === 0) {
      setAssignments([])
      setLoading(false)
      return
    }

    const { data: assignData, error: assignError } = await supabase
      .from('session_submissions')
      .select('id, session_id, submission_id, presentation_order')
      .in('session_id', ids)
      .order('presentation_order', { ascending: true })

    if (assignError) setError(assignError.message)
    else setAssignments(assignData)
    setLoading(false)
  }, [eventId])

  useEffect(() => {
    load()
  }, [load])

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
    load()
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette session ? Les articles qui y sont placés redeviendront à placer.')) return
    setError(null)

    const { data, error: deleteError } = await supabase
      .from('sessions')
      .delete()
      .eq('id', id)
      .select('id')

    if (deleteError) setError(deleteError.message)
    else if (!data || data.length === 0) setError("Suppression refusée : tu n'es pas organisateur de cet événement.")
    else load()
  }

  const assign = async (submissionId, sessionId) => {
    setError(null)
    setBusy(true)
    const { error: rpcError } = await supabase.rpc('assign_submission_to_session', {
      p_submission_id: submissionId,
      p_session_id: sessionId || null,
    })
    setBusy(false)

    if (rpcError) {
      setError(rpcError.message)
      return
    }
    load()
  }

  const submissionById = new Map(submissions.map((s) => [s.id, s]))
  const assignedIds = new Set(assignments.map((a) => a.submission_id))
  const unplaced = submissions.filter((s) => s.status === 'accepted' && !assignedIds.has(s.id))
  const papersOf = (sessionId) => assignments.filter((a) => a.session_id === sessionId)
  const sessionTitle = (id) => sessions.find((x) => x.id === id)?.title

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

      {isOrganizer && !organizational && (
        <div className="alert-info mb-4">
          L'affectation définitive des articles aux sessions se fait en phase organisationnelle. D'ici là, les reviewers peuvent seulement suggérer une session.
        </div>
      )}

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

      {canAssign && (
        <div className="card p-5 mb-6">
          <p className="section-label mb-3">Articles acceptés à placer</p>
          {sessions.length === 0 ? (
            <p className="text-sm text-taupe">Crée d'abord des sessions pour pouvoir y placer des articles.</p>
          ) : unplaced.length === 0 ? (
            <p className="text-sm text-taupe">Tous les articles acceptés sont placés.</p>
          ) : (
            <ul className="space-y-4">
              {unplaced.map((s) => {
                const suggestion = suggestedSessionId(s)
                const value = choices[s.id] ?? suggestion
                return (
                  <li key={s.id} className="text-sm" style={{ overflowWrap: 'anywhere' }}>
                    <p className="font-medium text-ink">{s.title}</p>
                    <p className="font-mono text-xs text-taupe mt-1">
                      {s.profiles?.full_name}
                      {suggestion && <> · suggérée : {sessionTitle(suggestion) || 'session'}</>}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <select
                        className="select-field w-auto min-w-[200px] text-xs py-1.5"
                        value={value}
                        onChange={(e) => setChoices((c) => ({ ...c, [s.id]: e.target.value }))}
                      >
                        <option value="">Choisir une session…</option>
                        {sessions.map((x) => (
                          <option key={x.id} value={x.id}>{x.title}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="btn-primary btn-sm"
                        disabled={busy || !value}
                        onClick={() => assign(s.id, value)}
                      >
                        Placer
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
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
          {sessions.map((s) => {
            const papers = papersOf(s.id)
            return (
              <li key={s.id} className="card p-5" style={{ overflowWrap: 'anywhere' }}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h3 className="font-display font-semibold text-ink leading-snug">{s.title}</h3>
                  <span className="badge-type">{TYPE_LABELS[s.session_type] || s.session_type}</span>
                </div>
                {s.description && (
                  <p className="text-sm text-taupe mt-3 leading-relaxed whitespace-pre-line">{s.description}</p>
                )}
                <p className="font-mono text-xs text-taupe/70 mt-3">
                  {formatDate(s.start_time)}
                  {s.end_time && <> → {formatDate(s.end_time)}</>}
                  {s.max_capacity && <> · {s.max_capacity} places</>}
                </p>

                {papers.length > 0 ? (
                  <ul className="mt-4 pt-3 border-t border-dashed border-taupe/30 space-y-2">
                    {papers.map((a, i) => {
                      const sub = submissionById.get(a.submission_id)
                      return (
                        <li key={a.id} className="text-sm flex flex-wrap items-baseline justify-between gap-2">
                          <span>
                            <span className="font-mono text-xs text-taupe mr-2">{i + 1}.</span>
                            {sub?.title || 'Article'}
                            {sub?.profiles?.full_name && (
                              <span className="text-taupe"> — {sub.profiles.full_name}</span>
                            )}
                          </span>
                          {canAssign && (
                            <button
                              type="button"
                              className="btn-outline btn-sm"
                              disabled={busy}
                              onClick={() => assign(a.submission_id, null)}
                            >
                              Retirer
                            </button>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                ) : (
                  <p className="text-xs text-taupe mt-4">Aucun article affecté pour l'instant.</p>
                )}

                {isOrganizer && (
                  <button
                    type="button"
                    className="btn-danger btn-sm mt-4"
                    onClick={() => handleDelete(s.id)}
                  >
                    Supprimer la session
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}