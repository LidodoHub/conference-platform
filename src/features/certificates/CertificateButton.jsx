import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { generateCertificatePDF } from './generateCertificate'

export default function CertificateButton({ event }) {
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState(null)

  const handleGenerate = async () => {
    setGenerating(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setError('Tu dois être connecté')
      setGenerating(false)
      return
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()

    if (profileError) {
      setError(profileError.message)
      setGenerating(false)
      return
    }

    const doc = generateCertificatePDF({
      participantName: profile.full_name,
      eventTitle: event.title,
      eventDates: `du ${event.start_date} au ${event.end_date}`,
    })

    doc.save(`certificat-${event.title.replace(/\s+/g, '-')}.pdf`)

    const { error: insertError } = await supabase
      .from('certificates')
      .insert({
        event_id: event.id,
        user_id: user.id,
      })

    if (insertError && !insertError.message.includes('duplicate')) {
      setError(insertError.message)
    }

    setGenerating(false)
  }

  return (
    <div>
      <button
        onClick={handleGenerate}
        disabled={generating}
        className="btn-accent w-full"
      >
        {generating ? 'Génération…' : 'Télécharger mon certificat'}
      </button>
      {error && <div className="alert-error mt-3">{error}</div>}
    </div>
  )
}
