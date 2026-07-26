import { useState, useEffect } from 'react'
import AuthForm from './features/auth/AuthForm'
import EventsPage from './features/events/EventsPage'
import EventDetail from './features/events/EventDetail'
import { supabase } from './lib/supabaseClient'

function App() {
  const [session, setSession] = useState(null)
  const [selectedEventId, setSelectedEventId] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      {session ? (
        <div>
          <div className="text-right p-4">
            <button
              onClick={() => supabase.auth.signOut()}
              className="text-sm text-red-600"
            >
              Se déconnecter
            </button>
          </div>
          {selectedEventId ? (
            <EventDetail
              eventId={selectedEventId}
              onBack={() => setSelectedEventId(null)}
            />
          ) : (
            <EventsPage onSelectEvent={setSelectedEventId} />
          )}
        </div>
      ) : (
        <AuthForm />
      )}
    </div>
  )
}

export default App