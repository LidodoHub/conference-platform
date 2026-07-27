import { useState, useEffect } from 'react'
import AuthForm from './features/auth/AuthForm'
import EventsPage from './features/events/EventsPage'
import EventDetail from './features/events/EventDetail'
import AdminPanel from './features/admin/AdminPanel'
import { supabase } from './lib/supabaseClient'

function App() {
  const [session, setSession] = useState(null)
  const [selectedEventId, setSelectedEventId] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showAdmin, setShowAdmin] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) checkAdmin(session.user.id)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) checkAdmin(session.user.id)
    })

    return () => subscription.unsubscribe()
  }, [])

  const checkAdmin = async (userId) => {
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()
    if (data?.role === 'admin') setIsAdmin(true)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {session ? (
        <div>
          <div className="text-right p-4 flex justify-end gap-4 items-center">
            {isAdmin && (
              <button
                onClick={() => setShowAdmin(!showAdmin)}
                className="text-sm text-purple-600"
              >
                {showAdmin ? 'Retour' : 'Panel Admin'}
              </button>
            )}
            <button
              onClick={() => supabase.auth.signOut()}
              className="text-sm text-red-600"
            >
              Se déconnecter
            </button>
          </div>
          {showAdmin ? (
            <AdminPanel />
          ) : selectedEventId ? (
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