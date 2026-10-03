import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import SubmissionForm from '../submissions/SubmissionForm'
import ReviewForm from '../reviews/ReviewForm'
import CertificateButton from '../certificates/CertificateButton'
import PaymentButton from '../payments/PaymentButton'
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

const STATUS_BADGE = {
  draft: 'badge-draft',
  pending_approval: 'badge-pending',
  published: 'badge-published',
  ongoing: 'badge-ongoing',
  closed: 'badge-closed',
  archived: 'badge-archived',
}

const STATUS_LABELS = {
  draft: 'Brouillon',
  pending_approval: 'En validation',
  published: 'Publié',
  ongoing: 'En cours',
  closed: 'Clôturé',
  archived: 'Archivé',
}

const SUBMISSION_BADGE = {
  submitted: 'badge-submitted',
  accepted: 'badge-accepted',
  rejected: 'badge-rejected',
  revision_requested: 'badge-revision',
}

const SUBMISSION_LABELS = {
  submitted: 'Soumis',
  accepted: 'Accepté',
  rejected: 'Rejeté',
  revision_requested: 'Révision demandée',
}

const ROLE_LABELS = {
  participant: 'Participant',
  reviewer: 'Reviewer',
  organizer: 'Organisateur',
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

export default function EventDetail({ eventId, onBack }) {
  const [event, setEvent] = useState(null)
  const [participants, setParticipants] = useState([])
  const [isRegistered, setIsRegistered] = useState(false)
  const [loading, setLoading] = useState(true)
  const [registering, setRegistering] = useState(false)
  const [error, setError] = useState(null)
  const [submissions, setSubmissions] = useState([])
  const [showSubmissionForm, setShowSubmissionForm] = useState(false)
  const [reviewingId, setReviewingId] = useState(null)
  const [isOrganizer, setIsOrganizer] = useState(false)
  const [isReviewer, setIsReviewer] = useState(false)

  const fetchEventData = async () => {

    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('*, profiles!organizer_id(full_name, email)')
      .eq('id', eventId)
      .single()

    if (eventError) {
      setError(eventError.message)
      setLoading(false)
      return
    }

    setEvent(eventData)

    const { data: { user: currentUser } } = await supabase.auth.getUser()

    if (currentUser && eventData.organizer_id === currentUser.id) {
      setIsOrganizer(true)
    }


    const { data: participantsData, error: participantsError } = await supabase
      .from('event_participants')
      .select('id, user_id, role_in_event, registered_at, registration_status, invited_at, validated_at, profiles(full_name, email)')
      .eq('event_id', eventId)

    if (participantsError) {
      console.error('Erreur chargement participants :', participantsError)
    } else {
      setParticipants(participantsData)
    }

    if (currentUser && participantsData) {
      setIsRegistered(participantsData.some(p => p.profiles?.email === currentUser.email))
    }

    if (currentUser && participantsData) {
      const myParticipation = participantsData.find(p => p.profiles?.email === currentUser.email)
      if (myParticipation?.role_in_event === 'reviewer') {
        setIsReviewer(true)
      }
    }

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

  const handleRegister = async () => {
    setRegistering(true)
    setError(null)

    const { data: { user: currentUser } } = await supabase.auth.getUser()

    if (!currentUser) {
      setError('Tu dois être connecté')
      setRegistering(false)
      return
    }

    const { error: insertError } = await supabase
      .from('event_participants')
      .insert({
        event_id: eventId,
        user_id: currentUser.id,
        role_in_event: 'participant',
      })

    if (insertError) {
      setError(insertError.message)
      setRegistering(false)
      return
    }

    setRegistering(false)
    fetchEventData()
  }

    const pendingCount = submissions.filter(
    (s) => s.status === 'submitted' || s.status === 'revision_requested',
  ).length

  const changePhase = async (newPhase) => {
    setError(null)
    if (newPhase === 'organizational') {
      const msg =
        pendingCount > 0
          ? `${pendingCount} article(s) sont encore en attente de décision ou de révision. Clore la phase scientifique bloquera les soumissions, les reviews et les décisions. Continuer ?`
          : 'Clore la phase scientifique ? Plus aucune soumission, review ni décision ne sera possible (tu pourras la rouvrir).'
      if (!window.confirm(msg)) return
    }

    const { data, error: updateError } = await supabase
      .from('events')
      .update({ phase: newPhase })
      .eq('id', event.id)
      .select('id')

    if (updateError) setError(updateError.message)
    else if (!data || data.length === 0) setError("Changement refusé : tu n'es pas organisateur de cet événement.")
    else fetchEventData()
  }

  const changeFormat = async (newFormat) => {
    setError(null)
    const { data, error: updateError } = await supabase
      .from('events')
      .update({ format: newFormat })
      .eq('id', event.id)
      .select('id')

    if (updateError) setError(updateError.message)
    else if (!data || data.length === 0) setError("Changement refusé : tu n'es pas organisateur de cet événement.")
    else fetchEventData()
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

  return (
    <div className="page-container">
      {/* Fil d'Ariane */}
      <button
        onClick={onBack}
        className="btn-ghost-gold text-sm mb-6 -ml-3"
      >
        ← Retour à la liste
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_360px] gap-8 items-start">
        {/* Colonne principale */}
        <div className="space-y-8 min-w-0">
          {/* En-tête événement */}
          <div className="card-ticket-static">
            <div className="ticket-stripe" />
            <div className="ticket-perforation" />
            <div className="p-6 sm:p-8 flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <span className="badge-type">
                  {TYPE_LABELS[event.type] || event.type}
                </span>
                <span className={STATUS_BADGE[event.status] || 'badge-draft'}>
                  {STATUS_LABELS[event.status] || event.status}
                </span>
                <span className="badge-type">
                  {FORMAT_LABELS[event.format] || event.format}
                </span>
                <span className={event.phase === 'scientific' ? 'badge-pending' : 'badge-ongoing'}>
                  {PHASE_LABELS[event.phase] || event.phase}
                </span>
              </div>

              <h1 className="section-heading text-3xl sm:text-4xl leading-tight text-balance">
                {event.title}
              </h1>

              {event.description && (
                <p className="text-taupe mt-4 leading-relaxed max-w-2xl" style={{ overflowWrap: 'anywhere' }}>
                  {event.description}
                </p>
              )}

              <div className="flex flex-wrap gap-x-6 gap-y-2 mt-6 font-mono text-sm text-ink/60">
                <span>{event.start_date} → {event.end_date}</span>
                {event.location && <span>{event.location}</span>}
              </div>

              <div className="divider-dotted mt-6 pt-5 flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="text-sm text-ink/70">
                  Organisateur : <span className="font-medium text-ink">{event.profiles?.full_name}</span>
                </span>
                <span className="text-xs text-taupe font-mono hidden sm:inline">·</span>
                <span className="text-xs text-taupe font-mono">{event.profiles?.email}</span>
              </div>

              {isOrganizer && event.status === 'draft' && (
                <button
                  onClick={async () => {
                    await supabase.from('events').update({ status: 'pending_approval' }).eq('id', event.id)
                    fetchEventData()
                  }}
                  className="btn-outline btn-sm mt-5"
                >
                  Demander la publication
                </button>
              )}
              
              {isOrganizer && event.status === 'draft' && (
                <button
                  onClick={async () => {
                    if (!window.confirm('Supprimer ce brouillon ? Tout son contenu sera supprimé.')) return
                    const { data, error: deleteError } = await supabase
                      .from('events')
                      .delete()
                      .eq('id', event.id)
                      .select('id')
                    if (deleteError) setError(deleteError.message)
                    else if (!data || data.length === 0) setError('Suppression refusée.')
                    else onBack()
                  }}
                  className="btn-danger btn-sm mt-3"
                >
                  Supprimer le brouillon
                </button>
              )}


              {isOrganizer && event.status === 'pending_approval' && (
                <div className="alert-info mt-5">
                  En attente de validation par un administrateur
                </div>
              )}

              {isOrganizer && (
                <div className="mt-5 pt-4 border-t border-dashed border-taupe/30 space-y-3">
                  <p className="section-label">Gestion de l'événement</p>
                  <div className="flex flex-wrap items-center gap-3">
                    <label htmlFor="event-format" className="text-xs text-taupe">Format</label>
                    <select
                      id="event-format"
                      className="select-field w-auto text-xs py-1.5"
                      value={event.format}
                      onChange={(e) => changeFormat(e.target.value)}
                    >
                      <option value="onsite">Présentiel</option>
                      <option value="online">En ligne</option>
                      <option value="hybrid">Hybride</option>
                    </select>

                    {event.phase === 'scientific' ? (
                      <button type="button" className="btn-outline btn-sm" onClick={() => changePhase('organizational')}>
                        Clore la phase scientifique
                      </button>
                    ) : (
                      <button type="button" className="btn-outline btn-sm" onClick={() => changePhase('scientific')}>
                        Rouvrir la phase scientifique
                      </button>
                    )}
                  </div>
                  {event.phase === 'scientific' && pendingCount > 0 && (
                    <p className="text-xs text-taupe">
                      {pendingCount} article(s) en attente de décision ou de révision.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Participants */}
          <section>
            <div className="flex items-baseline gap-3 mb-5">
              <h2 className="section-heading text-xl">Participants</h2>
              <span className="font-mono text-xs text-taupe">{participants.length}</span>
            </div>

            {isOrganizer ? (
              <ManageParticipants participants={participants} onUpdated={fetchEventData} />
            ) : participants.length === 0 ? (
              <p className="text-taupe text-sm py-4">Aucun participant inscrit pour l'instant.</p>
            ) : (
              <ul className="space-y-2">
                {participants.map((p) => (
                  <li key={p.id} className="list-item">
                    <div>
                      <span className="text-sm font-medium text-ink">{p.profiles?.full_name}</span>
                      <span className="font-mono text-xs text-taupe ml-2">{p.profiles?.email}</span>
                    </div>
                    <span className="badge-type">{ROLE_LABELS[p.role_in_event] || p.role_in_event}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

                    {/* Soumissions et décisions */}
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

          {isOrganizer && (
            <InvitationsPanel
              eventId={eventId}
              event={event}
              phase={event.phase}
              submissions={submissions}
              participants={participants}
              onRefresh={fetchEventData}
            />
          )}

          <SessionsPanel
            eventId={eventId}
            isOrganizer={isOrganizer}
            phase={event.phase}
            submissions={submissions}
          />

          {isOrganizer && event.phase === 'organizational' && (
            <AttendancePanel eventId={eventId} participants={participants} />
          )}

          <SponsorsPanel eventId={eventId} isOrganizer={isOrganizer} />
        </div>

        {/* Sidebar actions */}
        <aside className="lg:sticky lg:top-24 space-y-4">
          <div className="card-panel border border-ink/8">
            <p className="section-label mb-4">Participation</p>

            {error && <div className="alert-error mb-4">{error}</div>}

            <RegistrationCard event={event} participants={participants} onRefresh={fetchEventData} />
          </div>

          {/* Meta sidebar */}
          <div className="card p-5 space-y-3">
            <p className="section-label">Informations</p>
            <div className="space-y-2.5">
              <div>
                <p className="text-xs text-taupe">Type</p>
                <p className="text-sm font-medium text-ink">{TYPE_LABELS[event.type] || event.type}</p>
              </div>
              <div>
                <p className="text-xs text-taupe">Statut</p>
                <p className="text-sm font-medium text-ink">{STATUS_LABELS[event.status] || event.status}</p>
              </div>
              <div>
                <p className="text-xs text-taupe">Participants</p>
                <p className="font-mono text-sm text-ink">{participants.length}</p>
              </div>
              <div>
                <p className="text-xs text-taupe">Soumissions</p>
                <p className="font-mono text-sm text-ink">{submissions.length}</p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
