import { useState } from 'react'
import { CertificateIcon, HourglassIcon } from '@phosphor-icons/react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../lib/auth'
import { frError } from '../../lib/errors'
import { formatDate } from '../../lib/constants'
import { certificatePDF, slug } from './pdf'

// Le certificat n'est disponible qu'une fois l'événement commencé : on n'atteste pas une participation à venir.
export default function CertificateButton({ event }) {
  const { user, profile } = useAuth()
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState(null)

  const today = new Date().toISOString().slice(0, 10)
  const available = event.start_date && String(event.start_date).slice(0, 10) <= today

  if (!available) {
    return (
      <p className="flex items-start gap-2 text-[13px] text-muted">
        <HourglassIcon size={16} className="shrink-0 mt-px" aria-hidden="true" />
        Ton certificat sera disponible à partir du {formatDate(event.start_date)}.
      </p>
    )
  }

  const handleGenerate = async () => {
    setGenerating(true)
    setError(null)
    const doc = certificatePDF({
      participantName: profile?.full_name || user.email,
      eventTitle: event.title,
      start: event.start_date,
      end: event.end_date,
      location: event.location,
      organizer: event.profiles?.full_name,
    })
    doc.save(`certificat-${slug(event.title)}.pdf`)

    // trace de délivrance (une ligne par personne et par événement)
    const { error: insertError } = await supabase.from('certificates').insert({ event_id: event.id, user_id: user.id })
    if (insertError && !/duplicate/i.test(insertError.message)) setError(frError(insertError))
    setGenerating(false)
  }

  return (
    <div>
      <button onClick={handleGenerate} disabled={generating} className="btn-accent w-full">
        <CertificateIcon size={17} aria-hidden="true" />
        {generating ? 'Génération…' : 'Télécharger mon certificat'}
      </button>
      {error && <div className="alert-error mt-3">{error}</div>}
    </div>
  )
}
