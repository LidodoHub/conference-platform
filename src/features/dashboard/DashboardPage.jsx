import { useState, useEffect, useCallback } from 'react'
import {
  ArticleIcon,
  UserIcon,
  ArrowRightIcon,
  CompassIcon,
  CalendarBlankIcon,
  SquaresFourIcon,
  MapPinIcon,
  CheckCircleIcon,
  QrCodeIcon,
  ShieldCheckIcon,
  SparkleIcon,
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

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. HERO BANNER : PRESTIGE USTO & COCKPIT CHERCHEUR                       */}
      {/* ========================================================================= */}
      <section className="hero relative overflow-hidden text-white">
        <img className="hero-photo hero-photo--usto" src={HERO_PHOTO.src} alt="" aria-hidden="true" decoding="async" />
        <div className="hero-shade" aria-hidden="true" />
        <div className="hero-glow" aria-hidden="true" />
        <div className="hero-dots" aria-hidden="true" />

        <div className="relative max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-10 pt-7 pb-8 sm:pt-9 sm:pb-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            {/* Colonne gauche : Salutation & Ligne contextuelle */}
            <header className="hero-text space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-navy/75 backdrop-blur-sm border border-white/15 text-xs text-white/90 shadow-sm">
                <span className="first-letter:uppercase font-medium">{todayLabel}</span>
                <span className="text-white/40">•</span>
                <span className="text-accent font-semibold tracking-wide">USTO-MB, ORAN</span>
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
                      className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-navy/85 backdrop-blur-sm border border-accent/40 text-xs sm:text-sm font-semibold text-white shadow-md hover:bg-navy hover:border-accent active:scale-95 transition-all"
                    >
                      <span className="w-2 h-2 rounded-full bg-warn animate-pulse" />
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
                className="btn-accent btn-sm sm:btn-base px-5 py-2.5 text-xs sm:text-sm font-bold shadow-lift inline-flex items-center gap-2 cursor-pointer transition-all active:scale-95"
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
          className="hidden sm:block absolute right-3 bottom-2 text-[10px] text-white/45 hover:text-white/80 transition-colors"
        >
          {HERO_PHOTO.credit}
        </a>
      </section>

      {/* ========================================================================= */}
      {/* 2. LE MASTER HYBRID : CONTENU VIVANT SANS ZÉROS PARASITES                */}
      {/* ========================================================================= */}
      <div id="main-content-section" className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-10 py-6 sm:py-8 space-y-6">
        {error && <div className="alert-error">{error}</div>}

        {/* FORMULAIRE DE CRÉATION DE CONFÉRENCE (DÉPLIABLE EN 1 CLIC) */}
        {showCreateForm && (
          <div className="card p-5 sm:p-7 border border-accent/40 bg-surface shadow-xl space-y-4 animate-view-fade">
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

        {/* COMMUTATEUR MAÎTRE : DÉCOUVRIR vs MON ESPACE */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 pb-4 border-b border-line/60">
          <div className="inline-flex items-center bg-surface-2/90 dark:bg-surface-2/95 p-1 sm:p-1.5 rounded-2xl border border-line shadow-xs backdrop-blur-md gap-1 max-w-full overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveMainTab('discover')}
              aria-selected={activeMainTab === 'discover'}
              className={`flex items-center gap-2 px-4 sm:px-6 py-2 rounded-xl text-sm font-bold transition-all duration-200 select-none ${
                activeMainTab === 'discover'
                  ? 'bg-surface text-fg shadow-sm ring-1 ring-accent/30'
                  : 'text-muted hover:text-fg hover:bg-surface/50'
              }`}
            >
              <CompassIcon
                size={18}
                weight={activeMainTab === 'discover' ? 'duotone' : 'regular'}
                className={activeMainTab === 'discover' ? 'text-accent-ink' : 'text-faint'}
              />
              <span className="tracking-tight">Découvrir & Conférences</span>
              <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full transition-colors ${
                activeMainTab === 'discover'
                  ? 'bg-accent text-on-accent shadow-xs'
                  : 'bg-surface border border-line text-muted'
              }`}>
                {publicEvents.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMainTab('myspace')}
              aria-selected={activeMainTab === 'myspace'}
              className={`flex items-center gap-2 px-4 sm:px-6 py-2 rounded-xl text-sm font-bold transition-all duration-200 select-none ${
                activeMainTab === 'myspace'
                  ? 'bg-surface text-fg shadow-sm ring-1 ring-accent/30'
                  : 'text-muted hover:text-fg hover:bg-surface/50'
              }`}
            >
              <UserIcon
                size={18}
                weight={activeMainTab === 'myspace' ? 'duotone' : 'regular'}
                className={activeMainTab === 'myspace' ? 'text-accent-ink' : 'text-faint'}
              />
              <span className="tracking-tight">Mon Espace</span>
              {todos.length > 0 && (
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-warn text-white shadow-xs animate-pulse">
                  {todos.length} à traiter
                </span>
              )}
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs text-muted shrink-0">
            <span className="font-semibold text-fg/80">Campus USTO-MB</span>
            <span>•</span>
            <span className="text-accent-ink font-medium">2026/2027</span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ONGLET 1 : DÉCOUVRIR & CATALOGUE OFFICIEL (OPTION 1 + OPTION 3)          */}
        {/* ========================================================================= */}
        {activeMainTab === 'discover' && (
          <div className="space-y-7 animate-view-fade">
            {/* CONFÉRENCE VEDETTE À LA UNE (OPTION 1) */}
            {featuredEvent && (
              <section className="card p-6 sm:p-8 border border-line bg-gradient-to-br from-surface to-surface-2 relative overflow-hidden shadow-card hover:border-accent/40 transition-all duration-300">
                <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6 items-center relative z-10">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[11px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md inline-flex items-center gap-1.5 ${
                        featuredEvent.status === 'ongoing'
                          ? 'bg-ok/20 text-ok border border-ok/40'
                          : 'bg-accent/15 text-accent-ink border border-accent/30'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                          featuredEvent.status === 'ongoing' ? 'bg-ok' : 'bg-accent'
                        }`} />
                        {featuredEvent.status === 'ongoing'
                          ? 'Conférence en cours • Jour J'
                          : featuredEvent.phase === 'scientific'
                            ? 'Appel à communications ouvert • USTO-MB'
                            : 'Programme officiel actif'}
                      </span>
                      <span className="text-xs font-semibold text-muted">
                        {TYPE_LABELS[featuredEvent.type] || featuredEvent.type}
                      </span>
                    </div>

                    <h2 className="text-xl sm:text-3xl font-bold tracking-tight text-fg leading-tight">
                      {featuredEvent.title}
                    </h2>

                    {featuredEvent.description && (
                      <p className="text-xs sm:text-sm text-muted line-clamp-3 leading-relaxed max-w-[68ch]">
                        {cleanDescription(featuredEvent.description)}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted pt-1">
                      <span className="flex items-center gap-1.5">
                        <CalendarBlankIcon size={14} className="text-accent-ink shrink-0" />
                        <strong className="text-fg">{formatDate(featuredEvent.start_date)}</strong>
                      </span>
                      {featuredEvent.location && (
                        <span className="flex items-center gap-1.5">
                          <MapPinIcon size={14} className="text-accent-ink shrink-0" />
                          <span>{featuredEvent.location}</span>
                        </span>
                      )}
                      <span className="flex items-center gap-1.5">
                        <SparkleIcon size={14} className="text-accent-ink shrink-0" />
                        <span>Actes & Recueil PDF</span>
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pt-3">
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
                        className={`${
                          featuredEvent.status === 'ongoing' || featuredEvent.phase !== 'scientific'
                            ? 'btn-success'
                            : 'btn-info'
                        } btn-sm text-xs sm:text-sm font-semibold shadow-xs flex items-center gap-2 active:scale-95 transition-all`}
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
                        className="btn-outline btn-sm text-xs sm:text-sm"
                      >
                        Détails & Plan d'accès
                      </button>
                    </div>
                  </div>

                  {/* Carte latérale de deadline */}
                  <div className="p-5 rounded-2xl border border-line bg-surface/90 text-center space-y-2 shadow-sm">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted block">
                      {featuredEvent.status === 'ongoing' || featuredEvent.phase !== 'scientific'
                        ? "Statut de l'événement"
                        : 'Date limite de soumission'}
                    </span>
                    <div className="num text-4xl sm:text-5xl font-extrabold text-accent-ink tracking-tight font-mono">
                      {countdown(featuredEvent)}
                    </div>
                    <p className="text-xs text-muted">
                      {featuredEvent.status === 'ongoing' || featuredEvent.phase !== 'scientific'
                        ? 'Accès aux amphis sur badge QR'
                        : 'Arbitrage par les pairs en double aveugle'}
                    </p>
                    <div className="pt-2">
                      <span className="badge badge-accent w-full justify-center py-1">
                        {STATUS_LABELS[featuredEvent.status] || 'Publiée'}
                      </span>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* BARRE DE SOUS-CONTRÔLE : FILTRES + COMMUTATEUR GRILLE / AGENDA (OPTION 3) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {[
                  { id: 'all', label: `Toutes (${publicEvents.length})` },
                  ...(publicEvents.some((e) => e.status === 'ongoing')
                    ? [{ id: 'ongoing', label: `En direct (${publicEvents.filter((e) => e.status === 'ongoing').length})` }]
                    : []),
                  { id: 'scientific', label: `Appels ouverts (${publicEvents.filter((e) => e.phase === 'scientific').length})` },
                  { id: 'active', label: `Programmes actifs (${publicEvents.filter((e) => e.phase !== 'scientific').length})` },
                  { id: 'usto', label: `Campus USTO (${publicEvents.filter((e) => (e.location || '').toLowerCase().includes('usto')).length})` },
                ].map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setFilterChip(chip.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-colors ${
                      filterChip === chip.id
                        ? 'bg-accent text-on-accent'
                        : 'bg-surface border border-line text-muted hover:text-fg'
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              {/* Commutateur Grille vs Chrono */}
              <div className="flex items-center bg-surface-2 p-1 rounded-xl border border-line gap-1 shrink-0 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    viewMode === 'grid' ? 'bg-surface text-fg shadow-xs' : 'text-muted hover:text-fg'
                  }`}
                >
                  <SquaresFourIcon size={14} weight={viewMode === 'grid' ? 'fill' : 'regular'} />
                  <span>Grille Cartes</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('timeline')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    viewMode === 'timeline' ? 'bg-surface text-fg shadow-xs' : 'text-muted hover:text-fg'
                  }`}
                >
                  <CalendarBlankIcon size={14} weight={viewMode === 'timeline' ? 'fill' : 'regular'} />
                  <span>Agenda Chrono</span>
                </button>
              </div>
            </div>

            {/* VUE 1 : GRILLE VISUELLE */}
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredEvents.map((ev) => {
                  const isScientific = ev.phase === 'scientific'
                  return (
                    <div
                      key={ev.id}
                      onClick={() => onOpenEvent(ev.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && onOpenEvent(ev.id)}
                      className="group card overflow-hidden border-line bg-surface/80 hover:bg-surface hover:border-accent/60 transition-all duration-300 flex flex-col justify-between cursor-pointer text-left shadow-xs hover:-translate-y-1 hover:shadow-lg"
                    >
                      <div>
                        <EventCover
                          event={ev}
                          seed={ev.id}
                          className="h-28 px-4 py-3 flex items-start justify-between relative overflow-hidden"
                        >
                          <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/40 text-white backdrop-blur-xs">
                            {TYPE_LABELS[ev.type] || ev.type}
                          </span>
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-accent text-on-accent shadow-xs">
                            {isScientific ? 'Appel ouvert' : 'Programme actif'}
                          </span>
                        </EventCover>

                        <div className="p-4 space-y-2">
                          <h3 className="font-semibold text-fg text-sm sm:text-base leading-snug line-clamp-2 group-hover:text-accent-ink transition-colors">
                            {ev.title}
                          </h3>
                          {ev.description && (
                            <p className="text-xs text-muted line-clamp-2 leading-relaxed">
                              {cleanDescription(ev.description)}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="px-4 pb-4 pt-2 border-t border-line/60 flex items-center justify-between text-xs text-muted mt-2">
                        <span className="truncate">
                          {formatDate(ev.start_date, { day: 'numeric', month: 'short' })}
                          {ev.location ? ` • ${ev.location}` : ''}
                        </span>
                        <span className="text-accent-ink font-semibold shrink-0 group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-1">
                          {isScientific ? 'Déposer' : 'Consulter'}
                          <ArrowRightIcon size={12} weight="bold" />
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
                  const isScientific = ev.phase === 'scientific'
                  const d = new Date(ev.start_date)
                  const dayNum = d.getDate()
                  const monthName = d.toLocaleString('fr-FR', { month: 'short' }).toUpperCase()
                  return (
                    <div
                      key={ev.id}
                      onClick={() => onOpenEvent(ev.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && onOpenEvent(ev.id)}
                      className="group card p-4 sm:p-5 border-line bg-surface/80 hover:bg-surface hover:border-accent/60 transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:translate-x-1"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        {/* Bloc date jour */}
                        <div className="w-14 h-14 rounded-xl bg-surface-2 border border-line flex flex-col items-center justify-center shrink-0">
                          <span className="num text-lg font-bold text-fg leading-none font-mono">{dayNum}</span>
                          <span className="text-[10px] font-bold text-accent-ink uppercase leading-tight mt-0.5">{monthName}</span>
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.2 rounded-full ${
                              isScientific ? 'bg-accent/15 text-accent-ink border border-accent/30' : 'bg-ok/15 text-ok border border-ok/30'
                            }`}>
                              {isScientific ? 'Appel à communications' : 'Programme actif'}
                            </span>
                            <span className="text-xs text-muted font-medium">
                              {TYPE_LABELS[ev.type] || ev.type}
                            </span>
                          </div>
                          <h3 className="font-semibold text-fg text-sm sm:text-base leading-snug line-clamp-1 group-hover:text-accent-ink transition-colors">
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
                          <span>{isScientific ? 'Soumettre' : 'Programme'}</span>
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
        {/* ONGLET 2 : MON ESPACE (PILOTAGE ADAPTÉ AU RÔLE)                          */}
        {/* ========================================================================= */}
        {activeMainTab === 'myspace' && (
          <div className="space-y-6 animate-view-fade">
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-8 items-start">
              {/* Colonne gauche : Actions à faire & Mes articles */}
              <div className="space-y-6">
                {/* Priorités & Livrables (affiché uniquement s'il y a des tâches) */}
                {todos.length > 0 ? (
                  <section className="space-y-3">
                    <SectionTitle
                      title="Priorités & Livrables"
                      count={todos.length}
                    />

                    <ul className="space-y-2.5">
                      {todos.map(({ key, category, borderClass, badgeClass, title, detail, target }, i) => (
                        <li key={key} className="rise" style={{ '--i': i }}>
                          <button
                            type="button"
                            onClick={() => open(target)}
                            className={`group w-full text-left card p-4 border-line bg-surface/80 hover:bg-surface hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-l-4 ${borderClass}`}
                          >
                            <div className="space-y-1 min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${badgeClass}`}>
                                  {category}
                                </span>
                                {detail && (
                                  <span className="text-xs font-medium text-muted truncate">
                                    • {detail}
                                  </span>
                                )}
                              </div>
                              <p className="font-semibold text-fg text-sm leading-snug">
                                {title}
                              </p>
                            </div>
                            <div className="shrink-0 self-end sm:self-center pt-2 sm:pt-0">
                              <span className="btn-warning btn-sm text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs">
                                <span>Traiter</span>
                                <ArrowRightIcon size={12} weight="bold" />
                              </span>
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : (
                  <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-surface/60 border border-line/60 text-xs text-muted">
                    <CheckCircleIcon size={16} className="text-ok shrink-0" weight="bold" />
                    <span>Tout est à jour • Aucun livrable en attente</span>
                  </div>
                )}

                {/* Mes articles déposés */}
                <section className="space-y-3">
                  <SectionTitle
                    title="Mes articles scientifiques"
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
                    <ul className="space-y-2.5">
                      {data.subs.map((s) => (
                        <li key={s.id}>
                          <button
                            type="button"
                            onClick={() => onOpenEvent(s.event_id, { tab: 'scientific' })}
                            className="entity w-full text-left hover:border-accent/60 transition-all p-3.5 shadow-xs"
                            style={{ '--stripe': SUBMISSION_COLOR[s.status] }}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span
                                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                                style={{
                                  color: SUBMISSION_COLOR[s.status],
                                  background: `color-mix(in srgb, ${SUBMISSION_COLOR[s.status]} 15%, transparent)`,
                                }}
                              >
                                {statusOf(s)}
                              </span>
                              <span className="text-xs text-faint num">
                                {formatDate(s.submitted_at, { day: 'numeric', month: 'short' })}
                              </span>
                            </div>
                            <span className="block mt-1.5 font-semibold text-fg text-sm leading-snug line-clamp-1">
                              {s.title}
                            </span>
                            <span className="block text-xs text-muted truncate mt-0.5">{s.events?.title}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>

              {/* Colonne droite : Badge d'accès & Conférences suivies */}
              <div className="space-y-6">
                {/* Badge d'accès numérique */}
                <section className="card p-5 border-line bg-surface/80 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-sm text-fg flex items-center gap-2">
                      <ShieldCheckIcon size={16} className="text-accent-ink" weight="bold" />
                      Badge d'Accès Numérique
                    </h3>
                    {validatedParticipation && (
                      <span className="badge badge-ok">Pass Actif</span>
                    )}
                  </div>

                  {validatedParticipation ? (
                    <div className="p-4 rounded-xl border border-accent/40 bg-gradient-to-br from-accent/10 to-surface-2 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <span className="text-[11px] font-bold text-accent-ink uppercase">Participant Validé</span>
                          <p className="font-bold text-sm text-fg mt-0.5">{validatedParticipation.events?.title}</p>
                          <p className="text-xs text-muted">{validatedParticipation.events?.location || 'Campus USTO-MB'}</p>
                        </div>
                        <span className="w-12 h-12 rounded-lg bg-surface border border-line flex items-center justify-center text-accent-ink shrink-0">
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
                  <ul className="card divide-y divide-line overflow-hidden border-line">
                    {data.parts
                      .slice()
                      .sort((a, b) => (a.events.start_date || '').localeCompare(b.events.start_date || ''))
                      .map((p) => (
                        <li key={p.event_id}>
                          <button
                            type="button"
                            onClick={() => onOpenEvent(p.event_id)}
                            className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-fg/4 transition-colors"
                          >
                            <span className="w-9 h-9 rounded-xl shrink-0" style={coverStyle(p.events || p.event_id)} aria-hidden="true" />
                            <span className="min-w-0 flex-1">
                              <span className="block font-medium text-fg text-sm truncate">{p.events.title}</span>
                              <span className="block text-xs text-muted num mt-0.5">
                                {formatDate(p.events.start_date, { day: 'numeric', month: 'short' })}
                                {', '}
                                {PHASE_LABELS[p.events.phase]?.replace('Phase ', '') || ''}
                              </span>
                            </span>
                            <span className="flex flex-col items-end gap-1 shrink-0">
                              <span className="text-[11px] font-semibold text-accent-ink">{ROLE_LABELS[p.role_in_event]}</span>
                              <span className={STATUS_BADGE[p.events.status] || 'badge-draft'}>
                                {STATUS_LABELS[p.events.status]}
                              </span>
                            </span>
                          </button>
                        </li>
                      ))}
                  </ul>
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
