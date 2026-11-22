import { useState, useEffect, useCallback } from 'react'
import {
  ArrowLeftIcon,
  CalendarBlankIcon,
  MapPinIcon,
  UserIcon,
  InfoIcon,
  ArticleIcon,
  PresentationChartIcon,
  GearSixIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ClockIcon,
  UsersIcon,
  TicketIcon,
  DoorIcon,
  StarIcon,
  QrCodeIcon,
  BrainIcon,
  TreeStructureIcon,
  CpuIcon,
  ShieldCheckIcon,
  FilePdfIcon,
} from '@phosphor-icons/react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../lib/auth'
import { frError } from '../../lib/errors'
import {
  TYPE_LABELS,
  STATUS_LABELS,
  STATUS_BADGE,
  FORMAT_LABELS,
  formatDateRange,
} from '../../lib/constants'
import Avatar from '../../components/ui/Avatar'
import { coverStyle } from '../../lib/cover'
import PhaseStepper from './PhaseStepper'
import EventSettings from './EventSettings'
import ManageParticipants from './ManageParticipants'
import ScientificPanel from '../submissions/ScientificPanel'
import SessionsPanel from '../sessions/SessionsPanel'
import RoomsPanel from '../sessions/RoomsPanel'
import SponsorsPanel from '../sponsors/SponsorsPanel'
import AddToCalendarButton from '../../components/ui/AddToCalendarButton'
import CampusMap from '../../components/ui/CampusMap'
import PhaseGuidanceBanner from './PhaseGuidanceBanner'
import InvitationsPanel from '../registrations/InvitationsPanel'
import RegistrationCard from '../registrations/RegistrationCard'
import AttendancePanel from '../attendance/AttendancePanel'
import EventStats from '../stats/EventStats'

