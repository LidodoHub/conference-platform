import { useState, useEffect, useCallback } from 'react'
import {
  PlusIcon,
  MagnifyingGlassIcon,
  CalendarBlankIcon,
  XIcon,
  SparkleIcon,
} from '@phosphor-icons/react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../lib/auth'
import { frError } from '../../lib/errors'
import { FORMAT_LABELS } from '../../lib/constants'
import PageHeader from '../../components/ui/PageHeader'
import Tabs from '../../components/ui/Tabs'
import EmptyState from '../../components/ui/EmptyState'
import SectionTitle from '../../components/ui/SectionTitle'
import EventCard, { FeaturedEventCard } from './EventCard'
import EventForm from './EventForm'

const today = () => new Date().toISOString().slice(0, 10)

const dayParts = (d) => {
  if (!d) return null
  const date = new Date(`${String(d).slice(0, 10)}T00:00:00`)
  return {
    day: date.getDate(),
    month: date.toLocaleDateString('fr-FR', { month: 'short' }),
    year: date.getFullYear(),
  }
}

const daysUntil = (d, now) => {
  if (!d) return null
  const diffDays = Math.round((new Date(`${d}T00:00:00`) - new Date(`${now}T00:00:00`)) / 86400000)
  if (diffDays <= 0) return 'En cours'
  if (diffDays === 1) return 'Demain'
  if (diffDays <= 7) return `J-${diffDays}`
  return `Dans ${diffDays} j`
}

