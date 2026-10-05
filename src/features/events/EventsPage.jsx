import { useState, useEffect, useCallback } from 'react'
import { PlusIcon, MagnifyingGlassIcon, CalendarBlankIcon, XIcon } from '@phosphor-icons/react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../lib/auth'
import { frError } from '../../lib/errors'
import PageHeader from '../../components/ui/PageHeader'
import Tabs from '../../components/ui/Tabs'
import EmptyState from '../../components/ui/EmptyState'
import SectionTitle from '../../components/ui/SectionTitle'
import EventCard, { FeaturedEventCard } from './EventCard'
import EventForm from './EventForm'

const today = () => new Date().toISOString().slice(0, 10)

export default function EventsPage({ onSelectEvent }) {
  const { user } = useAuth()
  const [events, setEvents] = useState([])
  const [roles, setRoles] = useState({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [createError, setCreateError] = useState(null)
  const [filter, setFilter] = useState('all')
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
    else setEvents(eventsRes.data)
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

  const filtered = events.filter((e) => {
    if (!matches(e)) return false
    if (filter === 'mine') return isMine(e)
    if (filter === 'open') return ['published', 'ongoing'].includes(e.status)
    return true
  })

  const now = today()
  const showFeatured = filter === 'all' && !q
  const featured = showFeatured
    ? filtered.find((e) => (e.end_date || e.start_date || '') >= now && ['published', 'ongoing'].includes(e.status))
    : null
  const upcoming = filtered.filter((e) => (e.end_date || e.start_date || '') >= now && e.id !== featured?.id)
  const past = filtered.filter((e) => (e.end_date || e.start_date || '') < now).reverse()
  const mineCount = events.filter(isMine).length

  const renderGrid = (list) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
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
        <section className="card-panel mb-10 max-w-3xl rise" aria-labelledby="new-event-title">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h2 id="new-event-title" className="text-xl font-semibold tracking-tight text-fg">
                Nouvel événement
              </h2>
              <p className="text-sm text-muted mt-1">
                Il est créé en brouillon. Tu en deviens l'organisateur et pourras demander sa publication.
              </p>
            </div>
            <button type="button" onClick={() => setShowForm(false)} className="icon-btn -mr-2 -mt-1" aria-label="Fermer">
              <XIcon size={18} />
            </button>
          </div>
          <EventForm
            submitLabel="Créer l'événement"
            busyLabel="Création…"
            error={createError}
            onSubmit={createEvent}
            onCancel={() => setShowForm(false)}
          />
        </section>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-8">
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

      {loadError && <div className="alert-error mb-6">{loadError}</div>}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
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
        <div className="space-y-12">
          {featured && (
            <FeaturedEventCard
              event={featured}
              role={roles[featured.id] || (featured.organizer_id === user.id ? 'organizer' : null)}
              onOpen={onSelectEvent}
            />
          )}
          {upcoming.length > 0 && (
            <section>
              <SectionTitle title={featured ? "Aussi à venir" : "À venir"} count={upcoming.length} />
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
  )
}
