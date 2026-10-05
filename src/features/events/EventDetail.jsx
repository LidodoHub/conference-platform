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
  EnvelopeSimpleIcon,
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
import Tabs from '../../components/ui/Tabs'
import Avatar from '../../components/ui/Avatar'
import Stat from '../../components/ui/Stat'
import EventCover from '../../components/ui/EventCover'
import PhaseStepper from './PhaseStepper'
import EventSettings from './EventSettings'
import ManageParticipants from './ManageParticipants'
import ScientificPanel from '../submissions/ScientificPanel'
import SessionsPanel from '../sessions/SessionsPanel'
import SponsorsPanel from '../sponsors/SponsorsPanel'
import InvitationsPanel from '../registrations/InvitationsPanel'
import RegistrationCard from '../registrations/RegistrationCard'
import AttendancePanel from '../attendance/AttendancePanel'
import EventStats from '../stats/EventStats'

const tile = (d) => {
  if (!d) return null
  const date = new Date(`${String(d).slice(0, 10)}T00:00:00`)
  return { day: date.getDate(), month: date.toLocaleDateString('fr-FR', { month: 'long' }), year: date.getFullYear() }
}

export default function EventDetail({ eventId, onBack, initialTab, initialOrgTab }) {
  const { user, isAdmin } = useAuth()
  const [event, setEvent] = useState(null)
  const [participants, setParticipants] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState(initialTab || 'overview')
  const [orgTab, setOrgTab] = useState(initialOrgTab || 'settings')

  // Ne met jamais "loading" à vrai lors d'un rafraîchissement : seul le premier chargement affiche le squelette.
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

  const tabs = [
    { id: 'overview', label: 'Aperçu', icon: InfoIcon },
    { id: 'scientific', label: 'Scientifique', icon: ArticleIcon, badge: canManage && pendingCount > 0 ? pendingCount : null },
    { id: 'program', label: 'Programme', icon: PresentationChartIcon },
    ...(canManage
      ? [
          { id: 'organization', label: 'Organisation', icon: GearSixIcon },
          { id: 'stats', label: 'Statistiques', icon: ChartBarIcon },
        ]
      : []),
  ]
  const activeTab = tabs.some((t) => t.id === tab) ? tab : 'overview'

  const paymentsToValidate = participants.filter((p) => p.registration_status === 'payment_submitted').length
  const orgTabs = [
    { id: 'settings', label: 'Événement' },
    { id: 'participants', label: 'Participants', badge: participants.length },
    { id: 'registrations', label: 'Inscriptions', badge: paymentsToValidate || null },
    { id: 'sponsors', label: 'Sponsors' },
    { id: 'attendance', label: 'Présences' },
  ]

  const t = tile(event.start_date)
  const organizerName = event.profiles?.full_name || ''

  return (
    <div className="page-container">
      <button onClick={onBack} className="btn-ghost -ml-3 mb-5">
        <ArrowLeftIcon size={16} aria-hidden="true" />
        Événements
      </button>

      {/* En-tête de l'événement */}
      <header className="card overflow-hidden">
        <EventCover seed={event.id} className="h-40 sm:h-56 px-5 sm:px-8 py-5 sm:py-6 flex items-end justify-between gap-6">
          <span className="text-sm font-medium text-white/85 self-start">
            {TYPE_LABELS[event.type] || event.type}, {(FORMAT_LABELS[event.format] || event.format || '').toLowerCase()}
          </span>
          {t && (
            <span className="text-right text-white" aria-hidden="true">
              <span className="num block text-6xl sm:text-8xl font-semibold tracking-tighter leading-[0.85]">{t.day}</span>
              <span className="block mt-1.5 text-sm sm:text-base text-white/80 first-letter:uppercase">
                {t.month} {t.year}
              </span>
            </span>
          )}
        </EventCover>

        <div className="p-5 sm:p-8">
          <div className="flex flex-wrap gap-1.5">
            <span className={STATUS_BADGE[event.status] || 'badge-draft'}>{STATUS_LABELS[event.status] || event.status}</span>
          </div>
          <h1
            className="mt-3 text-3xl sm:text-[2.6rem] font-semibold tracking-tight leading-[1.08] text-fg max-w-[28ch]"
            style={{ overflowWrap: 'anywhere' }}
          >
            {event.title}
          </h1>
          <ul className="mt-5 flex flex-col sm:flex-row sm:flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
            <li className="flex items-center gap-2">
              <CalendarBlankIcon size={17} className="text-accent-ink shrink-0" aria-hidden="true" />
              <span className="num">{formatDateRange(event.start_date, event.end_date)}</span>
            </li>
            {event.location && (
              <li className="flex items-center gap-2 min-w-0">
                <MapPinIcon size={17} className="text-accent-ink shrink-0" aria-hidden="true" />
                <span style={{ overflowWrap: 'anywhere' }}>{event.location}</span>
              </li>
            )}
            <li className="flex items-center gap-2">
              <UserIcon size={17} className="text-accent-ink shrink-0" aria-hidden="true" />
              Organisé par {organizerName}
            </li>
          </ul>
          <div className="mt-7">
            <PhaseStepper phase={event.phase} />
          </div>
        </div>
      </header>

      {error && <div className="alert-error mt-4">{error}</div>}

      {/* Navigation, collée sous la barre du haut */}
      <div className="sticky top-16 z-30 bg-bg/90 backdrop-blur-md mt-6 -mx-4 px-4 sm:-mx-8 sm:px-8 lg:-mx-10 lg:px-10">
        <Tabs label="Sections de l'événement" tabs={tabs} active={activeTab} onChange={setTab} />
      </div>

      <div className="mt-8">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-8 items-start">
            <div className="space-y-8 min-w-0">
              <div className={`grid gap-3 grid-cols-2 ${canManage ? 'sm:grid-cols-4' : ''}`}>
                {canManage && <Stat label="Articles soumis" value={submissions.length} />}
                {canManage && <Stat label="En attente" value={pendingCount} />}
                <Stat label="Articles acceptés" value={acceptedCount} />
                <Stat label="Inscrits validés" value={validatedCount} />
              </div>

              {event.description && (
                <section>
                  <h2 className="text-lg font-semibold tracking-tight text-fg mb-3">À propos</h2>
                  <p className="text-fg/85 leading-7 whitespace-pre-line max-w-[70ch]" style={{ overflowWrap: 'anywhere' }}>
                    {event.description}
                  </p>
                </section>
              )}

              <SponsorsPanel eventId={eventId} isOrganizer={false} compact />
            </div>

            <aside className="order-first lg:order-none space-y-4 lg:sticky lg:top-36">
              <section className="card-ticket-static">
                <div className="ticket-stripe" />
                <div className="ticket-perforation" />
                <div className="p-5 flex-1 min-w-0">
                  <h2 className="font-semibold text-fg mb-4">Ma participation</h2>
                  <RegistrationCard event={event} participants={participants} onRefresh={fetchEventData} />
                </div>
              </section>

              <section className="card p-5">
                <h2 className="text-sm text-muted mb-3">Organisateur</h2>
                <div className="flex items-center gap-3">
                  <Avatar name={organizerName} size={40} />
                  <div className="min-w-0">
                    <p className="font-medium text-fg truncate">{organizerName}</p>
                    {event.profiles?.email && (
                      <a
                        href={`mailto:${event.profiles.email}`}
                        className="text-[13px] text-muted hover:text-accent-ink inline-flex items-center gap-1.5 max-w-full"
                      >
                        <EnvelopeSimpleIcon size={14} className="shrink-0" aria-hidden="true" />
                        <span className="truncate">{event.profiles.email}</span>
                      </a>
                    )}
                  </div>
                </div>
              </section>
            </aside>
          </div>
        )}

        {activeTab === 'scientific' && (
          <div>
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
          </div>
        )}

        {activeTab === 'program' && (
          <div className="max-w-4xl">
            <SessionsPanel eventId={eventId} isOrganizer={canManage} phase={event.phase} submissions={submissions} />
          </div>
        )}

        {activeTab === 'organization' && canManage && (
          <div className="space-y-8">
            <Tabs label="Organisation" tabs={orgTabs} active={orgTab} onChange={setOrgTab} variant="pill" />

            <div className="max-w-4xl">
              {orgTab === 'settings' && (
                <EventSettings event={event} pendingCount={pendingCount} onChanged={fetchEventData} onDeleted={onBack} />
              )}
              {orgTab === 'participants' && <ManageParticipants participants={participants} onUpdated={fetchEventData} />}
              {orgTab === 'registrations' && (
                <InvitationsPanel
                  eventId={eventId}
                  event={event}
                  phase={event.phase}
                  submissions={submissions}
                  participants={participants}
                  onRefresh={fetchEventData}
                />
              )}
              {orgTab === 'sponsors' && <SponsorsPanel eventId={eventId} isOrganizer />}
              {orgTab === 'attendance' &&
                (event.phase === 'organizational' ? (
                  <AttendancePanel eventId={eventId} participants={participants} />
                ) : (
                  <div className="alert-info">Le pointage des présences s'ouvre en phase organisationnelle.</div>
                ))}
            </div>
          </div>
        )}

        {activeTab === 'stats' && canManage && (
          <EventStats eventId={eventId} submissions={submissions} participants={participants} />
        )}
      </div>
    </div>
  )
}
