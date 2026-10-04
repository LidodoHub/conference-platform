import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import Avatar from '../../components/ui/Avatar'

const ROLE_LABELS = {
  participant: 'Participant',
  reviewer: 'Reviewer',
  organizer: 'Organisateur',
}

const ROLE_PLURALS = {
  organizer: 'organisateur',
  reviewer: 'reviewer',
  participant: 'participant',
}

// trait de couleur à gauche de chaque ligne, selon le rôle
const ROLE_COLOR = {
  organizer: '#E6BE5A',
  reviewer: '#7FB3FF',
  participant: '#9AA3B5',
}

export default function ManageParticipants({ participants, onUpdated }) {
  const [updatingId, setUpdatingId] = useState(null)
  const [myId, setMyId] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMyId(data?.user?.id ?? null))
  }, [])

  const handleRoleChange = async (participantId, newRole) => {
    setUpdatingId(participantId)
    setError(null)

    const { data, error: updateError } = await supabase
      .from('event_participants')
      .update({ role_in_event: newRole })
      .eq('id', participantId)
      .select('id')

    setUpdatingId(null)
    if (updateError) {
      setError(updateError.message)
      return
    }
    if (!data || data.length === 0) {
      setError('Changement de rôle refusé.')
      return
    }
    onUpdated()
  }

  const handleRemove = async (p) => {
    if (!window.confirm(`Retirer ${p.profiles?.full_name || 'ce participant'} de l'événement ?`)) return
    setUpdatingId(p.id)
    setError(null)

    const { data, error: deleteError } = await supabase
      .from('event_participants')
      .delete()
      .eq('id', p.id)
      .select('id')

    setUpdatingId(null)
    if (deleteError) {
      setError(deleteError.message)
      return
    }
    if (!data || data.length === 0) {
      setError('Retrait refusé : seul un organisateur peut retirer un participant.')
      return
    }
    onUpdated()
  }

  if (participants.length === 0) {
    return (
      <p className="text-taupe text-sm py-4">Aucun participant inscrit pour l'instant.</p>
    )
  }

  const countOf = (role) => participants.filter((p) => p.role_in_event === role).length

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 mb-2">
        {['organizer', 'reviewer', 'participant'].map((role) => {
          const n = countOf(role)
          return (
            <span
              key={role}
              className="inline-flex items-center gap-2 rounded-full bg-ink text-white px-3 py-1 text-xs"
            >
              <span className="w-2 h-2 rounded-full" style={{ background: ROLE_COLOR[role] }} />
              {n} {ROLE_PLURALS[role]}
              {n > 1 ? 's' : ''}
            </span>
          )
        })}
      </div>

      {error && <div className="alert-error">{error}</div>}

      {participants.map((p) => {
        const isMe = p.user_id === myId
        return (
          <div
            key={p.id}
            className="list-item"
            style={{ borderLeft: `4px solid ${ROLE_COLOR[p.role_in_event] || '#9AA3B5'}` }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <Avatar name={p.profiles?.full_name} size={38} tone="light" />
              <div className="min-w-0">
                <span className="text-sm font-medium text-ink block truncate">
                  {p.profiles?.full_name}
                  {isMe && <span className="font-mono text-xs text-taupe ml-2">(vous)</span>}
                </span>
                <span className="font-mono text-xs text-taupe truncate block">
                  {p.profiles?.email}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <select
                value={p.role_in_event}
                onChange={(e) => handleRoleChange(p.id, e.target.value)}
                disabled={updatingId === p.id || isMe}
                className="select-field w-auto min-w-[140px] text-xs py-1.5"
                aria-label={`Rôle de ${p.profiles?.full_name}`}
              >
                <option value="participant">{ROLE_LABELS.participant}</option>
                <option value="reviewer">{ROLE_LABELS.reviewer}</option>
                <option value="organizer">{ROLE_LABELS.organizer}</option>
              </select>

              {!isMe && (
                <button
                  type="button"
                  className="btn-danger btn-sm"
                  disabled={updatingId === p.id}
                  onClick={() => handleRemove(p)}
                >
                  Retirer
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}