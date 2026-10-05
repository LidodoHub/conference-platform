import { useState, useEffect } from 'react'
import AuthForm from './features/auth/AuthForm'
import DashboardPage from './features/dashboard/DashboardPage'
import EventsPage from './features/events/EventsPage'
import EventDetail from './features/events/EventDetail'
import AdminPanel from './features/admin/AdminPanel'
import { supabase } from './lib/supabaseClient'
import { AuthContext } from './lib/auth'

const VIEWS = { home: 'home', events: 'events', admin: 'admin' }

async function loadProfile(userId, setUserProfile, setIsAdmin) {
  const { data } = await supabase
    .from('profiles')
    .select('full_name, email, role')
    .eq('id', userId)
    .single()
  if (data) {
    setUserProfile(data)
    setIsAdmin(data.role === 'admin')
  }
}

function App() {
  const [session, setSession] = useState(null)
  const [selectedEventId, setSelectedEventId] = useState(null)
  const [view, setView] = useState(VIEWS.home)
  const [isAdmin, setIsAdmin] = useState(false)
  const [userProfile, setUserProfile] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) loadProfile(session.user.id, setUserProfile, setIsAdmin)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) loadProfile(session.user.id, setUserProfile, setIsAdmin)
      else {
        setUserProfile(null)
        setIsAdmin(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const goHome = () => {
    setView(VIEWS.home)
    setSelectedEventId(null)
  }

  const goEvents = () => {
    setView(VIEWS.events)
    setSelectedEventId(null)
  }

  const goAdmin = () => {
    setView(VIEWS.admin)
    setSelectedEventId(null)
  }

  if (!session) {
    return (
      <div className="min-h-dvh bg-paper">
        <AuthForm />
      </div>
    )
  }

  const auth = { user: session.user, profile: userProfile, isAdmin }

  const isHome = view === VIEWS.home && !selectedEventId
  const isEvents = view === VIEWS.events || !!selectedEventId
  const isAdminView = view === VIEWS.admin

  const navClass = (active) =>
    `btn-nav ${active ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white hover:bg-white/5'}`

  const mobileTab = (active) =>
    `flex-1 flex items-center justify-center min-h-[56px] text-xs font-medium border-t-2 transition-colors ${
      active ? 'text-white border-gold' : 'text-white/50 border-transparent'
    }`

  return (
    <AuthContext.Provider value={auth}>
    <div className="min-h-dvh bg-paper flex flex-col pb-16 sm:pb-0">
      <header className="sticky top-0 z-50 bg-ink/95 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={goHome}
              className="flex items-center gap-3 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 rounded-lg"
            >
              <div className="w-9 h-9 rounded-lg bg-gold flex items-center justify-center flex-shrink-0 shadow-lg shadow-gold/20">
                <span className="font-display font-bold text-ink text-sm leading-none">C</span>
              </div>
              <div className="text-left">
                <span className="font-display font-semibold text-lg text-white tracking-tight block leading-tight">
                  CONFERA
                </span>
                <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/40 hidden sm:block">
                  Écosystème conférences scientifiques
                </span>
              </div>
            </button>

            <nav className="flex items-center gap-1 sm:gap-2" aria-label="Navigation du compte">
              <div className="hidden sm:flex items-center gap-2">
                <button onClick={goHome} className={navClass(isHome)}>
                  Accueil
                </button>
                <button onClick={goEvents} className={navClass(isEvents)}>
                  Événements
                </button>
                {isAdmin && (
                  <button
                    onClick={goAdmin}
                    className={`btn-nav ${
                      isAdminView
                        ? 'bg-gold/20 text-gold'
                        : 'text-white/60 hover:text-gold hover:bg-gold/10'
                    }`}
                  >
                    Admin
                  </button>
                )}
                <div className="w-px h-5 bg-white/15 mx-1 sm:mx-2" />
              </div>

              <button
                onClick={() => supabase.auth.signOut()}
                className="btn-nav text-white/50 hover:text-white px-3 py-2 hover:bg-white/5"
              >
                Déconnexion
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1 min-w-0">
        {view === VIEWS.admin ? (
          <AdminPanel />
        ) : selectedEventId ? (
          <EventDetail
            eventId={selectedEventId}
            onBack={goEvents}
          />
        ) : view === VIEWS.events ? (
          <EventsPage onSelectEvent={setSelectedEventId} />
        ) : (
          <DashboardPage
            onNavigateEvents={goEvents}
            onNavigateAdmin={goAdmin}
            isAdmin={isAdmin}
            userProfile={userProfile}
          />
        )}
      </main>

      <footer className="border-t border-ink/8 bg-paper-dark/40 mt-auto">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 py-5 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-taupe">
            CONFERA · PFE Master 2 IA
          </p>
          <p className="text-xs text-taupe/70 text-center sm:text-left">
            Gestion · Organisation · Pilotage des conférences scientifiques
          </p>
        </div>
      </footer>

      {/* Navigation mobile : barre fixe en bas de l'écran */}
      <nav
        className="sm:hidden fixed bottom-0 inset-x-0 z-50 bg-ink border-t border-white/10 flex"
        aria-label="Navigation principale"
      >
        <button onClick={goHome} className={mobileTab(isHome)}>
          Accueil
        </button>
        <button onClick={goEvents} className={mobileTab(isEvents)}>
          Événements
        </button>
        {isAdmin && (
          <button onClick={goAdmin} className={mobileTab(isAdminView)}>
            Admin
          </button>
        )}
      </nav>
    </div>
    </AuthContext.Provider>
  )
}

export default App