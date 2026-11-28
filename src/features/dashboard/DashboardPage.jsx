import { useState, useEffect, useCallback, useRef } from 'react'
import {
  ArticleIcon,
  ArrowRightIcon,
  CalendarBlankIcon,
  CaretLeftIcon,
  CaretRightIcon,
  MapPinIcon,
  QrCodeIcon,
  ShieldCheckIcon,
  PlusIcon,
  XIcon,
} from '@phosphor-icons/react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../lib/auth'
import { useLanguage } from '../../context/LanguageContext'
import { usePendingCounts } from '../../context/PendingCountsContext'
import { useUrlQueryState } from '../../hooks/useUrlQueryState'
import { frError } from '../../lib/errors'
import {
  SUBMISSION_LABELS,
  REVISION_LABELS,
  ROLE_LABELS,
  STATUS_LABELS,
  PHASE_LABELS,
  TYPE_LABELS,
  formatDate,
  HERO_PHOTO,
} from '../../lib/constants'
import SectionTitle from '../../components/ui/SectionTitle'
import EventCover from '../../components/ui/EventCover'
import { coverStyle, cleanDescription } from '../../lib/cover'
import EmptyState from '../../components/ui/EmptyState'
import EventForm from '../events/EventForm'

const localToday = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Décompte précis : "J-12", "Jour J", "En cours" ou "Terminé" (jamais de compte négatif)
const countdown = (ev) => {
  if (!ev?.start_date) return 'À venir'
  const today = localToday()
  if (ev.start_date <= today && today <= (ev.end_date || ev.start_date)) {
    return ev.start_date === today ? 'Jour J' : 'En cours'
  }
  const daysLeft = Math.round((new Date(`${ev.start_date}T00:00:00`) - new Date(`${today}T00:00:00`)) / 86400000)
  if (daysLeft > 0) return `J-${daysLeft}`
  if (daysLeft === 0) return 'Jour J'
  return ev.status === 'ongoing' ? 'En cours' : 'Terminé'
}

// Construit la liste "À faire" avec typage d'urgence et catégories pour une clarté maximale
function buildTodos({ parts, subs, orgPending, orgPayments, toReview, pendingApprovals, isAdmin, t }) {
  const todos = []
  const titleOf = (id) => parts.find((p) => p.event_id === id)?.events?.title || t('workspace.eventFallback')

  if (isAdmin && pendingApprovals > 0) {
    todos.push({
      key: 'admin',
      category: t('workspace.adminValidation'),
      dotClass: 'bg-warn',
      title: t(pendingApprovals > 1 ? 'workspace.eventsPendingApprovalPlural' : 'workspace.eventsPendingApprovalSingle', {
        count: pendingApprovals,
      }),
      detail: t('workspace.adminPanel'),
      target: { view: 'admin' },
    })
  }

  // organisateur
  const byEvent = (rows) =>
    rows.reduce((acc, r) => {
      acc[r.event_id] = (acc[r.event_id] || 0) + 1
      return acc
    }, {})
  Object.entries(byEvent(orgPayments)).forEach(([eventId, n]) =>
    todos.push({
      key: `pay-${eventId}`,
      category: t('workspace.paymentValidation'),
      dotClass: 'bg-warn',
      title: t(n > 1 ? 'workspace.paymentsToValidatePlural' : 'workspace.paymentsToValidateSingle', { count: n }),
      detail: titleOf(eventId),
      target: { eventId, tab: 'organization', orgTab: 'registrations' },
    }),
  )
  Object.entries(byEvent(orgPending)).forEach(([eventId, n]) =>
    todos.push({
      key: `decide-${eventId}`,
      category: t('workspace.scientificCommittee'),
      dotClass: 'bg-accent',
      title: t(n > 1 ? 'workspace.papersToDecidePlural' : 'workspace.papersToDecideSingle', { count: n }),
      detail: titleOf(eventId),
      target: { eventId, tab: 'scientific' },
    }),
  )
  parts
    .filter((p) => p.role_in_event === 'organizer' && p.events?.status === 'draft')
    .forEach((p) =>
      todos.push({
        key: `draft-${p.event_id}`,
        category: t('workspace.organization'),
        dotClass: 'bg-fg/40',
        title: t('workspace.draftToComplete'),
        detail: p.events.title,
        target: { eventId: p.event_id, tab: 'overview' },
      }),
    )

  // reviewer
  Object.entries(byEvent(toReview)).forEach(([eventId, n]) =>
    todos.push({
      key: `review-${eventId}`,
      category: t('workspace.peerReview'),
      dotClass: 'bg-accent',
      title: t(n > 1 ? 'workspace.papersToReviewPlural' : 'workspace.papersToReviewSingle', { count: n }),
      detail: titleOf(eventId),
      target: { eventId, tab: 'scientific' },
    }),
  )

  // auteur
  subs
    .filter((s) => s.status === 'revision_requested' && s.events?.phase === 'scientific')
    .forEach((s) =>
      todos.push({
        key: `revision-${s.id}`,
        category: t('workspace.authorActionRequired'),
        dotClass: 'bg-warn',
        title: t('workspace.revisionRequestedOnPaper', { title: s.title }),
        detail: s.events.title,
        target: { eventId: s.event_id, tab: 'scientific' },
      }),
    )
  parts
    .filter((p) => p.role_in_event === 'participant' && p.registration_status === 'invited')
    .forEach((p) =>
      todos.push({
        key: `invited-${p.event_id}`,
        category: t('workspace.invitation'),
        dotClass: 'bg-warn',
        title: t('workspace.invitedParticipant'),
        detail: p.events.title,
        target: { eventId: p.event_id, tab: 'overview' },
      }),
    )

  return todos
}

let cachedDashboard = null

