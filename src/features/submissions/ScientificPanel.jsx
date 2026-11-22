import { useState, useEffect } from 'react'
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
import { SUBMISSION_COLOR, MAX_ACCEPTED_PER_AUTHOR, formatDate } from '../../lib/constants'
import SubmissionForm from './SubmissionForm'
import SubmissionDetail, { Stars } from './SubmissionDetail'
import Tabs from '../../components/ui/Tabs'
import EmptyState from '../../components/ui/EmptyState'
import Collapsible from '../../components/ui/Collapsible'
import { sentReviews, averageScore, statusLabel } from './submissionUtils'
import { DownloadSimpleIcon, EyeSlashIcon } from '@phosphor-icons/react'

const FILTERS = [
  { id: 'all', label: 'Tous' },
  { id: 'submitted', label: 'En attente' },
  { id: 'revision_requested', label: 'Révision' },
  { id: 'accepted', label: 'Acceptés' },
  { id: 'rejected', label: 'Rejetés' },
]

// Ligne compacte pour la vue scindée
function SubmissionRow({ s, active, isMine, showReviews, todo, doubleBlind, onSelect }) {
  const color = SUBMISSION_COLOR[s.status] || 'var(--color-st-neutral)'
  const reviews = sentReviews(s)
  const avg = averageScore(s)
  return (
    <button
      type="button"
      onClick={() => onSelect(s.id)}
      aria-current={active ? 'true' : undefined}
      className={`relative w-full text-left rounded-xl border px-4 py-3.5 transition-[background-color,border-color,box-shadow] duration-200 ${
        active
          ? 'bg-surface border-accent/60 shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-accent)_18%,transparent)]'
          : 'bg-surface/60 border-line hover:bg-surface hover:border-fg/20'
      }`}
    >
      <span className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full" style={{ background: color }} aria-hidden="true" />
      <span className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium" style={{ color }}>
          {statusLabel(s)}
        </span>
        {todo && <span className="text-[11px] font-medium rounded-full px-2 py-0.5 bg-accent/15 text-accent-ink">{todo}</span>}
      </span>
      <span className="block mt-1 text-[15px] font-medium leading-snug text-fg line-clamp-2">{s.title}</span>
      <span className="mt-2 flex items-center justify-between gap-3 text-[12.5px] text-muted">
        <span className="truncate">
          {doubleBlind && !isMine ? 'Auteur anonymisé (Double aveugle)' : isMine ? 'Mon article' : s.profiles?.full_name || 'Auteur'}
          <span className="text-faint num">, {formatDate(s.submitted_at, { day: 'numeric', month: 'short' })}</span>
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
    </button>
  )
}

