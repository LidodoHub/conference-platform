import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../lib/auth'
import SubmissionForm from '../submissions/SubmissionForm'
import ReviewForm from '../reviews/ReviewForm'
import Tabs from '../../components/ui/Tabs'
import { SUBMISSION_LABELS, REVISION_LABELS, RECOMMENDATION_LABELS, MAX_ACCEPTED_PER_AUTHOR } from '../../lib/constants'
import Pill from '../../components/ui/Pill'
import EmptyState from '../../components/ui/EmptyState'

const REC_COLOR = { accept: '#34C38F', reject: '#E5534B', revise: '#F2A93B' }

// couleur de la bande de gauche : vert accepté, orange révision, rouge rejeté, blanc soumis
const STATUS_ACCENT = {
  submitted: '#F4F1E8',
  accepted: '#34C38F',
  revision_requested: '#F2A93B',
  rejected: '#E5534B',
}

const MIN_REVIEWS_TO_DECIDE = 1
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

const REVISION_HINTS = {
  minor: 'Corrections légères attendues (formulation, précisions, coquilles).',
  major: 'Remaniement important attendu (méthode, résultats ou structure).',
}

const FILTERS = [
  { id: 'all', label: 'Tous' },
  { id: 'submitted', label: 'En attente' },
  { id: 'accepted', label: 'Acceptés' },
  { id: 'revision_requested', label: 'Révision' },
  { id: 'rejected', label: 'Rejetés' },
]

const ABSTRACT_FOLD = 280

const formatDate = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
    : ''

const initialOf = (name) => (name || '?').trim().charAt(0).toUpperCase() || '?'

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

const averageScore = (s) => {
  const list = (s.reviews || []).filter((r) => r.recommendation)
  if (list.length === 0) return null
  return (list.reduce((sum, r) => sum + Number(r.score || 0), 0) / list.length).toFixed(1)
}

function Kicker({ children }) {
  return (
    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-gold-light">{children}</p>
  )
}

function Stars({ value }) {
  const n = Math.max(0, Math.min(5, Math.round(Number(value) || 0)))
  return (
    <span className="text-sm tracking-tight" aria-label={`${value} sur 5`}>
      <span style={{ color: '#F2C14E' }}>{'★'.repeat(n)}</span>
      <span style={{ color: 'rgba(255,255,255,0.25)' }}>{'★'.repeat(5 - n)}</span>
    </span>
  )
}

