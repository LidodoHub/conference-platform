import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import Tabs from '../../components/ui/Tabs'
import { CalendarIcon, PinIcon, UserIcon } from '../../components/ui/Icons'
import PhaseStepper from './PhaseStepper'
import ManageParticipants from './ManageParticipants'
import ScientificPanel from '../submissions/ScientificPanel'
import SessionsPanel from '../sessions/SessionsPanel'
import SponsorsPanel from '../sponsors/SponsorsPanel'
import InvitationsPanel from '../registrations/InvitationsPanel'
import RegistrationCard from '../registrations/RegistrationCard'
import AttendancePanel from '../attendance/AttendancePanel'

const TYPE_LABELS = {
  conference: 'Conférence',
  colloquium: 'Colloque',
  seminar: 'Séminaire',
  workshop: 'Workshop',
}

const STATUS_LABELS = {
  draft: 'Brouillon',
  pending_approval: 'En validation',
  published: 'Publié',
  ongoing: 'En cours',
  closed: 'Clôturé',
  archived: 'Archivé',
}

const PHASE_LABELS = {
  scientific: 'Phase scientifique',
  organizational: 'Phase organisationnelle',
}

const FORMAT_LABELS = {
  onsite: 'Présentiel',
  online: 'En ligne',
  hybrid: 'Hybride',
}

// pastilles de l'en-tête (fond navy)
const CHIP = 'inline-flex items-center font-mono text-[10px] uppercase tracking-[0.12em] rounded-full px-2.5 py-1 border'
const STATUS_CHIP = {
  draft: 'border-white/25 text-white/70',
  pending_approval: 'border-gold/50 bg-gold/20 text-gold',
  published: 'border-transparent bg-sage text-white',
  ongoing: 'border-transparent bg-sage text-white',
  closed: 'border-white/25 bg-white/10 text-white/80',
  archived: 'border-white/20 text-white/50',
}

const parseDate = (d) => (d ? new Date(`${d}T00:00:00`) : null)
const fmtLong = (d) =>
  parseDate(d)?.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) || ''

