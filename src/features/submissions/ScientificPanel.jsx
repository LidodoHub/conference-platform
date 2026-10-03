import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import SubmissionForm from '../submissions/SubmissionForm'
import ReviewForm from '../reviews/ReviewForm'
import { SUBMISSION_BADGE, SUBMISSION_LABELS } from '../../lib/constants'
import EmptyState from '../../components/ui/EmptyState'

const REC_TO_STATUS = { accept: 'accepted', reject: 'rejected', revise: 'revision_requested' }
const REC_LABELS = {
  accept: 'Recommande d\'accepter',
  reject: 'Recommande de rejeter',
  revise: 'Recommande une révision',
}

const MIN_REVIEWS_TO_DECIDE = 1
const MAX_ACCEPTED_PER_AUTHOR = 2
const countReviews = (s) => (s.reviews || []).filter((r) => r.recommendation).length
const isReady = (s) => countReviews(s) >= MIN_REVIEWS_TO_DECIDE

// aspect "pas encore de review" : sable doré, bordure pointillée
const PENDING_STYLE = {
  background: '#f6ecd2',
  border: '1px dashed #c9a24a',
  color: '#8a6d1f',
  cursor: 'pointer',
}

// aspect "bloqué" : gris, curseur interdit
const LIMIT_STYLE = {
  background: '#ebe8df',
  border: '1px solid #cfc9bb',
  color: '#8a8577',
  cursor: 'not-allowed',
}

const REVISION_LABELS = { minor: 'Révision mineure', major: 'Révision majeure' }
const REVISION_HINTS = {
  minor: 'Corrections légères attendues (formulation, précisions, coquilles).',
  major: 'Remaniement important attendu (méthode, résultats ou structure).',
}

// dernière décision "révision" d'une soumission (visible par l'organizer et l'auteur)
const latestRevision = (s) => {
  const list = (s.decisions || []).filter((d) => d.status === 'revision_requested')
  if (list.length === 0) return null
  return list.sort((a, b) => new Date(b.decided_at) - new Date(a.decided_at))[0]
}

const statusLabel = (s) => {
  if (s.status === 'revision_requested') {
    const rev = latestRevision(s)
    if (rev?.revision_type) return REVISION_LABELS[rev.revision_type]
  }
  return SUBMISSION_LABELS[s.status] || s.status
}

