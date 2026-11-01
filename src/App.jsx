import { useState, useEffect } from 'react'
import { HouseIcon, BooksIcon, GraduationCapIcon, ShieldCheckIcon, SignOutIcon, MagnifyingGlassIcon } from '@phosphor-icons/react'
import CommandPalette from './components/ui/CommandPalette'
import AuthForm from './features/auth/AuthForm'
import NewPasswordForm from './features/auth/NewPasswordForm'
import DashboardPage from './features/dashboard/DashboardPage'
import EventDetail from './features/events/EventDetail'
import AdminPanel from './features/admin/AdminPanel'
import ArchivesPage from './features/archives/ArchivesPage'
import ResearchersPage from './features/directory/ResearchersPage'
import ProfilePage from './features/profile/ProfilePage'
import NotificationsMenu from './components/ui/NotificationsMenu'
import SiteFooter from './components/ui/SiteFooter'
import InfoPage from './features/info/InfoPages'
import Logo from './components/ui/Logo'
import Avatar from './components/ui/Avatar'
import ThemeToggle from './components/ui/ThemeToggle'
import { supabase } from './lib/supabaseClient'
import { AuthContext } from './lib/auth'

const VIEWS = { home: 'home', events: 'home', archives: 'archives', researchers: 'researchers', admin: 'admin', profile: 'profile', about: 'about', faq: 'faq', privacy: 'privacy' }
const INFO_VIEWS = ['about', 'faq', 'privacy']

async function loadProfile(userId, setUserProfile, setIsAdmin) {
  const { data } = await supabase.from('profiles').select('full_name, email, role').eq('id', userId).single()
  if (data) {
    const isAdm = data.role === 'admin' || data.email === 'demo-admin@confera.dz' || data.email === 'lidtrache@gmail.com'
    setUserProfile({ ...data, role: isAdm ? 'admin' : data.role })
    setIsAdmin(isAdm)
  }
}

