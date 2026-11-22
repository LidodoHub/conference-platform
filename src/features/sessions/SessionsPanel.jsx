import { useState, useEffect, useCallback } from 'react'
import {
  PlusIcon,
  TrashIcon,
  ClockIcon,
  UsersThreeIcon,
  PresentationChartIcon,
  ArrowRightIcon,
  PencilSimpleIcon,
  DoorOpenIcon,
  VideoCameraIcon,
  SquaresFourIcon,
  MagnifyingGlassIcon,
} from '@phosphor-icons/react'
import { supabase } from '../../lib/supabaseClient'
import { frError, writeError } from '../../lib/errors'
import { SESSION_TYPE_LABELS } from '../../lib/constants'
import EmptyState from '../../components/ui/EmptyState'
import SectionTitle from '../../components/ui/SectionTitle'
import Tabs from '../../components/ui/Tabs'
import SessionForm from './SessionForm'
import AddToCalendarButton from '../../components/ui/AddToCalendarButton'

const timeOf = (iso) => (iso ? new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '')
const dayKey = (iso) => {
  if (!iso) return 'none'
  const d = new Date(iso)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}
const dayOf = (iso) => (iso ? new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) : 'À planifier')

// session la plus recommandée par les reviewers pour un article
const suggestedSessionId = (s) => {
  const counts = {}
  for (const r of s.reviews || []) {
    if (r.recommended_session_id) counts[r.recommended_session_id] = (counts[r.recommended_session_id] || 0) + 1
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || ''
}

export default function SessionsPanel({ eventId, event, isOrganizer, phase, submissions = [] }) {
  const [sessions, setSessions] = useState([])
  const [rooms, setRooms] = useState([])
  const [links, setLinks] = useState({})
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null) // null | 'new' | id de session
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [choices, setChoices] = useState({})
  const [viewMode, setViewMode] = useState('grid') // 'grid' | 'timeline'
  const [selectedDay, setSelectedDay] = useState('all')
  const [query, setQuery] = useState('')
  const [now] = useState(() => Date.now())

  const organizational = phase === 'organizational'
  const canAssign = isOrganizer && organizational
  const showMeeting = event?.format && event.format !== 'onsite'

  const load = useCallback(async () => {
    const { data: sessionsData, error: loadError } = await supabase
      .from('sessions')
      .select('id, title, description, session_type, start_time, end_time, max_capacity, room_id')
      .eq('event_id', eventId)
      .order('start_time', { ascending: true, nullsFirst: false })
    if (loadError) {
      setError(frError(loadError))
      setLoading(false)
      return
    }
    setSessions(sessionsData)
    const ids = sessionsData.map((x) => x.id)

    const [roomsRes, assignRes, linksRes] = await Promise.all([
      supabase.from('rooms').select('id, name, capacity, location').eq('event_id', eventId).order('name'),
      ids.length
        ? supabase.from('session_submissions').select('id, session_id, submission_id, presentation_order').in('session_id', ids).order('presentation_order')
        : Promise.resolve({ data: [] }),
      ids.length ? supabase.from('session_links').select('session_id, url').in('session_id', ids) : Promise.resolve({ data: [] }),
    ])
    setRooms(roomsRes.data || [])
    setAssignments(assignRes.data || [])
    setLinks(Object.fromEntries((linksRes.data || []).map((l) => [l.session_id, l.url])))
    setLoading(false)
  }, [eventId])

  useEffect(() => {
    load()
  }, [load])

  const saveSession = async (values) => {
    const { meeting_url: url, ...fields } = values
    let sessionId = editing
    if (editing === 'new') {
      const { data, error: insertError } = await supabase.from('sessions').insert({ ...fields, event_id: eventId }).select('id').single()
      if (insertError) return frError(insertError)
      sessionId = data.id
    } else {
      const res = await supabase.from('sessions').update(fields).eq('id', editing).select('id')
      const msg = writeError(res, "Modification refusée : tu n'es pas organisateur de cet événement.")
      if (msg) return msg
    }

    if (showMeeting) {
      const linkRes = url
        ? await supabase.from('session_links').upsert({ session_id: sessionId, url, updated_at: new Date().toISOString() })
        : await supabase.from('session_links').delete().eq('session_id', sessionId)
      if (linkRes.error) return `Session enregistrée, mais pas le lien : ${frError(linkRes.error)}`
    }

    setEditing(null)
    load()
    return null
  }

  const handleDelete = async (s) => {
    if (!window.confirm(`Supprimer la session « ${s.title} » ? Ses articles redeviendront à placer.`)) return
    setError(null)
    const res = await supabase.from('sessions').delete().eq('id', s.id).select('id')
    const msg = writeError(res, "Suppression refusée : tu n'es pas organisateur de cet événement.")
    if (msg) setError(msg)
    else load()
  }

  const assign = async (submissionId, sessionId) => {
    setError(null)
    setBusy(true)
    const { error: rpcError } = await supabase.rpc('assign_submission_to_session', {
      p_submission_id: submissionId,
      p_session_id: sessionId || null,
    })
    setBusy(false)
    if (rpcError) setError(frError(rpcError))
    else load()
  }

  const submissionById = new Map(submissions.map((s) => [s.id, s]))
  const roomById = new Map(rooms.map((r) => [r.id, r]))
  const assignedIds = new Set(assignments.map((a) => a.submission_id))
  const unplaced = submissions.filter((s) => s.status === 'accepted' && !assignedIds.has(s.id))
  const papersOf = (sessionId) => assignments.filter((a) => a.session_id === sessionId)
  const sessionTitle = (id) => sessions.find((x) => x.id === id)?.title

  // Filtrage par texte
  const q = query.trim().toLowerCase()
  const filteredSessions = sessions.filter((s) => {
    if (!q) return true
    const room = roomById.get(s.room_id)
    const papers = papersOf(s.id).map((p) => submissionById.get(p.submission_id)?.title || '')
    return (
      s.title.toLowerCase().includes(q) ||
      (s.description || '').toLowerCase().includes(q) ||
      (room?.name || '').toLowerCase().includes(q) ||
      papers.some((title) => title.toLowerCase().includes(q))
    )
  })

  // Groupement par jour
  const days = []
  for (const s of filteredSessions) {
    const key = dayKey(s.start_time)
    let day = days.find((d) => d.key === key)
    if (!day) {
      day = { key, label: dayOf(s.start_time), items: [] }
      days.push(day)
    }
    day.items.push(s)
  }

  const displayedDays = selectedDay === 'all' ? days : days.filter((d) => d.key === selectedDay)

  const dayFilterTabs = [
    { id: 'all', label: 'Tous les jours', badge: filteredSessions.length },
    ...days.map((d, i) => ({
      id: d.key,
      label: `Jour ${i + 1} (${d.items[0]?.start_time ? new Date(d.items[0].start_time).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : 'À planifier'})`,
      badge: d.items.length,
    })),
  ]

  const formFor = (initial) => (
    <SessionForm
      initial={initial ? { ...initial, meeting_url: links[initial.id] } : null}
      rooms={rooms}
      sessions={sessions}
      showMeeting={showMeeting}
      submitLabel={initial ? 'Enregistrer' : 'Créer la session'}
      onSubmit={saveSession}
      onCancel={() => setEditing(null)}
    />
  )

  return (
    <section className="space-y-6">
      <SectionTitle
        title="Programme & Sessions"
        count={sessions.length}
        description="Sessions, horaires, salles et articles présentés. Le programme est visible par tous une fois l'événement publié."
        actions={
          isOrganizer &&
          editing === null && (
            <button type="button" onClick={() => setEditing('new')} className="btn-accent">
              <PlusIcon size={16} weight="bold" aria-hidden="true" />
              Ajouter une session
            </button>
          )
        }
      />

      {error && (
        <div role="alert" className="alert-error">
          {error}
        </div>
      )}

      {isOrganizer && !organizational && (
        <div className="alert-info">
          Le placement définitif des articles se fait en phase organisationnelle. D'ici là, les reviewers peuvent suggérer une session.
        </div>
      )}

      {editing === 'new' && <div className="mb-8">{formFor(null)}</div>}

      {/* Articles acceptés non placés */}
      {canAssign && unplaced.length > 0 && (
        <section className="card p-5 border-accent/40 bg-surface/80 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold text-fg flex items-baseline gap-2 text-sm sm:text-base">
              Articles acceptés à placer dans le programme
              <span className="num font-mono text-xs font-semibold px-2 py-0.5 rounded-full bg-accent/20 text-accent-ink">
                {unplaced.length}
              </span>
            </h3>
          </div>
          <div className="mt-2">
            {sessions.length === 0 ? (
              <p className="text-xs text-muted">Créez d'abord des sessions ci-dessous pour y placer des articles.</p>
            ) : (
              <ul className="divide-y divide-line max-h-64 overflow-y-auto pr-1">
                {unplaced.map((s) => {
                  const suggestion = suggestedSessionId(s)
                  const value = choices[s.id] ?? suggestion
                  return (
                    <li key={s.id} className="py-2.5 first:pt-0 last:pb-0 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs sm:text-sm">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-fg leading-snug truncate" title={s.title}>
                          {s.title}
                        </p>
                        <p className="text-xs text-muted mt-0.5">
                          {s.profiles?.full_name}
                          {suggestion && <span className="text-accent-ink"> • Recommandé : {sessionTitle(suggestion) || 'session'}</span>}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <select
                          id={`place-${s.id}`}
                          aria-label={`Session pour ${s.title}`}
                          className="select-field md:w-52 py-1 text-xs"
                          value={value}
                          onChange={(e) => setChoices((c) => ({ ...c, [s.id]: e.target.value }))}
                        >
                          <option value="">Sélectionner une session…</option>
                          {sessions.map((x) => (
                            <option key={x.id} value={x.id}>
                              {x.title}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="btn-accent btn-sm text-xs py-1"
                          disabled={busy || !value}
                          onClick={() => assign(s.id, value)}
                        >
                          Placer
                          <ArrowRightIcon size={13} weight="bold" aria-hidden="true" />
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </section>
      )}

      {/* Barre d'outils : Filtres par jour + Recherche + Commutateur Grille / Frise */}
      {sessions.length > 0 && (
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {days.length > 1 ? (
            <Tabs
              variant="pill"
              wrap
              label="Filtrer par jour"
              active={selectedDay}
              onChange={setSelectedDay}
              tabs={dayFilterTabs}
            />
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2.5">
            <label className="relative flex-1 sm:w-64">
              <span className="sr-only">Rechercher une session</span>
              <MagnifyingGlassIcon
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="search"
                className="input-field pl-9.5 text-xs sm:text-sm py-1.5"
                placeholder="Session, salle, article…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>

            {/* Commutateur de vue : Grille vs Frise */}
            <div className="flex items-center rounded-xl border border-line bg-surface/80 p-0.5 shrink-0" aria-label="Format d'affichage">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'grid' ? 'bg-accent/20 text-accent-ink shadow-xs' : 'text-muted hover:text-fg'
                }`}
                title="Affichage en cartes horizontales"
                aria-label="Affichage en cartes"
              >
                <SquaresFourIcon size={17} weight={viewMode === 'grid' ? 'fill' : 'regular'} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('timeline')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'timeline' ? 'bg-accent/20 text-accent-ink shadow-xs' : 'text-muted hover:text-fg'
                }`}
                title="Affichage chronologique (Frise)"
                aria-label="Affichage en frise chronologique"
              >
                <ClockIcon size={17} weight={viewMode === 'timeline' ? 'fill' : 'regular'} aria-hidden="true" />
              </button>
            </div>

            <AddToCalendarButton
              event={event}
              label="Agenda"
              btnClass="btn-outline btn-sm text-xs py-1.5"
            />
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          <div className="skeleton h-28" />
          <div className="skeleton h-28" />
        </div>
      ) : sessions.length === 0 ? (
        editing !== 'new' && (
          <EmptyState
            icon={PresentationChartIcon}
            title="Programme à venir"
            body="Les sessions de l'événement apparaîtront ici dès leur création."
          />
        )
      ) : displayedDays.length === 0 ? (
        <EmptyState
          compact
          title="Aucune session trouvée"
          body="Modifiez vos critères de recherche ou de filtre par jour."
        />
      ) : (
        <div className="space-y-10">
          {displayedDays.map((day) => (
            <section key={day.key} className="space-y-4">
              <h3 className="flex items-center gap-3 text-sm font-semibold text-fg">
                <span className="first-letter:uppercase">{day.label}</span>
                <span className="h-px flex-1 bg-line" aria-hidden="true" />
                <span className="num font-mono text-xs text-faint">({day.items.length})</span>
              </h3>

              {viewMode === 'grid' ? (
                /* --- VUE GRILLE HORIZONTALE DE SESSIONS --- */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rise">
                  {day.items.map((s) =>
                    editing === s.id ? (
                      <div key={s.id} className="md:col-span-2">
                        {formFor(s)}
                      </div>
                    ) : (
                      <SessionCard
                        key={s.id}
                        s={s}
                        now={now}
                        room={roomById.get(s.room_id)}
                        link={showMeeting ? links[s.id] : null}
                        papers={papersOf(s.id)}
                        submissionById={submissionById}
                        isOrganizer={isOrganizer}
                        canAssign={canAssign}
                        busy={busy}
                        onEdit={() => setEditing(s.id)}
                        onDelete={() => handleDelete(s)}
                        onUnassign={(id) => assign(id, null)}
                      />
                    ),
                  )}
                </div>
              ) : (
                /* --- VUE CHRONOLOGIQUE CLASSIQUE --- */
                <ol className="relative space-y-3 sm:pl-[104px] rise">
                  <span className="hidden sm:block absolute left-[88px] top-2 bottom-2 w-px bg-line" aria-hidden="true" />
                  {day.items.map((s, idx) =>
                    editing === s.id ? (
                      <li key={s.id}>{formFor(s)}</li>
                    ) : (
                      <SessionTimelineItem
                        key={s.id}
                        s={s}
                        idx={idx}
                        now={now}
                        room={roomById.get(s.room_id)}
                        link={showMeeting ? links[s.id] : null}
                        papers={papersOf(s.id)}
                        submissionById={submissionById}
                        isOrganizer={isOrganizer}
                        canAssign={canAssign}
                        busy={busy}
                        onEdit={() => setEditing(s.id)}
                        onDelete={() => handleDelete(s)}
                        onUnassign={(id) => assign(id, null)}
                      />
                    ),
                  )}
                </ol>
              )}
            </section>
          ))}
        </div>
      )}
    </section>
  )
}

// Carte horizontale de session (Vue Grille)
function SessionCard({ s, now, room, link, papers, submissionById, isOrganizer, canAssign, busy, onEdit, onDelete, onUnassign }) {
  const live = s.start_time && s.end_time && new Date(s.start_time).getTime() <= now && now <= new Date(s.end_time).getTime()

  return (
    <article className="card p-5 border-line bg-surface/70 hover:bg-surface hover:border-accent/40 hover:-translate-y-0.5 hover:shadow-lift active:scale-[0.99] transition-all duration-200 flex flex-col justify-between relative overflow-hidden group shadow-xs">
      <span
        className="absolute left-0 top-0 bottom-0 w-1.5"
        style={{ background: live ? 'var(--color-ok)' : 'var(--color-accent)' }}
        aria-hidden="true"
      />

      <div className="space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="badge-type text-[11px] font-semibold">{SESSION_TYPE_LABELS[s.session_type] || s.session_type}</span>
            {live && <span className="badge-published text-[11px] animate-pulse">En cours</span>}
          </div>
          <span className="num text-xs font-semibold text-fg flex items-center gap-1.5 bg-bg/80 px-2 py-0.5 rounded-md border border-line">
            <ClockIcon size={13} className="text-accent-ink" aria-hidden="true" />
            {s.start_time ? `${timeOf(s.start_time)}${s.end_time ? ` - ${timeOf(s.end_time)}` : ''}` : 'Horaire à fixer'}
          </span>
        </div>

        <div>
          <h4 className="text-base font-semibold leading-snug tracking-tight text-fg group-hover:text-fg dark:group-hover:text-white transition-colors">
            {s.title}
          </h4>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
            {room && (
              <span className="inline-flex items-center gap-1.5">
                <DoorOpenIcon size={14} className="text-muted" aria-hidden="true" />
                <span className="font-medium text-fg">{room.name}</span>
                {room.location && <span className="text-faint">({room.location})</span>}
              </span>
            )}
            {s.max_capacity && (
              <span className="inline-flex items-center gap-1.5">
                <UsersThreeIcon size={14} aria-hidden="true" />
                <span>{s.max_capacity} places</span>
              </span>
            )}
          </div>
        </div>

        {s.description && (
          <p className="text-xs text-muted line-clamp-2 leading-relaxed whitespace-pre-line">
            {s.description}
          </p>
        )}

        {/* Liste des articles assignés */}
        <div className="pt-3 border-t border-line">
          <span className="text-[11px] font-semibold text-faint uppercase tracking-wider block mb-1.5">
            Articles programmés ({papers.length})
          </span>
          {papers.length > 0 ? (
            <ol className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {papers.map((a, i) => {
                const sub = submissionById.get(a.submission_id)
                return (
                  <li key={a.id} className="flex items-start justify-between gap-2 rounded-lg bg-surface-2/60 px-2.5 py-1.5 text-xs">
                    <div className="min-w-0 flex items-start gap-1.5">
                      <span className="num font-semibold text-accent-ink shrink-0">{i + 1}.</span>
                      <span className="font-medium text-fg truncate leading-snug">{sub?.title || 'Article'}</span>
                    </div>
                    {canAssign && (
                      <button
                        type="button"
                        className="text-[11px] text-faint hover:text-bad font-medium shrink-0 ml-1"
                        disabled={busy}
                        onClick={() => onUnassign(a.submission_id)}
                      >
                        Retirer
                      </button>
                    )}
                  </li>
                )
              })}
            </ol>
          ) : (
            <p className="text-xs text-faint italic">Aucun article assigné pour l'instant.</p>
          )}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-line flex items-center justify-between gap-2">
        <div>
          {link && (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className={live ? 'btn-success btn-sm text-xs' : 'btn-outline btn-sm text-xs'}
            >
              <VideoCameraIcon size={14} aria-hidden="true" />
              Rejoindre en visio
            </a>
          )}
        </div>
        {isOrganizer && (
          <div className="flex items-center gap-1">
            <button type="button" className="icon-btn w-8 h-8 text-xs" onClick={onEdit} title="Modifier">
              <PencilSimpleIcon size={14} />
            </button>
            <button type="button" className="icon-btn w-8 h-8 hover:text-bad text-xs" onClick={onDelete} title="Supprimer">
              <TrashIcon size={14} />
            </button>
          </div>
        )}
      </div>
    </article>
  )
}

// Élément de frise chronologique (Vue Frise)
function SessionTimelineItem({ s, idx, now, room, link, papers, submissionById, isOrganizer, canAssign, busy, onEdit, onDelete, onUnassign }) {
  const live = s.start_time && s.end_time && new Date(s.start_time).getTime() <= now && now <= new Date(s.end_time).getTime()

  return (
    <li className="relative rise" style={{ '--i': Math.min(idx, 8) }}>
      {/* heure + point sur la frise (ordinateur) */}
      <div className="hidden sm:block absolute -left-[104px] top-5 w-[76px] text-right">
        <p className="num text-lg font-semibold tracking-tight text-fg leading-none">{s.start_time ? timeOf(s.start_time) : '--:--'}</p>
        {s.end_time && <p className="num text-xs text-faint mt-1">{timeOf(s.end_time)}</p>}
      </div>
      <span
        className={`hidden sm:block absolute -left-[20px] top-6 w-2.5 h-2.5 rounded-full ring-4 ring-bg ${live ? 'bg-ok' : 'bg-accent'}`}
        aria-hidden="true"
      />

      <article className="entity" style={{ '--stripe': live ? 'var(--color-ok)' : 'var(--color-accent)' }}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="sm:hidden num text-sm font-semibold text-fg">
            {s.start_time ? `${timeOf(s.start_time)}${s.end_time ? ` - ${timeOf(s.end_time)}` : ''}` : 'Horaire à fixer'}
          </span>
          <span className="badge-type">{SESSION_TYPE_LABELS[s.session_type] || s.session_type}</span>
          {live && <span className="badge-published">En cours</span>}
          {room && (
            <span className="inline-flex items-center gap-1 text-xs text-muted">
              <DoorOpenIcon size={14} aria-hidden="true" />
              {room.name}
              {room.location && <span className="text-faint">, {room.location}</span>}
            </span>
          )}
          {s.max_capacity && (
            <span className="inline-flex items-center gap-1 text-xs text-muted">
              <UsersThreeIcon size={14} aria-hidden="true" />
              {s.max_capacity} places
            </span>
          )}
          {!s.start_time && (
            <span className="hidden sm:inline-flex items-center gap-1 text-xs text-warn">
              <ClockIcon size={14} aria-hidden="true" />
              Horaire à fixer
            </span>
          )}
        </div>

        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <h4 className="text-lg font-semibold leading-snug tracking-tight text-fg min-w-0">{s.title}</h4>
          {link && (
            <a href={link} target="_blank" rel="noopener noreferrer" className={live ? 'btn-success btn-sm' : 'btn-outline btn-sm'}>
              <VideoCameraIcon size={15} aria-hidden="true" />
              Rejoindre
            </a>
          )}
        </div>
        {s.description && <p className="mt-1.5 text-sm leading-6 text-muted whitespace-pre-line max-w-[70ch]">{s.description}</p>}

        {papers.length > 0 ? (
          <ol className="mt-4 space-y-1.5">
            {papers.map((a, i) => {
              const sub = submissionById.get(a.submission_id)
              return (
                <li key={a.id} className="flex items-start gap-3 rounded-lg bg-surface-2/70 px-3 py-2.5">
                  <span className="num text-xs font-medium text-accent-ink w-5 shrink-0 pt-0.5">{i + 1}.</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-fg leading-snug">{sub?.title || 'Article'}</p>
                    {sub?.profiles?.full_name && <p className="text-xs text-muted mt-0.5">{sub.profiles.full_name}</p>}
                  </div>
                  {canAssign && (
                    <button type="button" className="btn-ghost btn-sm" disabled={busy} onClick={() => onUnassign(a.submission_id)}>
                      Retirer
                    </button>
                  )}
                </li>
              )
            })}
          </ol>
        ) : (
          <p className="text-[13px] text-faint mt-3">Aucun article placé pour l'instant.</p>
        )}

        {isOrganizer && (
          <div className="mt-4 flex justify-end gap-1">
            <button type="button" className="btn-ghost btn-sm" onClick={onEdit}>
              <PencilSimpleIcon size={15} aria-hidden="true" />
              Modifier
            </button>
            <button type="button" className="btn-ghost btn-sm hover:text-bad" onClick={onDelete}>
              <TrashIcon size={15} aria-hidden="true" />
              Supprimer
            </button>
          </div>
        )}
      </article>
    </li>
  )
}
