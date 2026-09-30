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

  const handleNavigateEvents = () => {
    setShowAdmin(false)
    setSelectedEventId(null)
  }

  const handleNavigateAdmin = () => {
    setShowAdmin(true)
    setSelectedEventId(null)
  }

  if (!session) {
    return (
      <div className="min-h-dvh bg-paper">
        <AuthForm />
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-paper flex flex-col">
      <header className="sticky top-0 z-50 bg-ink border-b border-white/10">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10">
          <div className="flex items-center justify-between h-16">
            {/* Logo & brand */}
            <button
              onClick={handleNavigateEvents}
              className="flex items-center gap-3 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 rounded-lg"
            >
              <div className="w-8 h-8 rounded-md bg-gold flex items-center justify-center flex-shrink-0">
                <span className="font-display font-bold text-ink text-sm leading-none">C</span>
              </div>
              <div className="text-left">
                <span className="font-display font-semibold text-lg text-white tracking-tight block leading-tight">
                  ConfPlatform
                </span>
                <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/40 hidden sm:block">
                  Gestion d'événements scientifiques
                </span>
              </div>
            </button>

            {/* Navigation */}
            <nav className="flex items-center gap-1 sm:gap-2">
              <button
                onClick={handleNavigateEvents}
                className={`btn-nav ${
                  !showAdmin && !selectedEventId
                    ? 'bg-white/10 text-white'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                Événements
              </button>

              {isAdmin && (
                <button
                  onClick={handleNavigateAdmin}
                  className={`btn-nav ${
                    showAdmin
                      ? 'bg-gold/20 text-gold'
                      : 'text-white/60 hover:text-gold hover:bg-gold/10'
                  }`}
                >
                  Panel Admin
                </button>
              )}

              <div className="w-px h-5 bg-white/15 mx-1 sm:mx-2 hidden sm:block" />

              <button
                onClick={() => supabase.auth.signOut()}
                className="btn-nav text-white/50 hover:text-white px-3 py-2 hover:bg-white/5"
              >
                Se déconnecter
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1">
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
      </main>

      <footer className="border-t border-ink/8 bg-paper-dark/40 mt-auto">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 py-5 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-taupe">
            ConfPlatform · PFE Master 2 IA
          </p>
          <p className="text-xs text-taupe/70">
            Plateforme de gestion de conférences, colloques et séminaires
          </p>
        </div>
      </footer>
    </div>
  )
}

export default App
