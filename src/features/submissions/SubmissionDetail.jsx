import { useState, useEffect } from 'react'
import {
  ArrowLeftIcon,
  CheckIcon,
  XIcon,
  ArrowCounterClockwiseIcon,
  NotePencilIcon,
  TrashIcon,
  StarIcon,
  CalendarBlankIcon,
  TrophyIcon,
  BookBookmarkIcon,
  EyeSlashIcon,
  CaretDownIcon,
  CaretUpIcon,
} from '@phosphor-icons/react'
import { supabase } from '../../lib/supabaseClient'
import { frError, writeError } from '../../lib/errors'
import {
  SUBMISSION_COLOR,
  REVISION_LABELS,
  RECOMMENDATION_LABELS,
  RECOMMENDATION_COLOR,
  MAX_ACCEPTED_PER_AUTHOR,
  formatDate,
} from '../../lib/constants'
import Pill from '../../components/ui/Pill'
import Avatar from '../../components/ui/Avatar'
import { StackedBar } from '../../components/charts/Charts'
import IdeasReviewModal from '../reviews/IdeasReviewModal'
import {
  parseReviewFromComments,
  getIdeasLabel,
  A1_OPTIONS,
  B3_OPTIONS,
  C3_TRACKS,
  C4_OPTIONS,
  D1_OPTIONS,
  F2_FORMATS,
} from '../reviews/ideasReviewUtils'
import { sentReviews, realComment, averageScore, latestRevision, statusLabel, REVISION_HINTS } from './submissionUtils'

