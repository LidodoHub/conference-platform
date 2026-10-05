import { useState, useEffect } from 'react'
import { HouseIcon, CalendarBlankIcon, ShieldCheckIcon, SignOutIcon } from '@phosphor-icons/react'
import AuthForm from './features/auth/AuthForm'
import NewPasswordForm from './features/auth/NewPasswordForm'
import DashboardPage from './features/dashboard/DashboardPage'
import EventsPage from './features/events/EventsPage'
import EventDetail from './features/events/EventDetail'
import AdminPanel from './features/admin/AdminPanel'
import ProfilePage from './features/profile/ProfilePage'
import NotificationsMenu from './components/ui/NotificationsMenu'
import Logo from './components/ui/Logo'
import Avatar from './components/ui/Avatar'
import ThemeToggle from './components/ui/ThemeToggle'
import { supabase } from './lib/supabaseClient'
import { AuthContext } from './lib/auth'

const VIEWS = { home: 'home', events: 'events', admin: 'admin', profile: 'profile' }

async function loadProfile(userId, setUserProfile, setIsAdmin) {
  const { data } = await supabase.from('profiles').select('full_name, email, role').eq('id', userId).single()
  if (data) {
    setUserProfile(data)
    setIsAdmin(data.role === 'admin')
  }
}

