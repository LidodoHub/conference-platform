import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

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

  return (
    <div className="space-y-2">
      {participants.map((p) => (
        <div key={p.id} className="flex justify-between items-center text-sm p-2 border rounded">
          <span>{p.profiles?.full_name}</span>
          <select
            value={p.role_in_event}
            onChange={(e) => handleRoleChange(p.id, e.target.value)}
            disabled={updatingId === p.id}
            className="border rounded p-1 text-xs"
          >
            <option value="participant">Participant</option>
            <option value="reviewer">Reviewer</option>
            <option value="organizer">Organizer</option>
          </select>
        </div>
      ))}
    </div>
  )
}