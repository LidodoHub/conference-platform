import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function EventsPage({ onSelectEvent }) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  // Formulaire de création
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState('conference')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [location, setLocation] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const fetchEvents = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('events')
      .select('*, profiles(full_name)')
      .order('created_at', { ascending: false })

    if (error) {
      console.error(error)
    } else {
      setEvents(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchEvents()
  }, [])

  const handleCreateEvent = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setError('Tu dois être connecté pour créer un événement')
      setSubmitting(false)
      return
    }

    const { error: insertError } = await supabase
      .from('events')
      .insert({
        title,
        description,
        type,
        organizer_id: user.id,
        start_date: startDate,
        end_date: endDate,
        location,
        status: 'draft',
      })

    if (insertError) {
      setError(insertError.message)
      setSubmitting(false)
      return
    }

    // Reset form
    setTitle('')
    setDescription('')
    setType('conference')
    setStartDate('')
    setEndDate('')
    setLocation('')
    setShowForm(false)
    setSubmitting(false)
    fetchEvents() // recharge la liste
  }

  return (
    <div className="max-w-2xl mx-auto mt-10 p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Événements</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {showForm ? 'Annuler' : '+ Créer un événement'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreateEvent} className="space-y-3 mb-8 p-4 border rounded-lg">
          <input
            type="text"
            placeholder="Titre de l'événement"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border p-2 rounded"
            required
          />
          <textarea
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border p-2 rounded"
            rows={3}
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full border p-2 rounded"
          >
            <option value="conference">Conférence</option>
            <option value="colloquium">Colloque</option>
            <option value="seminar">Séminaire</option>
            <option value="workshop">Workshop</option>
          </select>
          <div className="flex gap-3">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full border p-2 rounded"
              required
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full border p-2 rounded"
              required
            />
          </div>
          <input
            type="text"
            placeholder="Lieu"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full border p-2 rounded"
          />

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:opacity-50"
          >
            {submitting ? 'Création...' : 'Créer l\'événement'}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-gray-500">Chargement...</p>
      ) : events.length === 0 ? (
        <p className="text-gray-500">Aucun événement pour l'instant.</p>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <div
                key={event.id}
                onClick={() => onSelectEvent(event.id)}
                className="p-4 border rounded-lg cursor-pointer hover:bg-gray-50"
            >
                <h3 className="font-bold">{event.title}</h3>
                <p className="text-sm text-gray-600">{event.description}</p>
                <p className="text-xs text-gray-400 mt-1">
                {event.type} · {event.start_date} → {event.end_date} · {event.location}
                </p>
                <span className="inline-block mt-2 text-xs px-2 py-1 bg-gray-100 rounded">
                {event.status} by {event.profiles?.full_name}
                </span>
            </div>
            ))}
        </div>
      )}
    </div>
  )
}