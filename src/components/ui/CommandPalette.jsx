import { useState, useEffect, useRef } from 'react'
import {
  MagnifyingGlassIcon,
  CalendarBlankIcon,
  BooksIcon,
  GraduationCapIcon,
  UserIcon,
  HouseIcon,
  MoonIcon,
  SunIcon,
  SignOutIcon,
  ArrowRightIcon,
  XIcon,
  ArticleIcon,
  PresentationChartIcon,
  SpeakerHighIcon,
  SpeakerSimpleSlashIcon,
} from '@phosphor-icons/react'
import { supabase } from '../../lib/supabaseClient'
import { applyTheme, readThemePref } from '../../lib/theme'
import { isSoundEnabled, setSoundEnabled, playSuccessSound } from '../../lib/sound'

export default function CommandPalette({ isOpen, onClose, onNavigate, onOpenEvent }) {
  const [query, setQuery] = useState('')
  const [events, setEvents] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [sessions, setSessions] = useState([])
  const [soundOn, setSoundOn] = useState(isSoundEnabled)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
      setSoundOn(isSoundEnabled())
      setTimeout(() => inputRef.current?.focus(), 50)

      // Recherche universelle : conférences, articles et sessions
      Promise.all([
        supabase
          .from('events')
          .select('id, title, type, status, start_date')
          .order('start_date', { ascending: false })
          .limit(10),
        supabase
          .from('submissions')
          .select('id, event_id, title, status')
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('sessions')
          .select('id, event_id, title, start_time')
          .order('start_time', { ascending: true })
          .limit(10),
      ]).then(([evRes, subRes, sesRes]) => {
        setEvents(evRes.data || [])
        setSubmissions(subRes.data || [])
        setSessions(sesRes.data || [])
      })
    }
  }, [isOpen])

  const toggleSound = () => {
    const next = !soundOn
    setSoundEnabled(next)
    setSoundOn(next)
    if (next) playSuccessSound()
  }

  // Actions de base & Préférences
  const staticActions = [
    {
      id: 'nav-home',
      category: 'Navigation',
      label: 'Tableau de bord (Accueil)',
      icon: HouseIcon,
      run: () => onNavigate('home'),
    },
    {
      id: 'nav-archives',
      category: 'Navigation',
      label: 'Consulter les Actes de colloques & Archives',
      icon: BooksIcon,
      run: () => onNavigate('archives'),
    },
    {
      id: 'nav-researchers',
      category: 'Navigation',
      label: 'Annuaire des Chercheurs & Laboratoires',
      icon: GraduationCapIcon,
      run: () => onNavigate('researchers'),
    },
    {
      id: 'nav-profile',
      category: 'Navigation',
      label: 'Mon profil chercheur & Badge',
      icon: UserIcon,
      run: () => onNavigate('profile'),
    },
    {
      id: 'theme-toggle',
      category: 'Préférences',
      label: readThemePref() === 'dark' ? 'Passer en thème Clair' : 'Passer en thème Sombre',
      icon: readThemePref() === 'dark' ? SunIcon : MoonIcon,
      run: () => applyTheme(readThemePref() === 'dark' ? 'light' : 'dark'),
    },
    {
      id: 'sound-toggle',
      category: 'Préférences',
      label: soundOn ? 'Effets sonores : Activés (cliquer pour couper)' : 'Effets sonores : Désactivés (cliquer pour activer)',
      icon: soundOn ? SpeakerHighIcon : SpeakerSimpleSlashIcon,
      run: toggleSound,
    },
    {
      id: 'auth-logout',
      category: 'Session',
      label: 'Se déconnecter de CONFERA',
      icon: SignOutIcon,
      run: () => supabase.auth.signOut(),
    },
  ]

  const q = query.trim().toLowerCase()

  // 1. Conférences
  const eventActions = events
    .filter((e) => !q || e.title.toLowerCase().includes(q))
    .slice(0, 4)
    .map((e) => ({
      id: `ev-${e.id}`,
      category: 'Conférence',
      label: e.title,
      icon: CalendarBlankIcon,
      run: () => onOpenEvent(e.id),
    }))

  // 2. Communications & Articles scientifiques
  const submissionActions = submissions
    .filter((s) => !q || s.title.toLowerCase().includes(q))
    .slice(0, 4)
    .map((s) => ({
      id: `sub-${s.id}`,
      category: 'Communication',
      label: s.title,
      icon: ArticleIcon,
      run: () => onOpenEvent(s.event_id, { tab: 'scientific' }),
    }))

  // 3. Sessions & Programme
  const sessionActions = sessions
    .filter((s) => !q || s.title.toLowerCase().includes(q))
    .slice(0, 4)
    .map((s) => ({
      id: `ses-${s.id}`,
      category: 'Session',
      label: s.title,
      icon: PresentationChartIcon,
      run: () => onOpenEvent(s.event_id, { tab: 'program' }),
    }))

  const filteredActions = [
    ...staticActions.filter((a) => !q || a.label.toLowerCase().includes(q)),
    ...eventActions,
    ...submissionActions,
    ...sessionActions,
  ]

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredActions.length))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev - 1 + filteredActions.length) % Math.max(1, filteredActions.length))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const action = filteredActions[selectedIndex]
      if (action) {
        action.run()
        onClose()
      }
    }
  }

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Palette de commande rapide"
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-navy/60 dark:bg-black/75 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-xl card border-line bg-surface/95 shadow-lift overflow-hidden backdrop-blur-md flex flex-col">
        {/* Barre de recherche */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-line">
          <MagnifyingGlassIcon size={18} className="text-accent-ink shrink-0" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            className="w-full bg-transparent text-sm sm:text-base text-fg placeholder:text-muted focus:outline-none"
            placeholder="Conférence, article, auteur, session ou action…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelectedIndex(0)
            }}
            onKeyDown={handleKeyDown}
          />
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-muted hover:text-fg hover:bg-fg/6"
            aria-label="Fermer"
          >
            <XIcon size={16} />
          </button>
        </div>

        {/* Liste des résultats */}
        <div className="max-h-84 overflow-y-auto p-2 divide-y divide-line/40">
          {filteredActions.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted">
              Aucun résultat pour « {query} »
            </div>
          ) : (
            filteredActions.map((action, i) => {
              const Icon = action.icon
              const isSelected = i === selectedIndex
              return (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => {
                    action.run()
                    onClose()
                  }}
                  onMouseEnter={() => setSelectedIndex(i)}
                  className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm text-left transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-accent/15 text-accent-ink font-medium ring-1 ring-accent/30'
                      : 'text-fg/85 hover:bg-surface-2/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon size={16} className={isSelected ? 'text-accent-ink shrink-0' : 'text-faint shrink-0'} />
                    <span className="truncate">{action.label}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-mono text-faint uppercase bg-surface-2 px-1.5 py-0.5 rounded border border-line/60">
                      {action.category}
                    </span>
                    <ArrowRightIcon
                      size={12}
                      className={isSelected ? 'opacity-100 text-accent-ink' : 'opacity-0'}
                    />
                  </div>
                </button>
              )
            })
          )}
        </div>

        {/* Footer avec astuces clavier */}
        <div className="px-4 py-2 border-t border-line/60 bg-surface-2/30 flex items-center justify-between text-[11px] text-faint font-mono">
          <div className="flex items-center gap-3">
            <span>&uarr;&darr; Naviguer</span>
            <span>&crarr; Choisir</span>
            <span>Échap Fermer</span>
          </div>
          <span>CONFERA Quick Switcher</span>
        </div>
      </div>
    </div>
  )
}
