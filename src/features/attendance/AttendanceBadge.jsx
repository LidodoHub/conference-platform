import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import QRCode from 'qrcode'
import { DownloadSimpleIcon, DeviceMobileIcon, XIcon, ShieldCheckIcon, ReceiptIcon } from '@phosphor-icons/react'
import { supabase } from '../../lib/supabaseClient'
import { frError } from '../../lib/errors'
import { slug } from '../../lib/constants'

// Badge QR personnel avec Mode Pass Mobile Plein Écran pour l'accueil en amphithéâtre.
export default function AttendanceBadge({ event, name }) {
  const [qr, setQr] = useState(null)
  const [tokenCode, setTokenCode] = useState('')
  const [fullscreen, setFullscreen] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data: token, error: rpcError } = await supabase.rpc('get_my_badge', { p_event_id: event.id })
        if (rpcError) throw rpcError
        if (!token) throw new Error("Ton badge n'est pas encore généré. Réessaie dans un instant.")
        setTokenCode(String(token))
        const url = await QRCode.toDataURL(String(token), { width: 360, margin: 1, color: { dark: '#16233F', light: '#FFFFFF' } })
        if (!cancelled) setQr(url)
      } catch (err) {
        if (!cancelled) setError(frError(err))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [event.id])

  // Empêche le défilement de l'arrière-plan quand le pass est ouvert
  useEffect(() => {
    if (!fullscreen) return undefined
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => e.key === 'Escape' && setFullscreen(false)
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [fullscreen])

  if (error) return <div className="alert-error">{error}</div>
  if (!qr) return <div className="skeleton h-56 w-full" />

  return (
    <>
      <div className="rounded-2xl border border-line bg-surface-2/60 p-4 text-center space-y-3">
        <button
          type="button"
          onClick={() => setFullscreen(true)}
          title="Cliquez pour afficher le Pass Mobile plein écran"
          className="group relative p-2.5 rounded-2xl bg-white shadow-xs inline-block mx-auto border border-line/40 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer touch-manipulation"
        >
          <img src={qr} alt={`QR code de présence de ${name}`} className="w-40 h-40 rounded-lg mx-auto pointer-events-none" />
          <span className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 sm:flex hidden items-center justify-center text-white text-xs font-semibold gap-1.5 transition-opacity duration-200">
            <DeviceMobileIcon size={16} weight="bold" /> Agrandir
          </span>
          {/* Indication visuelle mobile toujours visible et claire */}
          <span className="sm:hidden absolute bottom-2 inset-x-2 py-1 rounded-lg bg-black/65 backdrop-blur-xs text-[11px] text-white font-medium flex items-center justify-center gap-1 shadow-xs">
            <DeviceMobileIcon size={13} weight="bold" /> Toucher pour agrandir
          </span>
        </button>

        <div>
          <p className="font-semibold text-fg text-sm">{name}</p>
          <p className="text-xs text-muted mt-0.5">Scannez ce QR Code à l'accueil pour chaque session.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 justify-center pt-1">
          <button
            type="button"
            onClick={() => setFullscreen(true)}
            className="btn-accent btn-sm text-xs justify-center flex-1 touch-manipulation"
          >
            <DeviceMobileIcon size={15} weight="bold" />
            Pass Mobile
          </button>
          <a
            href={qr}
            download={`badge-${slug(event.title)}.png`}
            className="btn-outline btn-sm text-xs justify-center flex-1"
          >
            <DownloadSimpleIcon size={15} />
            Télécharger
          </a>
        </div>

        <button
          type="button"
          onClick={async () => {
            const { receiptPDF } = await import('../certificates/pdf')
            receiptPDF({
              participantName: name,
              eventTitle: event.title,
              start: event.start_date,
              end: event.end_date,
              location: event.location,
              paymentRef: tokenCode ? `REF-USTO-${tokenCode.slice(0, 8).toUpperCase()}` : null,
            })
          }}
          className="btn-outline btn-sm text-xs justify-center w-full"
          title="Justificatif de paiement pour ordre de mission et remboursement"
        >
          <ReceiptIcon size={15} />
          Reçu officiel de paiement (PDF)
        </button>
      </div>

      {/* Modal Pass Mobile Plein Écran (Monté via Portal directement dans document.body) */}
      {fullscreen && typeof document !== 'undefined' && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.target === e.currentTarget && setFullscreen(false)}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md text-white animate-in fade-in duration-200 overflow-y-auto"
        >
          <div className="w-full max-w-sm rounded-3xl bg-[#161B22] border border-[#30363D] p-5 sm:p-6 text-center space-y-4 shadow-2xl relative my-auto">
            <button
              type="button"
              onClick={() => setFullscreen(false)}
              className="absolute right-4 top-4 p-2 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white/80 hover:text-white transition-all cursor-pointer"
              aria-label="Fermer"
            >
              <XIcon size={20} />
            </button>

            <div className="pt-2">
              <span className="text-[10px] font-mono text-accent uppercase tracking-widest block font-semibold">
                Pass Conférence Numérique
              </span>
              <h3 className="text-base font-bold text-white mt-1 line-clamp-1">
                {event.title}
              </h3>
            </div>

            {/* Cadre QR Haute Lisibilité */}
            <div className="p-3 sm:p-4 rounded-2xl bg-white shadow-lift inline-block mx-auto border-4 border-accent/40">
              <img src={qr} alt={`Badge QR ${name}`} className="w-52 h-52 sm:w-56 sm:h-56 mx-auto rounded-lg" />
            </div>

            <div className="space-y-1">
              <p className="font-bold text-lg text-white leading-snug">{name}</p>
              <div className="flex items-center justify-center gap-1.5 text-xs text-ok font-medium">
                <ShieldCheckIcon size={15} weight="fill" />
                <span>Accès Validé • USTO-MB</span>
              </div>
              <p className="font-mono text-[10px] text-white/50 pt-1">
                TOKEN : {tokenCode.slice(0, 16)}...
              </p>
            </div>

            <p className="text-[11px] text-white/60 leading-relaxed border-t border-white/10 pt-3">
              Présentez cet écran sous le lecteur optique du guichet d'accueil.
            </p>

            <button
              type="button"
              onClick={() => setFullscreen(false)}
              className="btn-outline btn-sm w-full py-2.5 text-xs text-white border-white/20 hover:bg-white/10 active:scale-95 cursor-pointer"
            >
              Fermer le pass
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
