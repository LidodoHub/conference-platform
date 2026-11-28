import { useState, useEffect, useCallback } from 'react'
import {
  PlusIcon,
  XIcon,
  ArticleIcon,
  LockSimpleIcon,
  MagnifyingGlassIcon,
  ChatCircleTextIcon,
  SquaresFourIcon,
  TableIcon,
  ColumnsIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  CaretLeftIcon,
  CaretRightIcon,
  KanbanIcon,
} from '@phosphor-icons/react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../lib/auth'
import { SUBMISSION_COLOR, MAX_ACCEPTED_PER_AUTHOR } from '../../lib/constants'
import { useLanguage } from '../../context/LanguageContext'
import { useUrlQueryState } from '../../hooks/useUrlQueryState'
import SubmissionForm from './SubmissionForm'
import SubmissionDetail, { Stars } from './SubmissionDetail'
import Tabs from '../../components/ui/Tabs'
import EmptyState from '../../components/ui/EmptyState'
import Collapsible from '../../components/ui/Collapsible'
import { sentReviews, averageScore, latestRevision } from './submissionUtils'
import { DownloadSimpleIcon, EyeSlashIcon } from '@phosphor-icons/react'

const getStatusLabel = (s, t) => {
  if (s.status === 'revision_requested') {
    const rev = latestRevision(s)
    if (rev?.revision_type === 'minor') return t('scientificPanel.revisionMinor')
    if (rev?.revision_type === 'major') return t('scientificPanel.revisionMajor')
  }
  const key = s.status === 'revision_requested' ? 'revisionRequested' : s.status
  return t(`submissions.${key}`)
}

// Ligne discrète des reviewers assignés (visible côté Organisateur uniquement)
function AssignedReviewersLine({ submission, assignments = [], doubleBlind = false, onUnassign }) {
  const { t } = useLanguage()
  const reviews = sentReviews(submission)
  const items = assignments.filter((a) => a.submission_id === String(submission.id))

  return (
    <div
      className="mt-2.5 pt-2.5 border-t border-line/60 flex flex-wrap items-center gap-1.5 text-[11px]"
      onClick={(e) => e.stopPropagation()}
    >
      <span className="font-medium text-muted me-0.5">{t('scientificPanel.assignedReviewers')}</span>
      {items.length === 0 ? (
        <span className="text-faint">{t('scientificPanel.noReviewerAssigned')}</span>
      ) : (
        items.map((a, idx) => {
          const reviewed = reviews.some((r) => String(r.reviewer_id) === String(a.reviewer_id))
          const label = doubleBlind ? t('scientificPanel.reviewerLabel', { n: idx + 1 }) : a.reviewer_name
          return (
            <span
              key={a.reviewer_id}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-2 border border-line text-fg"
            >
              <span className="font-medium truncate max-w-[120px]">{label}</span>
              <span className={reviewed ? 'text-ok font-medium' : 'text-muted'}>
                · {reviewed ? t('scientificPanel.reviewed') : t('scientificPanel.pending')}
              </span>
              {onUnassign && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onUnassign(submission.id, a.reviewer_id)
                  }}
                  className="ms-0.5 text-muted hover:text-bad transition-colors leading-none cursor-pointer"
                  title={t('scientificPanel.removeReviewer', { name: label })}
                  aria-label={t('scientificPanel.removeReviewer', { name: label })}
                >
                  ×
                </button>
              )}
            </span>
          )
        })
      )}
    </div>
  )
}

