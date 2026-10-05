import { useState, useEffect } from 'react'
import {
  PlusIcon,
  XIcon,
  CheckIcon,
  ArrowCounterClockwiseIcon,
  NotePencilIcon,
  TrashIcon,
  ArticleIcon,
  LockSimpleIcon,
  StarIcon,
} from '@phosphor-icons/react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../lib/auth'
import { frError, writeError } from '../../lib/errors'
import {
  SUBMISSION_LABELS,
  SUBMISSION_COLOR,
  REVISION_LABELS,
  RECOMMENDATION_LABELS,
  RECOMMENDATION_COLOR,
  MAX_ACCEPTED_PER_AUTHOR,
  formatDate,
} from '../../lib/constants'
import SubmissionForm from './SubmissionForm'
import ReviewForm from '../reviews/ReviewForm'
import Tabs from '../../components/ui/Tabs'
import Pill from '../../components/ui/Pill'
import Avatar from '../../components/ui/Avatar'
import EmptyState from '../../components/ui/EmptyState'
import SectionTitle from '../../components/ui/SectionTitle'

const ABSTRACT_FOLD = 320

const REVISION_HINTS = {
  minor: 'Corrections légères attendues : formulation, précisions, coquilles.',
  major: 'Remaniement important attendu : méthode, résultats ou structure.',
}

const FILTERS = [
  { id: 'all', label: 'Tous' },
  { id: 'submitted', label: 'En attente' },
  { id: 'revision_requested', label: 'Révision' },
  { id: 'accepted', label: 'Acceptés' },
  { id: 'rejected', label: 'Rejetés' },
]

const sent = (s) => (s.reviews || []).filter((r) => r.recommendation)
// ancien format : des lignes "Assignation…" sans vrai commentaire
const realComment = (r) => r.comments && !r.comments.startsWith('Assignation')

const latestRevision = (s) =>
  [...(s.decisions || [])]
    .filter((d) => d.status === 'revision_requested')
    .sort((a, b) => new Date(b.decided_at) - new Date(a.decided_at))[0] || null

const statusLabel = (s) => {
  if (s.status === 'revision_requested') {
    const rev = latestRevision(s)
    if (rev?.revision_type) return REVISION_LABELS[rev.revision_type]
  }
  return SUBMISSION_LABELS[s.status] || s.status
}

