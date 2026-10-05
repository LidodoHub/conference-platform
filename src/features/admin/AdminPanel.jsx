import { useState, useEffect } from 'react'
import { TYPE_LABELS, STATUS_LABELS, STATUS_BADGE } from '../../lib/constants'
import { supabase } from '../../lib/supabaseClient'
import FadeContent from '../../components/reactbits/FadeContent'

export default function AdminPanel() {
  const [pendingEvents, setPendingEvents] = useState([])
  const [allEvents, setAllEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchPendingEvents = async () => {
    setLoading(true)
    const { data, error: fetchError } = await supabase
      .from('events')
      .select('*, profiles(full_name, email)')
      .eq('status', 'pending_approval')

    if (!fetchError) {
      setPendingEvents(data)
    }
    setLoading(false)
  }

  const fetchAllEvents = async () => {
    const { data, error: fetchError } = await supabase
      .from('events')
      .select('id, title, status, type, start_date, profiles(full_name)')
      .order('start_date', { ascending: false })

    if (fetchError) setError(fetchError.message)
    else setAllEvents(data)
  }

  useEffect(() => {
    fetchPendingEvents()
    fetchAllEvents()
  }, [])

  const handleApprove = async (eventId) => {
    await supabase.from('events').update({ status: 'published' }).eq('id', eventId)
    fetchPendingEvents()
    fetchAllEvents()
  }

  const handleReject = async (eventId) => {
    await supabase.from('events').update({ status: 'draft' }).eq('id', eventId)
    fetchPendingEvents()
    fetchAllEvents()
  }

  const handleDeleteEvent = async (ev) => {
    if (!window.confirm(`Supprimer définitivement « ${ev.title} » ? Ses participants, soumissions, reviews et paiements seront supprimés aussi.`)) return
    setError(null)

    const { data, error: deleteError } = await supabase
      .from('events')
      .delete()
      .eq('id', ev.id)
      .select('id')

    if (deleteError) {
      setError(deleteError.message)
      return
    }
    if (!data || data.length === 0) {
      setError('Suppression refusée : seul un administrateur peut supprimer cet événement.')
      return
    }
    fetchPendingEvents()
    fetchAllEvents()
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
      <FadeContent className="mb-10">
        <p className="section-label mb-2">Administration CONFERA</p>
        <h1 className="section-heading text-4xl sm:text-5xl">Panel Admin</h1>
        <p className="text-taupe text-sm mt-2 max-w-xl leading-relaxed">
          Validez ou refusez les demandes de publication soumises par les organisateurs.
        </p>
      </FadeContent>

      {error && <div className="alert-error mb-6">{error}</div>}

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

      <section className="mt-12">
        <div className="flex items-baseline gap-3 mb-5">
          <h2 className="section-heading text-xl">Tous les événements</h2>
          <span className="font-mono text-xs text-taupe">{allEvents.length}</span>
        </div>

        {allEvents.length === 0 ? (
          <p className="text-taupe text-sm py-4">Aucun événement.</p>
        ) : (
          <ul className="space-y-2">
            {allEvents.map((ev) => (
              <li key={ev.id} className="list-item">
                <div className="min-w-0">
                  <span className="text-sm font-medium text-ink block truncate">{ev.title}</span>
                  <span className="font-mono text-xs text-taupe truncate block">
                    {ev.profiles?.full_name}
                    {ev.start_date && <> · {ev.start_date}</>}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={STATUS_BADGE[ev.status] || 'badge-draft'}>
                    {STATUS_LABELS[ev.status] || ev.status}
                  </span>
                  <button
                    type="button"
                    className="btn-danger btn-sm"
                    onClick={() => handleDeleteEvent(ev)}
                  >
                    Supprimer
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}