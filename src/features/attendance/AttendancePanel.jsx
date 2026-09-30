import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { insertRecord } from '../../lib/persist'
import { generateCertificatePDF } from '../certificates/generateCertificate'
import EmptyState from '../../components/ui/EmptyState'

export default function AttendancePanel({ event, participants, canManage }) {
  const [present, setPresent] = useState(() => new Set())
  const [message, setMessage] = useState(null)

  const toggle = async (participant) => {
    const next = new Set(present)
    if (next.has(participant.id)) next.delete(participant.id)
    else next.add(participant.id)
    setPresent(next)
    await insertRecord('attendance', event.id, {
      participant_id: participant.id,
      present: next.has(participant.id),
    })
  }

  const emailCertificate = async (participant) => {
    setMessage(null)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const doc = generateCertificatePDF({
      participantName: participant.profiles?.full_name || 'Participant',
      eventTitle: event.title,
      eventDates: `du ${event.start_date} au ${event.end_date}`,
    })
    doc.save(`certificat-${(participant.profiles?.full_name || 'participant').replace(/\s+/g, '-')}.pdf`)

    await supabase.from('certificates').insert({
      event_id: event.id,
      user_id: participant.user_id || user.id,
    })

    const email = participant.profiles?.email
    if (email) {
      window.location.href = `mailto:${email}?subject=${encodeURIComponent(`Certificat — ${event.title}`)}&body=${encodeURIComponent('Votre certificat de participation CONFERA est joint / disponible au téléchargement.')}`
    }
    setMessage('Certificat généré. Un brouillon mail a été ouvert si une adresse est connue.')
  }

  if (!participants.length) {
    return <EmptyState title="Présences" body="Aucun inscrit pour le check-in." />
  }

  return (
    <section>
      <p className="section-label">Participation</p>
      <h2 className="section-heading text-xl mt-1 mb-5">Présences et certificats</h2>
      {message && <div className="alert-success mb-4">{message}</div>}
      <ul className="space-y-2">
        {participants.map((p) => (
          <li key={p.id} className="list-item">
            <div>
              <p className="text-sm font-medium text-ink">{p.profiles?.full_name}</p>
              <p className="font-mono text-xs text-taupe">{p.profiles?.email}</p>
            </div>
            {canManage && (
              <div className="flex gap-2">
                <button
                  type="button"
                  className={present.has(p.id) ? 'btn-success btn-sm' : 'btn-outline btn-sm'}
                  onClick={() => toggle(p)}
                >
                  {present.has(p.id) ? 'Présent' : 'Check-in'}
                </button>
                <button type="button" className="btn-accent btn-sm" onClick={() => emailCertificate(p)}>
                  Certificat
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
