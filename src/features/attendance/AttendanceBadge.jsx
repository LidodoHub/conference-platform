import { useState, useEffect } from 'react'
import QRCode from 'qrcode'
import { DownloadSimpleIcon } from '@phosphor-icons/react'
import { supabase } from '../../lib/supabaseClient'
import { frError } from '../../lib/errors'
import { slug } from '../certificates/pdf'

// Badge QR personnel : un seul jeton, valable pour toutes les sessions.
export default function AttendanceBadge({ event, name }) {
  const [qr, setQr] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data: token, error: rpcError } = await supabase.rpc('get_my_badge', { p_event_id: event.id })
        if (rpcError) throw rpcError
        // avant : un jeton vide faisait planter QRCode et le squelette restait affiché indéfiniment
        if (!token) throw new Error("Ton badge n'est pas encore généré. Réessaie dans un instant ou contacte l'organisateur.")
        const url = await QRCode.toDataURL(String(token), { width: 320, margin: 1, color: { dark: '#16233F', light: '#FFFFFF' } })
        if (!cancelled) setQr(url)
      } catch (err) {
        if (!cancelled) setError(frError(err))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [event.id])

  if (error) return <div className="alert-error">{error}</div>
  if (!qr) return <div className="skeleton h-56 w-full" />

  return (
    <div className="rounded-xl border border-line bg-surface-2/60 p-4 text-center">
      <img src={qr} alt={`QR code de présence de ${name}`} className="mx-auto w-44 h-44 rounded-lg bg-white p-2" />
      <p className="mt-3 font-medium text-fg">{name}</p>
      <p className="text-xs text-muted mt-0.5">À présenter à l'entrée de chaque session.</p>
      <a href={qr} download={`badge-${slug(event.title)}.png`} className="btn-outline btn-sm mt-3">
        <DownloadSimpleIcon size={15} aria-hidden="true" />
        Enregistrer le badge
      </a>
    </div>
  )
}
