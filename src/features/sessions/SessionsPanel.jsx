import { useState, useEffect, useCallback } from 'react'
import { PlusIcon, XIcon, TrashIcon, ClockIcon, UsersThreeIcon, PresentationChartIcon, ArrowRightIcon } from '@phosphor-icons/react'
import { supabase } from '../../lib/supabaseClient'
import { frError, writeError } from '../../lib/errors'
import { SESSION_TYPE_LABELS } from '../../lib/constants'
import EmptyState from '../../components/ui/EmptyState'
import SectionTitle from '../../components/ui/SectionTitle'

const EMPTY_FORM = { title: '', description: '', session_type: 'talk', start_time: '', end_time: '', max_capacity: '' }

const timeOf = (iso) => (iso ? new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '')
const dayOf = (iso) =>
  iso ? new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) : 'À planifier'

// session la plus recommandée par les reviewers pour un article
const suggestedSessionId = (s) => {
  const counts = {}
  for (const r of s.reviews || []) {
    if (r.recommended_session_id) counts[r.recommended_session_id] = (counts[r.recommended_session_id] || 0) + 1
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || ''
}

export default function SessionsPanel({ eventId, isOrganizer, phase, submissions = [] }) {
  const [sessions, setSessions] = useState([])
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
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
      setError(frError(loadError))
      setLoading(false)
      return
    }
    setSessions(sessionsData)
    const ids = sessionsData.map((x) => x.id)
    if (ids.length) {
      const { data, error: assignError } = await supabase
        .from('session_submissions')
        .select('id, session_id, submission_id, presentation_order')
        .in('session_id', ids)
        .order('presentation_order', { ascending: true })
      if (assignError) setError(frError(assignError))
      else setAssignments(data)
    } else setAssignments([])
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
    setBusy(true)
    const { error: insertError } = await supabase.from('sessions').insert({
      event_id: eventId,
      title: form.title.trim(),
      description: form.description.trim() || null,
      session_type: form.session_type,
      start_time: form.start_time ? new Date(form.start_time).toISOString() : null,
      end_time: form.end_time ? new Date(form.end_time).toISOString() : null,
      max_capacity: form.max_capacity ? Number(form.max_capacity) : null,
    })
    setBusy(false)
    if (insertError) {
      setError(frError(insertError))
      return
    }
    setForm(EMPTY_FORM)
    setShowForm(false)
    load()
  }

  const handleDelete = async (s) => {
    if (!window.confirm(`Supprimer la session « ${s.title} » ? Ses articles redeviendront à placer.`)) return
    setError(null)
    const res = await supabase.from('sessions').delete().eq('id', s.id).select('id')
    const msg = writeError(res, "Suppression refusée : tu n'es pas organisateur de cet événement.")
    if (msg) setError(msg)
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
    if (rpcError) setError(frError(rpcError))
    else load()
  }

  const submissionById = new Map(submissions.map((s) => [s.id, s]))
  const assignedIds = new Set(assignments.map((a) => a.submission_id))
  const unplaced = submissions.filter((s) => s.status === 'accepted' && !assignedIds.has(s.id))
  const papersOf = (sessionId) => assignments.filter((a) => a.session_id === sessionId)
  const sessionTitle = (id) => sessions.find((x) => x.id === id)?.title

  // regroupement par jour pour un programme lisible
  const days = []
  for (const s of sessions) {
    const key = s.start_time ? s.start_time.slice(0, 10) : 'none'
    let day = days.find((d) => d.key === key)
    if (!day) {
      day = { key, label: dayOf(s.start_time), items: [] }
      days.push(day)
    }
    day.items.push(s)
  }

  return (
    <section>
      <SectionTitle
        title="Programme"
        count={sessions.length}
        description="Sessions, horaires et articles présentés. Le programme est visible par tous."
        actions={
          isOrganizer &&
          (showForm ? (
            <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">
              <XIcon size={16} aria-hidden="true" />
              Annuler
            </button>
          ) : (
            <button type="button" onClick={() => setShowForm(true)} className="btn-accent">
              <PlusIcon size={16} weight="bold" aria-hidden="true" />
              Ajouter une session
            </button>
          ))
        }
      />

      {error && (
        <div role="alert" className="alert-error mb-5">
          {error}
        </div>
      )}

      {isOrganizer && !organizational && (
        <div className="alert-info mb-5">
          Le placement définitif des articles se fait en phase organisationnelle. D'ici là, les reviewers peuvent suggérer une session.
        </div>
      )}

      {isOrganizer && showForm && (
        <form onSubmit={handleSubmit} className="card-panel space-y-5 mb-8 rise">
          <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_200px] gap-5">
            <div>
              <label htmlFor="session-title" className="form-label">
                Titre
              </label>
              <input id="session-title" className="input-field" value={form.title} onChange={updateField('title')} required />
            </div>
            <div>
              <label htmlFor="session-type" className="form-label">
                Type
              </label>
              <select id="session-type" className="select-field" value={form.session_type} onChange={updateField('session_type')}>
                {Object.entries(SESSION_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div>
              <label htmlFor="session-start" className="form-label">
                Début
              </label>
              <input id="session-start" type="datetime-local" className="input-field num" value={form.start_time} onChange={updateField('start_time')} />
            </div>
            <div>
              <label htmlFor="session-end" className="form-label">
                Fin
              </label>
              <input id="session-end" type="datetime-local" className="input-field num" value={form.end_time} onChange={updateField('end_time')} />
            </div>
            <div>
              <label htmlFor="session-capacity" className="form-label">
                Capacité
              </label>
              <input
                id="session-capacity"
                type="number"
                min="1"
                inputMode="numeric"
                className="input-field num"
                value={form.max_capacity}
                onChange={updateField('max_capacity')}
              />
            </div>
          </div>
          <div>
            <label htmlFor="session-description" className="form-label">
              Description
            </label>
            <textarea id="session-description" className="textarea-field" rows={3} value={form.description} onChange={updateField('description')} />
          </div>
          <button type="submit" disabled={busy} className="btn-primary">
            {busy ? 'Enregistrement…' : 'Créer la session'}
          </button>
        </form>
      )}

      {canAssign && (
        <section className="card-panel mb-8">
          <h3 className="font-semibold text-fg flex items-baseline gap-2">
            Articles acceptés à placer
            <span className="num font-mono text-sm font-normal text-faint">{unplaced.length}</span>
          </h3>
          <div className="mt-4">
            {sessions.length === 0 ? (
              <p className="text-sm text-muted">Crée d'abord des sessions pour y placer des articles.</p>
            ) : unplaced.length === 0 ? (
              <p className="text-sm text-ok">Tous les articles acceptés sont placés.</p>
            ) : (
              <ul className="divide-y divide-line">
                {unplaced.map((s) => {
                  const suggestion = suggestedSessionId(s)
                  const value = choices[s.id] ?? suggestion
                  return (
                    <li key={s.id} className="py-3.5 first:pt-0 last:pb-0 flex flex-col md:flex-row md:items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-fg leading-snug" style={{ overflowWrap: 'anywhere' }}>
                          {s.title}
                        </p>
                        <p className="text-[13px] text-muted mt-0.5">
                          {s.profiles?.full_name}
                          {suggestion && <span className="text-accent-ink"> · suggérée : {sessionTitle(suggestion) || 'session'}</span>}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <label className="sr-only" htmlFor={`place-${s.id}`}>
                          Session pour {s.title}
                        </label>
                        <select
                          id={`place-${s.id}`}
                          className="select-field md:w-56"
                          value={value}
                          onChange={(e) => setChoices((c) => ({ ...c, [s.id]: e.target.value }))}
                        >
                          <option value="">Choisir une session…</option>
                          {sessions.map((x) => (
                            <option key={x.id} value={x.id}>
                              {x.title}
                            </option>
                          ))}
                        </select>
                        <button type="button" className="btn-primary" disabled={busy || !value} onClick={() => assign(s.id, value)}>
                          Placer
                          <ArrowRightIcon size={15} aria-hidden="true" />
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </section>
      )}

      {loading ? (
        <div className="space-y-3">
          <div className="skeleton h-28" />
          <div className="skeleton h-28" />
        </div>
      ) : sessions.length === 0 ? (
        <EmptyState icon={PresentationChartIcon} title="Programme à venir" body="Les sessions de l'événement apparaîtront ici." />
      ) : (
        <div className="space-y-10">
          {days.map((day) => (
            <section key={day.key}>
              <h3 className="text-sm font-medium text-muted mb-3 first-letter:uppercase">{day.label}</h3>
              <ol className="space-y-3">
                {day.items.map((s, idx) => {
                  const papers = papersOf(s.id)
                  return (
                    <li
                      key={s.id}
                      className="entity rise grid grid-cols-1 sm:grid-cols-[88px_minmax(0,1fr)] gap-x-5 gap-y-3"
                      style={{ '--stripe': 'var(--color-accent)', '--i': Math.min(idx, 8) }}
                    >
                      <div className="sm:pt-0.5">
                        <p className="num text-xl font-semibold tracking-tight text-fg leading-none">
                          {s.start_time ? timeOf(s.start_time) : '--:--'}
                        </p>
                        {s.end_time && <p className="num text-[13px] text-faint mt-1">{timeOf(s.end_time)}</p>}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="badge-type">{SESSION_TYPE_LABELS[s.session_type] || s.session_type}</span>
                          {s.max_capacity && (
                            <span className="inline-flex items-center gap-1 text-xs text-muted">
                              <UsersThreeIcon size={14} aria-hidden="true" />
                              {s.max_capacity} places
                            </span>
                          )}
                          {!s.start_time && (
                            <span className="inline-flex items-center gap-1 text-xs text-warn">
                              <ClockIcon size={14} aria-hidden="true" />
                              Horaire à fixer
                            </span>
                          )}
                        </div>
                        <h4 className="mt-2 text-lg font-semibold leading-snug tracking-tight text-fg">{s.title}</h4>
                        {s.description && <p className="mt-1.5 text-sm leading-6 text-muted whitespace-pre-line max-w-[70ch]">{s.description}</p>}

                        {papers.length > 0 ? (
                          <ol className="mt-4 space-y-1.5">
                            {papers.map((a, i) => {
                              const sub = submissionById.get(a.submission_id)
                              return (
                                <li key={a.id} className="flex items-start gap-3 rounded-lg bg-surface-2/70 px-3 py-2.5">
                                  <span className="num text-xs font-medium text-accent-ink w-5 shrink-0 pt-0.5">{i + 1}.</span>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-fg leading-snug">{sub?.title || 'Article'}</p>
                                    {sub?.profiles?.full_name && <p className="text-xs text-muted mt-0.5">{sub.profiles.full_name}</p>}
                                  </div>
                                  {canAssign && (
                                    <button type="button" className="btn-ghost btn-sm" disabled={busy} onClick={() => assign(a.submission_id, null)}>
                                      Retirer
                                    </button>
                                  )}
                                </li>
                              )
                            })}
                          </ol>
                        ) : (
                          <p className="text-[13px] text-faint mt-3">Aucun article placé pour l'instant.</p>
                        )}

                        {isOrganizer && (
                          <div className="mt-4 flex justify-end">
                            <button type="button" className="btn-ghost btn-sm hover:text-bad" onClick={() => handleDelete(s)}>
                              <TrashIcon size={15} aria-hidden="true" />
                              Supprimer la session
                            </button>
                          </div>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ol>
            </section>
          ))}
        </div>
      )}
    </section>
  )
}