export default function EventDetail({ eventId, onBack }) {
  const [event, setEvent] = useState(null)
  const [participants, setParticipants] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isOrganizer, setIsOrganizer] = useState(false)
  const [isReviewer, setIsReviewer] = useState(false)
  const [tab, setTab] = useState('overview')
  const [orgTab, setOrgTab] = useState('settings')

  const fetchEventData = async () => {
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('*, profiles(full_name, email)')
      .eq('id', eventId)
      .single()

    if (eventError) {
      setError(eventError.message)
      setLoading(false)
      return
    }

    setEvent(eventData)

    const { data: { user: currentUser } } = await supabase.auth.getUser()

    const { data: participantsData, error: participantsError } = await supabase
      .from('event_participants')
      .select('id, user_id, role_in_event, registered_at, registration_status, invited_at, validated_at, profiles(full_name, email)')
      .eq('event_id', eventId)

    if (participantsError) {
      console.error('Erreur chargement participants :', participantsError)
    } else {
      setParticipants(participantsData)
    }

    const mine =
      currentUser && participantsData
        ? participantsData.find((p) => p.user_id === currentUser.id)
        : null

    setIsOrganizer(
      Boolean(currentUser && (eventData.organizer_id === currentUser.id || mine?.role_in_event === 'organizer')),
    )
    setIsReviewer(mine?.role_in_event === 'reviewer')

    const { data: submissionsData, error: submissionsError } = await supabase
      .from('submissions')
      .select('id, author_id, title, abstract, status, submitted_at, profiles(full_name), reviews(id, score, comments, recommendation, reviewer_id, recommended_session_id), decisions(id, status, revision_type, decided_at)')
      .eq('event_id', eventId)

    if (submissionsError) {
      console.error('Erreur chargement soumissions :', submissionsError)
    } else {
      setSubmissions(submissionsData)
    }

    setLoading(false)
  }

  useEffect(() => {
    setLoading(true)
    fetchEventData()
  }, [eventId])

  const pendingCount = submissions.filter(
    (s) => s.status === 'submitted' || s.status === 'revision_requested',
  ).length

  const updateEvent = async (changes, refusedMessage) => {
    setError(null)
    const { data, error: updateError } = await supabase
      .from('events')
      .update(changes)
      .eq('id', event.id)
      .select('id')

    if (updateError) setError(updateError.message)
    else if (!data || data.length === 0) setError(refusedMessage)
    else fetchEventData()
  }

  const changePhase = (newPhase) => {
    if (newPhase === 'organizational') {
      const msg =
        pendingCount > 0
          ? `${pendingCount} article(s) sont encore en attente de décision ou de révision. Clore la phase scientifique bloquera les soumissions, les reviews et les décisions. Continuer ?`
          : 'Clore la phase scientifique ? Plus aucune soumission, review ni décision ne sera possible (tu pourras la rouvrir).'
      if (!window.confirm(msg)) return
    }
    updateEvent({ phase: newPhase }, "Changement refusé : tu n'es pas organisateur de cet événement.")
  }

  const changeFormat = (newFormat) =>
    updateEvent({ format: newFormat }, "Changement refusé : tu n'es pas organisateur de cet événement.")

  const requestPublication = () =>
    updateEvent({ status: 'pending_approval' }, 'Demande refusée.')

  const deleteDraft = async () => {
    if (!window.confirm('Supprimer ce brouillon ? Tout son contenu sera supprimé.')) return
    setError(null)

    const { data, error: deleteError } = await supabase
      .from('events')
      .delete()
      .eq('id', event.id)
      .select('id')

    if (deleteError) setError(deleteError.message)
    else if (!data || data.length === 0) setError('Suppression refusée.')
    else onBack()
  }

  if (loading) {
    return (
      <div className="page-container">
        <div className="skeleton h-4 w-32 mb-6" />
        <div className="card-panel space-y-4">
          <div className="skeleton h-6 w-24" />
          <div className="skeleton h-10 w-3/4" />
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-2/3" />
        </div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="page-container text-center py-20">
        <p className="alert-error inline-block">Événement introuvable</p>
        {error && <p className="font-mono text-xs text-taupe mt-3">{error}</p>}
      </div>
    )
  }

  const tabs = [
    { id: 'overview', label: 'Aperçu' },
    {
      id: 'scientific',
      label: 'Scientifique',
      badge: isOrganizer && pendingCount > 0 ? pendingCount : null,
    },
    { id: 'program', label: 'Programme' },
    ...(isOrganizer ? [{ id: 'organization', label: 'Organisation' }] : []),
  ]
  const activeTab = tabs.some((t) => t.id === tab) ? tab : 'overview'

  const orgTabs = [
    { id: 'settings', label: 'Événement' },
    { id: 'participants', label: 'Participants', badge: participants.length },
    { id: 'registrations', label: 'Inscriptions' },
    { id: 'sponsors', label: 'Sponsors' },
    { id: 'attendance', label: 'Présences' },
  ]

  const start = parseDate(event.start_date)
  const tileMonth = start
    ? start.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')
    : ''
  const tileDay = start ? start.getDate() : ''
  const dateRange =
    fmtLong(event.start_date) +
    (event.end_date && event.end_date !== event.start_date ? ` → ${fmtLong(event.end_date)}` : '')

  const organizerName = event.profiles?.full_name || ''
  const organizerInitial = (organizerName.trim().charAt(0) || '?').toUpperCase()

  const acceptedCount = submissions.filter((s) => s.status === 'accepted').length
  const validatedCount = participants.filter(
    (p) => p.role_in_event === 'participant' && p.registration_status === 'validated',
  ).length

  const stats = isOrganizer
    ? [
        ['Soumissions', submissions.length],
        ['En attente', pendingCount],
        ['Acceptés', acceptedCount],
        ['Inscrits', validatedCount],
      ]
    : [
        ['Articles acceptés', acceptedCount],
        ['Inscrits', validatedCount],
      ]

  return (
    <div className="page-container">
      <button onClick={onBack} className="btn-ghost-gold text-sm mb-6 -ml-3">
        ← Retour à la liste
      </button>

      {/* En-tête */}
      <div className="relative overflow-hidden rounded-2xl bg-ink text-white shadow-lg">
        <div className="h-1.5 bg-gold" />
        <div aria-hidden="true" className="absolute -right-20 -top-24 w-72 h-72 rounded-full bg-gold/10" />
        <div aria-hidden="true" className="absolute right-6 -bottom-16 w-44 h-44 rounded-full border border-gold/20" />

        <div className="relative p-6 sm:p-10">
          <div className="flex flex-wrap items-center gap-2 mb-5">
            <span className={`${CHIP} border-white/25 text-white/80`}>
              {TYPE_LABELS[event.type] || event.type}
            </span>
            <span className={`${CHIP} border-white/25 text-white/80`}>
              {FORMAT_LABELS[event.format] || event.format}
            </span>
            <span className={`${CHIP} ${STATUS_CHIP[event.status] || STATUS_CHIP.draft}`}>
              {STATUS_LABELS[event.status] || event.status}
            </span>
          </div>

          <h1
            className="font-display font-semibold tracking-tight text-3xl sm:text-5xl leading-tight text-balance max-w-3xl"
            style={{ overflowWrap: 'anywhere' }}
          >
            {event.title}
          </h1>

          <div className="flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-8 mt-7">
            {start && (
              <div className="shrink-0 w-20 rounded-xl bg-white/10 border border-white/15 py-3 text-center">
                <p className="font-mono text-[10px] uppercase tracking-widest text-gold">{tileMonth}</p>
                <p className="font-display text-4xl font-semibold leading-none mt-1">{tileDay}</p>
              </div>
            )}
            <div className="space-y-2 text-sm text-white/80 min-w-0">
              {dateRange && (
                <p className="flex items-center gap-2">
                  <CalendarIcon className="shrink-0 text-gold" />
                  <span>{dateRange}</span>
                </p>
              )}
              {event.location && (
                <p className="flex items-center gap-2">
                  <PinIcon className="shrink-0 text-gold" />
                  <span style={{ overflowWrap: 'anywhere' }}>{event.location}</span>
                </p>
              )}
              <p className="flex items-center gap-2">
                <UserIcon className="shrink-0 text-gold" />
                <span>Organisé par {organizerName}</span>
              </p>
            </div>
          </div>

          {isOrganizer && event.status === 'draft' && (
            <button onClick={requestPublication} className="btn-accent btn-sm mt-6">
              Demander la publication
            </button>
          )}
          {isOrganizer && event.status === 'pending_approval' && (
            <div className="mt-6 rounded-lg bg-white/10 border border-white/15 px-4 py-3 text-sm text-white/80">
              En attente de validation par un administrateur
            </div>
          )}

          <PhaseStepper phase={event.phase} />
        </div>
      </div>

      {error && <div className="alert-error mt-4">{error}</div>}

      {/* Navigation principale, collée sous la barre du haut */}
      <div className="sticky top-16 z-40 bg-paper/95 backdrop-blur-sm mt-6 -mx-5 px-5 sm:-mx-8 sm:px-8 lg:-mx-10 lg:px-10">
        <Tabs tabs={tabs} active={activeTab} onChange={setTab} />
      </div>

      <div className="mt-6">
        {/* APERÇU */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start">
            <div className="space-y-6 min-w-0">
              <div className={`grid gap-3 grid-cols-2 ${isOrganizer ? 'sm:grid-cols-4' : ''}`}>
                {stats.map(([label, value]) => (
                  <div key={label} className="card p-4">
                    <p className="font-display text-3xl font-semibold text-ink leading-none">{value}</p>
                    <p className="section-label mt-2">{label}</p>
                  </div>
                ))}
              </div>

              {event.description && (
                <div className="card p-5 sm:p-6 border-l-4 border-gold">
                  <h2 className="section-heading text-xl mb-3">À propos</h2>
                  <p
                    className="text-taupe leading-relaxed whitespace-pre-line"
                    style={{ overflowWrap: 'anywhere' }}
                  >
                    {event.description}
                  </p>
                </div>
              )}

              {!isOrganizer && <SponsorsPanel eventId={eventId} isOrganizer={false} />}
            </div>

            <aside className="order-first lg:order-none space-y-4 lg:sticky lg:top-32">
              <div className="card-ticket-static">
                <div className="ticket-stripe" />
                <div className="ticket-perforation" />
                <div className="p-5 flex-1 min-w-0">
                  <p className="section-label mb-4">Ma participation</p>
                  <RegistrationCard event={event} participants={participants} onRefresh={fetchEventData} />
                </div>
              </div>

              <div className="card p-5">
                <p className="section-label mb-3">Organisateur</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-ink text-white flex items-center justify-center font-display font-semibold shrink-0">
                    {organizerInitial}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{organizerName}</p>
                    {event.profiles?.email && (
                      <a
                        href={`mailto:${event.profiles.email}`}
                        className="font-mono text-xs text-taupe hover:text-ink truncate block"
                      >
                        {event.profiles.email}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </aside>
          </div>
        )}

        {/* SCIENTIFIQUE */}
        {activeTab === 'scientific' && (
          <div className="max-w-4xl">
            <ScientificPanel
              eventId={eventId}
              submissions={submissions}
              participants={participants}
              isOrganizer={isOrganizer}
              isReviewer={isReviewer}
              isAdmin={false}
              frozen={event.phase !== 'scientific'}
              onRefresh={fetchEventData}
            />
          </div>
        )}

        {/* PROGRAMME */}
        {activeTab === 'program' && (
          <div className="max-w-4xl">
            <SessionsPanel
              eventId={eventId}
              isOrganizer={isOrganizer}
              phase={event.phase}
              submissions={submissions}
            />
          </div>
        )}

        {/* ORGANISATION */}
        {activeTab === 'organization' && isOrganizer && (
          <div className="space-y-6">
            <Tabs tabs={orgTabs} active={orgTab} onChange={setOrgTab} variant="pill" />

            <div className="max-w-4xl">
              {orgTab === 'settings' && (
                <div className="space-y-4 max-w-2xl">
                  <div className="card p-5 sm:p-6" style={{ borderLeft: '6px solid #C8963E' }}>
                    <p className="section-label">Format</p>
                    <h3 className="font-display text-xl font-semibold text-ink mt-1">
                      {FORMAT_LABELS[event.format] || event.format}
                    </h3>
                    <p className="text-sm text-taupe mt-2 mb-4">
                      En ligne : les inscrits n'ont pas de badge QR, la présence se pointe à la main.
                    </p>
                    <select
                      className="select-field w-full sm:w-auto"
                      value={event.format}
                      onChange={(e) => changeFormat(e.target.value)}
                    >
                      <option value="onsite">Présentiel</option>
                      <option value="online">En ligne</option>
                      <option value="hybrid">Hybride</option>
                    </select>
                  </div>

                  <div
                    className="card p-5 sm:p-6"
                    style={{ borderLeft: `6px solid ${event.phase === 'scientific' ? '#F2A93B' : '#34C38F'}` }}
                  >
                    <p className="section-label">Phase</p>
                    <h3 className="font-display text-xl font-semibold text-ink mt-1">
                      {PHASE_LABELS[event.phase]}
                    </h3>
                    {event.phase === 'scientific' ? (
                      <>
                        <p className="text-sm text-taupe mt-2 mb-4">
                          Clore la phase gèle les soumissions, les reviews et les décisions, et ouvre les invitations et le programme définitif.
                          {pendingCount > 0 && ` ${pendingCount} article(s) sont encore en attente.`}
                        </p>
                        <button type="button" className="btn-outline btn-sm" onClick={() => changePhase('organizational')}>
                          Clore la phase scientifique
                        </button>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-taupe mt-2 mb-4">
                          La phase scientifique est close. Tu peux la rouvrir si une décision doit être corrigée.
                        </p>
                        <button type="button" className="btn-outline btn-sm" onClick={() => changePhase('scientific')}>
                          Rouvrir la phase scientifique
                        </button>
                      </>
                    )}
                  </div>

                  {event.status === 'draft' && (
                    <div className="card p-5 sm:p-6" style={{ borderLeft: '6px solid #E5534B' }}>
                      <p className="section-label">Zone sensible</p>
                      <p className="text-sm text-taupe mt-2 mb-4">
                        Supprimer un brouillon efface tout son contenu.
                      </p>
                      <button type="button" className="btn-danger btn-sm" onClick={deleteDraft}>
                        Supprimer le brouillon
                      </button>
                    </div>
                  )}
                </div>
              )}

              {orgTab === 'participants' && (
                <div>
                  <div className="flex items-baseline gap-3 mb-5">
                    <h2 className="section-heading text-xl">Participants</h2>
                    <span className="font-mono text-xs text-taupe">{participants.length}</span>
                  </div>
                  <ManageParticipants participants={participants} onUpdated={fetchEventData} />
                </div>
              )}

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
                  <div className="alert-info">
                    Le pointage des présences s'ouvre en phase organisationnelle.
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}