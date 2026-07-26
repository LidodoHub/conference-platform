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

    // Récupère le nom complet depuis profiles
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

    // Génère le PDF
    const doc = generateCertificatePDF({
      participantName: profile.full_name,
      eventTitle: event.title,
      eventDates: `du ${event.start_date} au ${event.end_date}`,
    })

    // Télécharge le PDF
    doc.save(`certificat-${event.title.replace(/\s+/g, '-')}.pdf`)

    // Enregistre en base qu'un certificat a été émis
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
        className="bg-amber-600 text-white px-4 py-2 rounded hover:bg-amber-700 disabled:opacity-50"
      >
        {generating ? 'Génération...' : '📄 Télécharger mon certificat'}
      </button>
      {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
    </div>
  )
}