export default function DashboardPage({ onOpenEvent, onNavigateAdmin }) {
  const { user, profile, isAdmin } = useAuth()
  const { isRtl, locale, t } = useLanguage()
  const { pendingCount, publicEventsCount, setPendingCount } = usePendingCounts()
  const hasUserCache = cachedDashboard?.userId === user.id
  const [data, setData] = useState(hasUserCache ? cachedDashboard.data : null)
  const [publicEvents, setPublicEvents] = useState(hasUserCache ? cachedDashboard.publicEvents : [])
  const [error, setError] = useState(null)

  const load = useCallback(async (isCancelled = () => false) => {
    const [partsRes, subsRes, pubEventsRes] = await Promise.all([
      supabase
        .from('event_participants')
        .select('event_id, role_in_event, registration_status, events(id, title, status, phase, start_date, end_date, location, type, format)')
        .eq('user_id', user.id),
      supabase
        .from('submissions')
        .select('id, title, status, submitted_at, event_id, events(id, title, phase), decisions(status, revision_type, decided_at)')
        .eq('author_id', user.id)
        .order('submitted_at', { ascending: false }),
      supabase
        .from('events')
        .select('id, title, description, type, format, status, phase, start_date, end_date, location')
        .in('status', ['published', 'ongoing'])
        .order('start_date', { ascending: true }),
    ])

    if (partsRes.error || subsRes.error) {
      setError(frError(partsRes.error || subsRes.error))
      return
    }

    const parts = partsRes.data.filter((p) => p.events)
    const orgIds = parts.filter((p) => p.role_in_event === 'organizer').map((p) => p.event_id)
    const revIds = parts
      .filter((p) => p.role_in_event === 'reviewer' && p.events.phase === 'scientific')
      .map((p) => p.event_id)

    const empty = Promise.resolve({ data: [] })
    const [pendingRes, paymentsRes, reviewRes, approvalsRes] = await Promise.all([
      orgIds.length
        ? supabase.from('submissions').select('id, event_id').in('event_id', orgIds).eq('status', 'submitted')
        : empty,
      orgIds.length
        ? supabase
            .from('event_participants')
            .select('id, event_id')
            .in('event_id', orgIds)
            .eq('registration_status', 'payment_submitted')
        : empty,
      revIds.length
        ? supabase
            .from('submissions')
            .select('id, event_id, author_id, reviews(reviewer_id)')
            .in('event_id', revIds)
            .eq('status', 'submitted')
        : empty,
      isAdmin
        ? supabase.from('events').select('id', { count: 'exact', head: true }).eq('status', 'pending_approval')
        : Promise.resolve({ count: 0 }),
    ])

    const toReview = (reviewRes.data || []).filter(
      (s) => s.author_id !== user.id && !(s.reviews || []).some((r) => r.reviewer_id === user.id),
    )

    if (isCancelled()) return

    const payloadData = {
      userId: user.id,
      parts,
      subs: subsRes.data || [],
      orgPending: pendingRes.data || [],
      orgPayments: paymentsRes.data || [],
      toReview,
      pendingApprovals: approvalsRes.count || 0,
    }
    const payloadEvents = pubEventsRes.data || []
    cachedDashboard = { userId: user.id, data: payloadData, publicEvents: payloadEvents }

    setData(payloadData)
    setPublicEvents(payloadEvents)
  }, [user.id, isAdmin])

  useEffect(() => {
    let cancelled = false
    load(() => cancelled)
    return () => {
      cancelled = true
    }
  }, [load])

  const rawFirstName = (profile?.full_name || '').trim().split(/\s+/)[0]
  const firstName = rawFirstName ? rawFirstName.charAt(0).toUpperCase() + rawFirstName.slice(1) : ''
  const todayLabel = new Date().toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })
  const activeData = data?.userId === user.id ? data : null
  const todos = activeData ? buildTodos({ ...activeData, isAdmin, t }) : []
  const effectivePendingCount = activeData ? todos.length : pendingCount
  const effectivePublicCount = activeData ? publicEvents.length : (publicEventsCount ?? publicEvents.length)

  useEffect(() => {
    if (activeData) {
      setPendingCount(todos.length)
    }
  }, [activeData, todos.length, setPendingCount])

  const open = (target) => {
    if (target.view === 'admin') onNavigateAdmin()
    else onOpenEvent(target.eventId, target)
  }

  const statusOf = (s) => {
    if (s.status === 'revision_requested') {
      const last = [...(s.decisions || [])]
        .filter((d) => d.status === 'revision_requested')
        .sort((a, b) => new Date(b.decided_at) - new Date(a.decided_at))[0]
      if (last?.revision_type) return REVISION_LABELS[last.revision_type]
      return t('submissions.revisionRequested')
    }
    const subKey = `submissions.${s.status}`
    const translated = t(subKey)
    return translated !== subKey ? translated : (SUBMISSION_LABELS[s.status] || s.status)
  }

  const acceptedCount = data?.subs.filter((x) => x.status === 'accepted').length || 0

  const [searchParams, setSearchParams] = useUrlQueryState()
  const rawTab = searchParams.get('tab')
  const isMyspaceUrl = rawTab === 'conferences' || rawTab === 'submissions' || rawTab === 'passes'
  const activeMainTab = isMyspaceUrl ? 'myspace' : 'discover'
  const myspaceTab = rawTab === 'submissions' ? 'submissions' : rawTab === 'passes' ? 'badges' : 'conferences'

  const setActiveMainTab = useCallback(
    (nextMain) => {
      setSearchParams((prev) => {
        if (nextMain === 'myspace') {
          prev.set('tab', 'conferences')
        } else {
          prev.delete('tab')
        }
        return prev
      })
    },
    [setSearchParams],
  )

  const setMyspaceTab = useCallback(
    (nextSub) => {
      const urlTab = nextSub === 'badges' ? 'passes' : nextSub
      setSearchParams((prev) => {
        prev.set('tab', urlTab)
        return prev
      })
    },
    [setSearchParams],
  )
  const [showAllTodos, setShowAllTodos] = useState(false)
  const [viewMode, setViewMode] = useState('grid')
  const [filterChip, setFilterChip] = useState('all')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createError, setCreateError] = useState(null)

  const createEvent = async (values) => {
    setCreateError(null)
    const { data: newEv, error: err } = await supabase
      .from('events')
      .insert({ ...values, organizer_id: user.id, status: 'draft' })
      .select('id')
      .single()
    if (err) {
      setCreateError(frError(err))
      return
    }
    setShowCreateForm(false)
    onOpenEvent(newEv.id)
  }

  const railRef = useRef(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const featuredRailEvents = [...publicEvents].sort((a, b) => {
    const rank = (ev) => (ev.status === 'ongoing' ? 0 : ev.phase === 'scientific' ? 1 : 2)
    return rank(a) - rank(b)
  })

  const updateRailArrows = useCallback(() => {
    const el = railRef.current
    if (!el) return
    const offset = Math.abs(el.scrollLeft)
    setCanScrollLeft(offset > 4)
    setCanScrollRight(offset + el.clientWidth < el.scrollWidth - 4)
  }, [])

  useEffect(() => {
    updateRailArrows()
    window.addEventListener('resize', updateRailArrows)
    return () => window.removeEventListener('resize', updateRailArrows)
  }, [updateRailArrows, featuredRailEvents.length, activeMainTab, isRtl])

  const scrollRail = (direction) => {
    const el = railRef.current
    if (!el) return
    const firstCard = el.firstElementChild
    const step = firstCard ? firstCard.getBoundingClientRect().width + 24 : el.clientWidth * 0.6
    const rtlFactor = isRtl ? -1 : 1
    el.scrollBy({ left: direction * rtlFactor * step, behavior: 'smooth' })
  }

  const extractTopics = (ev) => {
    const raw = ev.tracks || ev.themes || ev.tags
    if (Array.isArray(raw)) return raw.filter(Boolean).slice(0, 3)
    if (typeof raw === 'string') return raw.split(',').map((t) => t.trim()).filter(Boolean).slice(0, 3)
    return []
  }

  const filteredEvents = publicEvents.filter((ev) => {
    if (filterChip === 'ongoing') return ev.status === 'ongoing'
    if (filterChip === 'scientific') return ev.phase === 'scientific'
    if (filterChip === 'active') return ev.status === 'ongoing' || ev.phase !== 'scientific'
    if (filterChip === 'usto') return (ev.location || '').toLowerCase().includes('usto')
    return true
  })
  const validatedParticipations = (data?.parts || []).filter((p) => p.registration_status === 'validated')

  const renderTabSwitcher = () => (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-line/60">
      <div className="inline-flex items-center bg-black/[0.04] dark:bg-[#222226] p-1 rounded-xl border border-black/[0.06] dark:border-white/[0.06] gap-1 max-w-full overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveMainTab('discover')}
          aria-selected={activeMainTab === 'discover'}
          className={`px-4 sm:px-5 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap shrink-0 transition-all duration-200 select-none ${
            activeMainTab === 'discover'
              ? 'bg-surface text-fg shadow-xs ring-1 ring-black/[0.04] dark:ring-white/[0.08]'
              : 'text-muted hover:text-fg hover:bg-black/[0.02] dark:hover:bg-[#222226]'
          }`}
        >
          <span>{t('dashboard.tabDiscover')}</span>
          <span className={`ms-2 text-xs font-mono font-medium px-2 py-0.5 rounded-full transition-colors ${
            activeMainTab === 'discover'
              ? 'bg-black/[0.06] dark:bg-[#18181B] text-fg'
              : 'text-faint'
          }`}>
            {effectivePublicCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab('myspace')}
          aria-selected={activeMainTab === 'myspace'}
          className={`px-4 sm:px-5 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap shrink-0 transition-all duration-200 select-none ${
            activeMainTab === 'myspace'
              ? 'bg-surface text-fg shadow-xs ring-1 ring-black/[0.04] dark:ring-white/[0.08]'
              : 'text-muted hover:text-fg hover:bg-black/[0.02] dark:hover:bg-[#222226]'
          }`}
        >
          <span>{t('dashboard.tabMySpace')}</span>
          {effectivePendingCount !== null && effectivePendingCount > 0 && (
            <span className="ms-2 text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-warn text-white shadow-xs transition-opacity duration-200">
              {effectivePendingCount} {t('dashboard.toHandle')}
            </span>
          )}
        </button>
      </div>

      <div className="hidden sm:flex items-center gap-2 text-xs text-muted shrink-0">
        <span className="font-semibold text-fg/80">{t('dashboard.campusLabel')}</span>
        <span>•</span>
        <span className="text-muted font-medium">2026/2027</span>
      </div>
    </div>
  )

  return (
    <>
      <div id="main-content-section" className="max-w-7xl mx-auto px-6 lg:px-8 pt-8 pb-16 space-y-12">
        {error && <div className="alert-error">{error}</div>}

        {/* FORMULAIRE DE CRÉATION DE CONFÉRENCE (DÉPLIABLE EN 1 CLIC) */}
        {showCreateForm && (
          <div className="card p-5 sm:p-7 border border-line bg-surface shadow-xl space-y-4 animate-modal-enter">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div>
                <h3 className="font-semibold text-base sm:text-lg text-fg">{t('dashboard.newConferenceTitle')}</h3>
                <p className="text-xs text-muted mt-0.5">{t('dashboard.newConferenceSubtitle')}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="btn-ghost btn-sm text-xs flex items-center gap-1 text-muted hover:text-fg"
              >
                <XIcon size={16} />
                <span>{t('common.close')}</span>
              </button>
            </div>
            <EventForm
              submitLabel={t('dashboard.createDraftBtn')}
              busyLabel={t('common.creating')}
              onSubmit={createEvent}
              onCancel={() => setShowCreateForm(false)}
              error={createError}
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* ONGLET 1 : DÉCOUVRIR & CATALOGUE OFFICIEL (OPTION 1 + OPTION 3)          */}
        {/* ========================================================================= */}
        {activeMainTab === 'discover' && (
          <div className="space-y-12 animate-panel-enter">
            {/* CARTE HERO USTO-MB ARRONDIE DANS LA LARGEUR DU CONTENU */}
            <div className="hero relative overflow-hidden text-white rounded-3xl shadow-card border border-white/10">
              <img className="hero-photo hero-photo--usto" src={HERO_PHOTO.src} alt="" aria-hidden="true" decoding="async" />
              <div className="hero-glow" aria-hidden="true" />
              <div className="hero-dots" aria-hidden="true" />
              <div className="absolute inset-0 bg-gradient-to-r rtl:bg-gradient-to-l from-black/85 via-black/55 to-black/10 pointer-events-none z-[1]" aria-hidden="true" />

              <div className="relative z-[2] px-6 sm:px-10 py-8 sm:py-12">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  {/* Colonne gauche : Salutation & Ligne contextuelle */}
                  <header className="hero-text space-y-3">
                    <div className="text-xs sm:text-sm text-white font-medium flex items-center gap-2 [text-shadow:_0_1px_4px_rgba(0,0,0,0.85)]">
                      <span className="first-letter:uppercase">{todayLabel}</span>
                      <span className="text-white/60">•</span>
                      <span className="text-white font-semibold tracking-wide [text-shadow:_0_1px_4px_rgba(0,0,0,0.95)]">{t('dashboard.universityLocation')}</span>
                    </div>

                    <div>
                      <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight">
                        {t('dashboard.hello')}{firstName ? `, ${firstName}` : ''}
                      </h1>
                      <div className="mt-2.5 min-h-[34px] flex items-center gap-3 flex-wrap">
                        {effectivePendingCount !== null && effectivePendingCount > 0 ? (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMainTab('myspace')
                              const el = document.getElementById('main-content-section')
                              el?.scrollIntoView({ behavior: 'smooth' })
                            }}
                            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 text-xs sm:text-sm font-semibold text-white shadow-md hover:bg-white/25 hover:border-white/40 active:scale-95 transition-all duration-200"
                          >
                            <span className="w-2 h-2 rounded-full bg-warn" />
                            <span className="inline-flex items-center gap-1.5">
                              <span>
                                {effectivePendingCount} {effectivePendingCount > 1 ? t('dashboard.priorityActionPlural') : t('dashboard.priorityActionSingle')}
                              </span>
                              <ArrowRightIcon className="w-3.5 h-3.5 rtl:rotate-180" weight="bold" aria-hidden="true" />
                            </span>
                          </button>
                        ) : (
                          <p className="text-white/80 text-xs sm:text-sm max-w-[60ch] leading-relaxed transition-opacity duration-200">
                            {effectivePendingCount === null && !activeData
                              ? t('dashboard.loadingPortal')
                              : t('dashboard.welcomePortal')}
                          </p>
                        )}
                      </div>
                    </div>
                  </header>

                  {/* Colonne droite : Action phare Proposer une conférence */}
                  <div className="shrink-0 self-start md:self-center">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateForm(true)
                        const el = document.getElementById('main-content-section')
                        el?.scrollIntoView({ behavior: 'smooth' })
                      }}
                      className="bg-white text-[#1D1D1F] hover:bg-neutral-100 btn-sm sm:btn-base px-5 py-2.5 text-xs sm:text-sm font-bold shadow-lift inline-flex items-center gap-2 cursor-pointer transition-all active:scale-95 rounded-xl"
                    >
                      <PlusIcon size={16} weight="bold" />
                      <span>{t('dashboard.proposeConference')}</span>
                    </button>
                  </div>
                </div>
              </div>
              <a
                href={HERO_PHOTO.page}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:block absolute end-4 bottom-3 text-xs text-white/50 hover:text-white/80 transition-colors"
              >
                {HERO_PHOTO.credit}
              </a>
            </div>

            {/* COMMUTATEUR MAÎTRE : DÉCOUVRIR vs MON ESPACE (SÉLECTEUR NEUTRE ÉPURÉ SOUS LE HERO) */}
            {renderTabSwitcher()}

            {/* EN-TÊTE PRINCIPAL DE LA SECTION CONFÉRENCES */}
            <div>
              <h2 className="text-[28px] sm:text-[32px] font-semibold tracking-[-0.025em] leading-tight text-neutral-900 dark:text-white">
                {t('dashboard.conferencesHeading')}{' '}
                <span className="font-normal text-neutral-500 dark:text-neutral-400">
                  {t('dashboard.conferencesSubheading')}
                </span>
              </h2>
            </div>

            {/* SECTION « À LA UNE » — RAIL HORIZONTAL SCROLLABLE (STYLE APPLE) */}
            {featuredRailEvents.length > 0 && (
              <section className="space-y-5">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-[18px] font-semibold tracking-[-0.015em] text-neutral-900 dark:text-white">
                    {t('dashboard.featured')}
                  </h3>

                  {featuredRailEvents.length > 2 && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => scrollRail(-1)}
                        disabled={!canScrollLeft}
                        aria-label={t('dashboard.scrollPrev')}
                        className={`w-8 h-8 rounded-full border border-neutral-200 dark:border-white/10 bg-white dark:bg-neutral-900 flex items-center justify-center text-fg transition-opacity cursor-pointer ${
                          !canScrollLeft ? 'opacity-35 pointer-events-none' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800'
                        }`}
                      >
                        <CaretLeftIcon className="w-4 h-4 rtl:rotate-180" weight="bold" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => scrollRail(1)}
                        disabled={!canScrollRight}
                        aria-label={t('dashboard.scrollNext')}
                        className={`w-8 h-8 rounded-full border border-neutral-200 dark:border-white/10 bg-white dark:bg-neutral-900 flex items-center justify-center text-fg transition-opacity cursor-pointer ${
                          !canScrollRight ? 'opacity-35 pointer-events-none' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800'
                        }`}
                      >
                        <CaretRightIcon className="w-4 h-4 rtl:rotate-180" weight="bold" aria-hidden="true" />
                      </button>
                    </div>
                  )}
                </div>

                <div
                  ref={railRef}
                  onScroll={updateRailArrows}
                  className="flex gap-6 overflow-x-auto snap-x snap-mandatory scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden py-5 -my-5 px-2 -mx-2"
                >
                  {featuredRailEvents.map((ev) => {
                    const isOngoing = ev.status === 'ongoing'
                    const isClosed = ['closed', 'archived'].includes(ev.status)
                    const isScientific = ev.phase === 'scientific' && !isOngoing && !isClosed
                    const dateStr = ev.start_date
                      ? new Date(`${String(ev.start_date).slice(0, 10)}T00:00:00`).toLocaleDateString(locale, { day: 'numeric', month: 'short' })
                      : formatDate(ev.start_date, { day: 'numeric', month: 'short' })
                    const cityName = ev.location
                      ? ev.location.split(',').pop().trim().replace(/^Campus\s+/i, '') || t('dashboard.defaultCity')
                      : t('dashboard.defaultCity')
                    const topics = extractTopics(ev)

                    return (
                      <div
                        key={`rail-${ev.id}`}
                        onClick={() => onOpenEvent(ev.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && onOpenEvent(ev.id)}
                        className="group snap-start shrink-0 w-[85%] sm:w-[68%] lg:w-[45%] flex flex-col rounded-2xl bg-white dark:bg-neutral-900 border border-line shadow-card hover:shadow-lift event-card-shadow transition-all duration-300 cursor-pointer text-start"
                      >
                        <div className="p-2.5 pb-0">
                          <EventCover
                            event={ev}
                            seed={ev.id}
                            className="relative aspect-[16/9] w-full overflow-hidden rounded-lg ring-1 ring-inset ring-black/5 dark:ring-white/10 px-3.5 py-3 flex flex-col justify-start"
                          >
                            <span className="backdrop-blur-md bg-black/50 text-white border border-white/15 text-[11px] font-medium px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 w-fit">
                              <span
                                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                  isOngoing
                                    ? 'bg-emerald-400'
                                    : isScientific
                                      ? 'bg-accent'
                                      : isClosed
                                        ? 'bg-neutral-400'
                                        : 'bg-emerald-400'
                                }`}
                                aria-hidden="true"
                              />
                              <span>
                                {isOngoing
                                  ? t('dashboard.statusOngoing')
                                  : isClosed
                                    ? t('dashboard.statusClosed')
                                    : isScientific
                                      ? t('dashboard.statusOpenCall')
                                      : t('dashboard.statusActiveProgram')}
                              </span>
                            </span>
                          </EventCover>
                        </div>

                        <div className="p-5 pt-4 flex-1 flex flex-col">
                          <div className="mb-4">
                            <h4 className="text-[17px] font-semibold tracking-[-0.01em] leading-snug line-clamp-2 text-neutral-900 dark:text-white">
                              {ev.title}
                            </h4>
                            {ev.description && (
                              <p className="text-[13.5px] leading-relaxed text-neutral-500 dark:text-neutral-400 line-clamp-2 mt-1.5">
                                {cleanDescription(ev.description)}
                              </p>
                            )}

                            {topics.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-1.5">
                                {topics.map((topic) => (
                                  <span
                                    key={topic}
                                    className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-600 dark:bg-white/5 dark:text-neutral-300"
                                  >
                                    {topic}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="mt-auto pt-3.5 border-t border-neutral-100 dark:border-white/8 flex items-center justify-between gap-2">
                            <div className="min-w-0 text-[12px] text-neutral-500 dark:text-neutral-400 flex items-center gap-3">
                              <span className="inline-flex items-center gap-1.5 shrink-0 num">
                                <CalendarBlankIcon className="w-3.5 h-3.5 shrink-0" weight="regular" aria-hidden="true" />
                                <span>{dateStr}</span>
                              </span>
                              <span className="inline-flex items-center gap-1 min-w-0">
                                <MapPinIcon className="w-3.5 h-3.5 shrink-0" weight="regular" aria-hidden="true" />
                                <span className="truncate">{cityName}</span>
                              </span>
                            </div>
                            <span className="text-accent-ink text-[12px] font-medium inline-flex items-center gap-1 shrink-0">
                              <span>{isScientific ? t('dashboard.actionSubmit') : t('dashboard.actionView')}</span>
                              <ArrowRightIcon className="w-3.5 h-3.5 rtl:rotate-180 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 transition-transform" weight="bold" aria-hidden="true" />
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* SECTION « TOUTES LES CONFÉRENCES » — CATALOGUE COMPLET */}
            <section className="pt-10 border-t border-neutral-200/70 dark:border-white/8 space-y-5">
              <div className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h3 className="text-[18px] font-semibold tracking-[-0.015em] text-neutral-900 dark:text-white">
                    {t('dashboard.allConferences')}
                  </h3>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {[
                      { id: 'all', label: `${t('dashboard.filterAll')} (${publicEvents.length})` },
                      ...(publicEvents.some((e) => e.status === 'ongoing')
                        ? [{ id: 'ongoing', label: `${t('dashboard.filterOngoing')} (${publicEvents.filter((e) => e.status === 'ongoing').length})` }]
                        : []),
                      { id: 'scientific', label: `${t('dashboard.filterOpenCalls')} (${publicEvents.filter((e) => e.phase === 'scientific').length})` },
                      { id: 'active', label: `${t('dashboard.filterActivePrograms')} (${publicEvents.filter((e) => e.phase !== 'scientific').length})` },
                    ].map((chip) => (
                      <button
                        key={chip.id}
                        type="button"
                        onClick={() => setFilterChip(chip.id)}
                        className={`px-4 py-1.5 rounded-full text-[12px] font-medium shrink-0 transition-colors ${
                          filterChip === chip.id
                            ? 'bg-black text-white dark:bg-white dark:text-black shadow-xs'
                            : 'bg-surface-2 dark:bg-[#18181B] border border-line dark:border-white/5 text-muted dark:text-[#A1A1AA] hover:text-fg dark:hover:text-white'
                        }`}
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>

                  {/* Commutateur Grille vs Chrono */}
                  <div className="flex items-center bg-surface-2 dark:bg-[#18181B] p-1 rounded-xl border border-line dark:border-white/10 gap-1 shrink-0 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setViewMode('grid')}
                      className={`px-3 py-1 rounded-lg text-[12px] font-medium transition-all ${
                        viewMode === 'grid'
                          ? 'bg-surface dark:bg-[#27272A] text-fg dark:text-white shadow-xs'
                          : 'text-muted dark:text-[#71717A] hover:text-fg dark:hover:text-white'
                      }`}
                    >
                      {t('dashboard.viewGrid')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('timeline')}
                      className={`px-3 py-1 rounded-lg text-[12px] font-medium transition-all ${
                        viewMode === 'timeline'
                          ? 'bg-surface dark:bg-[#27272A] text-fg dark:text-white shadow-xs'
                          : 'text-muted dark:text-[#71717A] hover:text-fg dark:hover:text-white'
                      }`}
                    >
                      {t('dashboard.viewAgenda')}
                    </button>
                  </div>
                </div>
              </div>

            {/* VUE 1 : GRILLE VISUELLE */}
            {viewMode === 'grid' ? (
              <div key={`grid-${filterChip}`} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-panel-enter">
                {filteredEvents.map((ev) => {
                  const isOngoing = ev.status === 'ongoing'
                  const isClosed = ['closed', 'archived'].includes(ev.status)
                  const isScientific = ev.phase === 'scientific' && !isOngoing && !isClosed
                  const dateStr = ev.start_date
                    ? new Date(`${String(ev.start_date).slice(0, 10)}T00:00:00`).toLocaleDateString(locale, { day: 'numeric', month: 'short' })
                    : formatDate(ev.start_date, { day: 'numeric', month: 'short' })
                  const cityName = ev.location
                    ? ev.location.split(',').pop().trim().replace(/^Campus\s+/i, '') || t('dashboard.defaultCity')
                    : t('dashboard.defaultCity')

                  const topics = extractTopics(ev)

                  return (
                    <div
                      key={ev.id}
                      onClick={() => onOpenEvent(ev.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && onOpenEvent(ev.id)}
                      className="group card event-card-shadow h-full rounded-xl border border-line bg-surface shadow-card hover:shadow-lift hover:border-black/15 dark:hover:border-white/[0.14] transition-all duration-200 flex flex-col cursor-pointer text-start"
                    >
                      <div className="p-2.5 pb-0">
                        <EventCover
                          event={ev}
                          seed={ev.id}
                          className="aspect-[16/10] w-full px-3.5 py-3 rounded-lg ring-1 ring-inset ring-black/5 dark:ring-white/10 flex flex-col justify-start relative overflow-hidden"
                        >
                          <span className="backdrop-blur-md bg-black/50 text-white border border-white/15 text-[11px] font-medium px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 w-fit">
                            <span
                              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                isOngoing
                                  ? 'bg-emerald-400'
                                  : isScientific
                                    ? 'bg-accent'
                                    : isClosed
                                      ? 'bg-neutral-400'
                                      : 'bg-emerald-400'
                              }`}
                              aria-hidden="true"
                            />
                            <span>
                              {isOngoing
                                ? t('dashboard.statusOngoing')
                                : isClosed
                                  ? t('dashboard.statusClosed')
                                  : isScientific
                                    ? t('dashboard.statusOpenCall')
                                    : t('dashboard.statusActiveProgram')}
                            </span>
                          </span>
                        </EventCover>
                      </div>

                      <div className="flex-1 flex flex-col p-5 pt-4">
                        <div className="mb-4">
                          <h3 className="text-[16px] font-semibold tracking-[-0.01em] leading-snug text-fg line-clamp-2">
                            {ev.title}
                          </h3>
                          {ev.description && (
                            <p className="text-[13.5px] leading-relaxed text-neutral-500 dark:text-neutral-400 line-clamp-2 mt-1.5">
                              {cleanDescription(ev.description)}
                            </p>
                          )}

                          {topics.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5 mt-3">
                              {topics.map((topic) => (
                                <span
                                  key={topic}
                                  className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-600 dark:bg-white/5 dark:text-neutral-300"
                                >
                                  {topic}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="mt-auto pt-3.5 border-t border-neutral-100 dark:border-white/8 flex items-center justify-between gap-2">
                          <div className="min-w-0 flex items-center gap-3 text-[12px] text-neutral-500 dark:text-neutral-400">
                            <span className="inline-flex items-center gap-1.5 shrink-0 num">
                              <CalendarBlankIcon className="w-3.5 h-3.5 shrink-0" weight="regular" aria-hidden="true" />
                              <span>{dateStr}</span>
                            </span>
                            <span className="inline-flex items-center gap-1 min-w-0">
                              <MapPinIcon className="w-3.5 h-3.5 shrink-0" weight="regular" aria-hidden="true" />
                              <span className="truncate">{cityName}</span>
                            </span>
                          </div>
                          <span className="text-accent-ink text-[12px] font-medium shrink-0 inline-flex items-center gap-1">
                            <span>{isScientific ? t('dashboard.actionSubmit') : t('dashboard.actionView')}</span>
                            <ArrowRightIcon className="w-3.5 h-3.5 rtl:rotate-180 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 transition-transform" weight="bold" aria-hidden="true" />
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              /* VUE 2 : AGENDA CHRONO (TIMELINE FOTMOB / RADAR) */
              <div key={`agenda-${filterChip}`} className="space-y-3 animate-panel-enter">
                {filteredEvents.map((ev) => {
                  const isOngoing = ev.status === 'ongoing'
                  const isClosed = ['closed', 'archived'].includes(ev.status)
                  const isScientific = ev.phase === 'scientific' && !isOngoing && !isClosed
                  const d = new Date(ev.start_date)
                  const dayNum = d.getDate()
                  const monthName = d.toLocaleString(locale, { month: 'short' })
                  const typeKey = `eventCard.types.${ev.type}`
                  const translatedType = t(typeKey)
                  const typeLabel = translatedType !== typeKey ? translatedType : (TYPE_LABELS[ev.type] || ev.type)
                  return (
                    <div
                      key={ev.id}
                      onClick={() => onOpenEvent(ev.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && onOpenEvent(ev.id)}
                      className="group card event-card-shadow rounded-xl p-4 sm:p-5 border border-line bg-surface hover:border-black/15 dark:hover:border-white/[0.14] transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        {/* Bloc date jour */}
                        <div className="w-14 h-14 rounded-xl bg-surface-2 border border-line flex flex-col items-center justify-center shrink-0">
                          <span className="num text-lg font-bold text-fg leading-none font-mono">{dayNum}</span>
                          <span className="text-[12px] font-medium text-muted leading-tight mt-0.5 capitalize">{monthName}</span>
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="inline-flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-0.5 rounded-full bg-white text-neutral-800 border border-neutral-200/80 dark:bg-white/[0.06] dark:text-neutral-200 dark:border-white/10">
                              <span
                                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                  isOngoing
                                    ? 'bg-emerald-500'
                                    : isClosed
                                      ? 'bg-neutral-400'
                                      : isScientific
                                        ? 'bg-accent'
                                        : 'bg-emerald-500'
                                }`}
                                aria-hidden="true"
                              />
                              <span>
                                {isOngoing
                                  ? t('dashboard.statusOngoing')
                                  : isClosed
                                    ? t('dashboard.statusClosed')
                                    : isScientific
                                      ? t('dashboard.statusCfpFull')
                                      : t('dashboard.statusActiveProgram')}
                              </span>
                            </span>
                            <span className="text-[12px] text-muted font-medium">
                              {typeLabel}
                            </span>
                          </div>
                          <h3 className="text-[16px] font-semibold tracking-[-0.01em] text-fg leading-snug line-clamp-1 group-hover:text-fg dark:group-hover:text-white transition-colors">
                            {ev.title}
                          </h3>
                          <p className="text-[12px] text-muted truncate mt-0.5">
                            {ev.location || t('dashboard.defaultLocation')}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                        <span className="font-mono text-[12px] font-medium px-2.5 py-1 rounded-lg bg-surface-2 border border-line text-muted">
                          {countdown(ev)}
                        </span>
                        <span className={`${
                          isScientific ? 'btn-info' : 'btn-success'
                        } btn-sm text-[12px] font-medium inline-flex items-center gap-1`}>
                          <span>{isScientific ? t('dashboard.actionSubmitFull') : t('dashboard.actionView')}</span>
                          <ArrowRightIcon size={12} weight="bold" className="rtl:rotate-180" />
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            </section>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ONGLET 2 : MON ESPACE (ARCHITECTURE VERTICALE PLEINE LARGEUR)             */}
        {/* ========================================================================= */}
        {activeMainTab === 'myspace' && (
          <div className="max-w-5xl mx-auto space-y-8 animate-panel-enter">
            {/* 1. EN-TÊTE SOBRE MODE TRAVAIL */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-line">
              <div className="space-y-1 text-start">
                <div className="text-xs text-muted font-medium flex items-center gap-2">
                  <span className="first-letter:uppercase">{todayLabel}</span>
                  <span className="text-neutral-300 dark:text-neutral-700" aria-hidden="true">·</span>
                  <span className="text-muted font-semibold">{t('workspace.researcherSpace')}</span>
                </div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-fg">
                  {t('dashboard.hello')}{firstName ? `, ${firstName}` : ''}
                </h1>
              </div>

              <div className="shrink-0 self-start sm:self-center">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(true)
                    const el = document.getElementById('main-content-section')
                    el?.scrollIntoView({ behavior: 'smooth' })
                  }}
                  className="bg-[#1D1D1F] text-white hover:bg-black dark:bg-white dark:text-[#1D1D1F] dark:hover:bg-neutral-200 btn-sm sm:btn-base px-5 py-2.5 text-xs sm:text-sm font-bold shadow-lift inline-flex items-center gap-2 cursor-pointer transition-all active:scale-95 rounded-xl"
                >
                  <PlusIcon size={16} weight="bold" />
                  <span>{t('dashboard.proposeConference')}</span>
                </button>
              </div>
            </div>

            {/* COMMUTATEUR MAÎTRE : DÉCOUVRIR vs MON ESPACE */}
            {renderTabSwitcher()}

            {/* 2. BLOC « À TRAITER » (CONDITIONNEL, COMPACT, MAX 3 PAR DÉFAUT) */}
            {todos.length > 0 && (
              <section className="space-y-3">
                <SectionTitle
                  title={t('workspace.priorities')}
                  count={todos.length}
                  actions={
                    todos.length > 3 ? (
                      <button
                        type="button"
                        onClick={() => setShowAllTodos((v) => !v)}
                        className="btn-ghost btn-sm -me-2 text-xs text-muted hover:text-fg cursor-pointer"
                      >
                        {showAllTodos
                          ? t('workspace.collapse')
                          : t('workspace.showAll', { count: todos.length })}
                      </button>
                    ) : null
                  }
                />

                <div className="card rounded-2xl border border-line divide-y divide-line/60 overflow-hidden bg-surface">
                  {(showAllTodos ? todos : todos.slice(0, 3)).map(({ key, category, detail, title, target, dotClass }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => open(target)}
                      className="group w-full text-start py-3.5 px-5 flex items-center justify-between gap-4 hover:bg-surface-2/60 transition-colors cursor-pointer"
                    >
                      <div className="min-w-0 flex-1 flex items-center gap-3">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${dotClass || 'bg-accent'}`} aria-hidden="true" />
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex items-center gap-2 text-xs text-muted">
                            <span className="font-semibold text-muted">{category}</span>
                            {detail && (
                              <>
                                <span className="text-neutral-300 dark:text-neutral-700" aria-hidden="true">·</span>
                                <span className="truncate">{detail}</span>
                              </>
                            )}
                          </div>
                          <p className="font-semibold text-fg text-sm leading-snug truncate group-hover:text-fg dark:group-hover:text-white transition-colors">
                            {title}
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0 text-end flex items-center gap-1.5 text-xs font-medium text-muted group-hover:text-fg dark:group-hover:text-white transition-colors">
                        <span>{t('workspace.handle')}</span>
                        <ArrowRightIcon
                          size={13}
                          weight="bold"
                          className="transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
                        />
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* 3. BARRE D'ONGLETS SEGMENTÉS */}
            <div className="space-y-5">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div
                  role="tablist"
                  className="inline-flex items-center bg-surface-2 p-1 rounded-xl border border-line gap-1 max-w-full overflow-x-auto"
                >
                  {[
                    {
                      id: 'conferences',
                      label: t('workspace.myConferences'),
                      count: data ? data.parts.length : null,
                    },
                    {
                      id: 'submissions',
                      label: t('workspace.mySubmissions'),
                      count: data ? data.subs.length : null,
                    },
                    {
                      id: 'badges',
                      label: t('workspace.accessBadges'),
                      count: data ? validatedParticipations.length : null,
                    },
                  ].map((tab) => {
                    const active = myspaceTab === tab.id
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => setMyspaceTab(tab.id)}
                        className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                          active
                            ? 'bg-surface text-fg shadow-xs'
                            : 'text-muted hover:text-fg'
                        }`}
                      >
                        <span>{tab.label}</span>
                        {tab.count !== null && (
                          <span
                            className={`text-[11px] font-mono px-1.5 py-0.5 rounded-full ${
                              active
                                ? 'bg-neutral-100 dark:bg-white/[0.08] text-fg'
                                : 'text-faint'
                            }`}
                          >
                            {tab.count}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* ONGLET A : MES CONFÉRENCES */}
              {myspaceTab === 'conferences' && (
                <section key="myspace-conferences" className="space-y-3 animate-panel-enter">
                  <SectionTitle
                    title={t('workspace.myConferences')}
                    count={data ? data.parts.length : null}
                    actions={
                      <button
                        type="button"
                        onClick={() => setActiveMainTab('discover')}
                        className="btn-ghost btn-sm -me-2 text-xs text-muted hover:text-fg cursor-pointer"
                      >
                        {t('workspace.catalog')}
                      </button>
                    }
                  />

                  {!data ? (
                    <div className="skeleton h-36 rounded-2xl" />
                  ) : data.parts.length === 0 ? (
                    <EmptyState
                      compact
                      icon={CalendarBlankIcon}
                      title={t('workspace.noConferences')}
                      body={t('workspace.noConferencesBody')}
                      action={
                        <button
                          type="button"
                          onClick={() => setActiveMainTab('discover')}
                          className="btn-outline btn-sm"
                        >
                          {t('workspace.browseEvents')}
                        </button>
                      }
                    />
                  ) : (
                    <div className="card rounded-2xl border border-line divide-y divide-line/60 overflow-hidden bg-surface">
                      {data.parts
                        .slice()
                        .sort((a, b) => (a.events.start_date || '').localeCompare(b.events.start_date || ''))
                        .map((p) => {
                          const phaseKey = `eventCard.phases.${p.events.phase}`
                          const phaseTranslated = t(phaseKey)
                          const phaseLabel = p.events.phase
                            ? (phaseTranslated !== phaseKey ? phaseTranslated : (PHASE_LABELS[p.events.phase]?.replace('Phase ', '') || ''))
                            : ''
                          const roleKey = `roles.${p.role_in_event}`
                          const roleTranslated = t(roleKey)
                          const roleLabel = roleTranslated !== roleKey ? roleTranslated : ROLE_LABELS[p.role_in_event]
                          const statusKey = `eventCard.statuses.${p.events.status}`
                          const statusTranslated = t(statusKey)
                          const statusLabel = statusTranslated !== statusKey ? statusTranslated : STATUS_LABELS[p.events.status]
                          const statusDot =
                            p.events.status === 'ongoing'
                              ? 'bg-ok'
                              : p.events.status === 'published'
                                ? 'bg-accent'
                                : 'bg-fg/40'

                          return (
                            <button
                              key={p.event_id}
                              type="button"
                              onClick={() => onOpenEvent(p.event_id)}
                              className="group w-full text-start py-3.5 px-5 flex items-center gap-3.5 hover:bg-surface-2/60 transition-colors cursor-pointer"
                            >
                              <span className="w-9 h-9 rounded-xl shrink-0" style={coverStyle(p.events || p.event_id)} aria-hidden="true" />
                              <span className="min-w-0 flex-1">
                                <span className="block font-semibold text-fg text-sm truncate group-hover:text-fg dark:group-hover:text-white transition-colors">
                                  {p.events.title}
                                </span>
                                <span className="block text-xs text-muted num mt-0.5">
                                  {p.events.start_date
                                    ? new Date(`${String(p.events.start_date).slice(0, 10)}T00:00:00`).toLocaleDateString(locale, {
                                        day: 'numeric',
                                        month: 'short',
                                      })
                                    : formatDate(p.events.start_date, { day: 'numeric', month: 'short' })}
                                  {phaseLabel ? ` · ${phaseLabel}` : ''}
                                </span>
                              </span>
                              <span className="flex items-center gap-2.5 shrink-0">
                                <span className="text-xs font-medium text-muted hidden sm:inline">{roleLabel}</span>
                                <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-neutral-100/80 text-neutral-700 border border-neutral-200/80 dark:bg-white/[0.06] dark:text-neutral-200 dark:border-white/10">
                                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDot}`} aria-hidden="true" />
                                  <span>{statusLabel}</span>
                                </span>
                                <ArrowRightIcon
                                  size={13}
                                  weight="bold"
                                  className="text-muted group-hover:text-fg dark:group-hover:text-white transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
                                />
                              </span>
                            </button>
                          )
                        })}
                    </div>
                  )}
                </section>
              )}

              {/* ONGLET B : MES SOUMISSIONS */}
              {myspaceTab === 'submissions' && (
                <section key="myspace-submissions" className="space-y-3 animate-panel-enter">
                  <SectionTitle
                    title={t('workspace.mySubmissions')}
                    count={data ? data.subs.length : null}
                    actions={
                      acceptedCount > 0 ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full bg-neutral-100/80 text-neutral-700 border border-neutral-200/80 dark:bg-white/[0.06] dark:text-neutral-200 dark:border-white/10">
                          <span className="w-1.5 h-1.5 rounded-full bg-ok shrink-0" aria-hidden="true" />
                          <span>
                            {t(acceptedCount > 1 ? 'workspace.acceptedPapersPlural' : 'workspace.acceptedPapersSingle', {
                              count: acceptedCount,
                            })}
                          </span>
                        </span>
                      ) : null
                    }
                  />

                  {!data ? (
                    <div className="skeleton h-24 rounded-2xl" />
                  ) : data.subs.length === 0 ? (
                    <EmptyState
                      compact
                      icon={ArticleIcon}
                      title={t('workspace.noSubmissions')}
                      body={t('workspace.noSubmissionsBody')}
                      action={
                        <button
                          type="button"
                          onClick={() => setActiveMainTab('discover')}
                          className="btn-outline btn-sm"
                        >
                          {t('workspace.viewOpenCalls')}
                        </button>
                      }
                    />
                  ) : (
                    <div className="card rounded-2xl border border-line divide-y divide-line/60 overflow-hidden bg-surface">
                      {data.subs.map((s) => {
                        const subDot =
                          s.status === 'accepted'
                            ? 'bg-ok'
                            : s.status === 'rejected'
                              ? 'bg-danger'
                              : s.status === 'revision_requested'
                                ? 'bg-warn'
                                : 'bg-accent'
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => onOpenEvent(s.event_id, { tab: 'scientific' })}
                            className="group w-full text-start py-3.5 px-5 flex items-center justify-between gap-4 hover:bg-surface-2/60 transition-colors cursor-pointer"
                          >
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex items-center gap-2 text-xs">
                                <span className="inline-flex items-center gap-1.5 font-medium px-2 py-0.5 rounded-full text-[11px] bg-neutral-100/80 text-neutral-700 border border-neutral-200/80 dark:bg-white/[0.06] dark:text-neutral-200 dark:border-white/10 shrink-0">
                                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${subDot}`} aria-hidden="true" />
                                  <span>{statusOf(s)}</span>
                                </span>
                                <span className="text-muted truncate">{s.events?.title}</span>
                              </div>
                              <p className="font-semibold text-fg text-sm leading-snug truncate group-hover:text-fg dark:group-hover:text-white transition-colors">
                                {s.title}
                              </p>
                            </div>
                            <div className="shrink-0 flex items-center gap-3">
                              <span className="text-xs text-faint num">
                                {s.submitted_at
                                  ? new Date(s.submitted_at).toLocaleDateString(locale, { day: 'numeric', month: 'short' })
                                  : formatDate(s.submitted_at, { day: 'numeric', month: 'short' })}
                              </span>
                              <ArrowRightIcon
                                size={13}
                                weight="bold"
                                className="text-muted group-hover:text-fg dark:group-hover:text-white transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
                              />
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </section>
              )}

              {/* ONGLET C : BADGES D'ACCÈS */}
              {myspaceTab === 'badges' && (
                <section key="myspace-badges" className="space-y-3 animate-panel-enter">
                  <SectionTitle
                    title={t('workspace.accessBadge')}
                    count={data ? validatedParticipations.length : null}
                    actions={
                      validatedParticipations.length > 0 ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full bg-neutral-100/80 text-neutral-700 border border-neutral-200/80 dark:bg-white/[0.06] dark:text-neutral-200 dark:border-white/10">
                          <span className="w-1.5 h-1.5 rounded-full bg-ok shrink-0" aria-hidden="true" />
                          <span>{t('workspace.activePass')}</span>
                        </span>
                      ) : null
                    }
                  />

                  {!data ? (
                    <div className="skeleton h-32 rounded-2xl" />
                  ) : validatedParticipations.length === 0 ? (
                    <div className="card p-6 border border-line bg-surface flex items-start gap-3">
                      <ShieldCheckIcon size={20} className="text-muted shrink-0 mt-0.5" weight="regular" />
                      <p className="text-xs sm:text-sm text-muted leading-relaxed">
                        {t('workspace.noBadgesBody')}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {validatedParticipations.map((vp) => (
                        <div
                          key={vp.event_id}
                          className="card p-5 border border-line bg-surface flex flex-col justify-between gap-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 space-y-1">
                              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full bg-neutral-100/80 text-neutral-700 border border-neutral-200/80 dark:bg-white/[0.06] dark:text-neutral-200 dark:border-white/10">
                                <span className="w-1.5 h-1.5 rounded-full bg-ok shrink-0" aria-hidden="true" />
                                <span>{t('workspace.validatedParticipant')}</span>
                              </span>
                              <p className="font-semibold text-sm sm:text-base text-fg leading-snug pt-1">
                                {vp.events?.title}
                              </p>
                              <p className="text-xs text-muted truncate">
                                {vp.events?.location || t('dashboard.defaultLocation')}
                              </p>
                            </div>
                            <span className="w-12 h-12 rounded-xl bg-surface-2 border border-line flex items-center justify-center text-fg shrink-0">
                              <QrCodeIcon size={26} weight="duotone" />
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => onOpenEvent(vp.event_id, { tab: 'overview' })}
                            className="btn-outline btn-sm text-xs w-full justify-center shadow-xs cursor-pointer"
                          >
                            {t('workspace.showFullQrBadge')}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
