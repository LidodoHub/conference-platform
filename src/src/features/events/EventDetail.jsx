import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import SubmissionForm from '../submissions/SubmissionForm'
import ReviewForm from '../reviews/ReviewForm'
import CertificateButton from '../certificates/CertificateButton'
import PaymentButton from '../payments/PaymentButton'
import ManageParticipants from './ManageParticipants'

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
    setLoading(true)

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

    if (currentUser && eventData.organizer_id === currentUser.id) {
      setIsOrganizer(true)
    }


    const { data: participantsData, error: participantsError } = await supabase
      .from('event_participants')
      .select('id, role_in_event, registered_at, profiles(full_name, email)')
      .eq('event_id', eventId)

    if (!participantsError) {
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
      .select('id, title, abstract, status, submitted_at, profiles(full_name)')
      .eq('event_id', eventId)

    if (!submissionsError) {
      setSubmissions(submissionsData)
    }

    setLoading(false)
  }

  useEffect(() => {
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
              </div>

              <h1 className="section-heading text-3xl sm:text-4xl leading-tight text-balance">
                {event.title}
              </h1>

              {event.description && (
                <p className="text-taupe mt-4 leading-relaxed max-w-2xl">
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
              {isOrganizer && event.status === 'pending_approval' && (
                <div className="alert-info mt-5">
                  En attente de validation par un administrateur
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

          {/* Soumissions */}
          <section>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div className="flex items-baseline gap-3">
                <h2 className="section-heading text-xl">Soumissions</h2>
                <span className="font-mono text-xs text-taupe">{submissions.length}</span>
              </div>
              <button
                onClick={() => setShowSubmissionForm(!showSubmissionForm)}
                className={showSubmissionForm ? 'btn-outline btn-sm' : 'btn-ghost-gold btn-sm'}
              >
                {showSubmissionForm ? 'Annuler' : '+ Soumettre un article'}
              </button>
            </div>

            {showSubmissionForm && (
              <div className="mb-6">
                <SubmissionForm
                  eventId={eventId}
                  onSubmitted={() => {
                    setShowSubmissionForm(false)
                    fetchEventData()
                  }}
                />
              </div>
            )}

            {submissions.length === 0 ? (
              <p className="text-taupe text-sm py-4">Aucune soumission pour l'instant.</p>
            ) : (
              <ul className="space-y-4">
                {submissions.map((s) => (
                  <li key={s.id} className="submission-card">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <h3 className="font-display font-semibold text-ink leading-snug">{s.title}</h3>
                      <span className={SUBMISSION_BADGE[s.status] || 'badge-submitted'}>
                        {SUBMISSION_LABELS[s.status] || s.status}
                      </span>
                    </div>

                    {s.abstract && (
                      <p className="text-sm text-taupe mt-3 leading-relaxed">{s.abstract}</p>
                    )}

                    <p className="font-mono text-xs text-taupe/70 mt-3">
                      {s.profiles?.full_name}
                      {s.submitted_at && <> · {s.submitted_at.split('T')[0]}</>}
                    </p>

                    {s.status === 'submitted' && (isOrganizer || isReviewer) && (
                      <button
                        onClick={() => setReviewingId(reviewingId === s.id ? null : s.id)}
                        className="btn-ghost-gold btn-sm mt-4 -ml-2"
                      >
                        {reviewingId === s.id ? 'Annuler la review' : '+ Faire une review'}
                      </button>
                    )}

                    {reviewingId === s.id && (
                      <ReviewForm
                        submissionId={s.id}
                        onReviewed={() => {
                          setReviewingId(null)
                          fetchEventData()
                        }}
                      />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Sidebar actions */}
        <aside className="lg:sticky lg:top-24 space-y-4">
          <div className="card-panel border border-ink/8">
            <p className="section-label mb-4">Participation</p>

            {error && <div className="alert-error mb-4">{error}</div>}

            {isRegistered ? (
              <div className="space-y-4">
                <div className="alert-success">
                  Vous êtes inscrit à cet événement
                </div>
                <PaymentButton eventId={event.id} />
                <CertificateButton event={event} />
              </div>
            ) : (
              <button
                onClick={handleRegister}
                disabled={registering}
                className="btn-primary w-full"
              >
                {registering ? 'Inscription…' : "S'inscrire à l'événement"}
              </button>
            )}
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
