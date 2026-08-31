import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'

const TYPE_LABELS = {
  conference: 'Conférence',
  colloquium: 'Colloque',
  seminar: 'Séminaire',
  workshop: 'Workshop',
}

export default function AdminPanel() {
  const [pendingEvents, setPendingEvents] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchPendingEvents = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('events')
      .select('*, profiles(full_name, email)')
      .eq('status', 'pending_approval')

    if (!error) {
      setPendingEvents(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchPendingEvents()
  }, [])

  const handleApprove = async (eventId) => {
    await supabase.from('events').update({ status: 'published' }).eq('id', eventId)
    fetchPendingEvents()
  }

  const handleReject = async (eventId) => {
    await supabase.from('events').update({ status: 'draft' }).eq('id', eventId)
    fetchPendingEvents()
  }

  if (loading) {
    return (
      <div className="page-container">
        <div className="skeleton h-8 w-64 mb-8" />
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="card-panel skeleton h-36" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="page-container">
      <div className="mb-10">
        <p className="section-label mb-2">Administration</p>
        <h1 className="section-heading text-4xl sm:text-5xl">Panel Admin</h1>
        <p className="text-taupe text-sm mt-2 max-w-xl leading-relaxed">
          Validez ou refusez les demandes de publication soumises par les organisateurs.
        </p>
      </div>

      {pendingEvents.length === 0 ? (
        <div className="card-panel text-center py-16">
          <div className="w-12 h-12 rounded-full bg-sage-light flex items-center justify-center mx-auto mb-4">
            <span className="text-sage text-xl">✓</span>
          </div>
          <p className="section-heading text-xl">Aucune demande en attente</p>
          <p className="text-taupe text-sm mt-2">
            Toutes les demandes de publication ont été traitées.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          <p className="font-mono text-xs text-taupe uppercase tracking-[0.12em]">
            {pendingEvents.length} demande{pendingEvents.length > 1 ? 's' : ''} en attente
          </p>

          {pendingEvents.map((event) => (
            <article key={event.id} className="card-ticket-static">
              <div className="ticket-stripe" />
              <div className="ticket-perforation" />
              <div className="p-6 sm:p-8 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <span className="badge-pending">En validation</span>
                      <span className="badge-type">
                        {TYPE_LABELS[event.type] || event.type}
                      </span>
                    </div>

                    <h3 className="font-display font-semibold text-xl text-ink leading-snug">
                      {event.title}
                    </h3>

                    {event.description && (
                      <p className="text-sm text-taupe mt-2 leading-relaxed max-w-2xl">
                        {event.description}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-x-5 gap-y-1 mt-4 font-mono text-xs text-ink/50">
                      {event.start_date && event.end_date && (
                        <span>{event.start_date} → {event.end_date}</span>
                      )}
                      {event.location && <span>{event.location}</span>}
                    </div>

                    <p className="text-xs text-taupe mt-4">
                      Soumis par{' '}
                      <span className="font-medium text-ink">{event.profiles?.full_name}</span>
                      <span className="font-mono ml-1">({event.profiles?.email})</span>
                    </p>
                  </div>

                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleApprove(event.id)}
                      className="btn-success"
                    >
                      Approuver
                    </button>
                    <button
                      onClick={() => handleReject(event.id)}
                      className="btn-danger"
                    >
                      Refuser
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