// Ligne compacte pour la vue scindée
function SubmissionRow({ s, active, isMine, showReviews, showAssignments, assignments, onUnassign, todo, doubleBlind, onSelect }) {
  const { t, locale } = useLanguage()
  const color = SUBMISSION_COLOR[s.status] || 'var(--color-st-neutral)'
  const reviews = sentReviews(s)
  const avg = averageScore(s)
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(s.id)}
      onKeyDown={(e) => e.key === 'Enter' && onSelect(s.id)}
      aria-current={active ? 'true' : undefined}
      className={`relative w-full text-start rounded-xl border px-4 py-3.5 transition-[background-color,border-color,box-shadow] duration-200 cursor-pointer ${
        active
          ? 'bg-surface border-neutral-400 dark:border-white/25 shadow-xs'
          : 'bg-surface/60 border-line hover:bg-surface hover:border-fg/20'
      }`}
    >
      <span className="absolute start-0 top-3 bottom-3 w-[3px] rounded-e-full" style={{ background: color }} aria-hidden="true" />
      <span className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium" style={{ color }}>
          {getStatusLabel(s, t)}
        </span>
        {todo && <span className="text-[11px] font-medium rounded-full px-2 py-0.5 bg-surface-2 text-fg border border-line">{todo}</span>}
      </span>
      <span className="block mt-1 text-[15px] font-medium leading-snug text-fg line-clamp-2">{s.title}</span>
      <span className="mt-2 flex items-center justify-between gap-3 text-[12.5px] text-muted">
        <span className="truncate">
          {doubleBlind ? t('scientificPanel.anonymizedAuthor') : isMine ? t('scientificPanel.myArticle') : s.profiles?.full_name || t('scientificPanel.authorFallback')}
          <span className="text-faint num">, {s.submitted_at ? new Date(s.submitted_at).toLocaleDateString(locale, { day: 'numeric', month: 'short' }) : ''}</span>
        </span>
        {showReviews && (
          <span className="flex items-center gap-1.5 shrink-0">
            {avg != null && <Stars value={avg} size={11} />}
            <span className="inline-flex items-center gap-1 num">
              <ChatCircleTextIcon size={13} aria-hidden="true" />
              {reviews.length}
            </span>
          </span>
        )}
      </span>
      {showAssignments && (
        <AssignedReviewersLine submission={s} assignments={assignments} doubleBlind={doubleBlind} onUnassign={onUnassign} />
      )}
    </div>
  )
}

