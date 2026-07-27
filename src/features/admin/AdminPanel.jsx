import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'

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

  if (loading) return <p className="text-gray-500 text-center mt-10">Chargement...</p>

  return (
    <div className="max-w-2xl mx-auto mt-10 p-6">
      <h1 className="text-2xl font-bold mb-6">Panel Admin — Events en attente</h1>

      {pendingEvents.length === 0 ? (
        <p className="text-gray-500">Aucune demande en attente.</p>
      ) : (
        <div className="space-y-3">
          {pendingEvents.map((event) => (
            <div key={event.id} className="p-4 border rounded-lg">
              <h3 className="font-bold">{event.title}</h3>
              <p className="text-sm text-gray-600">{event.description}</p>
              <p className="text-xs text-gray-400 mt-1">
                Par {event.profiles?.full_name} ({event.profiles?.email})
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => handleApprove(event.id)}
                  className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                >
                  Approuver
                </button>
                <button
                  onClick={() => handleReject(event.id)}
                  className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                >
                  Refuser
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}