function MyReviews({ reviews, sessionTitle }) {
  return (
    <div className="mt-4 pt-3 border-t border-dashed border-taupe/30">
      <p className="section-label mb-2">{reviews.length > 1 ? 'Mes reviews' : 'Ma review'}</p>
      <ul className="space-y-3">
        {reviews.map((r) => (
          <li key={r.id} className="text-sm">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className={SUBMISSION_BADGE[REC_TO_STATUS[r.recommendation]] || 'badge-submitted'}>
                {REC_LABELS[r.recommendation] || 'Review envoyée'}
              </span>
              <span className="font-mono text-xs text-taupe/70">score {r.score}/5</span>
              {r.recommended_session_id && (
                <span className="font-mono text-xs text-taupe">
                  → {sessionTitle(r.recommended_session_id) || 'session'}
                </span>
              )}
            </div>
            {r.comments && <p className="text-taupe mt-1 whitespace-pre-line">{r.comments}</p>}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function ScientificPanel({
  eventId,
  submissions,
  participants,
  isOrganizer,
  isReviewer,
  isAdmin,
  frozen = false,
  onRefresh,
}) {
  const [showForm, setShowForm] = useState(false)
  const [reviewingId, setReviewingId] = useState(null)
  const [revisionPickerId, setRevisionPickerId] = useState(null)
  const [resubmittingId, setResubmittingId] = useState(null)
  const [resubmitForm, setResubmitForm] = useState({ title: '', abstract: '' })
  const [saving, setSaving] = useState(false)
  const [myId, setMyId] = useState(null)
  const [error, setError] = useState(null)
  const [editingSettings, setEditingSettings] = useState(
    !(Number(event?.registration_fee) > 0 || event?.payment_instructions),
  )

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMyId(data?.user?.id ?? null))
  }, [])

  const [sessions, setSessions] = useState([])

  useEffect(() => {
    supabase
      .from('sessions')
      .select('id, title')
      .eq('event_id', eventId)
      .then(({ data }) => setSessions(data || []))
  }, [eventId])

  const sessionTitle = (id) => sessions.find((x) => x.id === id)?.title

  const myReviewsOf = (s) => (s.reviews || []).filter((r) => r.reviewer_id === myId)

  // phase close : plus de review ni de décision ; la gestion (lecture, suppression) reste possible
  const canReview = isReviewer && !frozen
  const canManage = isOrganizer || isAdmin
  const canDecide = canManage && !frozen

  // nombre d'articles déjà acceptés pour l'auteur de cette soumission
  const acceptedCountFor = (s) =>
    submissions.filter((x) => x.author_id === s.author_id && x.status === 'accepted').length
  const atLimit = (s) => acceptedCountFor(s) >= MAX_ACCEPTED_PER_AUTHOR

  const acceptClass = (s) => (!atLimit(s) && isReady(s) ? 'btn-success btn-sm' : 'btn-outline btn-sm')
  const acceptStyle = (s) => {
    if (atLimit(s)) return LIMIT_STYLE
    return isReady(s) ? undefined : PENDING_STYLE
  }
  const acceptTitle = (s) => {
    if (atLimit(s)) return `Cet auteur a déjà ${MAX_ACCEPTED_PER_AUTHOR} articles acceptés`
    return isReady(s) ? '' : 'Aucune review : une confirmation sera demandée'
  }

  // décision atomique côté base : statut + ligne dans decisions, ou rien du tout
  const decide = async (submissionId, status, revisionType = null) => {
    setError(null)
    const { error: rpcError } = await supabase.rpc('decide_submission', {
      p_submission_id: submissionId,
      p_status: status,
      p_revision_type: revisionType,
    })
    if (rpcError) {
      setError(rpcError.message)
      return
    }
    setRevisionPickerId(null)
    onRefresh()
  }

  const decideWithCheck = (s, status, revisionType = null) => {
    if (status === 'accepted' && atLimit(s)) {
      setError(`Cet auteur a déjà ${MAX_ACCEPTED_PER_AUTHOR} articles acceptés dans cet événement.`)
      return
    }
    if (!isReady(s)) {
      const ok = window.confirm(
        "Cette soumission n'a encore aucune review. Confirmer la décision quand même ?",
      )
      if (!ok) return
    }
    decide(s.id, status, revisionType)
  }

  const handleDelete = async (submissionId) => {
    if (!window.confirm('Supprimer cette soumission ? Ses reviews et sa décision seront supprimées aussi.')) return
    setError(null)

    const { data, error: deleteError } = await supabase
      .from('submissions')
      .delete()
      .eq('id', submissionId)
      .select('id')

    if (deleteError) setError(deleteError.message)
    else if (!data || data.length === 0) setError('Suppression refusée : aucune ligne supprimée (policy RLS).')
    else onRefresh()
  }

  const startResubmit = (s) => {
    setResubmittingId(s.id)
    setResubmitForm({ title: s.title, abstract: s.abstract || '' })
  }

  const handleResubmit = async (e, s) => {
    e.preventDefault()
    setError(null)
    setSaving(true)

    const { error: rpcError } = await supabase.rpc('resubmit_submission', {
      p_submission_id: s.id,
      p_title: resubmitForm.title.trim(),
      p_abstract: resubmitForm.abstract.trim(),
    })
    setSaving(false)

    if (rpcError) {
      setError(rpcError.message)
      return
    }
    setResubmittingId(null)
    onRefresh()
  }

  return (
    <section>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <p className="section-label">Cycle scientifique</p>
          <h2 className="section-heading text-xl mt-1">Soumissions et décisions</h2>
        </div>
        {!frozen && (
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className={showForm ? 'btn-outline btn-sm' : 'btn-ghost-gold btn-sm'}
          >
            {showForm ? 'Annuler' : 'Soumettre un article'}
          </button>
        )}
      </div>

      {frozen && (
        <div className="alert-info mb-4">
          Phase scientifique close : le dépôt d'articles, les reviews et les décisions sont gelés.
        </div>
      )}

      {error && <div className="alert-error mb-4">{error}</div>}

      {showForm && !frozen && (
        <div className="mb-6">
          <SubmissionForm
            eventId={eventId}
            onSubmitted={() => {
              setShowForm(false)
              onRefresh()
            }}
          />
        </div>
      )}

      {submissions.length === 0 ? (
        <EmptyState title="Aucune soumission" body="Les auteurs déposent ici titre et résumé." />
      ) : (
        <ul className="space-y-4">
          {submissions.map((s) => (
            <li key={s.id} className="submission-card" style={{ overflowWrap: 'anywhere' }}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h3 className="font-display font-semibold text-ink leading-snug">{s.title}</h3>
                <span className={SUBMISSION_BADGE[s.status] || 'badge-submitted'}>
                  {statusLabel(s)}
                </span>
              </div>
              {s.abstract && <p className="text-sm text-taupe mt-3 leading-relaxed whitespace-pre-line">{s.abstract}</p>}
              <p className="font-mono text-xs text-taupe/70 mt-3">
                {s.profiles?.full_name}
                {myReviewsOf(s).length > 0 && (
                <MyReviews reviews={myReviewsOf(s)} sessionTitle={sessionTitle} />
              )}
                {s.submitted_at && <> · {s.submitted_at.split('T')[0]}</>}
              </p>

              {canManage && s.reviews?.some((r) => r.recommendation) && (
                <div className="mt-4 pt-3 border-t border-dashed border-taupe/30">
                  <p className="section-label mb-2">Recommandations des reviewers</p>
                  <ul className="space-y-2">
                    {s.reviews.filter((r) => r.recommendation).map((r) => (
                      <li key={r.id} className="text-sm flex flex-wrap items-baseline gap-2">
                        <span className="font-mono text-xs text-taupe">
                          {participants.find((p) => p.user_id === r.reviewer_id)?.profiles?.full_name || 'Reviewer'}
                        </span>
                        <span className={SUBMISSION_BADGE[REC_TO_STATUS[r.recommendation]] || 'badge-submitted'}>
                          {REC_LABELS[r.recommendation]}
                        </span>
                        <span className="font-mono text-xs text-taupe/70">score {r.score}/5</span>
                        {r.recommended_session_id && (
                          <span className="font-mono text-xs text-taupe">
                            → {sessionTitle(r.recommended_session_id) || 'session'}
                          </span>
                        )}
                        {r.comments && <span className="text-taupe">— {r.comments}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Côté auteur : révision demandée */}
              {s.status === 'revision_requested' && s.author_id === myId && (
                <div className="mt-4 pt-3 border-t border-dashed border-taupe/30">
                  <p className="section-label mb-1">
                    {latestRevision(s)?.revision_type
                      ? `${REVISION_LABELS[latestRevision(s).revision_type]} demandée`
                      : 'Révision demandée'}
                  </p>
                  {latestRevision(s)?.revision_type && (
                    <p className="text-xs text-taupe mb-3">
                      {REVISION_HINTS[latestRevision(s).revision_type]}
                    </p>
                  )}

                  {(s.reviews || []).some((r) => r.comments && !r.comments.startsWith('Assignation')) && (
                    <ul className="space-y-2 mb-4">
                      {(s.reviews || [])
                        .filter((r) => r.comments && !r.comments.startsWith('Assignation'))
                        .map((r, i) => (
                          <li key={r.id} className="text-sm">
                            <span className="font-mono text-xs text-taupe">Reviewer {i + 1}</span>
                            <span className="text-taupe"> — {r.comments}</span>
                          </li>
                        ))}
                    </ul>
                  )}

                  {frozen ? (
                    <p className="text-xs text-taupe">
                      La phase scientifique est close : la resoumission n'est plus possible.
                    </p>
                  ) : resubmittingId === s.id ? (
                    <form onSubmit={(e) => handleResubmit(e, s)} className="space-y-3">
                      <div>
                        <label htmlFor={`rs-title-${s.id}`} className="form-label">Titre</label>
                        <input
                          id={`rs-title-${s.id}`}
                          className="input-field"
                          value={resubmitForm.title}
                          onChange={(e) => setResubmitForm((f) => ({ ...f, title: e.target.value }))}
                          required
                        />
                      </div>
                      <div>
                        <label htmlFor={`rs-abstract-${s.id}`} className="form-label">Résumé</label>
                        <textarea
                          id={`rs-abstract-${s.id}`}
                          className="textarea-field"
                          rows={5}
                          value={resubmitForm.abstract}
                          onChange={(e) => setResubmitForm((f) => ({ ...f, abstract: e.target.value }))}
                          required
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button type="submit" disabled={saving} className="btn-primary btn-sm">
                          {saving ? 'Envoi…' : 'Resoumettre'}
                        </button>
                        <button type="button" className="btn-outline btn-sm" onClick={() => setResubmittingId(null)}>
                          Annuler
                        </button>
                      </div>
                    </form>
                  ) : (
                    <button type="button" className="btn-ghost-gold btn-sm" onClick={() => startResubmit(s)}>
                      Corriger et resoumettre
                    </button>
                  )}
                </div>
              )}

              {canDecide && s.status === 'submitted' && atLimit(s) && (
                <p className="text-xs mt-3" style={{ color: '#9a3b2e' }}>
                  Cet auteur a déjà {MAX_ACCEPTED_PER_AUTHOR} articles acceptés dans cet événement : l'acceptation
                  est bloquée. Tu peux rejeter ou demander une révision.
                </p>
              )}

              {canDecide && s.status === 'submitted' && !atLimit(s) && !isReady(s) && (
                <p className="text-xs text-taupe mt-3">
                  Aucune review pour l'instant : tu peux décider quand même, une confirmation te sera demandée.
                </p>
              )}

              <div className="flex flex-wrap gap-2 mt-4">
                {s.status === 'submitted' && canReview && (
                  <button
                    type="button"
                    className="btn-ghost-gold btn-sm"
                    onClick={() => setReviewingId(reviewingId === s.id ? null : s.id)}
                  >
                    {reviewingId === s.id
                      ? 'Fermer la review'
                      : myReviewsOf(s).length > 0
                        ? 'Ajouter une nouvelle review'
                        : 'Faire une review'}
                  </button>
                )}

                {canDecide && s.status === 'submitted' && (
                  <>
                    <button
                      type="button"
                      className={acceptClass(s)}
                      style={acceptStyle(s)}
                      disabled={atLimit(s)}
                      title={acceptTitle(s)}
                      onClick={() => decideWithCheck(s, 'accepted')}
                    >
                      Accepter
                    </button>
                    <button type="button" className="btn-danger btn-sm" onClick={() => decide(s.id, 'rejected')}>
                      Rejeter
                    </button>

                    {revisionPickerId === s.id ? (
                      <>
                        <button
                          type="button"
                          className="btn-outline btn-sm"
                          style={isReady(s) ? undefined : PENDING_STYLE}
                          onClick={() => decideWithCheck(s, 'revision_requested', 'minor')}
                        >
                          Révision mineure
                        </button>
                        <button
                          type="button"
                          className="btn-outline btn-sm"
                          style={isReady(s) ? undefined : PENDING_STYLE}
                          onClick={() => decideWithCheck(s, 'revision_requested', 'major')}
                        >
                          Révision majeure
                        </button>
                        <button type="button" className="btn-ghost-gold btn-sm" onClick={() => setRevisionPickerId(null)}>
                          Annuler
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="btn-outline btn-sm"
                        style={isReady(s) ? undefined : PENDING_STYLE}
                        title={isReady(s) ? '' : 'Aucune review : une confirmation sera demandée'}
                        onClick={() => setRevisionPickerId(s.id)}
                      >
                        Révision
                      </button>
                    )}
                  </>
                )}

                {canManage && s.status !== 'submitted' && (
                  <button type="button" className="btn-danger btn-sm" onClick={() => handleDelete(s.id)}>
                    Supprimer
                  </button>
                )}
              </div>

              {reviewingId === s.id && !frozen && (
                <ReviewForm
                  submissionId={s.id}
                  eventId={eventId}
                  onReviewed={() => {
                    setReviewingId(null)
                    onRefresh()
                  }}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}