export default function EventsPage({ onSelectEvent }) {
  const { user } = useAuth()
  const [events, setEvents] = useState([])
  const [roles, setRoles] = useState({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [createError, setCreateError] = useState(null)
  const [filter, setFilter] = useState('all')
  const [quickChip, setQuickChip] = useState('all')
  const [formatFilter, setFormatFilter] = useState('all')
  const [query, setQuery] = useState('')

  const load = useCallback(async () => {
    const [eventsRes, rolesRes] = await Promise.all([
      supabase
        .from('events')
        .select('id, title, description, type, format, status, phase, start_date, end_date, location, organizer_id')
        .order('start_date', { ascending: true }),
      supabase.from('event_participants').select('event_id, role_in_event').eq('user_id', user.id),
    ])
    if (eventsRes.error) setLoadError(frError(eventsRes.error))
    else setEvents(eventsRes.data || [])
    setRoles(Object.fromEntries((rolesRes.data || []).map((r) => [r.event_id, r.role_in_event])))
    setLoading(false)
  }, [user.id])

  useEffect(() => {
    load()
  }, [load])

  const createEvent = async (values) => {
    setCreateError(null)
    const { data, error } = await supabase
      .from('events')
      .insert({ ...values, organizer_id: user.id, status: 'draft' })
      .select('id')
      .single()
    if (error) {
      setCreateError(frError(error))
      return
    }
    setShowForm(false)
    onSelectEvent(data.id)
  }

  const q = query.trim().toLowerCase()
  const matches = (e) => !q || [e.title, e.location, e.description].some((v) => (v || '').toLowerCase().includes(q))
  const isMine = (e) => Boolean(roles[e.id]) || e.organizer_id === user.id

  const now = today()
  const liveCount = events.filter((e) => e.status === 'ongoing' || (e.start_date <= now && now <= (e.end_date || e.start_date))).length
  const subPhaseCount = events.filter((e) => e.phase === 'scientific').length
  const upCount = events.filter((e) => (e.start_date || '') > now).length

  const filtered = events.filter((e) => {
    if (!matches(e)) return false
    if (filter === 'mine') return isMine(e)
    if (filter === 'open') return ['published', 'ongoing'].includes(e.status)
    if (formatFilter !== 'all' && e.format !== formatFilter) return false
    if (quickChip === 'ongoing') {
      const isLive = e.status === 'ongoing' || (e.start_date <= now && now <= (e.end_date || e.start_date))
      if (!isLive) return false
    }
    if (quickChip === 'submissions' && e.phase !== 'scientific') return false
    if (quickChip === 'upcoming' && (e.start_date || '') <= now) return false
    if (quickChip === 'onsite' && e.format !== 'onsite') return false
    return true
  })

  const showFeatured = filter === 'all' && formatFilter === 'all' && quickChip === 'all' && !q
  const featured = showFeatured
    ? filtered.find((e) => (e.end_date || e.start_date || '') >= now && ['published', 'ongoing'].includes(e.status))
    : null
  const upcoming = filtered.filter((e) => (e.end_date || e.start_date || '') >= now && e.id !== featured?.id)
  const past = filtered.filter((e) => (e.end_date || e.start_date || '') < now).reverse()
  const mineCount = events.filter(isMine).length

  // Événements à venir pour le widget agenda de la colonne latérale
  const upcomingAgenda = events
    .filter((e) => (e.end_date || e.start_date || '') >= now && ['published', 'ongoing'].includes(e.status))
    .slice(0, 3)

  const onsiteCount = events.filter((e) => e.format === 'onsite').length
  const hybridCount = events.filter((e) => e.format === 'hybrid').length
  const onlineCount = events.filter((e) => e.format === 'online').length

  const renderGrid = (list) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {list.map((event, i) => (
        <EventCard
          key={event.id}
          event={event}
          role={roles[event.id] || (event.organizer_id === user.id ? 'organizer' : null)}
          onOpen={onSelectEvent}
          style={{ '--i': Math.min(i, 8) }}
        />
      ))}
    </div>
  )

  return (
    <div className="page-container">
      <PageHeader
        title="Événements"
        description="Conférences, colloques et séminaires de la plateforme. Ouvre une fiche pour soumettre, relire ou organiser."
        actions={
          !showForm && (
            <button type="button" onClick={() => setShowForm(true)} className="btn-accent">
              <PlusIcon size={16} weight="bold" aria-hidden="true" />
              Créer un événement
            </button>
          )
        }
      />

      {showForm && (
        <section className="card-panel mb-10 w-full rise" aria-labelledby="new-event-title">
          <div className="flex items-start justify-between gap-4 mb-6 pb-4 border-b border-line/60">
            <div>
              <h2 id="new-event-title" className="text-xl font-semibold tracking-tight text-fg">
                Nouvel événement scientifique
              </h2>
              <p className="text-sm text-muted mt-1">
                L'événement est créé en brouillon. Vous en devenez l'organisateur et suivez son aperçu en temps réel.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="icon-btn -mr-2 -mt-1"
              aria-label="Fermer"
            >
              <XIcon size={18} />
            </button>
          </div>
          <EventForm
            submitLabel="Créer l'événement"
            busyLabel="Création…"
            error={createError}
            onSubmit={createEvent}
            onCancel={() => setShowForm(false)}
            showPreview={true}
          />
        </section>
      )}

      {/* Disposition principale avec colonne latérale compagne */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-8 items-start">
        {/* Colonne Principale : Filtres, Recherche & Grille */}
        <div className="min-w-0 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <Tabs
              variant="pill"
              label="Filtrer les événements"
              active={filter}
              onChange={setFilter}
              tabs={[
                { id: 'all', label: 'Tous' },
                { id: 'mine', label: 'Mes événements', badge: mineCount || null },
                { id: 'open', label: 'Publiés' },
              ]}
            />
            <label className="relative sm:ml-auto sm:w-72">
              <span className="sr-only">Rechercher un événement</span>
              <MagnifyingGlassIcon
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Titre, lieu…"
                className="input-field pl-10"
              />
            </label>
          </div>

          {/* Pilules de filtres rapides */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 tabs-scroll">
            {[
              { id: 'all', label: 'Toutes les conférences' },
              { id: 'ongoing', label: 'En cours', count: liveCount, dot: 'bg-ok' },
              { id: 'submissions', label: 'Appels à comm.', count: subPhaseCount, dot: 'bg-accent' },
              { id: 'upcoming', label: 'À venir', count: upCount },
              { id: 'onsite', label: 'Présentiel USTO', count: onsiteCount },
            ].map((chip) => {
              const active = quickChip === chip.id
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setQuickChip(chip.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-150 active:scale-95 cursor-pointer ${
                    active
                      ? 'bg-fg text-bg shadow-xs font-semibold'
                      : 'bg-surface border border-line text-muted hover:text-fg hover:border-line/80'
                  }`}
                >
                  {chip.dot && <span className={`w-1.5 h-1.5 rounded-full ${chip.dot}`} />}
                  <span>{chip.label}</span>
                  {chip.count !== undefined && chip.count > 0 && (
                    <span className={`num text-[11px] px-1.5 py-0.2 rounded-full font-mono ${active ? 'bg-bg/25 text-bg' : 'bg-surface-2 text-faint'}`}>
                      {chip.count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {formatFilter !== 'all' && (
            <div className="flex items-center gap-2 text-xs text-muted">
              <span>Filtre format actif :</span>
              <span className="badge-type font-semibold">
                {FORMAT_LABELS[formatFilter] || formatFilter}
              </span>
              <button
                type="button"
                onClick={() => setFormatFilter('all')}
                className="text-accent hover:underline ml-1 font-medium"
              >
                Tout réafficher
              </button>
            </div>
          )}

          {loadError && <div className="alert-error">{loadError}</div>}

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="skeleton h-72" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={CalendarBlankIcon}
              title={events.length === 0 ? 'Aucun événement pour le moment' : 'Aucun événement ne correspond'}
              body={
                events.length === 0
                  ? 'Crée le premier : il restera en brouillon jusqu’à sa validation par un administrateur.'
                  : 'Change de filtre ou de recherche.'
              }
              action={
                events.length === 0 && !showForm ? (
                  <button type="button" onClick={() => setShowForm(true)} className="btn-accent">
                    <PlusIcon size={16} weight="bold" aria-hidden="true" />
                    Créer un événement
                  </button>
                ) : null
              }
            />
          ) : (
            <div className="space-y-10">
              {featured && (
                <FeaturedEventCard
                  event={featured}
                  role={roles[featured.id] || (featured.organizer_id === user.id ? 'organizer' : null)}
                  onOpen={onSelectEvent}
                />
              )}
              {upcoming.length > 0 && (
                <section>
                  <SectionTitle title={featured ? 'Aussi à venir' : 'À venir'} count={upcoming.length} />
                  {renderGrid(upcoming)}
                </section>
              )}
              {past.length > 0 && (
                <section>
                  <SectionTitle title="Passés" count={past.length} />
                  {renderGrid(past)}
                </section>
              )}
            </div>
          )}
        </div>

        {/* Colonne Latérale Compagne (Agenda, Filtres Rapides, Repères) */}
        <aside className="space-y-6 lg:sticky lg:top-24">
          {/* Widget 1 : Agenda des dates clés */}
          <div className="card p-5 border-line/70 bg-surface/90 shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarBlankIcon size={16} className="text-accent-ink" weight="bold" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-fg">Agenda & Échéances</h3>
              </div>
              <span className="text-[11px] font-medium text-muted">Prochains RDV</span>
            </div>

            {upcomingAgenda.length === 0 ? (
              <p className="text-xs text-muted py-2">Aucune conférence immédiate à l'agenda.</p>
            ) : (
              <div className="divide-y divide-line/60">
                {upcomingAgenda.map((item) => {
                  const parts = dayParts(item.start_date)
                  const days = daysUntil(item.start_date, now)
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSelectEvent(item.id)}
                      className="w-full text-left py-3 first:pt-1 last:pb-1 group flex items-start gap-3 hover:opacity-90 transition-opacity"
                    >
                      <div className="bg-surface-sunken border border-line/80 rounded-xl px-2 py-1 text-center min-w-[42px] shrink-0 group-hover:border-accent/40 group-hover:bg-accent/5 transition-colors">
                        <span className="block text-[9px] font-bold uppercase tracking-wider text-accent leading-none">
                          {parts?.month}
                        </span>
                        <span className="num block font-bold text-base text-fg leading-none mt-0.5">
                          {parts?.day}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-semibold text-fg group-hover:text-fg dark:group-hover:text-white line-clamp-2 leading-snug transition-colors">
                          {item.title}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-muted truncate">
                            {item.location || FORMAT_LABELS[item.format] || 'USTO Oran'}
                          </span>
                          {days && (
                            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-neutral-100/80 text-neutral-700 border border-neutral-200/80 dark:bg-white/[0.06] dark:text-neutral-200 dark:border-white/10 shrink-0">
                              {days}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Widget 2 : Filtres rapides par format */}
          <div className="card p-5 border-line/70 bg-surface/90 shadow-card space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-fg">Format de tenue</h3>
              {formatFilter !== 'all' && (
                <button
                  type="button"
                  onClick={() => setFormatFilter('all')}
                  className="text-[11px] text-accent hover:underline font-medium"
                >
                  Réinitialiser
                </button>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              {[
                { id: 'all', label: 'Tous les formats', count: events.length },
                { id: 'onsite', label: 'Présentiel (sur campus)', count: onsiteCount },
                { id: 'hybrid', label: 'Hybride (mixte)', count: hybridCount },
                { id: 'online', label: 'En ligne (distanciel)', count: onlineCount },
              ].map((f) => {
                const active = formatFilter === f.id
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFormatFilter(f.id)}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                      active
                        ? 'bg-accent/12 text-accent-ink font-semibold border border-accent/30'
                        : 'text-fg/80 hover:bg-surface-sunken hover:text-fg'
                    }`}
                  >
                    <span>{f.label}</span>
                    <span
                      className={`num text-[11px] px-2 py-0.5 rounded-full ${
                        active ? 'bg-accent text-on-accent font-bold' : 'bg-surface-sunken text-muted'
                      }`}
                    >
                      {f.count}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Widget 3 : Repères & Dynamique USTO */}
          <div className="card p-5 border-line/70 bg-surface/90 shadow-card space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-fg">Indicateurs académiques</h3>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-surface-sunken/70 border border-line/60">
                <span className="num text-xl font-bold text-fg block">{events.length}</span>
                <span className="text-[10px] text-muted block mt-0.5">Conférences</span>
              </div>
              <div className="p-2.5 rounded-xl bg-surface-sunken/70 border border-line/60">
                <span className="num text-xl font-bold text-accent-ink block">
                  {events.filter((e) => ['published', 'ongoing'].includes(e.status)).length}
                </span>
                <span className="text-[10px] text-muted block mt-0.5">Actives</span>
              </div>
            </div>
            <p className="text-[11px] text-faint leading-relaxed pt-1">
              Plateforme de diffusion et d'arbitrage scientifique de l'Université des Sciences et de la Technologie d'Oran Mohamed-Boudiaf.
            </p>
          </div>

          {/* Widget 4 : Appel organisation (si le formulaire n'est pas déjà ouvert) */}
          {!showForm && (
            <div className="card p-5 border-accent/25 bg-accent/4 rounded-2xl space-y-3">
              <div className="flex items-center gap-2">
                <SparkleIcon size={16} className="text-accent" weight="fill" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-accent-ink">
                  Comités & Laboratoires
                </h3>
              </div>
              <p className="text-xs text-muted leading-relaxed">
                Vous pilotez une équipe de recherche ? Lancez votre conférence ou symposium en quelques clics.
              </p>
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="btn-accent w-full text-xs justify-center py-2"
              >
                <PlusIcon size={14} weight="bold" />
                Créer une conférence
              </button>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