// un avis de reviewer sous forme de mini-carte
function ReviewItem({ name, review, sessionTitle }) {
  const color = REC_COLOR[review.recommendation] || '#9AA3B5'
  const hasComment = review.comments && !review.comments.startsWith('Assignation')

  return (
    <li
      className="rounded-xl bg-white/5 border border-white/10 p-3 sm:p-4"
      style={{ borderLeft: `4px solid ${color}` }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium text-white">{name}</span>
        <Stars value={review.score} />
      </div>

      <div className="flex flex-wrap items-center gap-2 mt-2">
        {review.recommendation && <Pill color={color}>{RECOMMENDATION_LABELS[review.recommendation]}</Pill>}
        {review.recommended_session_id && (
          <span className="font-mono text-[11px] text-white/70 border border-white/15 rounded-full px-2.5 py-0.5">
            Session : {sessionTitle(review.recommended_session_id) || '—'}
          </span>
        )}
      </div>

      {hasComment && (
        <p className="mt-3 text-sm leading-6 text-white/75 whitespace-pre-line">
          « {review.comments} »
        </p>
      )}
    </li>
  )
}

// ce que le reviewer a lui-même écrit sur un article
function MyReviews({ reviews, sessionTitle }) {
  return (
    <div className="mt-5 pt-4 border-t border-white/10">
      <div className="mb-3">
        <Kicker>{reviews.length > 1 ? 'Mes reviews' : 'Ma review'}</Kicker>
      </div>
      <ul className="space-y-2">
        {reviews.map((r) => (
          <ReviewItem key={r.id} name="Mon avis" review={r} sessionTitle={sessionTitle} />
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
  const myId = useAuth().user?.id ?? null
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all')
  const [sessions, setSessions] = useState([])
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => {
    supabase
      .from('sessions')
      .select('id, title')
      .eq('event_id', eventId)
      .then(({ data }) => setSessions(data || []))
  }, [eventId])

  const sessionTitle = (id) => sessions.find((x) => x.id === id)?.title
  const myReviewsOf = (s) => (s.reviews || []).filter((r) => r.reviewer_id === myId)
  const reviewerName = (id) =>
    participants.find((p) => p.user_id === id)?.profiles?.full_name || 'Reviewer'

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

  const countOf = (id) =>
    id === 'all' ? submissions.length : submissions.filter((s) => s.status === id).length
  const visible = filter === 'all' ? submissions : submissions.filter((s) => s.status === filter)

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

      {submissions.length > 0 && (
        <div className="mb-4">
          <Tabs
            variant="pill"
            active={filter}
            onChange={setFilter}
            tabs={FILTERS.map((f) => ({ ...f, badge: countOf(f.id) }))}
          />
        </div>
      )}
      {submissions.length > 0 && visible.length === 0 && (
        <p className="text-sm text-taupe py-6 text-center">Aucun article dans cette catégorie.</p>
      )}

      {submissions.length === 0 ? (
        <EmptyState title="Aucune soumission" body="Les auteurs déposent ici titre et résumé." />
      ) : (
        <ul className="space-y-5">
          {visible.map((s) => {
            const accent = STATUS_ACCENT[s.status] || '#F4F1E8'
            const expanded = expandedId === s.id
            const longAbstract = (s.abstract || '').length > ABSTRACT_FOLD
            const sentReviews = (s.reviews || []).filter((r) => r.recommendation)
            const avg = averageScore(s)
            const revision = latestRevision(s)
            const authorComments = sentReviews.filter(
              (r) => r.comments && !r.comments.startsWith('Assignation'),
            )
            const hasActions =
              (s.status === 'submitted' && canReview) ||
              (canDecide && s.status === 'submitted') ||
              (canManage && s.status !== 'submitted')

            return (
              <li
                key={s.id}
                className="submission-card sm:p-6"
                style={{
                  overflowWrap: 'anywhere',
                  borderLeft: `8px solid ${accent}`,
                  backgroundImage: `linear-gradient(90deg, ${accent}26 0%, transparent 40%), linear-gradient(135deg, #22365F 0%, #16233F 100%)`,
                }}
              >
                {/* Statut et date */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Pill color={accent}>{statusLabel(s)}</Pill>
                  {s.submitted_at && (
                    <span className="font-mono text-xs text-white/50">
                      Soumis le {formatDate(s.submitted_at)}
                    </span>
                  )}
                </div>

                {/* Titre */}
                <h3 className="mt-4 font-display text-xl sm:text-2xl font-semibold leading-snug tracking-tight text-white">
                  {s.title}
                </h3>

                {/* Auteur */}
                <div className="flex items-center gap-2.5 mt-3">
                  <span
                    className="w-7 h-7 rounded-full bg-gold flex items-center justify-center text-xs font-display font-semibold shrink-0"
                    style={{ color: '#1B2A4A' }}
                  >
                    {initialOf(s.profiles?.full_name)}
                  </span>
                  <span className="text-sm text-white/90">{s.profiles?.full_name}</span>
                </div>

                {/* Résumé */}
                {s.abstract && (
                  <div className="mt-5">
                    <Kicker>Résumé</Kicker>
                    <p
                      className={`mt-2 text-[15px] leading-7 text-white/80 whitespace-pre-line border-l-2 border-white/15 pl-4 ${
                        expanded ? '' : 'line-clamp-4'
                      }`}
                    >
                      {s.abstract}
                    </p>
                    {longAbstract && (
                      <button
                        type="button"
                        className="mt-2 text-xs font-medium text-gold hover:text-gold-light"
                        onClick={() => setExpandedId(expanded ? null : s.id)}
                      >
                        {expanded ? 'Réduire' : 'Lire la suite'}
                      </button>
                    )}
                  </div>
                )}

                {/* Ma review (reviewer) */}
                {myReviewsOf(s).length > 0 && (
                  <MyReviews reviews={myReviewsOf(s)} sessionTitle={sessionTitle} />
                )}

                {/* Avis des reviewers (organizer) */}
                {canManage && sentReviews.length > 0 && (
                  <div className="mt-5 pt-4 border-t border-white/10">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <Kicker>
                        Avis des reviewers · {sentReviews.length}
                      </Kicker>
                      {avg && <span className="font-mono text-xs text-white/60">moyenne {avg}/5</span>}
                    </div>
                    <ul className="space-y-2">
                      {sentReviews.map((r) => (
                        <ReviewItem
                          key={r.id}
                          name={reviewerName(r.reviewer_id)}
                          review={r}
                          sessionTitle={sessionTitle}
                        />
                      ))}
                    </ul>
                  </div>
                )}

                {/* Côté auteur : révision demandée */}
                {s.status === 'revision_requested' && s.author_id === myId && (
                  <div
                    className="mt-5 rounded-xl p-4"
                    style={{
                      background: 'rgba(242,169,59,0.10)',
                      border: '1px solid rgba(242,169,59,0.35)',
                    }}
                  >
                    <p className="text-sm font-semibold" style={{ color: '#F2A93B' }}>
                      {revision?.revision_type
                        ? `${REVISION_LABELS[revision.revision_type]} demandée`
                        : 'Révision demandée'}
                    </p>
                    {revision?.revision_type && (
                      <p className="text-xs text-white/70 mt-1">{REVISION_HINTS[revision.revision_type]}</p>
                    )}

                    {authorComments.length > 0 && (
                      <ul className="space-y-2 mt-4">
                        {authorComments.map((r, i) => (
                          <ReviewItem
                            key={r.id}
                            name={`Reviewer ${i + 1}`}
                            review={r}
                            sessionTitle={sessionTitle}
                          />
                        ))}
                      </ul>
                    )}

                    <div className="mt-4">
                      {frozen ? (
                        <p className="text-xs text-white/60">
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
                        <button type="button" className="btn-primary btn-sm" onClick={() => startResubmit(s)}>
                          Corriger et resoumettre
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Messages pour l'organizer */}
                {canDecide && s.status === 'submitted' && atLimit(s) && (
                  <p className="text-xs mt-4" style={{ color: '#FFA899' }}>
                    Cet auteur a déjà {MAX_ACCEPTED_PER_AUTHOR} articles acceptés dans cet événement : l'acceptation
                    est bloquée. Tu peux rejeter ou demander une révision.
                  </p>
                )}

                {canDecide && s.status === 'submitted' && !atLimit(s) && !isReady(s) && (
                  <p className="text-xs text-white/60 mt-4">
                    Aucune review pour l'instant : tu peux décider quand même, une confirmation te sera demandée.
                  </p>
                )}

                {/* Actions */}
                {hasActions && (
                  <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-white/10">
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
                )}

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
            )
          })}
        </ul>
      )}
    </section>
  )
}