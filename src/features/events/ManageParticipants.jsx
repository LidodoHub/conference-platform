import { useState } from 'react'
import {
  MagnifyingGlassIcon,
  UserMinusIcon,
  UsersThreeIcon,
  SquaresFourIcon,
  TableIcon,
} from '@phosphor-icons/react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../lib/auth'
import { writeError } from '../../lib/errors'
import { ROLE_LABELS, ROLE_COLOR } from '../../lib/constants'
import Avatar from '../../components/ui/Avatar'
import Tabs from '../../components/ui/Tabs'
import SectionTitle from '../../components/ui/SectionTitle'
import EmptyState from '../../components/ui/EmptyState'

const ROLES = ['organizer', 'reviewer', 'participant']

export default function ManageParticipants({ participants, onUpdated }) {
  const myId = useAuth().user?.id ?? null
  const [updatingId, setUpdatingId] = useState(null)
  const [error, setError] = useState(null)
  const [role, setRole] = useState('all')
  const [query, setQuery] = useState('')
  const [viewMode, setViewMode] = useState('table') // 'table' | 'cards'

  const handleRoleChange = async (p, newRole) => {
    if (
      newRole === 'organizer' &&
      !window.confirm(`Donner le rôle d'organisateur à ${p.profiles?.full_name} ? Il pourra tout gérer.`)
    )
      return
    setUpdatingId(p.id)
    setError(null)
    const res = await supabase.from('event_participants').update({ role_in_event: newRole }).eq('id', p.id).select('id')
    setUpdatingId(null)
    const msg = writeError(res, 'Changement de rôle refusé par la base.')
    if (msg) setError(msg)
    else onUpdated()
  }

  const handleRemove = async (p) => {
    if (!window.confirm(`Retirer ${p.profiles?.full_name || 'ce participant'} de l'événement ?`)) return
    setUpdatingId(p.id)
    setError(null)
    const res = await supabase.from('event_participants').delete().eq('id', p.id).select('id')
    setUpdatingId(null)
    const msg = writeError(res, 'Retrait refusé : seul un organisateur peut retirer un participant.')
    if (msg) setError(msg)
    else onUpdated()
  }

  const countOf = (r) => participants.filter((p) => p.role_in_event === r).length
  const q = query.trim().toLowerCase()
  const listed = participants
    .filter((p) => role === 'all' || p.role_in_event === role)
    .filter((p) => !q || [p.profiles?.full_name, p.profiles?.email].some((v) => (v || '').toLowerCase().includes(q)))
    .sort(
      (a, b) =>
        ROLES.indexOf(a.role_in_event) - ROLES.indexOf(b.role_in_event) ||
        (a.profiles?.full_name || '').localeCompare(b.profiles?.full_name || ''),
    )

  return (
    <section className="space-y-6">
      <SectionTitle
        title="Membres & Rôles"
        count={participants.length}
        description="Gérez les organisateurs, membres du comité scientifique (reviewers) et participants inscrits."
      />

      {/* Barre d'outils : Filtres rôles + Recherche + Commutateur de vue */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <Tabs
          variant="pill"
          wrap
          label="Filtrer par rôle"
          active={role}
          onChange={setRole}
          tabs={[
            { id: 'all', label: 'Tous' },
            ...ROLES.map((r) => ({ id: r, label: `${ROLE_LABELS[r]}s`, badge: countOf(r) || null })),
          ]}
        />

        <div className="flex items-center gap-2.5">
          <label className="relative flex-1 sm:w-64">
            <span className="sr-only">Rechercher une personne</span>
            <MagnifyingGlassIcon
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              className="input-field pl-9.5 text-xs sm:text-sm py-1.5"
              placeholder="Nom ou email…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>

          {/* Commutateur de vue : Tableau vs Cartes */}
          <div className="flex items-center rounded-xl border border-line bg-surface/80 p-0.5 shrink-0" aria-label="Format d'affichage">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'table' ? 'bg-accent/20 text-accent-ink shadow-xs' : 'text-muted hover:text-fg'
              }`}
              title="Affichage en tableau"
              aria-label="Affichage en tableau"
            >
              <TableIcon size={17} weight={viewMode === 'table' ? 'fill' : 'regular'} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'cards' ? 'bg-accent/20 text-accent-ink shadow-xs' : 'text-muted hover:text-fg'
              }`}
              title="Affichage en cartes horizontales"
              aria-label="Affichage en cartes"
            >
              <SquaresFourIcon size={17} weight={viewMode === 'cards' ? 'fill' : 'regular'} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div role="alert" className="alert-error">
          {error}
        </div>
      )}

      {listed.length === 0 ? (
        <EmptyState compact icon={UsersThreeIcon} title="Aucun membre trouvé" body="Aucune personne ne correspond à ces critères." />
      ) : viewMode === 'table' ? (
        /* --- 1. VUE TABLEAU PLEINE LARGEUR (DATA TABLE SAAS) --- */
        <div className="card overflow-hidden border-line rise">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-surface border-b border-line text-faint text-[11px] uppercase tracking-wider font-semibold">
                <tr>
                  <th scope="col" className="px-4 py-3">Membre</th>
                  <th scope="col" className="px-4 py-3">Email</th>
                  <th scope="col" className="px-4 py-3">Rôle attribué</th>
                  <th scope="col" className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {listed.map((p) => {
                  const isMe = p.user_id === myId
                  const color = ROLE_COLOR[p.role_in_event]
                  return (
                    <tr key={p.id} className="hover:bg-fg/4 transition-colors">
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <Avatar name={p.profiles?.full_name} size={32} />
                          <div>
                            <span className="font-semibold text-fg">
                              {p.profiles?.full_name || 'Sans nom'}
                            </span>
                            {isMe && <span className="text-accent-ink text-xs font-normal"> (toi)</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-xs text-muted">
                        {p.profiles?.email || '—'}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                          <select
                            id={`role-${p.id}`}
                            value={p.role_in_event}
                            onChange={(e) => handleRoleChange(p, e.target.value)}
                            disabled={updatingId === p.id || isMe}
                            aria-label={`Rôle de ${p.profiles?.full_name}`}
                            className="select-field w-auto py-1 text-xs"
                          >
                            {ROLES.map((r) => (
                              <option key={r} value={r}>
                                {ROLE_LABELS[r]}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-right">
                        {!isMe && (
                          <button
                            type="button"
                            className="icon-btn w-8 h-8 text-faint hover:text-bad inline-flex items-center justify-center"
                            disabled={updatingId === p.id}
                            onClick={() => handleRemove(p)}
                            aria-label={`Retirer ${p.profiles?.full_name}`}
                            title="Retirer de l'événement"
                          >
                            <UserMinusIcon size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* --- 2. VUE CARTES HORIZONTALES --- */
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 rise">
          {listed.map((p) => {
            const isMe = p.user_id === myId
            const color = ROLE_COLOR[p.role_in_event]
            return (
              <div
                key={p.id}
                className="card p-4 border-line bg-surface/70 flex flex-col justify-between gap-3 relative overflow-hidden"
              >
                <span
                  className="absolute left-0 top-0 bottom-0 w-1"
                  style={{ background: color }}
                  aria-hidden="true"
                />

                <div className="flex items-start gap-3 min-w-0">
                  <Avatar name={p.profiles?.full_name} size={38} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-fg truncate">
                      {p.profiles?.full_name || 'Sans nom'}
                      {isMe && <span className="text-accent-ink text-xs font-normal"> (toi)</span>}
                    </p>
                    <p className="text-xs text-muted truncate mt-0.5">{p.profiles?.email}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-line flex items-center justify-between gap-2">
                  <select
                    id={`card-role-${p.id}`}
                    value={p.role_in_event}
                    onChange={(e) => handleRoleChange(p, e.target.value)}
                    disabled={updatingId === p.id || isMe}
                    aria-label={`Rôle de ${p.profiles?.full_name}`}
                    className="select-field w-auto py-1 text-xs"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>

                  {!isMe && (
                    <button
                      type="button"
                      className="icon-btn w-8 h-8 text-faint hover:text-bad"
                      disabled={updatingId === p.id}
                      onClick={() => handleRemove(p)}
                      aria-label={`Retirer ${p.profiles?.full_name}`}
                      title="Retirer de l'événement"
                    >
                      <UserMinusIcon size={16} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