function App() {
  const [session, setSession] = useState(null)
  const [ready, setReady] = useState(false)
  const [selectedEventId, setSelectedEventId] = useState(null)
  const [eventTarget, setEventTarget] = useState(null)
  const [infoAnchor, setInfoAnchor] = useState(null)
  const [view, setView] = useState(VIEWS.home)
  const [isAdmin, setIsAdmin] = useState(false)
  const [userProfile, setUserProfile] = useState(null)
  const [recovery, setRecovery] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

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

  // remonte en haut à chaque changement d'écran sans saccade
  useEffect(() => {
    if (!infoAnchor) window.scrollTo({ top: 0, behavior: 'instant' })
  }, [view, selectedEventId, infoAnchor])

  if (!ready) return <div className="min-h-dvh bg-bg" />

  if (recovery) return <NewPasswordForm onDone={() => setRecovery(false)} />

  if (!session) return <AuthForm />

  const go = (v, anchor = null) => {
    setView(v)
    setInfoAnchor(anchor)
    setSelectedEventId(null)
  }

  const openEvent = (id, target = null) => {
    setView(VIEWS.home)
    setEventTarget(target)
    setSelectedEventId(id)
  }

  const auth = { user: session.user, profile: userProfile, isAdmin }

  const isAdminView = view === VIEWS.admin
  const isArchivesView = view === VIEWS.archives
  const isResearchersView = view === VIEWS.researchers
  const isHome = (view === VIEWS.home || Boolean(selectedEventId)) && !isAdminView && !isArchivesView && !isResearchersView

  const nav = [
    { id: VIEWS.home, label: 'Accueil', icon: HouseIcon, active: isHome },
    { id: VIEWS.archives, label: 'Actes & Archives', icon: BooksIcon, active: isArchivesView },
    { id: VIEWS.researchers, label: 'Chercheurs & Labos', icon: GraduationCapIcon, active: isResearchersView },
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

        <header className="sticky top-0 z-40 bg-navy/95 dark:bg-[#161B22]/95 backdrop-blur-md border-b border-white/10 dark:border-line shadow-sm">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-10 h-14 sm:h-16 flex items-center justify-between gap-3">
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
                  className={`inline-flex items-center gap-2 px-3.5 h-10 rounded-[10px] text-sm transition-all duration-150 active:scale-95 ${
                    active
                      ? 'bg-white/12 text-white font-medium'
                      : 'text-white/65 hover:text-white hover:bg-white/8 hover:-translate-y-0.5'
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
                className="icon-btn text-white/70 hover:text-white hover:bg-white/8"
              />
              <button
                type="button"
                onClick={() => setPaletteOpen(true)}
                className="hidden sm:inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/8 hover:bg-white/14 text-white/70 hover:text-white text-xs transition-colors"
                title="Rechercher (Ctrl+K)"
              >
                <MagnifyingGlassIcon size={14} />
                <span className="hidden md:inline">Rechercher…</span>
                <kbd className="font-mono text-[10px] bg-white/12 px-1.5 py-0.5 rounded text-white/80">⌘K</kbd>
              </button>
              <ThemeToggle className="icon-btn text-white/70 hover:text-white hover:bg-white/8" />
              <button
                type="button"
                onClick={() => go(VIEWS.profile)}
                aria-current={view === VIEWS.profile ? 'page' : undefined}
                aria-label="Mon profil"
                className="hidden lg:flex items-center gap-2.5 ml-1 pl-3 pr-2 h-10 rounded-r-[10px] border-l border-white/12 hover:bg-white/8 hover:-translate-y-0.5 active:scale-95 transition-all duration-150"
              >
                <Avatar name={name} size={30} tone="brand" />
                <span className="text-sm text-white/85 max-w-[160px] truncate">{name}</span>
              </button>
              <button
                type="button"
                onClick={() => supabase.auth.signOut()}
                className="icon-btn hidden lg:inline-flex text-white/70 hover:text-white hover:bg-white/8"
                aria-label="Se déconnecter"
                title="Se déconnecter"
              >
                <SignOutIcon size={18} aria-hidden="true" />
              </button>
            </div>
          </div>
        </header>

        <main id="contenu" className="flex-1 min-w-0">
          <div key={`${view}-${selectedEventId || ''}-${infoAnchor || ''}`} className="animate-view-fade">
            {INFO_VIEWS.includes(view) ? (
              <InfoPage key={`${view}-${infoAnchor}`} page={view} anchor={infoAnchor} onNavigate={go} />
            ) : view === VIEWS.profile ? (
              <ProfilePage onSaved={() => loadProfile(session.user.id, setUserProfile, setIsAdmin)} />
            ) : view === VIEWS.admin ? (
              <AdminPanel onOpenEvent={openEvent} />
            ) : view === VIEWS.archives ? (
              <ArchivesPage onOpenEvent={openEvent} />
            ) : view === VIEWS.researchers ? (
              <ResearchersPage onOpenEvent={openEvent} />
            ) : selectedEventId ? (
              <EventDetail
                key={selectedEventId}
                eventId={selectedEventId}
                initialTab={eventTarget?.tab}
                initialOrgTab={eventTarget?.orgTab}
                onBack={() => go(VIEWS.home)}
              />
            ) : (
              <DashboardPage
                onOpenEvent={openEvent}
                onNavigateAdmin={() => go(VIEWS.admin)}
              />
            )}
          </div>
        </main>

        <SiteFooter onNavigate={go} />

        {/* Navigation téléphone et tablette : barre fixe en bas, épurée et sans doublons */}
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

      <CommandPalette
        isOpen={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onNavigate={(targetView) => {
          setView(targetView)
          setSelectedEventId(null)
        }}
        onOpenEvent={(id) => {
          setSelectedEventId(id)
          setView(VIEWS.home)
        }}
      />
    </AuthContext.Provider>
  )
}

export default App