export function Stars({ value, size = 14 }) {
  const n = Math.max(0, Math.min(5, Math.round(Number(value) || 0)))
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`Note : ${n} sur 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <StarIcon key={i} size={size} weight={i <= n ? 'fill' : 'regular'} className={i <= n ? 'text-accent' : 'text-faint'} />
      ))}
    </span>
  )
}

function ReviewItem({ name, review, sessionTitle, canManage, myId, chairNote }) {
  const [detailsOpen, setDetailsOpen] = useState(false)
  const ideas = parseReviewFromComments(review.comments)
  const canSeeConfidential = canManage || review.reviewer_id === myId
  const confidentialText = chairNote || ideas?.e4
  const color = RECOMMENDATION_COLOR[review.recommendation] || 'var(--color-st-muted)'

  if (ideas) {
    const scoreBand =
      ideas.f5 >= 90
        ? { label: 'Outstanding (90-100)', color: 'text-ok bg-ok/15 border-ok/30' }
        : ideas.f5 >= 75
        ? { label: 'Strong, Accept (75-89)', color: 'text-info bg-info/15 border-info/30' }
        : ideas.f5 >= 60
        ? { label: 'Revisions (60-74)', color: 'text-accent-ink bg-accent/15 border-accent/30' }
        : ideas.f5 >= 40
        ? { label: 'Weaknesses (40-59)', color: 'text-warn bg-warn/15 border-warn/30' }
        : { label: 'Reject (< 40)', color: 'text-bad bg-bad/15 border-bad/30' }

    return (
      <li className="rounded-2xl border border-line bg-surface-2/40 p-4 sm:p-5 space-y-4">
        {/* Entete avec reviewer, note et score IDEAS */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-line/60">
          <div className="flex items-center gap-2.5 min-w-0">
            <Avatar name={name} size={30} />
            <div>
              <span className="text-sm font-semibold text-fg block truncate">{name}</span>
              <span className="text-[11px] text-muted">
                Expertise : {getIdeasLabel(A1_OPTIONS, ideas.a1)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-lg border ${scoreBand.color}`}>
              Score IDEAS : {ideas.f5}/100 • {scoreBand.label.split('(')[0].trim()}
            </span>
            <Stars value={review.score} />
          </div>
        </div>

        {/* Badges de decision, track, format et distinctions */}
        <div className="flex flex-wrap items-center gap-2">
          {review.recommendation && <Pill color={color}>{RECOMMENDATION_LABELS[review.recommendation]}</Pill>}

          <span className="text-xs px-2 py-0.5 rounded-md bg-fg/5 text-fg/80 border border-line">
            Track : {getIdeasLabel(C3_TRACKS, ideas.c3)}
          </span>

          <span className="text-xs px-2 py-0.5 rounded-md bg-fg/5 text-fg/80 border border-line">
            Format : {getIdeasLabel(F2_FORMATS, ideas.f2)}
          </span>

          {ideas.f4 === 'yes' && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md bg-accent/20 text-accent-ink border border-accent/40">
              <TrophyIcon size={13} weight="fill" />
              <span>Nomination Best Paper</span>
            </span>
          )}

          {(ideas.f3 === 'strongly' || ideas.f3 === 'possibly') && (
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md bg-info/15 text-info-ink border border-info/30">
              <BookBookmarkIcon size={13} />
              <span>Candidat IGI Global Book</span>
            </span>
          )}

          {review.recommended_session_id && (
            <span className="text-xs text-muted">Session : {sessionTitle(review.recommended_session_id) || 'supprimee'}</span>
          )}
        </div>

        {/* Section E : Commentaires pour les auteurs */}
        <div className="space-y-3 pt-1">
          {ideas.e1 && (
            <div className="text-xs space-y-1">
              <span className="font-semibold text-ok flex items-center gap-1">
                <span>Points forts (E1) :</span>
              </span>
              <p className="text-fg/85 whitespace-pre-line pl-3 border-l-2 border-ok/40 leading-relaxed">
                {ideas.e1}
              </p>
            </div>
          )}

          {ideas.e2 && (
            <div className="text-xs space-y-1">
              <span className="font-semibold text-warn flex items-center gap-1">
                <span>Axes d'amelioration / Faiblesses (E2) :</span>
              </span>
              <p className="text-fg/85 whitespace-pre-line pl-3 border-l-2 border-warn/40 leading-relaxed">
                {ideas.e2}
              </p>
            </div>
          )}

          {ideas.e3 && (
            <div className="text-xs space-y-1">
              <span className="font-semibold text-fg flex items-center gap-1">
                <span>Suggestions concretes (E3) :</span>
              </span>
              <p className="text-fg/85 whitespace-pre-line pl-3 border-l-2 border-line leading-relaxed">
                {ideas.e3}
              </p>
            </div>
          )}

          {/* Section E4 Confidentiel pour le comite */}
          {canSeeConfidential && confidentialText && (
            <div className="p-3 rounded-xl border border-warn/40 bg-warn/8 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-warn uppercase tracking-wider text-[10px]">
                <EyeSlashIcon size={14} />
                <span>Remarques confidentielles pour les chaires (E4)</span>
              </div>
              <p className="text-fg/90 whitespace-pre-line pl-1 leading-relaxed">
                {confidentialText}
              </p>
            </div>
          )}
        </div>

        {/* Grille detaillee depliable (B1-B5, C, D) */}
        <div className="pt-2 border-t border-line/60">
          <button
            type="button"
            onClick={() => setDetailsOpen((v) => !v)}
            className="btn-ghost btn-sm text-[11px] text-muted hover:text-fg inline-flex items-center gap-1 p-0"
          >
            {detailsOpen ? <CaretUpIcon size={12} /> : <CaretDownIcon size={12} />}
            <span>{detailsOpen ? 'Masquer la grille detaillee IDEAS’2027' : 'Voir la grille detaillee IDEAS’2027 (B1-B5, Ethique, Format)'}</span>
          </button>

          {detailsOpen && (
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] p-3 rounded-xl bg-surface border border-line">
              <div className="space-y-0.5">
                <span className="text-muted block text-[10px] uppercase">B1. Originalite</span>
                <span className="font-bold text-fg">{ideas.b1} / 5</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-muted block text-[10px] uppercase">B2. Rigueur tech.</span>
                <span className="font-bold text-fg">{ideas.b2} / 5</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-muted block text-[10px] uppercase">B4. Conclusions</span>
                <span className="font-bold text-fg">{ideas.b4} / 5</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-muted block text-[10px] uppercase">B5. Etat de l'art</span>
                <span className="font-bold text-fg">{ideas.b5} / 5</span>
              </div>
              <div className="col-span-2 space-y-0.5 pt-1.5 border-t border-line/50">
                <span className="text-muted block text-[10px] uppercase">B3. Type de validation</span>
                <span className="font-medium text-fg truncate block">{getIdeasLabel(B3_OPTIONS, ideas.b3)}</span>
              </div>
              <div className="space-y-0.5 pt-1.5 border-t border-line/50">
                <span className="text-muted block text-[10px] uppercase">C4. Format IEEE</span>
                <span className="font-medium text-fg truncate block">{getIdeasLabel(C4_OPTIONS, ideas.c4)}</span>
              </div>
              <div className="space-y-0.5 pt-1.5 border-t border-line/50">
                <span className="text-muted block text-[10px] uppercase">D1. Ethique</span>
                <span className="font-medium text-fg">{getIdeasLabel(D1_OPTIONS, ideas.d1)}</span>
              </div>
            </div>
          )}
        </div>
      </li>
    )
  }

  return (
    <li className="rounded-xl border border-line bg-surface-2/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-2.5 min-w-0">
          <Avatar name={name} size={28} />
          <span className="text-sm font-medium text-fg truncate">{name}</span>
        </span>
        <Stars value={review.score} />
      </div>
      <div className="flex flex-wrap items-center gap-2 mt-3">
        {review.recommendation && <Pill color={color}>{RECOMMENDATION_LABELS[review.recommendation]}</Pill>}
        {review.recommended_session_id && (
          <span className="text-xs text-muted">Session suggérée : {sessionTitle(review.recommended_session_id) || 'supprimée'}</span>
        )}
      </div>
      {realComment(review) && <p className="mt-3 text-sm leading-6 text-fg/85 whitespace-pre-line">{review.comments}</p>}
    </li>
  )
}

