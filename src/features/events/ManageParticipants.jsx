import { useState } from 'react'
import { MagnifyingGlassIcon, UserMinusIcon, UsersThreeIcon } from '@phosphor-icons/react'
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

  const handleRoleChange = async (p, newRole) => {
    if (newRole === 'organizer' && !window.confirm(`Donner le rôle d'organisateur à ${p.profiles?.full_name} ? Il pourra tout gérer.`)) return
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
    .sort((a, b) => ROLES.indexOf(a.role_in_event) - ROLES.indexOf(b.role_in_event) || (a.profiles?.full_name || '').localeCompare(b.profiles?.full_name || ''))

  return (
    <section>
      <SectionTitle
        title="Participants"
        count={participants.length}
        description="Organisateurs, reviewers et participants inscrits. Ajoute des membres depuis l'onglet Inscriptions."
      />

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        <Tabs
          variant="pill"
          label="Filtrer par rôle"
          active={role}
          onChange={setRole}
          tabs={[
            { id: 'all', label: 'Tous' },
            ...ROLES.map((r) => ({ id: r, label: `${ROLE_LABELS[r]}s`, badge: countOf(r) || null })),
          ]}
        />
        <label className="relative sm:ml-auto sm:w-64">
          <span className="sr-only">Rechercher une personne</span>
          <MagnifyingGlassIcon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint pointer-events-none" aria-hidden="true" />
          <input type="search" className="input-field pl-10" placeholder="Nom ou email…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
      </div>

      {error && (
        <div role="alert" className="alert-error mb-4">
          {error}
        </div>
      )}

      {listed.length === 0 ? (
        <EmptyState compact icon={UsersThreeIcon} title="Personne ici" body="Aucun membre ne correspond." />
      ) : (
        <ul className="space-y-2">
          {listed.map((p) => {
            const isMe = p.user_id === myId
            return (
              <li key={p.id} className="row" style={{ '--stripe': ROLE_COLOR[p.role_in_event] }}>
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Avatar name={p.profiles?.full_name} size={36} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-fg truncate">
                      {p.profiles?.full_name}
                      {isMe && <span className="text-faint font-normal"> (toi)</span>}
                    </p>
                    <p className="text-[13px] text-muted truncate">{p.profiles?.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <label className="sr-only" htmlFor={`role-${p.id}`}>
                    Rôle de {p.profiles?.full_name}
                  </label>
                  <select
                    id={`role-${p.id}`}
                    value={p.role_in_event}
                    onChange={(e) => handleRoleChange(p, e.target.value)}
                    disabled={updatingId === p.id || isMe}
                    className="select-field w-auto min-h-9 py-1.5 text-[13px]"
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
                      className="icon-btn w-9 h-9 hover:text-bad"
                      disabled={updatingId === p.id}
                      onClick={() => handleRemove(p)}
                      aria-label={`Retirer ${p.profiles?.full_name}`}
                      title="Retirer de l'événement"
                    >
                      <UserMinusIcon size={17} />
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
