import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react'
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
import Avatar from './components/ui/Avatar'
import ThemeToggle from './components/ui/ThemeToggle'
import { ROLE_LABELS } from './lib/constants'
import { supabase } from './lib/supabaseClient'
import { AuthContext } from './lib/auth'
import { useLanguage } from './context/LanguageContext'
import { PendingCountsProvider, clearCachedCounts } from './context/PendingCountsContext'
import { useUrlQueryState } from './hooks/useUrlQueryState'

const VIEWS = { home: 'home', events: 'home', archives: 'archives', researchers: 'researchers', admin: 'admin', profile: 'profile', about: 'about', faq: 'faq', privacy: 'privacy', notFound: 'not-found' }
const INFO_VIEWS = ['about', 'faq', 'privacy']
const VALID_VIEW_KEYS = new Set(Object.values(VIEWS).filter((v) => v !== VIEWS.notFound))

function parseUrlState() {
  if (typeof window === 'undefined') {
    return { view: VIEWS.home, eventId: null, eventTarget: null, infoAnchor: null }
  }
  const path = window.location.pathname.replace(/\/+$/, '') || '/'
  if (path !== '/' && path !== '/index.html') {
    return { view: VIEWS.notFound, eventId: null, eventTarget: null, infoAnchor: null }
  }
  const params = new URLSearchParams(window.location.search)
  const rawPage = params.get('page')
  const eventId = params.get('eventId') || null
  const tab = params.get('tab') || null
  const orgTab = params.get('orgTab') || null
  const infoAnchor = params.get('anchor') || null

  if (rawPage && rawPage !== 'events' && !VALID_VIEW_KEYS.has(rawPage)) {
    return { view: VIEWS.notFound, eventId: null, eventTarget: null, infoAnchor: null }
  }

  const normalizedView =
    rawPage === 'events'
      ? VIEWS.home
      : VALID_VIEW_KEYS.has(rawPage)
        ? rawPage
        : VIEWS.home

  return {
    view: eventId ? VIEWS.home : normalizedView,
    eventId,
    eventTarget: eventId && (tab || orgTab) ? { tab, orgTab } : null,
    infoAnchor,
  }
}

function buildSearchString({ view, eventId, tab, orgTab, infoAnchor }) {
  const params = new URLSearchParams()
  if (eventId) {
    params.set('page', 'events')
    params.set('eventId', String(eventId))
    if (tab && tab !== 'overview') params.set('tab', tab)
    if (orgTab) params.set('orgTab', orgTab)
  } else if (view && view !== VIEWS.home) {
    params.set('page', view)
    if (infoAnchor) params.set('anchor', infoAnchor)
  }
  const str = params.toString()
  return str ? `?${str}` : ''
}

function syncUrl(state, { replace = false } = {}) {
  if (typeof window === 'undefined') return
  const nextSearch = buildSearchString(state)
  const nextUrl = `${window.location.pathname}${nextSearch}`
  if (window.location.search === nextSearch) return
  if (replace) window.history.replaceState(null, '', nextUrl)
  else window.history.pushState(null, '', nextUrl)
  window.dispatchEvent(new Event('confera:url-changed'))
}

async function loadProfile(userId, setUserProfile, setIsAdmin) {
  const { data } = await supabase.from('profiles').select('full_name, email, role').eq('id', userId).single()
  if (data) {
    const isAdm = data.role === 'admin' || data.email === 'demo-admin@confera.dz' || data.email === 'lidtrache@gmail.com'
    setUserProfile({ ...data, role: isAdm ? 'admin' : data.role })
    setIsAdmin(isAdm)
  }
}

