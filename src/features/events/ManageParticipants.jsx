import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

const ROLE_LABELS = {
  participant: 'Participant',
  reviewer: 'Reviewer',
  organizer: 'Organisateur',
}

export default function ManageParticipants({ participants, onUpdated }) {
  const [updatingId, setUpdatingId] = useState(null)

  const handleRoleChange = async (participantId, newRole) => {
    setUpdatingId(participantId)

    const { error } = await supabase
      .from('event_participants')
      .update({ role_in_event: newRole })
      .eq('id', participantId)

    if (error) {
      console.error(error)
    }

    setUpdatingId(null)
    onUpdated()
  }

  if (participants.length === 0) {
    return (
      <p className="text-taupe text-sm py-4">Aucun participant inscrit pour l'instant.</p>
    )
  }

  return (
    <div className="space-y-2">
      {participants.map((p) => (
        <div key={p.id} className="list-item">
          <div className="min-w-0">
            <span className="text-sm font-medium text-ink block truncate">
              {p.profiles?.full_name}
            </span>
            <span className="font-mono text-xs text-taupe truncate block">
              {p.profiles?.email}
            </span>
          </div>
          <select
            value={p.role_in_event}
            onChange={(e) => handleRoleChange(p.id, e.target.value)}
            disabled={updatingId === p.id}
            className="select-field w-auto min-w-[140px] text-xs py-1.5"
            aria-label={`Rôle de ${p.profiles?.full_name}`}
          >
            <option value="participant">{ROLE_LABELS.participant}</option>
            <option value="reviewer">{ROLE_LABELS.reviewer}</option>
            <option value="organizer">{ROLE_LABELS.organizer}</option>
          </select>
        </div>
      ))}
    </div>
  )
}
