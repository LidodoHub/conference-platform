import { useState, useEffect } from 'react'
import { CheckCircleIcon, HourglassIcon, ReceiptIcon, TicketIcon } from '@phosphor-icons/react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../lib/auth'
import { frError } from '../../lib/errors'
import { ROLE_LABELS, slug } from '../../lib/constants'
import CertificateButton from '../certificates/CertificateButton'
import AttendanceBadge from '../attendance/AttendanceBadge'

export default function RegistrationCard({ event, participants, onRefresh }) {
  const myId = useAuth().user?.id ?? null
  const [payment, setPayment] = useState(null)
  const [payType, setPayType] = useState('ccp')
  const [reference, setReference] = useState('')
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const mine = participants.find((p) => p.user_id === myId)
  const status = mine?.registration_status
  const isParticipant = mine?.role_in_event === 'participant'
  const needsPayment = Boolean(myId && isParticipant && status !== 'invited')

  useEffect(() => {
    if (!needsPayment) return
    supabase
      .from('registration_payments')
      .select('reference, amount, declared_at, validated_at')
      .eq('event_id', event.id)
      .eq('user_id', myId)
      .maybeSingle()
      .then(({ data }) => setPayment(data))
  }, [needsPayment, myId, status, event.id])

  const fee = Number(event.registration_fee || 0)
  const free = fee === 0

  const declare = async (e) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const { error: rpcError } = await supabase.rpc('declare_payment', {
      p_event_id: event.id,
      p_reference: free
        ? 'Sans frais'
        : payType === 'ccp'
        ? `Bordereau CCP n° ${reference.trim()}`
        : payType === 'baridimob'
        ? `BaridiMob n° ${reference.trim()}`
        : payType === 'bank'
        ? `Virement bancaire n° ${reference.trim()}`
        : payType === 'onsite'
        ? `Sur place : ${reference.trim()}`
        : reference.trim(),
    })
    setBusy(false)
    if (rpcError) {
      setError(frError(rpcError))
      return
    }
    setReference('')
    setEditing(false)
    onRefresh()
  }

  const downloadReceipt = async () => {
    const { receiptPDF } = await import('../certificates/pdf')
    receiptPDF({
      eventTitle: event.title,
      participantName: mine?.profiles?.full_name || '',
      reference: payment?.reference,
      amount: payment?.amount,
      declaredAt: payment?.declared_at,
      validatedAt: payment?.validated_at,
    }).save(`accuse-paiement-${slug(event.title)}.pdf`)
  }

  if (!myId) return null

  if (!mine) {
    return (
      <p className="text-sm text-muted leading-relaxed">
        L'inscription se fait sur invitation de l'organisateur, une fois ton article accepté. Commence par soumettre un article dans l'onglet
        Articles.
      </p>
    )
  }

  if (!isParticipant) {
    return (
      <p className="text-sm text-muted leading-relaxed">
        Tu fais partie de cet événement en tant que <span className="font-medium text-fg">{ROLE_LABELS[mine.role_in_event]?.toLowerCase()}</span>.
      </p>
    )
  }

  if (status === 'validated') {
    return (
      <div className="space-y-4">
        <p className="flex items-center gap-2 text-sm font-medium text-ok">
          <CheckCircleIcon size={18} weight="fill" aria-hidden="true" />
          Inscription validée
        </p>
        {event.format !== 'online' ? (
          <AttendanceBadge event={event} name={mine?.profiles?.full_name || ''} />
        ) : (
          <p className="text-sm text-muted">Événement en ligne : les liens de visioconférence sont dans l'onglet Programme.</p>
        )}
        <div className="grid gap-2">
          {payment && (
            <button type="button" className="btn-outline w-full" onClick={downloadReceipt}>
              <ReceiptIcon size={17} aria-hidden="true" />
              Accusé de paiement (PDF)
            </button>
          )}
          <CertificateButton event={event} />
        </div>
      </div>
    )
  }

  const form = (
    <form onSubmit={declare} className="space-y-3">
      {!free && (
        <div className="space-y-2.5">
          <div>
            <label htmlFor="pay-type-select" className="form-label text-xs">
              Moyen de règlement utilisé
            </label>
            <select
              id="pay-type-select"
              className="select-field text-xs"
              value={payType}
              onChange={(e) => setPayType(e.target.value)}
            >
              <option value="ccp">Bordereau CCP (Algérie Poste)</option>
              <option value="baridimob">Virement BaridiMob</option>
              <option value="bank">Virement Bancaire (RIB)</option>
              <option value="onsite">Sur place / Bon de commande labo</option>
              <option value="other">Autre référence</option>
            </select>
          </div>
          <div>
            <label htmlFor="payment-ref" className="form-label text-xs">
              {payType === 'ccp'
                ? 'N° du bordereau CCP (sur le talon)'
                : payType === 'baridimob'
                ? 'N° de transaction BaridiMob'
                : payType === 'bank'
                ? 'Référence du virement bancaire'
                : payType === 'onsite'
                ? 'N° de reçu ou Bon de commande'
                : 'Référence du paiement'}
            </label>
            <input
              id="payment-ref"
              className="input-field num text-xs"
              placeholder={
                payType === 'ccp'
                  ? 'Ex: 489218'
                  : payType === 'baridimob'
                  ? 'Ex: 240830114923'
                  : payType === 'bank'
                  ? 'Ex: VIR-849204'
                  : payType === 'onsite'
                  ? 'Ex: BC USTO n° 12'
                  : 'Ex: Réf-12345'
              }
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              required
            />
          </div>
        </div>
      )}
      <button type="submit" disabled={busy} className="btn-primary w-full">
        {busy ? 'Envoi…' : free ? 'Confirmer mon inscription' : 'Déclarer mon paiement'}
      </button>
    </form>
  )

  return (
    <div className="space-y-4">
      {error && (
        <div role="alert" className="alert-error">
          {error}
        </div>
      )}

      {status === 'payment_submitted' ? (
        <>
          <p className="flex items-start gap-2 text-sm text-fg">
            <HourglassIcon size={18} className="text-warn shrink-0" aria-hidden="true" />
            <span>
              Paiement déclaré{payment?.reference && <> (bordereau <span className="num font-medium">{payment.reference}</span>)</>}. L'organisateur
              va le vérifier.
            </span>
          </p>
          {editing ? (
            form
          ) : (
            <button type="button" className="btn-ghost btn-sm -ml-2" onClick={() => setEditing(true)}>
              Corriger la référence
            </button>
          )}
        </>
      ) : (
        <>
          <p className="flex items-start gap-2 text-sm text-fg">
            <TicketIcon size={18} className="text-accent-ink shrink-0" aria-hidden="true" />
            Tu es invité. Règle les frais pour valider ton inscription.
          </p>
          <div className="rounded-xl bg-surface-2/70 border border-line p-3.5">
            <p className="text-xs text-muted">Frais d'inscription</p>
            <p className="num text-2xl font-semibold tracking-tight text-fg">{free ? 'Gratuit' : `${fee.toLocaleString('fr-FR')} DA`}</p>
            {event.payment_instructions && (
              <p className="text-[13px] text-muted mt-2 whitespace-pre-line leading-5" style={{ overflowWrap: 'anywhere' }}>
                {event.payment_instructions}
              </p>
            )}
          </div>
          {form}
        </>
      )}
    </div>
  )
}