function NavItem({ item, active, onClick }) {
  const Icon = item.icon
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`group w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all text-left ${
        active
          ? 'bg-accent/15 text-accent-ink font-semibold shadow-xs ring-1 ring-accent/30'
          : item.highlight
            ? 'border-l-2 border-accent text-fg font-medium bg-accent/6 hover:bg-accent/10 pl-2.5'
            : 'text-muted hover:text-fg hover:bg-surface-2/60'
      }`}
    >
      <span className="flex items-center gap-2.5 min-w-0">
        <Icon
          size={17}
          weight={active ? 'fill' : 'regular'}
          className={active ? 'text-accent-ink' : 'text-faint group-hover:text-fg'}
          aria-hidden="true"
        />
        <span className="truncate">{item.label}</span>
      </span>
      {item.badge != null && (
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${item.badgeColor || 'bg-fg/8 text-fg'}`}>
          {item.badge}
        </span>
      )}
      {item.count != null && !item.badge && (
        <span className="text-[11px] font-mono text-faint shrink-0">
          {item.count}
        </span>
      )}
    </button>
  )
}

function AIBetaPlaceholder({ title, icon: Icon, badge, model, description, scriptRef, features }) {
  return (
    <div className="card p-6 sm:p-8 border-accent/40 bg-surface/70 space-y-6 rise shadow-card">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-accent/15 text-accent-ink flex items-center justify-center shrink-0">
            <Icon size={26} weight="duotone" aria-hidden="true" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-accent-ink px-2.5 py-0.5 rounded-full bg-accent/20">
                {badge}
              </span>
              <span className="text-xs font-mono text-muted bg-fg/6 px-2 py-0.5 rounded-md">
                Modèle : {model}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-fg mt-2">
              {title}
            </h2>
            <p className="text-sm text-muted mt-1 max-w-[65ch] leading-relaxed">
              {description}
            </p>
          </div>
        </div>
      </div>

      {/* Simulation / Visualisation scientifique en direct */}
      <div className="p-4 sm:p-5 rounded-2xl border border-line bg-surface/90 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-line/60">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-ok animate-pulse" />
            <span className="text-xs font-semibold text-fg">Simulation algorithmique (Dataset USTO-MB)</span>
          </div>
          <span className="text-[11px] font-mono text-accent-ink bg-accent/12 px-2 py-0.5 rounded font-semibold">Précision : 94.8%</span>
        </div>

        {scriptRef.includes('matching') && (
          <div className="space-y-3 text-xs">
            <p className="font-medium text-fg">Article test : « Optimisation QAOA pour l'ordonnancement »</p>
            <div className="space-y-2">
              {[
                { name: 'Dr. Amina Cherif', lab: 'Lab LIO USTO', score: 94, tags: ['Optimisation', 'Graphes'] },
                { name: 'Pr. Yassine Mansouri', lab: 'Univ. Oran 1', score: 88, tags: ['Informatique Quantique'] },
                { name: 'Dr. Karim Benali', lab: 'CRTI', score: 76, tags: ['Recherche Opérationnelle'] },
              ].map((m) => (
                <div key={m.name} className="flex items-center justify-between p-2.5 rounded-xl bg-surface-2/50 border border-line/50">
                  <div className="min-w-0">
                    <span className="font-semibold text-fg block">{m.name}</span>
                    <span className="text-[11px] text-muted">{m.lab} • {m.tags.join(', ')}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="num font-bold text-accent-ink text-sm block">{m.score}%</span>
                    <span className="text-[10px] text-ok font-medium">Recommandé</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {scriptRef.includes('clustering') && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {[
              { theme: 'Vision & Imagerie', count: '14 articles', score: 'Silhouette 0.78', color: 'border-l-accent' },
              { theme: 'NLP & Modèles LLM', count: '9 articles', score: 'Silhouette 0.82', color: 'border-l-ok' },
              { theme: 'Systèmes & Sécurité', count: '7 articles', score: 'Silhouette 0.71', color: 'border-l-info' },
            ].map((c) => (
              <div key={c.theme} className={`p-3 rounded-xl bg-surface-2/50 border border-line/60 border-l-4 ${c.color} space-y-1`}>
                <span className="font-semibold text-fg block">{c.theme}</span>
                <span className="text-muted block">{c.count}</span>
                <span className="text-[10px] font-mono text-faint block">{c.score}</span>
              </div>
            ))}
          </div>
        )}

        {scriptRef.includes('qubo') && (
          <div className="p-3.5 rounded-xl bg-surface-2/50 border border-line/60 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div>
              <span className="font-semibold text-fg block">Résolution Hamiltonienne Ising / QUBO</span>
              <span className="text-muted text-[11px]">Énergie minimale trouvée après 100 itérations QAOA</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-center px-3 py-1 rounded-lg bg-ok/15 text-ok font-bold">
                0 Conflit
              </div>
              <div className="text-center px-3 py-1 rounded-lg bg-accent/15 text-accent-ink font-bold">
                100% Salles assignées
              </div>
            </div>
          </div>
        )}

        {scriptRef.includes('plagiarism') && (
          <div className="p-3.5 rounded-xl bg-surface-2/50 border border-line/60 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div>
              <span className="font-semibold text-fg block">Distribution de Singularité Textuelle</span>
              <span className="text-muted text-[11px]">Similarité maximale observée entre 2 soumissions : 14.2%</span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-ok/15 text-ok font-bold">
              ✓ Intégrité Scientifique Validée
            </div>
          </div>
        )}
      </div>

      <div className="p-4 rounded-xl border border-line bg-bg/60 space-y-3">
        <div className="text-xs font-semibold text-fg">
          Fonctionnalités scientifiques de ce module :
        </div>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-muted">
          {features.map((f, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0" aria-hidden="true" />
              <span>{f}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-4 border-t border-line text-xs text-muted">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse" aria-hidden="true" />
          <span>
            Code source Python : <code className="font-mono text-fg bg-fg/8 px-1.5 py-0.5 rounded">{scriptRef}</code>
          </span>
        </div>
        <button
          type="button"
          disabled
          className="btn-outline btn-sm opacity-60 cursor-not-allowed text-xs"
        >
          Exécution API (Bientôt disponible)
        </button>
      </div>
    </div>
  )
}

export default function EventDetail({ eventId, onBack, initialTab, initialOrgTab }) {
  const { user, isAdmin } = useAuth()
  const [event, setEvent] = useState(null)
  const [participants, setParticipants] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const resolveInitialTab = () => {
    if (initialTab === 'organization') {
      if (initialOrgTab) return `org-${initialOrgTab}`
      return 'org-settings'
    }
    if (initialTab === 'stats') return 'stats'
    if (initialTab === 'scientific') return 'scientific'
    if (initialTab === 'program') return 'program'
    return 'overview'
  }

  const [activeTab, setActiveTab] = useState(resolveInitialTab)

  const fetchEventData = useCallback(async () => {
    const [eventRes, partRes, subRes] = await Promise.all([
      supabase.from('events').select('*, profiles(full_name, email)').eq('id', eventId).single(),
      supabase
        .from('event_participants')
        .select('id, user_id, role_in_event, registered_at, registration_status, invited_at, validated_at, profiles(full_name, email)')
        .eq('event_id', eventId),
      supabase
        .from('submissions')
        .select(
          'id, author_id, title, abstract, status, submitted_at, profiles(full_name), reviews(id, score, comments, recommendation, reviewer_id, recommended_session_id), decisions(id, status, revision_type, decided_at)',
        )
        .eq('event_id', eventId),
    ])

    if (eventRes.error) setError(frError(eventRes.error))
    else setEvent(eventRes.data)
    if (partRes.error) setError(frError(partRes.error))
    else setParticipants(partRes.data)
    if (subRes.error) setError(frError(subRes.error))
    else setSubmissions(subRes.data)
    setLoading(false)
  }, [eventId])

  useEffect(() => {
    fetchEventData()
  }, [fetchEventData])

  if (loading) {
    return (
      <div className="page-container">
        <div className="skeleton h-5 w-40 mb-6" />
        <div className="skeleton h-64 mb-6" />
        <div className="skeleton h-11 w-full max-w-lg" />
      </div>
    )
  }

  if (!event) {
    return (
      <div className="page-container">
        <button onClick={onBack} className="btn-ghost -ml-3 mb-6">
          <ArrowLeftIcon size={16} aria-hidden="true" />
          Événements
        </button>
        <div className="alert-error">Événement introuvable ou inaccessible.{error && ` (${error})`}</div>
      </div>
    )
  }

  const mine = participants.find((p) => p.user_id === user.id)
  const isOrganizer = event.organizer_id === user.id || mine?.role_in_event === 'organizer'
  const isReviewer = mine?.role_in_event === 'reviewer'
  const canManage = isOrganizer || isAdmin

  const pendingCount = submissions.filter((s) => s.status === 'submitted' || s.status === 'revision_requested').length
  const acceptedCount = submissions.filter((s) => s.status === 'accepted').length
  const validatedCount = participants.filter(
    (p) => p.role_in_event === 'participant' && p.registration_status === 'validated',
  ).length
  const paymentsToValidate = participants.filter((p) => p.registration_status === 'payment_submitted').length

  const mySubmissions = submissions.filter((s) => s.author_id === user.id)
  const myAccepted = mySubmissions.filter((s) => s.status === 'accepted')
  const myPendingRevision = mySubmissions.filter((s) => s.status === 'revision_requested')
  const myReviewed = (s) => (s.reviews || []).some((r) => r.reviewer_id === user.id)
  const reviewsToCount = submissions.filter(
    (s) => s.status === 'submitted' && s.author_id !== user.id && !myReviewed(s),
  ).length
  const isParticipantValidated = mine?.role_in_event === 'participant' && mine?.registration_status === 'validated'

  const organizerName = event.profiles?.full_name || 'Organisateur'

  const isScientificPhase = event.phase === 'scientific'

  // 1. Général / Cadrage
  const navGeneral = [
    { id: 'overview', label: 'Aperçu', icon: InfoIcon },
  ]

  // 2. Étape 1 : Sélection Scientifique
  const navScientific = [
    {
      id: 'scientific',
      label: 'Articles',
      icon: ArticleIcon,
      badge: isScientificPhase
        ? (canManage && pendingCount > 0 ? `${pendingCount} à trancher` : 'Sélection')
        : (acceptedCount > 0 ? `${acceptedCount} retenus` : null),
      badgeColor: isScientificPhase
        ? 'bg-accent/20 text-accent-ink font-semibold'
        : 'bg-surface-2 text-faint',
      highlight: isScientificPhase,
    },
    ...(canManage
      ? [
          { id: 'ai-matching', label: 'Matching Reviewers', icon: BrainIcon, badge: 'IA' },
          { id: 'ai-clustering', label: 'Thèmes & Clusters', icon: TreeStructureIcon, badge: 'IA' },
          { id: 'ai-plagiarism', label: 'Détection Similarité', icon: ShieldCheckIcon, badge: 'IA' },
        ]
      : []),
  ]

  // 3. Étape 2 : Logistique & Programme
  const navLogistics = [
    ...(canManage
      ? [
          {
            id: 'org-registrations',
            label: 'Inscriptions & Frais',
            icon: TicketIcon,
            badge: isScientificPhase
              ? 'À venir'
              : (paymentsToValidate > 0 ? `${paymentsToValidate} à valider` : (validatedCount > 0 ? `${validatedCount} validés` : null)),
            badgeColor: isScientificPhase
              ? 'bg-surface-2 text-faint'
              : (paymentsToValidate > 0 ? 'bg-warn/20 text-warn font-semibold' : 'bg-surface-2 text-muted'),
            highlight: !isScientificPhase && paymentsToValidate > 0,
          },
        ]
      : []),
    {
      id: 'program',
      label: 'Programme & Sessions',
      icon: PresentationChartIcon,
      badge: isScientificPhase ? 'À venir' : null,
      badgeColor: isScientificPhase ? 'bg-surface-2 text-faint' : 'bg-ok/15 text-ok font-semibold',
      highlight: !isScientificPhase,
    },
    ...(canManage
      ? [
          { id: 'org-rooms', label: 'Salles & Amphis', icon: DoorIcon },
          { id: 'org-sponsors', label: 'Sponsors & Partenaires', icon: StarIcon },
          { id: 'ai-scheduling', label: 'Planification QUBO', icon: CpuIcon, badge: 'IA' },
        ]
      : []),
  ]

  // 4. Étape 3 : Jour J (Sur site)
  const navDayJ = canManage
    ? [
        {
          id: 'org-attendance',
          label: 'Présences & Scan QR',
          icon: QrCodeIcon,
          badge: isScientificPhase ? 'À venir' : null,
          badgeColor: 'bg-surface-2 text-faint',
        },
      ]
    : []

  // 5. Administration & Bilan
  const navAdmin = canManage
    ? [
        { id: 'stats', label: 'Statistiques & Bilan', icon: ChartBarIcon },
        { id: 'org-participants', label: 'Membres & Rôles', icon: UsersIcon, count: participants.length },
        { id: 'org-settings', label: 'Paramètres', icon: GearSixIcon },
      ]
    : []

  const navSections = [
    { title: 'Général', items: navGeneral },
    { title: '1. Sélection Scientifique', items: navScientific },
    { title: '2. Logistique & Programme', items: navLogistics },
    ...(navDayJ.length > 0 ? [{ title: '3. Jour J (Sur site)', items: navDayJ }] : []),
    ...(navAdmin.length > 0 ? [{ title: 'Administration & Bilan', items: navAdmin }] : []),
  ]

  const allNavItems = navSections.flatMap((s) => s.items)
  const currentItem = allNavItems.find((item) => item.id === activeTab) || navGeneral[0]

  return (
    <div className="page-container pb-16">
      <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-8 items-start">
        {/* ========================================================================= */}
        {/* VOLET VERTICAL GAUCHE (SIDEBAR)                                          */}
        {/* ========================================================================= */}
        <aside className="lg:sticky lg:top-20 space-y-5">
          {/* Bouton retour */}
          <button
            type="button"
            onClick={onBack}
            className="btn-ghost btn-sm -ml-2 text-muted hover:text-fg"
          >
            <ArrowLeftIcon size={14} aria-hidden="true" />
            Retour aux événements
          </button>

          {/* Vignette d'identité de l'événement */}
          <div className="p-3.5 rounded-2xl border border-line bg-surface/70 space-y-2.5">
            <div className="flex items-start gap-3">
              <span
                className="w-10 h-10 rounded-xl shrink-0 shadow-xs"
                style={coverStyle(event)}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <span className="block text-xs text-muted leading-tight truncate">
                  {TYPE_LABELS[event.type] || event.type}
                </span>
                <h1 className="text-sm font-semibold text-fg line-clamp-2 leading-snug mt-0.5" title={event.title}>
                  {event.title}
                </h1>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-line text-xs">
              <span className={STATUS_BADGE[event.status] || 'badge-draft'}>
                {STATUS_LABELS[event.status] || event.status}
              </span>
              <span className="text-faint font-medium">
                {event.phase === 'scientific' ? 'Scientifique' : 'Organisation'}
              </span>
            </div>
          </div>

          {/* Barre de navigation sur MOBILE (défilement horizontal des pilules) */}
          <div className="lg:hidden -mx-4 px-4 overflow-x-auto flex items-center gap-1.5 pb-2 border-b border-line">
            {allNavItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium shrink-0 flex items-center gap-1.5 ${
                  activeTab === item.id
                    ? 'bg-accent text-on-accent font-semibold'
                    : 'bg-surface text-muted hover:text-fg'
                }`}
              >
                <span>{item.label}</span>
                {item.badge != null && (
                  <span className="w-4 h-4 rounded-full bg-white/25 text-current inline-flex items-center justify-center text-[10px] font-bold">
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Menu VERTICAL sur ORDINATEUR (Ordonné chronologiquement) */}
          <nav className="hidden lg:block space-y-4" aria-label="Sections de la conférence">
            {navSections.map((section) => {
              const isSectionActive = section.items.some((item) => item.id === activeTab)
              return (
                <div key={section.title} className="pt-0.5">
                  <div
                    className={`px-3 pb-1.5 pt-1 mb-2 flex items-center justify-between border-b transition-colors ${
                      isSectionActive
                        ? 'border-accent/40 text-fg'
                        : 'border-line/80 text-fg/75'
                    }`}
                  >
                    <span className={`text-xs font-bold uppercase tracking-wider ${
                      isSectionActive ? 'text-fg font-extrabold' : 'text-fg/80'
                    }`}>
                      {section.title}
                    </span>
                    {isSectionActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-accent" aria-hidden="true" />
                    )}
                  </div>
                  <div className="space-y-0.5">
                    {section.items.map((item) => (
                      <NavItem
                        key={item.id}
                        item={item}
                        active={activeTab === item.id}
                        onClick={() => setActiveTab(item.id)}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </nav>

          {/* Encart Organisateur discret dans la sidebar */}
          <div className="hidden lg:block p-3 rounded-xl border border-line bg-surface/40 text-xs space-y-1.5">
            <span className="text-xs font-semibold text-muted block">
              Organisateur
            </span>
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar name={organizerName} size={28} />
              <div className="min-w-0">
                <span className="block font-medium text-fg truncate">{organizerName}</span>
                {event.profiles?.email && (
                  <a
                    href={`mailto:${event.profiles.email}`}
                    className="text-[11px] text-muted hover:text-accent-ink truncate block"
                  >
                    {event.profiles.email}
                  </a>
                )}
              </div>
            </div>
          </div>
        </aside>

        {/* ========================================================================= */}
        {/* ZONE DE CONTENU PRINCIPALE (DROITE)                                      */}
        {/* ========================================================================= */}
        <main className="min-w-0 space-y-6">
          {error && <div className="alert-error">{error}</div>}

          {/* Guidage contextuel de phase & Actions prioritaires */}
          <PhaseGuidanceBanner
            event={event}
            canManage={canManage}
            isReviewer={isReviewer}
            submissions={submissions}
            pendingCount={pendingCount}
            acceptedCount={acceptedCount}
            validatedCount={validatedCount}
            paymentsToValidate={paymentsToValidate}
            reviewsToCount={reviewsToCount}
            myPendingRevision={myPendingRevision}
            myAccepted={myAccepted}
            isParticipantValidated={isParticipantValidated}
            activeTab={activeTab}
            onNavigateTab={setActiveTab}
          />

          {/* ========================================================================= */}
          {/* CAS 1 : ONGLET APERÇU -> AFFICHE LE GRAND EN-TÊTE + BANDEAU CONTEXTUEL   */}
          {/* ========================================================================= */}
          {activeTab === 'overview' ? (
            <div className="space-y-6">
              {/* ========================================================================= */}
              {/* 1. HERO DE LA CONFÉRENCE UNIFIÉ (AVEC BANDEAU D'ACTION INTÉGRÉ)          */}
              {/* ========================================================================= */}
              <header className="card p-6 sm:p-7 border-line bg-surface/80 space-y-5 relative overflow-hidden shadow-xs">
                {/* Badges de statut et format */}
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-accent-ink px-2.5 py-1 rounded-full bg-accent/15 tracking-wide uppercase text-[11px]">
                      {TYPE_LABELS[event.type] || event.type} • {(FORMAT_LABELS[event.format] || event.format || '').toLowerCase()}
                    </span>
                    <span className="text-muted text-[11px] font-medium hidden sm:inline">
                      {event.phase === 'scientific' ? 'Phase scientifique' : 'Phase organisation'}
                    </span>
                  </div>
                  <span className={STATUS_BADGE[event.status] || 'badge-draft'}>
                    {STATUS_LABELS[event.status] || event.status}
                  </span>
                </div>

                {/* Titre principal */}
                <h2
                  className="text-2xl sm:text-3xl font-semibold tracking-tight text-fg leading-tight"
                  style={{ overflowWrap: 'anywhere' }}
                >
                  {event.title}
                </h2>

                {/* Métadonnées essentielles + Bouton Calendrier */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <ul className="flex flex-col sm:flex-row sm:flex-wrap gap-x-6 gap-y-2.5 text-xs sm:text-sm text-muted">
                    <li className="flex items-center gap-2">
                      <CalendarBlankIcon size={16} className="text-accent-ink shrink-0" aria-hidden="true" />
                      <span className="num font-medium text-fg">{formatDateRange(event.start_date, event.end_date)}</span>
                    </li>
                    {event.location && (
                      <li className="flex items-center gap-2 min-w-0">
                        <MapPinIcon size={16} className="text-accent-ink shrink-0" aria-hidden="true" />
                        <span className="truncate" style={{ overflowWrap: 'anywhere' }}>{event.location}</span>
                      </li>
                    )}
                    <li className="flex items-center gap-2">
                      <UserIcon size={16} className="text-accent-ink shrink-0" aria-hidden="true" />
                      <span>Organisé par <span className="font-medium text-fg">{organizerName}</span></span>
                    </li>
                  </ul>
                  <div className="flex flex-wrap items-center gap-2">
                    <AddToCalendarButton event={event} />
                    <button
                      type="button"
                      onClick={async () => {
                        const { exportProceedingsPDF } = await import('../certificates/pdf')
                        exportProceedingsPDF({
                          eventTitle: event.title,
                          submissions: submissions,
                        })
                      }}
                      className="btn-outline btn-sm text-xs inline-flex items-center gap-1.5 active:scale-95 transition-all duration-150"
                      title="Télécharger le recueil officiel des actes et résumés scientifiques (PDF)"
                    >
                      <FilePdfIcon size={15} className="text-accent-ink" weight="bold" />
                      <span>Actes & Résumés (PDF)</span>
                    </button>
                  </div>
                </div>
              </header>

              {/* ========================================================================= */}
              {/* 2. CHIFFRES CLÉS DU TABLEAU DE BORD                                      */}
              {/* ========================================================================= */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="card p-4.5 border-line/80 bg-surface/80 flex items-center gap-3.5 shadow-xs hover:-translate-y-0.5 hover:shadow-md hover:border-accent/40 transition-all duration-200">
                  <div className="w-10 h-10 rounded-xl bg-accent/15 text-accent-ink flex items-center justify-center shrink-0">
                    <ArticleIcon size={20} weight="duotone" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs text-muted font-medium block truncate">Articles soumis</span>
                    <span className="num text-2xl font-bold text-fg tracking-tight">{submissions.length}</span>
                  </div>
                </div>

                <div className="card p-4.5 border-line/80 bg-surface/80 flex items-center gap-3.5 shadow-xs hover:-translate-y-0.5 hover:shadow-md hover:border-accent/40 transition-all duration-200">
                  <div className="w-10 h-10 rounded-xl bg-warn/15 text-warn flex items-center justify-center shrink-0">
                    <ClockIcon size={20} weight="duotone" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs text-muted font-medium block truncate">En attente</span>
                    <span className="num text-2xl font-bold text-fg tracking-tight">{pendingCount}</span>
                  </div>
                </div>

                <div className="card p-4.5 border-line/80 bg-surface/80 flex items-center gap-3.5 shadow-xs hover:-translate-y-0.5 hover:shadow-md hover:border-accent/40 transition-all duration-200">
                  <div className="w-10 h-10 rounded-xl bg-ok/15 text-ok flex items-center justify-center shrink-0">
                    <CheckCircleIcon size={20} weight="duotone" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs text-muted font-medium block truncate">Articles acceptés</span>
                    <span className="num text-2xl font-bold text-fg tracking-tight">{acceptedCount}</span>
                  </div>
                </div>

                <div className="card p-4.5 border-line/80 bg-surface/80 flex items-center gap-3.5 shadow-xs hover:-translate-y-0.5 hover:shadow-md hover:border-accent/40 transition-all duration-200">
                  <div className="w-10 h-10 rounded-xl bg-accent/12 text-accent-ink flex items-center justify-center shrink-0">
                    <TicketIcon size={20} weight="duotone" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs text-muted font-medium block truncate">Inscrits validés</span>
                    <span className="num text-2xl font-bold text-fg tracking-tight">{validatedCount}</span>
                  </div>
                </div>
              </div>

              {/* ========================================================================= */}
              {/* 3. GRILLE DE CONTENU PRINCIPALE                                          */}
              {/* ========================================================================= */}
              <div className={`grid grid-cols-1 ${!canManage ? 'xl:grid-cols-[minmax(0,1fr)_340px]' : ''} gap-6 sm:gap-8 items-start`}>
                {/* Colonne de gauche : Contenu & Déroulement */}
                <div className="space-y-6 min-w-0">
                  {/* Description / À propos */}
                  {event.description ? (
                    <section className="card p-6 border-line bg-surface/60 space-y-3">
                      <h3 className="text-base font-semibold tracking-tight text-fg">
                        À propos de la conférence
                      </h3>
                      <p className="text-fg/85 text-sm sm:text-base leading-relaxed whitespace-pre-line" style={{ overflowWrap: 'anywhere' }}>
                        {event.description}
                      </p>
                    </section>
                  ) : (
                    <section className="card p-6 border-line bg-surface/40 text-sm text-muted">
                      <p>
                        Bienvenue sur la page officielle de <strong className="text-fg">{event.title}</strong>. Retrouvez ici les informations clés, les articles déposés et le programme des sessions.
                      </p>
                    </section>
                  )}

                  {/* Plan d'accès interactif au Campus USTO-MB */}
                  {event.format !== 'online' && (
                    <CampusMap location={event.location || 'Campus USTO-MB, Oran'} />
                  )}

                  {/* Déroulement & Phases de l'événement */}
                  <section className="card p-5 sm:p-6 border-line bg-surface/60 space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-base font-semibold tracking-tight text-fg">
                        Déroulement & Phases de l'événement
                      </h3>
                      <span className="text-xs text-muted font-medium">
                        {event.phase === 'scientific' ? 'Étape 1 sur 2' : 'Étape 2 sur 2'}
                      </span>
                    </div>
                    <PhaseStepper phase={event.phase} />
                  </section>

                  {/* Sponsors */}
                  <SponsorsPanel eventId={eventId} isOrganizer={false} compact />
                </div>

                {/* Colonne de droite : Pass Participant (uniquement pour les participants/auteurs) */}
                {!canManage && (
                  <aside className="space-y-4 xl:sticky xl:top-24">
                    <section className="card-ticket-static">
                      <div className="ticket-stripe" />
                      <div className="ticket-perforation" />
                      <div className="p-5 flex-1 min-w-0">
                        <h3 className="font-semibold text-fg mb-4">Ma participation</h3>
                        <RegistrationCard event={event} participants={participants} onRefresh={fetchEventData} />
                      </div>
                    </section>
                  </aside>
                )}
              </div>
            </div>
          ) : (
            /* ========================================================================= */
            /* CAS 2 : TOUS LES AUTRES ONGLETS -> MICRO-LIGNE ÉPURÉE SANS BRUIT VISUEL  */
            /* ========================================================================= */
            <div className="space-y-6">
              <nav aria-label="Fil d'Ariane" className="flex items-center justify-between gap-3 pb-3 border-b border-line text-xs">
                <div className="flex items-center gap-1.5 text-muted min-w-0">
                  <button
                    type="button"
                    onClick={() => setActiveTab('overview')}
                    className="hover:text-fg font-medium truncate max-w-[220px] transition-colors"
                    title="Retour à l'Aperçu"
                  >
                    {event.title}
                  </button>
                  <span className="text-faint" aria-hidden="true">/</span>
                  <span className="font-semibold text-fg truncate">
                    {currentItem.label}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={STATUS_BADGE[event.status] || 'badge-draft'}>
                    {STATUS_LABELS[event.status] || event.status}
                  </span>
                  <span className="text-faint text-[11px] font-medium hidden sm:inline">
                    {event.phase === 'scientific' ? 'Phase scientifique' : 'Phase organisation'}
                  </span>
                </div>
              </nav>

              {/* Rendu direct du contenu sélectionné */}
              <div className="rise">
                {activeTab === 'scientific' && (
                  <ScientificPanel
                    eventId={eventId}
                    submissions={submissions}
                    participants={participants}
                    isOrganizer={isOrganizer}
                    isReviewer={isReviewer}
                    isAdmin={isAdmin}
                    frozen={event.phase !== 'scientific'}
                    onRefresh={fetchEventData}
                  />
                )}

                {activeTab === 'program' && (
                  <div className="max-w-4xl">
                    <SessionsPanel
                      eventId={eventId}
                      event={event}
                      isOrganizer={canManage}
                      phase={event.phase}
                      submissions={submissions}
                    />
                  </div>
                )}

                {activeTab === 'org-settings' && canManage && (
                  <div className="max-w-4xl">
                    <EventSettings
                      event={event}
                      pendingCount={pendingCount}
                      onChanged={fetchEventData}
                      onDeleted={onBack}
                    />
                  </div>
                )}

                {activeTab === 'org-participants' && canManage && (
                  <div className="max-w-4xl">
                    <ManageParticipants
                      participants={participants}
                      onUpdated={fetchEventData}
                    />
                  </div>
                )}

                {activeTab === 'org-registrations' && canManage && (
                  <div className="max-w-4xl">
                    <InvitationsPanel
                      eventId={eventId}
                      event={event}
                      phase={event.phase}
                      submissions={submissions}
                      participants={participants}
                      onRefresh={fetchEventData}
                    />
                  </div>
                )}

                {activeTab === 'org-rooms' && canManage && (
                  <div className="max-w-4xl">
                    <RoomsPanel eventId={eventId} />
                  </div>
                )}

                {activeTab === 'org-sponsors' && canManage && (
                  <div className="max-w-4xl">
                    <SponsorsPanel eventId={eventId} isOrganizer />
                  </div>
                )}

                {activeTab === 'org-attendance' && canManage && (
                  <div className="max-w-4xl">
                    {event.phase === 'organizational' ? (
                      <AttendancePanel eventId={eventId} participants={participants} />
                    ) : (
                      <div className="alert-info">Le pointage des présences s’ouvre en phase organisationnelle.</div>
                    )}
                  </div>
                )}

                {activeTab === 'stats' && canManage && (
                  <EventStats
                    eventId={eventId}
                    submissions={submissions}
                    participants={participants}
                  />
                )}

                {/* --- MODULES IA (BÊTA) --- */}
                {activeTab === 'ai-matching' && canManage && (
                  <AIBetaPlaceholder
                    title="Affectation intelligente Reviewers – Articles"
                    icon={BrainIcon}
                    badge="Module 1 • NLP / SBERT"
                    model="paraphrase-multilingual-MiniLM-L12-v2 (384 dim)"
                    description="Calcule la similarité sémantique cosinus entre les résumés d’articles et les expertises des relecteurs, puis applique une affectation gloutonne sous contrainte de charge maximale."
                    scriptRef="ai/matching.ipynb"
                    features={[
                      'Encodage multilingue SBERT (titres + résumés)',
                      'Contrainte stricte de 2 reviewers par soumission',
                      'Priorité de service aux articles aux profils les plus rares',
                      'Validation et affectation en 1 clic par l’organisateur',
                    ]}
                  />
                )}

                {activeTab === 'ai-clustering' && canManage && (
                  <AIBetaPlaceholder
                    title="Regroupement thématique automatique des articles"
                    icon={TreeStructureIcon}
                    badge="Module 2 • Topic Modeling"
                    model="BERTopic (UMAP 5D + HDBSCAN + c-TF-IDF)"
                    description="Découvre automatiquement les axes de recherche et thématiques sous-jacentes du corpus pour structurer et créer les sessions scientifiques."
                    scriptRef="ai/clustering.ipynb"
                    features={[
                      'Clustering non-supervisé avec isolation du bruit (-1)',
                      'Extraction des mots-clés distinctifs par c-TF-IDF',
                      'Score ARI d’alignement avec catégories réelles (arXiv)',
                      'Pré-remplissage automatique des sessions de la conférence',
                    ]}
                  />
                )}

                {activeTab === 'ai-scheduling' && canManage && (
                  <AIBetaPlaceholder
                    title="Planification des créneaux par QUBO et QAOA"
                    icon={CpuIcon}
                    badge="Module 3 • Optimisation Combinatoire"
                    model="Qiskit Optimization • QAOA (p=2) & NumPyMinimumEigensolver"
                    description="Formule l’ordonnancement des sessions et créneaux horaires sous forme d’un problème quadratique binaire pour minimiser les conflits de relecteurs et les doublons de thèmes."
                    scriptRef="ai/qubo.ipynb"
                    features={[
                      'Minimisation des conflits d’horaires pour les intervenants',
                      'Pondération automatique (conflits reviewer + centroïdes thématiques)',
                      'Résolution exacte classique vs algorithme quantique QAOA',
                      'Export direct vers le planning officiel des sessions',
                    ]}
                  />
                )}

                {activeTab === 'ai-plagiarism' && canManage && (
                  <AIBetaPlaceholder
                    title="Détection de similarité textuelle et originalité"
                    icon={ShieldCheckIcon}
                    badge="Module 4 • Contrôle d'Intégrité"
                    model="Sentence-BERT & Similarité Cosinus croisée"
                    description="Détecte les doublons de soumission ou les proximités textuelles suspectes entre les articles d’une même édition afin d’aider le comité à préserver l’intégrité scientifique."
                    scriptRef="ai/plagiarism.ipynb"
                    features={[
                      'Analyse croisée de toutes les soumissions de la conférence',
                      'Détection des doublons involontaires ou similitudes élevées',
                      'Aide à l’examen humain (aucun rejet automatique sans accord)',
                      'Tableau de bord de traçabilité pour le comité',
                    ]}
                  />
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
