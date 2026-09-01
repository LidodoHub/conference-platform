import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import GlareHover from '../../components/reactbits/GlareHover'
import FadeContent from '../../components/reactbits/FadeContent'

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

export default function EventsPage({ onSelectEvent }) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

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

    setTitle('')
    setDescription('')
    setType('conference')
    setStartDate('')
    setEndDate('')
    setLocation('')
    setShowForm(false)
    setSubmitting(false)
    fetchEvents()
  }

  return (
    <div className="page-container">
      {/* En-tête de page */}
      <FadeContent className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
        <div>
          <p className="section-label mb-2">Catalogue</p>
          <h1 className="section-heading text-4xl sm:text-5xl">Événements</h1>
          <p className="text-taupe text-sm mt-2 max-w-lg leading-relaxed">
            Parcourez les conférences et colloques disponibles, ou créez le vôtre en tant qu'organisateur.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className={showForm ? 'btn-outline flex-shrink-0' : 'btn-accent flex-shrink-0'}
        >
          {showForm ? 'Annuler' : '+ Créer un événement'}
        </button>
      </FadeContent>

      {/* Formulaire de création */}
      {showForm && (
        <div className="card-panel mb-10 border border-gold/20">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-1 self-stretch bg-gold rounded-full flex-shrink-0" />
            <div>
              <p className="section-label">Nouvel événement</p>
              <h2 className="section-heading text-xl mt-1">Créer un événement</h2>
              <p className="text-taupe text-xs mt-1">L'événement sera créé en brouillon et devra être validé par un admin.</p>
            </div>
          </div>

          <form onSubmit={handleCreateEvent} className="space-y-5">
            <div>
              <label htmlFor="event-title" className="form-label">Titre</label>
              <input
                id="event-title"
                type="text"
                placeholder="Colloque international sur l'IA appliquée"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input-field"
                required
              />
            </div>

            <div>
              <label htmlFor="event-desc" className="form-label">Description</label>
              <textarea
                id="event-desc"
                placeholder="Présentation générale de l'événement, thématiques couvertes…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="textarea-field"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label htmlFor="event-type" className="form-label">Type</label>
                <select
                  id="event-type"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="select-field"
                >
                  <option value="conference">Conférence</option>
                  <option value="colloquium">Colloque</option>
                  <option value="seminar">Séminaire</option>
                  <option value="workshop">Workshop</option>
                </select>
              </div>
              <div>
                <label htmlFor="event-location" className="form-label">Lieu</label>
                <input
                  id="event-location"
                  type="text"
                  placeholder="Université d'Alger, Amphi A"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="input-field"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label htmlFor="event-start" className="form-label">Date de début</label>
                <input
                  id="event-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="input-field font-mono text-sm"
                  required
                />
              </div>
              <div>
                <label htmlFor="event-end" className="form-label">Date de fin</label>
                <input
                  id="event-end"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="input-field font-mono text-sm"
                  required
                />
              </div>
            </div>

            {error && <div className="alert-error">{error}</div>}

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full sm:w-auto"
            >
              {submitting ? 'Création en cours…' : "Créer l'événement"}
            </button>
          </form>
        </div>
      )}

      {/* Liste des événements */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card-ticket h-48">
              <div className="ticket-stripe skeleton" />
              <div className="ticket-perforation" />
              <div className="p-5 flex-1 space-y-3">
                <div className="skeleton h-5 w-3/4" />
                <div className="skeleton h-3 w-full" />
                <div className="skeleton h-3 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="card-panel text-center py-16">
          <div className="w-12 h-12 rounded-full bg-paper-dark flex items-center justify-center mx-auto mb-4">
            <span className="font-display text-2xl text-taupe">∅</span>
          </div>
          <p className="section-heading text-xl">Aucun événement</p>
          <p className="text-taupe text-sm mt-2 max-w-sm mx-auto">
            Soyez le premier à créer un événement scientifique sur la plateforme.
          </p>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="btn-accent mt-6"
            >
              + Créer un événement
            </button>
          )}
        </div>
      ) : (
        <FadeContent delay={0.05}>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {events.map((event) => (
            <GlareHover
              key={event.id}
              width="100%"
              height="auto"
              background="transparent"
              borderRadius="12px"
              borderColor="rgba(27,42,74,0.08)"
              glareColor="#C8963E"
              glareOpacity={0.22}
              className="!border-ink/8"
            >
                <article
                  onClick={() => onSelectEvent(event.id)}
                  className="card-ticket group !shadow-none !border-0"
                >
                  <div className="ticket-stripe group-hover:w-4 transition-all duration-300" />
                  <div className="ticket-perforation" />
                  <div className="p-5 sm:p-6 flex-1 flex flex-col">
                    <div className="flex justify-between items-start gap-3 mb-2">
                      <h3 className="font-display font-semibold text-lg text-ink leading-snug group-hover:text-ink-light transition-colors">
                        {event.title}
                      </h3>
                      <span className="badge-type">
                        {TYPE_LABELS[event.type] || event.type}
                      </span>
                    </div>

                    {event.description && (
                      <p className="text-sm text-taupe leading-relaxed line-clamp-2 flex-1">
                        {event.description}
                      </p>
                    )}

                    <p className="font-mono text-xs text-ink/50 mt-4">
                      {event.start_date} → {event.end_date}
                      {event.location && <> · {event.location}</>}
                    </p>

                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-dashed border-taupe/25">
                      <span className={STATUS_BADGE[event.status] || 'badge-draft'}>
                        {STATUS_LABELS[event.status] || event.status}
                      </span>
                      <span className="text-xs text-taupe truncate max-w-[120px]">
                        {event.profiles?.full_name}
                      </span>
                    </div>
                  </div>
                </article>
            </GlareHover>
          ))}
        </div>
        </FadeContent>
      )}
    </div>
  )
}