function Stars({ value }) {
  const n = Math.max(0, Math.min(5, Math.round(Number(value) || 0)))
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`Note : ${n} sur 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <StarIcon key={i} size={14} weight={i <= n ? 'fill' : 'regular'} className={i <= n ? 'text-accent' : 'text-faint'} />
      ))}
    </span>
  )
}

function ReviewItem({ name, review, sessionTitle }) {
  const color = RECOMMENDATION_COLOR[review.recommendation] || 'var(--color-st-muted)'
  return (
    <li className="row items-start" style={{ '--stripe': color }}>
      <div className="w-full">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-medium text-fg">{name}</span>
          <Stars value={review.score} />
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          {review.recommendation && <Pill color={color}>{RECOMMENDATION_LABELS[review.recommendation]}</Pill>}
          {review.recommended_session_id && (
            <span className="text-xs text-muted">Session suggérée : {sessionTitle(review.recommended_session_id) || 'supprimée'}</span>
          )}
        </div>
        {realComment(review) && (
          <p className="mt-2.5 text-sm leading-6 text-fg/85 whitespace-pre-line">{review.comments}</p>
        )}
      </div>
    </li>
  )
}

export default function ScientificPanel({ eventId, submissions, participants, isOrganizer, isReviewer, isAdmin, frozen = false, onRefresh }) {
  const myId = useAuth().user?.id ?? null
  const [showForm, setShowForm] = useState(false)
  const [reviewingId, setReviewingId] = useState(null)
  const [revisionPickerId, setRevisionPickerId] = useState(null)
  const [resubmittingId, setResubmittingId] = useState(null)
  const [resubmitForm, setResubmitForm] = useState({ title: '', abstract: '' })
  const [busy, setBusy] = useState(false)
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
  const myReviewsOf = (s) => (s.reviews || []).filter((r) => r.reviewer_id === myId && r.recommendation)
  const reviewerName = (id) => participants.find((p) => p.user_id === id)?.profiles?.full_name || 'Reviewer'

  const canManage = isOrganizer || isAdmin
  const canDecide = canManage && !frozen
  // un reviewer ne relit ni ses propres articles, ni deux fois le même
  const canReview = (s) => isReviewer && !frozen && s.status === 'submitted' && s.author_id !== myId && myReviewsOf(s).length === 0

  const acceptedCountFor = (s) => submissions.filter((x) => x.author_id === s.author_id && x.status === 'accepted').length
  const atLimit = (s) => acceptedCountFor(s) >= MAX_ACCEPTED_PER_AUTHOR

  // décision atomique côté base (decide_submission) : statut + ligne dans decisions, ou rien
  const decide = async (s, status, revisionType = null) => {
    if (status === 'accepted' && atLimit(s)) {
      setError(`Cet auteur a déjà ${MAX_ACCEPTED_PER_AUTHOR} articles acceptés dans cet événement.`)
      return
    }
    const noReview = sent(s).length === 0
    const label =
      status === 'accepted' ? 'Accepter' : status === 'rejected' ? 'Rejeter' : REVISION_LABELS[revisionType] || 'Demander une révision'
    const warning = noReview ? "\n\nCet article n'a encore aucune review." : ''
    const final = status !== 'revision_requested' ? "\nLa décision ne pourra plus être modifiée depuis l'interface." : ''
    if (!window.confirm(`${label} « ${s.title} » ?${final}${warning}`)) return

    setError(null)
    setBusy(true)
    const { error: rpcError } = await supabase.rpc('decide_submission', {
      p_submission_id: s.id,
      p_status: status,
      p_revision_type: revisionType,
    })
    setBusy(false)
    if (rpcError) {
      setError(frError(rpcError))
      return
    }
    setRevisionPickerId(null)
    onRefresh()
  }

  const handleDelete = async (s) => {
    if (!window.confirm(`Supprimer « ${s.title} » ? Ses reviews et ses décisions seront supprimées aussi.`)) return
    setError(null)
    const res = await supabase.from('submissions').delete().eq('id', s.id).select('id')
    const msg = writeError(res, 'Suppression refusée : aucune ligne supprimée.')
    if (msg) setError(msg)
    else onRefresh()
  }

  const handleResubmit = async (e, s) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const { error: rpcError } = await supabase.rpc('resubmit_submission', {
      p_submission_id: s.id,
      p_title: resubmitForm.title.trim(),
      p_abstract: resubmitForm.abstract.trim(),
    })
    setBusy(false)
    if (rpcError) {
      setError(frError(rpcError))
      return
    }
    setResubmittingId(null)
    onRefresh()
  }

  // L'auteur voit d'abord ses articles ; l'organisateur voit tout.
  const visibleBase = submissions
  const countOf = (id) => (id === 'all' ? visibleBase.length : visibleBase.filter((s) => s.status === id).length)
  const visible = (filter === 'all' ? visibleBase : visibleBase.filter((s) => s.status === filter))
    .slice()
    .sort((a, b) => (a.author_id === myId ? -1 : 0) - (b.author_id === myId ? -1 : 0) || new Date(b.submitted_at) - new Date(a.submitted_at))

  return (
    <section>
      <SectionTitle
        title="Soumissions"
        count={submissions.length}
        description={
          canManage
            ? 'Lis les avis des reviewers puis décide : accepter, rejeter ou demander une révision.'
            : isReviewer
              ? 'Relis les articles en attente : note, recommandation et commentaire anonyme pour l’auteur.'
              : 'Dépose tes articles et suis leur évaluation.'
        }
        actions={
          !frozen &&
          (showForm ? (
            <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">
              <XIcon size={16} aria-hidden="true" />
              Annuler
            </button>
          ) : (
            <button type="button" onClick={() => setShowForm(true)} className="btn-accent">
              <PlusIcon size={16} weight="bold" aria-hidden="true" />
              Soumettre un article
            </button>
          ))
        }
      />

      {frozen && (
        <div className="alert-info mb-5 flex items-start gap-2.5">
          <LockSimpleIcon size={18} className="shrink-0 mt-px" aria-hidden="true" />
          Phase scientifique close : les dépôts, les reviews et les décisions sont gelés.
        </div>
      )}

      {error && (
        <div role="alert" className="alert-error mb-5">
          {error}
        </div>
      )}

      {showForm && !frozen && (
        <div className="mb-8">
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
        <div className="mb-5">
          <Tabs
            variant="pill"
            label="Filtrer par statut"
            active={filter}
            onChange={setFilter}
            tabs={FILTERS.map((f) => ({ ...f, badge: countOf(f.id) || null }))}
          />
        </div>
      )}

      {submissions.length === 0 ? (
        <EmptyState
          icon={ArticleIcon}
          title="Aucune soumission"
          body={frozen ? 'La phase scientifique est close.' : 'Les auteurs déposent ici le titre et le résumé de leur article.'}
        />
      ) : visible.length === 0 ? (
        <EmptyState compact title="Aucun article dans cette catégorie" />
      ) : (
        <ul className="space-y-4">
          {visible.map((s, idx) => {
            const color = SUBMISSION_COLOR[s.status] || 'var(--color-st-neutral)'
            const expanded = expandedId === s.id
            const longAbstract = (s.abstract || '').length > ABSTRACT_FOLD
            const reviews = sent(s)
            const avg = reviews.length ? (reviews.reduce((sum, r) => sum + Number(r.score || 0), 0) / reviews.length).toFixed(1) : null
            const revision = latestRevision(s)
            const isMine = s.author_id === myId
            const mineReviews = myReviewsOf(s)
            const decideHere = canDecide && s.status === 'submitted'

            return (
              <li key={s.id} className="entity rise" style={{ '--stripe': color, '--i': Math.min(idx, 8) }}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Pill color={color}>{statusLabel(s)}</Pill>
                    {isMine && <span className="text-xs font-medium text-accent-ink">Mon article</span>}
                  </div>
                  {s.submitted_at && <span className="text-xs text-faint num">Déposé le {formatDate(s.submitted_at)}</span>}
                </div>

                <h3 className="mt-3 text-lg sm:text-xl font-semibold leading-snug tracking-tight text-fg">{s.title}</h3>

                {!isMine && s.profiles?.full_name && (
                  <div className="flex items-center gap-2 mt-2">
                    <Avatar name={s.profiles.full_name} size={24} />
                    <span className="text-sm text-muted">{s.profiles.full_name}</span>
                  </div>
                )}

                {s.abstract && (
                  <div className="mt-4">
                    <p className={`text-[15px] leading-7 text-fg/85 whitespace-pre-line max-w-[75ch] ${expanded ? '' : 'line-clamp-4'}`}>
                      {s.abstract}
                    </p>
                    {longAbstract && (
                      <button
                        type="button"
                        className="mt-1.5 text-[13px] font-medium text-accent-ink hover:underline underline-offset-4"
                        onClick={() => setExpandedId(expanded ? null : s.id)}
                        aria-expanded={expanded}
                      >
                        {expanded ? 'Réduire' : 'Lire tout le résumé'}
                      </button>
                    )}
                  </div>
                )}

                {/* Ma review (reviewer) */}
                {!canManage && mineReviews.length > 0 && (
                  <div className="mt-5 pt-4 border-t border-line">
                    <p className="text-[13px] font-medium text-muted mb-2.5">Ma review</p>
                    <ul className="space-y-2">
                      {mineReviews.map((r) => (
                        <ReviewItem key={r.id} name="Mon avis" review={r} sessionTitle={sessionTitle} />
                      ))}
                    </ul>
                  </div>
                )}

                {/* Avis des reviewers (organisateur) */}
                {canManage && (
                  <div className="mt-5 pt-4 border-t border-line">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                      <p className="text-[13px] font-medium text-muted">
                        {reviews.length ? `Avis des reviewers (${reviews.length})` : 'Aucune review pour le moment'}
                      </p>
                      {avg && <span className="text-[13px] text-muted num">Moyenne {avg} / 5</span>}
                    </div>
                    {reviews.length > 0 && (
                      <ul className="space-y-2">
                        {reviews.map((r) => (
                          <ReviewItem key={r.id} name={reviewerName(r.reviewer_id)} review={r} sessionTitle={sessionTitle} />
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {/* Auteur : révision demandée */}
                {s.status === 'revision_requested' && isMine && (
                  <div className="mt-5 rounded-xl p-4 border border-warn/30 bg-warn/8">
                    <p className="font-medium text-warn">
                      {revision?.revision_type ? `${REVISION_LABELS[revision.revision_type]} demandée` : 'Révision demandée'}
                    </p>
                    {revision?.revision_type && <p className="text-sm text-muted mt-0.5">{REVISION_HINTS[revision.revision_type]}</p>}

                    {reviews.filter(realComment).length > 0 && (
                      <ul className="space-y-2 mt-4">
                        {reviews.filter(realComment).map((r, i) => (
                          <ReviewItem key={r.id} name={`Reviewer ${i + 1}`} review={r} sessionTitle={sessionTitle} />
                        ))}
                      </ul>
                    )}

                    <div className="mt-4">
                      {frozen ? (
                        <p className="text-sm text-muted">La phase scientifique est close : la resoumission n'est plus possible.</p>
                      ) : resubmittingId === s.id ? (
                        <form onSubmit={(e) => handleResubmit(e, s)} className="space-y-4">
                          <div>
                            <label htmlFor={`rs-title-${s.id}`} className="form-label">
                              Titre
                            </label>
                            <input
                              id={`rs-title-${s.id}`}
                              className="input-field"
                              value={resubmitForm.title}
                              onChange={(e) => setResubmitForm((f) => ({ ...f, title: e.target.value }))}
                              required
                            />
                          </div>
                          <div>
                            <label htmlFor={`rs-abstract-${s.id}`} className="form-label">
                              Résumé corrigé
                            </label>
                            <textarea
                              id={`rs-abstract-${s.id}`}
                              className="textarea-field"
                              rows={6}
                              value={resubmitForm.abstract}
                              onChange={(e) => setResubmitForm((f) => ({ ...f, abstract: e.target.value }))}
                              required
                            />
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button type="submit" disabled={busy} className="btn-primary">
                              {busy ? 'Envoi…' : 'Resoumettre'}
                            </button>
                            <button type="button" className="btn-ghost" onClick={() => setResubmittingId(null)}>
                              Annuler
                            </button>
                          </div>
                        </form>
                      ) : (
                        <button
                          type="button"
                          className="btn-primary"
                          onClick={() => {
                            setResubmittingId(s.id)
                            setResubmitForm({ title: s.title, abstract: s.abstract || '' })
                          }}
                        >
                          <ArrowCounterClockwiseIcon size={16} aria-hidden="true" />
                          Corriger et resoumettre
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {decideHere && atLimit(s) && (
                  <p className="text-sm text-bad mt-4">
                    Cet auteur a déjà {MAX_ACCEPTED_PER_AUTHOR} articles acceptés : l'acceptation est bloquée. Tu peux rejeter ou
                    demander une révision.
                  </p>
                )}

                {/* Actions */}
                {(canReview(s) || decideHere || (canManage && s.status !== 'submitted')) && (
                  <div className="flex flex-wrap items-center gap-2 mt-5 pt-4 border-t border-line">
                    {canReview(s) && (
                      <button
                        type="button"
                        className={reviewingId === s.id ? 'btn-ghost' : 'btn-outline'}
                        onClick={() => setReviewingId(reviewingId === s.id ? null : s.id)}
                      >
                        <NotePencilIcon size={16} aria-hidden="true" />
                        {reviewingId === s.id ? 'Fermer' : 'Faire une review'}
                      </button>
                    )}

                    {decideHere && (
                      <>
                        <button
                          type="button"
                          className="btn-success"
                          disabled={busy || atLimit(s)}
                          title={atLimit(s) ? `Déjà ${MAX_ACCEPTED_PER_AUTHOR} articles acceptés pour cet auteur` : undefined}
                          onClick={() => decide(s, 'accepted')}
                        >
                          <CheckIcon size={16} weight="bold" aria-hidden="true" />
                          Accepter
                        </button>
                        {revisionPickerId === s.id ? (
                          <>
                            <button type="button" className="btn-outline" disabled={busy} onClick={() => decide(s, 'revision_requested', 'minor')}>
                              Révision mineure
                            </button>
                            <button type="button" className="btn-outline" disabled={busy} onClick={() => decide(s, 'revision_requested', 'major')}>
                              Révision majeure
                            </button>
                            <button type="button" className="btn-ghost" onClick={() => setRevisionPickerId(null)}>
                              Annuler
                            </button>
                          </>
                        ) : (
                          <button type="button" className="btn-outline" onClick={() => setRevisionPickerId(s.id)}>
                            <ArrowCounterClockwiseIcon size={16} aria-hidden="true" />
                            Révision
                          </button>
                        )}
                        <button type="button" className="btn-danger sm:ml-auto" disabled={busy} onClick={() => decide(s, 'rejected')}>
                          <XIcon size={16} weight="bold" aria-hidden="true" />
                          Rejeter
                        </button>
                      </>
                    )}

                    {canManage && s.status !== 'submitted' && (
                      <button type="button" className="btn-ghost hover:text-bad ml-auto" onClick={() => handleDelete(s)}>
                        <TrashIcon size={16} aria-hidden="true" />
                        Supprimer
                      </button>
                    )}
                  </div>
                )}

                {reviewingId === s.id && canReview(s) && (
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