function App() {
  const [session, setSession] = useState(null)
  const [ready, setReady] = useState(false)
  const [selectedEventId, setSelectedEventId] = useState(null)
  const [eventTarget, setEventTarget] = useState(null)
  const [view, setView] = useState(VIEWS.home)
  const [isAdmin, setIsAdmin] = useState(false)
  const [userProfile, setUserProfile] = useState(null)
  const [recovery, setRecovery] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setReady(true)
      if (session) loadProfile(session.user.id, setUserProfile, setIsAdmin)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setRecovery(true)
      setSession(session)
      if (session) loadProfile(session.user.id, setUserProfile, setIsAdmin)
      else {
        setUserProfile(null)
        setIsAdmin(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // remonte en haut à chaque changement d'écran
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [view, selectedEventId])

  if (!ready) return <div className="min-h-dvh bg-bg" />

  if (recovery) return <NewPasswordForm onDone={() => setRecovery(false)} />

  if (!session) return <AuthForm />

  const go = (v) => {
    setView(v)
    setSelectedEventId(null)
  }
  // target (optionnel) : onglet à ouvrir directement, ex. { tab: 'scientific' }
  const openEvent = (id, target = null) => {
    setView(VIEWS.events)
    setEventTarget(target)
    setSelectedEventId(id)
  }

  const auth = { user: session.user, profile: userProfile, isAdmin }

  const isHome = view === VIEWS.home && !selectedEventId
  const isEvents = view === VIEWS.events
  const isAdminView = view === VIEWS.admin

  const nav = [
    { id: VIEWS.home, label: 'Accueil', icon: HouseIcon, active: isHome },
    { id: VIEWS.events, label: 'Événements', icon: CalendarBlankIcon, active: isEvents },
    ...(isAdmin ? [{ id: VIEWS.admin, label: 'Admin', icon: ShieldCheckIcon, active: isAdminView }] : []),
  ]

  const name = userProfile?.full_name || session.user.email

  return (
    <AuthContext.Provider value={auth}>
      <div className="min-h-dvh bg-bg flex flex-col pb-[calc(62px+env(safe-area-inset-bottom))] lg:pb-0">
        <a
          href="#contenu"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] btn-accent"
        >
          Aller au contenu
        </a>

        <header className="sticky top-0 z-40 bg-navy/95 dark:bg-surface/90 backdrop-blur-md border-b border-white/8 dark:border-line">
          <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-10 h-14 sm:h-16 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => go(VIEWS.home)}
              className="rounded-lg focus-visible:outline-offset-4"
              aria-label="CONFERA, accueil"
            >
              <Logo inverted />
            </button>

            <nav className="hidden lg:flex items-center gap-1" aria-label="Navigation principale">
              {nav.map(({ id, label, icon: Icon, active }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => go(id)}
                  aria-current={active ? 'page' : undefined}
                  className={`inline-flex items-center gap-2 px-3.5 h-10 rounded-[10px] text-sm transition-colors ${
                    active
                      ? 'bg-white/12 text-white font-medium dark:bg-fg/10 dark:text-fg'
                      : 'text-white/65 hover:text-white hover:bg-white/6 dark:text-muted dark:hover:text-fg dark:hover:bg-fg/5'
                  }`}
                >
                  <Icon size={17} weight={active ? 'fill' : 'regular'} aria-hidden="true" />
                  {label}
                </button>
              ))}
            </nav>

            <div className="flex items-center gap-1">
              <NotificationsMenu
                onOpenEvent={openEvent}
                className="icon-btn text-white/70 hover:text-white hover:bg-white/8 dark:text-muted dark:hover:text-fg dark:hover:bg-fg/6"
              />
              <ThemeToggle className="icon-btn text-white/70 hover:text-white hover:bg-white/8 dark:text-muted dark:hover:text-fg dark:hover:bg-fg/6" />
              <button
                type="button"
                onClick={() => go(VIEWS.profile)}
                aria-current={view === VIEWS.profile ? 'page' : undefined}
                aria-label="Mon profil"
                className="hidden lg:flex items-center gap-2.5 ml-1 pl-3 pr-2 h-10 rounded-r-[10px] border-l border-white/12 dark:border-line hover:bg-white/6 dark:hover:bg-fg/5 transition-colors"
              >
                <Avatar name={name} size={30} tone="brand" />
                <span className="text-sm text-white/85 dark:text-fg max-w-[160px] truncate">{name}</span>
              </button>
              <button
                type="button"
                onClick={() => supabase.auth.signOut()}
                className="icon-btn hidden lg:inline-flex text-white/70 hover:text-white hover:bg-white/8 dark:text-muted dark:hover:text-fg dark:hover:bg-fg/6"
                aria-label="Se déconnecter"
                title="Se déconnecter"
              >
                <SignOutIcon size={18} aria-hidden="true" />
              </button>
            </div>
          </div>
        </header>

        <main id="contenu" className="flex-1 min-w-0">
          {view === VIEWS.profile ? (
            <ProfilePage onSaved={() => loadProfile(session.user.id, setUserProfile, setIsAdmin)} />
          ) : view === VIEWS.admin ? (
            <AdminPanel onOpenEvent={openEvent} />
          ) : selectedEventId ? (
            <EventDetail
              key={selectedEventId}
              eventId={selectedEventId}
              initialTab={eventTarget?.tab}
              initialOrgTab={eventTarget?.orgTab}
              onBack={() => go(VIEWS.events)}
            />
          ) : view === VIEWS.events ? (
            <EventsPage onSelectEvent={openEvent} />
          ) : (
            <DashboardPage
              onOpenEvent={openEvent}
              onNavigateEvents={() => go(VIEWS.events)}
              onNavigateAdmin={() => go(VIEWS.admin)}
            />
          )}
        </main>

        <footer className="hidden lg:block border-t border-line mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-10 py-5 flex items-center justify-between gap-4 text-xs text-faint">
            <p>CONFERA, plateforme de gestion de conférences scientifiques</p>
            <p>Projet de fin d'études, Master 2 IA</p>
          </div>
        </footer>

        {/* Navigation téléphone et tablette : barre fixe en bas, comme une application */}
        <nav
          className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-navy/97 dark:bg-surface/95 backdrop-blur-md border-t border-white/10 dark:border-line pb-[env(safe-area-inset-bottom)]"
          aria-label="Navigation principale"
        >
          <div className="mx-auto grid max-w-md" style={{ gridTemplateColumns: `repeat(${nav.length + 1}, minmax(0, 1fr))` }}>
            {[
              ...nav.map(({ id, label, icon: Icon, active }) => ({
                id,
                label,
                active,
                glyph: <Icon size={22} weight={active ? 'fill' : 'regular'} aria-hidden="true" />,
              })),
              {
                id: VIEWS.profile,
                label: 'Profil',
                active: view === VIEWS.profile,
                glyph: <Avatar name={name} size={22} tone="brand" />,
              },
            ].map(({ id, label, active, glyph }) => (
              <button
                key={id}
                type="button"
                onClick={() => go(id)}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-col items-center justify-center gap-1 h-[62px] transition-colors ${
                  active ? 'text-accent' : 'text-white/60 dark:text-muted'
                }`}
              >
                <span
                  className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors ${
                    active ? 'bg-accent/18' : ''
                  }`}
                >
                  {glyph}
                </span>
                <span className="text-[11px] font-medium leading-none">{label}</span>
              </button>
            ))}
          </div>
        </nav>
      </div>
    </AuthContext.Provider>
  )
}

export default App
