import { useState, useEffect } from 'react'
import QRCode from 'qrcode'
import { supabase } from '../../lib/supabaseClient'

export default function AttendanceBadge({ event, name }) {
  const [qr, setQr] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      const { data: token, error: rpcError } = await supabase.rpc('get_my_badge', {
        p_event_id: event.id,
      })
      if (rpcError) {
        if (!cancelled) setError(rpcError.message)
        return
      }
      const url = await QRCode.toDataURL(token, { width: 280, margin: 2 })
      if (!cancelled) setQr(url)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [event.id])

  if (error) return <div className="alert-error">{error}</div>
  if (!qr) return <div className="skeleton h-48 w-full" />

  return (
    <div className="card p-4 text-center space-y-2">
      <p className="section-label">Badge de présence</p>
      <img src={qr} alt="QR code de présence" className="mx-auto w-48 h-48" />
      <p className="text-sm font-medium text-ink">{name}</p>
      <p className="font-mono text-xs text-taupe" style={{ overflowWrap: 'anywhere' }}>{event.title}</p>
      <p className="text-xs text-taupe">À présenter à l'entrée de chaque session.</p>
      <a href={qr} download={`badge-${event.title}.png`} className="btn-outline btn-sm inline-block">
        Télécharger le badge
      </a>
    </div>
  )
}