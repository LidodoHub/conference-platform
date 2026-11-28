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
import { useConfirm } from '../../context/ConfirmContext'
import { useLanguage } from '../../context/LanguageContext'
import {
  SUBMISSION_COLOR,
  REVISION_LABELS,
  RECOMMENDATION_LABELS,
  RECOMMENDATION_COLOR,
  MAX_ACCEPTED_PER_AUTHOR,
} from '../../lib/constants'

const parseDay = (d) => {
  if (!d) return null
  const str = String(d)
  return str.length <= 10 ? new Date(`${str}T00:00:00`) : new Date(str)
}
const fmtDate = (d, locale) =>
  parseDay(d)?.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' }) || ''
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
              <p className="text-fg/85 whitespace-pre-line ps-3 border-s-2 border-ok/40 leading-relaxed">
                {ideas.e1}
              </p>
            </div>
          )}

          {ideas.e2 && (
            <div className="text-xs space-y-1">
              <span className="font-semibold text-warn flex items-center gap-1">
                <span>Axes d'amelioration / Faiblesses (E2) :</span>
              </span>
              <p className="text-fg/85 whitespace-pre-line ps-3 border-s-2 border-warn/40 leading-relaxed">
                {ideas.e2}
              </p>
            </div>
          )}

          {ideas.e3 && (
            <div className="text-xs space-y-1">
              <span className="font-semibold text-fg flex items-center gap-1">
                <span>Suggestions concretes (E3) :</span>
              </span>
              <p className="text-fg/85 whitespace-pre-line ps-3 border-s-2 border-line leading-relaxed">
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
              <p className="text-fg/90 whitespace-pre-line ps-1 leading-relaxed">
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
  assignments = [],
  doubleBlind = false,
  reviewerName,
  sessionTitle,
  onUnassign,
  onBack,
  onRefresh,
}) {
  const confirm = useConfirm()
  const { t, locale } = useLanguage()
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
      status === 'accepted' ? t('submissions.accept') : status === 'rejected' ? t('submissions.reject') : REVISION_LABELS[revisionType] || t('submissions.requestRevision')
    const final = status !== 'revision_requested' ? t('submissionDetail.finalDecisionWarning') : ''
    const warning = reviews.length === 0 ? t('submissionDetail.noReviewsWarning') : ''
    const description = [final, warning].filter(Boolean).join('\n\n')
    const ok = await confirm({
      title: `${label} « ${s.title} » ?`,
      description,
      confirmLabel: label,
      variant: 'default',
    })
    if (!ok) return
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
    const ok = await confirm({
      title: `${t('common.delete')} « ${s.title} » ?`,
      description: t('submissionDetail.deleteDesc'),
      confirmLabel: t('common.delete'),
      variant: 'danger',
    })
    if (!ok) return
    setError(null)
    const res = await supabase.from('submissions').delete().eq('id', s.id).select('id')
    const msg = writeError(res, t('errors.deleteRefused'))
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
        <button type="button" onClick={onBack} className="btn-ghost btn-sm -ms-2 mb-4 lg:hidden">
          <ArrowLeftIcon size={15} className="rtl:rotate-180" aria-hidden="true" />
          {t('submissionDetail.allPapers')}
        </button>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Pill color={color}>{statusLabel(s)}</Pill>
            {isMine && !doubleBlind && <span className="text-xs font-medium text-accent-ink">{t('submissionDetail.myPaper')}</span>}
          </div>
          {s.submitted_at && (
            <span className="inline-flex items-center gap-1.5 text-xs text-faint num">
              <CalendarBlankIcon size={13} aria-hidden="true" />
              {t('submissionDetail.submittedOn')} {fmtDate(s.submitted_at, locale)}
            </span>
          )}
        </div>

        <h3 id={`sub-title-${s.id}`} className="mt-3 sm:mt-4 text-xl sm:text-[1.75rem] font-semibold leading-[1.2] tracking-tight text-fg">
          {s.title}
        </h3>

        {(doubleBlind || s.profiles?.full_name) && (
          <div className="flex items-center gap-2.5 mt-4">
            <Avatar
              name={doubleBlind ? t('submissionDetail.anonymizedAuthor') : s.profiles.full_name}
              size={32}
              tone={!doubleBlind && isMine ? 'brand' : 'neutral'}
            />
            <span className="text-sm text-fg">
              {doubleBlind ? t('submissionDetail.anonymizedAuthorDoubleBlind') : s.profiles.full_name}
            </span>
          </div>
        )}

        {canManage && (
          <div className="mt-4 pt-3 border-t border-line/60 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-medium text-muted">{t('submissionDetail.assignedReviewers')}</span>
            {(() => {
              const subAssignments = assignments.filter((a) => a.submission_id === String(s.id))
              if (subAssignments.length === 0) {
                return <span className="text-faint">{t('submissionDetail.noReviewerAssigned')}</span>
              }
              return subAssignments.map((a, idx) => {
                const reviewed = reviews.some((r) => String(r.reviewer_id) === String(a.reviewer_id))
                const label = doubleBlind ? `${t('submissionDetail.reviewerWord')} ${idx + 1}` : a.reviewer_name
                return (
                  <span
                    key={a.reviewer_id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-2 border border-line text-fg"
                  >
                    <span className="font-medium">{label}</span>
                    <span className={reviewed ? 'text-ok font-medium' : 'text-muted'}>
                      · {reviewed ? t('submissionDetail.reviewed') : t('submissionDetail.pending')}
                    </span>
                    {onUnassign && (
                      <button
                        type="button"
                        onClick={() => onUnassign(s.id, a.reviewer_id)}
                        className="ms-0.5 text-muted hover:text-bad transition-colors leading-none cursor-pointer"
                        title={`${t('submissionDetail.remove')} ${label}`}
                        aria-label={`${t('submissionDetail.remove')} ${label}`}
                      >
                        ×
                      </button>
                    )}
                  </span>
                )
              })
            })()}
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
              • {reviews.length} {t(reviews.length > 1 ? 'submissionDetail.reviewsSubmittedPlural' : 'submissionDetail.reviewsSubmittedSingle')}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-muted">
              {t('submissionDetail.peerConsensus')}
            </span>
            <Pill color={color}>
              {statusLabel(s)}
            </Pill>
          </div>
        </div>

        {s.abstract && (
          <section className="mt-7">
            <div className="p-5 sm:p-6 rounded-2xl border border-line/80 bg-surface-2/30 space-y-2 border-s-4 border-s-accent">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-accent-ink">
                  {t('submissions.abstract')}
                </h4>
                <span className="text-[11px] font-mono text-faint">
                  {s.abstract.length} {t('submissionDetail.characters')}
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
                <h4 className="font-semibold text-fg">{t('submissionDetail.yourDecision')}</h4>
                <p className="text-[13px] text-muted mt-0.5">
                  {reviews.length
                    ? t('submissionDetail.reviewsAverage', { count: reviews.length, avg: avg.toFixed(1) })
                    : t('submissionDetail.noReviewsConfirm')}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {revisionPicker ? (
                  <>
                    <button type="button" className="btn-outline btn-sm" disabled={busy} onClick={() => decide('revision_requested', 'minor')}>
                      {t('submissionDetail.minorRevision')}
                    </button>
                    <button type="button" className="btn-outline btn-sm" disabled={busy} onClick={() => decide('revision_requested', 'major')}>
                      {t('submissionDetail.majorRevision')}
                    </button>
                    <button type="button" className="btn-ghost btn-sm" onClick={() => setRevisionPicker(false)}>
                      {t('common.cancel')}
                    </button>
                  </>
                ) : (
                  <>
                    <button type="button" className="btn-danger btn-sm" disabled={busy} onClick={() => decide('rejected')}>
                      <XIcon size={14} weight="bold" aria-hidden="true" />
                      {t('submissions.reject')}
                    </button>
                    <button type="button" className="btn-warning btn-sm" onClick={() => setRevisionPicker(true)}>
                      <ArrowCounterClockwiseIcon size={14} aria-hidden="true" />
                      {t('submissionDetail.revision')}
                    </button>
                    <button
                      type="button"
                      className="btn-success btn-sm"
                      disabled={busy || atLimit}
                      title={atLimit ? t('submissionDetail.atLimitTitle', { max: MAX_ACCEPTED_PER_AUTHOR }) : undefined}
                      onClick={() => decide('accepted')}
                    >
                      <CheckIcon size={14} weight="bold" aria-hidden="true" />
                      {t('submissions.accept')}
                    </button>
                  </>
                )}
              </div>
            </div>
            {atLimit && (
              <p className="text-[13px] text-bad mt-3">
                {t('submissionDetail.atLimitDesc', { max: MAX_ACCEPTED_PER_AUTHOR })}
              </p>
            )}
          </section>
        )}

        {/* Évaluation */}
        {(canManage || mine.length > 0) && (
          <section className="mt-8">
            <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
              <h4 className="font-semibold text-fg">
                {canManage ? `${t('submissionDetail.reviewerFeedback')} (${reviews.length})` : t('submissionDetail.myReview')}
              </h4>
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
                  label={t('submissionDetail.reviewerRecommendations')}
                  segments={['accept', 'revise', 'reject'].map((k) => ({
                    label: { accept: t('submissions.accept'), revise: t('submissionDetail.revise'), reject: t('submissions.reject') }[k],
                    value: reviews.filter((r) => r.recommendation === k).length,
                    color: RECOMMENDATION_COLOR[k],
                  }))}
                />
              </div>
            )}

            {(canManage ? reviews : mine).length === 0 ? (
              <p className="text-sm text-muted">{t('submissionDetail.noReviewsYet')}</p>
            ) : (
              <ul className="space-y-2.5">
                {(canManage ? reviews : mine).map((r, idx) => (
                  <ReviewItem
                    key={r.id}
                    name={canManage ? (doubleBlind ? `${t('submissionDetail.reviewerWord')} ${idx + 1}` : reviewerName(r.reviewer_id)) : doubleBlind ? t('submissionDetail.myReviewAnonymous') : t('submissionDetail.myReviewShort')}
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
              {revision?.revision_type ? `${REVISION_LABELS[revision.revision_type]} ${t('submissionDetail.requested')}` : t('submissions.revisionRequested')}
            </h4>
            {revision?.revision_type && <p className="text-sm text-muted mt-1">{REVISION_HINTS[revision.revision_type]}</p>}

            {reviews.filter(realComment).length > 0 && (
              <ul className="space-y-2.5 mt-4">
                {reviews.filter(realComment).map((r, i) => (
                  <ReviewItem
                    key={r.id}
                    name={`${t('submissionDetail.reviewerWord')} ${i + 1}`}
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
                <p className="text-sm text-muted">{t('submissionDetail.closedResubmitBlocked')}</p>
              ) : resubmitting ? (
                <form onSubmit={resubmit} className="space-y-4">
                  <div>
                    <label htmlFor={`rs-title-${s.id}`} className="form-label">
                      {t('submissions.title')}
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
                      {t('submissions.abstract')}
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
                      {busy ? t('common.saving') : t('submissions.resubmit')}
                    </button>
                    <button type="button" className="btn-ghost" onClick={() => setResubmitting(false)}>
                      {t('common.cancel')}
                    </button>
                  </div>
                </form>
              ) : (
                <button type="button" className="btn-primary" onClick={() => setResubmitting(true)}>
                  <ArrowCounterClockwiseIcon size={16} aria-hidden="true" />
                  {t('submissions.resubmit')}
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
                {mine.length > 0
                  ? t('submissionDetail.editReviewForm')
                  : t('submissionDetail.fillReviewForm')}
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
              {t('submissionDetail.withdrawPaper')}
            </button>
          </div>
        )}

        {canManage && s.status !== 'submitted' && (
          <div className="mt-10 pt-5 border-t border-line flex justify-end">
            <button type="button" className="btn-ghost btn-sm hover:text-bad" onClick={remove}>
              <TrashIcon size={15} aria-hidden="true" />
              {t('common.delete')}
            </button>
          </div>
        )}
      </div>
    </article>
  )
}