// Carte horizontale aérée pour la vue grille
function SubmissionCard({ s, isMine, showReviews, showAssignments, assignments, onUnassign, todo, doubleBlind, onSelect }) {
  const { t, locale } = useLanguage()
  const color = SUBMISSION_COLOR[s.status] || 'var(--color-st-neutral)'
  const reviews = sentReviews(s)
  const avg = averageScore(s)

  return (
    <div
      onClick={() => onSelect(s.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect(s.id)}
      className="card p-5 sm:p-6 border-line bg-surface/60 hover:bg-surface hover:border-neutral-300 dark:hover:border-white/20 shadow-card hover:shadow-lift transition-all text-start flex flex-col justify-between group cursor-pointer relative overflow-hidden"
    >
      <span
        className="absolute start-0 top-0 bottom-0 w-1.5"
        style={{ background: color }}
        aria-hidden="true"
      />

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span
            className="text-xs font-semibold px-2.5 py-0.5 rounded-full inline-block"
            style={{
              color,
              background: `color-mix(in srgb, ${color} 15%, transparent)`,
            }}
          >
            {getStatusLabel(s, t)}
          </span>
          {todo && (
            <span className="text-[11px] font-semibold rounded-full px-2.5 py-0.5 bg-surface-2 text-fg border border-line">
              {todo}
            </span>
          )}
        </div>

        <h3 className="font-semibold text-fg text-base sm:text-lg leading-snug group-hover:text-fg dark:group-hover:text-white transition-colors line-clamp-2">
          {s.title}
        </h3>

        {s.abstract && (
          <p className="text-xs sm:text-sm text-muted line-clamp-3 leading-relaxed">
            {s.abstract}
          </p>
        )}
      </div>

      <div className="pt-4 mt-5 border-t border-line flex items-center justify-between gap-3 text-xs text-muted">
        <div className="truncate">
          <span className="font-medium text-fg">
            {doubleBlind ? t('scientificPanel.anonymizedAuthor') : isMine ? t('scientificPanel.myArticle') : s.profiles?.full_name || t('scientificPanel.anonymousAuthor')}
          </span>
          <span className="text-faint num"> • {s.submitted_at ? new Date(s.submitted_at).toLocaleDateString(locale, { day: 'numeric', month: 'short' }) : ''}</span>
        </div>

        {showReviews && (
          <div className="flex items-center gap-2 shrink-0">
            {avg != null && <Stars value={avg} size={12} />}
            <span className="inline-flex items-center gap-1 font-mono text-xs text-faint">
              <ChatCircleTextIcon size={14} aria-hidden="true" />
              {reviews.length}
            </span>
          </div>
        )}
      </div>

      {showAssignments && (
        <AssignedReviewersLine submission={s} assignments={assignments} doubleBlind={doubleBlind} onUnassign={onUnassign} />
      )}
    </div>
  )
}

// Tableau haute précision pour la vue table
function SubmissionTable({ list, myId, showReviews, todoOf, doubleBlind, onSelect }) {
  const { t, locale } = useLanguage()
  return (
    <div className="card overflow-hidden border-line">
      <div className="overflow-x-auto">
        <table className="w-full text-start text-xs sm:text-sm">
          <thead className="bg-surface border-b border-line text-faint text-[11px] uppercase tracking-wider font-semibold">
            <tr>
              <th scope="col" className="px-4 py-3">{t('scientificPanel.tableColStatus')}</th>
              <th scope="col" className="px-4 py-3">{t('scientificPanel.tableColTitleAuthor')}</th>
              <th scope="col" className="px-4 py-3">{t('scientificPanel.tableColDate')}</th>
              {showReviews && <th scope="col" className="px-4 py-3">{t('scientificPanel.tableColEvaluation')}</th>}
              <th scope="col" className="px-4 py-3 text-end">{t('scientificPanel.tableColAction')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {list.map((s) => {
              const color = SUBMISSION_COLOR[s.status] || 'var(--color-st-neutral)'
              const reviews = sentReviews(s)
              const avg = averageScore(s)
              const todo = todoOf(s)
              const isMine = s.author_id === myId
              return (
                <tr
                  key={s.id}
                  onClick={() => onSelect(s.id)}
                  className="hover:bg-fg/4 transition-colors cursor-pointer group"
                >
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full inline-block"
                      style={{
                        color,
                        background: `color-mix(in srgb, ${color} 15%, transparent)`,
                      }}
                    >
                      {getStatusLabel(s, t)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 min-w-[260px] max-w-md">
                    <span className="font-semibold text-fg block truncate group-hover:text-fg dark:group-hover:text-white transition-colors">
                      {s.title}
                    </span>
                    <span className="text-xs text-muted block truncate mt-0.5">
                      {doubleBlind ? t('scientificPanel.anonymizedAuthor') : isMine ? t('scientificPanel.myArticle') : s.profiles?.full_name || t('scientificPanel.anonymousAuthor')}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap text-xs text-muted num">
                    {s.submitted_at ? new Date(s.submitted_at).toLocaleDateString(locale, { day: 'numeric', month: 'short' }) : ''}
                  </td>
                  {showReviews && (
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {reviews.length > 0 ? (
                        <div className="flex items-center gap-1.5">
                          {avg != null && <Stars value={avg} size={11} />}
                          <span className="text-xs font-mono text-muted">({reviews.length})</span>
                        </div>
                      ) : (
                        <span className="text-faint text-xs">{t('scientificPanel.noReview')}</span>
                      )}
                    </td>
                  )}
                  <td className="px-4 py-3.5 text-end whitespace-nowrap">
                    {todo ? (
                      <span className="text-xs font-semibold rounded-full px-2.5 py-1 bg-surface-2 text-fg border border-line">
                        {todo}
                      </span>
                    ) : (
                      <span className="text-xs text-faint group-hover:text-fg font-medium inline-flex items-center gap-1">
                        {t('scientificPanel.consult')}
                        <ArrowRightIcon size={12} weight="bold" className="rtl:rotate-180" aria-hidden="true" />
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ConsensusMatrix({ submissions, doubleBlind, onSelect }) {
  const { t } = useLanguage()
  const getDisparity = (s) => {
    const revs = sentReviews(s)
    if (revs.length < 2) return 0
    const scores = revs.map((r) => r.score).filter((sc) => sc != null)
    if (scores.length < 2) return 0
    return Math.max(...scores) - Math.min(...scores)
  }

  const columns = [
    {
      id: 'favorable',
      title: t('scientificPanel.matrix.favorableTitle'),
      badge: t('scientificPanel.matrix.favorableBadge'),
      headerCls: 'border-ok/30 bg-ok/10 text-ok',
      items: submissions.filter((s) => {
        const avg = averageScore(s)
        const disp = getDisparity(s)
        return s.status === 'accepted' || (s.status === 'submitted' && avg != null && avg >= 3.8 && disp < 1.5)
      }),
    },
    {
      id: 'litige',
      title: t('scientificPanel.matrix.litigeTitle'),
      badge: t('scientificPanel.matrix.litigeBadge'),
      headerCls: 'border-warn/40 bg-warn/10 text-warn',
      items: submissions.filter((s) => {
        const disp = getDisparity(s)
        const revs = sentReviews(s)
        const hasOppositeRecs = revs.some((r) => r.recommendation === 'accept') && revs.some((r) => r.recommendation === 'reject')
        return s.status === 'submitted' && (disp >= 1.5 || hasOppositeRecs)
      }),
    },
    {
      id: 'revision',
      title: t('scientificPanel.matrix.revisionTitle'),
      badge: t('scientificPanel.matrix.revisionBadge'),
      headerCls: 'border-info/30 bg-info/10 text-info',
      items: submissions.filter((s) => {
        const avg = averageScore(s)
        const disp = getDisparity(s)
        return s.status === 'revision_requested' || (s.status === 'submitted' && avg != null && avg >= 2.5 && avg < 3.8 && disp < 1.5)
      }),
    },
    {
      id: 'defavorable',
      title: t('scientificPanel.matrix.defavorableTitle'),
      badge: t('scientificPanel.matrix.defavorableBadge'),
      headerCls: 'border-bad/30 bg-bad/10 text-bad',
      items: submissions.filter((s) => {
        const avg = averageScore(s)
        return s.status === 'rejected' || (s.status === 'submitted' && avg != null && avg < 2.5)
      }),
    },
  ]

  return (
    <div className="space-y-5">
      {/* Bandeau d'indicateurs de consensus */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {columns.map((col) => (
          <div key={col.id} className="card p-3 bg-surface/80 border-line/70 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-muted block uppercase tracking-wider">{col.title}</span>
              <span className="num font-bold text-lg text-fg block mt-0.5">{col.items.length}</span>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${col.headerCls}`}>
              {col.badge}
            </span>
          </div>
        ))}
      </div>

      {/* Colonnes Kanban du consensus */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
        {columns.map((col) => (
          <div key={col.id} className="card p-3.5 bg-surface-sunken/40 border-line/70 space-y-3 min-h-[320px] flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-line/60">
              <span className="text-xs font-bold text-fg flex items-center gap-1.5">
                {col.title}
              </span>
              <span className="num text-xs font-semibold px-2 py-0.5 rounded-full bg-surface text-muted border border-line/60">
                {col.items.length}
              </span>
            </div>

            {col.items.length === 0 ? (
              <div className="flex-1 flex items-center justify-center py-10 text-center">
                <span className="text-xs text-muted">{t('scientificPanel.matrix.emptyCategory')}</span>
              </div>
            ) : (
              <div className="space-y-2.5">
                {col.items.map((s) => {
                  const revs = sentReviews(s)
                  const avg = averageScore(s)
                  const disp = getDisparity(s)
                  return (
                    <div
                      key={s.id}
                      onClick={() => onSelect(s.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && onSelect(s.id)}
                      className="card p-3.5 bg-surface border-line/80 hover:border-black/20 dark:hover:border-white/[0.12] shadow-card hover:shadow-lift transition-all cursor-pointer space-y-2.5 group text-start"
                    >
                      <h4 className="text-xs font-semibold text-fg line-clamp-2 leading-snug group-hover:text-fg dark:group-hover:text-white transition-colors">
                        {s.title}
                      </h4>

                      <div className="flex items-center justify-between text-[11px] text-muted">
                        <span className="truncate max-w-[130px]">
                          {doubleBlind ? t('scientificPanel.anonymizedShort') : s.profiles?.full_name || t('scientificPanel.authorFallback')}
                        </span>
                        {avg != null && (
                          <span className="flex items-center gap-1 num font-bold text-fg">
                            <Stars value={avg} size={10} />
                            <span>{avg.toFixed(1)}/5</span>
                          </span>
                        )}
                      </div>

                      {disp >= 1.5 && (
                        <div className="text-[10px] font-semibold px-2 py-0.5 rounded bg-warn/15 text-warn flex items-center justify-between">
                          <span>{t('scientificPanel.matrix.divergentOpinions')}</span>
                          <span className="num">{t('scientificPanel.matrix.disparity', { pts: disp.toFixed(1) })}</span>
                        </div>
                      )}

                      <div className="pt-2 border-t border-line/50 flex items-center justify-between text-[10.5px]">
                        <span className="text-muted num">
                          {t(revs.length > 1 ? 'scientificPanel.matrix.reviewCountMany' : 'scientificPanel.matrix.reviewCountOne', {
                            count: revs.length,
                          })}
                        </span>
                        <span className="text-fg dark:text-white font-semibold group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 transition-transform inline-flex items-center gap-1">
                          {t('scientificPanel.matrix.arbitrate')}
                          <ArrowRightIcon size={11} weight="bold" className="rtl:rotate-180" aria-hidden="true" />
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ScientificPanel({
  eventId,
  submissions,
  participants,
  assignments = [],
  isOrganizer,
  isReviewer,
  isAdmin,
  frozen = false,
  onUnassign,
  onRefresh,
}) {
  const { t } = useLanguage()
  const myId = useAuth().user?.id ?? null
  const [searchParams, setSearchParams] = useUrlQueryState()
  const selectedId = searchParams.get('paper') || null
  const rawView = searchParams.get('view')
  const viewMode = ['grid', 'table', 'split', 'matrix'].includes(rawView) ? rawView : 'grid'

  const setSelectedId = useCallback(
    (id) => {
      setSearchParams((prev) => {
        if (id) prev.set('paper', String(id))
        else prev.delete('paper')
        return prev
      })
    },
    [setSearchParams],
  )

  const setViewMode = useCallback(
    (nextView) => {
      setSearchParams((prev) => {
        if (nextView && nextView !== 'grid') prev.set('view', nextView)
        else prev.delete('view')
        return prev
      })
    },
    [setSearchParams],
  )

  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [doubleBlind, setDoubleBlind] = useState(false)
  const [sessions, setSessions] = useState([])

  const filters = [
    { id: 'all', label: t('scientificPanel.filters.all') },
    { id: 'submitted', label: t('scientificPanel.filters.submitted') },
    { id: 'revision_requested', label: t('scientificPanel.filters.revision_requested') },
    { id: 'accepted', label: t('scientificPanel.filters.accepted') },
    { id: 'rejected', label: t('scientificPanel.filters.rejected') },
  ]

  useEffect(() => {
    supabase
      .from('sessions')
      .select('id, title')
      .eq('event_id', eventId)
      .then(({ data }) => setSessions(data || []))
  }, [eventId])

  const canManage = isOrganizer || isAdmin
  const canDecide = canManage && !frozen
  const roleSubmissions = canManage
    ? submissions
    : isReviewer
      ? submissions.filter((s) =>
          assignments.some((a) => a.submission_id === String(s.id) && a.reviewer_id === String(myId)),
        )
      : submissions.filter((s) => s.author_id === myId || s.status === 'accepted')
  const sessionTitle = (id) => sessions.find((x) => x.id === id)?.title
  const reviewerName = (id) => participants.find((p) => p.user_id === id)?.profiles?.full_name || t('scientificPanel.reviewerFallback')
  const myReviewed = (s) => sentReviews(s).some((r) => r.reviewer_id === myId)
  const canReview = (s) => isReviewer && !frozen && s.status === 'submitted' && s.author_id !== myId && !myReviewed(s)
  const atLimit = (s) =>
    roleSubmissions.filter((x) => x.author_id === s.author_id && x.status === 'accepted').length >=
    MAX_ACCEPTED_PER_AUTHOR

  const todoOf = (s) => {
    if (canDecide && s.status === 'submitted') return sentReviews(s).length ? t('scientificPanel.todoDecide') : t('scientificPanel.todoNoReview')
    if (canReview(s)) return t('scientificPanel.todoReview')
    if (s.author_id === myId && s.status === 'revision_requested' && !frozen) return t('scientificPanel.todoRevise')
    return null
  }

  const q = query.trim().toLowerCase()
  const countOf = (id) => (id === 'all' ? roleSubmissions.length : roleSubmissions.filter((s) => s.status === id).length)
  const visible = roleSubmissions
    .filter((s) => filter === 'all' || s.status === filter)
    .filter((s) => !q || [s.title, s.abstract, s.profiles?.full_name].some((v) => (v || '').toLowerCase().includes(q)))
    .slice()
    .sort(
      (a, b) =>
        Number(Boolean(todoOf(b))) - Number(Boolean(todoOf(a))) ||
        new Date(b.submitted_at) - new Date(a.submitted_at),
    )

  const current =
    visible.find((s) => String(s.id) === String(selectedId)) ||
    (viewMode === 'split' ? visible[0] : null) ||
    null
  const showReviews = canManage

  const currentIndex = current ? visible.findIndex((s) => s.id === current.id) : -1
  const prevItem = currentIndex > 0 ? visible[currentIndex - 1] : null
  const nextItem = currentIndex !== -1 && currentIndex < visible.length - 1 ? visible[currentIndex + 1] : null

  const description = canManage
    ? t('scientificPanel.descManager')
    : isReviewer
      ? t('scientificPanel.descReviewer')
      : t('scientificPanel.descAuthor')

  return (
    <section className="space-y-6">
      {/* En-tête de section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-fg flex items-baseline gap-2">
            {t('scientificPanel.heading')}
            <span className="num font-mono text-sm font-normal text-faint">({roleSubmissions.length})</span>
          </h2>
          <p className="text-xs sm:text-sm text-muted mt-0.5 max-w-[65ch]">{description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canManage && submissions.some((s) => s.status === 'accepted') && (
            <button
              type="button"
              onClick={async () => {
                const { exportProceedingsPDF } = await import('../certificates/pdf')
                exportProceedingsPDF({ eventTitle: t('scientificPanel.proceedingsDocTitle'), submissions })
              }}
              className="btn-outline btn-sm text-xs flex items-center gap-1.5"
              title={t('scientificPanel.proceedingsTitle')}
            >
              <DownloadSimpleIcon size={14} />
              <span>{t('scientificPanel.proceedingsBtn')}</span>
            </button>
          )}

          {canManage && (
            <button
              type="button"
              onClick={() => setDoubleBlind((v) => !v)}
              className={`text-xs px-2.5 py-1.5 rounded-xl border flex items-center gap-1.5 transition-colors ${
                doubleBlind
                  ? 'bg-[#EDEDEF] dark:bg-[#24262B] border-accent text-fg font-semibold'
                  : 'border-line bg-surface/50 text-muted hover:text-fg'
              }`}
              title={t('scientificPanel.doubleBlindTitle')}
            >
              <EyeSlashIcon size={14} />
              <span>{t('scientificPanel.doubleBlindLabel', { state: doubleBlind ? t('scientificPanel.active') : t('scientificPanel.inactive') })}</span>
            </button>
          )}

          {!frozen &&
            (showForm ? (
              <button type="button" onClick={() => setShowForm(false)} className="btn-ghost btn-sm">
                <XIcon size={16} aria-hidden="true" />
                {t('common.cancel')}
              </button>
            ) : (
              <button type="button" onClick={() => setShowForm(true)} className="btn-info btn-sm">
                <PlusIcon size={16} weight="bold" aria-hidden="true" />
                {t('scientificPanel.submitArticle')}
              </button>
            ))}
        </div>
      </div>

      {frozen && (
        <div className="alert-info flex items-start gap-2.5">
          <LockSimpleIcon size={18} className="shrink-0 mt-px" aria-hidden="true" />
          {t('scientificPanel.frozenNotice')}
        </div>
      )}

      {showForm && !frozen && (
        <div className="card p-6 border-accent/40 bg-surface/80 max-w-3xl">
          <SubmissionForm
            eventId={eventId}
            onSubmitted={() => {
              setShowForm(false)
              onRefresh()
            }}
          />
        </div>
      )}

      {roleSubmissions.length === 0 ? (
        <EmptyState
          icon={ArticleIcon}
          title={isReviewer && !canManage ? t('scientificPanel.emptyReviewerTitle') : t('scientificPanel.emptyTitle')}
          body={
            isReviewer && !canManage
              ? t('scientificPanel.emptyReviewerBody')
              : frozen
                ? t('scientificPanel.emptyFrozenBody')
                : t('scientificPanel.emptyDefaultBody')
          }
        />
      ) : selectedId && viewMode !== 'split' ? (
        /* ========================================================================= */
        /* VUE PLEINE LARGEUR DE L'ARTICLE SÉLECTIONNÉ                              */
        /* ========================================================================= */
        <div className="space-y-5 rise">
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-line">
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="btn-ghost btn-sm -ms-2 text-muted hover:text-fg flex items-center gap-1.5"
            >
              <ArrowLeftIcon size={15} weight="bold" className="rtl:rotate-180" aria-hidden="true" />
              {t('scientificPanel.backToAll')}
            </button>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted font-mono">
                {t('scientificPanel.pageOf', { current: currentIndex + 1, total: visible.length })}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={!prevItem}
                  onClick={() => prevItem && setSelectedId(prevItem.id)}
                  className="btn-ghost btn-sm px-2 disabled:opacity-30 disabled:cursor-not-allowed"
                  title={t('scientificPanel.prevArticle')}
                >
                  <CaretLeftIcon size={16} className="rtl:rotate-180" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  disabled={!nextItem}
                  onClick={() => nextItem && setSelectedId(nextItem.id)}
                  className="btn-ghost btn-sm px-2 disabled:opacity-30 disabled:cursor-not-allowed"
                  title={t('scientificPanel.nextArticle')}
                >
                  <CaretRightIcon size={16} className="rtl:rotate-180" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>

          <div className="max-w-4xl">
            <SubmissionDetail
              key={current.id}
              submission={current}
              eventId={eventId}
              myId={myId}
              canManage={canManage}
              canDecide={canDecide}
              canReview={canReview(current)}
              frozen={frozen}
              atLimit={atLimit(current)}
              assignments={assignments}
              doubleBlind={doubleBlind}
              reviewerName={reviewerName}
              sessionTitle={sessionTitle}
              onUnassign={onUnassign}
              onBack={() => setSelectedId(null)}
              onRefresh={onRefresh}
            />
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* LISTE DES ARTICLES (BARRE D'OUTILS + VUE GRILLE / TABLEAU / SCINDÉE)      */
        /* ========================================================================= */
        <div className="space-y-4">
          {/* Rideau rétractable : Barème et critères d'évaluation */}
          <Collapsible
            title={t('scientificPanel.criteriaTitle')}
            subtitle={t('scientificPanel.criteriaSubtitle')}
            variant="subtle"
            defaultOpen={false}
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
              <div className="p-3 rounded-lg bg-surface border border-line">
                <span className="font-semibold text-fg block mb-1">{t('scientificPanel.criteria1Title')}</span>
                <p className="text-muted leading-relaxed">
                  {t('scientificPanel.criteria1Body')}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-surface border border-line">
                <span className="font-semibold text-fg block mb-1">{t('scientificPanel.criteria2Title')}</span>
                <p className="text-muted leading-relaxed">
                  {t('scientificPanel.criteria2Body')}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-surface border border-line">
                <span className="font-semibold text-fg block mb-1">{t('scientificPanel.criteria3Title')}</span>
                <p className="text-muted leading-relaxed">
                  {t('scientificPanel.criteria3Body')}
                </p>
              </div>
            </div>
          </Collapsible>

          {/* Barre d'outils : Filtres + Recherche + Commutateur de vue */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <Tabs
              variant="pill"
              wrap
              label={t('scientificPanel.filterLabel')}
              active={filter}
              onChange={(id) => {
                setFilter(id)
                setSelectedId(null)
              }}
              tabs={filters.map((f) => ({ ...f, badge: countOf(f.id) || null }))}
            />

            <div className="flex items-center gap-2.5">
              <label className="relative flex-1 sm:w-64">
                <span className="sr-only">{t('scientificPanel.searchSrOnly')}</span>
                <MagnifyingGlassIcon
                  size={15}
                  className="absolute start-3.5 top-1/2 -translate-y-1/2 text-faint pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  className="input-field ps-9.5 text-xs sm:text-sm py-1.5"
                  placeholder={t('scientificPanel.searchPlaceholder')}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>

              {/* Commutateur de vue : Grille / Tableau / Scindé */}
              <div className="flex items-center rounded-xl border border-line bg-surface/80 p-0.5 shrink-0" aria-label={t('scientificPanel.viewModeAria')}>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  aria-label={t('scientificPanel.viewGridAria')}
                  className={`p-1.5 rounded-lg transition-colors ${
                    viewMode === 'grid' ? 'bg-surface text-fg shadow-xs ring-1 ring-line' : 'text-muted hover:text-fg'
                  }`}
                  title={t('scientificPanel.viewGridTitle')}
                >
                  <SquaresFourIcon size={17} weight={viewMode === 'grid' ? 'fill' : 'regular'} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  aria-label={t('scientificPanel.viewTableAria')}
                  className={`p-1.5 rounded-lg transition-colors ${
                    viewMode === 'table' ? 'bg-surface text-fg shadow-xs ring-1 ring-line' : 'text-muted hover:text-fg'
                  }`}
                  title={t('scientificPanel.viewTableTitle')}
                >
                  <TableIcon size={17} weight={viewMode === 'table' ? 'fill' : 'regular'} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('split')}
                  aria-label={t('scientificPanel.viewSplitAria')}
                  className={`p-1.5 rounded-lg transition-colors ${
                    viewMode === 'split' ? 'bg-surface text-fg shadow-xs ring-1 ring-line' : 'text-muted hover:text-fg'
                  }`}
                  title={t('scientificPanel.viewSplitTitle')}
                >
                  <ColumnsIcon size={17} weight={viewMode === 'split' ? 'fill' : 'regular'} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('matrix')}
                  aria-label={t('scientificPanel.viewMatrixAria')}
                  className={`p-1.5 rounded-lg transition-colors ${
                    viewMode === 'matrix' ? 'bg-surface text-fg shadow-xs ring-1 ring-line' : 'text-muted hover:text-fg'
                  }`}
                  title={t('scientificPanel.viewMatrixTitle')}
                >
                  <KanbanIcon size={17} weight={viewMode === 'matrix' ? 'fill' : 'regular'} aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>

          {visible.length === 0 ? (
            <EmptyState compact title={t('scientificPanel.noResultsTitle')} body={t('scientificPanel.noResultsBody')} />
          ) : viewMode === 'grid' ? (
            /* --- 1. VUE GRILLE HORIZONTALE DE CARTES (GOATED CARDS) --- */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 rise">
              {visible.map((s) => (
                <SubmissionCard
                  key={s.id}
                  s={s}
                  isMine={s.author_id === myId}
                  showReviews={showReviews}
                  showAssignments={canManage}
                  assignments={assignments}
                  onUnassign={onUnassign}
                  todo={todoOf(s)}
                  doubleBlind={doubleBlind}
                  onSelect={setSelectedId}
                />
              ))}
            </div>
          ) : viewMode === 'table' ? (
            /* --- 2. VUE TABLEAU PLEINE LARGEUR (DATA TABLE SAAS) --- */
            <div className="rise">
              <SubmissionTable
                list={visible}
                myId={myId}
                showReviews={showReviews}
                todoOf={todoOf}
                doubleBlind={doubleBlind}
                onSelect={setSelectedId}
              />
            </div>
          ) : viewMode === 'matrix' ? (
            /* --- 3. VUE MATRICE D'ARBITRAGE & CONSENSUS (DECISION KANBAN) --- */
            <div className="rise">
              <ConsensusMatrix
                submissions={visible}
                doubleBlind={doubleBlind}
                onSelect={setSelectedId}
              />
            </div>
          ) : (
            /* --- 4. VUE SCINDÉE CLASSIQUE (SPLIT COLUMNS) --- */
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(300px,360px)_minmax(0,1fr)] gap-6 items-start rise">
              <ul className="space-y-2 lg:max-h-[calc(100dvh-220px)] lg:overflow-y-auto lg:pe-1">
                {visible.map((s) => (
                  <li key={s.id}>
                    <SubmissionRow
                      s={s}
                      active={current?.id === s.id}
                      isMine={s.author_id === myId}
                      showReviews={showReviews}
                      showAssignments={canManage}
                      assignments={assignments}
                      onUnassign={onUnassign}
                      todo={todoOf(s)}
                      doubleBlind={doubleBlind}
                      onSelect={setSelectedId}
                    />
                  </li>
                ))}
              </ul>

              <div className="lg:sticky lg:top-24 min-w-0">
                {current ? (
                  <SubmissionDetail
                    key={current.id}
                    submission={current}
                    eventId={eventId}
                    myId={myId}
                    canManage={canManage}
                    canDecide={canDecide}
                    canReview={canReview(current)}
                    frozen={frozen}
                    atLimit={atLimit(current)}
                    assignments={assignments}
                    doubleBlind={doubleBlind}
                    reviewerName={reviewerName}
                    sessionTitle={sessionTitle}
                    onUnassign={onUnassign}
                    onBack={() => setSelectedId(null)}
                    onRefresh={onRefresh}
                  />
                ) : (
                  <EmptyState compact icon={ArticleIcon} title={t('scientificPanel.selectPromptTitle')} body={t('scientificPanel.selectPromptBody')} />
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
