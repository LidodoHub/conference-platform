import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import SubmissionForm from '../submissions/SubmissionForm'
import ReviewForm from '../reviews/ReviewForm'
import CertificateButton from '../certificates/CertificateButton'
import PaymentButton from '../payments/PaymentButton'
import ManageParticipants from './ManageParticipants'

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

    // 1. Récupérer l'event
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

    // 2. Récupérer l'user courant (une seule fois, réutilisé partout en dessous)
    const { data: { user: currentUser } } = await supabase.auth.getUser()

    // 3. Check si c'est l'organisateur
    if (currentUser && eventData.organizer_id === currentUser.id) {
      setIsOrganizer(true)
    }


    // 4. Récupérer les participants
    const { data: participantsData, error: participantsError } = await supabase
      .from('event_participants')
      .select('id, role_in_event, registered_at, profiles(full_name, email)')
      .eq('event_id', eventId)

    if (!participantsError) {
      setParticipants(participantsData)
    }

    // 5. Check si l'user courant est inscrit
    if (currentUser && participantsData) {
      setIsRegistered(participantsData.some(p => p.profiles?.email === currentUser.email))
    }

    if (currentUser && participantsData) {
      const myParticipation = participantsData.find(p => p.profiles?.email === currentUser.email)
      if (myParticipation?.role_in_event === 'reviewer') {
        setIsReviewer(true)
      }
    }

    // 6. Récupérer les submissions
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

  if (loading) return <p className="text-gray-500 text-center mt-10">Chargement...</p>
  if (!event) return <p className="text-red-600 text-center mt-10">Événement introuvable</p>

  return (
    <div className="max-w-2xl mx-auto mt-10 p-6">
      <button onClick={onBack} className="text-sm text-blue-600 mb-4">
        ← Retour à la liste
      </button>

      <div className="p-6 border rounded-lg mb-6">
        <h1 className="text-2xl font-bold">{event.title}</h1>
        <p className="text-gray-600 mt-2">{event.description}</p>
        <p className="text-sm text-gray-400 mt-3">
          {event.type} · {event.start_date} → {event.end_date} · {event.location}
        </p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-gray-100 rounded">
          {event.status}
        </span>
        <p className="text-xs text-gray-500 mt-2">
          Organisé par {event.profiles?.full_name} ({event.profiles?.email})
        </p>

        {isOrganizer && event.status === 'draft' && (
          <button
            onClick={async () => {
              await supabase.from('events').update({ status: 'pending_approval' }).eq('id', event.id)
              fetchEventData()
            }}
            className="ml-2 text-xs text-amber-600 underline"
          >
            Demander la publication
          </button>
        )}
        {isOrganizer && event.status === 'pending_approval' && (
          <p className="text-xs text-amber-600 mt-2">
            ⏳ En attente de validation par un admin
          </p>
        )}

        {error && <p className="text-red-600 text-sm mt-3">{error}</p>}

        <div className="mt-4">
          {isRegistered ? (
            <p className="text-green-600 text-sm font-medium">✓ Tu es inscrit à cet événement</p>
          ) : (
            <button
              onClick={handleRegister}
              disabled={registering}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {registering ? 'Inscription...' : "S'inscrire à l'événement"}
            </button>
          )}
          {isRegistered && (
            <div className="mt-3">
              <PaymentButton eventId={event.id} />
            </div>
          )}
          {isRegistered && (
            <div className="mt-3">
              <CertificateButton event={event} />
            </div>
          )}
        </div>
      </div>

      <div className="mt-8">
        <h2 className="font-bold mb-3">Participants ({participants.length})</h2>
        {isOrganizer ? (
          <ManageParticipants participants={participants} onUpdated={fetchEventData} />
        ) : (
          participants.length === 0 ? (
            <p className="text-gray-500 text-sm">Aucun participant inscrit.</p>
          ) : (
            <ul className="space-y-2">
              {participants.map((p) => (
                <li key={p.id} className="text-sm p-2 border rounded">
                  {p.profiles?.full_name} ({p.role_in_event})
                </li>
              ))}
            </ul>
          )
        )}
      </div>
      <div className="mt-8">
        <div className="flex justify-between items-center mb-3">
            <h2 className="font-bold">Soumissions ({submissions.length})</h2>
            <button
            onClick={() => setShowSubmissionForm(!showSubmissionForm)}
            className="text-sm text-blue-600"
            >
            {showSubmissionForm ? 'Annuler' : '+ Soumettre un article'}
            </button>
        </div>

        {showSubmissionForm && (
            <div className="mb-4">
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
            <p className="text-gray-500 text-sm">Aucune soumission pour l'instant.</p>
        ) : (
            <ul className="space-y-2">
              {submissions.map((s) => (
                <li key={s.id} className="text-sm p-3 border rounded">
                  <p className="font-medium">{s.title}</p>
                  <p className="text-gray-600 text-xs mt-1">{s.abstract}</p>
                  <p className="text-gray-400 text-xs mt-1">
                    par {s.profiles?.full_name} · {s.status}
                  </p>

                  {s.status === 'submitted' && (isOrganizer || isReviewer) && (
                    <button
                      onClick={() => setReviewingId(reviewingId === s.id ? null : s.id)}
                      className="text-xs text-purple-600 mt-2"
                    >
                      {reviewingId === s.id ? 'Annuler' : '+ Faire une review'}
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
        </div>
    </div>
  )
}