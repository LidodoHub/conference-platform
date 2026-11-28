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
  UserPlusIcon,
} from '@phosphor-icons/react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../lib/auth'
import { useLanguage } from '../../context/LanguageContext'
import { frError } from '../../lib/errors'
import { STATUS_BADGE } from '../../lib/constants'

const parseDay = (d) => {
  if (!d) return null
  const str = String(d)
  return str.length <= 10 ? new Date(`${str}T00:00:00`) : new Date(str)
}

const fmtDateRange = (start, end, locale) => {
  const opts = { day: 'numeric', month: 'long', year: 'numeric' }
  const a = parseDay(start)?.toLocaleDateString(locale, opts) || ''
  if (!end || String(end).slice(0, 10) === String(start).slice(0, 10)) return a
  return `${a} → ${parseDay(end)?.toLocaleDateString(locale, opts) || ''}`
}
import Avatar from '../../components/ui/Avatar'
import { coverStyle } from '../../lib/cover'
import InviteMemberModal from '../registrations/InviteMemberModal'
import FloatingEventAssistant from './EventAssistantModal'
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
import AIMatchingPanel from './AIMatchingPanel'
import AISimilarityPanel from './AISimilarityPanel'
import AIQuboPanel from './AIQuboPanel'
import AIMetaReviewPanel from './AIMetaReviewPanel'
import { fetchEventAssignments, unassignReviewer } from '../../lib/assignments'

function NavItem({ item, active, onClick }) {
  const Icon = item.icon
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`group w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all text-start cursor-pointer ${
        active
          ? 'bg-[#EDEDEF] dark:bg-[#24262B] text-[#111111] dark:text-white font-semibold border-s-2 border-accent ps-2.5'
          : item.highlight
            ? 'border-s-2 border-accent/60 text-fg font-medium hover:bg-surface-2/60 ps-2.5'
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
        <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full shrink-0 ${item.badgeColor || 'bg-fg/8 text-fg'}`}>
          {item.badge}
        </span>
      )}
      {item.count != null && !item.badge && (
        <span className="text-xs font-mono text-faint shrink-0">
          {item.count}
        </span>
      )}
    </button>
  )
}

