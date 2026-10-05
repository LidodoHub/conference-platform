import { useState, useEffect } from 'react'
import { PlusIcon, XIcon, ArticleIcon, LockSimpleIcon, MagnifyingGlassIcon, ChatCircleTextIcon } from '@phosphor-icons/react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../lib/auth'
import { SUBMISSION_COLOR, MAX_ACCEPTED_PER_AUTHOR, formatDate } from '../../lib/constants'
import SubmissionForm from './SubmissionForm'
import SubmissionDetail, { Stars } from './SubmissionDetail'
import Tabs from '../../components/ui/Tabs'
import EmptyState from '../../components/ui/EmptyState'
import { sentReviews, averageScore, statusLabel } from './submissionUtils'

const FILTERS = [
  { id: 'all', label: 'Tous' },
  { id: 'submitted', label: 'En attente' },
  { id: 'revision_requested', label: 'Révision' },
  { id: 'accepted', label: 'Acceptés' },
  { id: 'rejected', label: 'Rejetés' },
]

// Ligne compacte d'un article dans la liste de gauche.
function SubmissionRow({ s, active, isMine, showReviews, todo, onSelect }) {
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
          {isMine ? 'Mon article' : s.profiles?.full_name || 'Auteur'}
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

export default function ScientificPanel({ eventId, submissions, participants, isOrganizer, isReviewer, isAdmin, frozen = false, onRefresh }) {
  const myId = useAuth().user?.id ?? null
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState(null)
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
  // un reviewer ne relit ni ses propres articles, ni deux fois le même
  const canReview = (s) => isReviewer && !frozen && s.status === 'submitted' && s.author_id !== myId && !myReviewed(s)
  const atLimit = (s) => submissions.filter((x) => x.author_id === s.author_id && x.status === 'accepted').length >= MAX_ACCEPTED_PER_AUTHOR

  // ce qui attend une action de ma part
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
    .sort((a, b) => Number(Boolean(todoOf(b))) - Number(Boolean(todoOf(a))) || new Date(b.submitted_at) - new Date(a.submitted_at))

  const current = visible.find((s) => s.id === selectedId) || (selectedId ? null : visible[0]) || null
  const showReviews = canManage

  const description = canManage
    ? 'Ouvre un article, lis les avis des reviewers et décide.'
    : isReviewer
      ? 'Ouvre un article en attente pour le noter et le commenter. Ton commentaire est transmis anonymement.'
      : 'Dépose tes articles et suis leur évaluation.'

  return (
    <section>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-fg flex items-baseline gap-2">
            Articles
            <span className="num font-mono text-sm font-normal text-faint">{submissions.length}</span>
          </h2>
          <p className="text-sm text-muted mt-1 max-w-[60ch]">{description}</p>
        </div>
        {!frozen &&
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
          ))}
      </div>

      {frozen && (
        <div className="alert-info mb-5 flex items-start gap-2.5">
          <LockSimpleIcon size={18} className="shrink-0 mt-px" aria-hidden="true" />
          Phase scientifique close : les dépôts, les reviews et les décisions sont gelés.
        </div>
      )}

      {showForm && !frozen && (
        <div className="mb-8 max-w-3xl">
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
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(300px,380px)_minmax(0,1fr)] gap-6 items-start">
          {/* Liste */}
          <div className={selectedId ? 'hidden lg:block' : ''}>
            <div className="space-y-3 mb-4">
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
              <label className="relative block">
                <span className="sr-only">Rechercher un article</span>
                <MagnifyingGlassIcon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint pointer-events-none" aria-hidden="true" />
                <input
                  type="search"
                  className="input-field pl-10"
                  placeholder="Titre, auteur, mot du résumé…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
            </div>

            {visible.length === 0 ? (
              <EmptyState compact title="Aucun article ici" body="Change de filtre ou de recherche." />
            ) : (
              <ul className="space-y-2 lg:max-h-[calc(100dvh-220px)] lg:overflow-y-auto lg:pr-1 lg:-mr-1">
                {visible.map((s) => (
                  <li key={s.id}>
                    <SubmissionRow
                      s={s}
                      active={current?.id === s.id}
                      isMine={s.author_id === myId}
                      showReviews={showReviews}
                      todo={todoOf(s)}
                      onSelect={setSelectedId}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Détail */}
          <div className={`${selectedId ? '' : 'hidden lg:block'} lg:sticky lg:top-36 min-w-0`}>
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
              <EmptyState compact icon={ArticleIcon} title="Choisis un article" body="Son contenu et ses avis s'afficheront ici." />
            )}
          </div>
        </div>
      )}
    </section>
  )
}