// Article ouvert : tout le contenu, les avis et les actions possibles selon le rôle.
export default function SubmissionDetail({
  submission: s,
  eventId,
  myId,
  canManage,
  canDecide,
  canReview,
  frozen,
  atLimit,
  reviewerName,
  sessionTitle,
  onBack,
  onRefresh,
}) {
  const [revisionPicker, setRevisionPicker] = useState(false)
  const [reviewing, setReviewing] = useState(false)
  const [resubmitting, setResubmitting] = useState(false)
  const [form, setForm] = useState({ title: s.title, abstract: s.abstract || '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const color = SUBMISSION_COLOR[s.status] || 'var(--color-st-neutral)'
  const reviews = sentReviews(s)
  const avg = averageScore(s)
  const revision = latestRevision(s)
  const isMine = s.author_id === myId
  const mine = reviews.filter((r) => r.reviewer_id === myId)
  const decideHere = canDecide && s.status === 'submitted'

  const [chairNotes, setChairNotes] = useState({})

  useEffect(() => {
    if (!canManage && mine.length === 0) return
    const ids = reviews.map((r) => r.id).filter(Boolean)
    if (ids.length === 0) return
    supabase
      .from('review_chair_notes')
      .select('review_id, notes')
      .in('review_id', ids)
      .then(({ data, error }) => {
        if (!error && data) {
          const map = {}
          data.forEach((item) => {
            map[item.review_id] = item.notes
          })
          setChairNotes(map)
        }
      })
      .catch(() => {
        // Table en attente de migration ou indisponible : ne pas bloquer l'affichage
      })
  }, [s.id, canManage, reviews, mine.length])

  const decide = async (status, revisionType = null) => {
    const label =
      status === 'accepted' ? 'Accepter' : status === 'rejected' ? 'Rejeter' : REVISION_LABELS[revisionType] || 'Demander une révision'
    const final = status !== 'revision_requested' ? "\nLa décision ne pourra plus être modifiée depuis l'interface." : ''
    const warning = reviews.length === 0 ? "\n\nCet article n'a encore aucune review." : ''
    if (!window.confirm(`${label} « ${s.title} » ?${final}${warning}`)) return
    setError(null)
    setBusy(true)
    const { error: rpcError } = await supabase.rpc('decide_submission', {
      p_submission_id: s.id,
      p_status: status,
      p_revision_type: revisionType,
    })
    setBusy(false)
    if (rpcError) setError(frError(rpcError))
    else {
      setRevisionPicker(false)
      onRefresh()
    }
  }

  const remove = async () => {
    if (!window.confirm(`Supprimer « ${s.title} » ? Ses reviews et ses décisions seront supprimées aussi.`)) return
    setError(null)
    const res = await supabase.from('submissions').delete().eq('id', s.id).select('id')
    const msg = writeError(res, 'Suppression refusée : aucune ligne supprimée.')
    if (msg) setError(msg)
    else {
      onBack()
      onRefresh()
    }
  }

  const resubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const { error: rpcError } = await supabase.rpc('resubmit_submission', {
      p_submission_id: s.id,
      p_title: form.title.trim(),
      p_abstract: form.abstract.trim(),
    })
    setBusy(false)
    if (rpcError) setError(frError(rpcError))
    else {
      setResubmitting(false)
      onRefresh()
    }
  }

  return (
    <article className="card overflow-hidden" aria-labelledby={`sub-title-${s.id}`}>
      <div className="h-1.5" style={{ background: color }} aria-hidden="true" />

      <div className="p-4 sm:p-8">
        <button type="button" onClick={onBack} className="btn-ghost btn-sm -ml-2 mb-4 lg:hidden">
          <ArrowLeftIcon size={15} aria-hidden="true" />
          Tous les articles
        </button>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Pill color={color}>{statusLabel(s)}</Pill>
            {isMine && <span className="text-xs font-medium text-accent-ink">Mon article</span>}
          </div>
          {s.submitted_at && (
            <span className="inline-flex items-center gap-1.5 text-xs text-faint num">
              <CalendarBlankIcon size={13} aria-hidden="true" />
              Déposé le {formatDate(s.submitted_at)}
            </span>
          )}
        </div>

        <h3 id={`sub-title-${s.id}`} className="mt-3 sm:mt-4 text-xl sm:text-[1.75rem] font-semibold leading-[1.2] tracking-tight text-fg">
          {s.title}
        </h3>

        {s.profiles?.full_name && (
          <div className="flex items-center gap-2.5 mt-4">
            <Avatar name={s.profiles.full_name} size={32} tone={isMine ? 'brand' : 'neutral'} />
            <span className="text-sm text-fg">{s.profiles.full_name}</span>
          </div>
        )}

        {error && (
          <div role="alert" className="alert-error mt-5">
            {error}
          </div>
        )}

        {/* Cartouche Consensuel de Relecture */}
        <div className="mt-5 p-3.5 sm:p-4 rounded-xl border border-line bg-surface-2/40 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="num text-xl font-bold text-fg">
                {avg != null ? `${avg.toFixed(1)}` : '—'}
              </span>
              <span className="text-xs text-muted">/ 5</span>
              <Stars value={avg || 0} size={15} />
            </div>
            <span className="text-xs text-faint">
              • {reviews.length} {reviews.length > 1 ? 'avis déposés' : 'avis déposé'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-muted">
              Consensus pairs :
            </span>
            <Pill color={color}>
              {statusLabel(s)}
            </Pill>
          </div>
        </div>

        {s.abstract && (
          <section className="mt-7">
            <div className="p-5 sm:p-6 rounded-2xl border border-line/80 bg-surface-2/30 space-y-2 border-l-4 border-l-accent">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-accent-ink">
                  Résumé scientifique (Preprint View)
                </h4>
                <span className="text-[11px] font-mono text-faint">
                  {s.abstract.length} caractères
                </span>
              </div>
              <p className="text-sm sm:text-base leading-relaxed text-fg/90 whitespace-pre-line max-w-prose">
                {s.abstract}
              </p>
            </div>
          </section>
        )}

        {/* Décision (organisateur) */}
        {decideHere && (
          <section className="mt-8 rounded-2xl border border-line bg-surface-2/60 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="font-semibold text-fg">Ta décision</h4>
                <p className="text-[13px] text-muted mt-0.5">
                  {reviews.length
                    ? `${reviews.length} review${reviews.length > 1 ? 's' : ''}, moyenne ${avg.toFixed(1)} / 5.`
                    : 'Aucune review : une confirmation te sera demandée.'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {revisionPicker ? (
                  <>
                    <button type="button" className="btn-outline btn-sm" disabled={busy} onClick={() => decide('revision_requested', 'minor')}>
                      Révision mineure
                    </button>
                    <button type="button" className="btn-outline btn-sm" disabled={busy} onClick={() => decide('revision_requested', 'major')}>
                      Révision majeure
                    </button>
                    <button type="button" className="btn-ghost btn-sm" onClick={() => setRevisionPicker(false)}>
                      Annuler
                    </button>
                  </>
                ) : (
                  <>
                    <button type="button" className="btn-danger btn-sm" disabled={busy} onClick={() => decide('rejected')}>
                      <XIcon size={14} weight="bold" aria-hidden="true" />
                      Rejeter
                    </button>
                    <button type="button" className="btn-warning btn-sm" onClick={() => setRevisionPicker(true)}>
                      <ArrowCounterClockwiseIcon size={14} aria-hidden="true" />
                      Révision
                    </button>
                    <button
                      type="button"
                      className="btn-success btn-sm"
                      disabled={busy || atLimit}
                      title={atLimit ? `Déjà ${MAX_ACCEPTED_PER_AUTHOR} articles acceptés pour cet auteur` : undefined}
                      onClick={() => decide('accepted')}
                    >
                      <CheckIcon size={14} weight="bold" aria-hidden="true" />
                      Accepter
                    </button>
                  </>
                )}
              </div>
            </div>
            {atLimit && (
              <p className="text-[13px] text-bad mt-3">
                Cet auteur a déjà {MAX_ACCEPTED_PER_AUTHOR} articles acceptés : l'acceptation est bloquée.
              </p>
            )}
          </section>
        )}

        {/* Évaluation */}
        {(canManage || mine.length > 0) && (
          <section className="mt-8">
            <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
              <h4 className="font-semibold text-fg">{canManage ? `Avis des reviewers (${reviews.length})` : 'Ma review'}</h4>
              {canManage && avg != null && (
                <span className="flex items-center gap-2">
                  <span className="num text-2xl font-semibold tracking-tight text-fg">{avg.toFixed(1)}</span>
                  <Stars value={avg} size={15} />
                </span>
              )}
            </div>

            {canManage && reviews.length > 1 && (
              <div className="mb-5">
                <StackedBar
                  label="Recommandations des reviewers"
                  segments={['accept', 'revise', 'reject'].map((k) => ({
                    label: { accept: 'Accepter', revise: 'Réviser', reject: 'Rejeter' }[k],
                    value: reviews.filter((r) => r.recommendation === k).length,
                    color: RECOMMENDATION_COLOR[k],
                  }))}
                />
              </div>
            )}

            {(canManage ? reviews : mine).length === 0 ? (
              <p className="text-sm text-muted">Aucune review pour le moment.</p>
            ) : (
              <ul className="space-y-2.5">
                {(canManage ? reviews : mine).map((r) => (
                  <ReviewItem
                    key={r.id}
                    name={canManage ? reviewerName(r.reviewer_id) : 'Mon avis'}
                    review={r}
                    sessionTitle={sessionTitle}
                    canManage={canManage}
                    myId={myId}
                    chairNote={chairNotes[r.id]}
                  />
                ))}
              </ul>
            )}
          </section>
        )}

        {/* Auteur : révision demandée */}
        {s.status === 'revision_requested' && isMine && (
          <section className="mt-8 rounded-2xl p-5 border border-warn/30 bg-warn/8">
            <h4 className="font-semibold text-warn">
              {revision?.revision_type ? `${REVISION_LABELS[revision.revision_type]} demandée` : 'Révision demandée'}
            </h4>
            {revision?.revision_type && <p className="text-sm text-muted mt-1">{REVISION_HINTS[revision.revision_type]}</p>}

            {reviews.filter(realComment).length > 0 && (
              <ul className="space-y-2.5 mt-4">
                {reviews.filter(realComment).map((r, i) => (
                  <ReviewItem
                    key={r.id}
                    name={`Reviewer ${i + 1}`}
                    review={r}
                    sessionTitle={sessionTitle}
                    canManage={canManage}
                    myId={myId}
                    chairNote={chairNotes[r.id]}
                  />
                ))}
              </ul>
            )}

            <div className="mt-5">
              {frozen ? (
                <p className="text-sm text-muted">La phase scientifique est close : la resoumission n'est plus possible.</p>
              ) : resubmitting ? (
                <form onSubmit={resubmit} className="space-y-4">
                  <div>
                    <label htmlFor={`rs-title-${s.id}`} className="form-label">
                      Titre
                    </label>
                    <input
                      id={`rs-title-${s.id}`}
                      className="input-field"
                      value={form.title}
                      onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
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
                      rows={8}
                      value={form.abstract}
                      onChange={(e) => setForm((f) => ({ ...f, abstract: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="submit" disabled={busy} className="btn-primary">
                      {busy ? 'Envoi…' : 'Resoumettre'}
                    </button>
                    <button type="button" className="btn-ghost" onClick={() => setResubmitting(false)}>
                      Annuler
                    </button>
                  </div>
                </form>
              ) : (
                <button type="button" className="btn-primary" onClick={() => setResubmitting(true)}>
                  <ArrowCounterClockwiseIcon size={16} aria-hidden="true" />
                  Corriger et resoumettre
                </button>
              )}
            </div>
          </section>
        )}

        {/* Reviewer */}
        {canReview && (
          <section className="mt-8">
            <button
              type="button"
              className="btn-info inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold shadow-xs hover:shadow transition-all active:scale-95"
              onClick={() => setReviewing(true)}
            >
              <NotePencilIcon size={17} aria-hidden="true" />
              <span>
                {mine.length > 0 ? "Modifier ma grille d'évaluation IDEAS’2027" : "Remplir la grille d'évaluation IDEAS’2027"}
              </span>
            </button>

            {reviewing && (
              <IdeasReviewModal
                submission={s}
                eventId={eventId}
                initialData={
                  mine[0]
                    ? {
                        ...parseReviewFromComments(mine[0]?.comments),
                        e4: chairNotes[mine[0]?.id] || '',
                      }
                    : null
                }
                onClose={() => setReviewing(false)}
                onReviewed={() => {
                  setReviewing(false)
                  onRefresh()
                }}
              />
            )}
          </section>
        )}

        {isMine && !canManage && s.status === 'submitted' && !frozen && (
          <div className="mt-10 pt-5 border-t border-line flex justify-end">
            <button type="button" className="btn-ghost btn-sm hover:text-bad" onClick={remove}>
              <TrashIcon size={15} aria-hidden="true" />
              Retirer mon article
            </button>
          </div>
        )}

        {canManage && s.status !== 'submitted' && (
          <div className="mt-10 pt-5 border-t border-line flex justify-end">
            <button type="button" className="btn-ghost btn-sm hover:text-bad" onClick={remove}>
              <TrashIcon size={15} aria-hidden="true" />
              Supprimer l'article
            </button>
          </div>
        )}
      </div>
    </article>
  )
}