function App() {
  const { lang, setLang, t } = useLanguage()
  const [urlSearchParams] = useUrlQueryState()
  const initialUrl = parseUrlState()
  const [session, setSession] = useState(null)
  const [ready, setReady] = useState(false)
  const [selectedEventId, setSelectedEventId] = useState(initialUrl.eventId)
  const [eventTarget, setEventTarget] = useState(initialUrl.eventTarget)
  const [infoAnchor, setInfoAnchor] = useState(initialUrl.infoAnchor)
  const [view, setView] = useState(initialUrl.view)
  const [isAdmin, setIsAdmin] = useState(false)
  const [userProfile, setUserProfile] = useState(null)
  const [recovery, setRecovery] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const navRef = useRef(null)
  const tabRefs = useRef({})
  const [indicator, setIndicator] = useState({ left: 0, width: 0, visible: false })
  const [indicatorReady, setIndicatorReady] = useState(false)

  const isAdminView = view === VIEWS.admin
  const isArchivesView = view === VIEWS.archives
  const isResearchersView = view === VIEWS.researchers
  const isHome = (view === VIEWS.home || Boolean(selectedEventId)) && !isAdminView && !isArchivesView && !isResearchersView
  const activeNavId = isHome
    ? VIEWS.home
    : isResearchersView
      ? VIEWS.researchers
      : isArchivesView
        ? VIEWS.archives
        : isAdminView
          ? VIEWS.admin
          : null

  const updateIndicator = useCallback(() => {
    const navEl = navRef.current
    const activeEl = activeNavId ? tabRefs.current[activeNavId] : null
    if (!navEl || !activeEl) {
      setIndicator((prev) => (prev.visible ? { ...prev, visible: false } : prev))
      return
    }
    const navRect = navEl.getBoundingClientRect()
    const activeRect = activeEl.getBoundingClientRect()
    const left = activeRect.left - navRect.left
    const width = activeRect.width
    setIndicator((prev) =>
      prev.left === left && prev.width === width && prev.visible
        ? prev
        : { left, width, visible: true },
    )
  }, [activeNavId])

  useLayoutEffect(() => {
    updateIndicator()
  }, [updateIndicator, lang, isAdmin, ready, session])

  useEffect(() => {
    const navEl = navRef.current
    if (!navEl) return undefined

    let ro
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => updateIndicator())
      ro.observe(navEl)
    }

    let cancelled = false
    document.fonts?.ready?.then(() => {
      if (!cancelled) updateIndicator()
    })

    const rafId = requestAnimationFrame(() => {
      if (!cancelled) setIndicatorReady(true)
    })

    return () => {
      cancelled = true
      cancelAnimationFrame(rafId)
      ro?.disconnect()
    }
  }, [updateIndicator, ready, session, recovery])

  useEffect(() => {
    const onPopState = () => {
      const next = parseUrlState()
      setView(next.view)
      setSelectedEventId(next.eventId)
      setEventTarget(next.eventTarget)
      setInfoAnchor(next.infoAnchor)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

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
        clearCachedCounts()
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

  // Met à jour document.title dynamiquement (EventDetail gère son propre titre avec event.title)
  useEffect(() => {
    if (selectedEventId) return
    const tabParam = urlSearchParams.get('tab')
    let title = 'CONFERA'
    if (view === VIEWS.notFound) {
      title = `${t('notFound.title')} — CONFERA`
    } else if (view === VIEWS.researchers) {
      title = `${t('nav.researchers')} — CONFERA`
    } else if (view === VIEWS.archives) {
      title = `${t('nav.archives')} — CONFERA`
    } else if (view === VIEWS.admin) {
      title = `${t('nav.admin')} — CONFERA`
    } else if (view === VIEWS.profile) {
      title = `${t('nav.myProfile')} — CONFERA`
    } else if (INFO_VIEWS.includes(view)) {
      const infoLabel = t(`footer.${view}`)
      title = infoLabel !== `footer.${view}` ? `${infoLabel} — CONFERA` : 'CONFERA'
    } else if (view === VIEWS.home) {
      const isMyspace = tabParam === 'conferences' || tabParam === 'submissions' || tabParam === 'passes'
      title = `${isMyspace ? t('dashboard.tabMySpace') : t('nav.discover')} — CONFERA`
    }
    document.title = title
  }, [view, selectedEventId, urlSearchParams, t])

  if (!ready) return <div className="min-h-dvh bg-bg" />

  if (recovery) return <NewPasswordForm onDone={() => setRecovery(false)} />

  if (!session) return <AuthForm />

  const go = (v, anchor = null) => {
    setView(v)
    setInfoAnchor(anchor)
    setSelectedEventId(null)
    setEventTarget(null)
    syncUrl({ view: v, infoAnchor: anchor })
  }

  const openEvent = (id, target = null) => {
    setView(VIEWS.home)
    setEventTarget(target)
    setSelectedEventId(id)
    setInfoAnchor(null)
    syncUrl({
      view: VIEWS.home,
      eventId: id,
      tab: target?.tab,
      orgTab: target?.orgTab,
    })
  }

  const handleEventTabChange = (nextTab) => {
    if (!selectedEventId) return
    setEventTarget({ tab: nextTab })
    syncUrl({
      view: VIEWS.home,
      eventId: selectedEventId,
      tab: nextTab,
    })
  }

  const auth = { user: session.user, profile: userProfile, isAdmin }

  const nav = [
    { id: VIEWS.home, label: t('nav.discover'), icon: HouseIcon, active: isHome },
    { id: VIEWS.researchers, label: t('nav.researchers'), icon: GraduationCapIcon, active: isResearchersView },
    { id: VIEWS.archives, label: t('nav.archives'), icon: BooksIcon, active: isArchivesView },
    ...(isAdmin ? [{ id: VIEWS.admin, label: t('nav.admin'), icon: ShieldCheckIcon, active: isAdminView }] : []),
  ]

  const name = userProfile?.full_name || session.user.email
  const cleanedName = String(userProfile?.full_name || '')
    .replace(/\s*\([^)]*\)/g, ' ')
    .trim()
    .replace(/^(?:(?:dr|pr|prof|mr|mme|mlle)\.?\s+)+/i, '')
    .trim()
  const nameParts = cleanedName.split(/\s+/).filter(Boolean)
  const initials = nameParts.length >= 2
    ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase()
    : String(cleanedName || name || 'U').slice(0, 2).toUpperCase()
  const shortName = nameParts.length >= 2
    ? `${nameParts[0][0].toUpperCase()}. ${nameParts.slice(1).join(' ')}`
    : (cleanedName || name)
  const roleKey = userProfile?.role || (isAdmin ? 'admin' : 'participant')
  const roleTranslationKey = `roles.${roleKey}`
  const translatedRole = t(roleTranslationKey)
  const roleLabel = translatedRole !== roleTranslationKey ? translatedRole : (ROLE_LABELS[roleKey] || t('roles.participant'))

  return (
    <AuthContext.Provider value={auth}>
      <PendingCountsProvider userId={session.user.id} isAdmin={isAdmin}>
        <div className="min-h-dvh bg-bg flex flex-col pb-[calc(62px+env(safe-area-inset-bottom))] lg:pb-0">
        <a
          href="#contenu"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:start-3 focus:z-[60] btn-accent"
        >
          {t('nav.skipToContent')}
        </a>

        <header className="sticky top-0 z-50 h-14 backdrop-blur-md bg-white/80 dark:bg-neutral-950/80 border-b border-neutral-200/70 dark:border-white/8">
          <div className="w-full px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
            <div className="flex items-center min-w-0">
              <button
                type="button"
                onClick={() => go(VIEWS.home)}
                className="inline-flex items-center gap-2 rounded-lg focus-visible:outline-offset-4 cursor-pointer shrink-0"
                aria-label={t('nav.homeAria')}
              >
                <span dir="ltr" className="text-[15px] font-semibold tracking-[0.14em] uppercase text-neutral-900 dark:text-white">
                  CONFERA
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" aria-hidden="true" />
              </button>

              <div className="hidden lg:block h-4 w-px bg-neutral-200 dark:bg-white/10 mx-6 shrink-0" aria-hidden="true" />

              <nav ref={navRef} className="relative hidden lg:flex items-center gap-6 lg:gap-7" aria-label={t('nav.mainNavAria')}>
                {nav.map(({ id, label, active }) => (
                  <button
                    key={id}
                    ref={(el) => {
                      if (el) tabRefs.current[id] = el
                      else delete tabRefs.current[id]
                    }}
                    type="button"
                    onClick={() => go(id)}
                    aria-current={active ? 'page' : undefined}
                    className={`relative h-14 inline-flex items-center text-[13.5px] font-medium whitespace-nowrap transition-colors bg-transparent cursor-pointer ${
                      active
                        ? 'text-neutral-900 dark:text-white'
                        : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
                    }`}
                  >
                    {label}
                  </button>
                ))}
                <span
                  aria-hidden="true"
                  className={`pointer-events-none absolute bottom-0 left-0 h-[2px] rounded-full bg-accent motion-reduce:transition-none ${
                    indicatorReady
                      ? 'transition-[transform,width,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]'
                      : ''
                  }`}
                  style={{
                    transform: `translateX(${indicator.left}px)`,
                    width: `${indicator.width}px`,
                    opacity: indicator.visible ? 1 : 0,
                  }}
                />
              </nav>
            </div>

            <div className="flex items-center shrink-0">
              <NotificationsMenu
                onOpenEvent={openEvent}
                className="icon-btn me-1.5 text-muted hover:text-fg hover:bg-black/[0.04] dark:hover:bg-white/10"
              />
              <button
                type="button"
                onClick={() => setPaletteOpen(true)}
                className="hidden sm:inline-flex items-center gap-2 me-3 px-2.5 py-1.5 rounded-lg bg-black/[0.04] dark:bg-white/5 hover:bg-black/[0.08] dark:hover:bg-white/10 text-muted hover:text-fg text-xs whitespace-nowrap shrink-0 transition-colors cursor-pointer"
                title={t('nav.searchTitle')}
              >
                <MagnifyingGlassIcon size={14} className="shrink-0" />
                <span className="hidden xl:inline">{t('nav.searchPlaceholder')}</span>
                <kbd dir="ltr" className="font-mono text-[10px] bg-black/[0.06] dark:bg-white/10 px-1.5 py-0.5 rounded text-muted shrink-0">⌘K</kbd>
              </button>

              <div className="flex items-center gap-2.5">
                <div
                  dir="ltr"
                  role="group"
                  aria-label="Language"
                  className="group inline-flex items-center rounded-full border border-neutral-200/80 dark:border-white/10 bg-white/70 dark:bg-white/5 p-0.5 text-[11.5px] font-medium"
                >
                  {[
                    { code: 'fr', label: 'FR' },
                    { code: 'en', label: 'EN' },
                    { code: 'ar', label: 'AR' },
                  ].map(({ code, label }) => {
                    const active = lang === code
                    return (
                      <button
                        key={code}
                        type="button"
                        onClick={() => setLang(code)}
                        aria-pressed={active}
                        className={
                          active
                            ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 rounded-full px-2 py-0.5 transition-all duration-200 cursor-pointer shrink-0'
                            : 'max-w-0 overflow-hidden opacity-0 px-0 py-0.5 pointer-events-none group-hover:max-w-[2.5rem] group-hover:opacity-100 group-hover:px-2 group-hover:pointer-events-auto text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-all duration-200 cursor-pointer shrink-0 whitespace-nowrap'
                        }
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
                <ThemeToggle />
              </div>

              <div className="hidden lg:block h-4 w-px bg-neutral-200 dark:bg-white/10 mx-3.5 shrink-0" aria-hidden="true" />

              <button
                type="button"
                onClick={() => go(VIEWS.profile)}
                aria-current={view === VIEWS.profile ? 'page' : undefined}
                aria-label={t('nav.myProfile')}
                className={`group hidden lg:flex items-center gap-2.5 ps-1.5 pe-2 py-1 rounded-full border transition-colors duration-200 cursor-pointer shrink-0 ${
                  view === VIEWS.profile
                    ? 'border-neutral-300 bg-white dark:border-white/20 dark:bg-white/[0.08]'
                    : 'border-neutral-200/80 bg-white/80 hover:border-neutral-300 hover:bg-white dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-white/20 dark:hover:bg-white/[0.07]'
                }`}
              >
                <span className="w-6 h-6 rounded-full bg-neutral-900 text-white dark:bg-neutral-800 dark:text-neutral-100 ring-1 ring-accent/40 text-[11px] font-semibold flex items-center justify-center shrink-0">
                  {initials}
                </span>
                <span className="text-[12.5px] font-medium text-neutral-900 dark:text-neutral-100 max-w-[130px] truncate">
                  {shortName}
                </span>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full bg-white text-neutral-700 border border-neutral-200/80 dark:bg-white/[0.06] dark:text-neutral-300 dark:border-white/10 whitespace-nowrap">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent/80 shrink-0" aria-hidden="true" />
                  <span>{roleLabel}</span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  clearCachedCounts(session.user.id)
                  supabase.auth.signOut()
                }}
                className="icon-btn hidden lg:inline-flex ms-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-500/10 cursor-pointer transition-colors"
                aria-label={t('nav.signOut')}
                title={t('nav.signOut')}
              >
                <SignOutIcon size={18} className="rtl:rotate-180" aria-hidden="true" />
              </button>
            </div>
          </div>
        </header>

        <main id="contenu" className="flex-1 min-w-0">
          <div key={`${view}-${selectedEventId || ''}-${infoAnchor || ''}`} className="animate-page-enter">
            {view === VIEWS.notFound ? (
              <div className="max-w-xl mx-auto px-6 py-24 text-center space-y-5">
                <p className="text-xs font-mono font-semibold uppercase tracking-widest text-accent-ink">
                  {t('notFound.code')}
                </p>
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-fg">
                  {t('notFound.title')}
                </h1>
                <p className="text-sm text-muted max-w-[44ch] mx-auto leading-relaxed">
                  {t('notFound.description')}
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== 'undefined' && window.location.pathname !== '/') {
                        window.history.pushState(null, '', '/')
                      }
                      go(VIEWS.home)
                    }}
                    className="btn-primary btn-sm text-xs font-medium cursor-pointer"
                  >
                    {t('notFound.backHome')}
                  </button>
                </div>
              </div>
            ) : INFO_VIEWS.includes(view) ? (
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
                onTabChange={handleEventTabChange}
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
          className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/90 dark:bg-[rgba(20,20,22,0.85)] backdrop-blur-md border-t border-black/[0.06] dark:border-white/[0.06] pb-[env(safe-area-inset-bottom)]"
          aria-label={t('nav.mainNavAria')}
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
                label: t('nav.profileShort'),
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
                  active ? 'text-fg dark:text-white font-semibold' : 'text-muted hover:text-fg'
                }`}
              >
                <span
                  className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors ${
                    active ? 'bg-black/[0.08] dark:bg-white/10' : ''
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
        onNavigate={(targetView) => go(targetView)}
        onOpenEvent={(id) => openEvent(id)}
      />
      </PendingCountsProvider>
    </AuthContext.Provider>
  )
}

export default App