// Carte horizontale aérée pour la vue grille
function SubmissionCard({ s, isMine, showReviews, todo, doubleBlind, onSelect }) {
  const color = SUBMISSION_COLOR[s.status] || 'var(--color-st-neutral)'
  const reviews = sentReviews(s)
  const avg = averageScore(s)

  return (
    <div
      onClick={() => onSelect(s.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect(s.id)}
      className="card p-5 sm:p-6 border-line bg-surface/60 hover:bg-surface hover:border-accent/60 hover:shadow-md transition-all text-left flex flex-col justify-between group cursor-pointer relative overflow-hidden"
    >
      <span
        className="absolute left-0 top-0 bottom-0 w-1.5"
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
            {statusLabel(s)}
          </span>
          {todo && (
            <span className="text-[11px] font-semibold rounded-full px-2.5 py-0.5 bg-accent/20 text-accent-ink">
              {todo}
            </span>
          )}
        </div>

        <h3 className="font-semibold text-fg text-base sm:text-lg leading-snug group-hover:text-accent-ink transition-colors line-clamp-2">
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
          <span className="font-medium text-fg">{doubleBlind && !isMine ? 'Auteur anonymisé (Double aveugle)' : isMine ? 'Mon article' : s.profiles?.full_name || 'Auteur anonyme'}</span>
          <span className="text-faint num"> • {formatDate(s.submitted_at, { day: 'numeric', month: 'short' })}</span>
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
    </div>
  )
}

// Tableau haute précision pour la vue table
function SubmissionTable({ list, myId, showReviews, todoOf, doubleBlind, onSelect }) {
  return (
    <div className="card overflow-hidden border-line">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead className="bg-surface border-b border-line text-faint text-[11px] uppercase tracking-wider font-semibold">
            <tr>
              <th scope="col" className="px-4 py-3">Statut</th>
              <th scope="col" className="px-4 py-3">Titre & Auteur</th>
              <th scope="col" className="px-4 py-3">Date</th>
              {showReviews && <th scope="col" className="px-4 py-3">Évaluation</th>}
              <th scope="col" className="px-4 py-3 text-right">Action</th>
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
                      {statusLabel(s)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 min-w-[260px] max-w-md">
                    <span className="font-semibold text-fg block truncate group-hover:text-accent-ink transition-colors">
                      {s.title}
                    </span>
                    <span className="text-xs text-muted block truncate mt-0.5">
                      {doubleBlind && !isMine ? 'Auteur anonymisé (Double aveugle)' : isMine ? 'Mon article' : s.profiles?.full_name || 'Auteur anonyme'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap text-xs text-muted num">
                    {formatDate(s.submitted_at, { day: 'numeric', month: 'short' })}
                  </td>
                  {showReviews && (
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {reviews.length > 0 ? (
                        <div className="flex items-center gap-1.5">
                          {avg != null && <Stars value={avg} size={11} />}
                          <span className="text-xs font-mono text-muted">({reviews.length})</span>
                        </div>
                      ) : (
                        <span className="text-faint text-xs">Aucune review</span>
                      )}
                    </td>
                  )}
                  <td className="px-4 py-3.5 text-right whitespace-nowrap">
                    {todo ? (
                      <span className="text-xs font-semibold rounded-full px-2.5 py-1 bg-accent/20 text-accent-ink">
                        {todo}
                      </span>
                    ) : (
                      <span className="text-xs text-faint group-hover:text-fg font-medium inline-flex items-center gap-1">
                        Consulter
                        <ArrowRightIcon size={12} weight="bold" aria-hidden="true" />
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

function ConsensusMatrix({ submissions, doubleBlind, myId, onSelect }) {
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
      title: 'Consensus Favorable',
      badge: 'Prêts à accepter',
      headerCls: 'border-ok/30 bg-ok/10 text-ok',
      items: submissions.filter((s) => {
        const avg = averageScore(s)
        const disp = getDisparity(s)
        return s.status === 'accepted' || (s.status === 'submitted' && avg != null && avg >= 3.8 && disp < 1.5)
      }),
    },
    {
      id: 'litige',
      title: 'Litiges & Écarts',
      badge: 'Arbitrage prioritaire',
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
      title: 'Révisions requises',
      badge: 'Réserves & Retouches',
      headerCls: 'border-info/30 bg-info/10 text-info',
      items: submissions.filter((s) => {
        const avg = averageScore(s)
        const disp = getDisparity(s)
        return s.status === 'revision_requested' || (s.status === 'submitted' && avg != null && avg >= 2.5 && avg < 3.8 && disp < 1.5)
      }),
    },
    {
      id: 'defavorable',
      title: 'Défavorable / Rejet',
      badge: 'Score insuffisant',
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
                <span className="text-xs text-muted">Aucun article dans cette catégorie</span>
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
                      className="card p-3.5 bg-surface border-line/80 hover:border-accent hover:shadow-md transition-all cursor-pointer space-y-2.5 group text-left"
                    >
                      <h4 className="text-xs font-semibold text-fg line-clamp-2 leading-snug group-hover:text-accent-ink transition-colors">
                        {s.title}
                      </h4>

                      <div className="flex items-center justify-between text-[11px] text-muted">
                        <span className="truncate max-w-[130px]">
                          {doubleBlind && s.author_id !== myId ? 'Auteur anonyme' : s.profiles?.full_name || 'Auteur'}
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
                          <span>Avis divergents</span>
                          <span className="num">Écart: {disp.toFixed(1)} pts</span>
                        </div>
                      )}

                      <div className="pt-2 border-t border-line/50 flex items-center justify-between text-[10.5px]">
                        <span className="text-muted num">
                          {revs.length} review{revs.length > 1 ? 's' : ''}
                        </span>
                        <span className="text-accent-ink font-semibold group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-0.5">
                          Arbitrer &rarr;
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
  isOrganizer,
  isReviewer,
  isAdmin,
  frozen = false,
  onRefresh,
}) {
  const myId = useAuth().user?.id ?? null
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [doubleBlind, setDoubleBlind] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [viewMode, setViewMode] = useState('grid') // 'grid' | 'table' | 'split'
  const [sessions, setSessions] = useState([])

  useEffect(() => {
    supabase
      .from('sessions')
      .select('id, title')
      .eq('event_id', eventId)
      .then(({ data }) => setSessions(data || []))
  }, [eventId])

  const canManage = isOrganizer || isAdmin
  const canDecide = canManage && !frozen
  const sessionTitle = (id) => sessions.find((x) => x.id === id)?.title
  const reviewerName = (id) => participants.find((p) => p.user_id === id)?.profiles?.full_name || 'Reviewer'
  const myReviewed = (s) => sentReviews(s).some((r) => r.reviewer_id === myId)
  const canReview = (s) => isReviewer && !frozen && s.status === 'submitted' && s.author_id !== myId && !myReviewed(s)
  const atLimit = (s) =>
    submissions.filter((x) => x.author_id === s.author_id && x.status === 'accepted').length >=
    MAX_ACCEPTED_PER_AUTHOR

  const todoOf = (s) => {
    if (canDecide && s.status === 'submitted') return sentReviews(s).length ? 'À décider' : 'Sans review'
    if (canReview(s)) return 'À relire'
    if (s.author_id === myId && s.status === 'revision_requested' && !frozen) return 'À corriger'
    return null
  }

  const q = query.trim().toLowerCase()
  const countOf = (id) => (id === 'all' ? submissions.length : submissions.filter((s) => s.status === id).length)
  const visible = submissions
    .filter((s) => filter === 'all' || s.status === filter)
    .filter((s) => !q || [s.title, s.abstract, s.profiles?.full_name].some((v) => (v || '').toLowerCase().includes(q)))
    .slice()
    .sort(
      (a, b) =>
        Number(Boolean(todoOf(b))) - Number(Boolean(todoOf(a))) ||
        new Date(b.submitted_at) - new Date(a.submitted_at),
    )

  const current = visible.find((s) => s.id === selectedId) || (viewMode === 'split' ? visible[0] : null) || null
  const showReviews = canManage

  const currentIndex = current ? visible.findIndex((s) => s.id === current.id) : -1
  const prevItem = currentIndex > 0 ? visible[currentIndex - 1] : null
  const nextItem = currentIndex !== -1 && currentIndex < visible.length - 1 ? visible[currentIndex + 1] : null

  const description = canManage
    ? 'Examinez les articles déposés, consultez les évaluations scientifiques et prononcez les acceptations.'
    : isReviewer
      ? 'Ouvrez un article en attente pour le noter et le commenter de manière constructive.'
      : 'Déposez vos articles de recherche et suivez l’évaluation du comité scientifique.'

  return (
    <section className="space-y-6">
      {/* En-tête de section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-fg flex items-baseline gap-2">
            Articles scientifiques
            <span className="num font-mono text-sm font-normal text-faint">({submissions.length})</span>
          </h2>
          <p className="text-xs sm:text-sm text-muted mt-0.5 max-w-[65ch]">{description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canManage && submissions.some((s) => s.status === 'accepted') && (
            <button
              type="button"
              onClick={async () => {
                const { exportProceedingsPDF } = await import('../certificates/pdf')
                exportProceedingsPDF({ eventTitle: 'Actes de la Conférence', submissions })
              }}
              className="btn-outline btn-sm text-xs flex items-center gap-1.5"
              title="Télécharger le recueil officiel des résumés acceptés"
            >
              <DownloadSimpleIcon size={14} />
              <span>Actes de Conférence (PDF)</span>
            </button>
          )}

          {canManage && (
            <button
              type="button"
              onClick={() => setDoubleBlind((v) => !v)}
              className={`text-xs px-2.5 py-1.5 rounded-xl border flex items-center gap-1.5 transition-colors ${
                doubleBlind
                  ? 'bg-accent/20 border-accent text-accent-ink font-semibold'
                  : 'border-line bg-surface/50 text-muted hover:text-fg'
              }`}
              title="Masquer les identités des auteurs pour une évaluation anonyme sans biais"
            >
              <EyeSlashIcon size={14} />
              <span>Double-Aveugle : {doubleBlind ? 'Actif' : 'Inactif'}</span>
            </button>
          )}

          {!frozen &&
            (showForm ? (
              <button type="button" onClick={() => setShowForm(false)} className="btn-ghost btn-sm">
                <XIcon size={16} aria-hidden="true" />
                Annuler
              </button>
            ) : (
              <button type="button" onClick={() => setShowForm(true)} className="btn-info btn-sm">
                <PlusIcon size={16} weight="bold" aria-hidden="true" />
                Soumettre un article
              </button>
            ))}
        </div>
      </div>

      {frozen && (
        <div className="alert-info flex items-start gap-2.5">
          <LockSimpleIcon size={18} className="shrink-0 mt-px" aria-hidden="true" />
          Phase scientifique close : les dépôts, les reviews et les décisions sont gelés.
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

      {submissions.length === 0 ? (
        <EmptyState
          icon={ArticleIcon}
          title="Aucun article pour le moment"
          body={frozen ? 'La phase scientifique est close.' : 'Les auteurs déposent ici le titre et le résumé de leur article.'}
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
              className="btn-ghost btn-sm -ml-2 text-muted hover:text-fg flex items-center gap-1.5"
            >
              <ArrowLeftIcon size={15} weight="bold" aria-hidden="true" />
              Retour à tous les articles
            </button>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted font-mono">
                {currentIndex + 1} sur {visible.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={!prevItem}
                  onClick={() => prevItem && setSelectedId(prevItem.id)}
                  className="btn-ghost btn-sm px-2 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Article précédent"
                >
                  <CaretLeftIcon size={16} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  disabled={!nextItem}
                  onClick={() => nextItem && setSelectedId(nextItem.id)}
                  className="btn-ghost btn-sm px-2 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Article suivant"
                >
                  <CaretRightIcon size={16} aria-hidden="true" />
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
              reviewerName={reviewerName}
              sessionTitle={sessionTitle}
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
            title="Critères d'évaluation & Processus d'arbitrage"
            subtitle="Barème 1-5 étoiles, double aveugle et consensus"
            variant="subtle"
            defaultOpen={false}
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
              <div className="p-3 rounded-lg bg-surface border border-line">
                <span className="font-semibold text-fg block mb-1">1. Notation sur 5 étoiles</span>
                <p className="text-muted leading-relaxed">
                  Originalité de la contribution, rigueur de la méthode et clarté de la rédaction scientifique.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-surface border border-line">
                <span className="font-semibold text-fg block mb-1">2. Arbitrage & Consensus</span>
                <p className="text-muted leading-relaxed">
                  Décision basée sur au moins deux avis d'experts. En cas de litige, le président du comité tranche.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-surface border border-line">
                <span className="font-semibold text-fg block mb-1">3. Intégrité & Double aveugle</span>
                <p className="text-muted leading-relaxed">
                  Les relectures sont effectuées sans révéler l'identité des auteurs ni celle des évaluateurs.
                </p>
              </div>
            </div>
          </Collapsible>

          {/* Barre d'outils : Filtres + Recherche + Commutateur de vue */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <Tabs
              variant="pill"
              wrap
              label="Filtrer par statut"
              active={filter}
              onChange={(id) => {
                setFilter(id)
                setSelectedId(null)
              }}
              tabs={FILTERS.map((f) => ({ ...f, badge: countOf(f.id) || null }))}
            />

            <div className="flex items-center gap-2.5">
              <label className="relative flex-1 sm:w-64">
                <span className="sr-only">Rechercher un article</span>
                <MagnifyingGlassIcon
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  className="input-field pl-9.5 text-xs sm:text-sm py-1.5"
                  placeholder="Titre, auteur, mot clé…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>

              {/* Commutateur de vue : Grille / Tableau / Scindé */}
              <div className="flex items-center rounded-xl border border-line bg-surface/80 p-0.5 shrink-0" aria-label="Format d'affichage">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  aria-label="Affichage en cartes"
                  className={`p-1.5 rounded-lg transition-colors ${
                    viewMode === 'grid' ? 'bg-accent/20 text-accent-ink shadow-xs' : 'text-muted hover:text-fg'
                  }`}
                  title="Affichage en cartes (Grille)"
                >
                  <SquaresFourIcon size={17} weight={viewMode === 'grid' ? 'fill' : 'regular'} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  aria-label="Affichage en tableau"
                  className={`p-1.5 rounded-lg transition-colors ${
                    viewMode === 'table' ? 'bg-accent/20 text-accent-ink shadow-xs' : 'text-muted hover:text-fg'
                  }`}
                  title="Affichage en tableau professionnel"
                >
                  <TableIcon size={17} weight={viewMode === 'table' ? 'fill' : 'regular'} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('split')}
                  aria-label="Affichage scindé"
                  className={`p-1.5 rounded-lg transition-colors ${
                    viewMode === 'split' ? 'bg-accent/20 text-accent-ink shadow-xs' : 'text-muted hover:text-fg'
                  }`}
                  title="Affichage scindé (liste et détail côte à côte)"
                >
                  <ColumnsIcon size={17} weight={viewMode === 'split' ? 'fill' : 'regular'} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('matrix')}
                  aria-label="Matrice d'arbitrage"
                  className={`p-1.5 rounded-lg transition-colors ${
                    viewMode === 'matrix' ? 'bg-accent/20 text-accent-ink shadow-xs' : 'text-muted hover:text-fg'
                  }`}
                  title="Matrice d'arbitrage & Consensus (Kanban décisionnel)"
                >
                  <KanbanIcon size={17} weight={viewMode === 'matrix' ? 'fill' : 'regular'} aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>

          {visible.length === 0 ? (
            <EmptyState compact title="Aucun article trouvé" body="Modifiez vos critères de recherche ou de filtre." />
          ) : viewMode === 'grid' ? (
            /* --- 1. VUE GRILLE HORIZONTALE DE CARTES (GOATED CARDS) --- */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 rise">
              {visible.map((s) => (
                <SubmissionCard
                  key={s.id}
                  s={s}
                  isMine={s.author_id === myId}
                  showReviews={showReviews}
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
                myId={myId}
                onSelect={setSelectedId}
              />
            </div>
          ) : (
            /* --- 4. VUE SCINDÉE CLASSIQUE (SPLIT COLUMNS) --- */
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(300px,360px)_minmax(0,1fr)] gap-6 items-start rise">
              <ul className="space-y-2 lg:max-h-[calc(100dvh-220px)] lg:overflow-y-auto lg:pr-1">
                {visible.map((s) => (
                  <li key={s.id}>
                    <SubmissionRow
                      s={s}
                      active={current?.id === s.id}
                      isMine={s.author_id === myId}
                      showReviews={showReviews}
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
                    reviewerName={reviewerName}
                    sessionTitle={sessionTitle}
                    onBack={() => setSelectedId(null)}
                    onRefresh={onRefresh}
                  />
                ) : (
                  <EmptyState compact icon={ArticleIcon} title="Sélectionnez un article" body="Son contenu et ses évaluations s'afficheront ici." />
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
