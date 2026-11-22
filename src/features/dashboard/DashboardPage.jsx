import { useState, useEffect, useCallback } from 'react'
import {
  ArticleIcon,
  ArrowRightIcon,
  CalendarBlankIcon,
  CheckCircleIcon,
  QrCodeIcon,
  ShieldCheckIcon,
  PlusIcon,
  XIcon,
} from '@phosphor-icons/react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../lib/auth'
import { frError } from '../../lib/errors'
import {
  SUBMISSION_LABELS,
  SUBMISSION_COLOR,
  REVISION_LABELS,
  ROLE_LABELS,
  STATUS_LABELS,
  STATUS_BADGE,
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

const plural = (n, one, many) => `${n} ${n > 1 ? many : one}`

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
function buildTodos({ parts, subs, orgPending, orgPayments, toReview, pendingApprovals, isAdmin }) {
  const todos = []
  const titleOf = (id) => parts.find((p) => p.event_id === id)?.events?.title || 'Événement'

  if (isAdmin && pendingApprovals > 0) {
    todos.push({
      key: 'admin',
      category: 'Validation Admin',
      borderClass: 'border-l-warn',
      badgeClass: 'bg-warn/20 text-warn',
      title: plural(pendingApprovals, 'événement attend', 'événements attendent') + ' votre validation administrative',
      detail: 'Panneau d’administration',
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
      category: 'Validation Règlements',
      borderClass: 'border-l-warn',
      badgeClass: 'bg-warn/20 text-warn',
      title: plural(n, 'paiement d’inscription à valider', 'paiements d’inscription à valider'),
      detail: titleOf(eventId),
      target: { eventId, tab: 'organization', orgTab: 'registrations' },
    }),
  )
  Object.entries(byEvent(orgPending)).forEach(([eventId, n]) =>
    todos.push({
      key: `decide-${eventId}`,
      category: 'Comité Scientifique',
      borderClass: 'border-l-accent',
      badgeClass: 'bg-accent/20 text-accent-ink',
      title: plural(n, 'article à décider pour acceptation', 'articles à décider pour acceptation'),
      detail: titleOf(eventId),
      target: { eventId, tab: 'scientific' },
    }),
  )
  parts
    .filter((p) => p.role_in_event === 'organizer' && p.events?.status === 'draft')
    .forEach((p) =>
      todos.push({
        key: `draft-${p.event_id}`,
        category: 'Organisation',
        borderClass: 'border-l-line',
        badgeClass: 'bg-fg/10 text-muted',
        title: 'Brouillon de conférence à compléter et publier',
        detail: p.events.title,
        target: { eventId: p.event_id, tab: 'overview' },
      }),
    )

  // reviewer
  Object.entries(byEvent(toReview)).forEach(([eventId, n]) =>
    todos.push({
      key: `review-${eventId}`,
      category: 'Relecture par les pairs',
      borderClass: 'border-l-accent',
      badgeClass: 'bg-accent/20 text-accent-ink',
      title: plural(n, 'article scientifique assigné à évaluer', 'articles scientifiques assignés à évaluer'),
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
        category: 'Action Auteur Requise',
        borderClass: 'border-l-warn',
        badgeClass: 'bg-warn/20 text-warn',
        title: `Révision demandée sur votre article « ${s.title} »`,
        detail: s.events.title,
        target: { eventId: s.event_id, tab: 'scientific' },
      }),
    )
  parts
    .filter((p) => p.role_in_event === 'participant' && p.registration_status === 'invited')
    .forEach((p) =>
      todos.push({
        key: `invited-${p.event_id}`,
        category: 'Règlement Inscription',
        borderClass: 'border-l-warn',
        badgeClass: 'bg-warn/20 text-warn',
        title: 'Régler vos frais d’inscription pour obtenir votre badge',
        detail: p.events.title,
        target: { eventId: p.event_id, tab: 'overview' },
      }),
    )

  return todos
}

let cachedDashboard = null

export default function DashboardPage({ onOpenEvent, onNavigateAdmin }) {
  const { user, profile, isAdmin } = useAuth()
  const [data, setData] = useState(cachedDashboard?.data || null)
  const [publicEvents, setPublicEvents] = useState(cachedDashboard?.publicEvents || [])
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
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

    const payloadData = {
      parts,
      subs: subsRes.data || [],
      orgPending: pendingRes.data || [],
      orgPayments: paymentsRes.data || [],
      toReview,
      pendingApprovals: approvalsRes.count || 0,
    }
    const payloadEvents = pubEventsRes.data || []
    cachedDashboard = { data: payloadData, publicEvents: payloadEvents }

    setData(payloadData)
    setPublicEvents(payloadEvents)
  }, [user.id, isAdmin])

  useEffect(() => {
    load()
  }, [load])

  const rawFirstName = (profile?.full_name || '').trim().split(/\s+/)[0]
  const firstName = rawFirstName ? rawFirstName.charAt(0).toUpperCase() + rawFirstName.slice(1) : ''
  const todayLabel = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  const todos = data ? buildTodos({ ...data, isAdmin }) : []

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
    }
    return SUBMISSION_LABELS[s.status] || s.status
  }

  const acceptedCount = data?.subs.filter((x) => x.status === 'accepted').length || 0

  const [activeMainTab, setActiveMainTab] = useState('discover')
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

  const featuredEvent =
    publicEvents.find((e) => e.status === 'ongoing') ||
    publicEvents.find((e) => e.phase === 'scientific') ||
    publicEvents[0] ||
    null
  const filteredEvents = publicEvents.filter((ev) => {
    if (filterChip === 'ongoing') return ev.status === 'ongoing'
    if (filterChip === 'scientific') return ev.phase === 'scientific'
    if (filterChip === 'active') return ev.status === 'ongoing' || ev.phase !== 'scientific'
    if (filterChip === 'usto') return (ev.location || '').toLowerCase().includes('usto')
    return true
  })
  const validatedParticipation = data?.parts.find((p) => p.registration_status === 'validated')

  const renderTabSwitcher = () => (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-line/60">
      <div className="inline-flex items-center bg-black/[0.04] dark:bg-[#222226] p-1 rounded-xl border border-black/[0.06] dark:border-white/[0.06] gap-1 max-w-full overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveMainTab('discover')}
          aria-selected={activeMainTab === 'discover'}
          className={`px-4 sm:px-5 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 select-none ${
            activeMainTab === 'discover'
              ? 'bg-surface text-fg shadow-xs ring-1 ring-black/[0.04] dark:ring-white/[0.08]'
              : 'text-muted hover:text-fg hover:bg-black/[0.02] dark:hover:bg-[#222226]'
          }`}
        >
          <span>Découvrir & Conférences</span>
          <span className={`ml-2 text-xs font-mono font-medium px-2 py-0.5 rounded-full transition-colors ${
            activeMainTab === 'discover'
              ? 'bg-black/[0.06] dark:bg-[#18181B] text-fg'
              : 'text-faint'
          }`}>
            {publicEvents.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab('myspace')}
          aria-selected={activeMainTab === 'myspace'}
          className={`px-4 sm:px-5 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 select-none ${
            activeMainTab === 'myspace'
              ? 'bg-surface text-fg shadow-xs ring-1 ring-black/[0.04] dark:ring-white/[0.08]'
              : 'text-muted hover:text-fg hover:bg-black/[0.02] dark:hover:bg-[#222226]'
          }`}
        >
          <span>Mon Espace</span>
          {todos.length > 0 && (
            <span className="ml-2 text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-warn text-white shadow-xs">
              {todos.length} à traiter
            </span>
          )}
        </button>
      </div>

      <div className="hidden sm:flex items-center gap-2 text-xs text-muted shrink-0">
        <span className="font-semibold text-fg/80">Campus USTO-MB</span>
        <span>•</span>
        <span className="text-muted font-medium">2026/2027</span>
      </div>
    </div>
  )

  return (
    <>
      <div id="main-content-section" className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-10 py-6 sm:py-8 space-y-8 sm:space-y-10">
        {error && <div className="alert-error">{error}</div>}

        {/* FORMULAIRE DE CRÉATION DE CONFÉRENCE (DÉPLIABLE EN 1 CLIC) */}
        {showCreateForm && (
          <div className="card p-5 sm:p-7 border border-line bg-surface shadow-xl space-y-4 animate-view-fade">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div>
                <h3 className="font-semibold text-base sm:text-lg text-fg">Nouvelle conférence universitaire</h3>
                <p className="text-xs text-muted mt-0.5">Créez votre manifestation scientifique pour l'université USTO-MB (format brouillon).</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="btn-ghost btn-sm text-xs flex items-center gap-1 text-muted hover:text-fg"
              >
                <XIcon size={16} />
                <span>Fermer</span>
              </button>
            </div>
            <EventForm
              submitLabel="Créer la conférence (Brouillon)"
              busyLabel="Création en cours…"
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
          <div className="space-y-8 sm:space-y-10 animate-view-fade">
            {/* CARTE HERO USTO-MB ARRONDIE DANS LA LARGEUR DU CONTENU */}
            <div className="hero relative overflow-hidden text-white rounded-3xl shadow-card border border-white/10">
              <img className="hero-photo hero-photo--usto" src={HERO_PHOTO.src} alt="" aria-hidden="true" decoding="async" />
              <div className="hero-glow" aria-hidden="true" />
              <div className="hero-dots" aria-hidden="true" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/10 pointer-events-none z-[1]" aria-hidden="true" />

              <div className="relative z-[2] px-6 sm:px-10 py-8 sm:py-12">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  {/* Colonne gauche : Salutation & Ligne contextuelle */}
                  <header className="hero-text space-y-3">
                    <div className="text-xs sm:text-sm text-white font-medium flex items-center gap-2 [text-shadow:_0_1px_4px_rgba(0,0,0,0.85)]">
                      <span className="first-letter:uppercase">{todayLabel}</span>
                      <span className="text-white/60">•</span>
                      <span className="text-white font-semibold tracking-wide [text-shadow:_0_1px_4px_rgba(0,0,0,0.95)]">USTO-MB, ORAN</span>
                    </div>

                    <div>
                      <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight">
                        Bonjour{firstName ? `, ${firstName}` : ''}
                      </h1>
                      <div className="mt-2.5 flex items-center gap-3 flex-wrap">
                        {todos.length > 0 ? (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMainTab('myspace')
                              const el = document.getElementById('main-content-section')
                              el?.scrollIntoView({ behavior: 'smooth' })
                            }}
                            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 text-xs sm:text-sm font-semibold text-white shadow-md hover:bg-white/25 hover:border-white/40 active:scale-95 transition-all"
                          >
                            <span className="w-2 h-2 rounded-full bg-warn" />
                            <span>
                              {todos.length} action{todos.length > 1 ? 's' : ''} prioritaire{todos.length > 1 ? 's' : ''} &rarr;
                            </span>
                          </button>
                        ) : (
                          <p className="text-white/80 text-xs sm:text-sm max-w-[60ch] leading-relaxed">
                            {!data
                              ? 'Chargement du portail des conférences…'
                              : 'Bienvenue sur votre portail académique. Retrouvez ici vos manifestations et vos travaux scientifiques.'}
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
                      <span>Proposer une conférence</span>
                    </button>
                  </div>
                </div>
              </div>
              <a
                href={HERO_PHOTO.page}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:block absolute right-4 bottom-3 text-xs text-white/50 hover:text-white/80 transition-colors"
              >
                {HERO_PHOTO.credit}
              </a>
            </div>

            {/* COMMUTATEUR MAÎTRE : DÉCOUVRIR vs MON ESPACE (SÉLECTEUR NEUTRE ÉPURÉ SOUS LE HERO) */}
            {renderTabSwitcher()}

            {/* CONFÉRENCE VEDETTE À LA UNE */}
            {featuredEvent && (
              <section className="card p-6 sm:p-8 border border-line bg-surface relative overflow-hidden shadow-card hover:border-black/20 dark:hover:border-white/[0.12] transition-all duration-300">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                  {/* Colonne gauche : texte et boutons (md:col-span-7) */}
                  <div className="md:col-span-7 space-y-4">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold w-fit self-start ${
                        featuredEvent.status === 'ongoing'
                          ? 'bg-ok/15 text-ok border border-ok/30'
                          : 'bg-accent/15 text-accent-ink border border-accent/30'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          featuredEvent.status === 'ongoing' ? 'bg-ok' : 'bg-accent'
                        }`} />
                        <span>{featuredEvent.status === 'ongoing' ? 'En cours' : 'Appel ouvert'}</span>
                      </span>
                    </div>

                    <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-fg leading-tight">
                      {featuredEvent.title}
                    </h2>

                    {featuredEvent.description && (
                      <p className="text-xs sm:text-sm text-muted line-clamp-2 leading-relaxed max-w-[75ch]">
                        {cleanDescription(featuredEvent.description)}
                      </p>
                    )}

                    <div className="flex items-center gap-2 text-xs text-muted">
                      <span className="num font-medium text-fg">
                        {formatDate(featuredEvent.start_date, { day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                      {featuredEvent.location && (
                        <>
                          <span>•</span>
                          <span>{featuredEvent.location}</span>
                        </>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() =>
                          onOpenEvent(featuredEvent.id, {
                            tab:
                              featuredEvent.status === 'ongoing' || featuredEvent.phase !== 'scientific'
                                ? 'program'
                                : 'scientific',
                          })
                        }
                        className="btn-sm text-xs sm:text-sm font-semibold shadow-xs flex items-center gap-2 active:scale-95 transition-all bg-[#1D1D1F] text-white hover:bg-black dark:bg-white dark:text-[#1D1D1F] dark:hover:bg-neutral-200 rounded-lg px-4 py-2"
                      >
                        <span>
                          {featuredEvent.status === 'ongoing' || featuredEvent.phase !== 'scientific'
                            ? 'Accéder au programme'
                            : 'Déposer une communication'}
                        </span>
                        <ArrowRightIcon size={14} weight="bold" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenEvent(featuredEvent.id)}
                        className="btn-ghost btn-sm text-xs sm:text-sm text-muted hover:text-fg"
                      >
                        Détails
                      </button>
                    </div>
                  </div>

                  {/* Colonne droite : visuel/couverture de la conférence (md:col-span-5) */}
                  <div className="md:col-span-5">
                    <div className="rounded-2xl overflow-hidden border border-line/50 shadow-xs">
                      <EventCover
                        seed={featuredEvent.id}
                        event={featuredEvent}
                        className="w-full h-48 sm:h-56 md:h-64 flex flex-col justify-between p-4 sm:p-5"
                      >
                        <div className="flex items-center justify-between gap-2 relative z-10">
                          <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-surface/90 dark:bg-[#222226] text-fg dark:text-white border border-line/60 backdrop-blur-xs w-fit self-start shrink-0">
                            {TYPE_LABELS[featuredEvent.type] || featuredEvent.type}
                          </span>
                          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-surface/90 dark:bg-[#222226] text-fg dark:text-white border border-line/60 shadow-xs w-fit self-start shrink-0">
                            USTO-MB
                          </span>
                        </div>
                        <div className="relative z-10 flex items-center justify-between text-xs">
                          <span className="font-semibold text-muted bg-surface/90 dark:bg-[#222226] border border-line/60 backdrop-blur-xs px-2.5 py-1 rounded-lg">
                            Actes & Archives
                          </span>
                        </div>
                      </EventCover>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* BARRE DE SOUS-CONTRÔLE : FILTRES + COMMUTATEUR GRILLE / AGENDA (OPTION 3) */}
            <div className="space-y-4 pt-2">
              <div className="flex flex-wrap items-baseline gap-2 mb-4">
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-fg dark:text-white">
                  Conférences.
                </h2>
                <span className="text-muted dark:text-[#A1A1AA] text-lg sm:text-2xl font-normal">
                  Appels et programmes du campus.
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {[
                    { id: 'all', label: `Toutes (${publicEvents.length})` },
                    ...(publicEvents.some((e) => e.status === 'ongoing')
                      ? [{ id: 'ongoing', label: `En direct (${publicEvents.filter((e) => e.status === 'ongoing').length})` }]
                      : []),
                    { id: 'scientific', label: `Appels ouverts (${publicEvents.filter((e) => e.phase === 'scientific').length})` },
                    { id: 'active', label: `Programmes actifs (${publicEvents.filter((e) => e.phase !== 'scientific').length})` },
                  ].map((chip) => (
                    <button
                      key={chip.id}
                      type="button"
                      onClick={() => setFilterChip(chip.id)}
                      className={`px-4 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-colors ${
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
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                      viewMode === 'grid'
                        ? 'bg-surface dark:bg-[#27272A] text-fg dark:text-white shadow-xs'
                        : 'text-muted dark:text-[#71717A] hover:text-fg dark:hover:text-white'
                    }`}
                  >
                    Grille
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('timeline')}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                      viewMode === 'timeline'
                        ? 'bg-surface dark:bg-[#27272A] text-fg dark:text-white shadow-xs'
                        : 'text-muted dark:text-[#71717A] hover:text-fg dark:hover:text-white'
                    }`}
                  >
                    Agenda
                  </button>
                </div>
              </div>
            </div>

            {/* VUE 1 : GRILLE VISUELLE */}
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredEvents.map((ev) => {
                  const isOngoing = ev.status === 'ongoing'
                  const isClosed = ['closed', 'archived'].includes(ev.status)
                  const isScientific = ev.phase === 'scientific' && !isOngoing && !isClosed
                  const dateStr = formatDate(ev.start_date, { day: 'numeric', month: 'short' })
                  const cityName = ev.location
                    ? ev.location.split(',').pop().trim().replace(/^Campus\s+/i, '') || 'Oran'
                    : 'Oran'
                  const cardTheme = isOngoing ? 'radar' : isScientific ? 'slate' : 'sand'

                  return (
                    <div
                      key={ev.id}
                      onClick={() => onOpenEvent(ev.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && onOpenEvent(ev.id)}
                      className="group card rounded-2xl overflow-hidden border border-line dark:border-white/10 bg-surface dark:bg-[#141416] hover:border-black/20 dark:hover:border-white/20 transition-all duration-200 flex flex-col justify-between cursor-pointer text-left shadow-xs hover:-translate-y-1 hover:shadow-lg"
                    >
                      <div>
                        <EventCover
                          event={ev}
                          seed={ev.id}
                          themeKey={cardTheme}
                          className="h-36 sm:h-40 px-4 py-3 flex flex-col justify-end relative overflow-hidden"
                        >
                          {isOngoing ? (
                            <span className="bg-black/60 backdrop-blur-xs text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1.5 shadow-xs w-fit">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              En cours
                            </span>
                          ) : isScientific ? (
                            <span className="bg-[#FFFDF5] text-[#9A6B1F] border border-[#F0E6D2] px-3.5 py-1 rounded-full text-xs font-medium shadow-xs w-fit">
                              Appel ouvert
                            </span>
                          ) : isClosed ? (
                            <span className="bg-white/80 dark:bg-black/60 text-muted px-3.5 py-1 rounded-full text-xs font-medium shadow-xs w-fit">
                              Clôturé
                            </span>
                          ) : (
                            <span className="bg-white/95 text-neutral-800 border border-black/10 px-3.5 py-1 rounded-full text-xs font-medium shadow-xs w-fit">
                              Programme actif
                            </span>
                          )}
                        </EventCover>

                        <div className="p-5 space-y-2">
                          <h3 className="font-bold text-fg dark:text-white text-base sm:text-[17px] leading-snug line-clamp-2">
                            {ev.title}
                          </h3>
                          {ev.description && (
                            <p className="text-xs text-muted dark:text-[#A1A1AA] line-clamp-2 leading-relaxed mt-2">
                              {cleanDescription(ev.description)}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="px-5 pb-5 pt-3 border-t border-line dark:border-white/5 flex items-center justify-between text-xs text-muted mt-2">
                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-surface-2 dark:bg-[#202024] text-xs font-medium text-muted dark:text-[#A1A1AA]">
                          {dateStr} • {cityName}
                        </span>
                        <span className="text-[#D4A017] hover:text-[#E5B53B] font-semibold text-xs shrink-0 group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-1 cursor-pointer">
                          {isScientific ? 'Déposer →' : 'Consulter →'}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              /* VUE 2 : AGENDA CHRONO (TIMELINE FOTMOB / RADAR) */
              <div className="space-y-3">
                {filteredEvents.map((ev) => {
                  const isOngoing = ev.status === 'ongoing'
                  const isClosed = ['closed', 'archived'].includes(ev.status)
                  const isScientific = ev.phase === 'scientific' && !isOngoing && !isClosed
                  const d = new Date(ev.start_date)
                  const dayNum = d.getDate()
                  const monthName = d.toLocaleString('fr-FR', { month: 'short' })
                  return (
                    <div
                      key={ev.id}
                      onClick={() => onOpenEvent(ev.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && onOpenEvent(ev.id)}
                      className="group card p-4 sm:p-5 border-line bg-surface hover:border-black/20 dark:hover:border-white/[0.12] transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:translate-x-1"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        {/* Bloc date jour */}
                        <div className="w-14 h-14 rounded-xl bg-surface-2 border border-line flex flex-col items-center justify-center shrink-0">
                          <span className="num text-lg font-bold text-fg leading-none font-mono">{dayNum}</span>
                          <span className="text-xs font-semibold text-muted leading-tight mt-0.5 capitalize">{monthName}</span>
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              isOngoing
                                ? 'bg-ok/15 text-ok border border-ok/30'
                                : isClosed
                                ? 'bg-surface-2 text-muted border border-line'
                                : isScientific
                                ? 'bg-accent/15 text-accent-ink border border-accent/30'
                                : 'bg-info/15 text-info border border-info/30'
                            }`}>
                              {isOngoing
                                ? 'En cours'
                                : isClosed
                                ? 'Clôturé'
                                : isScientific
                                ? 'Appel à communications'
                                : 'Programme actif'}
                            </span>
                            <span className="text-xs text-muted font-medium">
                              {TYPE_LABELS[ev.type] || ev.type}
                            </span>
                          </div>
                          <h3 className="font-semibold text-fg text-sm sm:text-base leading-snug line-clamp-1 group-hover:text-fg dark:group-hover:text-white transition-colors">
                            {ev.title}
                          </h3>
                          <p className="text-xs text-muted truncate mt-0.5">
                            {ev.location || 'Campus USTO-MB'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                        <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded-lg bg-surface-2 border border-line text-muted">
                          {countdown(ev)}
                        </span>
                        <span className={`${
                          isScientific ? 'btn-info' : 'btn-success'
                        } btn-sm text-xs font-semibold inline-flex items-center gap-1`}>
                          <span>{isScientific ? 'Soumettre' : 'Consulter'}</span>
                          <ArrowRightIcon size={12} weight="bold" />
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* ONGLET 2 : MON ESPACE (MODE TRAVAIL DIRECT SANS PHOTO HERO)              */}
        {/* ========================================================================= */}
        {activeMainTab === 'myspace' && (
          <div className="space-y-8 sm:space-y-10 animate-view-fade">
            {/* EN-TÊTE SOBRE MODE TRAVAIL */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-line">
              <div className="space-y-1">
                <div className="text-xs text-muted font-medium flex items-center gap-2">
                  <span className="first-letter:uppercase">{todayLabel}</span>
                  <span>•</span>
                  <span className="text-muted font-semibold">Espace Chercheur</span>
                </div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-fg">
                  Bonjour{firstName ? `, ${firstName}` : ''}
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
                  <span>Proposer une conférence</span>
                </button>
              </div>
            </div>

            {/* COMMUTATEUR MAÎTRE : DÉCOUVRIR vs MON ESPACE (SOUS L'EN-TÊTE) */}
            {renderTabSwitcher()}

            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-8 items-start">
              {/* Colonne gauche : Actions à faire & Mes articles */}
              <div className="space-y-8 sm:space-y-10">
                {/* Priorités & Livrables (affiché uniquement s'il y a des tâches) */}
                {todos.length > 0 ? (
                  <section className="space-y-3">
                    <SectionTitle
                      title="Priorités"
                      count={todos.length}
                    />

                    <div className="card rounded-2xl border border-line divide-y divide-line/60 overflow-hidden bg-surface shadow-xs">
                      {todos.map(({ key, category, detail, title, target }) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => open(target)}
                          className="group w-full text-left py-3.5 px-5 flex items-center justify-between gap-4 hover:bg-surface-2/60 transition-colors"
                        >
                          <div className="min-w-0 flex-1 flex items-start gap-3">
                            <span className="w-2 h-2 rounded-full bg-fg/40 dark:bg-white/60 shrink-0 mt-1.5" aria-hidden="true" />
                            <div className="min-w-0 flex-1 space-y-0.5">
                              <div className="flex items-center gap-2 text-xs text-muted">
                                <span className="font-semibold text-muted">{category}</span>
                                {detail && <span>• {detail}</span>}
                              </div>
                              <p className="font-semibold text-fg text-sm leading-snug truncate group-hover:text-fg dark:group-hover:text-white transition-colors">
                                {title}
                              </p>
                            </div>
                          </div>
                          <div className="shrink-0 flex items-center gap-1 text-xs font-medium text-muted group-hover:text-fg dark:group-hover:text-white transition-colors">
                            <span>Traiter</span>
                            <ArrowRightIcon size={13} weight="bold" className="transition-transform group-hover:translate-x-0.5" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </section>
                ) : (
                  <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-surface border border-line text-xs text-muted">
                    <CheckCircleIcon size={16} className="text-ok shrink-0" weight="bold" />
                    <span>Tout est à jour • Aucun livrable en attente</span>
                  </div>
                )}

                {/* Mes articles déposés */}
                <section className="space-y-3">
                  <SectionTitle
                    title="Articles scientifiques"
                    count={data ? data.subs.length : null}
                    actions={
                      acceptedCount > 0 ? (
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full badge-ok">
                          {plural(acceptedCount, 'communication acceptée', 'communications acceptées')}
                        </span>
                      ) : null
                    }
                  />

                  {!data ? (
                    <div className="skeleton h-24" />
                  ) : data.subs.length === 0 ? (
                    <EmptyState
                      compact
                      icon={ArticleIcon}
                      title="Aucun article soumis"
                      body="Ouvrez une conférence en phase scientifique pour déposer vos résumés de recherche."
                      action={
                        <button
                          type="button"
                          onClick={() => setActiveMainTab('discover')}
                          className="btn-outline btn-sm"
                        >
                          Consulter les appels ouverts
                        </button>
                      }
                    />
                  ) : (
                    <div className="card rounded-2xl border border-line divide-y divide-line/60 overflow-hidden bg-surface shadow-xs">
                      {data.subs.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => onOpenEvent(s.event_id, { tab: 'scientific' })}
                          className="group w-full text-left py-3.5 px-5 flex items-center justify-between gap-4 hover:bg-surface-2/60 transition-colors"
                        >
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <div className="flex items-center gap-2 text-xs">
                              <span
                                className="font-semibold px-2 py-0.5 rounded-full text-[11px]"
                                style={{
                                  color: SUBMISSION_COLOR[s.status],
                                  background: `color-mix(in srgb, ${SUBMISSION_COLOR[s.status]} 15%, transparent)`,
                                }}
                              >
                                {statusOf(s)}
                              </span>
                              <span className="text-muted truncate">{s.events?.title}</span>
                            </div>
                            <p className="font-semibold text-fg text-sm leading-snug truncate group-hover:text-fg dark:group-hover:text-white transition-colors">
                              {s.title}
                            </p>
                          </div>
                          <div className="shrink-0 flex items-center gap-3">
                            <span className="text-xs text-faint num">
                              {formatDate(s.submitted_at, { day: 'numeric', month: 'short' })}
                            </span>
                            <ArrowRightIcon size={13} weight="bold" className="text-muted group-hover:text-fg dark:group-hover:text-white transition-transform group-hover:translate-x-0.5" />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </section>
              </div>

              {/* Colonne droite : Badge d'accès & Conférences suivies */}
              <div className="space-y-8 sm:space-y-10">
                {/* Badge d'accès numérique */}
                <section className="card p-5 border-line bg-surface space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold text-sm sm:text-base text-fg flex items-center gap-2">
                      <ShieldCheckIcon size={16} className="text-muted" weight="bold" />
                      <span>Badge d'accès</span>
                    </h3>
                    {validatedParticipation && (
                      <span className="badge badge-ok">Pass actif</span>
                    )}
                  </div>

                  {validatedParticipation ? (
                    <div className="p-4 rounded-xl border border-line bg-surface-2 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <span className="text-xs font-medium text-muted">Participant validé</span>
                          <p className="font-bold text-sm text-fg mt-0.5">{validatedParticipation.events?.title}</p>
                          <p className="text-xs text-muted">{validatedParticipation.events?.location || 'Campus USTO-MB'}</p>
                        </div>
                        <span className="w-12 h-12 rounded-lg bg-surface border border-line flex items-center justify-center text-fg shrink-0">
                          <QrCodeIcon size={26} weight="duotone" />
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onOpenEvent(validatedParticipation.event_id, { tab: 'overview' })}
                        className="btn-outline btn-sm text-xs w-full justify-center mt-2 shadow-xs"
                      >
                        Afficher mon badge QR complet
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-muted leading-relaxed">
                      Dès que votre inscription à une conférence est validée, votre badge d'accès numérique avec QR code s'affiche ici pour émarger en amphithéâtre.
                    </p>
                  )}
                </section>

              {/* Mes conférences actives */}
              <section className="space-y-3">
                <SectionTitle
                  title="Mes conférences"
                  count={data ? data.parts.length : null}
                  actions={
                    <button
                      type="button"
                      onClick={() => setActiveMainTab('discover')}
                      className="btn-ghost btn-sm -mr-2 text-xs"
                    >
                      Catalogue
                    </button>
                  }
                />

                {!data ? (
                  <div className="skeleton h-36" />
                ) : data.parts.length === 0 ? (
                  <EmptyState
                    compact
                    icon={CalendarBlankIcon}
                    title="Aucune conférence active"
                    body="Inscrivez-vous à une conférence ou soumettez un article scientifique."
                    action={
                      <button
                        type="button"
                        onClick={() => setActiveMainTab('discover')}
                        className="btn-outline btn-sm"
                      >
                        Voir les événements USTO
                      </button>
                    }
                  />
                ) : (
                  <div className="card rounded-2xl border border-line divide-y divide-line/60 overflow-hidden bg-surface shadow-xs">
                    {data.parts
                      .slice()
                      .sort((a, b) => (a.events.start_date || '').localeCompare(b.events.start_date || ''))
                      .map((p) => (
                        <button
                          key={p.event_id}
                          type="button"
                          onClick={() => onOpenEvent(p.event_id)}
                          className="group w-full text-left py-3.5 px-5 flex items-center gap-3 hover:bg-surface-2/60 transition-colors"
                        >
                          <span className="w-9 h-9 rounded-xl shrink-0" style={coverStyle(p.events || p.event_id)} aria-hidden="true" />
                          <span className="min-w-0 flex-1">
                            <span className="block font-semibold text-fg text-sm truncate group-hover:text-fg dark:group-hover:text-white transition-colors">
                              {p.events.title}
                            </span>
                            <span className="block text-xs text-muted num mt-0.5">
                              {formatDate(p.events.start_date, { day: 'numeric', month: 'short' })}
                              {p.events.phase ? ` • ${PHASE_LABELS[p.events.phase]?.replace('Phase ', '') || ''}` : ''}
                            </span>
                          </span>
                          <span className="flex items-center gap-2 shrink-0">
                            <span className="text-xs font-medium text-muted hidden sm:inline">{ROLE_LABELS[p.role_in_event]}</span>
                            <span className={STATUS_BADGE[p.events.status] || 'badge-draft'}>
                              {STATUS_LABELS[p.events.status]}
                            </span>
                            <ArrowRightIcon size={13} weight="bold" className="text-muted group-hover:text-fg dark:group-hover:text-white transition-transform group-hover:translate-x-0.5" />
                          </span>
                        </button>
                      ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  )
}
