import { useState, useEffect, useCallback } from 'react'
import {
  CheckIcon,
  XIcon,
  TrashIcon,
  ArrowUpRightIcon,
  MagnifyingGlassIcon,
  ShieldCheckIcon,
  MapPinIcon,
} from '@phosphor-icons/react'
import { supabase } from '../../lib/supabaseClient'
import { frError, writeError } from '../../lib/errors'
import { TYPE_LABELS, STATUS_LABELS, STATUS_BADGE, formatDateRange } from '../../lib/constants'
import PageHeader from '../../components/ui/PageHeader'
import SectionTitle from '../../components/ui/SectionTitle'
import EmptyState from '../../components/ui/EmptyState'
import Tabs from '../../components/ui/Tabs'
import PlatformStats from '../stats/PlatformStats'

export default function AdminPanel({ onOpenEvent }) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [tab, setTab] = useState('requests')
  const [statusFilter, setStatusFilter] = useState('all')
  const [query, setQuery] = useState('')

  const load = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from('events')
      .select('id, title, description, status, type, start_date, end_date, location, created_at, profiles(full_name, email)')
      .order('created_at', { ascending: false })
    if (fetchError) setError(frError(fetchError))
    else setEvents(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const setStatus = async (ev, status, okText) => {
    setError(null)
    setNotice(null)
    setBusyId(ev.id)
    const res = await supabase.from('events').update({ status }).eq('id', ev.id).select('id')
    setBusyId(null)
    const msg = writeError(res, "Modification refusée par la base : vérifie que ton compte est bien administrateur.")
    if (msg) setError(msg)
    else {
      setNotice(okText)
      load()
    }
  }

  const approve = (ev) => setStatus(ev, 'published', `« ${ev.title} » est publié.`)

  const refuse = (ev) => {
    if (!window.confirm(`Renvoyer « ${ev.title} » en brouillon ? L'organisateur pourra le corriger et redemander la publication.`)) return
    setStatus(ev, 'draft', `« ${ev.title} » est renvoyé en brouillon.`)
  }

  const remove = async (ev) => {
    if (
      !window.confirm(
        `Supprimer définitivement « ${ev.title} » ? Participants, soumissions, reviews et paiements seront supprimés aussi.`,
      )
    )
      return
    setError(null)
    setNotice(null)
    setBusyId(ev.id)
    const res = await supabase.from('events').delete().eq('id', ev.id).select('id')
    setBusyId(null)
    const msg = writeError(res, 'Suppression refusée par la base.')
    if (msg) setError(msg)
    else {
      setNotice(`« ${ev.title} » a été supprimé.`)
      load()
    }
  }

  const pending = events.filter((e) => e.status === 'pending_approval')
  const q = query.trim().toLowerCase()
  const listed = events.filter(
    (e) =>
      (statusFilter === 'all' || e.status === statusFilter) &&
      (!q || [e.title, e.profiles?.full_name].some((v) => (v || '').toLowerCase().includes(q))),
  )

  return (
    <div className="page-container">
      <PageHeader
        title="Administration"
        description="Valide les demandes de publication, surveille l'activité de la plateforme et gère les événements."
      />

      <div className="mb-8">
        <Tabs
          label="Sections de l'administration"
          active={tab}
          onChange={setTab}
          tabs={[
            { id: 'requests', label: 'Demandes', badge: pending.length || null },
            { id: 'events', label: 'Tous les événements' },
            { id: 'stats', label: 'Statistiques' },
          ]}
        />
      </div>

      {error && (
        <div role="alert" className="alert-error mb-6">
          {error}
        </div>
      )}
      {notice && (
        <div role="status" className="alert-success mb-6">
          {notice}
        </div>
      )}

      {tab === 'stats' && <PlatformStats />}

      {tab === 'requests' &&
        (loading ? (
          <div className="space-y-3">
            <div className="skeleton h-40" />
            <div className="skeleton h-40" />
          </div>
        ) : pending.length === 0 ? (
          <EmptyState
            icon={ShieldCheckIcon}
            title="Aucune demande en attente"
            body="Quand un organisateur demandera la publication de son événement, la demande apparaîtra ici."
          />
        ) : (
          <ul className="space-y-4">
            {pending.map((ev, i) => (
              <li key={ev.id} className="card-ticket-static rise" style={{ '--i': i }}>
                <div className="ticket-stripe" />
                <div className="ticket-perforation" />
                <div className="flex-1 min-w-0 p-5 sm:p-6 flex flex-col lg:flex-row lg:items-start gap-5">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap gap-1.5">
                      <span className="badge-pending">En validation</span>
                      <span className="badge-type">{TYPE_LABELS[ev.type] || ev.type}</span>
                    </div>
                    <h3 className="mt-3 text-lg font-semibold tracking-tight text-fg" style={{ overflowWrap: 'anywhere' }}>
                      {ev.title}
                    </h3>
                    {ev.description && (
                      <p className="text-sm text-muted mt-1.5 leading-relaxed max-w-[70ch] line-clamp-3">{ev.description}</p>
                    )}
                    <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-muted">
                      <span className="num">{formatDateRange(ev.start_date, ev.end_date)}</span>
                      {ev.location && (
                        <span className="inline-flex items-center gap-1.5">
                          <MapPinIcon size={14} aria-hidden="true" />
                          {ev.location}
                        </span>
                      )}
                      <span>
                        Par <span className="text-fg font-medium">{ev.profiles?.full_name}</span>
                        {ev.profiles?.email && <span className="text-faint"> ({ev.profiles.email})</span>}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <button type="button" className="btn-ghost" onClick={() => onOpenEvent(ev.id)}>
                      Voir
                      <ArrowUpRightIcon size={15} aria-hidden="true" />
                    </button>
                    <button type="button" className="btn-danger" disabled={busyId === ev.id} onClick={() => refuse(ev)}>
                      <XIcon size={15} weight="bold" aria-hidden="true" />
                      Refuser
                    </button>
                    <button type="button" className="btn-success" disabled={busyId === ev.id} onClick={() => approve(ev)}>
                      <CheckIcon size={15} weight="bold" aria-hidden="true" />
                      Publier
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ))}

      {tab === 'events' && (
        <section>
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <label className="relative sm:w-72">
              <span className="sr-only">Rechercher</span>
              <MagnifyingGlassIcon
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="search"
                className="input-field pl-10"
                placeholder="Titre ou organisateur…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <label className="sm:w-56">
              <span className="sr-only">Filtrer par statut</span>
              <select className="select-field" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">Tous les statuts</option>
                {Object.entries(STATUS_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <SectionTitle title="Événements" count={listed.length} />

          {loading ? (
            <div className="skeleton h-64" />
          ) : listed.length === 0 ? (
            <EmptyState compact title="Aucun événement" body="Aucun événement ne correspond à ces critères." />
          ) : (
            <ul className="card divide-y divide-line overflow-hidden">
              {listed.map((ev) => (
                <li key={ev.id} className="px-4 py-3.5 flex flex-wrap items-center gap-x-4 gap-y-2">
                  <button
                    type="button"
                    onClick={() => onOpenEvent(ev.id)}
                    className="min-w-0 flex-1 text-left group"
                  >
                    <span className="block font-medium text-fg truncate group-hover:text-fg dark:group-hover:text-white transition-colors">
                      {ev.title}
                    </span>
                    <span className="block text-[13px] text-muted truncate">
                      {ev.profiles?.full_name}
                      {ev.start_date && <span className="num">, {formatDateRange(ev.start_date, ev.end_date)}</span>}
                    </span>
                  </button>
                  <span className={STATUS_BADGE[ev.status] || 'badge-draft'}>{STATUS_LABELS[ev.status] || ev.status}</span>
                  <button
                    type="button"
                    className="icon-btn hover:text-bad"
                    disabled={busyId === ev.id}
                    onClick={() => remove(ev)}
                    aria-label={`Supprimer ${ev.title}`}
                    title="Supprimer"
                  >
                    <TrashIcon size={18} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  )
}