export default function EventDetail({ eventId, onBack, initialTab, initialOrgTab, onTabChange }) {
  const { user, isAdmin } = useAuth()
  const { t, locale } = useLanguage()
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [event, setEvent] = useState(null)
  const [participants, setParticipants] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const resolveInitialTab = useCallback(() => {
    if (initialTab === 'organization') {
      if (initialOrgTab) return `org-${initialOrgTab}`
      return 'org-settings'
    }
    const validTabs = [
      'overview',
      'scientific',
      'program',
      'map',
      'my-registration',
      'stats',
      'ai-matching',
      'ai-clustering',
      'ai-plagiarism',
      'ai-scheduling',
      'org-settings',
      'org-participants',
      'org-registrations',
      'org-rooms',
      'org-sponsors',
      'org-attendance',
    ]
    if (initialTab && validTabs.includes(initialTab)) return initialTab
    return 'overview'
  }, [initialTab, initialOrgTab])

  const [activeTab, setActiveTab] = useState(resolveInitialTab)

  useEffect(() => {
    setActiveTab(resolveInitialTab())
  }, [resolveInitialTab])

  const selectTab = useCallback(
    (nextTab) => {
      setActiveTab(nextTab)
      onTabChange?.(nextTab)
    },
    [onTabChange],
  )

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [activeTab])

  useEffect(() => {
    if (event?.title) {
      document.title = `${event.title} — CONFERA`
    } else if (!loading && !event) {
      document.title = `${t('event.notFound')} — CONFERA`
    }
  }, [event, loading, t])

  const fetchEventData = useCallback(async () => {
    const [eventRes, partRes] = await Promise.all([
      supabase.from('events').select('*, profiles(full_name, email)').eq('id', eventId).single(),
      supabase
        .from('event_participants')
        .select('id, user_id, role_in_event, registered_at, registration_status, invited_at, validated_at, profiles(full_name, email)')
        .eq('event_id', eventId),
    ])

    if (eventRes.error) setError(frError(eventRes.error))
    else setEvent(eventRes.data)
    if (partRes.error) setError(frError(partRes.error))
    else setParticipants(partRes.data)

    const ev = eventRes.data
    const parts = partRes.data || []
    const assignRes = await fetchEventAssignments(eventId, parts)
    setAssignments(assignRes.list)

    const myPart = parts.find((p) => p.user_id === user.id)
    const userIsOrg = ev?.organizer_id === user.id || myPart?.role_in_event === 'organizer'
    const userCanManage = Boolean(isAdmin || userIsOrg)
    const userIsRev = myPart?.role_in_event === 'reviewer'

    const selectCols =
      'id, author_id, title, abstract, status, submitted_at, profiles(full_name), reviews(id, score, comments, recommendation, reviewer_id, recommended_session_id), decisions(id, status, revision_type, decided_at)'

    let subData = []
    if (userCanManage) {
      const subRes = await supabase.from('submissions').select(selectCols).eq('event_id', eventId)
      if (subRes.error) setError(frError(subRes.error))
      else subData = subRes.data || []
    } else if (userIsRev) {
      const assignedIds = assignRes.list
        .filter((a) => a.reviewer_id === String(user.id))
        .map((a) => a.submission_id)
      if (assignedIds.length > 0) {
        const subRes = await supabase
          .from('submissions')
          .select(selectCols)
          .eq('event_id', eventId)
          .in('id', assignedIds)
        if (subRes.error) setError(frError(subRes.error))
        else subData = subRes.data || []
      }
    } else {
      const subRes = await supabase
        .from('submissions')
        .select(selectCols)
        .eq('event_id', eventId)
        .or(`author_id.eq.${user.id},status.eq.accepted`)
      if (subRes.error) setError(frError(subRes.error))
      else subData = subRes.data || []
    }

    setSubmissions(subData)
    setLoading(false)
  }, [eventId, user.id, isAdmin])

  const handleUnassign = useCallback(
    async (submissionId, reviewerId) => {
      await unassignReviewer(eventId, String(submissionId), String(reviewerId))
      fetchEventData()
    },
    [eventId, fetchEventData],
  )

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
        <button onClick={onBack} className="btn-ghost -ms-3 mb-6">
          <ArrowLeftIcon size={16} className="rtl:rotate-180" aria-hidden="true" />
          {t('event.backToEvents')}
        </button>
        <div className="alert-error">{t('event.notFound')}{error && ` (${error})`}</div>
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

  const organizerName = event.profiles?.full_name || t('roles.organizer')

  const isScientificPhase = event.phase === 'scientific'

  // 1. Général / Cadrage
  const navGeneral = [
    { id: 'overview', label: t('event.overview'), icon: InfoIcon },
  ]

  // 2. Étape 1 : Sélection Scientifique
  const navScientific = [
    {
      id: 'scientific',
      label: t('event.articles'),
      icon: ArticleIcon,
      badge: isScientificPhase
        ? (canManage && pendingCount > 0 ? t('eventDetailExtra.toDecide', { count: pendingCount }) : t('eventDetailExtra.selection'))
        : (acceptedCount > 0 ? t('eventDetailExtra.acceptedCount', { count: acceptedCount }) : null),
      badgeColor: isScientificPhase
        ? 'bg-fg/8 text-fg font-semibold'
        : 'bg-surface-2 text-faint',
      highlight: isScientificPhase,
    },
    ...(canManage
      ? [
          { id: 'ai-matching', label: t('eventDetailExtra.aiMatching'), icon: BrainIcon, badge: t('eventDetailExtra.aiBadge') },
          { id: 'ai-clustering', label: t('eventDetailExtra.aiMetaReview'), icon: TreeStructureIcon, badge: t('eventDetailExtra.aiBadge') },
          { id: 'ai-plagiarism', label: t('eventDetailExtra.aiSimilarity'), icon: ShieldCheckIcon, badge: t('eventDetailExtra.aiBadge') },
        ]
      : []),
  ]

  // 3. Étape 2 : Logistique & Programme
  const navLogistics = [
    ...(canManage
      ? [
          {
            id: 'org-registrations',
            label: t('event.registrations'),
            icon: TicketIcon,
            badge: isScientificPhase
              ? t('event.upcoming')
              : (paymentsToValidate > 0 ? t('eventDetailExtra.toValidateCount', { count: paymentsToValidate }) : (validatedCount > 0 ? t('eventDetailExtra.validatedCount', { count: validatedCount }) : null)),
            badgeColor: isScientificPhase
              ? 'bg-surface-2 text-faint'
              : (paymentsToValidate > 0 ? 'bg-fg/8 text-fg font-semibold' : 'bg-surface-2 text-muted'),
            highlight: !isScientificPhase && paymentsToValidate > 0,
          },
        ]
      : []),
    {
      id: 'program',
      label: t('event.program'),
      icon: PresentationChartIcon,
      badge: isScientificPhase ? t('event.upcoming') : null,
      badgeColor: isScientificPhase
        ? 'bg-neutral-100/80 text-neutral-700 border border-neutral-200/80 dark:bg-white/[0.06] dark:text-neutral-200 dark:border-white/10'
        : 'bg-neutral-100/80 text-neutral-700 border border-neutral-200/80 dark:bg-white/[0.06] dark:text-neutral-200 dark:border-white/10',
      highlight: !isScientificPhase,
    },
    ...(canManage
      ? [
          { id: 'org-rooms', label: t('event.rooms'), icon: DoorIcon },
          { id: 'org-sponsors', label: t('event.sponsors'), icon: StarIcon },
          { id: 'ai-scheduling', label: t('eventDetailExtra.aiScheduling'), icon: CpuIcon, badge: t('eventDetailExtra.aiBadge') },
        ]
      : []),
  ]

  // 4. Étape 3 : Jour J (Sur site)
  const navDayJ = canManage
    ? [
        {
          id: 'org-attendance',
          label: t('event.attendance'),
          icon: QrCodeIcon,
          badge: isScientificPhase ? t('event.upcoming') : null,
          badgeColor: 'bg-surface-2 text-faint',
        },
      ]
    : []

  // 5. Administration & Bilan
  const navAdmin = canManage
    ? [
        { id: 'stats', label: t('event.stats'), icon: ChartBarIcon },
        { id: 'org-participants', label: t('event.members'), icon: UsersIcon, count: participants.length },
        { id: 'org-settings', label: t('event.settings'), icon: GearSixIcon },
      ]
    : []

  const navSections = [
    { title: t('eventDetailExtra.navGeneral'), items: navGeneral },
    { title: t('eventDetailExtra.navScientific'), items: navScientific },
    { title: t('eventDetailExtra.navLogistics'), items: navLogistics },
    ...(navDayJ.length > 0 ? [{ title: t('eventDetailExtra.navDayJ'), items: navDayJ }] : []),
    ...(navAdmin.length > 0 ? [{ title: t('eventDetailExtra.navAdmin'), items: navAdmin }] : []),
  ]

  const allNavItems = navSections.flatMap((s) => s.items)
  const currentItem = allNavItems.find((item) => item.id === activeTab) || navGeneral[0]

  return (
    <div className="page-container pb-16">
      <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-8 items-start">
        {/* ========================================================================= */}
        {/* VOLET VERTICAL GAUCHE (SIDEBAR)                                          */}
        {/* ========================================================================= */}
        <aside className="lg:sticky lg:top-24 space-y-5">
          {/* Bouton retour */}
          <button
            type="button"
            onClick={onBack}
            className="btn-ghost btn-sm -ms-2 text-muted hover:text-fg"
          >
            <ArrowLeftIcon size={14} className="rtl:rotate-180" aria-hidden="true" />
            {t('event.backToEvents')}
          </button>

          {/* Vignette d'identité de l'événement */}
          <div className="p-3 rounded-2xl border border-line bg-surface/70 flex items-start gap-3">
            <span
              className="w-10 h-10 rounded-xl shrink-0 shadow-xs mt-0.5"
              style={coverStyle(event)}
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1 space-y-1.5">
              <h1 className="text-sm font-semibold text-fg line-clamp-2 leading-snug" title={event.title}>
                {event.title}
              </h1>
              <span className={`inline-flex ${STATUS_BADGE[event.status] || 'badge-draft'}`}>
                {t(`eventCard.statuses.${event.status}`) || event.status}
              </span>
            </div>
          </div>

          {/* Barre de navigation sur MOBILE (défilement horizontal des pilules) */}
          <div className="lg:hidden -mx-4 px-4 overflow-x-auto flex items-center gap-1.5 pb-2 border-b border-line">
            {allNavItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => selectTab(item.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium shrink-0 flex items-center gap-1.5 ${
                  activeTab === item.id
                    ? 'bg-[#EDEDEF] dark:bg-[#24262B] text-[#111111] dark:text-white border border-neutral-300 dark:border-white/20 font-semibold'
                    : 'bg-surface text-muted hover:text-fg border border-line'
                }`}
              >
                <span>{item.label}</span>
                {item.badge != null && (
                  <span className="w-4 h-4 rounded-full bg-white/25 text-current inline-flex items-center justify-center text-xs font-bold">
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Menu VERTICAL sur ORDINATEUR (Ordonné chronologiquement) */}
          <nav className="hidden lg:block space-y-4" aria-label={t('eventDetailExtra.sectionsAria')}>
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
                        onClick={() => selectTab(item.id)}
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
              {t('roles.organizer')}
            </span>
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar name={organizerName} size={28} />
              <div className="min-w-0">
                <span className="block font-medium text-fg truncate">{organizerName}</span>
                {event.profiles?.email && (
                  <a
                    href={`mailto:${event.profiles.email}`}
                    className="text-xs text-muted hover:text-accent-ink truncate block"
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
            onNavigateTab={selectTab}
          />

          {/* ========================================================================= */}
          {/* CAS 1 : ONGLET APERÇU -> AFFICHE LE GRAND EN-TÊTE + BANDEAU CONTEXTUEL   */}
          {/* ========================================================================= */}
          {activeTab === 'overview' ? (
            <div className="space-y-6">
              {/* ========================================================================= */}
              {/* 1. HERO DE LA CONFÉRENCE UNIFIÉ (AVEC BANDEAU D'ACTION INTÉGRÉ)          */}
              {/* ========================================================================= */}
              <header className="card p-6 sm:p-7 border-line bg-surface/80 space-y-5 relative z-20 overflow-visible shadow-card">
                {/* Badges de statut et format */}
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-0.5 rounded-full bg-neutral-100/80 text-neutral-700 border border-neutral-200/80 dark:bg-white/[0.06] dark:text-neutral-200 dark:border-white/10">
                      {t(`eventCard.types.${event.type}`) || event.type} • {(t(`eventCard.formats.${event.format}`) || event.format || '').toLowerCase()}
                    </span>
                    <span className="text-muted text-xs font-medium hidden sm:inline">
                      {t(`eventCard.phases.${event.phase}`) || event.phase}
                    </span>
                  </div>
                  <span className={STATUS_BADGE[event.status] || 'badge-draft'}>
                    {t(`eventCard.statuses.${event.status}`) || event.status}
                  </span>
                </div>

                {/* Titre principal */}
                <h2
                  className="text-2xl sm:text-3xl font-semibold tracking-tight text-fg leading-tight"
                  style={{ overflowWrap: 'anywhere' }}
                >
                  {event.title}
                </h2>

                {/* Métadonnées essentielles + Boutons d'action en bas à droite */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pt-1">
                  <ul className="flex flex-col sm:flex-row sm:flex-wrap gap-x-6 gap-y-2.5 text-xs sm:text-sm text-muted">
                    <li className="flex items-center gap-2">
                      <CalendarBlankIcon size={16} className="text-accent-ink shrink-0" aria-hidden="true" />
                      <span className="num font-medium text-fg">{fmtDateRange(event.start_date, event.end_date, locale)}</span>
                    </li>
                    {event.location && (
                      <li className="flex items-center gap-2 min-w-0">
                        <MapPinIcon size={16} className="text-accent-ink shrink-0" aria-hidden="true" />
                        <span className="truncate" style={{ overflowWrap: 'anywhere' }}>{event.location}</span>
                      </li>
                    )}
                    <li className="flex items-center gap-2">
                      <UserIcon size={16} className="text-accent-ink shrink-0" aria-hidden="true" />
                      <span>{t('event.organizedBy')} <span className="font-medium text-fg">{organizerName}</span></span>
                    </li>
                  </ul>
                  <div className="flex flex-wrap items-center gap-2 shrink-0 md:justify-end">
                    {canManage && (
                      <button
                        type="button"
                        onClick={() => setShowInviteModal(true)}
                        className="btn-primary btn-sm text-xs inline-flex items-center gap-1.5 active:scale-95 transition-all duration-150 cursor-pointer"
                      >
                        <UserPlusIcon size={15} weight="bold" />
                        <span>{t('network.inviteBtn')}</span>
                      </button>
                    )}
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
                      title={t('event.proceedingsPdf')}
                    >
                      <FilePdfIcon size={15} className="text-accent-ink" weight="bold" />
                      <span>{t('event.proceedingsPdf')}</span>
                    </button>
                  </div>
                </div>
              </header>

              {/* ========================================================================= */}
              {/* 2. CHIFFRES CLÉS DU TABLEAU DE BORD                                      */}
              {/* ========================================================================= */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="card p-4.5 border-line/80 bg-surface/80 flex items-center gap-3.5 shadow-card hover:-translate-y-0.5 hover:shadow-lift hover:border-neutral-300 dark:hover:border-white/20 transition-all duration-200">
                  <div className="w-10 h-10 rounded-xl bg-neutral-100 text-neutral-700 dark:bg-white/[0.06] dark:text-neutral-200 flex items-center justify-center shrink-0">
                    <ArticleIcon size={20} weight="duotone" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs text-muted font-medium block truncate">{t('event.submittedArticles')}</span>
                    <span className="num text-2xl font-bold text-fg tracking-tight">{submissions.length}</span>
                  </div>
                </div>

                <div className="card p-4.5 border-line/80 bg-surface/80 flex items-center gap-3.5 shadow-card hover:-translate-y-0.5 hover:shadow-lift hover:border-neutral-300 dark:hover:border-white/20 transition-all duration-200">
                  <div className="w-10 h-10 rounded-xl bg-neutral-100 text-neutral-700 dark:bg-white/[0.06] dark:text-neutral-200 flex items-center justify-center shrink-0">
                    <ClockIcon size={20} weight="duotone" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs text-muted font-medium block truncate">{t('event.pending')}</span>
                    <span className="num text-2xl font-bold text-fg tracking-tight">{pendingCount}</span>
                  </div>
                </div>

                <div className="card p-4.5 border-line/80 bg-surface/80 flex items-center gap-3.5 shadow-card hover:-translate-y-0.5 hover:shadow-lift hover:border-neutral-300 dark:hover:border-white/20 transition-all duration-200">
                  <div className="w-10 h-10 rounded-xl bg-neutral-100 text-neutral-700 dark:bg-white/[0.06] dark:text-neutral-200 flex items-center justify-center shrink-0">
                    <CheckCircleIcon size={20} weight="duotone" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs text-muted font-medium block truncate">{t('event.acceptedArticles')}</span>
                    <span className="num text-2xl font-bold text-fg tracking-tight">{acceptedCount}</span>
                  </div>
                </div>

                <div className="card p-4.5 border-line/80 bg-surface/80 flex items-center gap-3.5 shadow-card hover:-translate-y-0.5 hover:shadow-lift hover:border-neutral-300 dark:hover:border-white/20 transition-all duration-200">
                  <div className="w-10 h-10 rounded-xl bg-neutral-100 text-neutral-700 dark:bg-white/[0.06] dark:text-neutral-200 flex items-center justify-center shrink-0">
                    <TicketIcon size={20} weight="duotone" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs text-muted font-medium block truncate">{t('event.validatedRegistrations')}</span>
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
                        {t('eventDetailExtra.aboutTitle')}
                      </h3>
                      <p className="text-fg/85 text-sm sm:text-base leading-relaxed whitespace-pre-line" style={{ overflowWrap: 'anywhere' }}>
                        {event.description}
                      </p>
                    </section>
                  ) : (
                    <section className="card p-6 border-line bg-surface/40 text-sm text-muted">
                      <p>
                        {t('eventDetailExtra.welcomePrefix')}
                        <strong className="text-fg">{event.title}</strong>
                        {t('eventDetailExtra.welcomeSuffix')}
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
                        {t('eventDetailExtra.phasesTitle')}
                      </h3>
                      <span className="text-xs text-muted font-medium">
                        {event.phase === 'scientific' ? t('eventDetailExtra.step1Of2') : t('eventDetailExtra.step2Of2')}
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
                        <h3 className="font-semibold text-fg mb-4">{t('eventDetailExtra.myRegistration')}</h3>
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
              <nav aria-label={t('eventDetailExtra.breadcrumbAria')} className="flex items-center justify-between gap-3 pb-3 border-b border-line text-xs">
                <div className="flex items-center gap-1.5 text-muted min-w-0">
                  <button
                    type="button"
                    onClick={() => selectTab('overview')}
                    className="hover:text-fg font-medium truncate max-w-[220px] transition-colors"
                    title={t('event.overview')}
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
                    {t(`eventCard.statuses.${event.status}`) || event.status}
                  </span>
                  <span className="text-faint text-xs font-medium hidden sm:inline">
                    {t(`eventCard.phases.${event.phase}`) || event.phase}
                  </span>
                </div>
              </nav>

              {/* Rendu direct du contenu sélectionné */}
              <div key={activeTab} className="animate-panel-enter">
                {activeTab === 'scientific' && (
                  <ScientificPanel
                    eventId={eventId}
                    submissions={submissions}
                    participants={participants}
                    assignments={assignments}
                    isOrganizer={isOrganizer}
                    isReviewer={isReviewer}
                    isAdmin={isAdmin}
                    frozen={event.phase !== 'scientific'}
                    onUnassign={handleUnassign}
                    onRefresh={fetchEventData}
                  />
                )}

                {activeTab === 'program' && (
                  <div className="w-full">
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
                  <div className="w-full">
                    <ManageParticipants
                      participants={participants}
                      onUpdated={fetchEventData}
                    />
                  </div>
                )}

                {activeTab === 'org-registrations' && canManage && (
                  <div className="w-full">
                    <InvitationsPanel
                      eventId={eventId}
                      event={event}
                      phase={event.phase}
                      submissions={submissions}
                      participants={participants}
                      onRefresh={fetchEventData}
                      onOpenInviteModal={() => setShowInviteModal(true)}
                    />
                  </div>
                )}

                {activeTab === 'org-rooms' && canManage && (
                  <div className="w-full">
                    <RoomsPanel eventId={eventId} />
                  </div>
                )}

                {activeTab === 'org-sponsors' && canManage && (
                  <div className="w-full">
                    <SponsorsPanel eventId={eventId} isOrganizer />
                  </div>
                )}

                {activeTab === 'org-attendance' && canManage && (
                  <div className="w-full">
                    {event.phase === 'organizational' ? (
                      <AttendancePanel eventId={eventId} participants={participants} />
                    ) : (
                      <div className="alert-info">{t('eventDetailExtra.attendanceOpensInOrg')}</div>
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

                {/* --- MODULES IA --- */}
                {activeTab === 'ai-matching' && canManage && (
                  <AIMatchingPanel eventId={eventId} onAssigned={fetchEventData} />
                )}

                {activeTab === 'ai-clustering' && canManage && (
                  <AIMetaReviewPanel eventId={eventId} />
                )}

                {activeTab === 'ai-scheduling' && canManage && (
                  <AIQuboPanel
                    eventId={eventId}
                    event={event}
                    onApplied={fetchEventData}
                  />
                )}

                {activeTab === 'ai-plagiarism' && canManage && (
                  <AISimilarityPanel eventId={eventId} />
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {canManage && (
        <InviteMemberModal
          open={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          eventId={eventId}
          eventTitle={event.title}
          existingParticipantIds={participants.map((p) => p.user_id)}
          onInvited={fetchEventData}
        />
      )}

      <FloatingEventAssistant event={event} />
    </div>
  )
}
