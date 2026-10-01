import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'

const ROLE_LABELS = {
  participant: 'Participant',
  reviewer: 'Reviewer',
  organizer: 'Organisateur',
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

  return (
    <div className="space-y-2">
      {error && <div className="alert-error">{error}</div>}

      {participants.map((p) => {
        const isMe = p.user_id === myId
        return (
          <div key={p.id} className="list-item">
            <div className="min-w-0">
              <span className="text-sm font-medium text-ink block truncate">
                {p.profiles?.full_name}
                {isMe && <span className="font-mono text-xs text-taupe ml-2">(vous)</span>}
              </span>
              <span className="font-mono text-xs text-taupe truncate block">
                {p.profiles?.email}
              </span>
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