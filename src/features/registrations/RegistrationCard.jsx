import { useState, useEffect } from 'react'
import { jsPDF } from 'jspdf'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../lib/auth'
import CertificateButton from '../certificates/CertificateButton'
import AttendanceBadge from '../attendance/AttendanceBadge'

const ROLE_LABELS = {
  organizer: 'organisateur',
  reviewer: 'reviewer',
  participant: 'participant',
}

export default function RegistrationCard({ event, participants, onRefresh }) {
  const myId = useAuth().user?.id ?? null
  const [payment, setPayment] = useState(null)
  const [reference, setReference] = useState('')
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const mine = participants.find((p) => p.user_id === myId)
  const status = mine?.registration_status
  const isParticipant = mine?.role_in_event === 'participant'

  useEffect(() => {
    if (!myId || !isParticipant || status === 'invited') {
      setPayment(null)
      return
    }
    supabase
      .from('registration_payments')
      .select('reference, amount, declared_at, validated_at')
      .eq('event_id', event.id)
      .eq('user_id', myId)
      .maybeSingle()
      .then(({ data }) => setPayment(data))
  }, [myId, isParticipant, status, event.id])

  const fee = Number(event.registration_fee || 0)
  const free = fee === 0

  const declare = async (e) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const { error: rpcError } = await supabase.rpc('declare_payment', {
      p_event_id: event.id,
      p_reference: free ? 'Sans frais' : reference,
    })
    setBusy(false)
    if (rpcError) {
      setError(rpcError.message)
      return
    }
    setReference('')
    setEditing(false)
    onRefresh()
  }

  const downloadReceipt = () => {
    const doc = new jsPDF()
    doc.setFontSize(18)
    doc.text('Accusé de paiement', 20, 25)
    doc.setFontSize(12)
    const lines = [
      `Événement : ${event.title}`,
      `Participant : ${mine?.profiles?.full_name || ''}`,
      `Référence du bordereau : ${payment?.reference || ''}`,
      `Montant : ${payment?.amount ?? 0} DA`,
      `Déclaré le : ${(payment?.declared_at || '').split('T')[0]}`,
      `Validé le : ${(payment?.validated_at || '').split('T')[0]}`,
    ]
    lines.forEach((line, i) => doc.text(line, 20, 45 + i * 10))
    doc.save(`accuse-paiement-${event.title}.pdf`)
  }

  if (!myId) return null

  if (!mine) {
    return (
      <p className="text-sm text-taupe leading-relaxed">
        L'inscription se fait sur invitation de l'organisateur, une fois ton article accepté.
      </p>
    )
  }

  if (!isParticipant) {
    return (
      <p className="text-sm text-taupe leading-relaxed">
        Tu fais partie de cet événement en tant que {ROLE_LABELS[mine.role_in_event] || mine.role_in_event}.
      </p>
    )
  }

  if (status === 'validated') {
    return (
      <div className="space-y-4">
        <div className="alert-success">Inscription validée</div>
        {event.format !== 'online' && (
          <AttendanceBadge event={event} name={mine?.profiles?.full_name || ''} />
        )}
        {payment && (
          <button type="button" className="btn-outline btn-sm w-full" onClick={downloadReceipt}>
            Télécharger l'accusé de paiement (PDF)
          </button>
        )}
        <CertificateButton event={event} />
      </div>
    )
  }

  const form = (
    <form onSubmit={declare} className="space-y-3">
      {!free && (
        <div>
          <label htmlFor="payment-ref" className="form-label">Référence du bordereau</label>
          <input
            id="payment-ref"
            className="input-field font-mono"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            required
          />
        </div>
      )}
      <button type="submit" disabled={busy} className="btn-primary w-full">
        {busy ? 'Envoi…' : free ? "Confirmer mon inscription" : 'Déclarer mon paiement'}
      </button>
    </form>
  )

  return (
    <div className="space-y-4">
      {error && <div className="alert-error">{error}</div>}

      {status === 'payment_submitted' ? (
        <>
          <div className="alert-info">
            Paiement déclaré{payment?.reference ? ` (bordereau ${payment.reference})` : ''}. En attente de validation par l'organisateur.
          </div>
          {editing ? (
            form
          ) : (
            <button type="button" className="btn-outline btn-sm w-full" onClick={() => setEditing(true)}>
              Corriger la référence
            </button>
          )}
        </>
      ) : (
        <>
          <div className="alert-info">Tu es invité à cet événement. Règle les frais pour valider ton inscription.</div>
          <div>
            <p className="text-xs text-taupe">Frais d'inscription</p>
            <p className="font-mono text-sm text-ink">{free ? 'Gratuit' : `${fee} DA`}</p>
          </div>
          {event.payment_instructions && (
            <div>
              <p className="text-xs text-taupe">Modalités de paiement</p>
              <p className="text-sm text-ink whitespace-pre-line">{event.payment_instructions}</p>
            </div>
          )}
          {form}
        </>
      )}
    </div>
  )
}
